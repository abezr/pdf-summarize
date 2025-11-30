#!/bin/bash
# Oracle Cloud Always Free VM Auto-Creation Script
# Retries every 2 minutes until VM is created
# Region: Germany-Frankfurt-1

set -e

echo "========================================"
echo "Oracle Cloud VM Auto-Creation Script"
echo "Region: Frankfurt (eu-frankfurt-1)"
echo "========================================"
echo ""

# Configuration (UPDATE THESE VALUES)
COMPARTMENT_ID="${OCI_COMPARTMENT_ID:-ocid1.compartment.oc1..your-compartment-id}"
SUBNET_ID="${OCI_SUBNET_ID:-ocid1.subnet.oc1.eu-frankfurt-1.your-subnet-id}"
IMAGE_ID="${OCI_IMAGE_ID:-ocid1.image.oc1.eu-frankfurt-1.aaaaaaaautkmv7ugumfyq5pjbgqvvfq37bqvz5ssxvslzl4pstdvqz5r5p6a}"  # Ubuntu 22.04 ARM

# VM Configuration
VM_NAME="pdf-summarize-vm-$(date +%s)"
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12
SSH_PUBLIC_KEY_FILE="${HOME}/.ssh/id_rsa.pub"

# Availability domains to try (Frankfurt has 3)
ADS=("ikLc:EU-FRANKFURT-1-AD-1" "ikLc:EU-FRANKFURT-1-AD-2" "ikLc:EU-FRANKFURT-1-AD-3")

# Retry configuration
MAX_RETRIES=1000
RETRY_DELAY=120  # 2 minutes between retries
ATTEMPT=0

echo "Configuration:"
echo "  VM Name: $VM_NAME"
echo "  Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
echo "  Retry delay: ${RETRY_DELAY}s"
echo "  Max retries: $MAX_RETRIES"
echo ""

# Check if OCI CLI is configured
if ! command -v oci &> /dev/null; then
    echo "❌ ERROR: Oracle Cloud CLI not found."
    echo "Install: bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
    exit 1
fi

# Check SSH key
if [ ! -f "$SSH_PUBLIC_KEY_FILE" ]; then
    echo "⚠️  WARNING: SSH public key not found at $SSH_PUBLIC_KEY_FILE"
    echo "Generating new SSH key..."
    ssh-keygen -t rsa -b 4096 -f "${HOME}/.ssh/id_rsa" -N "" -C "oracle-cloud-vm"
fi

SSH_PUBLIC_KEY=$(cat "$SSH_PUBLIC_KEY_FILE")

# Main retry loop
while [ $ATTEMPT -lt $MAX_RETRIES ]; do
    ATTEMPT=$((ATTEMPT + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Try each availability domain
    for AD in "${ADS[@]}"; do
        AD_NAME=$(echo "$AD" | cut -d':' -f2)
        echo "[$TIMESTAMP] Attempt $ATTEMPT - Trying $AD_NAME..."
        
        # Try to create VM
        RESULT=$(oci compute instance launch \
            --compartment-id "$COMPARTMENT_ID" \
            --availability-domain "$AD" \
            --shape "$SHAPE" \
            --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
            --image-id "$IMAGE_ID" \
            --subnet-id "$SUBNET_ID" \
            --display-name "$VM_NAME" \
            --assign-public-ip true \
            --ssh-authorized-keys-file "$SSH_PUBLIC_KEY_FILE" \
            --wait-for-state RUNNING \
            --max-wait-seconds 300 \
            2>&1 || echo "FAILED")
        
        if echo "$RESULT" | grep -q "Out of capacity\|OutOfCapacity"; then
            echo "  ❌ $AD_NAME: Out of capacity"
            continue
        elif echo "$RESULT" | grep -q "RUNNING\|ocid1.instance"; then
            echo ""
            echo "=========================================="
            echo "✅ SUCCESS! VM created in $AD_NAME"
            echo "=========================================="
            echo ""
            
            # Extract instance OCID and public IP
            INSTANCE_ID=$(echo "$RESULT" | grep -oP 'ocid1\.instance\.[^"]+' | head -1)
            
            if [ -n "$INSTANCE_ID" ]; then
                echo "Instance OCID: $INSTANCE_ID"
                
                # Get public IP
                sleep 10
                PUBLIC_IP=$(oci compute instance list-vnics \
                    --instance-id "$INSTANCE_ID" \
                    --query 'data[0]."public-ip"' \
                    --raw-output 2>/dev/null || echo "unknown")
                
                if [ "$PUBLIC_IP" != "unknown" ] && [ -n "$PUBLIC_IP" ]; then
                    echo "Public IP: $PUBLIC_IP"
                    echo ""
                    echo "SSH command:"
                    echo "  ssh ubuntu@$PUBLIC_IP"
                else
                    echo "⚠️  Public IP not yet available. Check Oracle Console."
                fi
            fi
            
            echo ""
            echo "View in console:"
            echo "  https://cloud.oracle.com/compute/instances/$INSTANCE_ID"
            
            exit 0
        else
            echo "  ⚠️  $AD_NAME: Unexpected response (check logs)"
            echo "$RESULT" | head -5
        fi
    done
    
    # All ADs failed, wait before retry
    if [ $ATTEMPT -lt $MAX_RETRIES ]; then
        echo ""
        echo "All availability domains full. Waiting ${RETRY_DELAY}s before retry..."
        echo "Next attempt at: $(date -d "+${RETRY_DELAY} seconds" '+%Y-%m-%d %H:%M:%S')"
        echo ""
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "❌ Failed after $MAX_RETRIES attempts"
echo "Try again later or consider a different region"
exit 1
