import { Minus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  READER_CONTENT_WIDTH_OPTIONS,
  READER_LINE_HEIGHT_OPTIONS,
} from '@/utils/readerPreferences'

const THEME_OPTIONS = [
  { value: 'light', label: '기본 모드', emoji: '☀️' },
  { value: 'dark', label: '다크 모드', emoji: '🌙' },
  { value: 'green', label: '편안한 모드', emoji: '🌿' },
]

const LINE_HEIGHT_LABELS = {
  compact: '좁게',
  comfortable: '기본',
  relaxed: '넓게',
}

const CONTENT_WIDTH_LABELS = {
  narrow: '좁게',
  standard: '기본',
  wide: '넓게',
}

function handleRadioKeyDown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return

  event.preventDefault()

  const options = [...event.currentTarget.parentElement.querySelectorAll('[role="radio"]')]
  const currentIndex = options.indexOf(event.currentTarget)
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
  const nextOption = options[(currentIndex + direction + options.length) % options.length]

  nextOption.focus()
  nextOption.click()
}

function ReaderSettingsDialog({
  open,
  onOpenChange,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onResetFontSize,
  readerPreferences,
  onReaderPreferenceChange,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="reader-dialog__content" aria-label="읽기 설정">
        <DialogHeader>
          <DialogTitle>읽기 설정</DialogTitle>
          <DialogDescription>테마와 글자 크기는 앱 전역에, 행간과 본문 폭은 리더 전용 설정에 반영됩니다.</DialogDescription>
        </DialogHeader>

        <div className="reader-settings">
          <section className="reader-settings__section">
            <div className="app-settings__label">
              <span>글자 크기</span>
              <span>{fontSize}px</span>
            </div>
            <div className="app-font-controls">
              <Button variant="secondary" size="icon" onClick={() => onFontSizeChange(-1)} aria-label="글자 크기 줄이기">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" className="min-w-20" onClick={onResetFontSize}>
                <RotateCcw className="h-4 w-4" />
                기본값
              </Button>
              <Button variant="secondary" size="icon" onClick={() => onFontSizeChange(1)} aria-label="글자 크기 키우기">
                <span className="text-lg leading-none">+</span>
              </Button>
            </div>
          </section>

          <section className="reader-settings__section">
            <div className="app-settings__label">
              <span>테마</span>
              <span>{THEME_OPTIONS.find((option) => option.value === theme)?.label}</span>
            </div>
            <div className="app-theme-controls" role="radiogroup" aria-label="테마 전환">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onThemeChange(option.value)}
                  onKeyDown={handleRadioKeyDown}
                  title={option.label}
                  role="radio"
                  aria-label={option.label}
                  aria-checked={theme === option.value}
                  tabIndex={theme === option.value ? 0 : -1}
                >
                  <span aria-hidden="true" className="app-theme-controls__emoji">
                    {option.emoji}
                  </span>
                </Button>
              ))}
            </div>
          </section>

          <section className="reader-settings__section">
            <div className="app-settings__label">
              <span>행간</span>
              <span>{LINE_HEIGHT_LABELS[readerPreferences.lineHeight]}</span>
            </div>
            <div className="reader-settings__options" role="radiogroup" aria-label="행간 설정">
              {READER_LINE_HEIGHT_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant={readerPreferences.lineHeight === option ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onReaderPreferenceChange('lineHeight', option)}
                  onKeyDown={handleRadioKeyDown}
                  role="radio"
                  aria-checked={readerPreferences.lineHeight === option}
                  tabIndex={readerPreferences.lineHeight === option ? 0 : -1}
                >
                  {LINE_HEIGHT_LABELS[option]}
                </Button>
              ))}
            </div>
          </section>

          <section className="reader-settings__section">
            <div className="app-settings__label">
              <span>본문 폭</span>
              <span>{CONTENT_WIDTH_LABELS[readerPreferences.contentWidth]}</span>
            </div>
            <div className="reader-settings__options" role="radiogroup" aria-label="본문 폭 설정">
              {READER_CONTENT_WIDTH_OPTIONS.map((option) => (
                <Button
                  key={option}
                  variant={readerPreferences.contentWidth === option ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onReaderPreferenceChange('contentWidth', option)}
                  onKeyDown={handleRadioKeyDown}
                  role="radio"
                  aria-checked={readerPreferences.contentWidth === option}
                  tabIndex={readerPreferences.contentWidth === option ? 0 : -1}
                >
                  {CONTENT_WIDTH_LABELS[option]}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReaderSettingsDialog
