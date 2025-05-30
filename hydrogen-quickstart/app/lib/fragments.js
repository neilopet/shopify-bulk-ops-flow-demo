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

export const GET_UNCANCELLED_REJECTED_ORDERS = `#graphql
query GetUncancelledRejectedOrders {
    orders(
      first: 100
      sortKey: CREATED_AT
      reverse: false
      query: "-status:cancelled tag_not:cancel fulfillment_status:'request_declined'"
    ) {
      edges {
        node {
          id
          name
          createdAt
          displayFulfillmentStatus
          fulfillmentOrders(
            first: 5
            displayable:true
            query: "request_status:'rejected'"
          ) {
            edges {
              node {
                id
                supportedActions {
                  action
                }
                status
                requestStatus
                assignedLocation {
                  location {
                    id
                    name
                  }
                }
                locationsForMove(first: 50) {
                  edges {
                    node {
                      location {
                        id
                        name
                        isFulfillmentService
                      }
                    }
                  }
                }
              }
            }
          }
        }
    	}
    }
  }
`;

export const BULK_OPERATION_RUN_QUERY = `#graphql
mutation BulkOperationRunQuery {
    bulkOperationRunQuery(query: """
  query GetUncancelledRejectedOrders {
    orders(
      sortKey: CREATED_AT
      reverse: false
      query: "-status:cancelled tag_not:cancel fulfillment_status:'request_declined'"
    ) {
      edges {
        node {
          id
          name
          createdAt
          displayFulfillmentStatus
          fulfillmentOrders(
            displayable:true
            query: "request_status:'rejected'"
          ) {
            edges {
              node {
                id
                supportedActions {
                  action
                }
                status
                requestStatus
                assignedLocation {
                  location {
                    id
                    name
                  }
                }
                locationsForMove {
                  edges {
                    node {
                      location {
                        id
                        name
                        isFulfillmentService
                      }
                    }
                  }
                }
              }
            }
          }
        }
    	}
    }
  }
    """) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_BULK_OPERATION_STATUS = `#graphql
query GetBulkOperationStatus($id: ID!) {
  node(id: $id) {
    ...on BulkOperation {
      id
      status
      errorCode
      query
      type
      createdAt
      completedAt
      objectCount
      rootObjectCount
      url
      fileSize
    }
  }
}
`;

export const REJECT_FULFILLMENT_ORDER = `#graphql
mutation RejectFulfillmentOrder(
    $id: ID!
    $reason: FulfillmentOrderRejectionReason
    $message: String
  ) {
    fulfillmentOrderRejectFulfillmentRequest(
      id: $id
      reason: $reason
    	message: $message
     ) {
      fulfillmentOrder {
        id
        requestStatus
        status
        assignedLocation {
          location {
            id
            name
          }
        }
        supportedActions {
          action
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const FLOW_TRIGGER_RECEIVE = `#graphql
  mutation FlowTriggerReceive(
    $handle:String
    $payload: JSON
  ) {
    flowTriggerReceive(
      handle: $handle
      payload: $payload
    ) {
      __typename
      userErrors {
        field
        message
      }
    }
  }
`;
