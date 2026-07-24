export const READER_PREFERENCES_STORAGE_KEY = 'bible_reader_preferences'

export const READER_LINE_HEIGHT_OPTIONS = Object.freeze(['compact', 'comfortable', 'relaxed'])
export const READER_CONTENT_WIDTH_OPTIONS = Object.freeze(['narrow', 'standard', 'wide'])

export const DEFAULT_READER_PREFERENCES = Object.freeze({
  lineHeight: 'comfortable',
  contentWidth: 'standard',
})

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseStoredValue(rawValue) {
  if (typeof rawValue !== 'string') return null

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function sanitizeOption(value, allowedValues, fallbackValue) {
  return allowedValues.includes(value) ? value : fallbackValue
}

export function sanitizeReaderPreferences(value) {
  if (!isRecord(value)) {
    return { ...DEFAULT_READER_PREFERENCES }
  }

  return {
    lineHeight: sanitizeOption(
      value.lineHeight,
      READER_LINE_HEIGHT_OPTIONS,
      DEFAULT_READER_PREFERENCES.lineHeight
    ),
    contentWidth: sanitizeOption(
      value.contentWidth,
      READER_CONTENT_WIDTH_OPTIONS,
      DEFAULT_READER_PREFERENCES.contentWidth
    ),
  }
}

export function loadReaderPreferences(storage) {
  if (!storage?.getItem) {
    return { ...DEFAULT_READER_PREFERENCES }
  }

  try {
    const rawValue = storage.getItem(READER_PREFERENCES_STORAGE_KEY)
    return sanitizeReaderPreferences(parseStoredValue(rawValue))
  } catch {
    return { ...DEFAULT_READER_PREFERENCES }
  }
}

export function saveReaderPreferences(storage, preferences) {
  if (!storage?.setItem) return false

  try {
    storage.setItem(
      READER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(sanitizeReaderPreferences(preferences))
    )
    return true
  } catch {
    return false
  }
}
