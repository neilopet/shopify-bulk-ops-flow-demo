// Bulk Operations Fragments
const BULK_OPERATION_FRAGMENT = `#graphql
  fragment BulkOperation on BulkOperation {
    id
    status
    query
    errorCode
    createdAt
    completedAt
    objectCount
    fileSize
    type
    url
    partialDataUrl
  }
`;

const FULFILLMENT_ORDER_FRAGMENT = `#graphql
  fragment FulfillmentOrder on FulfillmentOrder {
    id
    status
    assignedLocation {
      location {
        id
      }
    }
  }
`;

// Bulk Operations Queries
export const GET_BULK_OPERATION_QUERY = `#graphql
  query GetBulkOperation($id: ID!) {
    node(id: $id) {
      ... on BulkOperation {
        ...BulkOperation
      }
    }
  }
  ${BULK_OPERATION_FRAGMENT}
`;

export const FULFILLMENT_ORDERS_REROUTE_MUTATION = `#graphql
  mutation fulfillmentOrdersReroute($excludedLocationIds: [ID!], $fulfillmentOrderIds: [ID!]!, $includedLocationIds: [ID!]) {
    fulfillmentOrdersReroute(excludedLocationIds: $excludedLocationIds, fulfillmentOrderIds: $fulfillmentOrderIds, includedLocationIds: $includedLocationIds) {
      movedFulfillmentOrders {
        ...FulfillmentOrder
      }
      userErrors {
        field
        message
      }
    }
  }
  ${FULFILLMENT_ORDER_FRAGMENT}
`;