import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { Vehicle, VehicleInput } from '../types';
const FIELDS = gql`
  fragment VehicleFields on Vehicle {
    id
    brand
    model
    year
    licensePlate
    fuelType
    latestOdometerKm
  }
`;
export const VEHICLES: TypedDocumentNode<{ vehicles: Vehicle[] }> = gql`
  query Vehicles {
    vehicles {
      ...VehicleFields
    }
  }
  ${FIELDS}
`;
export const VEHICLE: TypedDocumentNode<{ vehicle: Vehicle }, { id: string }> = gql`
  query Vehicle($id: ID!) {
    vehicle(id: $id) {
      ...VehicleFields
    }
  }
  ${FIELDS}
`;
export const CREATE_VEHICLE: TypedDocumentNode<
  { createVehicle: Vehicle },
  { input: VehicleInput }
> = gql`
  mutation CreateVehicle($input: CreateVehicleInput!) {
    createVehicle(input: $input) {
      ...VehicleFields
    }
  }
  ${FIELDS}
`;
export const UPDATE_VEHICLE: TypedDocumentNode<
  { updateVehicle: Vehicle },
  { id: string; input: Partial<VehicleInput> }
> = gql`
  mutation UpdateVehicle($id: ID!, $input: UpdateVehicleInput!) {
    updateVehicle(id: $id, input: $input) {
      ...VehicleFields
    }
  }
  ${FIELDS}
`;

export const DELETE_VEHICLE: TypedDocumentNode<{ deleteVehicle: boolean }, { id: string }> = gql`
  mutation DeleteVehicle($id: ID!) {
    deleteVehicle(id: $id)
  }
`;
export const VEHICLE_DELETION_RETENTION_DAYS: TypedDocumentNode<{
  vehicleDeletionRetentionDays: number;
}> = gql`
  query VehicleDeletionRetentionDays {
    vehicleDeletionRetentionDays
  }
`;
