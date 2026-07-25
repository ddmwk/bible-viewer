import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { bibleData } from '../src/data/bibleData.js';
import {
  findMatchingCorrection,
  loadCorrectionsRegistry,
} from './bible-source-corrections-lib.mjs';
import { MARKDOWN_ROOT, SOURCE_METADATA } from './bible-source-lock-lib.mjs';

function compareNatural(left, right) {
  return left.localeCompare(right, 'ko-KR-u-kn-true');
}

function buildExpectedBooks() {
  return bibleData.map((book, index) => ({
    order: index + 1,
    directory: `${String(index + 1).padStart(2, '0')}${book.name}`,
    name: book.name,
    chapters: book.chapters,
  }));
}

function isChapterFileName(fileName) {
  return /\d+\.md$/u.test(fileName);
}

function extractChapterNumber(fileName) {
  const match = fileName.match(/(\d+)\.md$/u);
  return match ? Number(match[1]) : null;
}

function isNavigationLine(line) {
  return (
    /^\|\| \[\[[^\]]+\]\] \| \[\[[^\]]+\]\] ▷$/u.test(line) ||
    /^◁ \[\[[^\]]+\]\] \| \[\[[^\]]+\]\] \| \[\[[^\]]+\]\] ▷$/u.test(line) ||
    /^◁ \[\[[^\]]+\]\] \| \[\[[^\]]+\]\] \|\|$/u.test(line) ||
    /^\|\| \[\[[^\]]+\]\] \|\|$/u.test(line)
  );
}

function finalizeVerse(verse) {
  const text = verse.fragments.join(' ').replace(/\s+/gu, ' ').trim();
  return {
    number: verse.number,
    text,
    omission: text === '[없음]',
  };
}

function appendFragment(targetVerse, fragment) {
  const normalized = fragment.trim();
  if (!normalized) {
    return;
  }
  targetVerse.fragments.push(normalized);
}

function buildExcerpt(...parts) {
  return parts
    .filter((part) => typeof part === 'string' && part.trim() !== '')
    .join(' | ')
    .slice(0, 200);
}

function startVerse(verses, number, lineNumber) {
  const verse = { number, fragments: [], lineNumber };
  verses.push(verse);
  return verse;
}

