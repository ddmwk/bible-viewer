import { promises as fs } from 'node:fs';

import { LOCK_PATH, SOURCE_ROOT, buildSourceLock } from './bible-source-lock-lib.mjs';

await fs.mkdir(SOURCE_ROOT, { recursive: true });

const sourceLock = await buildSourceLock();
await fs.writeFile(LOCK_PATH, `${JSON.stringify(sourceLock, null, 2)}\n`, 'utf8');

console.log(`Wrote ${LOCK_PATH}`);
