#!/usr/bin/env node

import { spawn } from 'child_process';
import 'dotenv/config';

async function runNpmCommand(command, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running: npm run ${command}`);
    
    const child = spawn('npm', ['run', command], {
      stdio: 'inherit',
      env: { ...process.env, ...envOverrides }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm run ${command} failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runNpmCommandWithArgs(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running: npm run ${command} -- ${args.join(' ')}`);
    
    const child = spawn('npm', ['run', command, '--', ...args], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm run ${command} failed with exit code ${code}`));
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
    await runNpmCommand('build');
    console.log('✅ Build completed successfully\n');

    // Step 2: Deploy to Shopify Hydrogen production
    console.log('☁️  Deploying to Shopify Hydrogen production...');
    await runNpmCommand('deploy:hydrogen', { CI: 'true' });
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
      await runNpmCommandWithArgs('webhook:update', [webhookUrl]);
    } else {
      console.log('📌 No managed webhook found, creating new one...');
      await runNpmCommandWithArgs('webhook:create', [webhookUrl]);
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

if (!process.env.SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN) {
  console.error('❌ Missing required environment variable: SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN');
  console.error('   This token is required for automated deployments.');
  console.error('   You can find it in your Shopify Hydrogen settings.');
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