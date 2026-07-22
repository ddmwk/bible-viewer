import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Goal,
  NotebookTabs,
  PlayCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function Dashboard() {
  const navigate = useNavigate()
  const readDashboardData = useCallback(() => {
    try {
      return {
        targetHistory: JSON.parse(localStorage.getItem('target_history') || '[]'),
        countHistory: JSON.parse(localStorage.getItem('count_history') || '[]'),
        dailyHistory: JSON.parse(localStorage.getItem('daily_history') || '[]'),
        bookmarks: JSON.parse(localStorage.getItem('bible_bookmarks') || '[]'),
      }
    } catch (error) {
      console.error('Failed to load dashboard data', error)
      return { targetHistory: [], countHistory: [], dailyHistory: [], bookmarks: [] }
    }
  }, [])

  const [targetHistory, setTargetHistory] = useState(() => readDashboardData().targetHistory)
  const [countHistory, setCountHistory] = useState(() => readDashboardData().countHistory)
  const [dailyHistory, setDailyHistory] = useState(() => readDashboardData().dailyHistory)
  const [bookmarks, setBookmarks] = useState(() => readDashboardData().bookmarks)

  const loadData = useCallback(() => {
    const next = readDashboardData()
    setTargetHistory(next.targetHistory)
    setCountHistory(next.countHistory)
    setDailyHistory(next.dailyHistory)
    setBookmarks(next.bookmarks)
  }, [readDashboardData])

  useEffect(() => {
    window.addEventListener('storage', loadData)
    window.addEventListener('focus', loadData)
    document.addEventListener('visibilitychange', loadData)

    return () => {
      window.removeEventListener('storage', loadData)
      window.removeEventListener('focus', loadData)
      document.removeEventListener('visibilitychange', loadData)
    }
  }, [loadData])

  const latestTarget = targetHistory[0]
  const latestCount = countHistory[0]
  const latestDaily = dailyHistory[0]
  const latestBookmark = bookmarks[0]

  const quickLinks = [
    {
      title: '어디까지 읽을까',
      description: latestTarget ? latestTarget.result : '읽을 분량으로 도착 지점을 계산합니다.',
      icon: Goal,
      path: '/target',
      status: latestTarget ? latestTarget.input : '최근 기록 없음',
    },
    {
      title: '총 몇 장인가',
      description: latestCount ? latestCount.result : '시작과 끝 사이의 총 장 수를 계산합니다.',
      icon: NotebookTabs,
      path: '/count',
      status: latestCount ? latestCount.input : '최근 기록 없음',
    },
    {
      title: '하루 페이스',
      description: latestDaily ? latestDaily.result : '1년 회독 목표에 맞는 하루 분량을 확인합니다.',
      icon: CalendarDays,
      path: '/daily',
      status: latestDaily ? latestDaily.input : '최근 기록 없음',
    },
  ]

  return (
    <div className="dashboard grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden border-[color:var(--border-strong)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--bg-elevated)_92%,transparent),color-mix(in_srgb,var(--accent-primary)_8%,var(--bg-panel)))]">
          <CardHeader className="gap-3 pb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fg-muted)]">
              Today&apos;s reading desk
            </p>
            <CardTitle className="text-2xl md:text-3xl">오늘 이어 읽을 자리와 최근 계산을 한눈에 정리했습니다.</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              북마크와 계산 기록은 localStorage에서 바로 다시 읽어와 홈에 반영합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-panel)_84%,transparent)] p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[var(--fg-secondary)]">빠른 이어 읽기</p>
                  <h3 className="font-[(family-name:var(--font-display))] text-2xl font-semibold">
                    {latestBookmark ? `${latestBookmark.bookName} ${latestBookmark.chapter}장` : '아직 저장된 북마크가 없습니다.'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--fg-secondary)]">
                    {latestBookmark
                      ? `${latestBookmark.date} ${latestBookmark.time || ''}`.trim()
                      : '성경 읽기에서 현재 장을 북마크로 저장하면 이곳에서 바로 이어 읽을 수 있습니다.'}
                  </p>
                </div>
                <div className="rounded-full border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_82%,transparent)] p-3 text-[var(--accent-primary)]">
                  <BookOpen className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate('/viewer', { state: latestBookmark ? { bookmarkId: latestBookmark.id } : undefined })}>
                  <PlayCircle className="h-4 w-4" />
                  {latestBookmark ? '이어 읽기' : '성경 읽기 열기'}
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate('/target')}>
                  <Goal className="h-4 w-4" />
                  빠른 계산 시작
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-panel)_80%,transparent)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg-secondary)]">
                <Clock3 className="h-4 w-4 text-[var(--accent-secondary)]" aria-hidden="true" />
                최근 저장 요약
              </div>
              {[
                ['어디까지', latestTarget?.result, latestTarget?.date],
                ['총 몇 장', latestCount?.result, latestCount?.date],
                ['하루 페이스', latestDaily?.result, latestDaily?.date],
              ].map(([label, value, date]) => (
                <div
                  key={label}
                  className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--fg-secondary)]">{label}</span>
                    <span className="text-xs text-[var(--fg-muted)]">{date || '저장 전'}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--fg-primary)]">{value || '아직 저장된 기록이 없습니다.'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookMarked className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
              최근 북마크
            </CardTitle>
            <CardDescription>가장 최근 저장한 북마크부터 확인하고 읽기 화면으로 이동합니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {bookmarks.length ? (
              bookmarks.slice(0, 4).map((bookmark, index) => (
                <button
                  key={bookmark.id}
                  type="button"
                  onClick={() => navigate('/viewer', { state: { bookmarkId: bookmark.id } })}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_76%,transparent)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)] hover:bg-[color:color-mix(in_srgb,var(--accent-primary)_8%,var(--bg-elevated))]"
                >
                  <div>
                    <p className="text-sm text-[var(--fg-muted)]">최근 {index + 1}</p>
                    <p className="text-base font-semibold">{bookmark.bookName} {bookmark.chapter}장</p>
                    <p className="text-sm text-[var(--fg-secondary)]">{bookmark.date} {bookmark.time || ''}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" aria-hidden="true" />
                </button>
              ))
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] px-4 py-8 text-center text-sm text-[var(--fg-secondary)]">
                저장된 북마크가 없습니다. 성경 읽기에서 현재 장을 저장해 보세요.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => navigate(item.path)}
            className="group text-left"
          >
            <Card className="h-full border-[color:var(--border-subtle)] transition group-hover:-translate-y-0.5 group-hover:border-[color:var(--border-strong)] group-hover:shadow-[var(--shadow-raised)]">
              <CardHeader className="gap-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-full border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--accent-primary)_8%,var(--bg-elevated))] p-3 text-[var(--accent-primary)]">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--fg-muted)] transition group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] px-4 py-3 text-sm text-[var(--fg-secondary)]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fg-muted)]">최근 입력</span>
                  <strong className="mt-2 block text-base font-semibold text-[var(--fg-primary)]">{item.status}</strong>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </section>
    </div>
  )
}

export default Dashboard
