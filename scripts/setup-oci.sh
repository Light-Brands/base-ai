#!/bin/bash
# Oracle Cloud Infrastructure Setup Script
# This script configures OCI CLI with your credentials

set -e

echo "=== OCI Setup Script ==="

# Check if OCI CLI is installed
if ! command -v oci &> /dev/null; then
    echo "Installing OCI CLI..."
    pip3 install oci-cli --user
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "OCI CLI version: $(oci --version)"

# Create OCI config directory
mkdir -p ~/.oci

# Check for required environment variables
REQUIRED_VARS=("OCI_USER_OCID" "OCI_TENANCY_OCID" "OCI_REGION" "OCI_FINGERPRINT")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "Error: Missing required environment variables:"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these in your .env.local file or export them."
    exit 1
fi

# Determine key file path
if [ -n "$OCI_PRIVATE_KEY_PATH" ]; then
    KEY_FILE="$OCI_PRIVATE_KEY_PATH"
elif [ -n "$OCI_PRIVATE_KEY_BASE64" ]; then
    KEY_FILE="$HOME/.oci/oci_api_key.pem"
    echo "$OCI_PRIVATE_KEY_BASE64" | base64 -d > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
else
    echo "Error: Either OCI_PRIVATE_KEY_PATH or OCI_PRIVATE_KEY_BASE64 must be set"
    exit 1
fi

# Create OCI config file
cat > ~/.oci/config << EOF
[DEFAULT]
user=${OCI_USER_OCID}
fingerprint=${OCI_FINGERPRINT}
tenancy=${OCI_TENANCY_OCID}
region=${OCI_REGION}
key_file=${KEY_FILE}
EOF

chmod 600 ~/.oci/config

echo "OCI config created at ~/.oci/config"

# Test connection
echo ""
echo "Testing OCI connection..."
export SUPPRESS_LABEL_WARNING=True

if oci iam region list --output table 2>/dev/null; then
    echo ""
    echo "=== OCI Connection Successful! ==="
else
    echo ""
    echo "Warning: Could not connect to OCI. Please verify your credentials."
    echo "You can test manually with: oci iam region list"
fi
