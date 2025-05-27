import {createWithCache, CacheLong} from '@shopify/hydrogen';

export function createShopifyAdminClient({cache, waitUntil, env, request}) {
  const withCache = createWithCache({cache, waitUntil, request});
  const apiVersion = env.API_VERSION || '2025-07';
  const baseUrl = `https://${env.SHOP_DOMAIN}.myshopify.com/admin/api`;

  async function query(
    query,
    options = {variables: {}, cacheStrategy: CacheLong(), apiVersion},
  ) {
    const result = await withCache.fetch(
      `${baseUrl}/${options.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          'X-Shopify-Access-Token': env.ADMIN_API_TOKEN,
        },
        body: JSON.stringify({
          query,
          variables: options.variables,
        }),
      },
      {
        cacheKey: ['shopify-admin', query, JSON.stringify(options.variables)],
        cacheStrategy: options.cacheStrategy,
        shouldCacheResponse: (body) =>
          body.error == null || body.error.length === 0,
      },
    );
    return result.data;
  }

  return {query};
}
