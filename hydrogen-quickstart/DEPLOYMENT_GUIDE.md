# Deployment Guide for Shopify Bulk Operations Webhook Handler

## Important: Webhook URL Restrictions

Shopify enforces security restrictions on webhook URLs. **Webhooks cannot be configured to point to Shopify-owned domains**, including:
- `*.myshopify.com`
- `*.myshopify.dev`
- `*.shopify.com`
- `*.shopifypreview.com`

This means you cannot use Shopify Oxygen URLs directly for webhooks. You'll need either a custom domain or external hosting.

## Deployment Options

### Option 1: Custom Domain with Shopify Oxygen (Recommended for Production)

1. **Deploy to Shopify Oxygen:**
   ```bash
   npm run build
   shopify hydrogen deploy
   ```

2. **Set up a custom domain:**
   - In your Shopify admin, go to Settings > Domains
   - Add your custom domain (e.g., `shop.yourdomain.com`)
   - Configure it for your Hydrogen storefront

3. **Update webhook URL:**
   ```bash
   npm run webhook:update https://shop.yourdomain.com/webhooks
   ```

**Note:** Custom domains are only available for production deployments, not preview environments.

### Option 2: External Hosting (Recommended for Development/Testing)

Deploy the webhook handler to a service that provides public URLs:

#### Vercel
```bash
npm run build
vercel --prod

# After deployment, update webhook
npm run webhook:update https://your-app.vercel.app/webhooks
```

#### Railway
```bash
railway up

# After deployment, update webhook
npm run webhook:update https://your-app.railway.app/webhooks
```

#### Fly.io
```bash
fly deploy

# After deployment, update webhook
npm run webhook:update https://your-app.fly.dev/webhooks
```

### Option 3: Hybrid Deployment (Best of Both Worlds)

Deploy your main app to Shopify Oxygen and webhooks to external hosting:

1. **Create a webhook-only deployment:**
   - Extract just the webhook handler code
   - Deploy to Vercel/Railway/Fly.io
   - Configure webhook URL to external service

2. **Deploy main app to Oxygen:**
   - Remove webhook routes from Oxygen deployment
   - Keep all other functionality on Shopify's infrastructure

### Option 4: Development with ngrok

For local development and testing:

1. **Start local server:**
   ```bash
   npm run dev
   ```

2. **Create public tunnel:**
   ```bash
   ngrok http 3000
   ```

3. **Update webhook URL:**
   ```bash
   npm run webhook:update https://your-subdomain.ngrok-free.app/webhooks
   ```

## Environment Configuration

### For Production
```env
# Required
ADMIN_API_TOKEN=shpua_xxxxx
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# For custom domain (production only)
WEBHOOK_BASE_URL=https://shop.yourdomain.com
```

### For Development
```env
# Same as above, plus:
LOCAL_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app
```



## Automated Deployment Scripts

### Deploy to External Service with Webhook Update

Create a custom deployment script for your chosen platform:

```json
// package.json
{
  "scripts": {
    "deploy:vercel": "vercel --prod && npm run webhook:update $(vercel ls --json | jq -r '.[] | select(.name==\"your-app-name\") | .url')",
    "deploy:railway": "railway up && npm run webhook:update https://your-app.railway.app/webhooks"
  }
}
```

## Troubleshooting

### "Address cannot be in domains..." Error
This occurs when trying to use a Shopify domain for webhooks. Switch to a custom domain or external hosting.

### Webhook Not Receiving Data
1. Verify webhook URL is publicly accessible
2. Check webhook secret matches
3. Ensure ADMIN_API_TOKEN has `write_webhooks` permission
4. Test with `curl` to your webhook endpoint

### Deployment URL Changes
For services with dynamic URLs (like Vercel preview deployments):
1. Use production deployments with fixed URLs
2. Set up a reverse proxy with a stable URL
3. Use the webhook management UI after each deployment

## Best Practices

1. **Use environment-specific webhook URLs:**
   - Production: Custom domain
   - Staging: Dedicated external URL
   - Development: ngrok or similar

2. **Automate webhook updates:**
   - Include webhook update in CI/CD pipeline
   - Use deployment webhooks to trigger updates
   - Maintain webhook URL in environment variables

3. **Monitor webhook health:**
   - Log all webhook receipts
   - Set up alerts for webhook failures
   - Regularly check webhook status

## Quick Start Commands

```bash
# Check current webhook status
npm run webhook:status

# Update webhook URL
npm run webhook:update https://your-domain.com/webhooks

# List all webhooks
npm run webhook:list

# Deploy to production
shopify hydrogen deploy

# Update webhook after deployment
npm run webhook:update https://shop.yourdomain.com/webhooks
```

## Production Deployment Best Practices

1. **Always use a custom domain for webhooks**
   - Configure domain in Shopify admin first
   - Deploy to production (not preview)
   - Update webhook URL after deployment

2. **Test webhook configuration**
   ```bash
   # Check webhook status
   npm run webhook:status
   
   # Send test webhook (see WEBHOOK_SETUP.md)
   curl -X POST https://shop.yourdomain.com/webhooks \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. **Monitor webhook health**
   - Check logs for webhook receipts
   - Set up alerts for failures
   - Regularly verify webhook status