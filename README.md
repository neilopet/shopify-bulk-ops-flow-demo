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