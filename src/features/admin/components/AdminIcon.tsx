export type AdminIconKind =
  'overview' | 'users' | 'verified' | 'vehicle' | 'deleted' | 'events' | 'back' | 'next';
const paths: Record<AdminIconKind, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  verified: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  vehicle: 'M3 17v-6l3-6h12l3 6v6z M3 11h18 M6 17v3 M18 17v3 M6 14h2 M16 14h2',
  deleted: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  events: 'M14 3l-3 3 2 2 3-3 3 3-3 3 2 2 3-3a7 7 0 0 1-9 9L5 22l-3-3 6-6a7 7 0 0 1 6-10',
  back: 'M19 12H5m7-7-7 7 7 7',
  next: 'm9 5 7 7-7 7',
};
export function AdminIcon({ kind }: { kind: AdminIconKind }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
