export async function loader({ request, context }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const shop = url.searchParams.get('shop');
  
  if (!code || !shop) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // Exchange code for token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: context.env.SHOPIFY_CLIENT_ID || context.env.SHOPIFY_API_KEY || '0efb20abc830bbddd68ea1e86003306b',
        client_secret: context.env.SHOPIFY_CLIENT_SECRET || context.env.SHOPIFY_API_SECRET || 'e2c2abab607169f817ac7d3d912ada60',
        code,
      }),
    });

    const data = await response.json();
    
    if (data.access_token) {
      // Store token in KV storage if available
      if (context.env.TOKENS) {
        await context.env.TOKENS.put(shop, data.access_token);
        console.log('Token stored in KV storage');
      } else {
        console.warn('KV storage not available, token will only be displayed once');
      }
      
      // Redirect to token display with token in URL (encoded)
      const encodedToken = encodeURIComponent(data.access_token);
      return new Response(null, {
        status: 302,
        headers: { Location: `/auth/token?shop=${shop}&token=${encodedToken}` }
      });
    } else {
      console.error('No access token in response:', data);
      return Response.json({ error: 'Failed to get access token', details: data }, { status: 400 });
    }
    
  } catch (error) {
    console.error('OAuth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}