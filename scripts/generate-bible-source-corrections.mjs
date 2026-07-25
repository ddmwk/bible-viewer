import { promises as fs } from 'node:fs';
import path from 'node:path';

import { validateCorrectionsRegistry } from './bible-source-corrections-lib.mjs';
import { LOCK_PATH, MARKDOWN_ROOT, SOURCE_METADATA, SOURCE_ROOT } from './bible-source-lock-lib.mjs';

const REVIEWED_AT = '2026-07-25';
const LEGACY_REVIEWED_AT = '2026-07-24';

const headingCorrections = [1, 2, 3, 4].map((chapter) => ({
  kind: 'chapter_heading_alias',
  sourcePath: `39말라기/말${chapter}.md`,
  sourceLine: 1,
  book: '말라기',
  chapter,
  verse: null,
  matchMode: 'normalized_line1_after_bom_strip',
  action: 'override_expected_chapter_heading_only',
  actualHeadingNormalized: `# 말라가 ${chapter}장`,
  acceptedHeadingNormalized: `# 말라기 ${chapter}장`,
  reason: 'Pinned upstream snapshot contains a chapter-title typo; only parser metadata is normalized.',
  reviewedAt: LEGACY_REVIEWED_AT,
}));

const markerCorrections = [
  [1, 9, 1, '그'],
  [1, 24, 5, '은혜와'],
  [1, 33, 7, '땅에'],
  [1, 42, 9, '하나님의'],
  [2, 12, 2, '자칭'],
  [2, 24, 5, '만일'],
  [2, 33, 7, '이기는'],
  [2, 42, 9, '자칭'],
  [2, 48, 10, '너희가'],
  [2, 60, 13, '내'],
  [2, 66, 14, '발람이'],
  [2, 78, 17, '또'],
  [2, 90, 20, '그가'],
  [2, 99, 22, '만일'],
  [2, 105, 23, '내가'],
  [2, 111, 24, '다른'],
  [3, 9, 1, '내가'],
  [3, 18, 3, '내가'],
  [3, 24, 4, '그들은'],
  [3, 30, 5, '그'],
  [3, 39, 7, '곧'],
  [3, 45, 8, '네가'],
  [3, 51, 9, '저희로'],
  [3, 57, 10, '이는'],
  [3, 66, 12, '내가'],
  [3, 69, 12, '나의'],
  [3, 87, 17, '네'],
  [3, 93, 18, '벌거벗은'],
  [3, 102, 20, '내가'],
].map(([chapter, sourceLine, currentVerseNumber, markerText]) => ({
  kind: 'continuation_marker',
  sourcePath: `66요한계시록/계${chapter}.md`,
  sourceLine,
  book: '요한계시록',
  chapter,
  verse: currentVerseNumber,
  currentVerseNumber,
  markerText,
  rawLine: `###### ${markerText}`,
  matchMode: 'exact_path_line_rawline',
  action: 'demote_heading_to_continuation',
  preserveText: true,
  reason: 'Reviewed Markdown heading artifact; preserve its word as continuation of the current verse.',
  reviewedAt: LEGACY_REVIEWED_AT,
}));

const inlineVerseBoundaryCorrections = [
  {
    kind: 'inline_verse_boundary',
    sourcePath: '01창세기/창1.md',
    sourceLine: 94,
    book: '창세기',
    chapter: 1,
    verse: 30,
    currentVerseNumber: 30,
    nextVerseNumber: 31,
    beforeText:
      '또 땅의 모든 짐승과 공중의 모든 새와 생명이 있어 땅에 기는 모든 것에게는 내가 모든 푸른 풀을 식물로 주노라 하시니 그대로 되니라',
    afterText:
      '하나님이 그 지으신 모든 것을 보시니 보시기에 심히 좋았더라 저녁이 되며 아침이 되니 이는 여섯째 날이니라',
    rawLine:
      '또 땅의 모든 짐승과 공중의 모든 새와 생명이 있어 땅에 기는 모든 것에게는 내가 모든 푸른 풀을 식물로 주노라 하시니 그대로 되니라31 하나님이 그 지으신 모든 것을 보시니 보시기에 심히 좋았더라 저녁이 되며 아침이 되니 이는 여섯째 날이니라',
    matchMode: 'exact_path_line_rawline',
    action: 'split_inline_verse_boundary',
    preserveText: true,
    reason:
      'Pinned upstream snapshot joins verse 31 to verse 30; restore only the reviewed structural boundary.',
    reviewedAt: REVIEWED_AT,
  },
];

const lock = JSON.parse(await fs.readFile(LOCK_PATH, 'utf8'));
const snapshotCommit = SOURCE_METADATA.upstream.commit;
const entries = [];

for (const correction of [
  ...headingCorrections,
  ...markerCorrections,
  ...inlineVerseBoundaryCorrections,
]) {
  const { reviewedAt, ...correctionFields } = correction;
  const sourceFilePath = path.join(MARKDOWN_ROOT, correction.sourcePath);
  const content = await fs.readFile(sourceFilePath, 'utf8');
  const lines = content.replace(/^\uFEFF/u, '').replace(/\r\n/gu, '\n').split('\n');
  const actualLine = lines[correction.sourceLine - 1];

  if (correction.kind === 'chapter_heading_alias') {
    if (actualLine !== correction.actualHeadingNormalized) {
      throw new Error(`Approved heading no longer matches ${correction.sourcePath}:${correction.sourceLine}`);
    }
  } else if (actualLine !== correction.rawLine) {
    throw new Error(`Approved marker no longer matches ${correction.sourcePath}:${correction.sourceLine}`);
  }

  entries.push({
    ...correctionFields,
    nextLine:
      correction.kind === 'continuation_marker' ? lines[correction.sourceLine] : undefined,
    snapshotCommit,
    sourceHash: lock.files[correction.sourcePath],
    reviewedAt,
  });
}

const registry = validateCorrectionsRegistry({
  schemaVersion: 1,
  snapshotCommit,
  reviewedAt: REVIEWED_AT,
  policy: 'Snapshot-pinned structural corrections only. Scripture wording is never replaced or inferred.',
  entries,
});

await fs.writeFile(
  path.join(SOURCE_ROOT, 'corrections.json'),
  `${JSON.stringify(registry, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${entries.length} reviewed Bible source corrections.`);
