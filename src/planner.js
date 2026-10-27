import { EXPENSES, initialPlan, initialPriorities } from './game.js?planner-cloud=20261031';

export const PLANNER_KEY = 'salary-survival-monthly-planner-v1';
export const MAX_FINANCIAL_AMOUNT = 1_000_000_000_000;
const FLEX_CATEGORIES = new Set(['food', 'transport', 'carFuel', 'generatorFuel', 'data', 'gas', 'household', 'family', 'fun']);

export function localDateValue(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function addDays(value, count) {
  const date = parseLocalDate(value) || new Date();
  date.setDate(date.getDate() + count);
  return localDateValue(date);
}

export function createInitialPlanner(income = 0) {
  const periodStart = localDateValue();
  return {
    income,
    sourceCurrency: 'NGN',
    sourceAmount: income,
    exchangeRate: 1,
    exchangeRateDate: null,
    periodStart,
    payDate: addDays(periodStart, 30),
    ready: false,
    expenses: initialPlan(income),
    priorities: initialPriorities(),
    transactions: [],
  };
}

export function normalizePlanner(planner) {
  if (!planner || typeof planner !== 'object' || !Number.isSafeInteger(Number(planner.income)) || Number(planner.income) < 0 || Number(planner.income) > MAX_FINANCIAL_AMOUNT) return null;
  const expenses = { ...initialPlan(Number(planner.income)), ...(planner.expenses || {}) };
  if (Number(planner.expenses?.tithe) === Math.round(Number(planner.income) * .025 / 1000) * 1000) {
    expenses.tithe = initialPlan(Number(planner.income)).tithe;
  }
  expenses.savings = (Number(expenses.savings) || 0) + (Number(planner.expenses?.emergency) || 0);
  delete expenses.emergency;
  if (EXPENSES.some(category => !Number.isSafeInteger(Number(expenses[category.id])) || Number(expenses[category.id]) < 0 || Number(expenses[category.id]) > MAX_FINANCIAL_AMOUNT)) return null;
  const sourceCurrency = /^[A-Z]{3}$/.test(planner.sourceCurrency || '') ? planner.sourceCurrency : 'NGN';
  const sourceAmount = Number(planner.sourceAmount ?? planner.income);
  const exchangeRate = Number(planner.exchangeRate ?? 1);
  if (!Number.isFinite(sourceAmount) || sourceAmount < 0 || sourceAmount > MAX_FINANCIAL_AMOUNT || !Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 1_000_000_000) return null;
  const priorities = {
    ...initialPriorities(),
    ...Object.fromEntries(Object.entries(planner.priorities || {}).filter(([id, value]) =>
      EXPENSES.some(category => category.id === id) && ['protect', 'important', 'reduce'].includes(value))),
  };
  const transactions = Array.isArray(planner.transactions)
    ? planner.transactions.filter(transaction => transaction && typeof transaction.id === 'string'
      && (transaction.category === 'emergency' || EXPENSES.some(category => category.id === transaction.category))
      && Number.isSafeInteger(Number(transaction.amount)) && Number(transaction.amount) > 0
      && Number(transaction.amount) <= 1_000_000_000)
      .slice(-5000)
      .map(transaction => ({
        id: transaction.id,
        category: transaction.category === 'emergency' ? 'savings' : transaction.category,
        amount: Math.round(Number(transaction.amount)),
        date: parseLocalDate(transaction.date) ? transaction.date : localDateValue(),
        status: transaction.status === 'unpaid' ? 'unpaid' : 'paid',
        paidAt: transaction.status === 'unpaid' ? null : (parseLocalDate(transaction.paidAt) ? transaction.paidAt : (parseLocalDate(transaction.date) ? transaction.date : localDateValue())),
        note: typeof transaction.note === 'string' ? transaction.note.slice(0, 120) : '',
        externalId: typeof transaction.externalId === 'string' ? transaction.externalId.slice(0, 160) : '',
      }))
    : [];
  const payDate = parseLocalDate(planner.payDate) ? planner.payDate : addDays(localDateValue(), 30);
  const periodStart = parseLocalDate(planner.periodStart) ? planner.periodStart : addDays(payDate, -30);
  if (payDate < periodStart) return null;
  return {
    income: Math.round(Number(planner.income)),
    sourceCurrency,
    sourceAmount,
    exchangeRate,
    exchangeRateDate: typeof planner.exchangeRateDate === 'string' ? planner.exchangeRateDate.slice(0, 60) : null,
    periodStart,
    payDate,
    ready: Boolean(planner.ready),
    expenses: Object.fromEntries(EXPENSES.map(category => [category.id, Math.round(Number(expenses[category.id]))])),
    priorities,
    transactions,
  };
}

export function loadPlanner() {
  try { return normalizePlanner(JSON.parse(localStorage.getItem(PLANNER_KEY) || 'null')); }
  catch { return null; }
}

export function savePlanner(planner) {
  const clean = normalizePlanner(planner);
  if (!clean) throw Error('Could not save this monthly plan. Check your income, dates, and budget amounts.');
  localStorage.setItem(PLANNER_KEY, JSON.stringify(clean));
  return clean;
}

export function isPlannerExpired(planner, today = localDateValue()) {
  return Boolean(planner?.ready && today > planner.payDate);
}

export function startNextCycle(planner, today = localDateValue()) {
  const start = parseLocalDate(today) ? today : localDateValue();
  return normalizePlanner({
    ...planner,
    periodStart: start,
    payDate: addDays(start, 30),
    transactions: planner.transactions,
  });
}

function currentCycleTransactions(planner, today, status = 'paid') {
  const end = today < planner.payDate ? today : planner.payDate;
  return planner.transactions.filter(transaction => {
    if (transaction.status !== status) return false;
    if (status === 'unpaid') return transaction.date <= planner.payDate;
    const paidDate = transaction.paidAt || transaction.date;
    return paidDate >= planner.periodStart && paidDate <= end;
  });
}

function categoryTotals(transactions) {
  return Object.fromEntries(EXPENSES.map(category => [category.id,
    transactions.filter(transaction => transaction.category === category.id).reduce((sum, transaction) => sum + transaction.amount, 0)]));
}

export function transactionTotals(planner, today = localDateValue()) {
  return categoryTotals(currentCycleTransactions(planner, today, 'paid'));
}

export function pendingTransactionTotals(planner, today = localDateValue()) {
  return categoryTotals(currentCycleTransactions(planner, today, 'unpaid'));
}

export function safeToSpend(planner, today = new Date()) {
  const todayKey = localDateValue(today);
  const totals = transactionTotals(planner, todayKey);
  const pending = pendingTransactionTotals(planner, todayKey);
  const now = parseLocalDate(todayKey) || new Date();
  now.setHours(0, 0, 0, 0);
  const payday = parseLocalDate(planner.payDate) || now;
  const daysLeft = Math.max(1, Math.ceil((payday - now) / 86400000) + 1);
  const allocated = EXPENSES.reduce((sum, category) => sum + planner.expenses[category.id], 0);
  const overBudget = EXPENSES.reduce((sum, category) => sum + Math.max(0, totals[category.id] + pending[category.id] - planner.expenses[category.id]), 0);
  const buffer = Math.max(0, planner.income - allocated - overBudget);
  const flexible = [...FLEX_CATEGORIES].reduce((sum, id) => sum + Math.max(0, planner.expenses[id] - totals[id] - pending[id]), 0);
  const daily = (buffer + flexible) / daysLeft;
  const spentToday = currentCycleTransactions(planner, todayKey)
    .filter(transaction => transaction.status === 'paid' && FLEX_CATEGORIES.has(transaction.category) && (transaction.paidAt || transaction.date) === todayKey)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return {
    daysLeft,
    daily: planner.ready ? Math.floor(daily) : 0,
    spentToday,
    remainingToday: planner.ready ? Math.max(0, Math.floor(daily - spentToday)) : 0,
    totals,
    pendingTotals: pending,
    pendingTotal: Object.values(pending).reduce((sum, amount) => sum + amount, 0),
    buffer,
    expired: isPlannerExpired(planner, todayKey),
  };
}

function csvRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(cell.trim()); cell = ''; }
    else if (character === '\n') { row.push(cell.trim()); if (row.some(value => value)) rows.push(row); row = []; cell = ''; }
    else if (character !== '\r') cell += character;
  }
  row.push(cell.trim());
  if (row.some(value => value)) rows.push(row);
  return rows;
}

