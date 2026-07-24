import { promises as fs } from 'node:fs';
import path from 'node:path';

import { validateBibleSourceContent } from './bible-markdown-parser-lib.mjs';
import { MARKDOWN_ROOT } from './bible-source-lock-lib.mjs';

export const LEGACY_JSON_ROOT = path.resolve('src/data/json');
export const CHANGE_REPORT_PATH = path.resolve('docs/reports/bible-source-change-report.json');

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function normalizeRelativePath(filePath) {
  return toPosixPath(path.relative(process.cwd(), filePath));
}

function formatChapterNumber(chapterNumber) {
  return String(chapterNumber).padStart(2, '0');
}

function parseBookOrderFromSourcePath(sourcePath) {
  const directoryName = path.basename(path.dirname(sourcePath));
  const match = directoryName.match(/^(\d+)/u);
  return match ? Number(match[1]) : null;
}

function parseBookNameFromSourcePath(sourcePath) {
  const directoryName = path.basename(path.dirname(sourcePath));
  return directoryName.replace(/^\d+/u, '');
}

function buildLegacyChapterPath({ bookOrder, bookName, chapterNumber, legacyJsonRoot = LEGACY_JSON_ROOT }) {
  const directoryName = `${String(bookOrder).padStart(2, '0')}${bookName}`;
  return path.join(legacyJsonRoot, directoryName, `${bookName}_${formatChapterNumber(chapterNumber)}.json`);
}

async function readLegacyChapter({ bookOrder, bookName, chapterNumber, legacyJsonRoot = LEGACY_JSON_ROOT }) {
  const filePath = buildLegacyChapterPath({ bookOrder, bookName, chapterNumber, legacyJsonRoot });
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    sourcePath: normalizeRelativePath(filePath),
    verses: Array.isArray(parsed.verses) ? parsed.verses : [],
  };
}

function buildLegacyVerseMap(legacyVerses) {
  return new Map(legacyVerses.map((text, index) => [index + 1, text]));
}

function buildParsedVerseMap(parsedVerses) {
  return new Map(parsedVerses.map((verse) => [verse.number, verse.text]));
}

function compareChapterVerses({
  book,
  order,
  chapter,
  sourcePath,
  parsedVerses,
  legacyVerses,
}) {
  const items = [];
  const parsedMap = buildParsedVerseMap(parsedVerses);
  const legacyMap = buildLegacyVerseMap(legacyVerses);
  const verseNumbers = new Set([...parsedMap.keys(), ...legacyMap.keys()]);
  const sortedVerseNumbers = [...verseNumbers].sort((left, right) => left - right);

  for (const verse of sortedVerseNumbers) {
    const oldText = legacyMap.has(verse) ? legacyMap.get(verse) : null;
    const newText = parsedMap.has(verse) ? parsedMap.get(verse) : null;

    if (oldText === newText) {
      continue;
    }

    let type = 'verse_modified';
    let reason = 'legacy_json_text_mismatch';

    if (oldText === null) {
      type = 'verse_added';
      reason = 'parsed_source_has_additional_verse';
    } else if (newText === null) {
      type = 'verse_removed';
      reason = 'legacy_json_has_verse_missing_from_parsed_source';
    }

    items.push({
      type,
      book,
      order,
      chapter,
      verse,
      oldText,
      newText,
      sourcePath,
      reason,
      reviewRequired: true,
    });
  }

  return items;
}

function buildIssueItem({ issue, type, chapterContext, oldText = null, newText = null }) {
  return {
    type,
    book: chapterContext.book,
    order: chapterContext.order,
    chapter: chapterContext.chapter,
    verse: issue.verseNumber ?? null,
    oldText,
    newText,
    sourcePath: chapterContext.sourcePath,
    sourceLine: issue.lineNumber ?? null,
    excerpt: issue.excerpt ?? null,
    message: issue.message,
    reason: issue.code,
    reviewRequired: true,
  };
}

function buildWarningType(code) {
  return code === 'OMISSION_LITERAL_PRESERVED' ? 'omission_warning' : 'recovery_warning';
}

