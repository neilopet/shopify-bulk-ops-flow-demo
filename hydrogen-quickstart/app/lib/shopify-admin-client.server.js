import {createWithCache, CacheNone} from '@shopify/hydrogen';

export function createShopifyAdminClient({cache, waitUntil, env, request}) {
  const withCache = createWithCache({cache, waitUntil, request});
  const apiVersion = env.API_VERSION || '2025-07';
  const baseUrl = `https://${env.SHOP_DOMAIN}.myshopify.com/admin/api`;

  async function query(
    query,
    options = {variables: {}, cacheStrategy: CacheNone(), apiVersion},
  ) {
    const endpoint = `${baseUrl}/${options.apiVersion || apiVersion}/graphql.json`;
    console.log('endpoint: ', endpoint);
    console.log('query: ', query);
    console.log('variables: ', options.variables);
    const result = await withCache.fetch(
      endpoint,
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
          !body.errors || body.errors.length === 0,
      },
    );
    
    const jsonResult = await result.json();
    console.log('GraphQL response:', JSON.stringify(jsonResult, null, 2));
    
    if (jsonResult.errors) {
      console.error('GraphQL errors:', jsonResult.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(jsonResult.errors)}`);
    }
    
    return jsonResult.data;
  }

  return {query};
}
