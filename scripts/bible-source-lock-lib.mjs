import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SOURCE_ROOT = path.resolve('data/bible-source');
export const MARKDOWN_ROOT = path.join(SOURCE_ROOT, 'markdown');
export const LOCK_PATH = path.join(SOURCE_ROOT, 'source-lock.json');

export const SOURCE_METADATA = {
  schemaVersion: 1,
  upstream: {
    repositoryUrl: 'https://github.com/JeongWhanLee/KoreanRevisedVersion-obsidian.git',
    commit: '6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a',
    snapshotPath: 'KoreanRevisedVersion/**',
  },
  translation: {
    name: '개역한글판 성경전서 1961',
    repositoryLabel: 'KoreanRevisedVersion',
  },
  license: {
    repositoryLicense: 'Unlicense',
    copyrightStatus: 'README states the Korean Revised Version copyright expired in 2012.',
  },
  expectedLayout: {
    bookDirectories: 66,
    indexFiles: 66,
    chapterFiles: 1189,
    totalMarkdownFiles: 1255,
  },
};

function compareNatural(a, b) {
  return a.localeCompare(b, 'ko-KR-u-kn-true');
}

async function listFilesRecursive(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const names = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((left, right) => compareNatural(left.name, right.name));

  const files = [];

  for (const entry of names) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(absolutePath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function sha256ForFile(filePath) {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

export async function buildSourceLock({ markdownRoot = MARKDOWN_ROOT } = {}) {
  const bookEntries = await fs.readdir(markdownRoot, { withFileTypes: true });
  const bookDirectories = bookEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareNatural);

  const files = {};
  const books = [];
  let indexFiles = 0;
  let chapterFiles = 0;

  for (const bookDirectory of bookDirectories) {
    const absoluteBookPath = path.join(markdownRoot, bookDirectory);
    const allFiles = (await listFilesRecursive(absoluteBookPath)).sort(compareNatural);
    const unexpectedFiles = allFiles.filter((filePath) => !filePath.endsWith('.md'));

    if (unexpectedFiles.length > 0) {
      throw new Error(
        `Unexpected non-Markdown source files: ${unexpectedFiles
          .map((filePath) => path.relative(markdownRoot, filePath))
          .join(', ')}`,
      );
    }

    const markdownFiles = allFiles;
    const bookName = bookDirectory.replace(/^\d+/u, '');
    const chapterNumbers = [];
    let bookIndexFiles = 0;

    for (const filePath of markdownFiles) {
      const relativePath = path.relative(markdownRoot, filePath).split(path.sep).join('/');
      const fileName = path.basename(filePath);
      const chapterMatch = fileName.match(/(\d+)\.md$/u);

      if (chapterMatch) {
        chapterFiles += 1;
        chapterNumbers.push(Number(chapterMatch[1]));
      } else {
        indexFiles += 1;
        bookIndexFiles += 1;
      }

      files[relativePath] = await sha256ForFile(filePath);
    }

    books.push({
      directory: bookDirectory,
      name: bookName,
      indexFiles: bookIndexFiles,
      chapterNumbers: chapterNumbers.sort((left, right) => left - right),
    });
  }

  return {
    ...SOURCE_METADATA,
    generatedFrom: 'data/bible-source/markdown',
    counts: {
      bookDirectories: bookDirectories.length,
      indexFiles,
      chapterFiles,
      totalMarkdownFiles: indexFiles + chapterFiles,
    },
    books,
    files,
  };
}
