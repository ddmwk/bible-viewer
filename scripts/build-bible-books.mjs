import path from 'node:path';

import { validateBibleSourceContent } from './bible-markdown-parser-lib.mjs';
import { writeBibleBooksBundle } from './build-bible-books-lib.mjs';

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

async function main() {
  const markdownRoot = readFlag('--markdown-root') ?? undefined;
  const outputRootFlag = readFlag('--output-root');
  const outputRoot = outputRootFlag ? path.resolve(outputRootFlag) : undefined;
  const validationResult = await validateBibleSourceContent({ markdownRoot });
  const result = await writeBibleBooksBundle({ validationResult, outputRoot });

  console.log(
    JSON.stringify(
      {
        outputRoot: result.outputRoot,
        schemaVersion: result.schemaVersion,
        generatedFrom: result.generatedFrom,
        totals: result.totals,
      },
      null,
      2,
    ),
  );
}

await main();
