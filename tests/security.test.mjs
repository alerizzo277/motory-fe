import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from '../src/features/settings/passwordGenerator.ts';
import { validatePasswordChange } from '../src/features/settings/passwordValidation.ts';

const valid = {
  currentPassword: 'old-password',
  newPassword: 'abcdefgh',
  confirmPassword: 'abcdefgh',
};
test('password change uses length-only validation and keeps every character exact', () => {
  assert.deepEqual(validatePasswordChange(valid), {});
  assert.deepEqual(
    validatePasswordChange({
      currentPassword: ' old ',
      newPassword: '        ',
      confirmPassword: '        ',
    }),
    {},
  );
  assert.deepEqual(validatePasswordChange({ ...valid, confirmPassword: 'abcdefgh ' }), {
    confirmPassword: 'validation:passwordMismatch',
  });
});
test('required, length, confirmation and identical-password errors are associated with fields', () => {
  assert.deepEqual(
    validatePasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' }),
    {
      currentPassword: 'validation:passwordRequired',
      newPassword: 'validation:passwordLength',
      confirmPassword: 'validation:confirmPasswordRequired',
    },
  );
  assert.equal(
    validatePasswordChange({ ...valid, newPassword: '1234567' }).newPassword,
    'validation:passwordLength',
  );
  assert.equal(
    validatePasswordChange({ ...valid, newPassword: 'x'.repeat(129) }).newPassword,
    'validation:passwordLength',
  );
  assert.equal(
    validatePasswordChange({ ...valid, newPassword: valid.currentPassword }).newPassword,
    'settings:security.errors.unchanged',
  );
});
test('generated passwords have fixed length and every required category using Web Crypto', () => {
  const original = Math.random;
  Math.random = () => {
    throw new Error('Insecure randomness');
  };
  try {
    for (let i = 0; i < 200; i++) {
      const password = generatePassword();
      assert.equal(password.length, 16);
      for (const category of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/])
        assert.match(password, category);
    }
  } finally {
    Math.random = original;
  }
});
test('rejection sampling discards an out-of-range byte and securely draws shuffle indices', () => {
  let calls = 0;
  const password = generatePassword({
    getRandomValues(bytes) {
      assert.ok(bytes instanceof Uint8Array);
      bytes[0] = calls++ === 0 ? 255 : 0;
      return bytes;
    },
  });
  assert.equal(calls, 32); // 16 characters, 15 shuffle draws, and one rejection.
  assert.equal(password.length, 16);
  for (const character of ['A', 'a', '0', '!']) assert.ok(password.includes(character));
});
test('crypto failures never fall back to an insecure random source', () => {
  assert.throws(
    () =>
      generatePassword({
        getRandomValues() {
          throw new Error('Unavailable crypto');
        },
      }),
    /Unavailable crypto/,
  );
});
