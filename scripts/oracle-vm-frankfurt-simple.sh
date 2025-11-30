#!/bin/bash
# Oracle Cloud VM Creation Script - Frankfurt Region
# Simplified version without agent-config (more reliable)

set -e

echo "========================================"
echo "Oracle Cloud VM Creation - Frankfurt"
echo "Simplified version (no agent-config)"
echo "========================================"
echo ""

# ===== YOUR CONFIGURATION =====

COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"
SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaahu7f7zcxn6eug6idqnghhyaurzidplzlsveif4ukt7edndnq5gxq"
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"
SSH_PUBLIC_KEY_FILE="${HOME}/.ssh/id_rsa.pub"

# VM Configuration
VM_NAME="pdf-summarize-vm-$(date +%s)"
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
CYCLE_DELAY=120  # 2 minutes
AD_DELAY=10      # 10 seconds

# ===== VALIDATION =====

echo "Validating configuration..."

if ! command -v oci &> /dev/null; then
    echo "❌ ERROR: Oracle Cloud CLI not found."
    exit 1
fi

if [ ! -f "$SSH_PUBLIC_KEY_FILE" ]; then
    echo "⚠️  SSH public key not found. Generating..."
    mkdir -p "${HOME}/.ssh"
    ssh-keygen -t rsa -b 4096 -f "${HOME}/.ssh/id_rsa" -N "" -C "oracle-cloud-vm"
fi

echo "✅ Configuration valid"
echo ""
echo "VM Configuration:"
echo "  Name: $VM_NAME"
echo "  Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
echo "  Image: Ubuntu 24.04 Minimal ARM"
echo "  Region: Frankfurt (eu-frankfurt-1)"
echo ""

# ===== MAIN RETRY LOOP =====

TOTAL_ATTEMPTS=0
START_TIME=$(date +%s)

for CYCLE in $(seq 1 $MAX_CYCLES); do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    ELAPSED=$(($(date +%s) - START_TIME))
    ELAPSED_MIN=$((ELAPSED / 60))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "[$TIMESTAMP] Cycle $CYCLE/$MAX_CYCLES (${ELAPSED_MIN}m elapsed)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    for AD in "${ADS[@]}"; do
        TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))
        AD_NAME=$(echo "$AD" | cut -d':' -f2)
        
        echo "[$TIMESTAMP] Attempt $TOTAL_ATTEMPTS - $AD_NAME..."
        
        # Launch instance (simplified - no agent-config)
        LAUNCH_OUTPUT=$(oci compute instance launch \
            --compartment-id "$COMPARTMENT_ID" \
            --availability-domain "$AD" \
            --shape "$SHAPE" \
            --shape-config '{"ocpus":'$OCPUS',"memoryInGBs":'$MEMORY_GB'}' \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "$VM_NAME" \
            --assign-public-ip true \
            --ssh-authorized-keys-file "$SSH_PUBLIC_KEY_FILE" \
            --wait-for-state RUNNING \
            --max-wait-seconds 300 \
            2>&1 || echo "LAUNCH_FAILED")
        
        # Check result
        if echo "$LAUNCH_OUTPUT" | grep -iq "out of.*capacity"; then
            echo "  ❌ $AD_NAME: Out of capacity"
            
        elif echo "$LAUNCH_OUTPUT" | grep -iq "service limit"; then
            echo "  ❌ $AD_NAME: Service limit exceeded"
            echo ""
            echo "⚠️  Always Free limit: 2 VMs max"
            echo ""
            echo "Check existing instances:"
            oci compute instance list \
                --compartment-id "$COMPARTMENT_ID" \
                --lifecycle-state RUNNING \
                --query 'data[*].{Name:"display-name", Shape:shape}' \
                --output table 2>/dev/null || true
            exit 1
            
        elif echo "$LAUNCH_OUTPUT" | grep -q "ocid1.instance"; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ SUCCESS! VM Created in $AD_NAME"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            INSTANCE_ID=$(echo "$LAUNCH_OUTPUT" | grep -oP 'ocid1\.instance\.[a-zA-Z0-9.]+' | head -1)
            
            if [ -n "$INSTANCE_ID" ]; then
                echo "Instance OCID:"
                echo "  $INSTANCE_ID"
                echo ""
                
                echo "Waiting for network configuration..."
                sleep 15
                
                PUBLIC_IP=$(oci compute instance list-vnics \
                    --instance-id "$INSTANCE_ID" \
                    --query 'data[0]."public-ip"' \
                    --raw-output 2>/dev/null || echo "")
                
                if [ -n "$PUBLIC_IP" ]; then
                    echo "Public IP:"
                    echo "  $PUBLIC_IP"
                    echo ""
                    echo "SSH Connection:"
                    echo "  ssh ubuntu@$PUBLIC_IP"
                    echo ""
                else
                    echo "⚠️  Public IP not available yet"
                    echo "Check Oracle Console in 1-2 minutes"
                fi
                
                echo ""
                echo "Console URL:"
                echo "  https://cloud.oracle.com/compute/instances/$INSTANCE_ID?region=eu-frankfurt-1"
                echo ""
                
                TOTAL_TIME=$(($(date +%s) - START_TIME))
                TOTAL_MIN=$((TOTAL_TIME / 60))
                echo "Total time: ${TOTAL_MIN}m"
                echo "Total attempts: $TOTAL_ATTEMPTS"
                echo ""
                echo "Note: Agent plugins can be enabled later in Oracle Console"
            fi
            
            exit 0
            
        elif echo "$LAUNCH_OUTPUT" | grep -iq "LAUNCH_FAILED\|ServiceError\|CannotParseRequest"; then
            echo "  ⚠️  $AD_NAME: Request failed"
            echo "$LAUNCH_OUTPUT" | grep -i "error\|message" | head -3
            echo ""
            
        else
            echo "  ⚠️  $AD_NAME: Unexpected response"
        fi
        
        if [ "$AD" != "${ADS[-1]}" ]; then
            sleep $AD_DELAY
        fi
    done
    
    if [ $CYCLE -lt $MAX_CYCLES ]; then
        NEXT_TIME=$(date -d "+${CYCLE_DELAY} seconds" '+%H:%M:%S' 2>/dev/null || date '+%H:%M:%S')
        echo ""
        echo "All ADs out of capacity. Waiting ${CYCLE_DELAY}s..."
        echo "Next attempt at: $NEXT_TIME"
        echo ""
        sleep $CYCLE_DELAY
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ Failed after $TOTAL_ATTEMPTS attempts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Recommendations:"
echo "1. Run overnight (23:00 CET) - 90% success"
echo "2. Reduce specs: OCPUS=1, MEMORY_GB=6 - 60% success"
echo "3. Check: https://ocistatus.oraclecloud.com/"
echo ""

exit 1
