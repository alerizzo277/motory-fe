import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveLanguage, persistLanguage, LANGUAGE_STORAGE_KEY } from '../src/i18n/language.ts';

for (const [stored, browser, expected] of [
  ['it', 'en-US', 'it'],
  ['en', 'it-IT', 'en'],
  [null, 'it-IT', 'it'],
  [null, 'en-US', 'en'],
  [null, 'en-GB', 'en'],
  [null, 'de-DE', 'it'],
  ['invalid', 'en-US', 'en'],
  ['en-US', 'it-IT', 'it'],
  ['', 'en-GB', 'en'],
  [null, '', 'it'],
]) {
  test(`language resolution: stored=${stored}, browser=${browser}`, () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const values = new Map(stored === null ? [] : [[LANGUAGE_STORAGE_KEY, stored]]);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: browser },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
    });
    try {
      assert.equal(resolveLanguage(), expected);
      assert.equal(values.get(LANGUAGE_STORAGE_KEY) ?? null, stored);
      persistLanguage('en');
      assert.equal(values.get(LANGUAGE_STORAGE_KEY), 'en');
    } finally {
      if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      else delete globalThis.navigator;
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
      else delete globalThis.localStorage;
    }
  });
}

test('unavailable storage falls back to browser and manual persistence is safe', () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { language: 'en-US' },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage blocked');
    },
  });
  try {
    assert.equal(resolveLanguage(), 'en');
    assert.doesNotThrow(() => persistLanguage('it'));
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  }
});

function keys(object, prefix = '') {
  return Object.entries(object)
    .flatMap(([key, value]) => {
      const path = `${prefix}${key}`;
      if (typeof value === 'object') return keys(value, `${path}.`);
      assert.equal(typeof value, 'string');
      assert.ok(value.length > 0);
      return [path];
    })
    .sort();
}
test('Italian and English namespaces have synchronized nonempty keys and interpolation', () => {
  for (const namespace of ['common', 'auth', 'validation', 'vehicles', 'maintenance', 'settings']) {
    const load = (language) =>
      JSON.parse(
        readFileSync(
          new URL(`../src/i18n/locales/${language}/${namespace}.json`, import.meta.url),
          'utf8',
        ),
      );
    const it = load('it');
    const en = load('en');
    assert.deepEqual(keys(it), keys(en));
    for (const key of keys(it)) {
      const value = (object) => key.split('.').reduce((current, part) => current[part], object);
      assert.deepEqual(value(it).match(/{{\w+}}/g), value(en).match(/{{\w+}}/g));
    }
  }
});
