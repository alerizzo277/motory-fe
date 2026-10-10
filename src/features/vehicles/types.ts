export const FUEL_TYPES = [
  'PETROL',
  'DIESEL',
  'ELECTRIC',
  'MILD_HYBRID',
  'FULL_HYBRID',
  'PLUG_IN_HYBRID',
  'LPG',
  'OTHER',
] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
export interface VehicleInput {
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  fuelType: FuelType | null;
}
export interface Vehicle extends VehicleInput {
  id: string;
  latestOdometerKm: number | null;
}
export interface VehicleDraft {
  brand: string;
  model: string;
  year: string;
  licensePlate: string;
  fuelType: FuelType | '';
}
export type VehicleErrors = Partial<Record<keyof VehicleDraft, string>>;
