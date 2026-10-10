import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { hasErrorCode, loginErrorKey } from '../src/graphql/client/errors.ts';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  subscribeToToken,
} from '../src/features/auth/tokenStorage.ts';

test('errori applicativi usano il codice, anche se cambia il messaggio', () => {
  const error = new CombinedGraphQLErrors({
    errors: [{ message: 'Messaggio arbitrario', extensions: { code: 'INVALID_CREDENTIALS' } }],
  });
  assert.equal(loginErrorKey(error), 'auth:errors.invalidCredentials');
  assert.equal(hasErrorCode(error, 'UNAUTHENTICATED'), false);
  assert.equal(loginErrorKey(new Error('Dettagli tecnici privati')), 'auth:errors.loginFailed');
  const expired = new CombinedGraphQLErrors({
    errors: [{ message: 'Expired', extensions: { code: 'UNAUTHENTICATED' } }],
  });
  assert.equal(hasErrorCode(expired, 'UNAUTHENTICATED'), true);
});

test('token persistito, rimosso e notificato agli abbonati', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = new EventTarget();
  let notifications = 0;
  const unsubscribe = subscribeToToken(() => {
    notifications++;
  });
  assert.equal(getAccessToken(), null);
  setAccessToken('test-token');
  assert.equal(values.get('motory_access_token'), 'test-token');
  clearAccessToken();
  assert.equal(getAccessToken(), null);
  assert.equal(notifications, 2);
  unsubscribe();
  setAccessToken('another-token');
  assert.equal(notifications, 2);
  clearAccessToken();
  delete globalThis.localStorage;
  delete globalThis.window;
});

test('unavailable token storage leaves public routes unauthenticated', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked');
    },
  });
  try {
    assert.equal(getAccessToken(), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
