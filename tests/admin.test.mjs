import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, print } from 'graphql';
import { hasAdminRole } from '../src/features/auth/roles.ts';

test('admin role detection follows the existing single role and supports assigned role arrays', () => {
  assert.equal(hasAdminRole(null), false);
  assert.equal(hasAdminRole({ role: 'USER' }), false);
  assert.equal(hasAdminRole({ role: 'ADMIN' }), true);
  assert.equal(hasAdminRole({ roles: ['USER', 'ADMIN'] }), true);
  assert.equal(hasAdminRole({ roles: ['USER'] }), false);
  assert.equal(hasAdminRole({ role: 'ADMIN', roles: [] }), false);
});

test('administrative operations remain named read-only queries with the verified contract', () => {
  const source = readFileSync(
    new URL('../src/features/admin/api/operations.ts', import.meta.url),
    'utf8',
  );
  const blocks = [...source.matchAll(/gql`([\s\S]*?)`/g)].map((match) =>
    parse(match[1].replace(/\$\{FIELDS\}/g, '')),
  );
  const queries = blocks.flatMap((document) =>
    document.definitions.filter((d) => d.kind === 'OperationDefinition'),
  );
  assert.deepEqual(
    queries.map((q) => q.name.value),
    ['AdminDashboard', 'AdminUsers', 'AdminUser'],
  );
  assert.ok(queries.every((q) => q.operation === 'query'));
  assert.match(
    print(queries[1]),
    /adminUsers\(page: \$page, pageSize: \$pageSize, search: \$search\)/,
  );
  assert.match(print(queries[2]), /adminUser\(id: \$id\)/);
  for (const forbidden of ['passwordHash', 'actionTokens', 'licensePlate', 'odometerKm', 'cost'])
    assert.ok(!source.includes(forbidden));
});
