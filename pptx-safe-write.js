// 手動編集保護のコード強制版（poster-knowhow.md §7）。
// 承認済みハッシュ（.approved-hashes.json）と現物のSHA256が食い違う＝手動編集ありの場合、
// Claudeの判断に関係なく書き込みを拒否する（scripts/check-flyer-hash.ps1 のロジックをJS側に複製）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function safeWriteFile(pptx, fileName) {
  const dir = path.dirname(fileName);
  const name = path.basename(fileName);
  const ledgerPath = path.join(dir, '.approved-hashes.json');

  if (fs.existsSync(fileName) && fs.existsSync(ledgerPath)) {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const entry = ledger[name];
    if (entry) {
      const currentHash = crypto.createHash('sha256').update(fs.readFileSync(fileName)).digest('hex').toUpperCase();
      if (currentHash !== entry.sha256.toUpperCase()) {
        throw new Error(
          `BLOCKED: "${name}" was manually edited after approval (${entry.approvedAt}). ` +
          `Do not bypass this check. Confirm with the user before overwriting, or restore from the approved git snapshot.`
        );
      }
    }
  }

  return pptx.writeFile({ fileName });
}

module.exports = { safeWriteFile };
