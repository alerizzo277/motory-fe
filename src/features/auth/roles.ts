export function hasAdminRole(user: { role?: string; roles?: readonly string[] } | null): boolean {
  return !!user && (user.roles ? user.roles.includes('ADMIN') : user.role === 'ADMIN');
}
