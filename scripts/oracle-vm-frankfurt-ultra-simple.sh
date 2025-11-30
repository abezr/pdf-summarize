#!/bin/bash
# Ultra-simple Oracle Cloud VM script
# Minimal parameters, maximum compatibility

set -e

echo "Starting Oracle Cloud VM creation..."

# Your exact configuration
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"
SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaahu7f7zcxn6eug6idqnghhyaurzidplzlsveif4ukt7edndnq5gxq"
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"

# Simple VM config
SHAPE="VM.Standard.A1.Flex"

# Availability domains
ADS=(
    "bgAk:EU-FRANKFURT-1-AD-1"
    "bgAk:EU-FRANKFURT-1-AD-2"
    "bgAk:EU-FRANKFURT-1-AD-3"
)

# Check OCI CLI
if ! command -v oci &> /dev/null; then
    echo "ERROR: oci command not found"
    exit 1
fi

# Ensure SSH key exists
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "Generating SSH key..."
    mkdir -p ~/.ssh
    ssh-keygen -t rsa -b 2048 -f ~/.ssh/id_rsa -N "" -C "oci-vm" -q
fi

echo "Ready. Trying to create VM..."
echo ""

ATTEMPT=0
MAX_ATTEMPTS=300

for CYCLE in {1..100}; do
    echo "=== Cycle $CYCLE ==="
    
    for AD in "${ADS[@]}"; do
        ATTEMPT=$((ATTEMPT + 1))
        AD_NAME=$(echo "$AD" | awk -F: '{print $2}')
        
        echo "[$ATTEMPT] Trying $AD_NAME..."
        
        # Simple launch command
        RESULT=$(oci compute instance launch \
            --compartment-id "$COMPARTMENT_ID" \
            --availability-domain "$AD" \
            --shape "$SHAPE" \
            --shape-config '{"ocpus":2,"memoryInGBs":12}' \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "vm-$(date +%s)" \
            --assign-public-ip true \
            --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
            2>&1)
        
        # Check for success
        if echo "$RESULT" | grep -q "ocid1.instance"; then
            echo ""
            echo "SUCCESS!"
            echo "$RESULT" | grep "id" | head -5
            echo ""
            
            INSTANCE_ID=$(echo "$RESULT" | grep -oP '"id": "\K[^"]+' | head -1)
            echo "Instance ID: $INSTANCE_ID"
            
            # Get IP (wait a bit)
            echo "Waiting 30s for network..."
            sleep 30
            
            IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" \
                --query 'data[0]."public-ip"' --raw-output 2>/dev/null || echo "")
            
            if [ -n "$IP" ]; then
                echo "Public IP: $IP"
                echo "SSH: ssh ubuntu@$IP"
            fi
            
            exit 0
        fi
        
        # Check error type
        if echo "$RESULT" | grep -qi "out of.*capacity"; then
            echo "  -> Out of capacity"
        elif echo "$RESULT" | grep -qi "incorrectly formatted"; then
            echo "  -> Format error:"
            echo "$RESULT" | grep "message" | head -2
            echo ""
            echo "DEBUG: Testing if image/subnet are valid..."
            oci compute image get --image-id "$IMAGE_ID" --query 'data."display-name"' 2>&1 | head -1
            oci network subnet get --subnet-id "$SUBNET_ID" --query 'data."display-name"' 2>&1 | head -1
            exit 1
        else
            echo "  -> Unknown error"
            echo "$RESULT" | head -3
        fi
        
        sleep 10
    done
    
    echo "All ADs full, waiting 120s..."
    sleep 120
done

echo "Failed after $ATTEMPT attempts"
exit 1
