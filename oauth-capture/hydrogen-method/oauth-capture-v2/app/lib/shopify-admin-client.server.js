import {
  createWithCache,
  CacheNone,
  CacheLong,
  CacheShort,
  CacheCustom,
  generateCacheControlHeader,
} from '@shopify/hydrogen';

export function createShopifyAdminClient({cache, waitUntil, env, request}) {
  const withCache = createWithCache({cache, waitUntil, request});
  const apiVersion = env.API_VERSION || '2025-07';
  const baseUrl = `https://${env.PUBLIC_STORE_DOMAIN}/admin/api`;

  async function query(
    query,
    options = {variables: {}, cacheStrategy: CacheNone(), apiVersion},
  ) {
    const endpoint = `${baseUrl}/${options.apiVersion || apiVersion}/graphql.json`;
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
        shouldCacheResponse: (body) => !body.errors || body.errors.length === 0,
      },
    );

    // withCache.fetch returns a wrapper object with the GraphQL response in the 'data' property
    console.log('GraphQL response:', JSON.stringify(result, null, 2));

    // The actual GraphQL response is in result.data
    const graphqlResponse = result.data || result;

    if (graphqlResponse.errors) {
      console.error('GraphQL errors:', graphqlResponse.errors);
      throw new Error(
        `GraphQL errors: ${JSON.stringify(graphqlResponse.errors)}`,
      );
    }

    return graphqlResponse.data;
  }

  // Add mutate as an alias for query (Admin API doesn't distinguish)
  const mutate = query;

  // Stub methods for GraphiQL compatibility
  const getPublicTokenHeaders = (props = {}) => {
    const contentType = props.contentType || 'json';
    return {
      'Content-Type':
        contentType === 'json' ? 'application/json' : 'application/graphql',
      'X-Shopify-Access-Token': env.ADMIN_API_TOKEN,
    };
  };

  const getPrivateTokenHeaders = (props = {}) => {
    const contentType = props.contentType || 'json';
    const headers = {
      'Content-Type':
        contentType === 'json' ? 'application/json' : 'application/graphql',
      'X-Shopify-Access-Token': env.ADMIN_API_TOKEN,
    };

    if (props.buyerIp) {
      headers['X-Shopify-Buyer-IP'] = props.buyerIp;
    }

    return headers;
  };

  const getShopifyDomain = (props = {}) => {
    const domain = props.storeDomain || env.SHOP_DOMAIN;
    return `${domain}.myshopify.com`;
  };

  const getApiUrl = (props = {}) => {
    const domain = props.storeDomain || env.SHOP_DOMAIN;
    const version = props.storefrontApiVersion || apiVersion;
    return `/api/${version}/graphql.json`;
  };

  return {
    query,
    mutate,
    cache,
    CacheNone,
    CacheLong,
    CacheShort,
    CacheCustom,
    generateCacheControlHeader,
    getPublicTokenHeaders,
    getPrivateTokenHeaders,
    getShopifyDomain,
    getApiUrl,
    i18n: {
      language: 'EN',
      country: 'US',
    },
  };
}
