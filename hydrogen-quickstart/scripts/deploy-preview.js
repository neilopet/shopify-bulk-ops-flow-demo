#!/usr/bin/env node

import { spawn } from 'child_process';
import { GraphQLClient } from 'graphql-request';
import 'dotenv/config';

const UPDATE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionUpdate($id: ID!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FIND_WEBHOOK_QUERY = `
  query webhookSubscriptions($first: Int!) {
    webhookSubscriptions(first: $first) {
      edges {
        node {
          id
          topic
          endpoint {
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`;

async function deployAndUpdateWebhook() {
  console.log('🚀 Starting preview deployment...\n');
  
  let previewUrl = null;
  let output = '';
  
  // Run the deploy command
  const deploy = spawn('node_modules/.bin/shopify', ['hydrogen', 'deploy', '--env=preview'], {
    cwd: process.cwd(),
    shell: true
  });
  
  deploy.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(data);
    
    // Look for the preview URL in the output
    const urlMatch = text.match(/https:\/\/[a-zA-Z0-9-]+\.myshopify\.dev/);
    if (urlMatch) {
      previewUrl = urlMatch[0];
    }
  });
  
  deploy.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  return new Promise((resolve, reject) => {
    deploy.on('close', async (code) => {
      if (code !== 0) {
        console.error(`\n❌ Deployment failed with code ${code}`);
        reject(new Error('Deployment failed'));
        return;
      }
      
      if (!previewUrl) {
        console.error('\n❌ Could not find preview URL in deployment output');
        reject(new Error('Preview URL not found'));
        return;
      }
      
      console.log(`\n✅ Deployment successful!`);
      console.log(`📍 Preview URL: ${previewUrl}`);
      
      // Now update the webhook
      console.log('\n🔄 Updating webhook subscription...');
      
      try {
        const adminToken = process.env.ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
        
        if (!adminToken || (!adminToken.startsWith('shpat_') && !adminToken.startsWith('shpua_'))) {
          throw new Error('Valid Shopify Admin API token required. Please set ADMIN_API_TOKEN in your .env file.');
        }
        
        const client = new GraphQLClient(
          `https://${process.env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
            },
          }
        );
        
        // Find existing webhook
        const { webhookSubscriptions } = await client.request(FIND_WEBHOOK_QUERY, { first: 100 });
        const bulkOpsWebhook = webhookSubscriptions.edges.find(
          edge => edge.node.topic === 'BULK_OPERATIONS_FINISH'
        )?.node;
        
        const callbackUrl = `${previewUrl}/webhooks`;
        
        if (bulkOpsWebhook) {
          // Update existing webhook
          console.log(`📝 Updating webhook from: ${bulkOpsWebhook.endpoint?.callbackUrl}`);
          console.log(`                      to: ${callbackUrl}`);
          
          const { webhookSubscriptionUpdate } = await client.request(UPDATE_WEBHOOK_MUTATION, {
            id: bulkOpsWebhook.id,
            webhookSubscription: {
              callbackUrl,
              format: 'JSON'
            }
          });
          
          if (webhookSubscriptionUpdate.userErrors.length > 0) {
            throw new Error(webhookSubscriptionUpdate.userErrors[0].message);
          }
          
          console.log('✅ Webhook updated successfully!');
        } else {
          // Create new webhook
          console.log(`📝 Creating new webhook for: ${callbackUrl}`);
          
          const { webhookSubscriptionCreate } = await client.request(CREATE_WEBHOOK_MUTATION, {
            topic: 'BULK_OPERATIONS_FINISH',
            webhookSubscription: {
              callbackUrl,
              format: 'JSON'
            }
          });
          
          if (webhookSubscriptionCreate.userErrors.length > 0) {
            throw new Error(webhookSubscriptionCreate.userErrors[0].message);
          }
          
          console.log('✅ Webhook created successfully!');
        }
        
        console.log(`\n🎉 All done! Your preview is ready at:`);
        console.log(`   ${previewUrl}`);
        console.log(`\n   Webhooks will be sent to:`);
        console.log(`   ${callbackUrl}`);
        
        resolve();
      } catch (error) {
        console.error('\n❌ Failed to update webhook:', error.message);
        console.error('   Preview is still available at:', previewUrl);
        reject(error);
      }
    });
  });
}

// Check required environment variables
if (!process.env.PUBLIC_STORE_DOMAIN) {
  console.error('❌ Missing required environment variable:');
  console.error('   - PUBLIC_STORE_DOMAIN');
  process.exit(1);
}

const adminToken = process.env.ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
if (!adminToken || (!adminToken.startsWith('shpat_') && !adminToken.startsWith('shpua_'))) {
  console.error('❌ Missing or invalid Shopify Admin API token');
  console.error('   Please set ADMIN_API_TOKEN in your .env file');
  console.error('   The token should start with "shpat_" or "shpua_" and have webhook write permissions');
  console.error('\n   To create an admin API token:');
  console.error('   1. Go to your Shopify admin > Settings > Apps and sales channels');
  console.error('   2. Click "Develop apps" > Create an app');
  console.error('   3. Configure Admin API scopes: write_webhooks');
  console.error('   4. Install the app and copy the Admin API access token');
  process.exit(1);
}

// Run the deployment
deployAndUpdateWebhook().catch((error) => {
  process.exit(1);
});