import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  listCanonicalChapterFiles,
  parseChapterMarkdown,
  validateBibleSourceContent,
} from './bible-markdown-parser-lib.mjs';

test('parseChapterMarkdown parses normal numbered verses', () => {
  const parsed = parseChapterMarkdown({
    content: `# 창세기 1장\n\n|| [[창세기]] | [[창2]] ▷\n***\n\n###### 1\n태초에\n\n###### 2\n땅이 혼돈하고 공허하며\n\n***\n◁ [[창1]] | [[창세기]] ||\n`,
    sourcePath: 'fixture.md',
    bookName: '창세기',
    chapterNumber: 1,
  });

  assert.deepEqual(parsed.verses, [
    { number: 1, text: '태초에', omission: false },
    { number: 2, text: '땅이 혼돈하고 공허하며', omission: false },
  ]);
  assert.equal(parsed.hardErrors.length, 0);
  assert.equal(parsed.warnings.length, 0);
});

test('parseChapterMarkdown validates the expected chapter heading', () => {
  const parsed = parseChapterMarkdown({
    content: `# 창세기 2장\n\n###### 1\n태초에\n`,
    sourcePath: 'fixture.md',
    bookName: '창세기',
    chapterNumber: 1,
  });

  assert.equal(parsed.hardErrors.some((issue) => issue.code === 'invalid_chapter_heading'), true);
});

test('parseChapterMarkdown accepts BOM and Psalm 편 headings', () => {
  const parsed = parseChapterMarkdown({
    content: `\uFEFF# 시편 1편\n\n###### 1\n복 있는 사람은\n`,
    sourcePath: 'fixture.md',
    bookName: '시편',
    chapterNumber: 1,
  });

  assert.equal(parsed.hardErrors.length, 0);
  assert.equal(parsed.verses[0].text, '복 있는 사람은');
});

test('parseChapterMarkdown recovers split heading markers without guessing verse text', () => {
  const parsed = parseChapterMarkdown({
    content: `###### 1\n앞 절\n###### \n2\n둘째 절\n`,
    sourcePath: 'fixture.md',
  });

  assert.deepEqual(parsed.verses, [
    { number: 1, text: '앞 절', omission: false },
    { number: 2, text: '둘째 절', omission: false },
  ]);
  assert.equal(parsed.hardErrors.length, 0);
  assert.deepEqual(parsed.warnings.map((issue) => issue.code), ['SPLIT_VERSE_MARKER_RECOVERED']);
});

test('parseChapterMarkdown tokenizes same-line numeric markers', () => {
  const parsed = parseChapterMarkdown({
    content: `###### 1 첫 절 본문\n이어서\n앞 절 끝 ###### 2 둘째 절\n`,
    sourcePath: 'fixture.md',
  });

  assert.deepEqual(parsed.verses, [
    { number: 1, text: '첫 절 본문 이어서 앞 절 끝', omission: false },
    { number: 2, text: '둘째 절', omission: false },
  ]);
  assert.equal(parsed.hardErrors.length, 0);
  assert.deepEqual(parsed.warnings.map((issue) => issue.code), [
    'INLINE_VERSE_TEXT_RECOVERED',
    'INLINE_VERSE_TEXT_RECOVERED',
  ]);
});

test('parseChapterMarkdown reports non-numeric markers as hard errors', () => {
  const parsed = parseChapterMarkdown({
    content: `###### 1\n앞부분\n###### 그\n뒷부분\n###### 2\n다음 절\n`,
    sourcePath: 'fixture.md',
  });

  assert.deepEqual(parsed.verses, [
    { number: 1, text: '앞부분 그 뒷부분', omission: false },
    { number: 2, text: '다음 절', omission: false },
  ]);
  assert.deepEqual(parsed.hardErrors.map((issue) => issue.code), ['MARKER_MISSING_VERSE_NUMBER']);
  assert.equal(parsed.warnings.length, 0);
});

