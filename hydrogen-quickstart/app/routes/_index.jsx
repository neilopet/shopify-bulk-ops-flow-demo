export default function Index() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Shopify Webhook Processor</h1>
      <p>This service processes bulk operation webhooks for Shopify Flow integrations.</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Webhook Endpoint</h2>
        <code style={{ display: 'block', padding: '0.5rem', backgroundColor: '#fff', marginTop: '0.5rem' }}>
          POST /webhooks
        </code>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Expected Payload</h3>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
{JSON.stringify({
  admin_graphql_api_id: "gid://shopify/BulkOperation/[ID]",
  completed_at: "2025-03-05T16:11:11-05:00",
  created_at: "2025-03-05T16:11:11-05:00",
  error_code: null,
  status: "completed",
  type: "query"
}, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
        <p><strong>Status:</strong> Ready to process webhooks</p>
      </div>
    </div>
  );
}