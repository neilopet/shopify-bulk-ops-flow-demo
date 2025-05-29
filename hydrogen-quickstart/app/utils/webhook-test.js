// Webhook Testing Utilities for Shopify Bulk Operations

// Mock webhook payload for testing
export const mockBulkOperationWebhook = {
  admin_graphql_api_id: "gid://shopify/BulkOperation/5963216388388",
  completed_at: "2025-03-05T16:11:11-05:00",
  created_at: "2025-03-05T16:11:11-05:00",
  error_code: null,
  status: "completed",
  type: "query"
};

// Mock bulk operation response
export const mockBulkOperationResponse = {
  data: {
    node: {
      id: "gid://shopify/BulkOperation/5963216388388",
      status: "COMPLETED",
      query: "query GetOrdersToRelease {\n  orders(\n    sortKey: CREATED_AT,\n    query: \"created_at:>='2025-05-27T13:26:44Z' AND created_at:<='2025-05-27T13:56:45Z' AND tag_not:released AND -status:cancelled AND -fulfillment_status:on_hold AND -financial_status:voided AND -financial_status:expired AND -financial_status:authorized\"\n  ) {\n    edges {\n      node {\n        id\n        legacyResourceId\n        name\n        createdAt\n        displayFulfillmentStatus\n        metafield(namespace: \"order_maturity\", key: \"notification_status\") {\n          value\n        }\n      }\n    }\n  }\n}",
      errorCode: null,
      createdAt: "2025-05-27T14:26:46Z",
      completedAt: "2025-05-27T14:26:47Z",
      objectCount: "241",
      fileSize: "47230",
      type: "QUERY",
      url: "https://storage.googleapis.com/test-bucket/bulk-operation.jsonl",
      partialDataUrl: null
    }
  }
};

// Mock JSONL data (each line represents either an empty object or a FulfillmentOrder)
export const mockJSONLData = `{}
{"id":"gid://shopify/FulfillmentOrder/78912358671","order_reference":"gid://shopify/Order/12345","__typename":"FulfillmentOrder"}
{}
{"id":"gid://shopify/FulfillmentOrder/78912358672","order_reference":"gid://shopify/Order/12346","__typename":"FulfillmentOrder"}
{}
{"id":"gid://shopify/FulfillmentOrder/78912358673","order_reference":"gid://shopify/Order/12347","__typename":"FulfillmentOrder"}`;

// Function to test webhook endpoint locally
export async function testWebhookEndpoint(baseUrl = 'http://localhost:3000') {
  try {
    console.log('Testing webhook endpoint...');
    
    const response = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockBulkOperationWebhook),
    });
    
    const result = await response.json();
    console.log('Webhook test result:', result);
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    console.error('Webhook test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to validate environment variables
export function validateEnvironmentVariables() {
  const required = [
    'SHOPIFY_SHOP_DOMAIN',
    'SHOPIFY_ACCESS_TOKEN',
    'EXCLUDED_LOCATION_IDS',
    'INCLUDED_LOCATION_IDS'
  ];
  
  const missing = required.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  console.log('All required environment variables are set');
  return true;
}

// Function to simulate a complete webhook flow
export async function simulateWebhookFlow() {
  console.log('Simulating complete webhook flow...');
  
  // Step 1: Validate environment
  if (!validateEnvironmentVariables()) {
    return { success: false, error: 'Environment validation failed' };
  }
  
  // Step 2: Test webhook endpoint
  const webhookResult = await testWebhookEndpoint();
  
  if (!webhookResult.success) {
    return { success: false, error: 'Webhook test failed', details: webhookResult };
  }
  
  console.log('Webhook flow simulation completed successfully');
  return { success: true, result: webhookResult };
}

// Function to create a test webhook payload with custom values
export function createTestWebhookPayload(overrides = {}) {
  return {
    ...mockBulkOperationWebhook,
    ...overrides
  };
}

// Function to validate webhook payload structure
export function validateWebhookPayload(payload) {
  const requiredFields = [
    'admin_graphql_api_id',
    'completed_at',
    'created_at',
    'status',
    'type'
  ];
  
  const missing = requiredFields.filter(field => !payload[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      errors: [`Missing required fields: ${missing.join(', ')}`]
    };
  }
  
  if (payload.type !== 'query') {
    return {
      valid: false,
      errors: ['Webhook type must be "query"']
    };
  }
  
  if (!payload.admin_graphql_api_id.startsWith('gid://shopify/BulkOperation/')) {
    return {
      valid: false,
      errors: ['Invalid bulk operation ID format']
    };
  }
  
  return { valid: true, errors: [] };
}

// Function to log webhook processing details
export function logWebhookProcessing(step, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Webhook Processing - ${step}:`, data);
}

// Function to validate JSONL parsing and filtering for new format
export function validateJSONLParsing(jsonlData) {
  try {
    const lines = jsonlData.trim().split('\n');
    const parsedItems = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error('Failed to parse JSONL line:', line, error);
        return null;
      }
    }).filter(Boolean);
    
    // Filter for FulfillmentOrder objects only
    const fulfillmentOrders = parsedItems.filter(item => 
      item.__typename === 'FulfillmentOrder' && item.id
    );
    
    const emptyObjects = parsedItems.filter(item => 
      Object.keys(item).length === 0
    );
    
    console.log('JSONL Parsing Results:', {
      totalLines: lines.length,
      parsedItems: parsedItems.length,
      fulfillmentOrders: fulfillmentOrders.length,
      emptyObjects: emptyObjects.length,
      filteredOut: parsedItems.length - fulfillmentOrders.length
    });
    
    return {
      valid: true,
      fulfillmentOrders,
      stats: {
        totalItems: parsedItems.length,
        fulfillmentOrderCount: fulfillmentOrders.length,
        emptyObjectCount: emptyObjects.length
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// Export all utilities for easy testing
export default {
  mockBulkOperationWebhook,
  mockBulkOperationResponse,
  mockJSONLData,
  testWebhookEndpoint,
  validateEnvironmentVariables,
  simulateWebhookFlow,
  createTestWebhookPayload,
  validateWebhookPayload,
  logWebhookProcessing,
  validateJSONLParsing
};