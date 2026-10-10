import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';
import type { User } from '../../auth/types/auth';

export interface ProfileInput {
  firstName: string;
  lastName: string;
}
export interface DeletedVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  deletedAt: string;
  recoveryDeadline: string;
}
export const UPDATE_PROFILE: TypedDocumentNode<{ updateProfile: User }, { input: ProfileInput }> =
  gql`
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        id
        firstName
        lastName
        email
        role
      }
    }
  `;
export const DELETED_VEHICLES: TypedDocumentNode<{ deletedVehicles: DeletedVehicle[] }> = gql`
  query DeletedVehicles {
    deletedVehicles {
      id
      brand
      model
      year
      licensePlate
      deletedAt
      recoveryDeadline
    }
  }
`;
export const RESTORE_VEHICLE: TypedDocumentNode<{ restoreVehicle: boolean }, { id: string }> = gql`
  mutation RestoreVehicle($id: ID!) {
    restoreVehicle(id: $id)
  }
`;