function dateISO(value, dateOrder = 'DMY') {
  const text = String(value || '').trim();
  if (!text) throw Error('A transaction date is missing. Add a date to every row before importing.');
  const iso = parseLocalDate(text);
  if (iso) return localDateValue(iso);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  let year, month, day;
  if (match) {
    const first = Number(match[1]), second = Number(match[2]);
    year = Number(match[3]);
    [day, month] = dateOrder === 'MDY' ? [second, first] : [first, second];
  } else {
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) throw Error(`Could not read date “${text}”. Choose the correct date order or fix the CSV.`);
    return localDateValue(parsed);
  }
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    throw Error(`Invalid date “${text}” in the CSV.`);
  }
  return localDateValue(parsed);
}

function numberValue(value) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const accountingNegative = /^\(.*\)$/.test(text);
  const cleaned = text.replace(/[₦$£€¥,\s]/g, '').replace(/[A-Z]{3}/gi, '').replace(/[()]/g, '');
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return 0;
  return accountingNegative ? -Math.abs(number) : number;
}

function matchCategory(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  return EXPENSES.find(category => category.id === text || category.name.toLowerCase() === text
    || category.name.toLowerCase().includes(text) || text.includes(category.id))?.id;
}

export function parseSpendingCsv(text, defaultCategory = 'food', dateOrder = 'DMY') {
  const source = String(text);
  if (new TextEncoder().encode(source).byteLength > 5 * 1024 * 1024) throw Error('Choose a CSV file under 5 MB.');
  const rows = csvRows(source.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw Error('The CSV needs a header row and at least one transaction.');
  if (rows.length > 5001) throw Error('A CSV import can contain at most 5,000 transaction rows.');
  const headers = rows[0].map(value => value.toLowerCase().replace(/[^a-z]/g, ''));
  const find = names => headers.findIndex(header => names.includes(header));
  const dateAt = find(['date', 'transactiondate', 'valuedate', 'posteddate']);
  const descriptionAt = find(['description', 'details', 'narration', 'merchant', 'transactiondescription', 'name']);
  const debitAt = find(['debit', 'debitamount', 'withdrawal', 'withdrawals', 'withdrawalamount', 'moneyout', 'outflow']);
  const creditAt = find(['credit', 'creditamount', 'deposit', 'deposits', 'moneyin', 'inflow']);
  const amountAt = find(['amount', 'value', 'transactionamount']);
  const categoryAt = find(['category']);
  const typeAt = find(['type', 'transactiontype', 'direction']);
  if (debitAt < 0 && amountAt < 0) throw Error('Could not find an Amount or Debit column in this CSV.');
  const parsed = [];
  rows.slice(1).forEach((row, index) => {
    const raw = row[debitAt >= 0 ? debitAt : amountAt];
    const amount = numberValue(raw);
    const categoryText = String(row[categoryAt] || '').toLowerCase();
    const typeText = String(row[typeAt] || '').toLowerCase();
    const direction = `${categoryText} ${typeText}`;
    if (debitAt < 0 && creditAt >= 0 && numberValue(row[creditAt]) > 0) return;
    if (!amount || /credit|deposit|income|transfer\s*in/.test(direction)) return;
    if (!Number.isSafeInteger(Math.round(Math.abs(amount))) || Math.abs(amount) > 1_000_000_000) throw Error(`Transaction on CSV row ${index + 2} is above the supported amount limit.`);
    const date = dateISO(row[dateAt], dateOrder);
    parsed.push({
      category: matchCategory(row[categoryAt]) || matchCategory(row[typeAt]) || defaultCategory,
      amount: Math.round(Math.abs(amount)),
      date,
      note: String(row[descriptionAt] || 'Imported transaction').slice(0, 120),
      externalId: '',
      csvRow: index + 2,
    });
  });
  return parsed.filter(transaction => transaction.amount > 0 && EXPENSES.some(category => category.id === transaction.category));
}

export function newTransactionId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
