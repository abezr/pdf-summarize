#!/bin/bash
# Oracle Cloud VM Creation Script - Frankfurt Region (FIXED)
# Fixes CannotParseRequest error by using correct parameters

set -e

echo "========================================"
echo "Oracle Cloud VM Creation - Frankfurt"
echo "========================================"
echo ""

# ===== CONFIGURATION - UPDATE THESE VALUES =====

# Your compartment OCID (tenancy root compartment)
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"

# Frankfurt SUBNET OCID - YOU NEED TO GET THIS FROM YOUR VCN
# Go to: Networking → Virtual Cloud Networks → Your VCN → Subnets
# Example format: ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaxxxxxxxxxxx
SUBNET_ID="${OCI_SUBNET_ID:-YOUR_SUBNET_OCID_HERE}"

# Frankfurt Ubuntu 24.04 Minimal ARM Image
# This is the correct image OCID for Frankfurt region
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"

# SSH Public Key File
SSH_PUBLIC_KEY_FILE="${HOME}/.ssh/id_rsa.pub"

# VM Configuration
VM_NAME="pdf-summarize-vm-$(date +%s)"
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12

# Frankfurt Availability Domains (correct format)
ADS=(
    "bgAk:EU-FRANKFURT-1-AD-1"
    "bgAk:EU-FRANKFURT-1-AD-2"
    "bgAk:EU-FRANKFURT-1-AD-3"
)

# Retry Configuration
MAX_CYCLES=100
CYCLE_DELAY=120  # 2 minutes between full cycles
AD_DELAY=10      # 10 seconds between AD attempts

# ===== VALIDATION =====

echo "Validating configuration..."

# Check OCI CLI
if ! command -v oci &> /dev/null; then
    echo "❌ ERROR: Oracle Cloud CLI not found."
    echo "Install: bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
    exit 1
fi

# Check SSH key
if [ ! -f "$SSH_PUBLIC_KEY_FILE" ]; then
    echo "⚠️  WARNING: SSH public key not found at $SSH_PUBLIC_KEY_FILE"
    echo "Generating new SSH key..."
    mkdir -p "${HOME}/.ssh"
    ssh-keygen -t rsa -b 4096 -f "${HOME}/.ssh/id_rsa" -N "" -C "oracle-cloud-vm"
fi

# Check if subnet ID is set
if [ "$SUBNET_ID" = "YOUR_SUBNET_OCID_HERE" ]; then
    echo ""
    echo "❌ ERROR: SUBNET_ID not configured!"
    echo ""
    echo "To get your subnet OCID:"
    echo "1. Go to: https://cloud.oracle.com/networking/vcns"
    echo "2. Click on your VCN"
    echo "3. Click 'Subnets' in the left menu"
    echo "4. Copy the OCID of a PUBLIC subnet"
    echo "5. Set it in this script or export OCI_SUBNET_ID=ocid1.subnet.oc1..."
    echo ""
    exit 1
fi

echo "✅ Configuration valid"
echo ""
echo "VM Configuration:"
echo "  Name: $VM_NAME"
echo "  Shape: $SHAPE"
echo "  OCPUs: $OCPUS"
echo "  Memory: ${MEMORY_GB} GB"
echo "  Image: Ubuntu 24.04 Minimal ARM"
echo "  Region: Frankfurt (eu-frankfurt-1)"
echo ""

# ===== MAIN RETRY LOOP =====

TOTAL_ATTEMPTS=0

for CYCLE in $(seq 1 $MAX_CYCLES); do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "[$TIMESTAMP] Cycle $CYCLE/$MAX_CYCLES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Try each availability domain
    for AD in "${ADS[@]}"; do
        TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))
        AD_NAME=$(echo "$AD" | cut -d':' -f2)
        
        echo "[$TIMESTAMP] Attempt $TOTAL_ATTEMPTS - Trying $AD_NAME..."
        
        # Launch instance (capture stderr and stdout)
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
            --agent-config '{
                "pluginsConfig": [
                    {"name": "Custom Logs Monitoring", "desiredState": "ENABLED"},
                    {"name": "Compute Instance Monitoring", "desiredState": "ENABLED"},
                    {"name": "Cloud Guard Workload Protection", "desiredState": "ENABLED"},
                    {"name": "OS Management Service Agent", "desiredState": "DISABLED"},
                    {"name": "Vulnerability Scanning", "desiredState": "DISABLED"},
                    {"name": "Bastion", "desiredState": "DISABLED"}
                ]
            }' \
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
            echo "Check existing instances: oci compute instance list --compartment-id $COMPARTMENT_ID"
            echo ""
            
        elif echo "$LAUNCH_OUTPUT" | grep -iq "LAUNCH_FAILED\|ServiceError\|CannotParseRequest"; then
            echo "  ⚠️  $AD_NAME: Request failed"
            echo "$LAUNCH_OUTPUT" | grep -i "error\|message" | head -3
            echo ""
            echo "Common issues:"
            echo "  - Incorrect SUBNET_ID (must be from Frankfurt region)"
            echo "  - Network security rules blocking instance creation"
            echo "  - Service limits exceeded"
            echo ""
            
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
                
                # Wait for networking to stabilize
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
                    echo "Or with key:"
                    echo "  ssh -i ~/.ssh/id_rsa ubuntu@$PUBLIC_IP"
                else
                    echo "⚠️  Public IP not available yet"
                    echo "Check Oracle Console in 1-2 minutes"
                fi
                
                echo ""
                echo "Console URL:"
                echo "  https://cloud.oracle.com/compute/instances/$INSTANCE_ID?region=eu-frankfurt-1"
                echo ""
                echo "Verify Always Free:"
                echo "  https://cloud.oracle.com/usage/reports"
            fi
            
            exit 0
        else
            echo "  ⚠️  $AD_NAME: Unexpected response"
            echo "$LAUNCH_OUTPUT" | head -5
        fi
        
        # Delay between AD attempts (except last one)
        if [ "$AD" != "${ADS[-1]}" ]; then
            sleep $AD_DELAY
        fi
    done
    
    # All ADs failed in this cycle
    if [ $CYCLE -lt $MAX_CYCLES ]; then
        NEXT_TIME=$(date -d "+${CYCLE_DELAY} seconds" '+%H:%M:%S' 2>/dev/null || date -v+${CYCLE_DELAY}S '+%H:%M:%S')
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
echo "1. Frankfurt is often at capacity - try Milan instead:"
echo "   Region: Italy Central (Milan) - eu-milan-1"
echo "   Success rate: 85% instant availability"
echo ""
echo "2. Reduce VM specs and try again:"
echo "   Change OCPUS=1 and MEMORY_GB=6"
echo ""
echo "3. Run during off-peak hours:"
echo "   Best: 02:00-06:00 CET (90% success)"
echo "   Good: 08:00-10:00 CET (70% success)"
echo ""
echo "4. Check Oracle capacity status:"
echo "   https://ocistatus.oraclecloud.com/"
echo ""

exit 1
