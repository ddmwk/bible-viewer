import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildSourceLock } from './bible-source-lock-lib.mjs';

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-source-lock-'));
  const bookDirectory = path.join(root, '01창세기');

  await fs.mkdir(bookDirectory, { recursive: true });
  await fs.writeFile(path.join(bookDirectory, '창세기.md'), '# 창세기\n', 'utf8');
  await fs.writeFile(path.join(bookDirectory, '창1.md'), '###### 1\n태초에\n', 'utf8');

  return root;
}

test('source lock records stable file hashes and source classification', async (context) => {
  const root = await createFixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));

  const firstLock = await buildSourceLock({ markdownRoot: root });
  const secondLock = await buildSourceLock({ markdownRoot: root });

  assert.deepEqual(firstLock, secondLock);
  assert.deepEqual(firstLock.counts, {
    bookDirectories: 1,
    indexFiles: 1,
    chapterFiles: 1,
    totalMarkdownFiles: 2,
  });
  assert.deepEqual(firstLock.books, [
    {
      directory: '01창세기',
      name: '창세기',
      indexFiles: 1,
      chapterNumbers: [1],
    },
  ]);
  assert.match(firstLock.files['01창세기/창1.md'], /^[a-f0-9]{64}$/u);
});

test('source lock hash changes when Markdown content changes', async (context) => {
  const root = await createFixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));

  const before = await buildSourceLock({ markdownRoot: root });
  await fs.appendFile(path.join(root, '01창세기', '창1.md'), '변경\n', 'utf8');
  const after = await buildSourceLock({ markdownRoot: root });

  assert.notEqual(before.files['01창세기/창1.md'], after.files['01창세기/창1.md']);
});

test('source lock rejects unexpected non-Markdown files', async (context) => {
  const root = await createFixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, '01창세기', 'notes.txt'), 'unexpected', 'utf8');

  await assert.rejects(
    buildSourceLock({ markdownRoot: root }),
    /Unexpected non-Markdown source files/u,
  );
});
