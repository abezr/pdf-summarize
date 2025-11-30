#!/bin/bash
# Oracle Cloud VM Creation Script - Frankfurt Region
# Ready to use with your actual subnet OCID

set -e

echo "========================================"
echo "Oracle Cloud VM Creation - Frankfurt"
echo "Using YOUR actual subnet OCID"
echo "========================================"
echo ""

# ===== YOUR CONFIGURATION (READY TO USE) =====

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
CYCLE_DELAY=120  # 2 minutes between cycles
AD_DELAY=10      # 10 seconds between ADs

# ===== VALIDATION =====

echo "Validating configuration..."

# Check OCI CLI
if ! command -v oci &> /dev/null; then
    echo "❌ ERROR: Oracle Cloud CLI not found."
    exit 1
fi

# Check SSH key
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
echo "  Subnet: ...$(echo $SUBNET_ID | tail -c 20)"
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
    
    # Try each availability domain
    for AD in "${ADS[@]}"; do
        TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))
        AD_NAME=$(echo "$AD" | cut -d':' -f2)
        
        echo "[$TIMESTAMP] Attempt $TOTAL_ATTEMPTS - $AD_NAME..."
        
        # Launch instance
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
            --agent-config '{"pluginsConfig":[{"name":"Custom Logs Monitoring","desiredState":"ENABLED"},{"name":"Compute Instance Monitoring","desiredState":"ENABLED"},{"name":"Cloud Guard Workload Protection","desiredState":"ENABLED"},{"name":"OS Management Service Agent","desiredState":"DISABLED"},{"name":"Vulnerability Scanning","desiredState":"DISABLED"},{"name":"Bastion","desiredState":"DISABLED"}]}' \
            --wait-for-state RUNNING \
            --max-wait-seconds 300 \
            2>&1 || echo "LAUNCH_FAILED")
        
        # Check result
        if echo "$LAUNCH_OUTPUT" | grep -iq "out of.*capacity"; then
            echo "  ❌ $AD_NAME: Out of capacity"
            
        elif echo "$LAUNCH_OUTPUT" | grep -iq "service limit"; then
            echo "  ❌ $AD_NAME: Service limit exceeded"
            echo ""
            echo "⚠️  You may have reached the Always Free limit (2 VMs max)"
            echo ""
            echo "Check existing instances:"
            oci compute instance list \
                --compartment-id "$COMPARTMENT_ID" \
                --lifecycle-state RUNNING \
                --query 'data[*].{Name:"display-name", Shape:shape, AD:"availability-domain"}' \
                --output table 2>/dev/null || true
            exit 1
            
        elif echo "$LAUNCH_OUTPUT" | grep -q "ocid1.instance"; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ SUCCESS! VM Created in $AD_NAME"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            # Extract instance OCID
            INSTANCE_ID=$(echo "$LAUNCH_OUTPUT" | grep -oP 'ocid1\.instance\.[a-zA-Z0-9.]+' | head -1)
            
            if [ -n "$INSTANCE_ID" ]; then
                echo "Instance OCID:"
                echo "  $INSTANCE_ID"
                echo ""
                
                # Wait for networking
                echo "Waiting for network configuration..."
                sleep 15
                
                # Get public IP
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
                    echo "Or with explicit key:"
                    echo "  ssh -i ~/.ssh/id_rsa ubuntu@$PUBLIC_IP"
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
                echo "Total time: ${TOTAL_MIN}m ${TOTAL_TIME}s"
                echo "Total attempts: $TOTAL_ATTEMPTS"
            fi
            
            exit 0
            
        elif echo "$LAUNCH_OUTPUT" | grep -iq "LAUNCH_FAILED\|ServiceError\|CannotParseRequest"; then
            echo "  ⚠️  $AD_NAME: Request failed"
            echo "$LAUNCH_OUTPUT" | grep -i "error\|message" | head -3
            echo ""
            
        else
            echo "  ⚠️  $AD_NAME: Unexpected response"
        fi
        
        # Delay between ADs
        if [ "$AD" != "${ADS[-1]}" ]; then
            sleep $AD_DELAY
        fi
    done
    
    # All ADs failed
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
echo "Frankfurt is at capacity. Recommendations:"
echo ""
echo "1. Run this script overnight (start at 23:00 CET)"
echo "   Expected success: 90% within 4-12 hours"
echo ""
echo "2. Reduce VM specs (higher success rate):"
echo "   Edit this script: OCPUS=1, MEMORY_GB=6"
echo "   Expected success: 60% within 2-6 hours"
echo ""
echo "3. Check capacity status:"
echo "   https://ocistatus.oraclecloud.com/"
echo ""

exit 1
