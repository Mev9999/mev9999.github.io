import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const context = vm.createContext({ TextEncoder });
vm.runInContext(await readFile(new URL('../frontend/bank-qr.js', import.meta.url), 'utf8'), context, { filename: 'bank-qr.js' });
const qr = context.LizaBankQr;
const example = { recipient: 'Franz Mustermänn', iban: 'DE71110220330123456789', bic: 'BHBLDEHHXXX', amountCents: 1230, reference: 'order-local-123' };

test('bank QR has the exact EPC version 002 UTF-8 payload and checksum-valid IBAN', () => {
  assert.equal(qr.validIban(example.iban), true);
  assert.equal(qr.validIban('DE71 1102 2033 0123 4567 89'), true);
  assert.equal(qr.validIban('DE72110220330123456789'), false);
  assert.equal(qr.validIban('AT00000000000000000000'), false);
  assert.equal(qr.payload(example), 'BCD\n002\n1\nSCT\nBHBLDEHHXXX\nFranz Mustermänn\nDE71110220330123456789\nEUR12.30\n\n\norder-local-123');
  assert.equal(qr.payload({ ...example, amountCents: 1, bic: '' }).split('\n')[7], 'EUR0.01');
});

test('bank QR rejects injected lines, invalid fields, invalid amounts, and oversized UTF-8 payloads', () => {
  for (const value of [
    { ...example, recipient: 'Franz\nOTHER ACCOUNT' },
    { ...example, reference: 'order\r\nEUR999.99' },
    { ...example, bic: 'INVALID' },
    { ...example, iban: 'DE72110220330123456789' },
    { ...example, recipient: '' },
    { ...example, recipient: 'x'.repeat(71) },
    { ...example, reference: 'x'.repeat(141) },
    { ...example, recipient: 'Ä'.repeat(70), reference: 'Ö'.repeat(140) },
    ...[0, -1, 1.5, NaN, Infinity, '1230', 100000000000].map(amountCents => ({ ...example, amountCents })),
  ]) assert.throws(() => qr.payload(value));
});

test('bank QR is a valid bounded matrix and draws an opaque four-module quiet zone', () => {
  const code = qr.matrix(example);
  const count = code.getModuleCount();
  assert.ok(count >= 21 && count <= 69);
  assert.equal((count - 17) % 4, 0);
  assert.equal(code.isDark(0, 0), true);
  assert.equal(code.isDark(1, 1), false);
  assert.equal(code.isDark(3, 3), true);
  for (let row = 0; row < count; row++) for (let column = 0; column < count; column++) assert.equal(typeof code.isDark(row, column), 'boolean');
  const rectangles = []; const ctx = { fillStyle: '', fillRect(...rectangle) { rectangles.push({ color: this.fillStyle, rectangle }); } };
  const canvas = { width: 0, height: 0, getContext: type => type === '2d' ? ctx : null };
  assert.equal(qr.draw(canvas, example), qr.payload(example));
  assert.equal(canvas.width, canvas.height);
  assert.equal(canvas.width, (count + 8) * 6);
  assert.equal(rectangles[0].color, '#ffffff');
  assert.deepEqual(rectangles[0].rectangle, [0, 0, canvas.width, canvas.height]);
  for (const { color, rectangle: [x, y, width, height] } of rectangles.slice(1)) {
    assert.equal(color, '#000000'); assert.equal(width, 6); assert.equal(height, 6);
    assert.ok(x >= 24 && y >= 24 && x + width <= canvas.width - 24 && y + height <= canvas.height - 24);
  }
});
