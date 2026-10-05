# Interface Flattening Plan

## Status
- State: First pass complete — local user review pending
- Last updated: 2026-08-05
- Scope: App shell, shared surface hierarchy, reader, dashboard, calculators, and offline manager

## Problem
- The app shell, route content, top-level cards, nested cards, fieldsets, and list rows each add their own border, radius, background, and shadow.
- The reader is rendered as app panel → viewer card → paper card, so focus mode still feels like a stack of containers rather than an uninterrupted reading surface.
- Repeated boxes make every piece of information look equally important and weaken typography, whitespace, and content order.

## Design contract
- A route may have at most one visually raised primary surface.
- A raised surface must not contain another raised surface.
- Internal groups use spacing, headings, tint, or a single divider before adding another border.
- Shadows are reserved for temporary overlays and sticky controls, not ordinary page sections.
- Reader focus mode uses the canvas itself as the reading surface; scripture is not wrapped in a card.
- Existing light/dark/green themes, localStorage values, route structure, and functional behavior remain unchanged.

## Regression baseline
- `npm test`: 71 passing before visual edits.
- Preserve 3-level Bible selection and reset-to-chapter-1 behavior.
- Preserve calculator results/history shapes and deletion behavior.
- Preserve bookmark precedence, chapter navigation, verse restore, focus-mode Escape behavior, and offline storage actions.
- No new dependency or routing change.

## Work sequence
1. Flatten the app shell: remove floating panel treatment from main content and top bar; use one persistent navigation rail.
2. Flatten shared cards: remove default shadow and suppress nested card elevation/panel stacking.
3. Flatten the reader: remove outer viewer card and paper-card chrome; keep readable width, typography, toolbar, status, and chapter navigation.
4. Simplify repeated fieldsets and rows so they use dividers and whitespace where possible.
5. Verify tests, lint, build, themes, focus mode, reader restore, calculators, and offline manager.

## Acceptance criteria
- The reader has no visible app panel → viewer card → paper card nesting.
- Focus mode reads as one continuous page with a restrained toolbar.
- Main route content sits directly on the canvas rather than inside a second shell card.
- Nested `Card` components do not create a second border/shadow layer.
- Forms and lists remain clearly grouped without every group becoming a rounded box.
- No horizontal overflow at 360px.
- Automated tests, lint, and build pass.

## First-pass result
- The desktop shell now uses a full-height navigation rail and a border-only context header instead of three floating panels.
- Route content is placed directly on the canvas, shared cards no longer cast default shadows, and nested cards lose their second border/elevation layer.
- The reader no longer renders an outer Card or paper Card; scripture, status, toolbar, and chapter navigation share one continuous canvas.
- Reader toolbar actions use quiet ghost controls, while focus mode keeps only a sticky divider-backed toolbar.
- The 3-level Bible selector uses a fieldset divider instead of another rounded panel.
- 360px basic/focus reader and the dashboard/calculator/offline routes have no horizontal overflow.
- `npm test` (71), `npm run lint`, and `npm run build` pass.
