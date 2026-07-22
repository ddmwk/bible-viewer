import assert from 'node:assert/strict';
import test from 'node:test';
import { bibleData, bibleStructure } from './bibleData.js';

test('3단계 성경 분류가 전체 66권과 1,189장을 보존한다', () => {
  const structuredBooks = bibleStructure.flatMap((testament) =>
    testament.categories.flatMap((category) => category.books),
  );

  assert.equal(bibleStructure.length, 2);
  assert.equal(structuredBooks.length, 66);
  assert.equal(bibleData.length, 66);
  assert.equal(bibleData.reduce((total, book) => total + book.chapters, 0), 1189);
  assert.deepEqual(
    bibleData.map((book) => book.name),
    structuredBooks.map((book) => book.name),
  );
  assert.equal(new Set(bibleData.map((book) => book.name)).size, 66);
});

test('각 성경 권은 구약/신약과 세부 분류 정보를 가진다', () => {
  for (const book of bibleData) {
    assert.ok(['구약', '신약'].includes(book.testament));
    assert.ok(book.category);
  }
});
