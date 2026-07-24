import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Calculator, CalendarDays, HardDriveDownload, Home, Menu, Minus, NotebookTabs, RotateCcw } from 'lucide-react'
import CountCalculator from './components/CountCalculator'
import DailyCalculator from './components/DailyCalculator'
import Dashboard from './components/Dashboard'
import TargetCalculator from './components/TargetCalculator'
import BibleViewer from './components/BibleViewer'
import OfflineBibleManager from './components/OfflineBibleManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import './App.css'

const NAV_ITEMS = [
  {
    path: '/',
    title: '홈',
    description: '최근 기록과 빠른 시작',
    icon: Home,
  },
  {
    path: '/target',
    title: '어디까지 읽을까',
    description: '읽을 분량으로 도착 지점 계산',
    icon: Calculator,
  },
  {
    path: '/count',
    title: '총 몇 장인가',
    description: '시작과 끝 사이 분량 계산',
    icon: NotebookTabs,
  },
  {
    path: '/daily',
    title: '하루 페이스',
    description: '연간 목표 회독 페이스 확인',
    icon: CalendarDays,
  },
  {
    path: '/viewer',
    title: '성경 읽기',
    description: '읽던 장으로 바로 복귀',
    icon: BookOpen,
  },
  {
    path: '/offline',
    title: '오프라인 저장',
    description: '권별 저장 상태와 용량 관리',
    icon: HardDriveDownload,
  },
]

const THEME_OPTIONS = [
  { value: 'light', label: '기본 모드', emoji: '☀️' },
  { value: 'dark', label: '다크 모드', emoji: '🌙' },
  { value: 'green', label: '편안한 모드', emoji: '🌿' },
]

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')
  const [fontSize, setFontSize] = useState(() => Number.parseInt(localStorage.getItem('app_font_size') || '16', 10))
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.body.classList.remove('light', 'dark', 'green')
    document.body.classList.add(theme)
    document.body.dataset.theme = theme
    localStorage.setItem('app_theme', theme)
  }, [theme])

  useEffect(() => {
    const nextFontSize = Math.max(12, Math.min(fontSize, 30))
    document.documentElement.style.setProperty('--app-font-size', `${nextFontSize}px`)
    localStorage.setItem('app_font_size', String(nextFontSize))
  }, [fontSize])

  const currentItem = useMemo(
    () => NAV_ITEMS.find((item) => item.path === location.pathname) ?? NAV_ITEMS[0],
    [location.pathname]
  )

  const handleFontSizeChange = (delta) => {
    setFontSize((current) => Math.max(12, Math.min(current + delta, 30)))
  }

  const handleNavigate = (path) => {
    navigate(path)
    setIsMobileNavOpen(false)
  }

  const renderNav = ({ mobile = false } = {}) => (
    <>
      <div className={mobile ? 'app-drawer__brand' : 'app-sidebar__brand'}>
        <div className="app-sidebar__brand-mark" aria-hidden="true">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="app-sidebar__eyebrow">Bible Workspace</p>
          <h1 className="app-sidebar__title">성경 읽기 책상</h1>
          <p className="app-sidebar__subtitle">읽기, 계산, 북마크를 하나의 조용한 작업 공간으로 정리했습니다.</p>
        </div>
      </div>

      <nav className="app-nav" aria-label={mobile ? '모바일 주 메뉴' : '주 메뉴'}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <button
              key={item.path}
              type="button"
              className={`app-nav__item ${isActive ? 'app-nav__item--active' : ''}`}
              onClick={() => handleNavigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="app-nav__icon h-5 w-5" aria-hidden="true" />
              <span>
                <span className="app-nav__label">{item.title}</span>
                <span className="app-nav__caption">{item.description}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <Card className="border-[color:var(--border-subtle)] bg-transparent shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">읽기 환경</CardTitle>
          <CardDescription>지금 쓰는 설정은 그대로 두고 테마와 글자 크기만 편하게 바꿉니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="app-settings">
            <div className="app-settings__label">
              <span>글자 크기</span>
              <span>{fontSize}px</span>
            </div>
            <div className="app-font-controls">
              <Button variant="secondary" size="icon" onClick={() => handleFontSizeChange(-1)} aria-label="글자 크기 줄이기">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" className="min-w-20" onClick={() => setFontSize(16)}>
                <RotateCcw className="h-4 w-4" />
                기본값
              </Button>
              <Button variant="secondary" size="icon" onClick={() => handleFontSizeChange(1)} aria-label="글자 크기 키우기">
                <span className="text-lg leading-none">+</span>
              </Button>
            </div>
            <p className="app-settings__hint">본문과 계산 결과에 동일한 크기가 적용됩니다.</p>
          </div>

          <div className="app-settings">
            <div className="app-settings__label">
              <span>테마</span>
              <span>{THEME_OPTIONS.find((option) => option.value === theme)?.label}</span>
            </div>
            <div className="app-theme-controls" role="group" aria-label="테마 전환">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTheme(option.value)}
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={theme === option.value}
                >
                  <span aria-hidden="true" className="app-theme-controls__emoji">
                    {option.emoji}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="데스크톱 주 메뉴">
        {renderNav()}
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div>
            <p className="app-sidebar__eyebrow">현재 화면</p>
            <h2 className="app-topbar__title">{currentItem.title}</h2>
            <p className="app-topbar__description">{currentItem.description}</p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="app-topbar__menu"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <section className="app-content" aria-live="polite">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/target" element={<TargetCalculator />} />
            <Route path="/count" element={<CountCalculator />} />
            <Route path="/daily" element={<DailyCalculator />} />
            <Route path="/viewer" element={<BibleViewer />} />
            <Route path="/offline" element={<OfflineBibleManager />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </main>

      <Dialog open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <DialogContent side="left" className="app-drawer__content" aria-label="모바일 메뉴">
          <div className="app-drawer__panel">
            <DialogHeader className="app-drawer__header">
              <DialogTitle>성경 읽기 책상</DialogTitle>
              <DialogDescription>모바일에서도 계산기와 읽기 화면을 빠르게 오갈 수 있습니다.</DialogDescription>
            </DialogHeader>
            {renderNav({ mobile: true })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