function tokenizeMarkerSegment(segment) {
  if (/^######\s*$/u.test(segment)) {
    return { type: 'bare-marker' };
  }

  const numberedMatch = segment.match(/^######\s+(\d+)(?:\s+(.*))?$/u);
  if (numberedMatch) {
    return {
      type: 'verse-marker',
      number: Number(numberedMatch[1]),
      trailingText: numberedMatch[2] ?? '',
    };
  }

  const unknownMatch = segment.match(/^######\s+(.+)$/u);
  if (unknownMatch) {
    return { type: 'unknown-marker', text: unknownMatch[1].trim() };
  }

  return { type: 'text', text: segment };
}

function splitLineAtMarkers(line) {
  const pieces = [];
  let cursor = 0;

  while (cursor < line.length) {
    const markerIndex = line.indexOf('######', cursor);
    if (markerIndex === -1) {
      pieces.push({ type: 'text', text: line.slice(cursor) });
      break;
    }

    if (markerIndex > cursor) {
      pieces.push({ type: 'text', text: line.slice(cursor, markerIndex) });
    }

    const remainder = line.slice(markerIndex);
    pieces.push(tokenizeMarkerSegment(remainder));
    break;
  }

  if (pieces.length === 0) {
    pieces.push({ type: 'text', text: '' });
  }

  return pieces;
}

export function parseChapterMarkdown({
  content,
  sourcePath = '<memory>',
  correctionSourcePath = sourcePath,
  sourceHash = null,
  correctionsRegistry = null,
  bookName = '',
  chapterNumber = null,
} = {}) {
  const lines = content.replace(/^\uFEFF/u, '').replace(/\r\n/gu, '\n').split('\n');
  const verses = [];
  const hardErrors = [];
  const warnings = [];
  let currentVerse = null;
  let pendingBareMarker = null;
  const expectedTitle =
    bookName && chapterNumber
      ? `# ${bookName} ${chapterNumber}${bookName === '시편' ? '편' : '장'}`
      : null;

  const actualTitle = lines[0]?.trim() ?? '';

  if (expectedTitle && actualTitle !== expectedTitle) {
    const correction = correctionsRegistry
      ? findMatchingCorrection(correctionsRegistry, {
          kind: 'chapter_heading_alias',
          sourcePath: correctionSourcePath,
          sourceLine: 1,
          sourceHash,
          actualHeadingNormalized: actualTitle,
          acceptedHeadingNormalized: expectedTitle,
        })
      : null;

    if (correction) {
      warnings.push({
        code: 'APPROVED_SOURCE_CORRECTION',
        verseNumber: null,
        sourcePath,
        lineNumber: 1,
        excerpt: buildExcerpt(lines[0] ?? ''),
        message: `Applied reviewed chapter heading alias for ${bookName} ${chapterNumber}.`,
      });
    } else {
      hardErrors.push({
        code: 'invalid_chapter_heading',
        sourcePath,
        lineNumber: 1,
        excerpt: buildExcerpt(lines[0] ?? ''),
        message: `Expected chapter heading "${expectedTitle}".`,
      });
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];
    const trimmedLine = line.trim();

    if (lineNumber === 1 && expectedTitle) {
      continue;
    }

    if (pendingBareMarker && /^\d+\s*$/u.test(line)) {
      const expectedVerseNumber = (currentVerse?.number ?? 0) + 1;
      const nextNonEmptyLine = lines.slice(index + 1).find((candidate) => candidate.trim() !== '');

      if (Number(line.trim()) === expectedVerseNumber && nextNonEmptyLine && !/^######/u.test(nextNonEmptyLine)) {
        warnings.push({
          code: 'SPLIT_VERSE_MARKER_RECOVERED',
          verseNumber: expectedVerseNumber,
          sourcePath,
          lineNumber: pendingBareMarker.lineNumber,
          excerpt: buildExcerpt(lines[pendingBareMarker.lineNumber - 1], line, nextNonEmptyLine),
          message: `Recovered split verse marker for verse ${expectedVerseNumber}.`,
        });
        currentVerse = startVerse(verses, Number(line.trim()), pendingBareMarker.lineNumber);
        pendingBareMarker = null;
        continue;
      }

      hardErrors.push({
        code: 'unresolved_heading_marker',
        verseNumber: currentVerse?.number ?? null,
        sourcePath,
        lineNumber: pendingBareMarker.lineNumber,
        excerpt: buildExcerpt(lines[pendingBareMarker.lineNumber - 1], line),
        message: 'Found bare ###### marker without a deterministic recovery path.',
      });
      currentVerse = startVerse(verses, Number(line.trim()), pendingBareMarker.lineNumber);
      pendingBareMarker = null;
      continue;
    }

    if (pendingBareMarker) {
      hardErrors.push({
        code: 'unresolved_heading_marker',
        verseNumber: currentVerse?.number ?? null,
        sourcePath,
        lineNumber: pendingBareMarker.lineNumber,
        excerpt: buildExcerpt(lines[pendingBareMarker.lineNumber - 1], line),
        message: 'Found bare ###### marker without a numeric verse heading on the next line.',
      });
      pendingBareMarker = null;
    }

    if (trimmedLine === '' || trimmedLine === '***' || isNavigationLine(trimmedLine)) {
      continue;
    }

    if (/^#{1,5}(?:\s|$)/u.test(trimmedLine)) {
      hardErrors.push({
        code: 'unknown_structural_token',
        sourcePath,
        lineNumber,
        excerpt: buildExcerpt(line),
        message: 'Encountered an unexpected Markdown heading.',
      });
      continue;
    }

    const inlineVerseBoundaryCorrection = correctionsRegistry
      ? findMatchingCorrection(correctionsRegistry, {
          kind: 'inline_verse_boundary',
          sourcePath: correctionSourcePath,
          sourceLine: lineNumber,
          sourceHash,
          rawLine: line,
          currentVerseNumber: currentVerse?.number ?? null,
        })
      : null;

    if (inlineVerseBoundaryCorrection) {
      appendFragment(currentVerse, inlineVerseBoundaryCorrection.beforeText);
      currentVerse = startVerse(
        verses,
        inlineVerseBoundaryCorrection.nextVerseNumber,
        lineNumber,
      );
      appendFragment(currentVerse, inlineVerseBoundaryCorrection.afterText);
      warnings.push({
        code: 'APPROVED_SOURCE_CORRECTION',
        verseNumber: inlineVerseBoundaryCorrection.nextVerseNumber,
        sourcePath,
        lineNumber,
        excerpt: buildExcerpt(line),
        message: `Applied reviewed inline boundary for verse ${inlineVerseBoundaryCorrection.nextVerseNumber}.`,
      });
      continue;
    }

    const pieces = splitLineAtMarkers(line);

    for (const piece of pieces) {
      if (piece.type === 'text') {
        if (!currentVerse) {
          if (piece.text.trim() !== '') {
            hardErrors.push({
              code: 'text_before_first_verse',
              sourcePath,
              lineNumber,
              excerpt: buildExcerpt(piece.text),
              message: 'Encountered verse text before the first verse heading.',
              text: piece.text.trim(),
            });
          }
          continue;
        }

        appendFragment(currentVerse, piece.text);
        continue;
      }

      if (piece.type === 'bare-marker') {
        pendingBareMarker = { lineNumber };
        continue;
      }

      if (piece.type === 'verse-marker') {
        currentVerse = startVerse(verses, piece.number, lineNumber);
        if (piece.trailingText.trim() !== '') {
          warnings.push({
            code: 'INLINE_VERSE_TEXT_RECOVERED',
            verseNumber: piece.number,
            sourcePath,
            lineNumber,
            excerpt: buildExcerpt(line),
            message: `Recovered inline verse text for verse ${piece.number}.`,
          });
        }
        appendFragment(currentVerse, piece.trailingText);
        continue;
      }

      if (piece.type === 'unknown-marker') {
        const correction = correctionsRegistry
          ? findMatchingCorrection(correctionsRegistry, {
              kind: 'continuation_marker',
              sourcePath: correctionSourcePath,
              sourceLine: lineNumber,
              sourceHash,
              rawLine: line,
              markerText: piece.text,
              nextLine: lines[index + 1] ?? '',
              currentVerseNumber: currentVerse?.number ?? null,
            })
          : null;

        if (correction) {
          warnings.push({
            code: 'APPROVED_SOURCE_CORRECTION',
            verseNumber: currentVerse?.number ?? null,
            sourcePath,
            lineNumber,
            excerpt: buildExcerpt(line, lines[index + 1] ?? ''),
            message: 'Demoted a reviewed non-numeric heading marker to verse continuation text.',
          });
        } else {
          hardErrors.push({
            code: 'MARKER_MISSING_VERSE_NUMBER',
            verseNumber: currentVerse?.number ?? null,
            sourcePath,
            lineNumber,
            excerpt: buildExcerpt(line),
            text: piece.text,
            message: `Found non-numeric ###### marker text: ${piece.text}`,
          });
        }

        if (currentVerse) {
          appendFragment(currentVerse, piece.text);
          continue;
        }

        hardErrors.push({
          code: 'marker_before_first_verse',
          sourcePath,
          lineNumber,
          excerpt: buildExcerpt(line),
          message: 'Found a non-numeric ###### marker before any verse heading.',
          text: piece.text,
        });
      }
    }
  }

  if (pendingBareMarker) {
    hardErrors.push({
      code: 'unresolved_heading_marker',
      sourcePath,
      lineNumber: pendingBareMarker.lineNumber,
      excerpt: buildExcerpt(lines[pendingBareMarker.lineNumber - 1]),
      message: 'Found bare ###### marker at the end of the file.',
    });
  }

  const normalizedVerses = verses.map(finalizeVerse);

  for (let index = 0; index < normalizedVerses.length; index += 1) {
    const verse = normalizedVerses[index];
    const previous = normalizedVerses[index - 1];
    const expectedNumber = index + 1;

    if (verse.number !== expectedNumber) {
      hardErrors.push({
        code: verse.number < expectedNumber ? 'duplicate_or_reversed_verse' : 'missing_verse',
        verseNumber: verse.number,
        sourcePath,
        lineNumber: verses[index].lineNumber,
        excerpt: buildExcerpt(verse.text),
        message: `Expected verse ${expectedNumber}, found verse ${verse.number}.`,
      });
    }

    if (previous && verse.number <= previous.number) {
      hardErrors.push({
        code: 'duplicate_or_reversed_verse',
        verseNumber: verse.number,
        sourcePath,
        lineNumber: verses[index].lineNumber,
        excerpt: buildExcerpt(verse.text),
        message: `Verse ${verse.number} is not greater than previous verse ${previous.number}.`,
      });
    }

    if (verse.text === '') {
      hardErrors.push({
        code: 'empty_verse',
        verseNumber: verse.number,
        sourcePath,
        lineNumber: verses[index].lineNumber,
        excerpt: '',
        message: `Verse ${verse.number} has no text.`,
      });
    }

    if (verse.omission) {
      warnings.push({
        code: 'OMISSION_LITERAL_PRESERVED',
        verseNumber: verse.number,
        sourcePath,
        lineNumber: verses[index].lineNumber,
        excerpt: verse.text,
        message: `Preserved omission literal for verse ${verse.number}.`,
      });
    }
  }

  if (normalizedVerses.length === 0) {
    hardErrors.push({
      code: 'no_verses_found',
      sourcePath,
      lineNumber: 1,
      excerpt: '',
      message: 'No verses were parsed from the chapter file.',
    });
  }

  return {
    sourcePath,
    bookName,
    chapterNumber,
    verses: normalizedVerses,
    hardErrors,
    warnings,
    reviewIssues: warnings,
  };
}

export async function parseChapterFile({
  filePath,
  bookName,
  chapterNumber,
  correctionsRegistry = null,
  correctionSourcePath = path.relative(MARKDOWN_ROOT, filePath).split(path.sep).join('/'),
}) {
  const content = await fs.readFile(filePath, 'utf8');
  return parseChapterMarkdown({
    content,
    sourcePath: filePath,
    correctionSourcePath,
    sourceHash: createHash('sha256').update(content).digest('hex'),
    correctionsRegistry,
    bookName,
    chapterNumber,
  });
}

export async function listCanonicalChapterFiles({
  markdownRoot = MARKDOWN_ROOT,
  expectedBooks = buildExpectedBooks(),
} = {}) {
  const directoryEntries = await fs.readdir(markdownRoot, { withFileTypes: true });
  const actualDirectories = directoryEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(compareNatural);

  const hardErrors = [];

  if (actualDirectories.length !== expectedBooks.length) {
    hardErrors.push({
      code: 'unexpected_book_count',
      sourcePath: markdownRoot,
      message: `Expected ${expectedBooks.length} book directories, found ${actualDirectories.length}.`,
    });
  }

  const chapters = [];

  for (const [index, expectedBook] of expectedBooks.entries()) {
    const actualDirectory = actualDirectories[index];

    if (actualDirectory !== expectedBook.directory) {
      hardErrors.push({
        code: 'book_directory_mismatch',
        sourcePath: markdownRoot,
        message: `Expected book directory ${expectedBook.directory}, found ${actualDirectory ?? '<missing>'}.`,
      });
    }

    if (!actualDirectory) {
      continue;
    }

    const absoluteDirectory = path.join(markdownRoot, actualDirectory);
    const fileEntries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
    const markdownFiles = fileEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort(compareNatural);
    const chapterFiles = markdownFiles.filter(isChapterFileName);
    const chapterNumbers = chapterFiles.map(extractChapterNumber);
    const expectedChapterNumbers = Array.from(
      { length: expectedBook.chapters },
      (_, chapterIndex) => chapterIndex + 1,
    );

    if (chapterFiles.length !== expectedBook.chapters) {
      hardErrors.push({
        code: 'chapter_count_mismatch',
        sourcePath: absoluteDirectory,
        message: `Expected ${expectedBook.chapters} chapter files, found ${chapterFiles.length}.`,
      });
    }

    for (let chapterIndex = 0; chapterIndex < expectedChapterNumbers.length; chapterIndex += 1) {
      const expectedChapterNumber = expectedChapterNumbers[chapterIndex];
      const actualChapterNumber = chapterNumbers[chapterIndex];

      if (actualChapterNumber !== expectedChapterNumber) {
        hardErrors.push({
          code: 'chapter_sequence_mismatch',
          sourcePath: absoluteDirectory,
          message: `Expected chapter ${expectedChapterNumber}, found ${actualChapterNumber ?? '<missing>'}.`,
        });
        continue;
      }

      chapters.push({
        order: expectedBook.order,
        bookName: expectedBook.name,
        chapterNumber: actualChapterNumber,
        filePath: path.join(absoluteDirectory, chapterFiles[chapterIndex]),
      });
    }
  }

  return { chapters, hardErrors };
}

export async function validateBibleSourceContent({
  markdownRoot = MARKDOWN_ROOT,
  expectedBooks = buildExpectedBooks(),
  correctionsRegistry,
  expectedVerseCount,
} = {}) {
  const structure = await listCanonicalChapterFiles({ markdownRoot, expectedBooks });
  const reviewedCorrections = correctionsRegistry ?? (await loadCorrectionsRegistry());
  const parsedChapters = [];
  const hardErrors = [...structure.hardErrors];
  const warnings = [];

  for (const chapter of structure.chapters) {
    const parsed = await parseChapterFile({
      ...chapter,
      correctionsRegistry: reviewedCorrections,
      correctionSourcePath: path.relative(markdownRoot, chapter.filePath).split(path.sep).join('/'),
    });
    parsedChapters.push(parsed);
    hardErrors.push(...parsed.hardErrors);
    warnings.push(...parsed.warnings);
  }

  const verseCount = parsedChapters.reduce((sum, chapter) => sum + chapter.verses.length, 0);
  const requiredVerseCount =
    expectedVerseCount ??
    (path.resolve(markdownRoot) === path.resolve(MARKDOWN_ROOT)
      ? SOURCE_METADATA.expectedContent.totalVerses
      : null);

  if (requiredVerseCount !== null && verseCount !== requiredVerseCount) {
    hardErrors.push({
      code: 'verse_count_mismatch',
      sourcePath: markdownRoot,
      message: `Expected ${requiredVerseCount} verses, found ${verseCount}.`,
    });
  }

  return {
    counts: {
      books: expectedBooks.length,
      chapters: structure.chapters.length,
      verses: verseCount,
      reviewIssues: warnings.length,
      hardErrors: hardErrors.length,
    },
    parsedChapters,
    hardErrors,
    warnings,
    reviewIssues: warnings,
  };
}
