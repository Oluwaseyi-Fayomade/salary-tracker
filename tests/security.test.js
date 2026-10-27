import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createInitialPlanner, normalizePlanner, parseSpendingCsv } from '../src/planner.js';
import { EXPENSES, STORAGE_KEY, createGame, initialPlan, loadSave } from '../src/game.js';

const migration = await readFile(new URL('../supabase/migrations/20261027000100_security_hardening.sql', import.meta.url), 'utf8');
const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
const monoFunctions = await readFile(new URL('../supabase/functions/mono-link/index.ts', import.meta.url), 'utf8');

test('planner accepts a normal bounded plan', () => {
  const plan = createInitialPlanner(250_000);
  plan.ready = true;
  assert.equal(normalizePlanner(plan)?.income, 250_000);
});

test('planner rejects oversized income and expense amounts', () => {
  const plan = createInitialPlanner(250_000);
  assert.equal(normalizePlanner({ ...plan, income: 1_000_000_000_001 }), null);
  assert.equal(normalizePlanner({ ...plan, expenses: { ...plan.expenses, food: 1_000_000_000_001 } }), null);
  assert.equal(normalizePlanner({ ...plan, expenses: { ...plan.expenses, food: 12.5 } }), null);
});

test('planner drops invalid or unsafe transaction records', () => {
  const plan = createInitialPlanner(250_000);
  plan.transactions = [
    { id: 'ok', category: 'food', amount: 1200, date: plan.periodStart },
    { id: 'fraction', category: 'food', amount: 1.5, date: plan.periodStart },
    { id: 'overflow', category: 'food', amount: Number.MAX_SAFE_INTEGER + 1, date: plan.periodStart },
    { id: 'wrong-category', category: 'admin', amount: 100, date: plan.periodStart },
  ];
  assert.deepEqual(normalizePlanner(plan)?.transactions.map(item => item.id), ['ok']);
});

test('CSV parser bounds file size, row count, and transaction values', () => {
  assert.throws(() => parseSpendingCsv('x'.repeat(5 * 1024 * 1024 + 1)), /under 5 MB/);
  const rows = ['Date,Amount,Description', ...Array.from({ length: 5001 }, (_, i) => `2026-10-01,1,Row ${i}`)].join('\n');
  assert.throws(() => parseSpendingCsv(rows), /at most 5,000/);
  assert.throws(() => parseSpendingCsv('Date,Amount,Description\n2026-10-01,1000000001,Large'), /supported amount limit/);
});

test('game setup rejects fractional or excessive category values', () => {
  const plan = initialPlan(250_000);
  assert.equal(EXPENSES.length, Object.keys(plan).length);
  assert.throws(() => createGame(250_000, { ...plan, food: 1.5 }), /whole-naira/);
  assert.throws(() => createGame(250_000, { ...plan, food: 1_000_000_000_001 }), /whole-naira/);
  assert.equal(createGame(250_000, plan).salary, 250_000);
});

test('tampered browser game saves are rejected and removed', () => {
  const values = new Map([[STORAGE_KEY, JSON.stringify({ salary: 250_000, currentDay: 1, gameStatus: 'playing', money: 1e308 })]]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) };
  assert.equal(loadSave(), null);
  assert.equal(values.has(STORAGE_KEY), false);
});

test('database migration protects cloud snapshots and gates atomic limits to service role', () => {
  assert.match(migration, /user_finance_snapshots_size_check/);
  assert.match(migration, /on delete cascade/);
  assert.match(migration, /consume_api_rate_limit/);
  assert.match(migration, /revoke all on function public\.consume_api_rate_limit[\s\S]*?from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.consume_api_rate_limit[\s\S]*?to service_role/i);
});

test('static hosting policy sets a CSP and disallows framing', () => {
  assert.match(headers, /Content-Security-Policy:/);
  const scriptPolicy = headers.match(/script-src[^;\n]*/)?.[0] || '';
  assert.match(scriptPolicy, /'self' https:\/\/esm\.sh/);
  assert.doesNotMatch(scriptPolicy, /'unsafe-inline'/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
});

test('bank-link endpoint prevents replacing an active link and rate limits attempts', () => {
  assert.match(monoFunctions, /enforceRateLimit\(user\.id, 'mono-link', 1, 60\)/);
  assert.match(monoFunctions, /existing\?\.mono_account_id/);
  assert.match(monoFunctions, /linkUrl\.hostname !== 'link\.mono\.co'/);
});
