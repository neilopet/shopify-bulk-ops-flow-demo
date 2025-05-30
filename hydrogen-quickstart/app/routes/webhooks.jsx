import {
  GET_BULK_OPERATION_QUERY,
  FLOW_TRIGGER_RECEIVE,
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

// Helper function to extract fulfillment order data from JSONL data
function extractFulfillmentOrderData(items) {
  const fulfillmentOrderData = [];

  items.forEach((item) => {
    // Filter for FulfillmentOrder objects only (skip empty objects and other types)
    if (item.__typename === 'FulfillmentOrder' && item.id && item.order_reference) {
      // Extract numeric order ID from gid format (e.g., "gid://shopify/Order/12345" -> 12345)
      const orderIdMatch = item.order_reference.match(/\/Order\/(\d+)$/);
      if (orderIdMatch) {
        fulfillmentOrderData.push({
          fulfillmentOrderId: item.id,
          orderId: parseInt(orderIdMatch[1], 10),
        });
      }
    }
  });

  return fulfillmentOrderData;
}

// Helper function to process fulfillment order rerouting via Flow
async function processFulfillmentOrderRerouting(
  fulfillmentOrderData,
  shopifyAdminClient,
) {
  if (fulfillmentOrderData.length === 0) {
    console.log('No fulfillment orders to process');
    return {success: true, processed: 0};
  }

  let processedCount = 0;
  const errors = [];

  // Process each fulfillment order individually
  for (const data of fulfillmentOrderData) {
    const variables = {
      handle: "reroute-fulfillment-order",
      payload: {
        "order_id": data.orderId,
        "fulfillment order id": data.fulfillmentOrderId,
      },
    };

    try {
      const result = await shopifyAdminClient.query(
        FLOW_TRIGGER_RECEIVE,
        {
          variables,
          cacheStrategy: null, // Don't cache mutations
        },
      );

      if (result.flowTriggerReceive?.userErrors?.length > 0) {
        console.error(
          'Flow trigger errors for fulfillment order:',
          data.fulfillmentOrderId,
          result.flowTriggerReceive.userErrors,
        );
        errors.push({
          fulfillmentOrderId: data.fulfillmentOrderId,
          errors: result.flowTriggerReceive.userErrors,
        });
      } else {
        processedCount++;
        console.log(
          `Successfully triggered flow for fulfillment order: ${data.fulfillmentOrderId}`,
        );
      }
    } catch (error) {
      console.error(
        'Error triggering flow for fulfillment order:',
        data.fulfillmentOrderId,
        error,
      );
      errors.push({
        fulfillmentOrderId: data.fulfillmentOrderId,
        error: error.message,
      });
    }
  }

  console.log(
    `Successfully processed ${processedCount} out of ${fulfillmentOrderData.length} fulfillment orders`,
  );

  return {
    success: errors.length === 0,
    processed: processedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Main webhook processing function
async function processBulkOperationWebhook(
  webhookPayload,
  shopifyAdminClient,
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

    // Step 6: Extract fulfillment order data (filtering for FulfillmentOrder objects only)
    const fulfillmentOrderData = extractFulfillmentOrderData(orders);
    console.log(
      `Extracted ${fulfillmentOrderData.length} fulfillment orders from ${orders.length} total items`,
    );

    // Step 7: Process fulfillment order rerouting via Flow
    const result = await processFulfillmentOrderRerouting(
      fulfillmentOrderData,
      shopifyAdminClient,
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