function summarizeItems(items) {
  const byType = {};
  const changedBooks = new Set();
  const changedChapters = new Set();

  for (const item of items) {
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    changedBooks.add(item.order);
    changedChapters.add(`${item.order}:${item.chapter}`);
  }

  return {
    totalItems: items.length,
    booksChanged: changedBooks.size,
    chaptersChanged: changedChapters.size,
    versesAdded: byType.verse_added ?? 0,
    versesRemoved: byType.verse_removed ?? 0,
    versesModified: byType.verse_modified ?? 0,
    parserErrors: byType.parser_error ?? 0,
    byType,
  };
}

export async function buildBibleSourceChangeReport({
  markdownRoot = MARKDOWN_ROOT,
  legacyJsonRoot = LEGACY_JSON_ROOT,
  expectedBooks,
} = {}) {
  const validation = await validateBibleSourceContent({ markdownRoot, expectedBooks });
  const items = [];

  for (const chapter of validation.parsedChapters) {
    const order = parseBookOrderFromSourcePath(chapter.sourcePath);
    const book = chapter.bookName || parseBookNameFromSourcePath(chapter.sourcePath);
    const chapterNumber = chapter.chapterNumber;
    const sourcePath = normalizeRelativePath(chapter.sourcePath);
    const chapterContext = {
      book,
      order,
      chapter: chapterNumber,
      sourcePath,
    };
    const legacyChapter = await readLegacyChapter({
      bookOrder: order,
      bookName: book,
      chapterNumber,
      legacyJsonRoot,
    });

    items.push(
      ...compareChapterVerses({
        book,
        order,
        chapter: chapterNumber,
        sourcePath,
        parsedVerses: chapter.verses,
        legacyVerses: legacyChapter.verses,
      }),
    );

    for (const issue of chapter.hardErrors) {
      const verseNumber = issue.verseNumber ?? null;
      const oldText =
        verseNumber !== null && verseNumber <= legacyChapter.verses.length
          ? legacyChapter.verses[verseNumber - 1]
          : null;
      const newText =
        verseNumber !== null
          ? chapter.verses.find((verse) => verse.number === verseNumber)?.text ?? null
          : null;

      items.push(
        buildIssueItem({
          issue,
          type: 'parser_error',
          chapterContext,
          oldText,
          newText,
        }),
      );
    }

    for (const issue of chapter.reviewIssues ?? []) {
      const verseNumber = issue.verseNumber ?? null;
      const oldText =
        verseNumber !== null && verseNumber <= legacyChapter.verses.length
          ? legacyChapter.verses[verseNumber - 1]
          : null;
      const newText =
        verseNumber !== null
          ? chapter.verses.find((verse) => verse.number === verseNumber)?.text ?? null
          : null;

      items.push(
        buildIssueItem({
          issue,
          type: buildWarningType(issue.code),
          chapterContext,
          oldText,
          newText,
        }),
      );
    }
  }

  items.sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    if (left.chapter !== right.chapter) {
      return left.chapter - right.chapter;
    }
    if ((left.verse ?? Number.POSITIVE_INFINITY) !== (right.verse ?? Number.POSITIVE_INFINITY)) {
      return (left.verse ?? Number.POSITIVE_INFINITY) - (right.verse ?? Number.POSITIVE_INFINITY);
    }
    if (left.type !== right.type) {
      return left.type.localeCompare(right.type, 'en');
    }
    if (left.reason !== right.reason) {
      return left.reason.localeCompare(right.reason, 'en');
    }
    return left.sourcePath.localeCompare(right.sourcePath, 'en');
  });

  return {
    summary: {
      books: 66,
      chapters: validation.parsedChapters.length,
      verses: validation.counts.verses,
      hardErrors: validation.hardErrors.length,
      warnings: (validation.reviewIssues ?? []).length,
      ...summarizeItems(items),
    },
    items,
  };
}

export async function writeBibleSourceChangeReport({
  outputPath = CHANGE_REPORT_PATH,
  markdownRoot = MARKDOWN_ROOT,
  legacyJsonRoot = LEGACY_JSON_ROOT,
  expectedBooks,
} = {}) {
  const report = await buildBibleSourceChangeReport({ markdownRoot, legacyJsonRoot, expectedBooks });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}
