import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type {
  Category,
  MaintenanceEvent,
  MaintenanceInput,
  MaintenancePayload,
  MaintenanceStatus,
} from '../types';
const FIELDS = gql`
  fragment MaintenanceEventFields on MaintenanceEvent {
    id
    vehicleId
    categoryId
    name
    status
    scheduledDate
    scheduledOdometerKm
    executionDate
    odometerKm
    cost
    provider
    notes
    createdAt
    updatedAt
  }
`;
export const CATEGORIES: TypedDocumentNode<{ categories: Category[] }> = gql`
  query Categories {
    categories {
      id
      code
    }
  }
`;
export const MAINTENANCE_EVENT: TypedDocumentNode<
  { maintenanceEvent: MaintenanceEvent },
  { id: string }
> = gql`
  query MaintenanceEvent($id: ID!) {
    maintenanceEvent(id: $id) {
      ...MaintenanceEventFields
    }
  }
  ${FIELDS}
`;
export const CREATE_MAINTENANCE_EVENT: TypedDocumentNode<
  { createMaintenanceEvent: MaintenancePayload },
  { input: MaintenanceInput & { vehicleId: string } }
> = gql`
  mutation CreateMaintenanceEvent($input: CreateMaintenanceEventInput!) {
    createMaintenanceEvent(input: $input) {
      event {
        ...MaintenanceEventFields
      }
      nextScheduledEvent {
        ...MaintenanceEventFields
      }
    }
  }
  ${FIELDS}
`;
export const UPDATE_MAINTENANCE_EVENT: TypedDocumentNode<
  { updateMaintenanceEvent: MaintenancePayload },
  { id: string; input: Partial<MaintenanceInput> }
> = gql`
  mutation UpdateMaintenanceEvent($id: ID!, $input: UpdateMaintenanceEventInput!) {
    updateMaintenanceEvent(id: $id, input: $input) {
      event {
        ...MaintenanceEventFields
      }
      nextScheduledEvent {
        ...MaintenanceEventFields
      }
    }
  }
  ${FIELDS}
`;

export const MAINTENANCE_EVENTS: TypedDocumentNode<
  { maintenanceEvents: MaintenanceEvent[] },
  { vehicleId: string; status?: MaintenanceStatus }
> = gql`
  query MaintenanceEvents($vehicleId: ID!, $status: MaintenanceEventStatus) {
    maintenanceEvents(vehicleId: $vehicleId, status: $status) {
      ...MaintenanceEventFields
    }
  }
  ${FIELDS}
`;

export const DELETE_MAINTENANCE_EVENT: TypedDocumentNode<
  { deleteMaintenanceEvent: boolean },
  { id: string }
> = gql`
  mutation DeleteMaintenanceEvent($id: ID!) {
    deleteMaintenanceEvent(id: $id)
  }
`;
