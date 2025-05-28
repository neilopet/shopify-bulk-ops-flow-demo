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
SESSION_SECRET="your-session-secret-here"
PUBLIC_STOREFRONT_API_TOKEN="your-storefront-token"
PRIVATE_STOREFRONT_API_TOKEN="your-private-storefront-token"
PUBLIC_STORE_DOMAIN="your-store.myshopify.com"
PUBLIC_STOREFRONT_ID="your-storefront-id"
SHOPIFY_ADMIN_API_ACCESS_TOKEN="shpat_xxxxx"  # Required for webhook management
SHOPIFY_WEBHOOK_SECRET="your-webhook-secret"
SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN="your-deployment-token"  # Required for automated deployments
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

### Production Deployment with Custom Domain

For webhook functionality, deploy to production with a custom domain configured in Shopify.

**Fully Automated Deployment**
```bash
npm run deploy:production
```

This script will automatically:
1. Build your project
2. Deploy to Shopify Hydrogen production
3. Create or update your webhook configuration

**Requirements:**
- Custom domain configured in Shopify admin
- `ADMIN_API_TOKEN` in `.env` with `write_webhooks` permission
- `SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN` in `.env` for automated deployments

**Getting Your Deployment Token:**
1. Go to your Shopify Hydrogen settings
2. Find your deployment token
3. Add to `.env`: `SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN=your_token_here`

### Alternative Deployment Options

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

After any deployment, update your webhook URL:
```bash
npm run webhook:update https://your-domain.com/webhooks
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