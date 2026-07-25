import { BookOpen, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ReaderSurface({ selectedBook, chapter, content, loading, error, onRetry }) {
  const verseCount = content.length
  const metaLabel = loading ? '본문 준비 중' : error ? '불러오기 실패' : `${verseCount}절`

  return (
    <section className="reader-surface" aria-labelledby="reader-surface-title">
      <article className="reader-paper">
        <header className="reader-paper__header">
          <div className="reader-paper__heading">
            <p className="reader-paper__eyebrow">
              Scripture
            </p>
            <h2 id="reader-surface-title" className="reader-paper__title">
              {selectedBook.name} {chapter}장
            </h2>
          </div>
          <div className="reader-paper__meta">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {metaLabel}
          </div>
        </header>

        {loading ? (
          <div className="reader-paper__body reader-paper__body--loading" aria-live="polite" aria-busy="true">
            <div className="reader-skeleton reader-skeleton__lead" aria-hidden="true" />
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`reader-skeleton-${index + 1}`}
                className={`reader-skeleton ${index % 3 === 2 ? 'reader-skeleton--short' : ''}`}
                aria-hidden="true"
              />
            ))}
            <p className="reader-paper__state-copy">본문을 불러오는 중입니다.</p>
          </div>
        ) : error ? (
          <div className="reader-paper__body reader-paper__body--state" role="alert">
            <div className="reader-paper__state-icon">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="reader-paper__state-content">
              <h3 className="reader-paper__state-title">본문을 불러오지 못했습니다.</h3>
              <p className="reader-paper__state-copy">{error}</p>
              <Button type="button" onClick={onRetry} className="w-fit">
                <RefreshCw className="h-4 w-4" />
                다시 시도
              </Button>
            </div>
          </div>
        ) : verseCount ? (
          <div className="reader-paper__body">
            {content.map((verse, index) => (
              <p
                key={`${selectedBook.name}-${chapter}-${index + 1}`}
                id={`verse-${selectedBook.name}-${chapter}-${index + 1}`}
                data-verse-index={index}
                className="reader-verse"
              >
                <sup className="reader-verse__number" aria-label={`${index + 1}절`}>
                  {index + 1}
                </sup>{' '}
                <span>{verse}</span>
              </p>
            ))}
          </div>
        ) : (
          <div className="reader-paper__body reader-paper__body--state" aria-live="polite">
            <div className="reader-paper__state-content">
              <h3 className="reader-paper__state-title">표시할 본문이 없습니다.</h3>
              <p className="reader-paper__state-copy">
                이 장의 데이터가 비어 있습니다. 다른 장으로 이동하거나 다시 불러와 보세요.
              </p>
            </div>
          </div>
        )}
      </article>
    </section>
  )
}

export default ReaderSurface
