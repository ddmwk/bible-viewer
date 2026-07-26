import assert from 'node:assert/strict'
import test from 'node:test'
import { getReaderPreferenceCssVariables } from './readerPreferenceStyle.js'

test('getReaderPreferenceCssVariables maps reader preferences to css variables', () => {
  assert.deepEqual(
    getReaderPreferenceCssVariables({
      lineHeight: 'compact',
      contentWidth: 'wide',
    }),
    {
      '--reader-line-height': '1.7',
      '--reader-content-width': '780px',
    }
  )
})

test('getReaderPreferenceCssVariables sanitizes invalid values before mapping', () => {
  assert.deepEqual(
    getReaderPreferenceCssVariables({
      lineHeight: 'dense',
      contentWidth: 'tiny',
    }),
    {
      '--reader-line-height': '1.9',
      '--reader-content-width': '700px',
    }
  )
})
