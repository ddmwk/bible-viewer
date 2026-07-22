import { bibleData, bibleStructure } from '../data/bibleData'
import { Label } from '@/components/ui/label'

function BibleBookSelect({
  value,
  onChange,
  idPrefix,
  className = '',
  legend = '성경 위치 선택',
}) {
  const selectedBook = bibleData.find((book) => book.name === value) || bibleData[0]
  const selectedTestament =
    bibleStructure.find((testament) => testament.name === selectedBook.testament) || bibleStructure[0]
  const selectedCategory =
    selectedTestament.categories.find((category) => category.name === selectedBook.category) ||
    selectedTestament.categories[0]

  const handleTestamentChange = (event) => {
    const testament = bibleStructure.find((item) => item.name === event.target.value)
    if (testament) {
      onChange(testament.categories[0].books[0].name)
    }
  }

  const handleCategoryChange = (event) => {
    const category = selectedTestament.categories.find((item) => item.name === event.target.value)
    if (category) {
      onChange(category.books[0].name)
    }
  }

  return (
    <fieldset
      className={[
        'grid gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] p-4 md:grid-cols-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <legend className="px-2 text-sm font-semibold text-[var(--fg-secondary)]">{legend}</legend>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-testament`}>1. 구약/신약</Label>
        <select
          id={`${idPrefix}-testament`}
          value={selectedTestament.name}
          onChange={handleTestamentChange}
        >
          {bibleStructure.map((testament) => (
            <option key={testament.name} value={testament.name}>
              {testament.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-category`}>2. 분류</Label>
        <select
          id={`${idPrefix}-category`}
          value={selectedCategory.name}
          onChange={handleCategoryChange}
        >
          {selectedTestament.categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-book`}>3. 책</Label>
        <select
          id={`${idPrefix}-book`}
          value={selectedBook.name}
          onChange={(event) => onChange(event.target.value)}
        >
          {selectedCategory.books.map((book) => (
            <option key={book.name} value={book.name}>
              {book.name}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}

export default BibleBookSelect
