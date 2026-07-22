import { useState } from 'react'
import { CalendarDays, Save, Trash2 } from 'lucide-react'
import { bibleData } from '../data/bibleData'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function DailyCalculator() {
  const [times, setTimes] = useState(1)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('daily_history') || '[]'))

  const totalChapters = bibleData.reduce((sum, book) => sum + book.chapters, 0)

  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    localStorage.setItem('daily_history', JSON.stringify(newHistory))
  }

  const calculate = () => {
    const parsedTimes = Number.parseInt(times, 10)
    if (!Number.isInteger(parsedTimes) || parsedTimes < 1) {
      setResult(null)
      return
    }

    const dailyCount = Math.ceil((totalChapters * parsedTimes) / 365)
    setResult(dailyCount)
  }

  const handleSave = () => {
    if (!result) return
    const now = new Date()
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `1년 ${times}회독`,
      result: `하루 약 ${result}장`,
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
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl">하루 페이스</CardTitle>
              <CardDescription className="mt-1 leading-6">
                1년 회독 목표를 넣으면 하루에 읽어야 할 장 수를 같은 패턴의 결과 카드로 보여줍니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="grid gap-6">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_86%,transparent)] p-5">
              <p className="text-sm leading-6 text-[var(--fg-secondary)]">
                성경 전체 {totalChapters}장을 기준으로, 365일 안에 목표 회독 수를 채우기 위한 하루 분량을 계산합니다.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="daily-times">목표 회독 수</Label>
              <Input
                id="daily-times"
                type="number"
                min="1"
                value={times}
                onChange={(event) => setTimes(event.target.value)}
              />
              <p className="text-sm text-[var(--fg-muted)]">예: 1년 2회독을 목표로 하면 하루 권장 분량을 올림 계산합니다.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={calculate}>계산하기</Button>
              <Button variant="secondary" size="lg" onClick={handleSave} disabled={!result}>
                <Save className="h-4 w-4" />
                결과 저장
              </Button>
            </div>
          </div>

          <div aria-live="polite" className="grid gap-4 self-start">
            <Card className="border-[color:color-mix(in_srgb,var(--accent-success)_28%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-success)_9%,var(--bg-panel))]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">오늘의 권장 분량</CardTitle>
                <CardDescription>결과는 계산 버튼을 누를 때 갱신됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="font-[(family-name:var(--font-display))] text-4xl font-semibold text-[var(--fg-primary)]">
                  {result ? `${result}장` : '—'}
                </p>
                <p className="text-sm leading-6 text-[var(--fg-secondary)]">
                  {result
                    ? `매일 ${result}장씩 읽으면 1년에 ${times}회독 목표를 향해 갈 수 있습니다.`
                    : '목표 회독 수를 입력하고 계산하면 하루 읽기 페이스를 안내합니다.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_75%,transparent)] shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">저장 팁</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[var(--fg-secondary)]">
                  결과를 저장하면 대시보드의 최근 목표와 홈 카드에 바로 반영됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">저장된 목표</CardTitle>
          <CardDescription>최근 목표부터 유지되며 삭제 시 즉시 localStorage에 반영됩니다.</CardDescription>
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
              아직 저장된 목표가 없습니다. 계산 후 저장하면 홈에서 바로 확인할 수 있습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DailyCalculator
