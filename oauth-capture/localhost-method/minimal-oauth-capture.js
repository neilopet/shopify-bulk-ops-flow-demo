const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Your app credentials
const CLIENT_ID = '0efb20abc830bbddd68ea1e86003306b';
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET || 'YOUR_API_SECRET_HERE';
const SCOPES = 'read_orders,write_orders,read_fulfillments,write_fulfillments';

// OAuth endpoints
app.get('/auth/install', (req, res) => {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  
  if (!shop || !code) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    // Exchange code for access token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    
    if (data.access_token) {
      // Save token to file
      // WARNING: This file contains sensitive access tokens - ensure it's in .gitignore!
      await fs.writeFile(
        'captured_token.json',
        JSON.stringify({
          shop,
          access_token: data.access_token,
          scope: data.scope,
          timestamp: new Date().toISOString()
        }, null, 2)
      );

      // Test Flow Trigger
      const flowTestResult = await testFlowTrigger(shop, data.access_token);

      // Display token and test results
      res.send(`
        <h1>OAuth Token Captured Successfully!</h1>
        <p><strong>Shop:</strong> ${shop}</p>
        <p><strong>Access Token:</strong> ${data.access_token}</p>
        <p><strong>Scopes:</strong> ${data.scope}</p>
        <hr>
        <h2>Flow Trigger Test Results</h2>
        ${flowTestResult.success ? 
          `<p style="color: green;">✅ <strong>Flow Trigger Test PASSED!</strong></p>
           <p><strong>Trigger Handle:</strong> ${flowTestResult.handle}</p>
           <p><strong>Order Used:</strong> ${flowTestResult.orderUsed}</p>
           <p><strong>Fulfillment Order:</strong> ${flowTestResult.fulfillmentOrderUsed}</p>
           <p><strong>Response:</strong> ${flowTestResult.response}</p>` :
          `<p style="color: red;">❌ <strong>Flow Trigger Test FAILED</strong></p>
           <p><strong>Error:</strong> ${flowTestResult.error}</p>
           ${flowTestResult.orderUsed ? `<p><strong>Order Attempted:</strong> ${flowTestResult.orderUsed}</p>` : ''}`
        }
        <hr>
        <p><strong>Summary:</strong> Token saved to captured_token.json</p>
        <p>You can now use this token in your AWS backend.</p>
        ${flowTestResult.success ? 
          '<p style="color: green;">✅ Your token works with Flow triggers!</p>' : 
          '<p style="color: orange;">⚠️ Token captured but Flow trigger needs debugging.</p>'
        }
      `);
    } else {
      res.status(500).send('Failed to get access token');
    }
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth exchange failed');
  }
});

// Test Flow Trigger function
async function testFlowTrigger(shop, accessToken) {
  const triggerHandle = 'reroute-fulfillment-order';
  
  try {
    // First, fetch a recent order (simpler approach)
    const orderQuery = {
      query: `
        query getRecentOrders {
          orders(first: 5, reverse: true) {
            nodes {
              id
              name
            }
          }
        }
      `
    };

    const orderResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(orderQuery)
    });

    const orderData = await orderResponse.json();
    
    if (orderData.errors) {
      return {
        success: false,
        error: `Failed to fetch orders: ${orderData.errors.map(e => e.message).join(', ')}`,
        handle: triggerHandle
      };
    }

    const recentOrder = orderData.data?.orders?.nodes?.[0];
    
    if (!recentOrder) {
      return {
        success: false,
        error: 'No orders found. Create a test order first.',
        handle: triggerHandle
      };
    }

    // Extract numeric order ID from GID (exactly like the working test)
    const orderGid = recentOrder.id;
    const orderId = parseInt(orderGid.split('/').pop());
    // Generate a test fulfillment order ID (exactly like the working test)
    const fulfillmentOrderId = `gid://shopify/FulfillmentOrder/test-${Date.now()}`;

    // Now test the Flow trigger with real data
    const flowPayload = {
      query: `
        mutation flowTriggerReceive($handle: String!, $payload: JSON!) {
          flowTriggerReceive(handle: $handle, payload: $payload) {
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        handle: triggerHandle,
        payload: {
          "order_id": orderId,
          "fulfillment order id": fulfillmentOrderId
        }
      }
    };

    const flowResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(flowPayload)
    });

    const flowResult = await flowResponse.json();
    
    if (flowResult.errors) {
      return {
        success: false,
        error: flowResult.errors.map(e => e.message).join(', '),
        handle: triggerHandle,
        orderUsed: `${recentOrder.name} (${orderGid})`
      };
    }

    if (flowResult.data?.flowTriggerReceive?.userErrors?.length > 0) {
      return {
        success: false,
        error: flowResult.data.flowTriggerReceive.userErrors.map(e => `${e.field}: ${e.message}`).join(', '),
        handle: triggerHandle,
        orderUsed: `${recentOrder.name} (${orderGid})`
      };
    }

    return {
      success: true,
      handle: triggerHandle,
      response: 'Flow trigger executed successfully',
      orderUsed: `${recentOrder.name} (${orderGid})`,
      fulfillmentOrderUsed: fulfillmentOrderId
    };

  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error.message}`,
      handle: triggerHandle
    };
  }
}

app.get('/', (req, res) => {
  res.send(`
    <h1>Shopify OAuth Token Capture</h1>
    <p>To start the OAuth flow:</p>
    <ol>
      <li>Make sure this server is publicly accessible (use ngrok if testing locally)</li>
      <li>Update your app's redirect URLs in shopify.app.toml</li>
      <li>Visit: <code>/auth/install?shop=YOUR-SHOP.myshopify.com</code></li>
    </ol>
    <p><strong>This will automatically test your Flow trigger after capturing the token!</strong></p>
  `);
});

app.listen(PORT, () => {
  console.log(`OAuth capture server running on http://localhost:${PORT}`);
  console.log(`\nNext steps:`);
  console.log(`1. Make sure your Partner Dashboard has http://localhost:${PORT}/auth/callback as a redirect URL`);
  console.log(`2. Visit: http://localhost:${PORT}/auth/install?shop=YOUR-SHOP.myshopify.com`);
  console.log(`3. The token will be saved to captured_token.json`);
});