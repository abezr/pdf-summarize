#!/bin/bash
#
# Oracle Cloud Always Free ARM VM Auto-Creation Script
# Multi-Region Support: Milan → Marseille → Stockholm
# Retries until successful
#

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Oracle Cloud ARM VM Auto-Creation Script (Multi-Region)   ║"
echo "║              Optimized for Central/East Europe              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ==================== CONFIGURATION ====================

# Compartment ID (same across all regions)
COMPARTMENT_ID="ocid1.tenancy.oc1..aaaaaaaawysgf5ttq7rr4n5tlojuhhrvfge44qowmqxvxl76cqcrerkvbd6q"

# SSH public key file
SSH_KEY_FILE="./id_rsa.pub"

# VM Configuration
SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12
DISPLAY_NAME="pdf-summarize-vm-$(date +%Y%m%d-%H%M%S)"

# Retry Configuration
MAX_RETRIES=500
RETRY_DELAY=120  # 2 minutes between full region cycles

# ==================== REGION DEFINITIONS ====================

# Milan Region (Your current region - try first)
REGION_MILAN="eu-milan-1"
MILAN_SUBNET="ocid1.subnet.oc1.eu-milan-1.aaaaaaaal26yvy2bfygaarnvmr2lrii3gyuhziygobkfuzvadqcw3qsciatq"
MILAN_IMAGE="ocid1.image.oc1.eu-milan-1.aaaaaaaaq4bgs3zvqpowagemvdn273poop5vlwdls2isccsrhphekmhe6mma"
MILAN_ADS=(
    "Mhwk:EU-MILAN-1-AD-1"
    "Mhwk:EU-MILAN-1-AD-2"
    "Mhwk:EU-MILAN-1-AD-3"
)

# Marseille Region (Alternative 1)
REGION_MARSEILLE="eu-marseille-1"
# UPDATE these values if switching to Marseille:
MARSEILLE_SUBNET="YOUR_MARSEILLE_SUBNET_OCID"  # Get from Oracle Console
MARSEILLE_IMAGE="YOUR_MARSEILLE_IMAGE_OCID"    # Ubuntu 24.04 ARM for Marseille
MARSEILLE_ADS=(
    "avBf:EU-MARSEILLE-1-AD-1"
    "avBf:EU-MARSEILLE-1-AD-2"
    "avBf:EU-MARSEILLE-1-AD-3"
)

# Stockholm Region (Alternative 2)
REGION_STOCKHOLM="eu-stockholm-1"
# UPDATE these values if switching to Stockholm:
STOCKHOLM_SUBNET="YOUR_STOCKHOLM_SUBNET_OCID"
STOCKHOLM_IMAGE="YOUR_STOCKHOLM_IMAGE_OCID"
STOCKHOLM_ADS=(
    "WnLB:EU-STOCKHOLM-1-AD-1"
)

# ==================== AGENT CONFIGURATION ====================

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
    echo "Generate with: ssh-keygen -t rsa -b 4096 -f ./id_rsa -N \"\""
    exit 1
fi

echo "Configuration:"
echo "  Display Name: $DISPLAY_NAME"
echo "  Shape: $SHAPE ($OCPUS OCPU, ${MEMORY_GB}GB RAM)"
echo "  SSH Key: $SSH_KEY_FILE"
echo "  Retry Delay: ${RETRY_DELAY}s between cycles"
echo "  Max Retries: $MAX_RETRIES cycles"
echo ""

# ==================== HELPER FUNCTIONS ====================

