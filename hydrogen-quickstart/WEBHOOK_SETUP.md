# Shopify Bulk Operations Webhook System

This Hydrogen storefront implements a webhook processing system for Shopify bulk operations that automatically processes completed bulk queries and reroutes fulfillment orders.

## Overview

The system performs the following workflow:

1. **Receives webhooks** from Shopify when bulk operations complete
2. **Validates** the bulk operation is a "GetOrdersToRelease" query
3. **Downloads** the JSONL results file from Shopify
4. **Extracts** fulfillment order IDs from the order data
5. **Reroutes** fulfillment orders using Shopify's GraphQL API

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Shopify configuration:

```env
# Your Shopify shop domain (without .myshopify.com)
SHOP_DOMAIN=your-shop-name

# Shopify Admin API access token
ADMIN_API_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Location IDs to exclude from fulfillment order rerouting
EXCLUDED_LOCATION_IDS=gid://shopify/Location/9803125

# Location IDs to include for fulfillment order rerouting
INCLUDED_LOCATION_IDS=gid://shopify/Location/9812385,gid://shopify/Location/120351897
```

### 2. Shopify API Permissions

You need a Shopify Admin API access token (starts with `shpat_`) with the following permissions:
- `write_webhooks` - Required for webhook management
- `read_orders` - If processing order data
- `write_orders` - If updating orders
- `read_fulfillments` - If reading fulfillment data
- `write_fulfillments` - If creating fulfillments

To create an Admin API token:
1. Go to Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps" > Create an app
3. Configure Admin API scopes (at minimum: `write_webhooks`)
4. Install the app and copy the Admin API access token
5. Add it to your `.env` file as `SHOPIFY_ADMIN_API_ACCESS_TOKEN`

### 3. Webhook Configuration in Shopify

This app includes automatic webhook management. You have several options:

#### Option 1: Automatic Management (Recommended)

**Via Web Interface:**
1. Navigate to `/webhooks/manage` in your deployed app
2. Click "Register/Update Webhook" to automatically configure the webhook

**Via CLI:**
```bash
# Check current webhook status
npm run webhook:status

# Create or update webhook
npm run webhook:update https://your-deployment-url.com/webhooks

# List all webhooks
npm run webhook:list
```

#### Option 2: Manual Configuration

Configure Shopify to send bulk operation completion webhooks to your endpoint:

**Webhook URL:** `https://your-domain.com/webhooks`
**Event:** `Bulk operations/Complete`
**Format:** JSON

#### Automatic Updates on Deployment

For Hydrogen preview deployments or CI/CD pipelines:
1. Set `WEBHOOK_BASE_URL` environment variable to your deployment URL
2. Use the GitHub Action in `.github/workflows/update-webhook.yml`
3. Or call the webhook update endpoint after deployment

### 4. Environment Variables for Webhook Management

Add these to your `.env` file for automatic webhook management:

```env
# Required for webhook management
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# For production deployments
WEBHOOK_BASE_URL=https://your-production-domain.com

# For local development with ngrok
LOCAL_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app
```

**Important:** The `SHOPIFY_ADMIN_API_ACCESS_TOKEN` is required for all webhook management operations.

### 5. Location ID Setup

To find your Shopify location IDs:

1. Go to Shopify Admin > Settings > Locations
2. Use the Shopify GraphQL API to query locations:

```graphql
query {
  locations(first: 50) {
    edges {
      node {
        id
        name
        address {
          city
          province
        }
      }
    }
  }
}
```

## Testing

### Local Testing

1. Start your Hydrogen development server:
```bash
npm run dev
```

2. Update webhook to point to your local URL:
```bash
# If using ngrok
npm run webhook:update https://your-ngrok-url.ngrok-free.app/webhooks

# Or use the management UI
open http://localhost:3000/webhooks/manage
```

### Manual Testing

Send a test webhook payload to your endpoint:

```bash
curl -X POST http://localhost:3000/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "admin_graphql_api_id": "gid://shopify/BulkOperation/5963216388388",
    "completed_at": "2025-03-05T16:11:11-05:00",
    "created_at": "2025-03-05T16:11:11-05:00",
    "error_code": null,
    "status": "completed",
    "type": "query"
  }'
```

