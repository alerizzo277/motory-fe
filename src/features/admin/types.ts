export interface AdminUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  roles: string[];
}
export interface AdminUserActivity {
  activeVehiclesCount: number;
  deletedVehiclesCount: number;
  totalMaintenanceEventsCount: number;
}
export interface AdminUserDetail extends AdminUserSummary {
  activity: AdminUserActivity;
}
export interface AdminDashboard {
  totalUsers: number;
  verifiedUsers: number;
  activeVehicles: number;
  deletedVehicles: number;
  totalMaintenanceEvents: number;
  recentUsers: AdminUserSummary[];
}
export interface AdminUsersPage {
  items: AdminUserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
