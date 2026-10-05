import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS, CHAPTERS, TOTAL_CHAPTERS, freshState, validateState, calculatePlan, pendingChapters, toggleChapter, destination, rangeCount, localDate } from './model.js';
test('66 books, 929 Old Testament + 260 New Testament chapters', () => {
  assert.equal(BOOKS.length, 66);
  assert.equal(TOTAL_CHAPTERS, 1189);
  assert.equal(BOOKS.filter(b => b.testament === 'old').reduce((n, b) => n + b.chapters, 0), 929);
  assert.equal(new Set(CHAPTERS.map(c => c.id)).size, 1189);
});
test('completion toggle is reversible and recommendations skip completed chapters', () => {
  assert.deepEqual(toggleChapter(toggleChapter([], '0:1'), '0:1'), []);
  assert.deepEqual(pendingChapters(['0:1', '0:3'], 2).map(c => c.id), ['0:2', '0:4']);
  assert.throws(() => toggleChapter([], '0:51'));
});
test('today counts as a reading day, including the deadline', () => {
  const now = new Date(2026, 8, 19, 23, 50);
  assert.equal(calculatePlan([], '2026-09-19', 3, now).requiredDaily, 1189);
  assert.equal(calculatePlan([], '2026-09-20', 3, now).requiredDaily, 595);
  assert.equal(calculatePlan([], '2026-09-18', 3, now).requiredDaily, null);
  assert.equal(calculatePlan([], '', 3, now).estimatedDays, 397);
  assert.equal(calculatePlan(['0:1', '0:1'], '', 3, now).read, 1);
});
test('custom reading start skips completed chapters and continues across the end of the Bible', () => {
  const completed = ['42:5', '42:7', '0:1'];
  assert.deepEqual(pendingChapters(completed, 3, '42:5').map(c => c.id), ['42:6', '42:8', '42:9']);
  assert.deepEqual(pendingChapters(completed, 3, '65:22').map(c => c.id), ['65:22', '0:2', '0:3']);
  assert.deepEqual(completed, ['42:5', '42:7', '0:1']);
  const fullCycle = pendingChapters([], TOTAL_CHAPTERS + 1, '42:5');
  assert.equal(fullCycle.length, TOTAL_CHAPTERS);
  assert.equal(new Set(fullCycle.map(c => c.id)).size, TOTAL_CHAPTERS);
  assert.equal(fullCycle.at(-1).id, '42:4');
  assert.deepEqual(pendingChapters(CHAPTERS.map(c => c.id), 3, '42:5'), []);
  assert.throws(() => pendingChapters([], 3, '65:23'));
});
test('reading start persists in backups, accepts legacy records and rejects invalid positions', () => {
  const legacy = { version: 1, completed: ['0:1'], targetDate: '', dailyChapters: 3 };
  assert.equal(validateState(legacy).startChapter, '0:1');
  const data = { ...legacy, startChapter: '42:5' };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))), data);
  assert.equal(freshState().startChapter, '0:1');
  for (const startChapter of [null, '', 5, '42:0', '42:22', '66:1']) {
    assert.throws(() => validateState({ ...data, startChapter }));
  }
});
test('full completion has no more recommendations or remaining days', () => {
  const all = CHAPTERS.map(c => c.id);
  assert.deepEqual(pendingChapters(all, 3), []);
  const plan = calculatePlan(all, '', 3, new Date(2026, 8, 19));
  assert.equal(plan.percent, 100);
  assert.equal(plan.estimatedDays, 0);
});
test('calendar calculations cross month, year, leap day and DST boundaries', () => {
  assert.equal(calculatePlan([], '2026-03-09', 3, new Date(2026, 2, 7, 23)).daysLeft, 3);
  assert.equal(calculatePlan([], '2028-03-01', 3, new Date(2028, 1, 28)).daysLeft, 3);
  const allButTwo = CHAPTERS.slice(2).map(c => c.id);
  assert.equal(calculatePlan(allButTwo, '', 1, new Date(2026, 11, 31)).estimatedDate, '2027-01-01');
  assert.equal(localDate(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
});
test('backup round trips, normalizes duplicates and rejects corrupted data', () => {
  const data = {
    ...freshState(),
    completed: ['0:1', '0:1'],
    targetDate: '2028-02-29'
  };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(data))).completed, ['0:1']);
  for (const invalid of [null, {}, {
    ...data,
    version: 2
  }, {
    ...data,
    completed: ['66:1']
  }, {
    ...data,
    completed: ['0:51']
  }, {
    ...data,
    completed: ['0:0']
  }, {
    ...data,
    targetDate: '2026-02-29'
  }, {
    ...data,
    targetDate: '2026-13-01'
  }, {
    ...data,
    dailyChapters: 0
  }, {
    ...data,
    dailyChapters: 1.5
  }, {
    ...data,
    dailyChapters: 1190
  }]) assert.throws(() => validateState(invalid));
});
test('destination includes start, crosses books and wraps at Revelation', () => {
  assert.equal(destination(0, 1, 1).id, '0:1');
  assert.equal(destination(0, 50, 2).id, '1:1');
  assert.equal(destination(65, 22, 2).id, '0:1');
  assert.equal(destination(0, 1, 1190).id, '0:1');
  for (const n of [0, -1, 1.2, Infinity, 1000001]) assert.throws(() => destination(0, 1, n));
});
test('range includes both ends and wraps even within the same book', () => {
  assert.equal(rangeCount(0, 1, 0, 1), 1);
  assert.equal(rangeCount(0, 50, 1, 1), 2);
  assert.equal(rangeCount(0, 1, 65, 22), 1189);
  assert.equal(rangeCount(65, 22, 0, 1), 2);
  assert.equal(rangeCount(0, 5, 0, 3), 1188);
  assert.throws(() => rangeCount(0, 51, 1, 1));
});
