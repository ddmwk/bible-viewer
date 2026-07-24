import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCorrectionLookupKey,
  findMatchingCorrection,
  loadCorrectionsRegistry,
  matchesCorrectionEntry,
  validateCorrectionsRegistry,
} from './bible-source-corrections-lib.mjs';

test('loads the reviewed correction registry with 33 unique entries', async () => {
  const registry = await loadCorrectionsRegistry();
  assert.equal(registry.entries.length, 33);
  assert.equal(new Set(registry.entries.map(buildCorrectionLookupKey)).size, 33);
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
});
