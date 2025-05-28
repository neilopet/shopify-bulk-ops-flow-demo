#!/usr/bin/env node

import 'dotenv/config';
import { GraphQLClient } from 'graphql-request';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const client = new GraphQLClient(
  `https://${process.env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Access-Token': process.env.ADMIN_API_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    },
  }
);

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
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const GET_WEBHOOK_QUERY = `
  query webhookSubscription($id: ID!) {
    webhookSubscription(id: $id) {
      id
      topic
      endpoint {
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
      createdAt
      updatedAt
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

const DELETE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`;

async function readEnvFile() {
  try {
    const content = await fs.readFile(envPath, 'utf-8');
    return content;
  } catch (error) {
    return '';
  }
}

async function updateEnvVariable(key, value) {
  let content = await readEnvFile();
  const lines = content.split('\n');
  let found = false;
  
  const updatedLines = lines.map(line => {
    if (line.startsWith(`${key}=`) || line.startsWith(`# ${key}=`)) {
      found = true;
      return value ? `${key}=${value}` : `# ${key}=`;
    }
    return line;
  });
  
  if (!found && value) {
    updatedLines.push(`${key}=${value}`);
  }
  
  await fs.writeFile(envPath, updatedLines.join('\n'));
  process.env[key] = value;
}

async function getManagedWebhook() {
  const webhookId = process.env.SHOPIFY_WEBHOOK_SUBSCRIPTION_ID;
  
  if (!webhookId) {
    return null;
  }
  
  try {
    const { webhookSubscription } = await client.request(GET_WEBHOOK_QUERY, { id: webhookId });
    if (webhookSubscription && webhookSubscription.topic === 'BULK_OPERATIONS_FINISH') {
      return webhookSubscription;
    }
  } catch (error) {
    // Webhook might have been deleted externally
    console.log(`⚠️  Previously tracked webhook (${webhookId}) not found or invalid`);
    await updateEnvVariable('SHOPIFY_WEBHOOK_SUBSCRIPTION_ID', '');
  }
  
  return null;
}

async function listWebhooks() {
  const { webhookSubscriptions } = await client.request(FIND_WEBHOOK_QUERY, { first: 100 });
  console.log('\nRegistered Webhooks:');
  console.log('==================');
  
  const managedId = process.env.SHOPIFY_WEBHOOK_SUBSCRIPTION_ID;
  
  webhookSubscriptions.edges.forEach(({ node }) => {
    const isManaged = node.id === managedId;
    console.log(`\nID: ${node.id}${isManaged ? ' (Managed by this app)' : ''}`);
    console.log(`Topic: ${node.topic}`);
    console.log(`URL: ${node.endpoint?.callbackUrl}`);
    console.log(`Created: ${new Date(node.createdAt).toLocaleString()}`);
    console.log(`Updated: ${new Date(node.updatedAt).toLocaleString()}`);
  });
  
  return webhookSubscriptions.edges;
}

async function createWebhook(url) {
  const existingWebhook = await getManagedWebhook();
  if (existingWebhook) {
    console.log('⚠️  A managed webhook already exists. Use "update" command to change the URL.');
    console.log(`   Current webhook: ${existingWebhook.id}`);
    console.log(`   Current URL: ${existingWebhook.endpoint?.callbackUrl}`);
    return existingWebhook;
  }
  
  const callbackUrl = url || getDefaultCallbackUrl();
  console.log(`\nCreating webhook for: ${callbackUrl}`);
  
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
  
  const webhook = webhookSubscriptionCreate.webhookSubscription;
  await updateEnvVariable('SHOPIFY_WEBHOOK_SUBSCRIPTION_ID', webhook.id);
  
  console.log('✅ Webhook created successfully!');
  console.log(`ID: ${webhook.id}`);
  console.log('\n📝 Webhook ID saved to .env file');
  
  return webhook;
}

