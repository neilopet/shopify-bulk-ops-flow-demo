#!/usr/bin/env node

import { spawn } from 'child_process';
import 'dotenv/config';

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function deployProduction() {
  console.log('🚀 Starting production deployment...\n');

  try {
    // Step 1: Build the project
    console.log('📦 Building project...');
    await runCommand('npm', ['run', 'build']);
    console.log('✅ Build completed successfully\n');

    // Step 2: Deploy to Shopify Hydrogen production
    console.log('☁️  Deploying to Shopify Hydrogen production...');
    await runCommand('node_modules/.bin/shopify', ['hydrogen', 'deploy', '--env=production']);
    console.log('✅ Deployment completed successfully\n');

    // Step 3: Setup webhook if needed
    console.log('🔗 Checking webhook configuration...');
    
    // Get the production URL from environment or use default
    const productionUrl = process.env.WEBHOOK_BASE_URL || 'https://shop.vaporwar.es';
    const webhookUrl = `${productionUrl}/webhooks`;
    
    // Check if webhook already exists
    const webhookId = process.env.SHOPIFY_WEBHOOK_SUBSCRIPTION_ID;
    
    if (webhookId) {
      console.log('📌 Found existing managed webhook, updating URL...');
      await runCommand('node', ['scripts/manage-webhook.js', 'update', webhookUrl]);
    } else {
      console.log('📌 No managed webhook found, creating new one...');
      await runCommand('node', ['scripts/manage-webhook.js', 'create', webhookUrl]);
    }

    console.log('\n🎉 Production deployment completed successfully!');
    console.log(`\n📍 Your app is live at: ${productionUrl}`);
    console.log(`📨 Webhooks configured at: ${webhookUrl}`);
    console.log('\n✅ All done! Your bulk operations webhook handler is ready.');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Check required environment variables
if (!process.env.PUBLIC_STORE_DOMAIN) {
  console.error('❌ Missing required environment variable: PUBLIC_STORE_DOMAIN');
  process.exit(1);
}

const adminToken = process.env.ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
if (!adminToken || (!adminToken.startsWith('shpat_') && !adminToken.startsWith('shpua_'))) {
  console.error('❌ Missing or invalid Shopify Admin API token');
  console.error('   Please set ADMIN_API_TOKEN in your .env file');
  process.exit(1);
}

// Run the deployment
deployProduction();