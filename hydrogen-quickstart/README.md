# Shopify Bulk Operations Webhook Handler

A minimal webhook processing service built with Hydrogen to handle Shopify bulk operation webhooks. This service augments Shopify Flow's capabilities by processing bulk operation results.

## Purpose

This lean backend service is designed specifically to:
- Receive and process Shopify bulk operation webhook notifications
- Parse JSONL files from bulk operations
- Handle webhook verification securely
- Serve as a bridge for Shopify Flow automations that need bulk operation processing

## Setup

### Prerequisites
- Node.js 18+
- A Shopify store with admin API access
- Shopify CLI

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd shopify-bulk-ops-flow-demo/hydrogen-quickstart
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your Shopify credentials:
```
SESSION_SECRET="your-session-secret"
PUBLIC_STOREFRONT_API_TOKEN="your-storefront-token"
PRIVATE_STOREFRONT_API_TOKEN="your-private-storefront-token"
PUBLIC_STORE_DOMAIN="your-store.myshopify.com"
PUBLIC_STOREFRONT_ID="your-storefront-id"
SHOPIFY_ADMIN_API_ACCESS_TOKEN="shpat_xxxxx"  # Required for webhook management
SHOPIFY_WEBHOOK_SECRET="your-webhook-secret"
```

**Note:** The `SHOPIFY_ADMIN_API_ACCESS_TOKEN` must be a valid Admin API token (starts with `shpat_`) with `write_webhooks` permission. To create one:
1. Go to Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps" > Create an app
3. Configure Admin API scopes: `write_webhooks`
4. Install the app and copy the Admin API access token

### Webhook Configuration

See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed instructions on:
- Creating bulk operations in Shopify
- Registering the webhook endpoint
- Testing the webhook handler

## Development

Start the development server:
```bash
npm run dev
```

The webhook endpoint will be available at:
```
POST http://localhost:3000/webhooks
```

## Project Structure

```
app/
├── routes/
│   ├── webhooks.jsx        # Main webhook handler endpoint
│   └── _index.jsx          # Simple status page
├── lib/
│   ├── shopify-admin-client.server.js  # Admin API client
│   ├── fragments.js        # GraphQL fragments (minimal)
│   └── context.js          # App context setup
└── root.jsx               # Minimal root layout
```

## Key Features

- **Secure Webhook Verification**: Uses HMAC to verify webhook authenticity
- **JSONL Processing**: Handles bulk operation result files
- **Error Handling**: Robust error handling for webhook processing
- **Minimal Dependencies**: Only essential packages for webhook processing

## Deployment

### Automated Preview Deployment (Recommended)

Use the integrated deploy:preview script to deploy to Shopify Oxygen and automatically update your webhook:

```bash
npm run deploy:preview
```

This script will:
1. Deploy your app to Shopify Oxygen preview environment
2. Extract the preview URL from the deployment output
3. Automatically update the BULK_OPERATIONS_FINISH webhook to point to the new URL

**Important:** You must have `SHOPIFY_ADMIN_API_ACCESS_TOKEN` set in your `.env` file for webhook updates to work. This token needs `write_webhooks` permission.

### Manual Deployment Options

This service can be deployed to any Node.js hosting platform:

#### Vercel
```bash
npm run build
vercel
```

#### Railway
```bash
railway up
```

#### Fly.io
```bash
fly deploy
```

For manual deployments, remember to update your webhook URL afterwards:
```bash
npm run webhook:update https://your-deployment-url.com/webhooks
```

## Usage

1. Create a bulk operation in Shopify (e.g., bulk product export)
2. The operation completion triggers a webhook to this service
3. The service downloads and processes the JSONL results
4. Use the processed data in your Shopify Flow or other automations

## Troubleshooting

- **Webhook not received**: Check your webhook registration and URL
- **Verification failed**: Ensure SHOPIFY_WEBHOOK_SECRET matches the webhook registration
- **JSONL parsing errors**: Verify the bulk operation query structure

## License

MIT