async function updateWebhook(url) {
  let webhook = await getManagedWebhook();
  
  if (!webhook) {
    console.log('No managed webhook found. Creating new one...');
    return createWebhook(url);
  }
  
  const callbackUrl = url || getDefaultCallbackUrl();
  console.log(`\nUpdating webhook from: ${webhook.endpoint?.callbackUrl}`);
  console.log(`                   to: ${callbackUrl}`);
  
  const { webhookSubscriptionUpdate } = await client.request(UPDATE_WEBHOOK_MUTATION, {
    id: webhook.id,
    webhookSubscription: {
      callbackUrl,
      format: 'JSON'
    }
  });
  
  if (webhookSubscriptionUpdate.userErrors.length > 0) {
    throw new Error(webhookSubscriptionUpdate.userErrors[0].message);
  }
  
  console.log('✅ Webhook updated successfully!');
  
  return webhookSubscriptionUpdate.webhookSubscription;
}

async function deleteWebhook() {
  const webhook = await getManagedWebhook();
  
  if (!webhook) {
    console.log('No managed webhook found to delete.');
    return;
  }
  
  console.log(`\nDeleting webhook: ${webhook.id}`);
  console.log(`URL: ${webhook.endpoint?.callbackUrl}`);
  
  const { webhookSubscriptionDelete } = await client.request(DELETE_WEBHOOK_MUTATION, {
    id: webhook.id
  });
  
  if (webhookSubscriptionDelete.userErrors.length > 0) {
    throw new Error(webhookSubscriptionDelete.userErrors[0].message);
  }
  
  await updateEnvVariable('SHOPIFY_WEBHOOK_SUBSCRIPTION_ID', '');
  
  console.log('✅ Webhook deleted successfully!');
  console.log('📝 Webhook ID removed from .env file');
}

function getDefaultCallbackUrl() {
  const baseUrl = process.env.WEBHOOK_BASE_URL || 
    process.env.LOCAL_WEBHOOK_URL || 
    `https://${process.env.PUBLIC_STORE_DOMAIN}`;
  
  return `${baseUrl}/webhooks`;
}

async function main() {
  const [,, command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'list':
        await listWebhooks();
        break;
        
      case 'create':
        await createWebhook(args[0]);
        break;
        
      case 'update':
        await updateWebhook(args[0]);
        break;
        
      case 'delete':
        await deleteWebhook();
        break;
        
      case 'status':
        const webhook = await getManagedWebhook();
        if (webhook) {
          console.log('\nManaged BULK_OPERATIONS_FINISH Webhook Status:');
          console.log('=============================================');
          console.log(`ID: ${webhook.id}`);
          console.log(`URL: ${webhook.endpoint?.callbackUrl}`);
          console.log(`Created: ${new Date(webhook.createdAt).toLocaleString()}`);
          console.log(`Updated: ${new Date(webhook.updatedAt).toLocaleString()}`);
        } else {
          console.log('\n❌ No managed BULK_OPERATIONS_FINISH webhook found');
          console.log('   Run "create" command to set one up');
        }
        break;
        
      default:
        console.log(`
Shopify Webhook Manager
======================

This tool manages a single BULK_OPERATIONS_FINISH webhook subscription
and tracks it via SHOPIFY_WEBHOOK_SUBSCRIPTION_ID in your .env file.

Usage: node scripts/manage-webhook.js <command> [url]

Commands:
  list              List all webhooks (marks managed webhook)
  status            Show managed webhook status
  create [url]      Create new managed webhook
  update [url]      Update managed webhook URL
  delete            Delete managed webhook

Examples:
  node scripts/manage-webhook.js list
  node scripts/manage-webhook.js create https://my-app.com/webhooks
  node scripts/manage-webhook.js update https://preview.my-app.com/webhooks
  node scripts/manage-webhook.js status

Environment Variables:
  ADMIN_API_TOKEN                  Required: Admin API token
  PUBLIC_STORE_DOMAIN              Required: Store domain
  WEBHOOK_BASE_URL                 Optional: Default webhook base URL
  LOCAL_WEBHOOK_URL                Optional: Local development URL
  SHOPIFY_WEBHOOK_SUBSCRIPTION_ID  Auto-managed: Tracked webhook ID

Note: This tool only manages webhooks it creates to avoid overwriting
other BULK_OPERATIONS_FINISH webhooks that may exist independently.
        `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();