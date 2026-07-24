import path from 'node:path';

import {
  MARKDOWN_ROOT,
} from './bible-source-lock-lib.mjs';
import {
  parseChapterFile,
  validateBibleSourceContent,
} from './bible-markdown-parser-lib.mjs';

const targetPath = process.argv[2];

if (targetPath) {
  const absolutePath = path.resolve(targetPath);
  const fileName = path.basename(absolutePath);
  const chapterMatch = fileName.match(/(\d+)\.md$/u);
  const directoryName = path.basename(path.dirname(absolutePath));
  const parsed = await parseChapterFile({
    filePath: absolutePath,
    bookName: directoryName.replace(/^\d+/u, ''),
    chapterNumber: chapterMatch ? Number(chapterMatch[1]) : null,
  });

  console.log(JSON.stringify(parsed, null, 2));
  process.exit(parsed.hardErrors.length > 0 ? 1 : 0);
}

const validation = await validateBibleSourceContent({ markdownRoot: MARKDOWN_ROOT });
console.log(
  JSON.stringify(
    {
      counts: validation.counts,
      hardErrors: validation.hardErrors.slice(0, 20),
      reviewIssues: validation.reviewIssues.slice(0, 20),
    },
    null,
    2,
  ),
);
process.exit(validation.hardErrors.length > 0 ? 1 : 0);
