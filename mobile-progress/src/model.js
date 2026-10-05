// Book names and chapter counts match the original project's bibleData.js.
const OLD = [['창세기', 50], ['출애굽기', 40], ['레위기', 27], ['민수기', 36], ['신명기', 34], ['여호수아', 24], ['사사기', 21], ['룻기', 4], ['사무엘상', 31], ['사무엘하', 24], ['열왕기상', 22], ['열왕기하', 25], ['역대기상', 29], ['역대기하', 36], ['에스라', 10], ['느헤미야', 13], ['에스더', 10], ['욥기', 42], ['시편', 150], ['잠언', 31], ['전도서', 12], ['아가', 8], ['이사야', 66], ['예레미야', 52], ['예레미야애가', 5], ['에스겔', 48], ['다니엘', 12], ['호세아', 14], ['요엘', 3], ['아모스', 9], ['오바댜', 1], ['요나', 4], ['미가', 7], ['나훔', 3], ['하박국', 3], ['스바냐', 3], ['학개', 2], ['스가랴', 14], ['말라기', 4]];
// Keep metadata local so this folder can be moved or deployed independently.
const NEW = [['마태복음', 28], ['마가복음', 16], ['누가복음', 24], ['요한복음', 21], ['사도행전', 28], ['로마서', 16], ['고린도전서', 16], ['고린도후서', 13], ['갈라디아서', 6], ['에베소서', 6], ['빌립보서', 4], ['골로새서', 4], ['데살로니가전서', 5], ['데살로니가후서', 3], ['디모데전서', 6], ['디모데후서', 4], ['디도서', 3], ['빌레몬서', 1], ['히브리서', 13], ['야고보서', 5], ['베드로전서', 5], ['베드로후서', 3], ['요한1서', 5], ['요한2서', 1], ['요한3서', 1], ['유다서', 1], ['요한계시록', 22]];
export const BOOKS = [...OLD.map(([name, chapters]) => ({
  name,
  chapters,
  testament: 'old'
})), ...NEW.map(([name, chapters]) => ({
  name,
  chapters,
  testament: 'new'
}))];
export const CHAPTERS = BOOKS.flatMap((book, bookIndex) => Array.from({
  length: book.chapters
}, (_, i) => ({
  id: `${bookIndex}:${i + 1}`,
  bookIndex,
  chapter: i + 1
})));
export const TOTAL_CHAPTERS = CHAPTERS.length;
const VALID_IDS = new Set(CHAPTERS.map(c => c.id));
export const STORAGE_KEY = 'bible-mobile-progress-v1';
export const freshState = () => ({
  version: 1,
  completed: [],
  startChapter: '0:1',
  targetDate: '',
  dailyChapters: 3
});
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function dateNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('날짜 형식을 확인해 주세요.');
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime()) || localDate(date) !== value) throw new Error('올바른 날짜를 선택해 주세요.');
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}
export function validateState(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.completed) || value.completed.length > TOTAL_CHAPTERS || value.completed.some(id => !VALID_IDS.has(id)) || typeof value.targetDate !== 'string' || !Number.isInteger(value.dailyChapters) || value.dailyChapters < 1 || value.dailyChapters > TOTAL_CHAPTERS) throw new Error('지원하는 읽기 기록 파일이 아닙니다.');
  if (value.targetDate) dateNumber(value.targetDate);
  const startChapter = value.startChapter === undefined ? '0:1' : value.startChapter;
  if (!VALID_IDS.has(startChapter)) throw new Error('읽기 시작 장을 확인해 주세요.');
  return {
    version: 1,
    completed: [...new Set(value.completed)],
    startChapter,
    targetDate: value.targetDate,
    dailyChapters: value.dailyChapters
  };
}
export function calculatePlan(completed, targetDate, dailyChapters, now = new Date()) {
  const read = new Set(completed).size;
  const remaining = TOTAL_CHAPTERS - read;
  const daysLeft = targetDate ? dateNumber(targetDate) - dateNumber(localDate(now)) + 1 : null;
  const estimatedDays = Math.ceil(remaining / dailyChapters);
  const end = new Date(now);
  end.setDate(end.getDate() + Math.max(0, estimatedDays - 1));
  return {
    read,
    remaining,
    percent: read / TOTAL_CHAPTERS * 100,
    daysLeft,
    requiredDaily: daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null,
    estimatedDays,
    estimatedDate: localDate(end)
  };
}
export function pendingChapters(completed, count, startChapter = '0:1') {
  if (!VALID_IDS.has(startChapter)) throw new Error('읽기 시작 장을 확인해 주세요.');
  const done = new Set(completed);
  const start = CHAPTERS.findIndex(c => c.id === startChapter);
  return [...CHAPTERS.slice(start), ...CHAPTERS.slice(0, start)].filter(c => !done.has(c.id)).slice(0, count);
}
export function toggleChapter(completed, id) {
  if (!VALID_IDS.has(id)) throw new Error('존재하지 않는 장입니다.');
  return completed.includes(id) ? completed.filter(c => c !== id) : [...completed, id];
}
export function positionIndex(bookIndex, chapter) {
  if (!Number.isInteger(bookIndex) || !BOOKS[bookIndex] || !Number.isInteger(chapter) || chapter < 1 || chapter > BOOKS[bookIndex].chapters) throw new Error('권과 장을 확인해 주세요.');
  return BOOKS.slice(0, bookIndex).reduce((sum, b) => sum + b.chapters, 0) + chapter - 1;
}
export function destination(bookIndex, chapter, count) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) throw new Error('읽을 분량은 1~1,000,000장으로 입력해 주세요.');
  return CHAPTERS[(positionIndex(bookIndex, chapter) + count - 1) % TOTAL_CHAPTERS];
}
export function rangeCount(startBook, startChapter, endBook, endChapter) {
  return (positionIndex(endBook, endChapter) - positionIndex(startBook, startChapter) + TOTAL_CHAPTERS) % TOTAL_CHAPTERS + 1;
}
