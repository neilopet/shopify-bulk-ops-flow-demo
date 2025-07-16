import {createShopifyAdminClient} from '~/lib/shopify-admin-client.server';

/**
 * Create app context for webhook processing
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} executionContext
 * @returns {Promise<AppContext>}
 */
export async function createAppLoadContext(request, env, executionContext) {
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const cache = await caches.open('hydrogen');

  const shopifyAdminClient = createShopifyAdminClient({
    cache,
    waitUntil,
    env,
    request,
  });

  return {
    env,
    waitUntil,
    shopifyAdminClient,
    // Add as 'storefront' to satisfy GraphiQL's hardcoded requirement
    storefront: shopifyAdminClient,
  };
}
