import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_READER_PREFERENCES,
  READER_PREFERENCES_STORAGE_KEY,
  loadReaderPreferences,
  sanitizeReaderPreferences,
  saveReaderPreferences,
} from './readerPreferences.js'

function createStorage(initialValue) {
  const state = new Map(initialValue ? [[READER_PREFERENCES_STORAGE_KEY, initialValue]] : [])

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null
    },
    setItem(key, value) {
      state.set(key, value)
    },
  }
}

test('sanitizeReaderPreferences keeps valid values', () => {
  assert.deepEqual(
    sanitizeReaderPreferences({
      lineHeight: 'relaxed',
      contentWidth: 'wide',
      theme: 'ignored',
    }),
    {
      lineHeight: 'relaxed',
      contentWidth: 'wide',
    }
  )
})

test('sanitizeReaderPreferences falls back per field for partial or invalid values', () => {
  assert.deepEqual(
    sanitizeReaderPreferences({
      lineHeight: 'compact',
    }),
    {
      lineHeight: 'compact',
      contentWidth: DEFAULT_READER_PREFERENCES.contentWidth,
    }
  )

  assert.deepEqual(
    sanitizeReaderPreferences({
      lineHeight: 'dense',
      contentWidth: 'wide',
    }),
    {
      lineHeight: DEFAULT_READER_PREFERENCES.lineHeight,
      contentWidth: 'wide',
    }
  )

  assert.deepEqual(sanitizeReaderPreferences(null), DEFAULT_READER_PREFERENCES)
})

test('loadReaderPreferences guards against malformed and wrong-shaped storage', () => {
  const malformedStorage = createStorage('{broken')
  const partialStorage = createStorage(JSON.stringify({ contentWidth: 'narrow' }))
  const invalidStorage = createStorage(JSON.stringify({ lineHeight: 42, contentWidth: 'huge' }))
  const failingStorage = {
    getItem() {
      throw new Error('denied')
    },
  }

  assert.deepEqual(loadReaderPreferences(malformedStorage), DEFAULT_READER_PREFERENCES)
  assert.deepEqual(loadReaderPreferences(partialStorage), {
    lineHeight: DEFAULT_READER_PREFERENCES.lineHeight,
    contentWidth: 'narrow',
  })
  assert.deepEqual(loadReaderPreferences(invalidStorage), DEFAULT_READER_PREFERENCES)
  assert.deepEqual(loadReaderPreferences(failingStorage), DEFAULT_READER_PREFERENCES)
})

test('saveReaderPreferences writes sanitized values and handles storage failures safely', () => {
  const storage = createStorage()

  assert.equal(
    saveReaderPreferences(storage, {
      lineHeight: 'compact',
      contentWidth: 'invalid',
    }),
    true
  )
  assert.equal(
    storage.getItem(READER_PREFERENCES_STORAGE_KEY),
    JSON.stringify({
      lineHeight: 'compact',
      contentWidth: DEFAULT_READER_PREFERENCES.contentWidth,
    })
  )

  const failingStorage = {
    setItem() {
      throw new Error('quota')
    },
  }

  assert.equal(saveReaderPreferences(failingStorage, DEFAULT_READER_PREFERENCES), false)
})
