import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  assertBuildableBibleSource,
  buildBibleBooksBundle,
  writeBibleBooksBundle,
} from './build-bible-books-lib.mjs';

function fixtureValidationResult() {
  return {
    hardErrors: [],
    parsedChapters: [
      {
        bookName: '창세기',
        chapterNumber: 1,
        verses: [
          { text: '태초에 하나님이 천지를 창조하시니라', omission: false },
          { text: '[없음]', omission: true },
        ],
      },
      {
        bookName: '창세기',
        chapterNumber: 2,
        verses: [{ text: '천지와 만물이 다 이루니라', omission: false }],
      },
      {
        bookName: '출애굽기',
        chapterNumber: 1,
        verses: [{ text: '야곱과 함께 각기 권속을 데리고 애굽에 이른 이스라엘 아들들의 이름은 이러하니', omission: false }],
      },
    ],
  };
}

const fixtureExpectedBooks = [
  { bookId: 1, bookName: '창세기', chapters: 2 },
  { bookId: 2, bookName: '출애굽기', chapters: 1 },
];

test('buildBibleBooksBundle creates deterministic manifest and content-addressed book files', async () => {
  const bundle = await buildBibleBooksBundle({
    validationResult: fixtureValidationResult(),
    expectedBooks: fixtureExpectedBooks,
    generatedFrom: 'fixture-source@abc123',
  });

  assert.equal(bundle.manifest.schemaVersion, 1);
  assert.equal(bundle.manifest.generatedFrom, 'fixture-source@abc123');
  assert.deepEqual(bundle.manifest.totals, {
    books: 2,
    chapters: 3,
    verses: 4,
    rawBytes: bundle.books[0].rawBytes + bundle.books[1].rawBytes,
    gzipBytes: bundle.books[0].gzipBytes + bundle.books[1].gzipBytes,
  });
  assert.deepEqual(
    bundle.manifest.books.map(({ bookId, bookName, chapters, verses }) => ({
      bookId,
      bookName,
      chapters,
      verses,
    })),
    [
      { bookId: 1, bookName: '창세기', chapters: 2, verses: 3 },
      { bookId: 2, bookName: '출애굽기', chapters: 1, verses: 1 },
    ],
  );

  for (const [index, book] of bundle.books.entries()) {
    const parsed = JSON.parse(book.content.toString('utf8'));
    const contentHash = createHash('sha256').update(book.content).digest('hex');
    const gzipBytes = gzipSync(book.content, { level: 9, mtime: 0 }).byteLength;

    assert.equal(contentHash, book.contentHash);
    assert.equal(book.rawBytes, book.content.byteLength);
    assert.equal(book.gzipBytes, gzipBytes);
    assert.equal(
      book.fileName,
      `${String(index + 1).padStart(2, '0')}-${contentHash.slice(0, 12)}.json`,
    );
    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.bookId, index + 1);
  }

  assert.equal(bundle.books[0].content.includes('[없음]'), true);
  assert.equal(
    bundle.manifest.books[0].url,
    `/bible/books/${bundle.books[0].fileName}`,
  );
});

test('buildBibleBooksBundle is deterministic for identical validated input', async () => {
  const first = await buildBibleBooksBundle({
    validationResult: fixtureValidationResult(),
    expectedBooks: fixtureExpectedBooks,
    generatedFrom: 'fixture-source@abc123',
  });
  const second = await buildBibleBooksBundle({
    validationResult: fixtureValidationResult(),
    expectedBooks: fixtureExpectedBooks,
    generatedFrom: 'fixture-source@abc123',
  });

  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(
    first.books.map((book) => ({
      fileName: book.fileName,
      contentHash: book.contentHash,
      rawBytes: book.rawBytes,
      gzipBytes: book.gzipBytes,
      content: book.content.toString('utf8'),
    })),
    second.books.map((book) => ({
      fileName: book.fileName,
      contentHash: book.contentHash,
      rawBytes: book.rawBytes,
      gzipBytes: book.gzipBytes,
      content: book.content.toString('utf8'),
    })),
  );
});

test('assertBuildableBibleSource rejects validation errors and malformed canonical input', async () => {
  assert.throws(
    () => assertBuildableBibleSource({ hardErrors: [{ code: 'bad' }], parsedChapters: [] }),
    /hard error/,
  );

  await assert.rejects(
    () =>
      buildBibleBooksBundle({
        validationResult: {
          hardErrors: [],
          parsedChapters: [{ bookName: '창세기', chapterNumber: 1, verses: [{ text: '' }] }],
        },
        expectedBooks: [{ bookId: 1, bookName: '창세기', chapters: 1 }],
        generatedFrom: 'fixture-source@abc123',
      }),
    /must not be empty/,
  );
});

test('writeBibleBooksBundle writes staged output and preserves existing output on validation failure', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-books-write-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));

  const outputRoot = path.join(root, 'public', 'bible');
  await fs.mkdir(path.join(outputRoot, 'books'), { recursive: true });
  await fs.writeFile(path.join(outputRoot, 'books', '01-old.json'), '{"old":true}\n', 'utf8');
  await fs.writeFile(path.join(outputRoot, 'manifest.json'), '{"old":true}\n', 'utf8');

  await writeBibleBooksBundle({
    validationResult: fixtureValidationResult(),
    expectedBooks: fixtureExpectedBooks,
    generatedFrom: 'fixture-source@abc123',
    outputRoot,
  });

  const writtenManifest = JSON.parse(await fs.readFile(path.join(outputRoot, 'manifest.json'), 'utf8'));
  const writtenBooks = (await fs.readdir(path.join(outputRoot, 'books'))).sort();
  assert.deepEqual(writtenBooks, writtenManifest.books.map((book) => path.basename(book.url)).sort());

  const manifestBeforeFailure = await fs.readFile(path.join(outputRoot, 'manifest.json'), 'utf8');
  const booksBeforeFailure = await fs.readdir(path.join(outputRoot, 'books'));

  await assert.rejects(
    () =>
      writeBibleBooksBundle({
        validationResult: { hardErrors: [{ code: 'bad' }], parsedChapters: [] },
        expectedBooks: fixtureExpectedBooks,
        generatedFrom: 'fixture-source@abc123',
        outputRoot,
      }),
    /hard error/,
  );

  assert.equal(await fs.readFile(path.join(outputRoot, 'manifest.json'), 'utf8'), manifestBeforeFailure);
  assert.deepEqual(await fs.readdir(path.join(outputRoot, 'books')), booksBeforeFailure);
});
