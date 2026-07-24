import { useState } from 'react'
import { BookOpenCheck, Goal, Save, Trash2 } from 'lucide-react'
import { bibleData } from '../data/bibleData'
import BibleBookSelect from './BibleBookSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function TargetCalculator() {
  const [startBook, setStartBook] = useState(bibleData[0].name)
  const [startChapter, setStartChapter] = useState(1)
  const [count, setCount] = useState(10)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('target_history') || '[]'))

  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    localStorage.setItem('target_history', JSON.stringify(newHistory))
  }

  const calculate = () => {
    const parsedStartChapter = Number.parseInt(startChapter, 10)
    const parsedCount = Number.parseInt(count, 10)
    const bookIndex = bibleData.findIndex((book) => book.name === startBook)
    const startBookData = bibleData[bookIndex]

    if (!startBookData) {
      setError('시작 성경을 다시 선택해 주세요.')
      setResult(null)
      return
    }

    if (!Number.isInteger(parsedStartChapter) || parsedStartChapter < 1 || parsedStartChapter > startBookData.chapters) {
      setError(`${startBook}은 1장부터 ${startBookData.chapters}장까지만 있습니다.`)
      setResult(null)
      return
    }

    if (!Number.isInteger(parsedCount) || parsedCount < 1) {
      setError('읽을 장 수는 1 이상이어야 합니다.')
      setResult(null)
      return
    }

    let nextBookIndex = bookIndex
    let currentChapter = parsedStartChapter
    let remainingChapters = parsedCount - 1

    while (remainingChapters > 0) {
      const chaptersInCurrentBook = bibleData[nextBookIndex].chapters
      const availableInCurrentBook = chaptersInCurrentBook - currentChapter

      if (remainingChapters <= availableInCurrentBook) {
        currentChapter += remainingChapters
        remainingChapters = 0
      } else {
        remainingChapters -= availableInCurrentBook + 1
        nextBookIndex = (nextBookIndex + 1) % bibleData.length
        currentChapter = 1
      }
    }

    setResult(`${bibleData[nextBookIndex].name} ${currentChapter}장`)
    setError(null)
  }

  const handleSave = () => {
    if (!result) return
    const now = new Date()
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `${startBook} ${startChapter}장 + ${count}장`,
      result,
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
              <Goal className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl">어디까지 읽을까</CardTitle>
              <CardDescription className="mt-1 leading-6">
                시작 지점과 읽을 장 수를 입력하면 마지막으로 읽게 될 말씀을 계산합니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <BibleBookSelect
            value={startBook}
            onChange={(bookName) => {
              setStartBook(bookName)
              setStartChapter(1)
            }}
            idPrefix="target-start"
            legend="시작 위치 선택"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="target-start-chapter">시작 장</Label>
              <Input
                id="target-start-chapter"
                type="number"
                min="1"
                value={startChapter}
                onChange={(event) => setStartChapter(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-count">읽을 장 수</Label>
              <Input
                id="target-count"
                type="number"
                min="1"
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={calculate}>
              <BookOpenCheck className="h-4 w-4" />
              계산하기
            </Button>
            <Button variant="secondary" size="lg" onClick={handleSave} disabled={!result}>
              <Save className="h-4 w-4" />
              결과 저장
            </Button>
          </div>

          <div aria-live="polite" className="grid gap-3">
            {result ? (
              <Card className="border-[color:color-mix(in_srgb,var(--accent-success)_28%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-success)_9%,var(--bg-panel))]">
                <CardContent className="grid gap-3 pt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">계산 결과</p>
                  <p className="font-[(family-name:var(--font-display))] text-3xl font-semibold text-[var(--fg-primary)]">{result}</p>
                  <p className="text-sm text-[var(--fg-secondary)]">오늘 읽으면 이 장까지 도착합니다.</p>
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
          <CardDescription>최근 저장한 결과부터 차례로 다시 확인할 수 있습니다.</CardDescription>
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
              아직 저장된 기록이 없습니다. 계산 후 결과를 저장해 두세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TargetCalculator
