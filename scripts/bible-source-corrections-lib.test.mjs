import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCorrectionLookupKey,
  findMatchingCorrection,
  loadCorrectionsRegistry,
  matchesCorrectionEntry,
  validateCorrectionsRegistry,
} from './bible-source-corrections-lib.mjs';

test('loads the reviewed correction registry with 34 unique entries', async () => {
  const registry = await loadCorrectionsRegistry();
  assert.equal(registry.entries.length, 34);
  assert.equal(new Set(registry.entries.map(buildCorrectionLookupKey)).size, 34);
});

test('matches an inline boundary correction only with exact pinned source context', async () => {
  const registry = await loadCorrectionsRegistry();
  const entry = registry.entries.find((candidate) => candidate.kind === 'inline_verse_boundary');
  const context = {
    kind: entry.kind,
    sourcePath: entry.sourcePath,
    sourceLine: entry.sourceLine,
    sourceHash: entry.sourceHash,
    rawLine: entry.rawLine,
    currentVerseNumber: entry.currentVerseNumber,
  };

  assert.equal(matchesCorrectionEntry(entry, context), true);
  assert.equal(matchesCorrectionEntry(entry, { ...context, rawLine: `${entry.rawLine} 변경` }), false);
  assert.equal(matchesCorrectionEntry(entry, { ...context, sourceHash: '0'.repeat(64) }), false);
});

test('matches a correction only with exact pinned source context', async () => {
  const registry = await loadCorrectionsRegistry();
  const entry = registry.entries.find((candidate) => candidate.kind === 'continuation_marker');
  const context = {
    ...entry,
    kind: entry.kind,
  };

  assert.equal(matchesCorrectionEntry(entry, context), true);
  assert.equal(findMatchingCorrection(registry, context), entry);
  assert.equal(matchesCorrectionEntry(entry, { ...context, rawLine: '###### 다른 값' }), false);
  assert.equal(matchesCorrectionEntry(entry, { ...context, sourceLine: entry.sourceLine + 1 }), false);
  assert.equal(matchesCorrectionEntry(entry, { ...context, sourceHash: '0'.repeat(64) }), false);
});

test('rejects stale commits and duplicate correction coordinates', async () => {
  const registry = await loadCorrectionsRegistry();

  assert.throws(
    () => validateCorrectionsRegistry({ ...registry, snapshotCommit: '0'.repeat(40) }),
    /snapshotCommit/u,
  );
  assert.throws(
    () =>
      validateCorrectionsRegistry({
        ...registry,
        entries: [registry.entries[0], registry.entries[0]],
      }),
    /duplicate correction/u,
  );
  assert.throws(
    () =>
      validateCorrectionsRegistry({
        ...registry,
        entries: [{ ...registry.entries[0], reviewedAt: '2026-07-26' }],
      }),
    /must not be later/u,
  );
});
