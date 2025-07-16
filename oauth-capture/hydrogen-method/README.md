# Hydrogen OAuth Capture Method

This directory contains the Hydrogen-based OAuth token capture solution for Custom Distribution apps. This serves as a fallback method for environments that cannot use localhost for OAuth callbacks.

## Why This Method?

- **Production-ready**: Uses Shopify's Hydrogen hosting with proper SSL certificates
- **No localhost required**: Perfect for environments with firewall restrictions
- **Persistent hosting**: Deployed app remains available for token capture
- **Flow-compatible**: Includes the reroute-fulfillment-order Flow trigger

## Directory Structure

```
hydrogen-method/
└── oauth-capture-v2/       # Complete Hydrogen app for OAuth capture
    ├── app/               # React app components
    ├── extensions/        # Flow trigger extension
    ├── shopify.app.toml   # App configuration
    └── test-flow-trigger-success.js  # Test script
```

## Key Features

1. **OAuth Token Capture**: Captures and saves access tokens during app installation
2. **Flow Trigger**: Configured with `reroute-fulfillment-order` handle
3. **Token Security**: .gitignore configured to protect sensitive token files
4. **Test Script**: Includes test-flow-trigger-success.js to verify token functionality

## Deployment

This Hydrogen app is deployable to Shopify's Oxygen hosting platform and provides a reliable OAuth callback endpoint for Custom Distribution apps.

## Usage

See the oauth-capture-v2/README.md for detailed setup and deployment instructions.