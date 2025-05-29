/**
 * @param {LoaderFunctionArgs}
 */
export async function action({params, context, request}) {
  const endpoint = `https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/${params.version}/graphql.json`;
  const headers = {
    ...request.headers,
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': context.env.ADMIN_API_TOKEN,
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    body: request.body,
    headers,
  });
  return new Response(response.body, {headers: new Headers(response.headers)});
}

/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
