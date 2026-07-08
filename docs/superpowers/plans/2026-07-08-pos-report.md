# 高専生にちゃにちゃレポート Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文化祭後に手動実行するNode.jsスクリプトで、`pos/data/state.json`からトッピング組み合わせランキングと10分刻みの注文件数グラフを含むHTMLレポートを生成する。

**Architecture:** 集計ロジック（`pos/server/reportStats.js`、純粋関数・TDD対象）とCLIエントリポイント（`pos/scripts/generate-report.js`、ファイルI/O・HTML生成）を分離する。POS本体には一切変更を加えない。

**Tech Stack:** Node.js標準の`node:test`（集計ロジックのテスト）、`node:fs`/`node:path`（CLIスクリプト）。外部依存ライブラリは追加しない。

参照仕様書: [docs/superpowers/specs/2026-07-08-pos-report-design.md](../specs/2026-07-08-pos-report-design.md)

## Global Constraints

- 対象注文は既存の`salesStats.js`と同じ基準（`status`が`cart`・`cancelled`以外）に揃える。
- トッピング組み合わせは「ホットドッグ1本単位」。商品種別（チーズ有無を含む）＋ケチャップ＋マスタード＋マヨネーズの4項目を1つのラベルとして集計する。
- 時間帯グラフは10分刻み（`HH:MM`、分は10分単位に切り捨て）で注文件数（本数ではなく注文単位）を集計する。
- 日付ごとの内訳と、全日合計の両方をレポートに含める。
- レポート生成時に`state.json`のタイムスタンプ付きバックアップを作成する。
- グラフ描画に外部ライブラリを使わない（CSSのみ）。
- POS本体（`pos/server/index.js`、`pos/public/*`）には一切変更を加えない。

---

## File Structure

```
pos/server/reportStats.js         # 集計ロジック（純粋関数、テスト対象）
pos/test/reportStats.test.js      # reportStats.js のテスト
pos/scripts/generate-report.js    # state.json読み込み・バックアップ・HTML生成・書き出し（CLIエントリポイント）
```

---

## Task 1: 集計ロジック（reportStats.js）

**Files:**
- Create: `pos/server/reportStats.js`
- Test: `pos/test/reportStats.test.js`

**Interfaces:**
- Consumes: `Order`型（`id, uid, day, items: [{product, toppings}], total, received, change, status, createdAt, paidAt, readyAt, handedAt`）
- Produces:
  - `computeToppingRanking(orders: Order[]): Array<{label: string, count: number}>` — 多い順にソート済み
  - `computeTimeBuckets(orders: Order[]): Array<{bucketStart: string, count: number}>` — `bucketStart`昇順にソート済み、データがないバケットは含まない
  - `computeReportData(ordersByDay: {[day: string]: Order[]}): {days: Array<{day: string, toppingRanking, timeBuckets}>, combined: {toppingRanking, timeBuckets}}` — `days`は日付昇順

- [ ] **Step 1: 失敗するテストを書く**

`pos/test/reportStats.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeToppingRanking, computeTimeBuckets, computeReportData } = require('../server/reportStats');

function order(overrides) {
  return {
    id: 1,
    uid: 'uid-1',
    day: '2026-10-16',
    items: [{ product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } }],
    total: 200,
    received: 200,
    change: 0,
    status: 'handed',
    createdAt: '2026-10-16T01:00:00.000Z',
    paidAt: '2026-10-16T01:00:00.000Z',
    readyAt: '2026-10-16T01:01:00.000Z',
    handedAt: '2026-10-16T01:02:00.000Z',
    ...overrides,
  };
}

test('computeToppingRanking はホットドッグ単位でトッピングの組み合わせを集計する', () => {
  const orders = [
    order({
      uid: 'a',
      items: [{ product: 'hotdog', toppings: { ketchup: 'extra', mustard: 'none', mayo: 'normal' } }],
    }),
    order({
      uid: 'b',
      items: [{ product: 'hotdog', toppings: { ketchup: 'extra', mustard: 'none', mayo: 'normal' } }],
    }),
    order({
      uid: 'c',
      items: [{ product: 'cheese_hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } }],
    }),
  ];
  const ranking = computeToppingRanking(orders);
  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].count, 2);
  assert.match(ranking[0].label, /ホットドッグ/);
  assert.match(ranking[0].label, /ケチャップ:多め/);
  assert.equal(ranking[1].count, 1);
  assert.match(ranking[1].label, /チーズホットドッグ/);
});

test('computeToppingRanking はキャンセル済みの注文を除外する', () => {
  const orders = [
    order({ uid: 'a', status: 'handed' }),
    order({ uid: 'b', status: 'cancelled' }),
  ];
  const ranking = computeToppingRanking(orders);
  assert.equal(ranking[0].count, 1);
});

test('computeTimeBuckets は10分刻みで注文件数を集計する（本数ではなく注文単位）', () => {
  const orders = [
    order({ uid: 'a', paidAt: '2026-10-16T01:02:00.000Z', items: [
      { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } },
      { product: 'hotdog', toppings: { ketchup: 'normal', mustard: 'normal', mayo: 'normal' } },
    ] }), // JST 10:02 -> 10:00バケット、2本だが1注文としてカウント
    order({ uid: 'b', paidAt: '2026-10-16T01:07:00.000Z' }), // JST 10:07 -> 10:00バケット
    order({ uid: 'c', paidAt: '2026-10-16T01:15:00.000Z' }), // JST 10:15 -> 10:10バケット
  ];
  const buckets = computeTimeBuckets(orders);
  assert.deepEqual(buckets, [
    { bucketStart: '10:00', count: 2 },
    { bucketStart: '10:10', count: 1 },
  ]);
});

test('computeReportData は日付ごとの集計と全日合計を返す', () => {
  const ordersByDay = {
    '2026-10-16': [order({ uid: 'a', day: '2026-10-16' })],
    '2026-10-17': [
      order({ uid: 'b', day: '2026-10-17', paidAt: '2026-10-17T01:00:00.000Z' }),
      order({ uid: 'c', day: '2026-10-17', paidAt: '2026-10-17T01:00:00.000Z' }),
    ],
  };
  const report = computeReportData(ordersByDay);
  assert.equal(report.days.length, 2);
  assert.equal(report.days[0].day, '2026-10-16');
  assert.equal(report.days[1].day, '2026-10-17');
  assert.equal(report.days[0].toppingRanking[0].count, 1);
  assert.equal(report.days[1].toppingRanking[0].count, 2);
  assert.equal(report.combined.toppingRanking[0].count, 3);
});
```

