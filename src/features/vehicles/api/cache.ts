import type { ApolloCache } from '@apollo/client';

export function evictVehicleData(cache: ApolloCache, vehicleId: string) {
  cache.batch({
    update(cache) {
      // Remove cached direct event details as well as dashboard lists.
      const snapshot = cache.extract();
      if (snapshot && typeof snapshot === 'object') {
        const records: [string, unknown][] = Object.entries(snapshot);
        for (const [cacheId, record] of records) {
          if (
            record &&
            typeof record === 'object' &&
            '__typename' in record &&
            record.__typename === 'MaintenanceEvent' &&
            'vehicleId' in record &&
            record.vehicleId === vehicleId &&
            'id' in record &&
            typeof record.id === 'string'
          ) {
            cache.evict({ id: cacheId });
            cache.evict({
              id: 'ROOT_QUERY',
              fieldName: 'maintenanceEvent',
              args: { id: record.id },
            });
          }
        }
      }
      const vehicleCacheId = cache.identify({ __typename: 'Vehicle', id: vehicleId });
      if (vehicleCacheId) cache.evict({ id: vehicleCacheId });
      cache.evict({ id: 'ROOT_QUERY', fieldName: 'vehicle', args: { id: vehicleId } });
      // Remounted dashboard queries fetch the active vehicles and their maintenance data.
      cache.evict({ id: 'ROOT_QUERY', fieldName: 'vehicles' });
      cache.evict({ id: 'ROOT_QUERY', fieldName: 'maintenanceEvents' });
      cache.gc();
    },
  });
}
