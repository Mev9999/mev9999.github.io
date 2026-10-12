import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHarness, ORIGIN } from './harness.mjs';
const { bundleWorker } = createRequire(import.meta.url)('../bundle-worker.cjs');

test('dashboard worker is self-contained and sends the same styled reset email through real API code', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'liza-worker-package-'));
  const h = await createHarness();
  try {
    const code = bundleWorker();
    assert.doesNotMatch(code, /^\s*import\s/m);
    const filename = path.join(directory, 'worker.mjs');
    await writeFile(filename, code);
    const { default: bundled } = await import(pathToFileURL(filename).href);
    const pending = [];
    const request = new Request(ORIGIN + '/api/auth/request', {
      method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emina@example.test', purpose: 'reset' }),
    });
    const response = await bundled.fetch(request, h.env, { waitUntil(p) { pending.push(p); } });
    await Promise.all(pending);
    assert.equal(response.status, 200);
    assert.equal(h.mail.messages.length, 1);
    const message = h.mail.messages[0];
    assert.equal(message.to, 'emina@example.test');
    assert.match(message.html, /<table\b/);
    assert.match(message.text, /\?token=/);
    assert.doesNotMatch(message.html, /<script|onerror=/i);
  } finally {
    await h.close();
    // Only remove the verified, task-created temp directory.
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('liza-worker-package-'));
    await rm(directory, { recursive: true, force: true });
  }
});
