import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  CloudDownload,
  Database,
  HardDrive,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  downloadBibleBook,
  getBibleStorageSummary,
  listOfflineBibleBooks,
  removeOfflineBibleBook,
  requestPersistentBibleStorage,
} from '@/data/bibleOfflineStorage'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const STATUS_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'saved', label: '저장됨' },
  { value: 'not-saved', label: '저장 안 됨' },
  { value: 'update-available', label: '업데이트 필요' },
]

const TESTAMENT_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'old', label: '구약' },
  { value: 'new', label: '신약' },
]

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '확인할 수 없음'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KiB', 'MiB', 'GiB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** unitIndex)
  return `${value.toFixed(unitIndex === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

function testamentOf(bookId) {
  return bookId <= 39 ? 'old' : 'new'
}

function statusLabel(status) {
  if (status === 'saved') return '저장됨'
  if (status === 'update-available') return '업데이트 필요'
  return '저장 안 됨'
}

function statusClasses(status) {
  if (status === 'saved') {
    return 'border-[color:color-mix(in_srgb,var(--accent-success)_35%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-success)_11%,var(--bg-elevated))] text-[var(--accent-success)]'
  }
  if (status === 'update-available') {
    return 'border-[color:color-mix(in_srgb,var(--accent-secondary)_42%,var(--border-subtle))] bg-[color:color-mix(in_srgb,var(--accent-secondary)_12%,var(--bg-elevated))] text-[var(--fg-primary)]'
  }
  return 'border-[color:var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--fg-secondary)]'
}

async function runWithConcurrency(items, concurrency, task) {
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await task(item)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
}

function SummaryPanel({ icon, eyebrow, title, description, action }) {
  return (
    <div className="grid min-h-36 content-between gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">{eyebrow}</p>
          <p className="mt-2 text-xl font-semibold text-[var(--fg-primary)]">{title}</p>
        </div>
        {icon}
      </div>
      <div>
        <p className="text-sm leading-6 text-[var(--fg-secondary)]">{description}</p>
        {action}
      </div>
    </div>
  )
}

function OfflineBibleManager() {
  const [books, setBooks] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [testamentFilter, setTestamentFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [activeIds, setActiveIds] = useState(() => new Set())
  const [queue, setQueue] = useState(null)
  const batchControllerRef = useRef(null)

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    setError('')

    try {
      const [listing, nextSummary] = await Promise.all([
        listOfflineBibleBooks(),
        getBibleStorageSummary(),
      ])
      setBooks(listing.books)
      setSummary({ ...nextSummary, cacheSupported: listing.supported })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '오프라인 저장 상태를 확인하지 못했습니다.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    return () => batchControllerRef.current?.abort()
  }, [refresh])

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    return books.filter((book) => {
      const matchesQuery = !normalizedQuery || book.name.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter
      const matchesTestament = testamentFilter === 'all' || testamentOf(book.bookId) === testamentFilter
      return matchesQuery && matchesStatus && matchesTestament
    })
  }, [books, query, statusFilter, testamentFilter])

  const selectedBooks = useMemo(
    () => books.filter((book) => selectedIds.has(book.bookId)),
    [books, selectedIds],
  )
  const selectedGzipBytes = selectedBooks.reduce((total, book) => total + book.gzipBytes, 0)
  const selectedRawBytes = selectedBooks.reduce((total, book) => total + book.rawBytes, 0)
  const cacheSupported = summary?.cacheSupported !== false
  const isBusy = activeIds.size > 0

  const toggleSelection = (bookId) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  const selectTestament = (testament) => {
    setSelectedIds(new Set(books.filter((book) => testamentOf(book.bookId) === testament).map((book) => book.bookId)))
  }

  const runOne = async (book, mode, signal) => {
    setActiveIds((current) => new Set(current).add(book.bookId))
    try {
      if (mode === 'save') await downloadBibleBook(book.bookId, { signal })
      else await removeOfflineBibleBook(book.bookId)
      return true
    } catch (nextError) {
      if (nextError?.name !== 'AbortError') {
        setError(`${book.name}: ${nextError instanceof Error ? nextError.message : '작업에 실패했습니다.'}`)
      }
      return false
    } finally {
      setActiveIds((current) => {
        const next = new Set(current)
        next.delete(book.bookId)
        return next
      })
    }
  }

  const runSingle = async (book, mode) => {
    setNotice('')
    const succeeded = await runOne(book, mode)
    await refresh({ quiet: true })
    if (succeeded) setNotice(`${book.name} 오프라인 데이터를 ${mode === 'save' ? '저장했습니다.' : '삭제했습니다.'}`)
  }

  const runBatch = async (mode) => {
    const targets = selectedBooks.filter((book) => (
      mode === 'save' ? book.status !== 'saved' : book.status !== 'not-saved'
    ))
    if (!targets.length) {
      setNotice(mode === 'save' ? '선택한 권이 이미 저장되어 있습니다.' : '선택한 권에 삭제할 데이터가 없습니다.')
      return
    }

    const controller = new AbortController()
    batchControllerRef.current = controller
    setError('')
    setNotice('')
    setQueue({ mode, total: targets.length, completed: 0, failed: 0 })

    await runWithConcurrency(targets, 3, async (book) => {
      if (controller.signal.aborted) return
      const succeeded = await runOne(book, mode, mode === 'save' ? controller.signal : undefined)
      setQueue((current) => current && ({
        ...current,
        completed: current.completed + Number(succeeded),
        failed: current.failed + Number(!succeeded),
      }))
    })

    const wasCancelled = controller.signal.aborted
    batchControllerRef.current = null
    await refresh({ quiet: true })
    setQueue(null)
    setSelectedIds(new Set())
    setNotice(wasCancelled ? '작업을 취소했습니다. 완료된 권은 그대로 유지됩니다.' : '선택한 권의 작업을 마쳤습니다.')
  }

  const requestPersistence = async () => {
    setError('')
    try {
      const result = await requestPersistentBibleStorage()
      if (!result.supported) {
        setNotice('이 브라우저는 저장 보호 요청을 지원하지 않습니다.')
      } else if (result.granted) {
        setNotice('브라우저가 이 사이트의 저장 공간을 보호하도록 설정했습니다.')
      } else {
        setNotice('브라우저가 저장 보호를 허용하지 않았습니다. 필요할 때 다시 요청할 수 있습니다.')
      }
      await refresh({ quiet: true })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '저장 보호를 요청하지 못했습니다.')
    }
  }

  const persistence = summary?.persistence
  const estimate = summary?.storageEstimate

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-[color:var(--border-strong)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--bg-elevated)_92%,transparent),color-mix(in_srgb,var(--accent-primary)_8%,var(--bg-panel)))]">
        <CardHeader className="gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fg-muted)]">Offline library</p>
          <CardTitle className="text-2xl md:text-3xl">읽고 싶은 성경만 기기에 보관하세요.</CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            저장 여부는 실제 브라우저 캐시를 기준으로 확인합니다. 예상 다운로드와 저장 후 용량, 실제 사용량은 서로 구분해 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryPanel
            icon={<CloudDownload className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />}
            eyebrow="오프라인 성경"
            title={loading ? '확인 중' : `${summary?.offline.savedBooks ?? 0} / ${books.length}권`}
            description={`실제 캐시 ${formatBytes(summary?.offline.cachedBytes)}`}
          />
          <SummaryPanel
            icon={<Database className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />}
            eyebrow="전체 성경 예상"
            title={formatBytes(summary?.expectedBytes.gzip)}
            description={`다운로드 · 저장 후 약 ${formatBytes(summary?.expectedBytes.raw)}`}
          />
          <SummaryPanel
            icon={<HardDrive className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />}
            eyebrow="이 사이트 전체"
            title={estimate?.supported ? formatBytes(estimate.usage) : '확인할 수 없음'}
            description={estimate?.supported ? `브라우저 할당량 ${formatBytes(estimate.quota)}` : '브라우저가 사이트 사용량 정보를 제공하지 않습니다.'}
          />
          <SummaryPanel
            icon={persistence?.persisted
              ? <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
              : <ShieldQuestion className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />}
            eyebrow="저장 보호"
            title={persistence?.persisted ? '보호됨' : persistence?.supported ? '보호 안 됨' : '지원하지 않음'}
            description={persistence?.persisted ? '브라우저의 자동 정리 대상이 될 가능성을 줄였습니다.' : '공간이 부족하면 브라우저가 저장 데이터를 정리할 수 있습니다.'}
            action={persistence?.supported && !persistence.persisted ? (
              <Button className="mt-3" variant="secondary" size="sm" onClick={requestPersistence}>
                <ShieldCheck className="h-4 w-4" />
                저장 보호 요청
              </Button>
            ) : null}
          />
        </CardContent>
      </Card>

      {(loading || error || notice || !cacheSupported || queue) && (
        <Alert aria-live="polite">
          <AlertTitle>
            {error
              ? '오프라인 작업을 완료하지 못했습니다.'
              : queue
                ? `${queue.mode === 'save' ? '저장' : '삭제'} 작업 진행 중`
                : !cacheSupported
                  ? '오프라인 저장을 지원하지 않는 브라우저입니다.'
                  : loading
                    ? '저장 상태를 확인하고 있습니다.'
                    : '오프라인 보관함 알림'}
          </AlertTitle>
          <AlertDescription>
            {error || notice || (queue
              ? `${queue.total}권 중 ${queue.completed}권 완료${queue.failed ? `, ${queue.failed}권 실패` : ''}`
              : !cacheSupported
                ? '권별 예상 용량은 볼 수 있지만 이 기기에는 저장하거나 삭제할 수 없습니다.'
                : '잠시만 기다려 주세요.')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">권별 저장 관리</CardTitle>
          <CardDescription>권 이름, 저장 상태, 구약·신약으로 목록을 좁혀 필요한 데이터만 선택합니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
            <label className="relative">
              <span className="sr-only">권 이름 검색</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="권 이름 검색"
                className="pl-10"
              />
            </label>
            <Button variant="secondary" onClick={() => refresh()} disabled={loading || isBusy}>
              <RefreshCw className="h-4 w-4" />
              상태 새로고침
            </Button>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2" aria-label="저장 상태 필터">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  aria-pressed={statusFilter === filter.value}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" aria-label="성경 구분 필터">
              {TESTAMENT_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={testamentFilter === filter.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTestamentFilter(filter.value)}
                  aria-pressed={testamentFilter === filter.value}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-y border-[color:var(--border-subtle)] py-4">
            <Button variant="ghost" size="sm" onClick={() => selectTestament('old')}>구약 전체 선택</Button>
            <Button variant="ghost" size="sm" onClick={() => selectTestament('new')}>신약 전체 선택</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set(books.map((book) => book.bookId)))}>전체 선택</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>선택 해제</Button>
            <span className="ml-auto text-sm text-[var(--fg-secondary)]">
              선택 {selectedIds.size}권 · 다운로드 {formatBytes(selectedGzipBytes)} · 저장 약 {formatBytes(selectedRawBytes)}
            </span>
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-strong)] bg-[var(--bg-panel)] p-3 shadow-[var(--shadow-soft)]">
              <p className="text-sm font-semibold">{selectedIds.size}권을 선택했습니다.</p>
              <div className="flex flex-wrap gap-2">
                {queue?.mode === 'save' && (
                  <Button variant="secondary" size="sm" onClick={() => batchControllerRef.current?.abort()}>
                    <XCircle className="h-4 w-4" />
                    저장 취소
                  </Button>
                )}
                <Button size="sm" onClick={() => runBatch('save')} disabled={isBusy || !cacheSupported}>
                  <CloudDownload className="h-4 w-4" />
                  선택 저장
                </Button>
                <Button variant="destructive" size="sm" onClick={() => runBatch('delete')} disabled={isBusy || !cacheSupported}>
                  <Trash2 className="h-4 w-4" />
                  선택 삭제
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {visibleBooks.map((book) => {
              const active = activeIds.has(book.bookId)
              const saved = book.status === 'saved'

              return (
                <article
                  key={book.bookId}
                  className="grid gap-4 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_74%,transparent)] p-4 lg:grid-cols-[minmax(180px,1.2fr)_minmax(130px,0.75fr)_repeat(3,minmax(110px,0.7fr))_auto] lg:items-center"
                >
                  <label className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(book.bookId)}
                      onChange={() => toggleSelection(book.bookId)}
                      className="h-5 w-5 accent-[var(--accent-primary)]"
                    />
                    <span className="min-w-0">
                      <strong className="block truncate text-base">{book.name}</strong>
                      <span className="text-sm text-[var(--fg-muted)]">{testamentOf(book.bookId) === 'old' ? '구약' : '신약'} · {book.chapters}장</span>
                    </span>
                  </label>
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(book.status)}`}>
                      {active ? '작업 중' : statusLabel(book.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">예상 다운로드</p>
                    <p className="mt-1 text-sm font-semibold">{formatBytes(book.gzipBytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">저장 후 예상</p>
                    <p className="mt-1 text-sm font-semibold">{formatBytes(book.rawBytes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--fg-muted)]">실제 캐시</p>
                    <p className="mt-1 text-sm font-semibold">
                      {book.status === 'not-saved' ? '—' : formatBytes(book.cachedBytes)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {!saved && (
                      <Button
                        size="sm"
                        onClick={() => runSingle(book, 'save')}
                        disabled={active || isBusy || !cacheSupported}
                        aria-label={`${book.name} 오프라인 ${book.status === 'update-available' ? '업데이트' : '저장'}`}
                      >
                        <CloudDownload className="h-4 w-4" />
                        {book.status === 'update-available' ? '업데이트' : '저장'}
                      </Button>
                    )}
                    {book.status !== 'not-saved' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => runSingle(book, 'delete')}
                        disabled={active || isBusy || !cacheSupported}
                        aria-label={`${book.name} 오프라인 데이터 삭제`}
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    )}
                    {saved && <CheckCircle2 className="h-5 w-5 self-center text-[var(--accent-success)]" aria-hidden="true" />}
                  </div>
                </article>
              )
            })}
            {!loading && visibleBooks.length === 0 && (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] px-5 py-10 text-center text-sm text-[var(--fg-secondary)]">
                조건에 맞는 권이 없습니다. 검색어나 필터를 조정해 보세요.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OfflineBibleManager
