function createTarget(kind, direction, targetBookName, targetChapter, extra = {}) {
  return {
    kind,
    direction,
    targetBookName,
    targetChapter,
    ...extra,
  }
}

export function getChapterNavigationModel({ books, bookName, chapter }) {
  const currentBookIndex = books.findIndex((book) => book.name === bookName)
  const currentBook = books[currentBookIndex]

  if (!currentBook || !Number.isInteger(chapter) || chapter < 1 || chapter > currentBook.chapters) {
    return null
  }

  const previous =
    chapter > 1
      ? createTarget('move', 'prev', currentBook.name, chapter - 1)
      : currentBookIndex > 0
        ? createTarget(
            'confirm',
            'prev',
            books[currentBookIndex - 1].name,
            books[currentBookIndex - 1].chapters,
            {
              confirmMessage: `${currentBook.name} 첫 장입니다. ${books[currentBookIndex - 1].name} ${books[currentBookIndex - 1].chapters}장으로 이동할까요?`,
            }
          )
        : createTarget('blocked', 'prev', null, null, {
            boundaryNotice: '성경의 첫 장입니다. 더 이전 장은 없습니다.',
          })

  const next =
    chapter < currentBook.chapters
      ? createTarget('move', 'next', currentBook.name, chapter + 1)
      : currentBookIndex < books.length - 1
        ? createTarget('confirm', 'next', books[currentBookIndex + 1].name, 1, {
            confirmMessage: `${currentBook.name}을 마쳤습니다. ${books[currentBookIndex + 1].name} 1장으로 이동할까요?`,
          })
        : createTarget('blocked', 'next', null, null, {
            boundaryNotice: '성경의 마지막 장입니다. 더 다음 장은 없습니다.',
          })

  return {
    prev: previous,
    next,
  }
}
