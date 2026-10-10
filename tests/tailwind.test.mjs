import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

test('Vite generates standard, Motory theme, and responsive Tailwind utilities without Preflight', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const fixture = await mkdtemp(`${root}src/.tailwind-verification-`);
  try {
    await writeFile(
      `${fixture}/index.html`,
      '<!doctype html><html><head><link rel="stylesheet" href="../index.css"></head>' +
        '<body><div class="flex bg-motory-primary text-motory-navy border-motory-light font-sans md:grid"></div></body></html>',
    );
    const result = await build({
      root,
      configFile: `${root}vite.config.ts`,
      logLevel: 'silent',
      build: { write: false, rollupOptions: { input: `${fixture}/index.html` } },
    });
    const outputs = Array.isArray(result) ? result : [result];
    const css = outputs
      .flatMap((output) => output.output)
      .filter((output) => output.type === 'asset' && output.fileName.endsWith('.css'))
      .map((output) => output.source)
      .join('\n');

    assert.match(css, /\.flex\{display:flex\}/);
    assert.match(css, /\.bg-motory-primary\{background-color:var\(--color-primary\)\}/);
    assert.match(css, /\.text-motory-navy\{color:var\(--color-text-primary\)\}/);
    assert.match(css, /\.border-motory-light\{border-color:var\(--color-border\)\}/);
    assert.match(css, /\.font-sans\{font-family:var\(--font-family-ui\)\}/);
    assert.match(css, /@media[^{}]*\(width\s*>=\s*48rem\)\{\.md\\:grid\{display:grid\}/);
    assert.doesNotMatch(css, /box-sizing:border-box;margin:0;padding:0/);
    assert.doesNotMatch(css, /h1,h2,h3,h4,h5,h6\{font-size:inherit/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
