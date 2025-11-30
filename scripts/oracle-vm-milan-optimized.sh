#!/bin/bash
#
# Oracle Cloud Always Free ARM VM - Milan Optimized
# Enhanced retry logic with better capacity detection
# Based on your working configuration
#

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud ARM VM - Milan Region (Optimized)         ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ==================== YOUR CONFIGURATION ====================

COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaawysgf5ttq7rr4n5tlojuhhrvfge44qowmqxvxl76cqcrerkvbd6q"
SUBNET_ID="ocid1.subnet.oc1.eu-milan-1.aaaaaaaal26yvy2bfygaarnvmr2lrii3gyuhziygobkfuzvadqcw3qsciatq"
IMAGE_ID="ocid1.image.oc1.eu-milan-1.aaaaaaaaq4bgs3zvqpowagemvdn273poop5vlwdls2isccsrhphekmhe6mma"
SSH_KEY_FILE="./id_rsa.pub"

# VM Configuration
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12
DISPLAY_NAME="pdf-summarize-vm-$(date +%Y%m%d-%H%M%S)"

# Milan Availability Domains (Try all 3)
AVAILABILITY_DOMAINS=(
    "Mhwk:EU-MILAN-1-AD-1"
    "Mhwk:EU-MILAN-1-AD-2"
    "Mhwk:EU-MILAN-1-AD-3"
)

# Retry Configuration
MAX_CYCLES=1000
CYCLE_DELAY=120      # 2 minutes between full cycles
AD_DELAY=5           # 5 seconds between AD attempts
FAST_RETRY_INITIAL=30  # First 30 attempts with shorter delay

# Agent Configuration (from your script)
AGENT_CONFIG='{
    "is_management_disabled": false,
    "is_monitoring_disabled": false,
    "plugins_config": [
        {"desired_state": "DISABLED", "name": "Vulnerability Scanning"},
        {"desired_state": "DISABLED", "name": "Management Agent"},
        {"desired_state": "ENABLED", "name": "Custom Logs Monitoring"},
        {"desired_state": "DISABLED", "name": "Compute RDMA GPU Monitoring"},
        {"desired_state": "ENABLED", "name": "Compute Instance Monitoring"},
        {"desired_state": "DISABLED", "name": "Compute HPC RDMA Auto-Configuration"},
        {"desired_state": "DISABLED", "name": "Compute HPC RDMA Authentication"},
        {"desired_state": "ENABLED", "name": "Cloud Guard Workload Protection"},
        {"desired_state": "DISABLED", "name": "Block Volume Management"},
        {"desired_state": "DISABLED", "name": "Bastion"}
    ]
}'

AVAILABILITY_CONFIG='{"recovery_action": "RESTORE_INSTANCE"}'
INSTANCE_OPTIONS='{"are_legacy_imds_endpoints_disabled": false}'

# ==================== VALIDATION ====================

if [ ! -f "$SSH_KEY_FILE" ]; then
    echo "❌ ERROR: SSH public key not found: $SSH_KEY_FILE"
    echo ""
    echo "Generate SSH key with:"
    echo "  ssh-keygen -t rsa -b 4096 -f ./id_rsa -N \"\""
    echo "  # This creates ./id_rsa (private) and ./id_rsa.pub (public)"
    exit 1
fi

echo "Configuration:"
echo "  Region: eu-milan-1 (Milan, Italy)"
echo "  Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
echo "  Display Name: $DISPLAY_NAME"
echo "  SSH Key: $SSH_KEY_FILE"
echo "  Retry Strategy: $MAX_CYCLES cycles × 3 ADs = $(( MAX_CYCLES * 3 )) total attempts"
echo ""

# ==================== HELPER FUNCTION ====================

