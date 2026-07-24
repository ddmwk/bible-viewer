# Bible Source Change Report Summary

Historical note: this report is retained as the reviewed migration audit for the removed legacy `src/data/json/**` snapshot. It is no longer regenerated as part of the active toolchain.

## Scope
- Canonical input: pinned Markdown snapshot at commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`
- Comparison target: legacy `src/data/json/**`
- Books: 66
- Chapters: 1,189
- Parsed verse slots: 31,101
- Machine-readable report: `docs/reports/bible-source-change-report.json`

## Deterministic recoveries
- 16 split verse markers (`######` followed by the expected verse number on the next line)
- 1 numeric marker with verse text on the same line
- 11 explicit `[없음]` omission literals preserved with metadata

These cases preserve source text and are recorded as review-required warnings.

## Reviewed source corrections
- 4 invalid Malachi chapter headings: the source uses `말라가` instead of `말라기`
- 29 non-numeric `######` markers in Revelation chapters 1–3

All 33 items were reviewed and recorded in `data/bible-source/corrections.json`. A correction applies only when the pinned commit, source-file SHA-256, relative path, source line, and exact structural token match. The source Markdown remains unchanged, and no scripture wording is inferred or replaced.

## Legacy JSON differences
- 61 verse texts differ from the strict parser result.
- No verse was added or removed by number.
- Differences affect 32 chapters across 15 books.

Most changes separate verse text that the legacy converter merged, restore previously empty verse text, or remove a Markdown heading marker from text while preserving its words.

An independent full review classified all 61 differences:
- 32 verse changes are the two-sided effect of 16 split-marker recoveries.
- 1 verse change restores same-line text in Mark 9:28.
- 28 verse changes remove non-numeric Markdown heading syntax in Revelation while preserving every word.
- Unexpected wording changes: 0.

## Validation result
- Hard errors: 0
- Review warnings: 61
  - deterministic recovery: 17
  - approved source correction: 33
  - explicit `[없음]` omission: 11
- `npm run validate:bible-source-content`: passes

The data-integrity gate is complete. The next phase is generation of 66 book-level delivery files and the runtime repository loader.
