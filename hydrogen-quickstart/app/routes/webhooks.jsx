import {
  GET_BULK_OPERATION_QUERY,
  FULFILLMENT_ORDERS_REROUTE_MUTATION,
} from '~/lib/fragments';

// Helper function to download and parse JSONL file
async function downloadAndParseJSONL(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download JSONL file: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  const lines = text.trim().split('\n');

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error('Failed to parse JSONL line:', line, error);
        return null;
      }
    })
    .filter(Boolean);
}

// Helper function to extract fulfillment order IDs from JSONL data
function extractFulfillmentOrderIds(items) {
  const fulfillmentOrderIds = [];

  items.forEach((item) => {
    // Filter for FulfillmentOrder objects only (skip empty objects and other types)
    if (item.__typename === 'FulfillmentOrder' && item.id) {
      fulfillmentOrderIds.push(item.id);
    }
  });

  return fulfillmentOrderIds;
}

// Helper function to process fulfillment order rerouting
async function processFulfillmentOrderRerouting(
  fulfillmentOrderIds,
  shopifyAdminClient,
) {
  if (fulfillmentOrderIds.length === 0) {
    console.log('No fulfillment order IDs to process');
    return {success: true, processed: 0};
  }

  const excludedLocationIds = [];
  const includedLocationIds = [];

  const variables = {
    excludedLocationIds,
    fulfillmentOrderIds,
    includedLocationIds,
  };

  try {
    const result = await shopifyAdminClient.query(
      FULFILLMENT_ORDERS_REROUTE_MUTATION,
      {
        variables,
        apiVersion: 'unstable', // Use unstable API for fulfillment order rerouting
        cacheStrategy: null, // Don't cache mutations
      },
    );

    if (result.fulfillmentOrdersReroute?.userErrors?.length > 0) {
      console.error(
        'Fulfillment order reroute errors:',
        result.fulfillmentOrdersReroute.userErrors,
      );
      return {
        success: false,
        errors: result.fulfillmentOrdersReroute.userErrors,
        processed: 0,
      };
    }

    const movedOrders =
      result.fulfillmentOrdersReroute?.movedFulfillmentOrders || [];
    console.log(
      `Successfully rerouted ${movedOrders.length} fulfillment orders`,
    );

    return {
      success: true,
      processed: movedOrders.length,
      movedOrders,
    };
  } catch (error) {
    console.error('Error processing fulfillment order rerouting:', error);
    return {success: false, error: error.message, processed: 0};
  }
}

// Main webhook processing function
async function processBulkOperationWebhook(
  webhookPayload,
  shopifyAdminClient,
  env,
) {
  try {
    console.log('Processing bulk operation webhook:', webhookPayload);

    // Step 1: Extract bulk operation ID from webhook
    const bulkOperationId = webhookPayload.admin_graphql_api_id;
    if (!bulkOperationId) {
      throw new Error('No bulk operation ID found in webhook payload');
    }

    // Step 2: Query Shopify GraphQL API for bulk operation details
    console.log('Fetching bulk operation details for:', bulkOperationId);
    const bulkOpResult = await shopifyAdminClient.query(
      GET_BULK_OPERATION_QUERY,
      {
        variables: {id: bulkOperationId},
      },
    );

    const bulkOperation = bulkOpResult.node;
    if (!bulkOperation) {
      throw new Error('Bulk operation not found');
    }

    console.log('Bulk operation details:', {
      id: bulkOperation.id,
      status: bulkOperation.status,
      type: bulkOperation.type,
      objectCount: bulkOperation.objectCount,
    });

    // Step 3: Validate that this is the correct bulk operation
    if (!bulkOperation.query?.startsWith('query GetOrdersToRelease')) {
      console.log('Skipping bulk operation - not a GetOrdersToRelease query');
      return {
        success: true,
        message: 'Bulk operation skipped - wrong query type',
      };
    }

    // Step 4: Check if bulk operation is completed and has a URL
    if (bulkOperation.status !== 'COMPLETED') {
      console.log(
        'Bulk operation not completed, status:',
        bulkOperation.status,
      );
      return {success: true, message: 'Bulk operation not completed yet'};
    }

    if (!bulkOperation.url) {
      throw new Error('No download URL available for completed bulk operation');
    }

    // Step 5: Download and parse JSONL file
    console.log('Downloading JSONL file from:', bulkOperation.url);
    const orders = await downloadAndParseJSONL(bulkOperation.url);
    console.log(`Downloaded and parsed ${orders.length} orders`);

    // Step 6: Extract fulfillment order IDs (filtering for FulfillmentOrder objects only)
    const fulfillmentOrderIds = extractFulfillmentOrderIds(orders);
    console.log(
      `Extracted ${fulfillmentOrderIds.length} fulfillment order IDs from ${orders.length} total items`,
    );

    // Step 7: Process fulfillment order rerouting
    const result = await processFulfillmentOrderRerouting(
      fulfillmentOrderIds,
      shopifyAdminClient,
      env,
    );

    return {
      success: result.success,
      bulkOperationId,
      ordersProcessed: orders.length,
      fulfillmentOrdersProcessed: result.processed,
      ...(result.errors && {errors: result.errors}),
      ...(result.error && {error: result.error}),
    };
  } catch (error) {
    console.error('Error processing bulk operation webhook:', error);
    return {
      success: false,
      error: error.message,
      bulkOperationId: webhookPayload.admin_graphql_api_id,
    };
  }
}

// GET requests - for webhook verification
export const loader = async ({request, context}) => {
  console.log('Webhook verification request received');
  return Response.json({success: true, message: 'Webhook endpoint is active'});
};

// POST requests - webhook handler
export const action = async ({request, context}) => {
  try {
    console.log('Webhook received:', request.method, request.url);

    // Validate required environment variables and shopifyAdminClient
    if (!context.shopifyAdminClient) {
      console.error('Shopify Admin client not available in context');
      return Response.json(
        {success: false, error: 'Server configuration error'},
        {status: 500},
      );
    }

    if (!context.env?.SHOP_DOMAIN || !context.env?.ADMIN_API_TOKEN) {
      console.error('Missing required environment variables');
      return Response.json(
        {success: false, error: 'Server configuration error'},
        {status: 500},
      );
    }

    // Parse webhook payload
    const webhookPayload = await request.json();

    // Validate webhook payload structure
    if (!webhookPayload.admin_graphql_api_id) {
      console.error('Invalid webhook payload - missing admin_graphql_api_id');
      return Response.json(
        {success: false, error: 'Invalid webhook payload'},
        {status: 400},
      );
    }

    // Process the webhook asynchronously
    const result = await processBulkOperationWebhook(
      webhookPayload,
      context.shopifyAdminClient,
      context.env,
    );

    if (result.success) {
      console.log('Webhook processed successfully:', result);
      return Response.json(result);
    } else {
      console.error('Webhook processing failed:', result);
      return Response.json(result, {status: 500});
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      {status: 500},
    );
  }
};
