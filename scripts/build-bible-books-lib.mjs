import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { bibleData } from '../src/data/bibleData.js';
import { LOCK_PATH } from './bible-source-lock-lib.mjs';

const SCHEMA_VERSION = 1;
const DEFAULT_OUTPUT_ROOT = path.resolve('public/bible');
const DEFAULT_URL_BASE = '/bible';
const FILE_HASH_LENGTH = 12;

function buildExpectedBooks() {
  return bibleData.map((book, index) => ({
    bookId: index + 1,
    bookName: book.name,
    chapters: book.chapters,
  }));
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function gzipDeterministic(content) {
  return gzipSync(content, { level: 9, mtime: 0 });
}

function sortByBookId(left, right) {
  return left.bookId - right.bookId;
}

function assertStringVerse(verse, context) {
  if (typeof verse !== 'string') {
    throw new Error(`${context} must be a string.`);
  }

  if (verse.trim().length === 0) {
    throw new Error(`${context} must not be empty.`);
  }
}

function normalizeValidatedBookChapters({ parsedChapters, expectedBooks }) {
  const grouped = new Map();

  for (const chapter of parsedChapters) {
    if (!chapter || typeof chapter !== 'object') {
      throw new Error('Each parsed chapter must be an object.');
    }

    const { bookName, chapterNumber, verses } = chapter;
    if (typeof bookName !== 'string' || bookName.length === 0) {
      throw new Error('Each parsed chapter must include a bookName.');
    }
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      throw new Error(`Invalid chapter number for ${bookName}.`);
    }
    if (!Array.isArray(verses)) {
      throw new Error(`Chapter ${bookName} ${chapterNumber} must include verses.`);
    }

    const chapterVerses = verses.map((verse, verseIndex) => {
      if (!verse || typeof verse !== 'object') {
        throw new Error(`Verse ${bookName} ${chapterNumber}:${verseIndex + 1} must be an object.`);
      }

      assertStringVerse(verse.text, `Verse ${bookName} ${chapterNumber}:${verseIndex + 1}`);
      return verse.text;
    });

    if (!grouped.has(bookName)) {
      grouped.set(bookName, new Map());
    }

    const chapters = grouped.get(bookName);
    if (chapters.has(chapterNumber)) {
      throw new Error(`Duplicate chapter ${bookName} ${chapterNumber}.`);
    }

    chapters.set(chapterNumber, chapterVerses);
  }

  return expectedBooks.map((book) => {
    const chapters = grouped.get(book.bookName);
    if (!chapters) {
      throw new Error(`Missing book ${book.bookName}.`);
    }

    const normalizedChapters = [];
    let verseTotal = 0;

    for (let chapterNumber = 1; chapterNumber <= book.chapters; chapterNumber += 1) {
      const verses = chapters.get(chapterNumber);
      if (!verses) {
        throw new Error(`Missing chapter ${book.bookName} ${chapterNumber}.`);
      }
      normalizedChapters.push(verses);
      verseTotal += verses.length;
    }

    if (chapters.size !== book.chapters) {
      throw new Error(
        `Unexpected chapter count for ${book.bookName}: expected ${book.chapters}, found ${chapters.size}.`,
      );
    }

    return {
      ...book,
      chapterCount: normalizedChapters.length,
      verseCount: verseTotal,
      chapters: normalizedChapters,
    };
  });
}

async function resolveGeneratedFrom(generatedFrom) {
  if (generatedFrom) {
    return generatedFrom;
  }

  const lock = JSON.parse(await fs.readFile(LOCK_PATH, 'utf8'));
  if (!lock?.upstream?.repositoryUrl || !lock?.upstream?.commit) {
    throw new Error(`Source lock at ${LOCK_PATH} is missing upstream commit metadata.`);
  }

  return `${lock.upstream.repositoryUrl}#${lock.upstream.commit}`;
}

export function assertBuildableBibleSource(validationResult) {
  if (!validationResult || typeof validationResult !== 'object') {
    throw new Error('A validation result object is required.');
  }

  if (!Array.isArray(validationResult.hardErrors) || !Array.isArray(validationResult.parsedChapters)) {
    throw new Error('Validation result must include hardErrors and parsedChapters arrays.');
  }

  if (validationResult.hardErrors.length > 0) {
    throw new Error(
      `Bible source validation failed with ${validationResult.hardErrors.length} hard error(s).`,
    );
  }
}

