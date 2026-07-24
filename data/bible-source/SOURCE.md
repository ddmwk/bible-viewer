# Bible Source

- Upstream repository: `https://github.com/JeongWhanLee/KoreanRevisedVersion-obsidian.git`
- Pinned commit: `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`
- Snapshot path: `KoreanRevisedVersion/**`
- Translation: `개역한글판 성경전서 1961`
- Repository license: `Unlicense`
- Copyright note: upstream README states the Korean Revised Version copyright expired in 2012.
- Vendored license text: `data/bible-source/UPSTREAM_LICENSE`

## Local policy

- `data/bible-source/markdown/**` is the vendored canonical Markdown snapshot.
- `data/bible-source/source-lock.json` records source metadata and per-file SHA-256 hashes.
- `data/bible-source/corrections.json` records reviewed structural exceptions without changing the vendored Markdown.
- `docs/reports/bible-source-change-report.{md,json}` is a retained historical audit artifact from the legacy JSON migration, not an active generation target.
- A correction is valid only for the pinned commit and exact source-file hash, path, line, and structural token.
- Corrections may normalize parser structure but may not infer, replace, or remove scripture wording.
- `npm run verify:bible-source` must pass before treating the snapshot as unchanged.
- `npm run validate:bible-source-content` must pass before generating delivery data.

## Refresh workflow

1. Fetch the upstream repository into a temporary directory.
2. Check out the exact commit recorded above and confirm `git rev-parse HEAD`.
3. Replace `data/bible-source/markdown/**` only from that commit's `KoreanRevisedVersion/**`.
4. Run `npm run generate:bible-source-lock`.
5. Review the source diff and lock diff.
6. Run `npm run verify:bible-source`.
7. Re-review every correction against the new snapshot before updating `corrections.json`.

Changing the pinned commit is a reviewed source update, not a routine build step.
