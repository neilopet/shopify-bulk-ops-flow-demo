# OAuth Token Capture for Shopify Custom Distribution Apps

This app captures OAuth access tokens during Custom Distribution app installation.

## Quick Start

1. **Configure**: Copy `.env.example` to `.env` and add your app credentials
2. **Install**: `npm install`
3. **Deploy**: `shopify hydrogen deploy --env production`
4. **Update App URL**: Set in Partner Dashboard to your deployment URL
5. **Install App**: Use Custom Distribution link
6. **Get Token**: Visit `/auth/token?shop=YOUR_SHOP.myshopify.com`

## How It Works

1. Custom Distribution link includes `?shop=` parameter
2. App redirects to `/auth/install` to start OAuth
3. Shopify redirects to `/auth/callback` with authorization code
4. App exchanges code for access token
5. Token is displayed at `/auth/token`

## Key Routes

- `/` - Home page, redirects if shop parameter present
- `/auth/install` - Initiates OAuth flow
- `/auth/callback` - Captures access token
- `/auth/token` - Displays captured token

## Deployment

Deploy using Shopify Hydrogen CLI:
```bash
shopify hydrogen deploy --env production
```

For CI/CD deployment options, see the main [CUSTOM_DISTRIBUTION_OAUTH_SOLUTION.md](../CUSTOM_DISTRIBUTION_OAUTH_SOLUTION.md).

## Testing

```bash
# Test your captured token
node test-flow-trigger-success.js YOUR_ACCESS_TOKEN
```

## Production Considerations

- Implement secure token storage (database/secrets manager)
- Add authentication to token display endpoint
- Handle app reinstalls
- Add logging and monitoring

For complete implementation guide, see the main [CUSTOM_DISTRIBUTION_OAUTH_SOLUTION.md](../CUSTOM_DISTRIBUTION_OAUTH_SOLUTION.md).