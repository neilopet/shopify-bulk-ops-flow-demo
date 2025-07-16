import { redirect } from 'react-router';

export async function loader({ request, context }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  
  if (!shop) {
    return new Response('Missing shop parameter', { status: 400 });
  }

  const clientId = context.env.SHOPIFY_CLIENT_ID || context.env.SHOPIFY_API_KEY || '0efb20abc830bbddd68ea1e86003306b';
  const redirectUri = `${url.origin}/auth/callback`;
  const scopes = 'read_orders,write_orders,read_fulfillments,write_fulfillments';
  
  // Generate a random nonce for security
  const nonce = Math.random().toString(36).substring(2, 15);
  
  // Build the authorization URL
  const authUrl = `https://${shop}/admin/oauth/authorize?` + 
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${nonce}`;

  return redirect(authUrl);
}