- [ ] **Step 2: テストを実行し失敗を確認**

Run: `cd pos && node --test test/reportStats.test.js`
Expected: FAIL（`Cannot find module '../server/reportStats'`）

- [ ] **Step 3: 実装を書く**

`pos/server/reportStats.js`:
```js
const PRODUCT_LABELS = { hotdog: 'ホットドッグ', cheese_hotdog: 'チーズホットドッグ' };
const TOPPING_KEYS = ['ketchup', 'mustard', 'mayo'];
const TOPPING_LABELS = { ketchup: 'ケチャップ', mustard: 'マスタード', mayo: 'マヨネーズ' };
const LEVEL_LABELS = { none: 'なし', normal: '普通', extra: '多め' };

function countedOrders(orders) {
  return orders.filter((o) => o.status !== 'cart' && o.status !== 'cancelled');
}

function toppingComboLabel(item) {
  const productLabel = PRODUCT_LABELS[item.product] || item.product;
  const toppingsLabel = TOPPING_KEYS
    .map((key) => `${TOPPING_LABELS[key]}:${LEVEL_LABELS[item.toppings[key]]}`)
    .join(' / ');
  return `${productLabel} / ${toppingsLabel}`;
}

function computeToppingRanking(orders) {
  const counts = {};
  for (const order of countedOrders(orders)) {
    for (const item of order.items) {
      const label = toppingComboLabel(item);
      counts[label] = (counts[label] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function bucketStartOf(paidAt) {
  const date = new Date(paidAt);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(Math.floor(date.getMinutes() / 10) * 10).padStart(2, '0');
  return `${hour}:${minute}`;
}

function computeTimeBuckets(orders) {
  const counts = {};
  for (const order of countedOrders(orders)) {
    const key = bucketStartOf(order.paidAt);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([bucketStart, count]) => ({ bucketStart, count }))
    .sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
}

function computeReportData(ordersByDay) {
  const days = Object.keys(ordersByDay)
    .sort()
    .map((day) => ({
      day,
      toppingRanking: computeToppingRanking(ordersByDay[day]),
      timeBuckets: computeTimeBuckets(ordersByDay[day]),
    }));

  const allOrders = Object.values(ordersByDay).flat();
  const combined = {
    toppingRanking: computeToppingRanking(allOrders),
    timeBuckets: computeTimeBuckets(allOrders),
  };

  return { days, combined };
}

module.exports = { computeToppingRanking, computeTimeBuckets, computeReportData };
```

- [ ] **Step 4: テストを実行し成功を確認**

Run: `cd pos && node --test test/reportStats.test.js`
Expected: PASS（4 tests, 0 failures）

- [ ] **Step 5: Commit**

```bash
git add pos/server/reportStats.js pos/test/reportStats.test.js
git commit -m "pos: レポート集計ロジック(reportStats.js)を追加"
```

---

## Task 2: レポート生成CLIスクリプト（generate-report.js）

**Files:**
- Create: `pos/scripts/generate-report.js`

**Interfaces:**
- Consumes: Task 1の`computeReportData(ordersByDay)`
- Produces: なし（このタスクで完結。`pos/data/report.html`と`pos/data/state-backup-<timestamp>.json`をファイルシステムに書き出す）

- [ ] **Step 1: スクリプトを書く**

