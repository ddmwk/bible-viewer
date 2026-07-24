import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildBibleSourceChangeReport,
  writeBibleSourceChangeReport,
} from './bible-source-change-report-lib.mjs';

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-change-report-'));
  const markdownRoot = path.join(root, 'markdown');
  const legacyJsonRoot = path.join(root, 'json');

  await fs.mkdir(path.join(markdownRoot, '01창세기'), { recursive: true });
  await fs.mkdir(path.join(legacyJsonRoot, '01창세기'), { recursive: true });

  await fs.writeFile(
    path.join(markdownRoot, '01창세기', '창1.md'),
    [
      '# 창세기 1장',
      '',
      '###### 1',
      '태초에',
      '',
      '###### 2',
      '[없음]',
      '',
      '###### 3 셋째 절',
      '',
      '###### 4',
      '넷째 절',
      '',
      '###### 그',
      '이어지는 문장',
      '',
    ].join('\n'),
    'utf8',
  );

  await fs.writeFile(
    path.join(legacyJsonRoot, '01창세기', '창세기_01.json'),
    `${JSON.stringify({ verses: ['태초에 옛본문', '둘째 절', '셋째 절'] }, null, 2)}\n`,
    'utf8',
  );

  return { root, markdownRoot, legacyJsonRoot };
}

test('buildBibleSourceChangeReport compares parsed chapters with legacy json and includes issues', async (context) => {
  const fixture = await createFixture();
  context.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

  const report = await buildBibleSourceChangeReport({
    markdownRoot: fixture.markdownRoot,
    legacyJsonRoot: fixture.legacyJsonRoot,
    expectedBooks: [{ order: 1, directory: '01창세기', name: '창세기', chapters: 1 }],
  });

  assert.equal(report.summary.hardErrors, 1);
  assert.equal(report.summary.warnings, 2);
  assert.equal(report.summary.byType.parser_error, 1);
  assert.equal(report.summary.byType.omission_warning, 1);
  assert.equal(report.summary.byType.recovery_warning, 1);
  assert.equal(report.summary.byType.verse_modified, 2);
  assert.equal(report.summary.byType.verse_added, 1);

  const parserError = report.items.find((item) => item.type === 'parser_error');
  assert.equal(parserError.reason, 'MARKER_MISSING_VERSE_NUMBER');
  assert.equal(parserError.verse, 4);
  assert.equal(parserError.newText, '넷째 절 그 이어지는 문장');

  const omission = report.items.find((item) => item.type === 'omission_warning');
  assert.equal(omission.verse, 2);
  assert.equal(omission.newText, '[없음]');

  const addedVerse = report.items.find((item) => item.type === 'verse_added');
  assert.equal(addedVerse.verse, 4);
  assert.equal(addedVerse.oldText, null);
  assert.equal(addedVerse.newText, '넷째 절 그 이어지는 문장');
});

test('writeBibleSourceChangeReport writes deterministic json output', async (context) => {
  const fixture = await createFixture();
  const outputPath = path.join(fixture.root, 'report.json');
  context.after(() => fs.rm(fixture.root, { recursive: true, force: true }));

  const first = await writeBibleSourceChangeReport({
    markdownRoot: fixture.markdownRoot,
    legacyJsonRoot: fixture.legacyJsonRoot,
    outputPath,
    expectedBooks: [{ order: 1, directory: '01창세기', name: '창세기', chapters: 1 }],
  });
  const firstText = await fs.readFile(outputPath, 'utf8');

  const second = await writeBibleSourceChangeReport({
    markdownRoot: fixture.markdownRoot,
    legacyJsonRoot: fixture.legacyJsonRoot,
    outputPath,
    expectedBooks: [{ order: 1, directory: '01창세기', name: '창세기', chapters: 1 }],
  });
  const secondText = await fs.readFile(outputPath, 'utf8');

  assert.deepEqual(first, second);
  assert.equal(firstText, secondText);
});