test('parseChapterMarkdown applies only an exact reviewed continuation correction', () => {
  const entry = {
    kind: 'continuation_marker',
    sourcePath: '66요한계시록/계1.md',
    sourceLine: 3,
    sourceHash: 'a'.repeat(64),
    rawLine: '###### 그',
    markerText: '그',
    nextLine: '뒷부분',
    currentVerseNumber: 1,
  };
  const correctionsRegistry = { entries: [entry] };
  const input = {
    content: `###### 1\n앞부분\n###### 그\n뒷부분\n`,
    sourcePath: 'fixture.md',
    correctionSourcePath: entry.sourcePath,
    sourceHash: entry.sourceHash,
    correctionsRegistry,
  };
  const parsed = parseChapterMarkdown(input);
  const stale = parseChapterMarkdown({ ...input, sourceHash: 'b'.repeat(64) });

  assert.equal(parsed.hardErrors.length, 0);
  assert.deepEqual(parsed.warnings.map((issue) => issue.code), ['APPROVED_SOURCE_CORRECTION']);
  assert.equal(parsed.verses[0].text, '앞부분 그 뒷부분');
  assert.deepEqual(stale.hardErrors.map((issue) => issue.code), ['MARKER_MISSING_VERSE_NUMBER']);
});

test('parseChapterMarkdown applies only an exact reviewed chapter heading alias', () => {
  const entry = {
    kind: 'chapter_heading_alias',
    sourcePath: '39말라기/말1.md',
    sourceLine: 1,
    sourceHash: 'a'.repeat(64),
    actualHeadingNormalized: '# 말라가 1장',
    acceptedHeadingNormalized: '# 말라기 1장',
  };
  const parsed = parseChapterMarkdown({
    content: `\uFEFF# 말라가 1장\n\n###### 1\n말씀\n`,
    sourcePath: 'fixture.md',
    correctionSourcePath: entry.sourcePath,
    sourceHash: entry.sourceHash,
    correctionsRegistry: { entries: [entry] },
    bookName: '말라기',
    chapterNumber: 1,
  });

  assert.equal(parsed.hardErrors.length, 0);
  assert.deepEqual(parsed.warnings.map((issue) => issue.code), ['APPROVED_SOURCE_CORRECTION']);
});

test('parseChapterMarkdown preserves omission literals as metadata and warnings', () => {
  const parsed = parseChapterMarkdown({
    content: `###### 1\n[없음]\n`,
    sourcePath: 'fixture.md',
  });

  assert.deepEqual(parsed.verses, [{ number: 1, text: '[없음]', omission: true }]);
  assert.equal(parsed.hardErrors.length, 0);
  assert.deepEqual(parsed.warnings.map((issue) => issue.code), ['OMISSION_LITERAL_PRESERVED']);
});

test('listCanonicalChapterFiles excludes index files and enforces chapter order', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-structure-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));

  const bookDirectory = path.join(root, '01창세기');
  await fs.mkdir(bookDirectory, { recursive: true });
  await fs.writeFile(path.join(bookDirectory, '창세기.md'), '# index\n', 'utf8');
  await fs.writeFile(path.join(bookDirectory, '창1.md'), '###### 1\n하나\n', 'utf8');
  await fs.writeFile(path.join(bookDirectory, '창2.md'), '###### 1\n둘\n', 'utf8');

  const result = await listCanonicalChapterFiles({
    markdownRoot: root,
    expectedBooks: [{ order: 1, directory: '01창세기', name: '창세기', chapters: 2 }],
  });

  assert.equal(result.hardErrors.length, 0);
  assert.deepEqual(
    result.chapters.map(({ chapterNumber, filePath }) => ({
      chapterNumber,
      fileName: path.basename(filePath),
    })),
    [
      { chapterNumber: 1, fileName: '창1.md' },
      { chapterNumber: 2, fileName: '창2.md' },
    ],
  );
});

test('validateBibleSourceContent reports missing chapters as hard errors', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-validate-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));

  const bookDirectory = path.join(root, '01창세기');
  await fs.mkdir(bookDirectory, { recursive: true });
  await fs.writeFile(path.join(bookDirectory, '창세기.md'), '# index\n', 'utf8');
  await fs.writeFile(path.join(bookDirectory, '창1.md'), '###### 1\n하나\n', 'utf8');

  const result = await validateBibleSourceContent({
    markdownRoot: root,
    expectedBooks: [{ order: 1, directory: '01창세기', name: '창세기', chapters: 2 }],
  });

  assert.equal(result.hardErrors.some((issue) => issue.code === 'chapter_count_mismatch'), true);
});
