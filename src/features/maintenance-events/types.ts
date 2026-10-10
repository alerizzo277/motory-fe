export type MaintenanceStatus = 'SCHEDULED' | 'EXECUTED';
export const CATEGORY_CODES = [
  'MAINTENANCE',
  'REPLACEMENT',
  'REPAIR',
  'PAYMENT',
  'INSPECTION',
  'OTHER',
] as const;
export type CategoryCode = (typeof CATEGORY_CODES)[number];
export interface Category {
  id: string;
  code: string;
}
export interface NextScheduledEventInput {
  name: string;
  categoryId: string;
  scheduledDate: string | null;
  scheduledOdometerKm: number | null;
  notes: string | null;
}
export interface MaintenanceInput extends NextScheduledEventInput {
  status: MaintenanceStatus;
  executionDate: string | null;
  odometerKm: number | null;
  cost: string | null;
  provider: string | null;
  nextScheduledEvent?: NextScheduledEventInput;
}
export interface MaintenanceEvent extends Omit<MaintenanceInput, 'nextScheduledEvent'> {
  id: string;
  vehicleId: string;
  createdAt: string;
  updatedAt: string;
}
export interface MaintenancePayload {
  event: MaintenanceEvent;
  nextScheduledEvent: MaintenanceEvent | null;
}
export interface ScheduledDraft {
  name: string;
  categoryId: string;
  scheduledDate: string;
  scheduledOdometerKm: string;
  notes: string;
}
export interface MaintenanceDraft extends ScheduledDraft {
  status: MaintenanceStatus;
  executionDate: string;
  odometerKm: string;
  cost: string;
  provider: string;
}
export type MaintenanceErrors = Partial<
  Record<keyof MaintenanceDraft | 'deadline' | 'nextScheduledEvent', string>
>;
