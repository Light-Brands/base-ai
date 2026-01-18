# Oracle Cloud Infrastructure (OCI) Setup

This document explains how to configure Oracle Cloud for the AI Solution Architect backend.

## Prerequisites

1. An Oracle Cloud account (Free Tier works)
2. OCI CLI installed (`pip install oci-cli`)
3. API Key generated in OCI Console

## Configuration

### 1. Get Your OCI Credentials

Log into [Oracle Cloud Console](https://cloud.oracle.com) and gather:

| Credential | Where to Find |
|------------|---------------|
| User OCID | Profile → User Settings → Copy OCID |
| Tenancy OCID | Profile → Tenancy → Copy OCID |
| Region | Your console URL (e.g., `us-chicago-1`) |
| Fingerprint | Shown after adding API key |
| Private Key | Downloaded when generating API key |

### 2. Generate an API Key

1. Go to **Profile → User Settings → API Keys**
2. Click **Add API Key**
3. Select **Generate API Key Pair**
4. **Download the Private Key** (save securely!)
5. Click **Add**
6. Note the fingerprint shown

### 3. Configure Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
OCI_USER_OCID=ocid1.user.oc1..your-user-ocid
OCI_TENANCY_OCID=ocid1.tenancy.oc1..your-tenancy-ocid
OCI_REGION=us-chicago-1
OCI_FINGERPRINT=xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx
OCI_PRIVATE_KEY_PATH=./path/to/your/private_key.pem
```

### 4. Run Setup Script

```bash
./scripts/setup-oci.sh
```

This will:
- Install OCI CLI if needed
- Create `~/.oci/config` with your credentials
- Test the connection

### 5. Test Connection

```bash
node scripts/test-oci-connection.js
```

Or manually:
```bash
oci iam region list --output table
```

## Security Notes

**IMPORTANT**: Never commit private keys or `.env.local` to git!

- Private keys (`.pem` files) are gitignored
- `.env.local` is gitignored
- Use environment variables in CI/CD

## Current Configuration

- **Region**: us-chicago-1
- **Services**: Identity, Compute (planned)

## Next Steps

After confirming OCI connectivity:

1. Set up a Compute instance for Claude CLI hosting
2. Configure networking (VCN, subnets)
3. Deploy the backend service
4. Connect Vercel frontend to OCI backend

## Troubleshooting

### Connection Timeout
- Verify your region is correct
- Check firewall/proxy settings
- Ensure API key is active in OCI Console

### Authentication Failed
- Verify fingerprint matches the uploaded public key
- Check private key file permissions (`chmod 600`)
- Ensure User OCID and Tenancy OCID are correct

### "Host not allowed" Error
- This occurs in restricted environments (like some cloud IDEs)
- The configuration will work when run locally or in deployment
