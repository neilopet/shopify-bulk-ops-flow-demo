import {json} from '@shopify/remix-oxygen';
import {Form, useActionData, useLoaderData} from 'react-router-dom';
import {ensureWebhookSubscription, getWebhookSubscriptionId} from '~/lib/webhooks/webhook-manager.server';
import {shopifyAdmin} from '~/lib/shopify-admin-client.server';

const WEBHOOK_SUBSCRIPTION_QUERY = `#graphql
  query webhookSubscription($id: ID!) {
    webhookSubscription(id: $id) {
      id
      topic
      createdAt
      updatedAt
      endpoint {
        ... on WebhookHttpEndpoint {
          callbackUrl
        }
      }
    }
  }
`;

export async function loader({context}) {
  const webhookId = getWebhookSubscriptionId();
  
  if (!webhookId) {
    return json({webhook: null, error: null});
  }

  try {
    const client = shopifyAdmin(context);
    const response = await client.request(WEBHOOK_SUBSCRIPTION_QUERY, {
      variables: {id: webhookId}
    });
    
    return json({
      webhook: response.data?.webhookSubscription,
      error: null
    });
  } catch (error) {
    return json({
      webhook: null,
      error: error.message
    });
  }
}

export async function action({request, context}) {
  const formData = await request.formData();
  const action = formData.get('action');
  
  if (action === 'register') {
    try {
      const webhook = await ensureWebhookSubscription(context);
      return json({
        success: true,
        webhook,
        message: webhook ? 'Webhook subscription updated successfully' : 'Failed to update webhook'
      });
    } catch (error) {
      return json({
        success: false,
        error: error.message
      });
    }
  }
  
  return json({success: false, error: 'Invalid action'});
}

export default function WebhookManage() {
  const {webhook, error} = useLoaderData();
  const actionData = useActionData();
  
  return (
    <div style={{padding: '2rem', fontFamily: 'system-ui, sans-serif'}}>
      <h1>Webhook Management</h1>
      
      <section style={{marginTop: '2rem'}}>
        <h2>Current Webhook Status</h2>
        {error && (
          <div style={{color: 'red', marginBottom: '1rem'}}>
            Error loading webhook: {error}
          </div>
        )}
        
        {webhook ? (
          <div style={{background: '#f0f0f0', padding: '1rem', borderRadius: '8px'}}>
            <p><strong>ID:</strong> {webhook.id}</p>
            <p><strong>Topic:</strong> {webhook.topic}</p>
            <p><strong>Callback URL:</strong> {webhook.endpoint?.callbackUrl}</p>
            <p><strong>Created:</strong> {new Date(webhook.createdAt).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(webhook.updatedAt).toLocaleString()}</p>
          </div>
        ) : (
          <p>No webhook subscription found</p>
        )}
      </section>
      
      <section style={{marginTop: '2rem'}}>
        <h2>Actions</h2>
        <Form method="post">
          <input type="hidden" name="action" value="register" />
          <button 
            type="submit" 
            style={{
              background: '#008060',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Register/Update Webhook
          </button>
        </Form>
        
        {actionData && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: actionData.success ? '#e3f5e1' : '#fce4e4',
            color: actionData.success ? '#008060' : '#d72c0d',
            borderRadius: '4px'
          }}>
            {actionData.message || actionData.error}
            {actionData.webhook && (
              <div style={{marginTop: '0.5rem'}}>
                <strong>Webhook ID:</strong> {actionData.webhook.id}
              </div>
            )}
          </div>
        )}
      </section>
      
      <section style={{marginTop: '2rem'}}>
        <h2>Environment Info</h2>
        <div style={{background: '#f0f0f0', padding: '1rem', borderRadius: '8px'}}>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          <p><strong>Store Domain:</strong> {process.env.PUBLIC_STORE_DOMAIN}</p>
          <p><strong>Webhook Base URL:</strong> {process.env.WEBHOOK_BASE_URL || 'Not set'}</p>
          <p><strong>Local Webhook URL:</strong> {process.env.LOCAL_WEBHOOK_URL || 'Not set'}</p>
        </div>
      </section>
      
      <section style={{marginTop: '2rem'}}>
        <h2>Usage</h2>
        <ul>
          <li>Click "Register/Update Webhook" to ensure the webhook is registered with the current deployment URL</li>
          <li>The webhook will automatically update its callback URL when the app URL changes</li>
          <li>For Hydrogen preview deployments, set WEBHOOK_BASE_URL to your preview URL</li>
        </ul>
      </section>
    </div>
  );
}