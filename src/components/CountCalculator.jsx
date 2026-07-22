import { useState } from 'react'
import { ArrowLeftRight, NotebookTabs, Save, Trash2 } from 'lucide-react'
import { bibleData } from '../data/bibleData'
import BibleBookSelect from './BibleBookSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function CountCalculator() {
  const [startBook, setStartBook] = useState(bibleData[0].name)
  const [startChapter, setStartChapter] = useState(1)
  const [endBook, setEndBook] = useState('요한계시록')
  const [endChapter, setEndChapter] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('count_history') || '[]'))

  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    localStorage.setItem('count_history', JSON.stringify(newHistory))
  }

  const calculate = () => {
    const startIndex = bibleData.findIndex((book) => book.name === startBook)
    const endIndex = bibleData.findIndex((book) => book.name === endBook)
    const parsedStartChapter = Number.parseInt(startChapter, 10)
    const parsedEndChapter = Number.parseInt(endChapter, 10)

    if (startIndex === -1 || endIndex === -1) {
      setError('시작과 끝 성경을 다시 선택해 주세요.')
      setResult(null)
      return
    }

    if (
      !Number.isInteger(parsedStartChapter) ||
      parsedStartChapter < 1 ||
      parsedStartChapter > bibleData[startIndex].chapters
    ) {
      setError(`${startBook}은 1장부터 ${bibleData[startIndex].chapters}장까지만 있습니다.`)
      setResult(null)
      return
    }

    if (!Number.isInteger(parsedEndChapter) || parsedEndChapter < 1 || parsedEndChapter > bibleData[endIndex].chapters) {
      setError(`${endBook}은 1장부터 ${bibleData[endIndex].chapters}장까지만 있습니다.`)
      setResult(null)
      return
    }

    let totalChapters = 0
    let currentIndex = startIndex
    let loopCount = 0

    while (loopCount < 200) {
      loopCount += 1

      if (currentIndex === endIndex) {
        if (startIndex === endIndex && parsedStartChapter <= parsedEndChapter) {
          totalChapters = parsedEndChapter - parsedStartChapter + 1
        } else {
          totalChapters += parsedEndChapter
        }
        break
      }

      if (currentIndex === startIndex) {
        totalChapters += bibleData[currentIndex].chapters - parsedStartChapter + 1
      } else {
        totalChapters += bibleData[currentIndex].chapters
      }

      currentIndex = (currentIndex + 1) % bibleData.length
    }

    setResult(totalChapters)
    setError(null)
  }

  const handleSave = () => {
    if (result === null) return
    const now = new Date()
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `${startBook} ${startChapter}장 ~ ${endBook} ${endChapter}장`,
      result: `${result}장`,
    }
    saveHistory([newItem, ...history])
  }

  const handleDelete = (id) => {
    saveHistory(history.filter((item) => item.id !== id))
  }

  return (
    <div className="calculator-section active grid gap-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3 text-[var(--accent-primary)]">
            <div className="rounded-full border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--accent-primary)_8%,var(--bg-elevated))] p-3">
              <NotebookTabs className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl">총 몇 장인가</CardTitle>
              <CardDescription className="mt-1 leading-6">
                시작 위치와 끝 위치 사이의 총 읽기 분량을 같은 패턴의 카드 안에서 계산합니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start">
            <Card className="border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_65%,transparent)] shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">시작 위치</CardTitle>
                <CardDescription>책을 바꾸면 장 입력은 1장으로 초기화됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <BibleBookSelect
                  value={startBook}
                  onChange={(bookName) => {
                    setStartBook(bookName)
                    setStartChapter(1)
                  }}
                  idPrefix="count-start"
                  legend="시작 책 선택"
                />
                <div className="grid gap-2">
                  <Label htmlFor="count-start-chapter">시작 장</Label>
                  <Input
                    id="count-start-chapter"
                    type="number"
                    min="1"
                    value={startChapter}
                    onChange={(event) => setStartChapter(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center py-2 text-[var(--fg-muted)] xl:min-h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-panel)_85%,transparent)]">
                <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <Card className="border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_65%,transparent)] shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">끝 위치</CardTitle>
                <CardDescription>끝 지점도 같은 3단계 선택으로 지정합니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <BibleBookSelect
                  value={endBook}
                  onChange={(bookName) => {
                    setEndBook(bookName)
                    setEndChapter(1)
                  }}
                  idPrefix="count-end"
                  legend="끝 책 선택"
                />
                <div className="grid gap-2">
                  <Label htmlFor="count-end-chapter">끝 장</Label>
                  <Input
                    id="count-end-chapter"
                    type="number"
                    min="1"
                    value={endChapter}
                    onChange={(event) => setEndChapter(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={calculate}>계산하기</Button>
            <Button variant="secondary" size="lg" onClick={handleSave} disabled={result === null}>
              <Save className="h-4 w-4" />
              결과 저장
            </Button>
          </div>

          <div aria-live="polite" className="grid gap-3">
            {result !== null ? (
              <Card className="border-[color:color-mix(in_srgb,var(--accent-success)_28%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-success)_9%,var(--bg-panel))]">
                <CardContent className="grid gap-3 pt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">계산 결과</p>
                  <p className="font-[(family-name:var(--font-display))] text-3xl font-semibold text-[var(--fg-primary)]">{result}장</p>
                  <p className="text-sm text-[var(--fg-secondary)]">선택한 시작과 끝 사이의 총 장 수입니다.</p>
                </CardContent>
              </Card>
            ) : null}

            {error ? (
              <Alert className="border-[color:color-mix(in_srgb,var(--accent-danger)_30%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-danger)_10%,var(--bg-panel))]">
                <AlertTitle>입력을 확인해 주세요.</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">저장된 기록</CardTitle>
          <CardDescription>기존 `{`{ id, date, input, result }`}` 구조를 그대로 유지합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length ? (
            <ul className="grid gap-3">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fg-muted)]">{item.date}</p>
                    <p className="mt-2 text-sm text-[var(--fg-secondary)]">{item.input}</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">{item.result}</p>
                  </div>
                  <Button variant="ghost" onClick={() => handleDelete(item.id)} aria-label={`${item.result} 기록 삭제`}>
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-sm text-[var(--fg-secondary)]">
              아직 저장된 기록이 없습니다. 시작과 끝 위치를 계산한 뒤 저장해 보세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CountCalculator
