# Reroute Fulfillment Order Flow Extension

This extension demonstrates how to create a custom Shopify Flow trigger that accepts a payload and processes fulfillment order rerouting operations.

## Overview

The extension consists of two main components:
1. **Flow Trigger Extension** - Defines the trigger schema and configuration
2. **Flow Definition** - The actual workflow that processes the trigger payload

## Flow Trigger Configuration

The trigger is defined in [`shopify.extension.toml`](./extensions/reroute-fulfillment-order/shopify.extension.toml):

```toml
[[extensions]]
name = "Reroute Fulfillment Order"
handle = "reroute-fulfillment-order"
type = "flow_trigger"

[settings]
  [[settings.fields]]
  type = "order_reference"

  [[settings.fields]]
  type = "single_line_text_field"
  key = "fulfillment order id"
```

This configuration:
- Creates a trigger with handle `reroute-fulfillment-order`
- Accepts two fields: `order_reference` and `fulfillment order id`

## Triggering the Flow

The flow is triggered programmatically via the [`webhooks.jsx`](./hydrogen-quickstart/app/routes/webhooks.jsx) endpoint using the `flowTriggerReceive` mutation:

```javascript
const variables = {
  handle: "reroute-fulfillment-order",
  payload: {
    "order_id": orderId,              // Numeric order ID
    "fulfillment order id": fulfillmentOrderId  // GID format
  }
};

await shopifyAdminClient.query(FLOW_TRIGGER_RECEIVE, {
  variables,
  cacheStrategy: null,
});
```

## Flow Workflow

The [`reroute_fulfillment_order.flow`](./extensions/reroute-fulfillment-order/reroute_fulfillment_order.flow) file defines the workflow that:

1. **Maps the Target Fulfillment Order** - Uses custom code to find the specific fulfillment order by ID
2. **Iterates Through Fulfillment Orders** - Processes each fulfillment order on the order
3. **Checks Conditions** - Only processes the matching fulfillment order
4. **Reroutes the Fulfillment Order** - Makes an HTTP request to the GraphQL Admin API
5. **Checks Supported Actions** - Verifies if REQUEST_FULFILLMENT is supported
6. **Submits Fulfillment Request** - If supported, submits the request
7. **Updates Metadata** - Tracks reroute attempts in order metafields

## Usage Example

The webhook endpoint processes bulk operations containing fulfillment orders:

```javascript
// Extract fulfillment order data from bulk operation results
const fulfillmentOrderData = extractFulfillmentOrderData(items);

// Process each fulfillment order
for (const data of fulfillmentOrderData) {
  await processFulfillmentOrderRerouting(data, shopifyAdminClient);
}
```

## Key Features

- **Custom Payload Processing** - Accepts custom data structure via Flow triggers
- **GraphQL Integration** - Uses Admin API for fulfillment operations
- **Error Handling** - Tracks attempts and handles failures gracefully
- **Bulk Processing** - Designed to handle multiple fulfillment orders efficiently

## Installation

1. Deploy the extension to your Shopify app
2. Import the flow file into Shopify Flow
3. Configure webhook endpoint to process bulk operations
4. Trigger the flow via the GraphQL API

## Related Files

- [`webhooks.jsx`](./hydrogen-quickstart/app/routes/webhooks.jsx) - Entry point for triggering the flow
- [`fragments.js`](./hydrogen-quickstart/app/lib/fragments.js) - GraphQL mutations including `FLOW_TRIGGER_RECEIVE`
- [`shopify.extension.toml`](./extensions/reroute-fulfillment-order/shopify.extension.toml) - Extension configuration
- [`reroute_fulfillment_order.flow`](./extensions/reroute-fulfillment-order/reroute_fulfillment_order.flow) - Flow definition

## OAuth Token Capture for Custom Distribution Apps

### The Challenge

Shopify Custom Distribution apps receive their access token **only once** during the OAuth callback when first installed. There's no API to retrieve this token later, making it critical to capture and store it properly.

### Solution: Dual OAuth Capture Methods

This repository includes two proven methods to capture OAuth tokens for Custom Distribution apps:

#### 1. **Localhost Method (Recommended)** - 2-minute setup, no deployment needed

Perfect for development and one-time token capture:

```bash
# Navigate to localhost method
cd oauth-capture/localhost-method

# Install dependencies
npm install

# Start the OAuth capture server
SHOPIFY_API_SECRET=your_api_secret_here node minimal-oauth-capture.js

# Visit in browser
http://localhost:3000/auth/install?shop=your-shop.myshopify.com
```

**Features:**
- ✅ Captures OAuth token and saves to `captured_token.json`
- ✅ Automatically tests Flow trigger with handle `reroute-fulfillment-order`
- ✅ Shows immediate feedback on token capture and Flow trigger test
- ✅ No deployment required - runs entirely on localhost

#### 2. **Hydrogen Method (Fallback)** - For production environments

For environments where localhost URLs aren't supported:

```bash
# Navigate to Hydrogen method
cd oauth-capture/hydrogen-method/oauth-capture-v2

# Deploy to Shopify Oxygen
shopify app deploy
```

**Features:**
- ✅ Production-ready OAuth capture
- ✅ Deployed to Shopify's infrastructure
- ✅ Includes Flow trigger testing
- ✅ Suitable for restricted environments

### Security Best Practices

Both methods include comprehensive `.gitignore` protection to prevent accidental token commits:
- `captured_token.json` and all token files are excluded
- Environment variables are protected
- See [`oauth-capture/.gitignore`](./oauth-capture/.gitignore) for full security patterns

### Quick Start Guide

1. **For quick token capture** → Use the localhost method
2. **For production deployment** → Use the Hydrogen method
3. **Store your token securely** → AWS Secrets Manager, environment variables, or encrypted storage
4. **Never commit tokens** → Our `.gitignore` files protect against this

### Integration with Flow Triggers

Both OAuth capture methods automatically test the `reroute-fulfillment-order` Flow trigger after capturing the token, ensuring your Custom Distribution app can successfully interact with Shopify Flow.