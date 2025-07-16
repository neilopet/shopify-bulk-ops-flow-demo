import { useLoaderData } from 'react-router';

export async function loader({ request, context }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  const tokenFromUrl = url.searchParams.get('token');
  
  if (!shop) {
    return Response.json({ error: 'Missing shop parameter' }, { status: 400 });
  }
  
  let token = null;
  
  // First check if token is passed in URL (from OAuth callback)
  if (tokenFromUrl) {
    token = decodeURIComponent(tokenFromUrl);
  }
  
  // Otherwise try to get from KV storage
  if (!token && context.env.TOKENS) {
    token = await context.env.TOKENS.get(shop);
  }
  
  return Response.json({ shop, token });
}

export default function AuthToken() {
  const { shop, token } = useLoaderData();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>OAuth Token Capture</h1>
      <div style={{ marginBottom: '20px' }}>
        <strong>Shop:</strong> {shop}
      </div>
      {token ? (
        <div>
          <strong>Access Token:</strong>
          <div style={{ 
            background: '#f0f0f0', 
            padding: '10px', 
            marginTop: '10px',
            wordBreak: 'break-all',
            border: '1px solid #ccc',
            userSelect: 'all'
          }}>
            {token}
          </div>
          <div style={{ marginTop: '20px', color: '#666' }}>
            ⚠️ This token provides full API access. Store it securely and never expose it publicly.
          </div>
          <div style={{ marginTop: '10px', color: '#666' }}>
            💡 Copy this token now - it may not be available later if KV storage is not configured.
          </div>
        </div>
      ) : (
        <div style={{ color: 'red' }}>
          No token found for this shop. Please ensure the app was installed via OAuth flow.
        </div>
      )}
    </div>
  );
}