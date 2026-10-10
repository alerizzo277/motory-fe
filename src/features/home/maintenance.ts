import type { MaintenanceEvent } from '../maintenance-events/types.ts';

export type DeadlineStatus = 'scheduled' | 'approaching' | 'dueSoon' | 'overdue' | 'mileageReached';
const PRIORITY: Record<DeadlineStatus, number> = {
  overdue: 0,
  mileageReached: 1,
  dueSoon: 2,
  approaching: 3,
  scheduled: 4,
};
export function calendarToday(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function deadlineStatus(
  event: MaintenanceEvent,
  mileage: number | null,
  today = calendarToday(),
): DeadlineStatus {
  if (event.status !== 'SCHEDULED') return 'scheduled';
  let dateStatus: DeadlineStatus = 'scheduled';
  if (event.scheduledDate) {
    // UTC midnights compare calendar dates without daylight-saving offsets.
    const days = (Date.parse(event.scheduledDate.slice(0, 10)) - Date.parse(today)) / 86400000;
    dateStatus =
      days < 0 ? 'overdue' : days <= 7 ? 'dueSoon' : days <= 30 ? 'approaching' : 'scheduled';
  }
  let mileageStatus: DeadlineStatus = 'scheduled';
  if (mileage !== null && event.scheduledOdometerKm !== null) {
    const remaining = event.scheduledOdometerKm - mileage;
    mileageStatus =
      remaining <= 0
        ? 'mileageReached'
        : remaining <= 500
          ? 'dueSoon'
          : remaining <= 1000
            ? 'approaching'
            : 'scheduled';
  }
  return PRIORITY[dateStatus] <= PRIORITY[mileageStatus] ? dateStatus : mileageStatus;
}
export function upcomingEvents(
  events: MaintenanceEvent[],
  mileage: number | null,
  today = calendarToday(),
) {
  return events
    .filter((event) => event.status === 'SCHEDULED')
    .sort(
      (a, b) =>
        PRIORITY[deadlineStatus(a, mileage, today)] - PRIORITY[deadlineStatus(b, mileage, today)] ||
        (a.scheduledDate ?? '9999').localeCompare(b.scheduledDate ?? '9999') ||
        (a.scheduledOdometerKm ?? Infinity) - (b.scheduledOdometerKm ?? Infinity) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}
export function recentEvents(events: MaintenanceEvent[]) {
  return events
    .filter((event) => event.status === 'EXECUTED')
    .sort(
      (a, b) =>
        (b.executionDate ?? '').localeCompare(a.executionDate ?? '') || a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}
