const fs = require('node:fs');
const path = require('node:path');

function saveSnapshot(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function loadSnapshot(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { saveSnapshot, loadSnapshot };
