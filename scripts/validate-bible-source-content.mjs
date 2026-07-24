import { MARKDOWN_ROOT } from './bible-source-lock-lib.mjs';
import { validateBibleSourceContent } from './bible-markdown-parser-lib.mjs';

function formatIssue(issue) {
  const location = `${issue.sourcePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}`;
  return `${issue.code}: ${location} ${issue.message}${issue.excerpt ? ` [${issue.excerpt}]` : ''}`;
}

const result = await validateBibleSourceContent({ markdownRoot: MARKDOWN_ROOT });

if (result.hardErrors.length > 0) {
  console.error(
    `Bible source content validation failed. books=${result.counts.books} chapters=${result.counts.chapters} verses=${result.counts.verses} hardErrors=${result.counts.hardErrors} warnings=${result.reviewIssues.length}`,
  );
  for (const issue of result.hardErrors.slice(0, 50)) {
    console.error(formatIssue(issue));
  }
  if (result.hardErrors.length > 50) {
    console.error(`... ${result.hardErrors.length - 50} more hard errors`);
  }
  process.exit(1);
}

console.log(
  [
    'Bible source content validation passed.',
    `books=${result.counts.books}`,
    `chapters=${result.counts.chapters}`,
    `verses=${result.counts.verses}`,
    `warnings=${result.reviewIssues.length}`,
  ].join(' '),
);
