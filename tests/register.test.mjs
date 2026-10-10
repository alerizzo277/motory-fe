import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { registerInput, validateRegister } from '../src/features/auth/registerValidation.ts';
import { registerErrors } from '../src/features/auth/api/registerErrors.ts';

const valid = {
  firstName: ' Ada ',
  lastName: ' Lovelace ',
  email: ' ada@example.com ',
  password: ' password ',
  confirmPassword: ' password ',
};
const gqlError = (code, fields) =>
  new CombinedGraphQLErrors({
    errors: [{ message: 'Dettagli interni', extensions: { code, fields } }],
  });

test('campi vuoti e spazi sono invalidi; conferma obbligatoria', () => {
  assert.deepEqual(
    Object.keys(
      validateRegister({
        firstName: ' ',
        lastName: '',
        email: ' ',
        password: '',
        confirmPassword: '',
      }),
    ),
    ['firstName', 'lastName', 'email', 'password', 'confirmPassword'],
  );
});
test('password diverse, limiti backend e formato email', () => {
  assert.ok(validateRegister({ ...valid, confirmPassword: 'password' }).confirmPassword);
  assert.ok(validateRegister({ ...valid, password: '1234567' }).password);
  assert.ok(validateRegister({ ...valid, password: 'x'.repeat(129) }).password);
  assert.ok(validateRegister({ ...valid, firstName: 'x'.repeat(101) }).firstName);
  assert.ok(validateRegister({ ...valid, email: 'invalid' }).email);
  assert.deepEqual(validateRegister(valid), {});
});
test('payload contiene solo i quattro campi backend e preserva la password', () => {
  assert.deepEqual(registerInput(valid), {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: ' password ',
  });
});
test('email esistente riconosciuta solo dal codice', () => {
  assert.equal(
    registerErrors(gqlError('EMAIL_ALREADY_EXISTS')).fields.email,
    'auth:errors.emailAlreadyExists',
  );
  assert.equal(registerErrors(new Error('EMAIL_ALREADY_EXISTS')).message, 'common:errors.generic');
});
test('errori campo del backend tradotti senza esporre messaggi interni', () => {
  const result = registerErrors(
    gqlError('VALIDATION_ERROR', [
      { field: 'email', messages: ['private'] },
      { field: 'password' },
      { field: 'roleId' },
      null,
    ]),
  );
  assert.deepEqual(Object.keys(result.fields), ['email', 'password']);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.equal(registerErrors(gqlError('VALIDATION_ERROR', {})).message, 'validation:checkFields');
  assert.equal(registerErrors(gqlError('INTERNAL_SERVER_ERROR')).message, 'common:errors.generic');
});
