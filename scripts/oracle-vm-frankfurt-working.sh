#!/bin/bash
# Oracle Cloud VM Creation - Frankfurt
# Uses SSH key string instead of file

set -e

echo "========================================"
echo "Oracle Cloud VM - Frankfurt"
echo "========================================"
echo ""

# Configuration
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"
SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaahu7f7zcxn6eug6idqnghhyaurzidplzlsveif4ukt7edndnq5gxq"
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"

VM_NAME="pdf-vm-$(date +%s)"
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12

ADS=(
    "bgAk:EU-FRANKFURT-1-AD-1"
    "bgAk:EU-FRANKFURT-1-AD-2"
    "bgAk:EU-FRANKFURT-1-AD-3"
)

MAX_CYCLES=100
CYCLE_DELAY=120
AD_DELAY=10

echo "Checking OCI CLI..."
if ! command -v oci &> /dev/null; then
    echo "❌ OCI CLI not found"
    exit 1
fi

# Get SSH key
if [ -f "${HOME}/.ssh/id_rsa.pub" ]; then
    SSH_KEY=$(cat "${HOME}/.ssh/id_rsa.pub")
else
    echo "Generating SSH key..."
    mkdir -p "${HOME}/.ssh"
    ssh-keygen -t rsa -b 2048 -f "${HOME}/.ssh/id_rsa" -N "" -C "oci" -q
    SSH_KEY=$(cat "${HOME}/.ssh/id_rsa.pub")
fi

echo "✅ Ready"
echo ""
echo "VM: $OCPUS OCPU, ${MEMORY_GB}GB RAM"
echo ""

TOTAL=0
START=$(date +%s)

for CYCLE in $(seq 1 $MAX_CYCLES); do
    TS=$(date '+%H:%M:%S')
    MIN=$(( ($(date +%s) - START) / 60 ))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "[$TS] Cycle $CYCLE/$MAX_CYCLES (${MIN}m)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    for AD in "${ADS[@]}"; do
        TOTAL=$((TOTAL + 1))
        AD_SHORT=$(echo "$AD" | cut -d':' -f2 | sed 's/EU-FRANKFURT-1-//')
        
        echo "[$TS] #$TOTAL - $AD_SHORT..."
        
        # Launch with SSH key STRING (not file)
        OUT=$(oci compute instance launch \
            --compartment-id "$COMPARTMENT_ID" \
            --availability-domain "$AD" \
            --shape "$SHAPE" \
            --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "$VM_NAME" \
            --assign-public-ip true \
            --ssh-authorized-keys "[\"$SSH_KEY\"]" \
            2>&1 || echo "FAILED")
        
        if echo "$OUT" | grep -qi "out of.*capacity"; then
            echo "  ❌ No capacity"
            
        elif echo "$OUT" | grep -qi "service limit"; then
            echo "  ❌ Limit (2 VM max)"
            exit 1
            
        elif echo "$OUT" | grep -q "ocid1.instance"; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ SUCCESS!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            ID=$(echo "$OUT" | grep -oP 'ocid1\.instance\.[a-zA-Z0-9.]+' | head -1)
            
            echo "Instance: $ID"
            echo ""
            echo "Waiting..."
            
            for i in {1..40}; do
                ST=$(oci compute instance get --instance-id "$ID" \
                    --query 'data."lifecycle-state"' \
                    --raw-output 2>/dev/null || echo "?")
                
                if [ "$ST" = "RUNNING" ]; then
                    echo "✅ RUNNING"
                    break
                fi
                echo -n "."
                sleep 5
            done
            echo ""
            
            sleep 10
            
            IP=$(oci compute instance list-vnics \
                --instance-id "$ID" \
                --query 'data[0]."public-ip"' \
                --raw-output 2>/dev/null || echo "")
            
            if [ -n "$IP" ]; then
                echo "IP: $IP"
                echo ""
                echo "SSH: ssh ubuntu@$IP"
            else
                echo "⚠️  IP pending"
            fi
            
            echo ""
            echo "Console:"
            echo "https://cloud.oracle.com/compute/instances/$ID?region=eu-frankfurt-1"
            echo ""
            
            exit 0
            
        else
            echo "  ⚠️  Error"
            echo "$OUT" | grep -i "message\|error" | head -2
        fi
        
        [ "$AD" != "${ADS[-1]}" ] && sleep $AD_DELAY
    done
    
    if [ $CYCLE -lt $MAX_CYCLES ]; then
        NEXT=$(date -d "+${CYCLE_DELAY} seconds" '+%H:%M:%S' 2>/dev/null || date '+%H:%M:%S')
        echo ""
        echo "All full. Wait ${CYCLE_DELAY}s. Next: $NEXT"
        echo ""
        sleep $CYCLE_DELAY
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ Failed after $TOTAL attempts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 1
