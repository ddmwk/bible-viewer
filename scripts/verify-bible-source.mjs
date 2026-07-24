import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  LOCK_PATH,
  MARKDOWN_ROOT,
  SOURCE_METADATA,
  buildSourceLock,
} from './bible-source-lock-lib.mjs';
import { bibleData } from '../src/data/bibleData.js';

function fail(message) {
  console.error(`Bible source verification failed: ${message}`);
  process.exitCode = 1;
}

function sortValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'ko-KR-u-kn-true'));
}

async function validatePerBookLayout() {
  const bookEntries = await fs.readdir(MARKDOWN_ROOT, { withFileTypes: true });
  const bookDirectories = bookEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);

  const layoutErrors = [];

  for (const bookDirectory of sortValues(bookDirectories)) {
    const absoluteBookPath = path.join(MARKDOWN_ROOT, bookDirectory);
    const markdownFiles = (await fs.readdir(absoluteBookPath, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name);

    const indexFiles = markdownFiles.filter((fileName) => !/\d+\.md$/u.test(fileName));
    const chapterFiles = markdownFiles.filter((fileName) => /\d+\.md$/u.test(fileName));

    if (indexFiles.length !== 1) {
      layoutErrors.push(`${bookDirectory}: expected 1 index file, found ${indexFiles.length}`);
    }

    if (chapterFiles.length === 0) {
      layoutErrors.push(`${bookDirectory}: expected chapter files, found none`);
    }
  }

  return layoutErrors;
}

async function readLockFile() {
  const raw = await fs.readFile(LOCK_PATH, 'utf8');
  return JSON.parse(raw);
}

function compareMetadata(lockData) {
  const metadataErrors = [];

  for (const [key, expectedValue] of Object.entries(SOURCE_METADATA)) {
    try {
      assert.deepEqual(lockData[key], expectedValue);
    } catch {
      metadataErrors.push(`metadata mismatch at "${key}"`);
    }
  }

  return metadataErrors;
}

function compareFiles(lockData, actualData) {
  const expectedFiles = lockData.files ?? {};
  const actualFiles = actualData.files;

  const expectedPaths = new Set(Object.keys(expectedFiles));
  const actualPaths = new Set(Object.keys(actualFiles));

  const missing = sortValues([...expectedPaths].filter((filePath) => !actualPaths.has(filePath)));
  const additional = sortValues([...actualPaths].filter((filePath) => !expectedPaths.has(filePath)));
  const hashMismatches = [];
  const invalidHashes = [];

  for (const filePath of sortValues([...expectedPaths].filter((candidate) => actualPaths.has(candidate)))) {
    if (!/^[a-f0-9]{64}$/u.test(expectedFiles[filePath])) {
      invalidHashes.push(filePath);
      continue;
    }
    if (expectedFiles[filePath] !== actualFiles[filePath]) {
      hashMismatches.push(filePath);
    }
  }

  return { missing, additional, invalidHashes, hashMismatches };
}

function compareCounts(lockData, actualData) {
  const errors = [];
  const expectedCounts = SOURCE_METADATA.expectedLayout;

  for (const [key, expectedValue] of Object.entries(expectedCounts)) {
    if (lockData.counts?.[key] !== expectedValue) {
      errors.push(`expected ${expectedValue} ${key} in lock, found ${lockData.counts?.[key]}`);
    }
    if (actualData.counts?.[key] !== expectedValue) {
      errors.push(`expected ${expectedValue} actual ${key}, found ${actualData.counts?.[key]}`);
    }
    if (lockData.counts?.[key] !== actualData.counts?.[key]) {
      errors.push(
        `count mismatch for ${key}: lock=${lockData.counts?.[key]}, actual=${actualData.counts?.[key]}`,
      );
    }
  }

  return errors;
}

function compareBookStructure(actualData) {
  const errors = [];

  actualData.books.forEach((sourceBook, index) => {
    const expectedBook = bibleData[index];
    const expectedDirectory = `${String(index + 1).padStart(2, '0')}${expectedBook?.name ?? ''}`;
    const expectedChapters = Array.from(
      { length: expectedBook?.chapters ?? 0 },
      (_, chapterIndex) => chapterIndex + 1,
    );

    if (sourceBook.directory !== expectedDirectory) {
      errors.push(
        `book ${index + 1}: expected directory ${expectedDirectory}, found ${sourceBook.directory}`,
      );
    }
    if (sourceBook.name !== expectedBook?.name) {
      errors.push(`book ${index + 1}: expected name ${expectedBook?.name}, found ${sourceBook.name}`);
    }
    if (sourceBook.indexFiles !== 1) {
      errors.push(`${sourceBook.directory}: expected 1 index file, found ${sourceBook.indexFiles}`);
    }
    try {
      assert.deepEqual(sourceBook.chapterNumbers, expectedChapters);
    } catch {
      errors.push(
        `${sourceBook.directory}: expected chapters 1-${expectedBook?.chapters}, found ${sourceBook.chapterNumbers.join(',')}`,
      );
    }
  });

  return errors;
}

const lockData = await readLockFile();
const actualData = await buildSourceLock();

const metadataErrors = compareMetadata(lockData);
const layoutErrors = await validatePerBookLayout();
const countErrors = compareCounts(lockData, actualData);
const bookErrors = compareBookStructure(actualData);
const fileDiff = compareFiles(lockData, actualData);

try {
  assert.deepEqual(lockData.books, actualData.books);
} catch {
  fail('book structure in lock does not match the vendored snapshot');
}

if (metadataErrors.length > 0) {
  for (const error of metadataErrors) {
    fail(error);
  }
}

if (layoutErrors.length > 0) {
  for (const error of layoutErrors) {
    fail(error);
  }
}

for (const error of [...countErrors, ...bookErrors]) {
  fail(error);
}

if (fileDiff.missing.length > 0) {
  fail(`missing files: ${fileDiff.missing.slice(0, 10).join(', ')}${fileDiff.missing.length > 10 ? ' ...' : ''}`);
}

if (fileDiff.additional.length > 0) {
  fail(`unexpected files: ${fileDiff.additional.slice(0, 10).join(', ')}${fileDiff.additional.length > 10 ? ' ...' : ''}`);
}

if (fileDiff.invalidHashes.length > 0) {
  fail(`invalid SHA-256 hashes: ${fileDiff.invalidHashes.slice(0, 10).join(', ')}${fileDiff.invalidHashes.length > 10 ? ' ...' : ''}`);
}

if (fileDiff.hashMismatches.length > 0) {
  fail(`hash mismatches: ${fileDiff.hashMismatches.slice(0, 10).join(', ')}${fileDiff.hashMismatches.length > 10 ? ' ...' : ''}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  [
    'Bible source verification passed.',
    `books=${actualData.counts.bookDirectories}`,
    `index=${actualData.counts.indexFiles}`,
    `chapters=${actualData.counts.chapterFiles}`,
    `files=${actualData.counts.totalMarkdownFiles}`,
  ].join(' '),
);
