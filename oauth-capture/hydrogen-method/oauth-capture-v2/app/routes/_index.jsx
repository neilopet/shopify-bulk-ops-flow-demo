import { redirect } from 'react-router';

export const meta = () => {
  return [{title: 'Custom Distribution OAuth Capture'}];
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  
  // If shop parameter is present, redirect to auth flow
  if (shop) {
    return redirect(`/auth/install?shop=${shop}`);
  }
  
  return null;
}

export default function Index() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Custom Distribution OAuth Capture</h1>
      <p>This app captures OAuth tokens for Shopify Custom Distribution apps.</p>
      
      <h2>How to use:</h2>
      <ol>
        <li>Install the app via Custom Distribution link</li>
        <li>The app will capture the OAuth token during installation</li>
        <li>Visit <code>/auth/token?shop=YOUR_SHOP.myshopify.com</code> to retrieve the token</li>
      </ol>
      
      <h2>OAuth Flow:</h2>
      <ol>
        <li><code>/?shop=SHOP</code> → Redirects to <code>/auth/install</code></li>
        <li><code>/auth/install</code> → Redirects to Shopify OAuth</li>
        <li><code>/auth/callback</code> → Exchanges code for token</li>
        <li><code>/auth/token</code> → Displays captured token</li>
      </ol>
    </div>
  );
}