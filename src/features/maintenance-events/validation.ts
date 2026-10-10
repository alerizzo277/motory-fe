import type {
  Category,
  MaintenanceDraft,
  MaintenanceErrors,
  MaintenanceEvent,
  MaintenanceInput,
  ScheduledDraft,
  NextScheduledEventInput,
} from './types.ts';
export function maintenanceDraft(event?: MaintenanceEvent): MaintenanceDraft {
  return {
    name: event?.name ?? '',
    categoryId: event?.categoryId ?? '',
    status: event?.status ?? 'SCHEDULED',
    scheduledDate: event?.scheduledDate?.slice(0, 10) ?? '',
    scheduledOdometerKm: event?.scheduledOdometerKm?.toString() ?? '',
    executionDate: event?.executionDate?.slice(0, 10) ?? '',
    odometerKm: event?.odometerKm?.toString() ?? '',
    cost: event?.cost ?? '',
    provider: event?.provider ?? '',
    notes: event?.notes ?? '',
  };
}
export function nextDraft(main: ScheduledDraft): ScheduledDraft {
  return {
    name: main.name,
    categoryId: main.categoryId,
    scheduledDate: '',
    scheduledOdometerKm: '',
    notes: '',
  };
}
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeCost(value: string): string {
  return value.trim().replace(',', '.');
}
function optionalText(value: string) {
  return value.trim() || null;
}
export function scheduledInput(draft: ScheduledDraft): NextScheduledEventInput {
  return {
    name: draft.name.trim().replace(/\s+/g, ' '),
    categoryId: draft.categoryId,
    scheduledDate: draft.scheduledDate || null,
    scheduledOdometerKm:
      draft.scheduledOdometerKm === '' ? null : Number(draft.scheduledOdometerKm),
    notes: optionalText(draft.notes),
  };
}
export function maintenanceInput(draft: MaintenanceDraft): MaintenanceInput {
  return {
    ...scheduledInput(draft),
    status: draft.status,
    executionDate: draft.status === 'EXECUTED' ? draft.executionDate || null : null,
    odometerKm:
      draft.status === 'EXECUTED' && draft.odometerKm !== '' ? Number(draft.odometerKm) : null,
    cost: draft.status === 'EXECUTED' && draft.cost.trim() ? normalizeCost(draft.cost) : null,
    provider: draft.status === 'EXECUTED' ? optionalText(draft.provider) : null,
  };
}
export function maintenanceUpdateInput(
  draft: MaintenanceDraft,
  original: MaintenanceDraft,
): Partial<MaintenanceInput> {
  const input = maintenanceInput(draft);
  // Omit untouched values, especially historical scheduling timestamps. Clearing a value sends null.
  return Object.fromEntries(
    Object.entries(input).filter(
      ([field]) =>
        draft[field as keyof MaintenanceDraft] !== original[field as keyof MaintenanceDraft],
    ),
  );
}
export function validateMaintenance(
  draft: ScheduledDraft | MaintenanceDraft,
  categories: Category[],
  today = utcToday(),
): MaintenanceErrors {
  const errors: MaintenanceErrors = {};
  const name = draft.name.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'maintenance:validation.required';
  else if (name.length > 200) errors.name = 'maintenance:validation.shortText';
  if (!draft.categoryId) errors.categoryId = 'maintenance:validation.required';
  else if (!categories.some((category) => category.id === draft.categoryId))
    errors.categoryId = 'maintenance:validation.category';
  if (draft.notes.trim().length > 10000) errors.notes = 'maintenance:validation.notes';
  if (draft.scheduledDate && !validCalendarDate(draft.scheduledDate))
    errors.scheduledDate = 'maintenance:validation.date';
  const mileageFields =
    'status' in draft
      ? (['scheduledOdometerKm', 'odometerKm'] as const)
      : (['scheduledOdometerKm'] as const);
  for (const field of mileageFields) {
    const value = field in draft ? draft[field as keyof typeof draft] : '';
    if (value && (!/^\d+$/.test(value) || Number(value) > 2147483647))
      errors[field] = 'maintenance:validation.mileage';
  }
  if (!('status' in draft) || draft.status === 'SCHEDULED') {
    if (!draft.scheduledDate && !draft.scheduledOdometerKm)
      errors.deadline = 'maintenance:validation.deadline';
  } else {
    if (!draft.executionDate) errors.executionDate = 'maintenance:validation.required';
    else if (!validCalendarDate(draft.executionDate))
      errors.executionDate = 'maintenance:validation.date';
    else if (draft.executionDate > today)
      errors.executionDate = 'maintenance:validation.futureDate';
    if (draft.cost.trim() && !/^\d{1,10}(\.\d{1,2})?$/.test(normalizeCost(draft.cost)))
      errors.cost = 'maintenance:validation.cost';
    if (draft.provider.trim().length > 200) errors.provider = 'maintenance:validation.shortText';
  }
  return errors;
}
