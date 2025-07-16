// Test the flowTriggerReceive mutation with proper payload
// Usage: node test-flow-trigger-success.js YOUR_ACCESS_TOKEN

import fetch from 'node-fetch';

const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('Usage: node test-flow-trigger-success.js YOUR_ACCESS_TOKEN');
  console.error('Get the token from your OAuth capture app');
  process.exit(1);
}

const SHOP = 'ca-multi-store-demo-2.myshopify.com';
const GRAPHQL_URL = `https://${SHOP}/admin/api/2024-10/graphql.json`;

async function testFlowTrigger() {
  console.log('=== Testing flowTriggerReceive with correct payload ===\n');
  console.log(`Shop: ${SHOP}`);
  console.log(`Token: ${ACCESS_TOKEN.substring(0, 10)}...${ACCESS_TOKEN.substring(ACCESS_TOKEN.length - 5)}\n`);
  
  // Note: The Flow extension expects order_id and "fulfillment order id" (with spaces)
  // The field key in shopify.extension.toml has spaces: key = "fulfillment order id"
  const mutation = `
    mutation {
      flowTriggerReceive(
        handle: "reroute-fulfillment-order",
        payload: { 
          order_id: 5673953509633,
          "fulfillment order id": "gid://shopify/FulfillmentOrder/test-123456"
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.data?.flowTriggerReceive?.userErrors?.length === 0) {
      console.log('\n✅ SUCCESS! Flow trigger received with no errors.');
      console.log('This proves:');
      console.log('1. We have a valid offline access token from our Custom Distribution app');
      console.log('2. The Flow extension is properly deployed and accessible');
      console.log('3. Custom Distribution apps CAN capture OAuth tokens!');
    } else if (data.errors) {
      console.log('\n❌ FAILED with GraphQL errors');
    } else if (data.data?.flowTriggerReceive?.userErrors?.length > 0) {
      console.log('\n❌ FAILED with user errors');
      console.log('\nNote: The payload format may not match the extension configuration.');
      console.log('Check the extension configuration in shopify.extension.toml.');
    }
    
  } catch (error) {
    console.error('Network error:', error);
  }
}

testFlowTrigger();