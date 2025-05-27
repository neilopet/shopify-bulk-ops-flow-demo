import {createShopifyAdminClient} from '~/lib/shopify-admin-client.server';

/**
 * Create app context for webhook processing
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} executionContext
 * @returns {Promise<AppContext>}
 */
export async function createAppContext(request, env, executionContext) {
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
  };
}

/**
 * @typedef {Object} AppContext
 * @property {Env} env
 * @property {Function} waitUntil
 * @property {Object} shopifyAdminClient
 */

/**
 * @typedef {Object} Env
 * @property {string} SHOP_DOMAIN
 * @property {string} ADMIN_API_TOKEN
 * @property {string} API_VERSION
 */