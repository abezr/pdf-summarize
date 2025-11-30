# Oracle Cloud OCID Quick Reference

**Project**: pdf-summarize  
**Purpose**: Quick identification of OCI resource OCIDs  
**Date**: 2025-11-30

---

## What is an OCID?

An **OCID** (Oracle Cloud IDentifier) is a unique identifier for every resource in Oracle Cloud Infrastructure.

Format: `ocid1.<RESOURCE_TYPE>.<REALM>.[REGION][.FUTURE_USE].<UNIQUE_ID>`

---

## OCID Patterns by Resource Type

### 🔍 How to Identify OCIDs

| Resource Type | OCID Pattern | Example |
|---------------|--------------|---------|
| **Tenancy** | `ocid1.tenancy.oc1..aaaaaaa...` | `ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq` |
| **Compartment** | `ocid1.compartment.oc1..aaaaaaa...` | `ocid1.compartment.oc1..aaaaaaaawg6gbbxlxnxxxx` |
| **VCN** | `ocid1.vcn.oc1.<region>.aaaaaaa...` | `ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaaxxxxxxxxxxx` |
| **Subnet** | `ocid1.subnet.oc1.<region>.aaaaaaa...` | `ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaayxxxxxxxx` |
| **Instance** | `ocid1.instance.oc1.<region>.aaaaaaa...` | `ocid1.instance.oc1.eu-milan-1.anrhxxxxxxxxxxxxxxxhq` |
| **Image** | `ocid1.image.oc1.<region>.aaaaaaa...` | `ocid1.image.oc1.eu-milan-1.aaaaaaaaq4bgs3zvqpowagemvdn273poop5vlwdls2isccsrhphekmhe6mma` |
| **Volume** | `ocid1.volume.oc1.<region>.aaaaaaa...` | `ocid1.volume.oc1.eu-frankfurt-1.abthxxxxxxxxxx` |
| **VNIC** | `ocid1.vnic.oc1.<region>.aaaaaaa...` | `ocid1.vnic.oc1.eu-milan-1.abzxxxxxxxxxxxxxxxhq` |

---

## Common Mistakes

### ❌ Using Image OCID as Subnet ID

**WRONG:**
```bash
--subnet-id "ocid1.image.oc1.eu-frankfurt-1.aaaaaaaafb2sye3yjqkh3ejoeindkf2jgbgo2cciffs6sbwnpbgvclz6q5zq"
```
↑ This is an **IMAGE** OCID (starts with `ocid1.image`)

**CORRECT:**
```bash
--subnet-id "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaayxxxxxxxxxxxxxxxx"
```
↑ This is a **SUBNET** OCID (starts with `ocid1.subnet`)

---

### ❌ Using Wrong Region's Image

**WRONG:**
```bash
# Frankfurt instance with Milan image
REGION="eu-frankfurt-1"
IMAGE_ID="ocid1.image.oc1.eu-milan-1.aaaaaaaaq4bgs3zvqpowagemvdn273poop5vlwdls2isccsrhphekmhe6mma"
```
↑ Image region (`eu-milan-1`) doesn't match target region (`eu-frankfurt-1`)

**CORRECT:**
```bash
# Frankfurt instance with Frankfurt image
REGION="eu-frankfurt-1"
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"
```
↑ Both are in `eu-frankfurt-1` region

---

## How to Find Your OCIDs

### 1. Get Tenancy OCID
```bash
# From OCI CLI config
cat ~/.oci/config | grep tenancy

# Or via CLI
oci iam tenancy get --tenancy-id $(cat ~/.oci/config | grep tenancy | cut -d'=' -f2)
```

### 2. Get Compartment OCID
```bash
# List all compartments
oci iam compartment list --all

# Get root compartment (same as tenancy)
oci iam compartment list --compartment-id-in-subtree true | jq '.data[0].id'
```

### 3. Get VCN OCID
```bash
# List VCNs
oci network vcn list --compartment-id <your-compartment-id>

# Example output:
{
  "data": [
    {
      "id": "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaaxxxxxxxxxxx",
      "display-name": "vcn-20250101-1234",
      "cidr-block": "10.0.0.0/16"
    }
  ]
}
```