`pos/scripts/generate-report.js`:
```js
const fs = require('node:fs');
const path = require('node:path');
const { computeReportData } = require('../server/reportStats');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const REPORT_FILE = path.join(DATA_DIR, 'report.html');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderRankingTable(ranking) {
  if (ranking.length === 0) return '<p>データなし</p>';
  const rows = ranking
    .map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.label)}</td><td>${r.count}</td></tr>`)
    .join('');
  return `<table><thead><tr><th>順位</th><th>組み合わせ</th><th>本数</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTimeBucketChart(buckets) {
  if (buckets.length === 0) return '<p>データなし</p>';
  const max = Math.max(...buckets.map((b) => b.count));
  const bars = buckets
    .map((b) => {
      const widthPercent = max === 0 ? 0 : Math.round((b.count / max) * 100);
      return `<div class="bar-row"><span class="bar-label">${b.bucketStart}</span><div class="bar" style="width:${widthPercent}%"></div><span class="bar-count">${b.count}件</span></div>`;
    })
    .join('');
  return `<div class="bar-chart">${bars}</div>`;
}

function renderSection(title, data) {
  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <h3>トッピング組み合わせランキング</h3>
      ${renderRankingTable(data.toppingRanking)}
      <h3>10分刻みの注文件数</h3>
      ${renderTimeBucketChart(data.timeBuckets)}
    </section>
  `;
}

function renderReportHtml(reportData) {
  const daySections = reportData.days.map((d) => renderSection(d.day, d)).join('');
  const combinedSection = renderSection('2日合計', reportData.combined);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>高専生にちゃにちゃレポート</title>
<style>
  body { font-family: "Hiragino Sans", "Yu Gothic", sans-serif; margin: 24px; }
  table { border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 4px 12px; text-align: left; }
  .bar-chart { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .bar-row { display: flex; align-items: center; gap: 8px; }
  .bar-label { width: 60px; }
  .bar { background: #1976d2; height: 16px; min-width: 2px; }
  .bar-count { color: #555; }
  section { margin-bottom: 40px; }
</style>
</head>
<body>
<h1>高専生にちゃにちゃレポート</h1>
${combinedSection}
${daySections}
</body>
</html>`;
}

function main() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error(`エラー: ${STATE_FILE} が見つかりません。`);
    process.exitCode = 1;
    return;
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    console.error(`エラー: ${STATE_FILE} の読み込みに失敗しました: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const backupFile = path.join(DATA_DIR, `state-backup-${timestamp()}.json`);
  fs.copyFileSync(STATE_FILE, backupFile);
  console.log(`バックアップを作成しました: ${backupFile}`);

  const reportData = computeReportData(state.ordersByDay || {});
  const html = renderReportHtml(reportData);
  fs.writeFileSync(REPORT_FILE, html, 'utf8');
  console.log(`レポートを生成しました: ${REPORT_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { renderReportHtml };
```

- [ ] **Step 2: 実際に実行して確認する**

まず動作確認用のダミーデータでテストする。サーバーが起動していない状態で以下を実行:

Run: `cd pos && node scripts/generate-report.js`

`pos/data/state.json`が存在しない場合、Expected: エラーメッセージが表示され、`process.exitCode`が1になる（レポートやバックアップは作られない）

次に、実際にサーバーを起動して1〜2件注文を会計・受渡まで進めてから（`pos/data/state.json`が作られた状態で）再度実行する:

Run: `cd pos && node scripts/generate-report.js`
Expected:
- コンソールに「バックアップを作成しました: ...」「レポートを生成しました: ...」が表示される
- `pos/data/state-backup-<日時>.json`が作られ、`state.json`と同じ内容であることを確認する
- `pos/data/report.html`が作られ、ブラウザで開くと「高専生にちゃにちゃレポート」の見出し、「2日合計」セクション、当日の日付セクションが表示され、トッピングランキング表と10分刻みの棒グラフが正しく表示されることを確認する

- [ ] **Step 3: Commit**

```bash
git add pos/scripts/generate-report.js
git commit -m "pos: レポート生成CLIスクリプトを追加"
```

---

## Self-Review メモ

- **仕様書カバレッジ**: トッピング組み合わせランキング→Task1の`computeToppingRanking`、10分刻みグラフ→Task1の`computeTimeBuckets`、日別・合計の両方→Task1の`computeReportData`、バックアップ作成→Task2、HTML生成→Task2。仕様書の全項目に対応。
- **プレースホルダー確認**: 全ステップに完全なコードを記載済み。
- **型・シグネチャの一貫性**: `computeReportData`が返す`{days, combined}`の各要素の形（`{toppingRanking, timeBuckets}`）はTask1・Task2で完全に一致。`PRODUCT_LABELS`/`TOPPING_LABELS`/`LEVEL_LABELS`の値は既存の`pos/public/pos/pos.js`・`pos/public/kitchen/kitchen.js`の表記（ホットドッグ/チーズホットドッグ、なし/普通/多め）と揃えている。
