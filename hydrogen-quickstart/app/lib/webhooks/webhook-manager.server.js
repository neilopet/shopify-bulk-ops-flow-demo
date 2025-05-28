import {shopifyAdmin} from '../shopify-admin-client.server.js';

// Cache the webhook subscription ID in memory
let cachedWebhookId = null;

/**
 * Query to list webhook subscriptions
 */
const WEBHOOK_SUBSCRIPTIONS_QUERY = `#graphql
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

/**
 * Mutation to create a webhook subscription
 */
const CREATE_WEBHOOK_MUTATION = `#graphql
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

/**
 * Mutation to update a webhook subscription
 */
const UPDATE_WEBHOOK_MUTATION = `#graphql
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

/**
 * Get the current webhook URL based on the environment
 */
function getWebhookUrl() {
  // In production, use the PUBLIC_STORE_DOMAIN or a dedicated webhook URL
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.WEBHOOK_BASE_URL || `https://${process.env.PUBLIC_STORE_DOMAIN}`
    : process.env.LOCAL_WEBHOOK_URL || 'http://localhost:3000';
  
  return `${baseUrl}/webhooks`;
}

/**
 * Find existing webhook subscription for BULK_OPERATIONS_FINISH
 */
async function findExistingWebhook(client) {
  try {
    const response = await client.request(WEBHOOK_SUBSCRIPTIONS_QUERY, {
      variables: { first: 100 }
    });

    const webhooks = response.data?.webhookSubscriptions?.edges || [];
    return webhooks.find(edge => 
      edge.node.topic === 'BULK_OPERATIONS_FINISH'
    )?.node;
  } catch (error) {
    console.error('Error finding webhooks:', error);
    return null;
  }
}

/**
 * Create a new webhook subscription
 */
async function createWebhook(client, callbackUrl) {
  try {
    const response = await client.request(CREATE_WEBHOOK_MUTATION, {
      variables: {
        topic: 'BULK_OPERATIONS_FINISH',
        webhookSubscription: {
          callbackUrl,
          format: 'JSON'
        }
      }
    });

    if (response.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
      throw new Error(response.data.webhookSubscriptionCreate.userErrors[0].message);
    }

    return response.data?.webhookSubscriptionCreate?.webhookSubscription;
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw error;
  }
}

/**
 * Update an existing webhook subscription
 */
async function updateWebhook(client, id, callbackUrl) {
  try {
    const response = await client.request(UPDATE_WEBHOOK_MUTATION, {
      variables: {
        id,
        webhookSubscription: {
          callbackUrl,
          format: 'JSON'
        }
      }
    });

    if (response.data?.webhookSubscriptionUpdate?.userErrors?.length > 0) {
      throw new Error(response.data.webhookSubscriptionUpdate.userErrors[0].message);
    }

    return response.data?.webhookSubscriptionUpdate?.webhookSubscription;
  } catch (error) {
    console.error('Error updating webhook:', error);
    throw error;
  }
}

/**
 * Ensure webhook subscription is registered and up-to-date
 */
export async function ensureWebhookSubscription(context) {
  try {
    const client = shopifyAdmin(context);
    const currentUrl = getWebhookUrl();
    
    console.log('Ensuring webhook subscription for URL:', currentUrl);

    // Check if we have a cached webhook ID
    let webhook = null;
    if (cachedWebhookId) {
      // Try to find the webhook by cached ID
      webhook = await findExistingWebhook(client);
      if (webhook && webhook.id !== cachedWebhookId) {
        // Cached ID is stale
        cachedWebhookId = null;
        webhook = null;
      }
    } else {
      // No cached ID, search for existing webhook
      webhook = await findExistingWebhook(client);
    }

    if (webhook) {
      // Check if URL needs updating
      const existingUrl = webhook.endpoint?.callbackUrl;
      if (existingUrl !== currentUrl) {
        console.log('Updating webhook URL from', existingUrl, 'to', currentUrl);
        webhook = await updateWebhook(client, webhook.id, currentUrl);
      }
      cachedWebhookId = webhook.id;
    } else {
      // Create new webhook
      console.log('Creating new webhook subscription');
      webhook = await createWebhook(client, currentUrl);
      cachedWebhookId = webhook.id;
    }

    console.log('Webhook subscription ensured:', {
      id: webhook.id,
      topic: webhook.topic,
      url: webhook.endpoint?.callbackUrl
    });

    return webhook;
  } catch (error) {
    console.error('Failed to ensure webhook subscription:', error);
    // Don't throw - we don't want to prevent the app from starting
    return null;
  }
}

/**
 * Get the current webhook subscription ID
 */
export function getWebhookSubscriptionId() {
  return cachedWebhookId;
}