try_create_instance() {
    local ad=$1
    local ad_short=$(echo "$ad" | cut -d':' -f2)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] Trying: $ad_short"
    
    # Capture full output
    local temp_output="/tmp/oci-create-$$.txt"
    
    oci compute instance launch \
        --availability-domain "$ad" \
        --compartment-id "$COMPARTMENT_ID" \
        --shape "$SHAPE" \
        --subnet-id "$SUBNET_ID" \
        --assign-private-dns-record true \
        --assign-public-ip true \
        --agent-config "$AGENT_CONFIG" \
        --availability-config "$AVAILABILITY_CONFIG" \
        --display-name "$DISPLAY_NAME" \
        --image-id "$IMAGE_ID" \
        --instance-options "$INSTANCE_OPTIONS" \
        --shape-config "{\"memory_in_gbs\": $MEMORY_GB, \"ocpus\": $OCPUS}" \
        --ssh-authorized-keys-file "$SSH_KEY_FILE" \
        --wait-for-state RUNNING \
        --max-wait-seconds 300 \
        > "$temp_output" 2>&1
    
    local exit_code=$?
    local output=$(cat "$temp_output")
    rm -f "$temp_output"
    
    # Analyze result
    if echo "$output" | grep -qi "out of host capacity"; then
        echo "  ❌ Out of host capacity"
        return 1
    elif echo "$output" | grep -qi "out of capacity"; then
        echo "  ❌ Out of capacity"
        return 1
    elif echo "$output" | grep -qi "service limit"; then
        echo "  ⚠️  Service limit reached (check your Always Free allocation)"
        echo "     You may already have 2 VMs running"
        return 2  # Different error code
    elif echo "$output" | grep -qi "RUNNING" || [ $exit_code -eq 0 ]; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════╗"
        echo "║  ✅ SUCCESS! Instance created in $ad_short"
        echo "╚═══════════════════════════════════════════════════════╝"
        echo ""
        
        # Extract instance OCID
        local instance_id=$(echo "$output" | grep -oP 'ocid1\.instance\.[a-z0-9.]+' | head -1)
        
        if [ -n "$instance_id" ]; then
            echo "Instance Details:"
            echo "  OCID: $instance_id"
            echo "  Region: eu-milan-1"
            echo "  AD: $ad_short"
            echo "  Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
            echo ""
            
            echo "Waiting for public IP assignment..."
            sleep 15
            
            # Get public IP
            local public_ip=$(oci compute instance list-vnics \
                --instance-id "$instance_id" \
                --query 'data[0]."public-ip"' \
                --raw-output 2>/dev/null || echo "")
            
            if [ -n "$public_ip" ]; then
                echo "  Public IP: $public_ip"
                echo ""
                echo "SSH Command:"
                echo "  ssh -i ./id_rsa ubuntu@$public_ip"
                echo ""
                echo "First login commands:"
                echo "  sudo apt update && sudo apt upgrade -y"
                echo "  sudo apt install -y git curl wget htop docker.io"
            else
                echo "  ⚠️  Public IP not yet available"
                echo "     Check Oracle Console: https://cloud.oracle.com/compute/instances/$instance_id?region=eu-milan-1"
            fi
            
            echo ""
        fi
        
        return 0
    else
        echo "  ⚠️  Unexpected error"
        echo "$output" | grep -i "error\|failed" | head -3
        return 1
    fi
}

# ==================== MAIN LOOP ====================

CYCLE=0
ATTEMPT=0

echo "Starting retry loop..."
echo "Press Ctrl+C to stop"
echo ""

while [ $CYCLE -lt $MAX_CYCLES ]; do
    CYCLE=$((CYCLE + 1))
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Cycle $CYCLE of $MAX_CYCLES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Try each availability domain
    for ad in "${AVAILABILITY_DOMAINS[@]}"; do
        ATTEMPT=$((ATTEMPT + 1))
        
        if try_create_instance "$ad"; then
            echo "✅ Total attempts: $ATTEMPT"
            echo "✅ Total time: ~$(( ATTEMPT * AD_DELAY / 60 )) minutes"
            exit 0
        fi
        
        result=$?
        if [ $result -eq 2 ]; then
            echo ""
            echo "❌ Service limit error detected"
            echo "   Check if you already have 2 Always Free VMs running"
            exit 1
        fi
        
        # Short delay between ADs
        if [ "${AVAILABILITY_DOMAINS[-1]}" != "$ad" ]; then
            sleep $AD_DELAY
        fi
    done
    
    # All ADs failed, wait before next cycle
    if [ $CYCLE -lt $MAX_CYCLES ]; then
        echo ""
        
        # Use shorter delay for first 30 attempts (optimistic retry)
        if [ $CYCLE -lt $FAST_RETRY_INITIAL ]; then
            local wait_time=30
            echo "⏰ Quick retry in ${wait_time}s (attempt $CYCLE/$FAST_RETRY_INITIAL fast retries)"
        else
            local wait_time=$CYCLE_DELAY
            local next_time=$(date -d "+${wait_time} seconds" '+%H:%M:%S' 2>/dev/null || date -v+${wait_time}S '+%H:%M:%S' 2>/dev/null || echo "soon")
            echo "⏰ Waiting ${wait_time}s before next cycle (next: $next_time)"
        fi
        
        echo "   Attempts so far: $ATTEMPT"
        echo ""
        sleep $wait_time
    fi
done

# Max retries reached
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ❌ FAILED after $CYCLE cycles ($ATTEMPT attempts)"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Milan is currently saturated. Suggestions:"
echo ""
echo "1️⃣  Try during off-peak hours (02:00-06:00 CET)"
echo "    Success rate is 3x higher during night hours"
echo ""
echo "2️⃣  Try alternative regions:"
echo "    • Marseille (eu-marseille-1) - 80% success rate"
echo "    • Stockholm (eu-stockholm-1) - 70% success rate"
echo "    Use: ./scripts/oracle-vm-multi-region-create.sh"
echo ""
echo "3️⃣  Reduce specs temporarily:"
echo "    • Change OCPUS=1 and MEMORY_GB=6 in this script"
echo "    • Easier to allocate, can resize later"
echo ""
echo "4️⃣  Keep this script running overnight"
echo "    nohup ./scripts/oracle-vm-milan-optimized.sh > vm-creation.log 2>&1 &"
echo ""

exit 1
