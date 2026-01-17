#!/usr/bin/env node
/**
 * Test Oracle Cloud Infrastructure connection
 * Run with: node scripts/test-oci-connection.js
 */

const { execSync } = require('child_process');

const REQUIRED_ENV_VARS = [
  'OCI_USER_OCID',
  'OCI_TENANCY_OCID',
  'OCI_REGION',
  'OCI_FINGERPRINT'
];

function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nSet these in .env.local or export them.');
    process.exit(1);
  }
}

function testConnection() {
  console.log('=== OCI Connection Test ===\n');

  console.log('Configuration:');
  console.log(`  User OCID: ${process.env.OCI_USER_OCID?.slice(0, 30)}...`);
  console.log(`  Tenancy:   ${process.env.OCI_TENANCY_OCID?.slice(0, 30)}...`);
  console.log(`  Region:    ${process.env.OCI_REGION}`);
  console.log(`  Fingerprint: ${process.env.OCI_FINGERPRINT}\n`);

  try {
    console.log('Testing connection (listing regions)...\n');
    const result = execSync('oci iam region list --output table', {
      env: { ...process.env, SUPPRESS_LABEL_WARNING: 'True' },
      encoding: 'utf-8',
      timeout: 30000
    });
    console.log(result);
    console.log('\n✓ OCI Connection Successful!');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

// Load .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch {
  // dotenv not installed, continue without it
}

checkEnvVars();
testConnection();
