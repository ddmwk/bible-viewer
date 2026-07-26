export function shouldExitReaderFocus({ key, defaultPrevented = false, overlayOpen = false }) {
  return key === 'Escape' && !defaultPrevented && !overlayOpen
}

export function shouldResetReaderFocus({ pathname, focusMode }) {
  return focusMode && pathname !== '/viewer'
}
