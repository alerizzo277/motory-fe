import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryCache } from '@apollo/client';
import { evictVehicleData } from '../src/features/vehicles/api/cache.ts';
import {
  VEHICLE,
  VEHICLES,
  VEHICLE_DELETION_RETENTION_DAYS,
} from '../src/features/vehicles/api/operations.ts';
import {
  MAINTENANCE_EVENT,
  MAINTENANCE_EVENTS,
} from '../src/features/maintenance-events/api/operations.ts';

test('vehicle deletion removes cached vehicle and event details, invalidates lists, and preserves unrelated details and retention', () => {
  const cache = new InMemoryCache();
  const vehicles = ['deleted', 'active'].map((id) => ({
    __typename: 'Vehicle',
    id,
    brand: 'Ford',
    model: id,
    year: 2020,
    licensePlate: id,
    fuelType: null,
    latestOdometerKm: 123000,
  }));
  const events = vehicles.flatMap((vehicle) =>
    ['SCHEDULED', 'EXECUTED'].map((status) => ({
      __typename: 'MaintenanceEvent',
      id: `${vehicle.id}-${status}`,
      vehicleId: vehicle.id,
      categoryId: 'category',
      name: `${vehicle.id} history`,
      status,
      scheduledDate: '2026-01-01T00:00:00Z',
      scheduledOdometerKm: null,
      executionDate: null,
      odometerKm: null,
      cost: null,
      provider: null,
      notes: 'Private notes',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })),
  );
  cache.writeQuery({ query: VEHICLES, data: { vehicles } });
  cache.writeQuery({
    query: VEHICLE_DELETION_RETENTION_DAYS,
    data: { vehicleDeletionRetentionDays: 47 },
  });
  for (const vehicle of vehicles) {
    cache.writeQuery({ query: VEHICLE, variables: { id: vehicle.id }, data: { vehicle } });
    for (const status of [undefined, 'SCHEDULED', 'EXECUTED']) {
      cache.writeQuery({
        query: MAINTENANCE_EVENTS,
        variables: { vehicleId: vehicle.id, ...(status ? { status } : {}) },
        data: {
          maintenanceEvents: events.filter(
            (event) => event.vehicleId === vehicle.id && (!status || event.status === status),
          ),
        },
      });
    }
  }
  for (const event of events) {
    cache.writeQuery({
      query: MAINTENANCE_EVENT,
      variables: { id: event.id },
      data: { maintenanceEvent: event },
    });
  }
  evictVehicleData(cache, 'deleted');
  assert.equal(cache.readQuery({ query: VEHICLES }), null);
  assert.equal(cache.readQuery({ query: VEHICLE, variables: { id: 'deleted' } }), null);
  assert.equal(cache.extract()['Vehicle:deleted'], undefined);
  assert.equal(
    cache.readQuery({ query: VEHICLE, variables: { id: 'active' } }).vehicle.id,
    'active',
  );
  for (const event of events) {
    const detail = cache.readQuery({ query: MAINTENANCE_EVENT, variables: { id: event.id } });
    if (event.vehicleId === 'deleted') {
      assert.equal(detail, null);
      assert.equal(cache.extract()[`MaintenanceEvent:${event.id}`], undefined);
    } else assert.equal(detail.maintenanceEvent.id, event.id);
  }
  for (const status of [undefined, 'SCHEDULED', 'EXECUTED']) {
    assert.equal(
      cache.readQuery({
        query: MAINTENANCE_EVENTS,
        variables: { vehicleId: 'deleted', ...(status ? { status } : {}) },
      }),
      null,
    );
  }
  assert.equal(
    cache.readQuery({ query: VEHICLE_DELETION_RETENTION_DAYS }).vehicleDeletionRetentionDays,
    47,
  );
});
