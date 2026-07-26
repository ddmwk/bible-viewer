import { sanitizeReaderPreferences } from './readerPreferences.js'

const LINE_HEIGHT_VALUES = Object.freeze({
  compact: 1.7,
  comfortable: 1.9,
  relaxed: 2.1,
})

const CONTENT_WIDTH_VALUES = Object.freeze({
  narrow: 620,
  standard: 700,
  wide: 780,
})

export function getReaderPreferenceCssVariables(preferences) {
  const sanitized = sanitizeReaderPreferences(preferences)

  return {
    '--reader-line-height': String(LINE_HEIGHT_VALUES[sanitized.lineHeight]),
    '--reader-content-width': `${CONTENT_WIDTH_VALUES[sanitized.contentWidth]}px`,
  }
}
