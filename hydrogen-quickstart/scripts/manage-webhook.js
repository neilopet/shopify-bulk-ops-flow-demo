#!/usr/bin/env node

import 'dotenv/config';
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient(
  `https://${process.env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
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

async function listWebhooks() {
  const { webhookSubscriptions } = await client.request(FIND_WEBHOOK_QUERY, { first: 100 });
  console.log('\nRegistered Webhooks:');
  console.log('==================');
  
  webhookSubscriptions.edges.forEach(({ node }) => {
    console.log(`\nID: ${node.id}`);
    console.log(`Topic: ${node.topic}`);
    console.log(`URL: ${node.endpoint?.callbackUrl}`);
    console.log(`Created: ${new Date(node.createdAt).toLocaleString()}`);
    console.log(`Updated: ${new Date(node.updatedAt).toLocaleString()}`);
  });
  
  return webhookSubscriptions.edges;
}

async function findBulkOpsWebhook() {
  const { webhookSubscriptions } = await client.request(FIND_WEBHOOK_QUERY, { first: 100 });
  return webhookSubscriptions.edges.find(
    edge => edge.node.topic === 'BULK_OPERATIONS_FINISH'
  )?.node;
}

async function createWebhook(url) {
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
  
  console.log('✅ Webhook created successfully!');
  console.log(`ID: ${webhookSubscriptionCreate.webhookSubscription.id}`);
  
  return webhookSubscriptionCreate.webhookSubscription;
}

async function updateWebhook(url) {
  const webhook = await findBulkOpsWebhook();
  
  if (!webhook) {
    console.log('No existing BULK_OPERATIONS_FINISH webhook found. Creating new one...');
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
  const webhook = await findBulkOpsWebhook();
  
  if (!webhook) {
    console.log('No BULK_OPERATIONS_FINISH webhook found to delete.');
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
  
  console.log('✅ Webhook deleted successfully!');
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
        const webhook = await findBulkOpsWebhook();
        if (webhook) {
          console.log('\nBULK_OPERATIONS_FINISH Webhook Status:');
          console.log('=====================================');
          console.log(`ID: ${webhook.id}`);
          console.log(`URL: ${webhook.endpoint?.callbackUrl}`);
          console.log(`Created: ${new Date(webhook.createdAt).toLocaleString()}`);
          console.log(`Updated: ${new Date(webhook.updatedAt).toLocaleString()}`);
        } else {
          console.log('\n❌ No BULK_OPERATIONS_FINISH webhook registered');
        }
        break;
        
      default:
        console.log(`
Shopify Webhook Manager
======================

Usage: node scripts/manage-webhook.js <command> [url]

Commands:
  list              List all webhooks
  status            Show BULK_OPERATIONS_FINISH webhook status
  create [url]      Create BULK_OPERATIONS_FINISH webhook
  update [url]      Update BULK_OPERATIONS_FINISH webhook URL
  delete            Delete BULK_OPERATIONS_FINISH webhook

Examples:
  node scripts/manage-webhook.js list
  node scripts/manage-webhook.js create https://my-app.com/webhooks
  node scripts/manage-webhook.js update https://preview.my-app.com/webhooks
  node scripts/manage-webhook.js status

Environment Variables:
  SHOPIFY_ADMIN_API_ACCESS_TOKEN   Required: Admin API token
  PUBLIC_STORE_DOMAIN              Required: Store domain
  WEBHOOK_BASE_URL                 Optional: Default webhook base URL
  LOCAL_WEBHOOK_URL                Optional: Local development URL
        `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();