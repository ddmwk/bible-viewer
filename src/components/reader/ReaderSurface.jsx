import { BookOpen, LoaderCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ReaderSurface({ selectedBook, chapter, content, loading }) {
  return (
    <Card className="border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_72%,transparent)] shadow-none">
      <CardHeader className="border-b border-[color:var(--border-subtle)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              Scripture
            </p>
            <CardTitle className="mt-2 text-3xl">
              {selectedBook.name} {chapter}장
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--fg-secondary)]">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {content.length}절
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center gap-3 text-[var(--fg-secondary)]">
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            본문을 불러오는 중입니다.
          </div>
        ) : content.length ? (
          <div className="mx-auto max-w-4xl space-y-5 font-[(family-name:var(--font-scripture))] text-[1.05em] leading-[1.95] text-[var(--fg-primary)]">
            {content.map((verse, index) => (
              <p
                key={`${selectedBook.name}-${chapter}-${index + 1}`}
                className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-[var(--radius-sm)] px-2 py-1"
              >
                <span className="select-none text-xs font-semibold text-[var(--fg-muted)]">
                  {index + 1}
                </span>
                <span>{verse}</span>
              </p>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-[var(--fg-secondary)]">
            표시할 본문이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReaderSurface
