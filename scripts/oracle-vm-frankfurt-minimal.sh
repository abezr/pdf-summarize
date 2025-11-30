#!/bin/bash
# Oracle Cloud VM Creation Script - Frankfurt Region
# Minimal version - generates SSH key inline

set -e

echo "========================================"
echo "Oracle Cloud VM Creation - Frankfurt"
echo "Minimal version (inline SSH key)"
echo "========================================"
echo ""

# ===== CONFIGURATION =====

COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"
SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaahu7f7zcxn6eug6idqnghhyaurzidplzlsveif4ukt7edndnq5gxq"
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"

# VM Configuration
VM_NAME="pdf-vm-$(date +%s)"
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12

# Frankfurt Availability Domains
ADS=(
    "bgAk:EU-FRANKFURT-1-AD-1"
    "bgAk:EU-FRANKFURT-1-AD-2"
    "bgAk:EU-FRANKFURT-1-AD-3"
)

# Retry Configuration
MAX_CYCLES=100
CYCLE_DELAY=120
AD_DELAY=10

# ===== VALIDATION =====

echo "Validating..."

if ! command -v oci &> /dev/null; then
    echo "❌ ERROR: OCI CLI not found"
    exit 1
fi

# Generate or get SSH key
if [ -f "${HOME}/.ssh/id_rsa.pub" ]; then
    SSH_KEY=$(cat "${HOME}/.ssh/id_rsa.pub")
    echo "✅ Using existing SSH key"
else
    echo "⚠️  Generating SSH key..."
    mkdir -p "${HOME}/.ssh"
    ssh-keygen -t rsa -b 4096 -f "${HOME}/.ssh/id_rsa" -N "" -C "oracle-vm" -q
    SSH_KEY=$(cat "${HOME}/.ssh/id_rsa.pub")
    echo "✅ SSH key generated"
fi

echo "✅ Configuration valid"
echo ""
echo "VM: $VM_NAME"
echo "Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
echo "Image: Ubuntu 24.04 ARM"
echo ""

# ===== MAIN LOOP =====

TOTAL_ATTEMPTS=0
START_TIME=$(date +%s)

for CYCLE in $(seq 1 $MAX_CYCLES); do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_MIN=$((ELAPSED / 60))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "[$TIMESTAMP] Cycle $CYCLE/$MAX_CYCLES (${ELAPSED_MIN}m)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    for AD in "${ADS[@]}"; do
        TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))
        AD_NAME=$(echo "$AD" | cut -d':' -f2)
        
        echo "[$TIMESTAMP] #$TOTAL_ATTEMPTS - $AD_NAME..."
        
        # Create temporary file for SSH key
        TMPKEY="/tmp/ssh_key_$$.pub"
        echo "$SSH_KEY" > "$TMPKEY"
        
        # Launch instance with file-based key
        LAUNCH_OUTPUT=$(oci compute instance launch \
            --compartment-id "$COMPARTMENT_ID" \
            --availability-domain "$AD" \
            --shape "$SHAPE" \
            --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "$VM_NAME" \
            --assign-public-ip true \
            --ssh-authorized-keys-file "$TMPKEY" \
            2>&1 || echo "FAILED")
        
        # Clean up temp file
        rm -f "$TMPKEY"
        
        # Check result
        if echo "$LAUNCH_OUTPUT" | grep -qi "out of.*capacity"; then
            echo "  ❌ Out of capacity"
            
        elif echo "$LAUNCH_OUTPUT" | grep -qi "service limit"; then
            echo "  ❌ Service limit (2 VM max)"
            exit 1
            
        elif echo "$LAUNCH_OUTPUT" | grep -q "ocid1.instance"; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ SUCCESS! VM in $AD_NAME"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            INSTANCE_ID=$(echo "$LAUNCH_OUTPUT" | grep -oP 'ocid1\.instance\.[a-zA-Z0-9.]+' | head -1)
            
            if [ -n "$INSTANCE_ID" ]; then
                echo "Instance: $INSTANCE_ID"
                echo ""
                
                # Wait for RUNNING state
                echo "Waiting for start..."
                for i in {1..60}; do
                    STATE=$(oci compute instance get \
                        --instance-id "$INSTANCE_ID" \
                        --query 'data."lifecycle-state"' \
                        --raw-output 2>/dev/null || echo "UNKNOWN")
                    
                    if [ "$STATE" = "RUNNING" ]; then
                        echo "✅ RUNNING"
                        break
                    fi
                    echo -n "."
                    sleep 5
                done
                echo ""
                
                sleep 10
                
                # Get IP
                PUBLIC_IP=$(oci compute instance list-vnics \
                    --instance-id "$INSTANCE_ID" \
                    --query 'data[0]."public-ip"' \
                    --raw-output 2>/dev/null || echo "")
                
                if [ -n "$PUBLIC_IP" ]; then
                    echo "Public IP: $PUBLIC_IP"
                    echo ""
                    echo "SSH: ssh ubuntu@$PUBLIC_IP"
                else
                    echo "⚠️  IP not ready - check console"
                fi
                
                echo ""
                echo "Console:"
                echo "https://cloud.oracle.com/compute/instances/$INSTANCE_ID?region=eu-frankfurt-1"
                echo ""
                echo "Time: ${ELAPSED_MIN}m | Attempts: $TOTAL_ATTEMPTS"
            fi
            
            exit 0
            
        elif echo "$LAUNCH_OUTPUT" | grep -qi "FAILED\|ServiceError\|CannotParse"; then
            echo "  ⚠️  Request failed"
            echo "$LAUNCH_OUTPUT" | grep -i "error\|message" | head -2
            
        else
            echo "  ⚠️  Unexpected"
        fi
        
        if [ "$AD" != "${ADS[-1]}" ]; then
            sleep $AD_DELAY
        fi
    done
    
    if [ $CYCLE -lt $MAX_CYCLES ]; then
        NEXT_TIME=$(date -d "+${CYCLE_DELAY} seconds" '+%H:%M:%S' 2>/dev/null || date '+%H:%M:%S')
        echo ""
        echo "All full. Wait ${CYCLE_DELAY}s..."
        echo "Next: $NEXT_TIME"
        echo ""
        sleep $CYCLE_DELAY
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ Failed after $TOTAL_ATTEMPTS attempts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Try:"
echo "1. Run overnight (23:00 CET) - 90% success"
echo "2. Reduce: OCPUS=1, MEMORY_GB=6"
echo ""

exit 1
