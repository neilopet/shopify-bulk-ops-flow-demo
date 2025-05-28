#!/usr/bin/env node

import 'dotenv/config';
import { spawn } from 'child_process';

async function runWebhookCommand(action, url) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: npm run webhook:${action} ${url}`);
    
    const child = spawn('npm', ['run', `webhook:${action}`, url], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`webhook:${action} failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function setupWebhook() {
  const productionUrl = process.env.WEBHOOK_BASE_URL || 'https://shop.vaporwar.es';
  const webhookUrl = `${productionUrl}/webhooks`;
  const webhookId = process.env.SHOPIFY_WEBHOOK_SUBSCRIPTION_ID;
  
  try {
    if (webhookId) {
      console.log('📌 Found existing managed webhook, updating URL...');
      await runWebhookCommand('update', webhookUrl);
    } else {
      console.log('📌 No managed webhook found, creating new one...');
      await runWebhookCommand('create', webhookUrl);
    }
    
    console.log('✅ Webhook configuration complete!');
  } catch (error) {
    console.error('❌ Webhook setup failed:', error.message);
    process.exit(1);
  }
}

// Check required environment variables
const adminToken = process.env.ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
if (!adminToken || (!adminToken.startsWith('shpat_') && !adminToken.startsWith('shpua_'))) {
  console.error('❌ Missing or invalid Shopify Admin API token');
  console.error('   Please set ADMIN_API_TOKEN in your .env file');
  process.exit(1);
}

setupWebhook();