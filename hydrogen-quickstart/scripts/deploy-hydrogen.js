#!/usr/bin/env node

import { spawn } from 'child_process';
import 'dotenv/config';

async function deployHydrogen() {
  const token = process.env.SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN;
  
  if (!token) {
    console.error('❌ Missing required environment variable: SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN');
    process.exit(1);
  }

  const isCI = process.env.CI === 'true';
  
  // Build command arguments
  const args = ['hydrogen', 'deploy'];
  
  // In CI mode, don't specify environment (uses git branch)
  if (!isCI) {
    args.push('--env=production');
  }
  
  // Add other flags
  args.push(
    '--force',
    `--token=${token}`,
    '--metadata-description=Automated production deployment'
  );

  console.log(`🚀 Deploying to Shopify Hydrogen ${isCI ? '(CI mode)' : '(production)'}...`);
  console.log(`📍 Command: shopify ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['shopify', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: isCI ? 'true' : undefined
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Deploy failed with exit code ${code}`));
      } else {
        console.log('✅ Deployment completed successfully!');
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run the deployment
deployHydrogen().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});