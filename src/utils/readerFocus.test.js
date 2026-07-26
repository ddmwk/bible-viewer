import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldExitReaderFocus, shouldResetReaderFocus } from './readerFocus.js'

test('shouldExitReaderFocus exits only for an unhandled Escape without an overlay', () => {
  assert.equal(shouldExitReaderFocus({ key: 'Escape' }), true)
  assert.equal(shouldExitReaderFocus({ key: 'Enter' }), false)
  assert.equal(shouldExitReaderFocus({ key: 'Escape', defaultPrevented: true }), false)
  assert.equal(shouldExitReaderFocus({ key: 'Escape', overlayOpen: true }), false)
})

test('shouldResetReaderFocus resets an active focus mode outside the viewer route', () => {
  assert.equal(shouldResetReaderFocus({ pathname: '/offline', focusMode: true }), true)
  assert.equal(shouldResetReaderFocus({ pathname: '/viewer', focusMode: true }), false)
  assert.equal(shouldResetReaderFocus({ pathname: '/offline', focusMode: false }), false)
})