try_create_instance() {
    local region=$1
    local ad=$2
    local subnet=$3
    local image=$4
    
    local ad_short=$(echo "$ad" | cut -d':' -f2)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] Trying: $region / $ad_short"
    
    # Attempt to create instance
    local result=$(oci compute instance launch \
        --region "$region" \
        --compartment-id "$COMPARTMENT_ID" \
        --availability-domain "$ad" \
        --shape "$SHAPE" \
        --shape-config "{\"memory_in_gbs\": $MEMORY_GB, \"ocpus\": $OCPUS}" \
        --subnet-id "$subnet" \
        --image-id "$image" \
        --display-name "$DISPLAY_NAME" \
        --assign-public-ip true \
        --assign-private-dns-record true \
        --ssh-authorized-keys-file "$SSH_KEY_FILE" \
        --agent-config "$AGENT_CONFIG" \
        --availability-config "$AVAILABILITY_CONFIG" \
        --instance-options "$INSTANCE_OPTIONS" \
        --wait-for-state RUNNING \
        --max-wait-seconds 300 \
        2>&1 || echo "FAILED")
    
    # Check result
    if echo "$result" | grep -qi "out of host capacity\|out of capacity"; then
        echo "  ❌ Out of capacity"
        return 1
    elif echo "$result" | grep -qi "RUNNING\|ocid1.instance"; then
        echo ""
        echo "╔═══════════════════════════════════════════════════════════╗"
        echo "║  ✅ SUCCESS! Instance created in $region / $ad_short"
        echo "╚═══════════════════════════════════════════════════════════╝"
        echo ""
        
        # Extract instance OCID
        local instance_id=$(echo "$result" | grep -oP 'ocid1\.instance\.[a-z0-9.]+' | head -1)
        
        if [ -n "$instance_id" ]; then
            echo "Instance Details:"
            echo "  OCID: $instance_id"
            echo "  Region: $region"
            echo "  AD: $ad_short"
            echo ""
            
            # Wait for public IP assignment
            echo "Waiting for public IP assignment..."
            sleep 15
            
            # Get public IP
            local public_ip=$(oci compute instance list-vnics \
                --region "$region" \
                --instance-id "$instance_id" \
                --query 'data[0]."public-ip"' \
                --raw-output 2>/dev/null || echo "unknown")
            
            if [ "$public_ip" != "unknown" ] && [ -n "$public_ip" ]; then
                echo "  Public IP: $public_ip"
                echo ""
                echo "SSH Command:"
                echo "  ssh -i ./id_rsa ubuntu@$public_ip"
            else
                echo "  ⚠️  Public IP not yet available"
                echo "     Check Oracle Console in a few minutes"
            fi
            
            echo ""
            echo "View in Console:"
            echo "  https://cloud.oracle.com/compute/instances/$instance_id?region=$region"
            echo ""
        fi
        
        return 0
    else
        echo "  ⚠️  Unexpected error"
        echo "$result" | head -3
        return 1
    fi
}

# ==================== MAIN RETRY LOOP ====================

CYCLE=0

while [ $CYCLE -lt $MAX_RETRIES ]; do
    CYCLE=$((CYCLE + 1))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Cycle $CYCLE of $MAX_RETRIES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Try Milan (Primary region)
    echo ""
    echo "🇮🇹 Region: MILAN (eu-milan-1) - Primary"
    for ad in "${MILAN_ADS[@]}"; do
        if try_create_instance "$REGION_MILAN" "$ad" "$MILAN_SUBNET" "$MILAN_IMAGE"; then
            exit 0
        fi
        sleep 3
    done
    
    # Try Marseille (if configured)
    if [ "$MARSEILLE_SUBNET" != "YOUR_MARSEILLE_SUBNET_OCID" ]; then
        echo ""
        echo "🇫🇷 Region: MARSEILLE (eu-marseille-1) - Alternative 1"
        for ad in "${MARSEILLE_ADS[@]}"; do
            if try_create_instance "$REGION_MARSEILLE" "$ad" "$MARSEILLE_SUBNET" "$MARSEILLE_IMAGE"; then
                exit 0
            fi
            sleep 3
        done
    fi
    
    # Try Stockholm (if configured)
    if [ "$STOCKHOLM_SUBNET" != "YOUR_STOCKHOLM_SUBNET_OCID" ]; then
        echo ""
        echo "🇸🇪 Region: STOCKHOLM (eu-stockholm-1) - Alternative 2"
        for ad in "${STOCKHOLM_ADS[@]}"; do
            if try_create_instance "$REGION_STOCKHOLM" "$ad" "$STOCKHOLM_SUBNET" "$STOCKHOLM_IMAGE"; then
                exit 0
            fi
            sleep 3
        done
    fi
    
    # All regions/ADs failed in this cycle
    if [ $CYCLE -lt $MAX_RETRIES ]; then
        echo ""
        echo "⏰ All regions out of capacity. Waiting ${RETRY_DELAY}s before next cycle..."
        local next_attempt=$(date -d "+${RETRY_DELAY} seconds" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v+${RETRY_DELAY}S '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "soon")
        echo "   Next attempt: $next_attempt"
        sleep $RETRY_DELAY
    fi
done

# Max retries reached
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ❌ FAILED after $MAX_RETRIES cycles"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Suggestions:"
echo "  1. Try during off-peak hours (02:00-06:00 CET)"
echo "  2. Try on weekends (lower business usage)"
echo "  3. Configure additional regions (Marseille, Stockholm)"
echo "  4. Reduce specs (1 OCPU, 6GB RAM)"
echo "  5. Consider paid tier ($21/month for 2 OCPU, 8GB RAM)"
echo ""

exit 1
