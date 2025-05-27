import { json } from "@remix-run/node";

// Configuration - these should be set as environment variables
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const EXCLUDED_LOCATION_IDS = process.env.EXCLUDED_LOCATION_IDS?.split(',') || [];
const INCLUDED_LOCATION_IDS = process.env.INCLUDED_LOCATION_IDS?.split(',') || [];

// GraphQL queries and mutations
const GET_BULK_OPERATION_QUERY = `
  query GetBulkOperation($id: ID!) {
    node(id: $id) {
      ... on BulkOperation {
        id
        status
        query
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        type
        url
        partialDataUrl
      }
    }
  }
`;

const FULFILLMENT_ORDERS_REROUTE_MUTATION = `
  mutation fulfillmentOrdersReroute($excludedLocationIds: [ID!], $fulfillmentOrderIds: [ID!]!, $includedLocationIds: [ID!]) {
    fulfillmentOrdersReroute(excludedLocationIds: $excludedLocationIds, fulfillmentOrderIds: $fulfillmentOrderIds, includedLocationIds: $includedLocationIds) {
      movedFulfillmentOrders {
        id
        status
        assignedLocation {
          location {
            id
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

// Helper function to make GraphQL requests to Shopify
async function makeShopifyGraphQLRequest(query, variables = {}, useUnstable = false) {
  const apiVersion = useUnstable ? 'unstable' : '2025-07';
  const url = `https://${SHOPIFY_SHOP_DOMAIN}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Helper function to download and parse JSONL file
async function downloadAndParseJSONL(url) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download JSONL file: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.trim().split('\n');
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.error('Failed to parse JSONL line:', line, error);
      return null;
    }
  }).filter(Boolean);
}

// Helper function to extract fulfillment order IDs from order data
function extractFulfillmentOrderIds(orders) {
  const fulfillmentOrderIds = [];
  
  orders.forEach(order => {
    // The order structure may vary, but typically fulfillment orders are nested
    // This is a simplified extraction - you may need to adjust based on actual data structure
    if (order.fulfillmentOrders && order.fulfillmentOrders.edges) {
      order.fulfillmentOrders.edges.forEach(edge => {
        if (edge.node && edge.node.id) {
          fulfillmentOrderIds.push(edge.node.id);
        }
      });
    }
  });
  
  return fulfillmentOrderIds;
}

// Helper function to process fulfillment order rerouting
async function processFulfillmentOrderRerouting(fulfillmentOrderIds) {
  if (fulfillmentOrderIds.length === 0) {
    console.log('No fulfillment order IDs to process');
    return { success: true, processed: 0 };
  }

  const variables = {
    excludedLocationIds: EXCLUDED_LOCATION_IDS,
    fulfillmentOrderIds,
    includedLocationIds: INCLUDED_LOCATION_IDS,
  };

  try {
    const result = await makeShopifyGraphQLRequest(
      FULFILLMENT_ORDERS_REROUTE_MUTATION,
      variables,
      true // Use unstable API
    );

    if (result.data?.fulfillmentOrdersReroute?.userErrors?.length > 0) {
      console.error('Fulfillment order reroute errors:', result.data.fulfillmentOrdersReroute.userErrors);
      return { 
        success: false, 
        errors: result.data.fulfillmentOrdersReroute.userErrors,
        processed: 0
      };
    }

    const movedOrders = result.data?.fulfillmentOrdersReroute?.movedFulfillmentOrders || [];
    console.log(`Successfully rerouted ${movedOrders.length} fulfillment orders`);
    
    return { 
      success: true, 
      processed: movedOrders.length,
      movedOrders
    };
  } catch (error) {
    console.error('Error processing fulfillment order rerouting:', error);
    return { success: false, error: error.message, processed: 0 };
  }
}

// Main webhook processing function
async function processBulkOperationWebhook(webhookPayload) {
  try {
    console.log('Processing bulk operation webhook:', webhookPayload);

    // Step 1: Extract bulk operation ID from webhook
    const bulkOperationId = webhookPayload.admin_graphql_api_id;
    if (!bulkOperationId) {
      throw new Error('No bulk operation ID found in webhook payload');
    }

    // Step 2: Query Shopify GraphQL API for bulk operation details
    console.log('Fetching bulk operation details for:', bulkOperationId);
    const bulkOpResult = await makeShopifyGraphQLRequest(GET_BULK_OPERATION_QUERY, {
      id: bulkOperationId
    });

    const bulkOperation = bulkOpResult.data?.node;
    if (!bulkOperation) {
      throw new Error('Bulk operation not found');
    }

    console.log('Bulk operation details:', {
      id: bulkOperation.id,
      status: bulkOperation.status,
      type: bulkOperation.type,
      objectCount: bulkOperation.objectCount
    });

    // Step 3: Validate that this is the correct bulk operation
    if (!bulkOperation.query?.startsWith('query GetOrdersToRelease')) {
      console.log('Skipping bulk operation - not a GetOrdersToRelease query');
      return { success: true, message: 'Bulk operation skipped - wrong query type' };
    }

    // Step 4: Check if bulk operation is completed and has a URL
    if (bulkOperation.status !== 'COMPLETED') {
      console.log('Bulk operation not completed, status:', bulkOperation.status);
      return { success: true, message: 'Bulk operation not completed yet' };
    }

    if (!bulkOperation.url) {
      throw new Error('No download URL available for completed bulk operation');
    }

    // Step 5: Download and parse JSONL file
    console.log('Downloading JSONL file from:', bulkOperation.url);
    const orders = await downloadAndParseJSONL(bulkOperation.url);
    console.log(`Downloaded and parsed ${orders.length} orders`);

    // Step 6: Extract fulfillment order IDs
    const fulfillmentOrderIds = extractFulfillmentOrderIds(orders);
    console.log(`Extracted ${fulfillmentOrderIds.length} fulfillment order IDs`);

    // Step 7: Process fulfillment order rerouting
    const result = await processFulfillmentOrderRerouting(fulfillmentOrderIds);
    
    return {
      success: result.success,
      bulkOperationId,
      ordersProcessed: orders.length,
      fulfillmentOrdersProcessed: result.processed,
      ...(result.errors && { errors: result.errors }),
      ...(result.error && { error: result.error })
    };

  } catch (error) {
    console.error('Error processing bulk operation webhook:', error);
    return {
      success: false,
      error: error.message,
      bulkOperationId: webhookPayload.admin_graphql_api_id
    };
  }
}

// GET requests - for webhook verification
export const loader = async ({ request, context }) => {
  console.log('Webhook verification request received');
  return json({ success: true, message: 'Webhook endpoint is active' });
};

// POST requests - webhook handler
export const action = async ({ request, context }) => {
  try {
    console.log('Webhook received:', request.method, request.url);

    // Validate required environment variables
    if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
      console.error('Missing required environment variables');
      return json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse webhook payload
    const webhookPayload = await request.json();
    
    // Validate webhook payload structure
    if (!webhookPayload.admin_graphql_api_id) {
      console.error('Invalid webhook payload - missing admin_graphql_api_id');
      return json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Process the webhook asynchronously
    const result = await processBulkOperationWebhook(webhookPayload);
    
    if (result.success) {
      console.log('Webhook processed successfully:', result);
      return json(result);
    } else {
      console.error('Webhook processing failed:', result);
      return json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
};