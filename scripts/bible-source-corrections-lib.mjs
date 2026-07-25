import { promises as fs } from 'node:fs';
import path from 'node:path';

import { SOURCE_METADATA, SOURCE_ROOT } from './bible-source-lock-lib.mjs';

export const CORRECTIONS_PATH = path.join(SOURCE_ROOT, 'corrections.json');
export const CORRECTIONS_SCHEMA_VERSION = 1;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Invalid Bible source corrections: ${message}`);
  }
}

function normalizeSourcePath(sourcePath) {
  return sourcePath.split(path.sep).join('/').replace(/^\/+/u, '');
}

export function buildCorrectionLookupKey({ sourcePath, sourceLine }) {
  return `${normalizeSourcePath(sourcePath)}:${sourceLine}`;
}

export function validateCorrectionsRegistry(registry) {
  assert(registry && typeof registry === 'object', 'registry must be an object');
  assert(registry.schemaVersion === CORRECTIONS_SCHEMA_VERSION, 'unsupported schemaVersion');
  assert(
    registry.snapshotCommit === SOURCE_METADATA.upstream.commit,
    'snapshotCommit does not match the pinned source',
  );
  assert(
    typeof registry.reviewedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(registry.reviewedAt),
    'registry reviewedAt must be an ISO date',
  );
  assert(Array.isArray(registry.entries), 'entries must be an array');

  const keys = new Set();

  for (const entry of registry.entries) {
    assert(
      entry.kind === 'chapter_heading_alias' ||
        entry.kind === 'continuation_marker' ||
        entry.kind === 'inline_verse_boundary',
      `unsupported kind at ${entry.sourcePath}:${entry.sourceLine}`,
    );
    assert(typeof entry.reason === 'string' && entry.reason.length > 0, 'reason is required');
    assert(typeof entry.sourcePath === 'string' && entry.sourcePath.length > 0, 'sourcePath is required');
    assert(Number.isInteger(entry.sourceLine) && entry.sourceLine > 0, 'sourceLine must be positive');
    assert(typeof entry.sourceHash === 'string' && /^[a-f0-9]{64}$/u.test(entry.sourceHash), 'sourceHash must be SHA-256');
    assert(entry.snapshotCommit === registry.snapshotCommit, 'entry snapshotCommit mismatch');
    assert(
      typeof entry.reviewedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(entry.reviewedAt),
      'reviewedAt must be an ISO date',
    );
    assert(
      entry.reviewedAt <= registry.reviewedAt,
      'entry reviewedAt must not be later than registry reviewedAt',
    );

    const key = buildCorrectionLookupKey(entry);
    assert(!keys.has(key), `duplicate correction ${key}`);
    keys.add(key);

    if (entry.kind === 'chapter_heading_alias') {
      assert(entry.verse === null, `${key} heading verse must be null`);
      assert(entry.matchMode === 'normalized_line1_after_bom_strip', `${key} invalid matchMode`);
      assert(entry.action === 'override_expected_chapter_heading_only', `${key} invalid action`);
      assert(entry.sourceLine === 1, `${key} heading correction must target line 1`);
      assert(typeof entry.actualHeadingNormalized === 'string', `${key} actual heading is required`);
      assert(typeof entry.acceptedHeadingNormalized === 'string', `${key} accepted heading is required`);
      continue;
    }

    assert(entry.matchMode === 'exact_path_line_rawline', `${key} invalid matchMode`);
    assert(entry.preserveText === true, `${key} must preserve text`);
    assert(Number.isInteger(entry.currentVerseNumber), `${key} currentVerseNumber is required`);
    assert(entry.verse === entry.currentVerseNumber, `${key} verse mismatch`);

    if (entry.kind === 'inline_verse_boundary') {
      assert(entry.action === 'split_inline_verse_boundary', `${key} invalid action`);
      assert(
        entry.nextVerseNumber === entry.currentVerseNumber + 1,
        `${key} nextVerseNumber must follow currentVerseNumber`,
      );
      assert(typeof entry.beforeText === 'string' && entry.beforeText.length > 0, `${key} beforeText is required`);
      assert(typeof entry.afterText === 'string' && entry.afterText.length > 0, `${key} afterText is required`);
      assert(
        entry.rawLine === `${entry.beforeText}${entry.nextVerseNumber} ${entry.afterText}`,
        `${key} split text does not reproduce rawLine`,
      );
      continue;
    }

    assert(entry.action === 'demote_heading_to_continuation', `${key} invalid action`);
    assert(entry.rawLine === `###### ${entry.markerText}`, `${key} rawLine and markerText mismatch`);
    assert(typeof entry.nextLine === 'string' && entry.nextLine.length > 0, `${key} nextLine is required`);
  }

  return registry;
}

export async function loadCorrectionsRegistry({ correctionsPath = CORRECTIONS_PATH } = {}) {
  const raw = await fs.readFile(correctionsPath, 'utf8');
  return validateCorrectionsRegistry(JSON.parse(raw));
}

export function matchesCorrectionEntry(entry, context) {
  if (buildCorrectionLookupKey(entry) !== buildCorrectionLookupKey(context)) {
    return false;
  }
  if (entry.sourceHash !== context.sourceHash) {
    return false;
  }

  if (entry.kind === 'chapter_heading_alias') {
    return (
      context.kind === entry.kind &&
      context.actualHeadingNormalized === entry.actualHeadingNormalized &&
      context.acceptedHeadingNormalized === entry.acceptedHeadingNormalized
    );
  }

  if (entry.kind === 'inline_verse_boundary') {
    return (
      context.kind === entry.kind &&
      context.rawLine === entry.rawLine &&
      context.currentVerseNumber === entry.currentVerseNumber
    );
  }

  return (
    context.kind === entry.kind &&
    context.rawLine === entry.rawLine &&
    context.markerText === entry.markerText &&
    context.nextLine === entry.nextLine &&
    context.currentVerseNumber === entry.currentVerseNumber
  );
}

export function findMatchingCorrection(registry, context) {
  const key = buildCorrectionLookupKey(context);
  const candidate = registry.entries.find((entry) => buildCorrectionLookupKey(entry) === key);
  return candidate && matchesCorrectionEntry(candidate, context) ? candidate : null;
}