### 4. Get Subnet OCID
```bash
# List subnets in a VCN
oci network subnet list --compartment-id <your-compartment-id>

# Or list all subnets with details
oci network subnet list \
  --compartment-id <your-compartment-id> \
  --query 'data[*].{Name:"display-name", OCID:id, CIDR:"cidr-block", Public:"prohibit-public-ip-on-vnic"}' \
  --output table
```

**Console (Web UI):**
1. Go to: https://cloud.oracle.com/networking/vcns
2. Click your VCN
3. Click "Subnets" in left menu
4. Click "Copy" next to the subnet OCID

### 5. Get Image OCID
```bash
# List Ubuntu ARM images in Frankfurt
oci compute image list \
  --compartment-id <your-compartment-id> \
  --operating-system "Canonical Ubuntu" \
  --shape "VM.Standard.A1.Flex" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query 'data[0:5].{Name:"display-name", OCID:id}' \
  --output table

# Example output:
+-------------------------------------------------+-------------------------------------------------------------------+
| Name                                            | OCID                                                              |
+-------------------------------------------------+-------------------------------------------------------------------+
| Canonical-Ubuntu-24.04-Minimal-aarch64-2025-... | ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipf... |
| Canonical-Ubuntu-22.04-Minimal-aarch64-2025-... | ocid1.image.oc1.eu-frankfurt-1.aaaaaaaaxxxxxxxxxxxxxxxxxxx...     |
+-------------------------------------------------+-------------------------------------------------------------------+
```

**Console (Web UI):**
1. Compute → Instances → Create Instance
2. Click "Change Image"
3. Select your OS
4. Click "Show Shape, OCID and other details"
5. Copy the OCID

### 6. Get Instance OCID
```bash
# List instances
oci compute instance list \
  --compartment-id <your-compartment-id> \
  --query 'data[*].{Name:"display-name", OCID:id, State:"lifecycle-state", IP:"public-ip"}' \
  --output table
```

**Console (Web UI):**
1. Compute → Instances
2. Click your instance
3. Copy OCID from "Instance Information" section

---

## Your Project OCIDs

Based on your script, here's what you have:

### ✅ Correct OCIDs

```bash
# Tenancy (root compartment)
TENANCY_ID="ocid1.tenancy.oc1..aaaaaaaaaexendz3ouyd4r6vdcr3obemx2qbqgtjstlxzxr3ip7hfg6xrohq"

# Milan Image (Ubuntu 24.04 Minimal ARM)
MILAN_IMAGE="ocid1.image.oc1.eu-milan-1.aaaaaaaaq4bgs3zvqpowagemvdn273poop5vlwdls2isccsrhphekmhe6mma"

# Frankfurt Image (Ubuntu 24.04 Minimal ARM)
FRANKFURT_IMAGE="ocid1.image.oc1.eu-frankfurt-1.aaaaaaaah66vfjgzqh72j6jifpvdipfbkn6hucqj5crfa7nhvopqklysyahq"
```

### ❌ Missing OCIDs (You Need to Find These)

```bash
# Frankfurt Subnet - GET THIS FROM YOUR VCN!
FRANKFURT_SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.???????????????"
# → Go to: https://cloud.oracle.com/networking/vcns → Your VCN → Subnets → Copy OCID

# Milan Subnet (if using Milan)
MILAN_SUBNET_ID="ocid1.subnet.oc1.eu-milan-1.???????????????"
# → Same process, but in Milan region
```

---

## OCID Validation Checklist

Before running `oci compute instance launch`, verify:

- [ ] **Compartment OCID** starts with `ocid1.tenancy` or `ocid1.compartment`
- [ ] **Subnet OCID** starts with `ocid1.subnet`
- [ ] **Image OCID** starts with `ocid1.image`
- [ ] **Subnet region** matches **target region** (e.g., both `eu-frankfurt-1`)
- [ ] **Image region** matches **target region**
- [ ] **Availability domain** matches **region** (e.g., `bgAk:EU-FRANKFURT-1-AD-1`)

---

## Quick Validation Commands