export async function buildBibleBooksBundle({
  validationResult,
  generatedFrom,
  expectedBooks = buildExpectedBooks(),
  urlBase = DEFAULT_URL_BASE,
} = {}) {
  assertBuildableBibleSource(validationResult);

  const normalizedBooks = normalizeValidatedBookChapters({
    parsedChapters: validationResult.parsedChapters,
    expectedBooks,
  });
  const bundleBooks = [];
  let totalRawBytes = 0;
  let totalGzipBytes = 0;
  let totalVerses = 0;

  for (const book of normalizedBooks.sort(sortByBookId)) {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      bookId: book.bookId,
      bookName: book.bookName,
      chapters: book.chapters,
    };
    const rawContent = jsonBytes(payload);
    const contentHash = sha256(rawContent);
    const fileName = `${String(book.bookId).padStart(2, '0')}-${contentHash.slice(
      0,
      FILE_HASH_LENGTH,
    )}.json`;
    const gzipBytes = gzipDeterministic(rawContent).byteLength;

    totalRawBytes += rawContent.byteLength;
    totalGzipBytes += gzipBytes;
    totalVerses += book.verseCount;

    bundleBooks.push({
      bookId: book.bookId,
      bookName: book.bookName,
      chapterCount: book.chapterCount,
      verseCount: book.verseCount,
      fileName,
      contentHash,
      rawBytes: rawContent.byteLength,
      gzipBytes,
      rawContent,
    });
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedFrom: await resolveGeneratedFrom(generatedFrom),
    totals: {
      books: bundleBooks.length,
      chapters: bundleBooks.reduce((sum, book) => sum + book.chapterCount, 0),
      verses: totalVerses,
      rawBytes: totalRawBytes,
      gzipBytes: totalGzipBytes,
    },
    books: bundleBooks.map((book) => ({
      bookId: book.bookId,
      bookName: book.bookName,
      chapters: book.chapterCount,
      verses: book.verseCount,
      url: `${urlBase}/books/${book.fileName}`,
      contentHash: book.contentHash,
      rawBytes: book.rawBytes,
      gzipBytes: book.gzipBytes,
    })),
  };

  return {
    manifest,
    books: bundleBooks.map((book) => ({
      bookId: book.bookId,
      bookName: book.bookName,
      fileName: book.fileName,
      contentHash: book.contentHash,
      rawBytes: book.rawBytes,
      gzipBytes: book.gzipBytes,
      content: book.rawContent,
    })),
    manifestContent: jsonBytes(manifest),
  };
}

async function replacePath(targetPath, nextPath) {
  const backupPath = `${targetPath}.bak`;

  await fs.rm(backupPath, { recursive: true, force: true });

  let targetExists = false;
  try {
    await fs.lstat(targetPath);
    targetExists = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  if (targetExists) {
    await fs.rename(targetPath, backupPath);
  }

  try {
    await fs.rename(nextPath, targetPath);
    await fs.rm(backupPath, { recursive: true, force: true });
  } catch (error) {
    if (targetExists) {
      await fs.rename(backupPath, targetPath);
    }
    throw error;
  }
}

async function writeStageDirectory({ stageRoot, bundle }) {
  const booksDir = path.join(stageRoot, 'books');
  await fs.mkdir(booksDir, { recursive: true });

  for (const book of bundle.books) {
    await fs.writeFile(path.join(booksDir, book.fileName), book.content);
  }

  await fs.writeFile(path.join(stageRoot, 'manifest.json'), bundle.manifestContent);
}

export async function writeBibleBooksBundle({
  validationResult,
  outputRoot = DEFAULT_OUTPUT_ROOT,
  generatedFrom,
  expectedBooks = buildExpectedBooks(),
  urlBase = DEFAULT_URL_BASE,
} = {}) {
  const bundle = await buildBibleBooksBundle({
    validationResult,
    generatedFrom,
    expectedBooks,
    urlBase,
  });

  const parentDirectory = path.dirname(outputRoot);
  await fs.mkdir(parentDirectory, { recursive: true });
  const stageRoot = await fs.mkdtemp(path.join(parentDirectory, '.bible-books-stage-'));

  try {
    await writeStageDirectory({ stageRoot, bundle });
    await replacePath(outputRoot, stageRoot);
  } finally {
    await fs.rm(stageRoot, { recursive: true, force: true });
  }

  return {
    ...bundle.manifest,
    outputRoot,
  };
}

export async function buildBibleBooksToTempDirectory(options = {}) {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bible-books-'));
  const result = await writeBibleBooksBundle({ ...options, outputRoot });
  return { ...result, outputRoot };
}