## Webhook Flow Details

### 1. Webhook Reception
- Validates required environment variables
- Parses incoming webhook payload
- Validates payload structure

### 2. Bulk Operation Validation
- Queries Shopify GraphQL API for bulk operation details
- Validates the query starts with "query GetOrdersToRelease"
- Ensures operation status is "COMPLETED"

### 3. Data Processing
- Downloads JSONL file from bulk operation URL
- Parses each line as a separate order object
- Extracts fulfillment order IDs from order data

### 4. Fulfillment Order Rerouting
- Uses Shopify's unstable GraphQL API
- Applies configured location exclusions and inclusions
- Processes fulfillment orders in batches

## Error Handling

The system includes comprehensive error handling for:

- **Configuration errors**: Missing environment variables
- **API errors**: Shopify GraphQL request failures
- **Data errors**: Invalid JSONL parsing
- **Business logic errors**: Wrong bulk operation types

All errors are logged with detailed information for debugging.

## Response Formats

### Success Response
```json
{
  "success": true,
  "bulkOperationId": "gid://shopify/BulkOperation/5963216388388",
  "ordersProcessed": 241,
  "fulfillmentOrdersProcessed": 185
}
```

### Error Response
```json
{
  "success": false,
  "error": "Bulk operation not found",
  "bulkOperationId": "gid://shopify/BulkOperation/5963216388388"
}
```

## Security Considerations

1. **Environment Variables**: Never commit API tokens to version control
2. **Webhook Verification**: Consider implementing Shopify webhook verification
3. **Rate Limiting**: Monitor Shopify API rate limits
4. **Error Logging**: Ensure sensitive data isn't logged

## Deployment

### Shopify Oxygen

This Hydrogen storefront is designed to be deployed on Shopify's Oxygen platform:

1. **Environment Variables Setup**
   ```bash
   # Set environment variables using Shopify CLI
   shopify hydrogen env push --env-file=.env.local
   ```

2. **Deploy to Oxygen**
   ```bash
   # Deploy your storefront
   shopify hydrogen deploy
   ```

3. **Configure Webhook URL**
   - After deployment, your webhook endpoint will be available at:
   - `https://your-storefront.oxygen.shopifypreview.com/webhooks`
   - Configure this URL in your Shopify Admin under Settings > Notifications > Webhooks

4. **Environment Variables via Shopify Admin**
   - Alternatively, set environment variables through Shopify Admin:
   - Go to Online Store > Themes > Actions > Edit code
   - Navigate to your Hydrogen storefront settings
   - Add the required environment variables

5. **Production Considerations**
   - Oxygen automatically provides HTTPS
   - Built-in CDN and global edge deployment
   - Automatic scaling and monitoring
   - Integration with Shopify's infrastructure

### Alternative Deployment Platforms

If deploying elsewhere:

1. **Vercel/Netlify**
   - Set environment variables in your deployment platform
   - Ensure webhook endpoint is accessible publicly
   - Configure webhook URL in Shopify admin

2. **Custom Server**
   - Set up environment variables
   - Configure reverse proxy if needed
   - Ensure HTTPS is enabled
   - Set up monitoring and logging

## Monitoring and Logging

The system logs detailed information at each step:

- Webhook reception
- Bulk operation queries
- File downloads
- Fulfillment order processing
- Error conditions

Monitor these logs to ensure proper operation and troubleshoot issues.

## Troubleshooting

### Common Issues

**"Missing required environment variables"**
- Verify all environment variables are set correctly
- Check variable names match exactly

**"Permission denied (publickey)"**
- Ensure ADMIN_API_TOKEN has correct permissions
- Verify token is not expired

**"Bulk operation not found"**
- Check bulk operation ID format
- Verify operation exists in Shopify

**"No fulfillment order IDs to process"**
- Verify JSONL data structure matches expected format
- Check if orders have fulfillment orders

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will provide additional console output for debugging.

## API References

- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [Shopify Webhooks](https://shopify.dev/docs/apps/webhooks)
- [Bulk Operations](https://shopify.dev/docs/api/usage/bulk-operations)
- [Fulfillment Orders](https://shopify.dev/docs/api/admin-graphql/2025-01/objects/fulfillmentorder)