### Validate Subnet OCID
```bash
SUBNET_ID="ocid1.subnet.oc1.eu-frankfurt-1.YOUR_SUBNET_ID"

oci network subnet get --subnet-id "$SUBNET_ID"
```

**Expected output:**
```json
{
  "data": {
    "id": "ocid1.subnet.oc1.eu-frankfurt-1...",
    "display-name": "Public Subnet-vcn-...",
    "cidr-block": "10.0.0.0/24",
    "lifecycle-state": "AVAILABLE"
  }
}
```

### Validate Image OCID
```bash
IMAGE_ID="ocid1.image.oc1.eu-frankfurt-1.YOUR_IMAGE_ID"

oci compute image get --image-id "$IMAGE_ID"
```

**Expected output:**
```json
{
  "data": {
    "id": "ocid1.image.oc1.eu-frankfurt-1...",
    "display-name": "Canonical-Ubuntu-24.04-Minimal-aarch64-2025-...",
    "operating-system": "Canonical Ubuntu",
    "lifecycle-state": "AVAILABLE"
  }
}
```

---

## Common CLI Errors and OCID Causes

| Error | Likely OCID Issue |
|-------|-------------------|
| `CannotParseRequest` | Wrong OCID type (e.g., image OCID used as subnet) |
| `NotAuthorizedOrNotFound` | OCID from different compartment/region |
| `InvalidParameter` | OCID format invalid or resource doesn't exist |
| `RegionNotMatch` | Image/subnet region doesn't match target region |

---

## Region Codes Reference

| Region Name | Region Code | AD Format |
|-------------|-------------|-----------|
| Frankfurt | `eu-frankfurt-1` | `bgAk:EU-FRANKFURT-1-AD-{1,2,3}` |
| Milan | `eu-milan-1` | `Mhwk:EU-MILAN-1-AD-{1,2,3}` |
| Marseille | `eu-marseille-1` | `avge:EU-MARSEILLE-1-AD-1` |
| Stockholm | `eu-stockholm-1` | `ylYl:EU-STOCKHOLM-1-AD-1` |
| Amsterdam | `eu-amsterdam-1` | `CDAI:EU-AMSTERDAM-1-AD-1` |
| Zurich | `eu-zurich-1` | `GxS4:EU-ZURICH-1-AD-1` |
| London | `uk-london-1` | `yngi:UK-LONDON-1-AD-{1,2,3}` |

---

## Resources

- **OCI OCID Documentation**: https://docs.oracle.com/en-us/iaas/Content/General/Concepts/identifiers.htm
- **OCI CLI Reference**: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/
- **Oracle Cloud Console**: https://cloud.oracle.com/
- **This Project**: https://github.com/abezr/pdf-summarize

---

## Quick Command Template

```bash
#!/bin/bash
# OCI Instance Launch - OCID Template

# 1. Set your OCIDs (GET THESE FROM YOUR CONSOLE!)
COMPARTMENT_ID="ocid1.tenancy.oc1..YOUR_TENANCY_ID"
SUBNET_ID="ocid1.subnet.oc1.REGION.YOUR_SUBNET_ID"  # ← MUST BE SUBNET OCID!
IMAGE_ID="ocid1.image.oc1.REGION.YOUR_IMAGE_ID"     # ← MUST MATCH REGION!
AD="XXXX:REGION-AD-1"                                # ← MUST MATCH REGION!

# 2. Validate (run these first!)
oci network subnet get --subnet-id "$SUBNET_ID"
oci compute image get --image-id "$IMAGE_ID"

# 3. Launch instance
oci compute instance launch \
  --compartment-id "$COMPARTMENT_ID" \
  --availability-domain "$AD" \
  --shape "VM.Standard.A1.Flex" \
  --shape-config '{"ocpus":2,"memoryInGBs":12}' \
  --image-id "$IMAGE_ID" \
  --subnet-id "$SUBNET_ID" \
  --display-name "test-vm" \
  --assign-public-ip true \
  --ssh-authorized-keys-file "${HOME}/.ssh/id_rsa.pub"
```

---

**Last Updated**: 2025-11-30  
**Status**: Reference ✅
