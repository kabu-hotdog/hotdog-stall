const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { saveSnapshot, loadSnapshot } = require('../server/persistence');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pos-test-')), 'state.json');
}

test('存在しないファイルの loadSnapshot は null を返す', () => {
  const file = tempFile();
  assert.equal(loadSnapshot(file), null);
});

test('saveSnapshot で保存した内容を loadSnapshot で復元できる', () => {
  const file = tempFile();
  const data = { ordersByDay: { '2026-10-16': [{ id: 1, status: 'paid' }] }, cart: { items: [], received: 0 } };
  saveSnapshot(file, data);
  assert.deepEqual(loadSnapshot(file), data);
});

test('saveSnapshot は保存後に一時ファイルを残さない', () => {
  const file = tempFile();
  saveSnapshot(file, { ordersByDay: {}, cart: { items: [], received: 0 } });
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  assert.equal(fs.existsSync(file), true);
});

test('saveSnapshot は上書き保存できる', () => {
  const file = tempFile();
  saveSnapshot(file, { ordersByDay: {}, cart: { items: [], received: 0 } });
  saveSnapshot(file, { ordersByDay: { '2026-10-16': [] }, cart: { items: [], received: 0 } });
  const loaded = loadSnapshot(file);
  assert.deepEqual(loaded.ordersByDay, { '2026-10-16': [] });
});
