import { gql, type TypedDocumentNode } from '@apollo/client';
import type { AdminDashboard, AdminUserDetail, AdminUsersPage } from '../types';

const FIELDS = gql`
  fragment AdminUserFields on AdminUserSummary {
    id
    firstName
    lastName
    email
    createdAt
    emailVerified
    roles
  }
`;
export const ADMIN_DASHBOARD: TypedDocumentNode<{ adminDashboard: AdminDashboard }> = gql`
  query AdminDashboard {
    adminDashboard {
      totalUsers
      verifiedUsers
      activeVehicles
      deletedVehicles
      totalMaintenanceEvents
      recentUsers {
        ...AdminUserFields
      }
    }
  }
  ${FIELDS}
`;
export const ADMIN_USERS: TypedDocumentNode<
  { adminUsers: AdminUsersPage },
  { page: number; pageSize: number; search: string }
> = gql`
  query AdminUsers($page: Int!, $pageSize: Int!, $search: String) {
    adminUsers(page: $page, pageSize: $pageSize, search: $search) {
      items {
        ...AdminUserFields
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
  ${FIELDS}
`;
// AdminUserDetail is a distinct GraphQL object type, not an interface implementation.
export const ADMIN_USER: TypedDocumentNode<{ adminUser: AdminUserDetail }, { id: string }> = gql`
  query AdminUser($id: ID!) {
    adminUser(id: $id) {
      id
      firstName
      lastName
      email
      createdAt
      emailVerified
      roles
      activity {
        activeVehiclesCount
        deletedVehiclesCount
        totalMaintenanceEventsCount
      }
    }
  }
`;
