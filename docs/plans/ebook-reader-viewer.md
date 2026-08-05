# E-book Bible Viewer Workstream Plan

## Status
- State: In execution — e-book surface, focus/preferences, and verse resume complete; accessibility next
- Last updated: 2026-07-26
- Owner scope: Reader layout, navigation, focus mode, preferences, verse-position resume, accessibility, and responsive behavior
- Data dependency: `docs/plans/data-localization-and-integrity.md`

## Requirements summary
- 성경 읽기 화면을 카드와 폼이 중심인 화면에서 본문이 중심인 전자책형 리더로 전환한다.
- 1차 리더는 장 단위 세로 스크롤을 사용하며 3D 페이지 넘김이나 양면 페이지는 도입하지 않는다.
- 기존 3단계 성경 선택, 장 이동, 권 경계 Dialog, 북마크, 마지막 장 복원 기능을 유지한다.
- 앱 셸을 숨길 수 있는 집중 모드와 글자 크기·행간·본문 폭·테마 설정을 제공한다.
- 동일 장 재진입 시 마지막으로 읽던 절 부근을 복원한다.
- 데이터 파일 배치와 무관하게 `loadBibleChapter()` 인터페이스만 사용한다.
- 사용자가 66권의 오프라인 저장 여부, 예상 다운로드 용량, 실제 저장 용량을 한 화면에서 확인하고 권별 또는 일괄 저장/삭제할 수 있게 한다.
- 앱 전체 저장 사용량과 오프라인 성경 사용량을 구분해 데이터가 어디에 사용되는지 설명한다.

## Evidence and current constraints
- `src/components/BibleViewer.jsx:230-369` — 위치 선택, 상태 Alert, 본문, 하단 이동이 하나의 큰 컴포넌트에 함께 있다.
- `src/components/BibleViewer.jsx:254-296` — 3단계 책 선택기가 읽기 중에도 항상 펼쳐져 본문보다 조작부가 먼저 보인다.
- `src/components/BibleViewer.jsx:319-356` — 본문이 외부 Card 안의 중첩 Card로 표현되어 전자책의 단일 종이 면 인상이 약하다.
- `src/components/BibleViewer.jsx:339-349` — 절마다 grid 행과 큰 간격을 사용해 연속적인 문장 흐름보다 목록처럼 보인다.
- `src/App.jsx:29-41` — 테마와 글자 크기는 이미 localStorage에 저장된다.
- `src/utils/readingProgress.js:21-34` — 마지막 장 저장은 `{ bookName, chapter }` 계약으로 검증된다.
- `src/utils/readingProgress.js:66-99` — 북마크 진입이 자동 저장 위치보다 우선하는 계약이 있다.
- `DESIGN.md`의 `E-book reader experience plan` — 세로 스크롤, 집중 모드, 읽기 폭, 절 위치 복원, 접근성 원칙이 승인된 상위 디자인 계약이다.

## Dependency boundary

### Required data interface
```js
loadBibleChapter(bookName, chapter, { signal } = {})
// Promise<{ bookName: string, chapter: number, verses: string[] }>
```

- 뷰어는 `src/data/json`, `public/bible`, 파일명, 권별 묶음 여부를 알지 않는다.
- 데이터 작업이 완료되기 전에는 현재 glob loader를 같은 시그니처의 임시 adapter로 감싸 뷰어 작업을 진행할 수 있다.
- 데이터 오류, 네트워크 오류, 취소를 구분하되 사용자 문구는 뷰어에서 결정한다.

## Reader architecture

### Component responsibilities
- `BibleViewer`
  - 현재 권/장, Dialog 열림 상태, 권 경계 이동, 데이터 로딩을 조정한다.
- `ReaderToolbar`
  - 현재 위치, 위치 변경, 북마크, 읽기 설정, 집중 모드 액션을 제공한다.
- `ScriptureLocationDialog`
  - 기존 `BibleBookSelect`와 장 선택을 보존하고 본문 위에서 분리한다.
- `ReaderSurface`
  - 장 제목, 절 목록, 로딩, 오류, 복원 포커스를 렌더링한다.
- `ReaderSettingsDialog`
  - 글자 크기, 행간, 본문 폭, 테마를 변경한다.
- `ChapterNavigation`
  - 이전/다음 장의 실제 목적지를 계산해 큰 터치 타깃으로 표시한다.
- `BookmarkPanel`
  - 기존 북마크 이동/삭제 흐름을 유지한다.
- `OfflineLibrary`
  - 전체 저장 요약, 권별 상태/용량, 검색/필터, 선택 저장/삭제를 제공한다.
- `OfflineBookRow`
  - 권명, 장 수, 예상 다운로드, 기기 저장 용량, 저장 상태와 액션을 표시한다.
- `StorageUsageSummary`
  - 사이트 전체 사용량, 오프라인 성경 사용량, 브라우저 quota와 지속 저장 상태를 구분한다.

### App-shell integration
- `App.jsx`가 `isReaderFocusMode` 상태를 소유하고 `BibleViewer`에 제어 props를 전달한다.
- 집중 모드에서는 sidebar와 일반 topbar를 숨기되 `/viewer` 라우트는 유지한다.
- `/viewer`를 벗어나면 집중 모드를 자동 종료한다.
- 집중 모드는 새로고침 후 유지하지 않는다. 사용자가 숨겨진 내비게이션 상태로 재진입하는 혼란을 방지한다.
- `/offline`을 앱 셸의 독립 화면으로 추가하고 뷰어 읽기 설정에서도 바로 진입할 수 있게 한다.

### Persistence contracts
- 기존 키 유지:
  - `app_theme`
  - `app_font_size`
  - `bible_bookmarks`
  - `bible_reading_progress`
- 새 키:
  - `bible_reader_preferences`
    - `{ lineHeight: 'compact' | 'comfortable' | 'relaxed', contentWidth: 'narrow' | 'standard' | 'wide' }`
  - `bible_reader_position`
    - `{ bookName: string, chapter: number, verseIndex: number }`
- 집중 모드는 localStorage에 저장하지 않는다.
- 북마크 진입 시 해당 장 처음을 보여주며 같은 장의 자동 절 위치를 적용하지 않는다.
- 일반 `/viewer` 재진입에서만 자동 절 위치를 복원한다.

## Interaction specification

### Default reader
- 첫 화면에서 본문 표면이 가장 큰 시각 영역을 차지한다.
- 상단 최소 툴바에는 현재 권/장과 다섯 가지 액션만 둔다.
  - 위치 변경
  - 현재 장 북마크
  - 북마크 목록
  - 읽기 설정
  - 집중 모드
- 상태 메시지는 반복적으로 쌓이는 Alert 대신 짧은 status region 또는 toast 성격으로 표시한다.
- 현재 권이 오프라인 저장되지 않은 경우 툴바의 저장 상태 아이콘에서 이를 확인하고 해당 권 저장 액션으로 이동할 수 있다.

### Offline library
- 전용 경로: `/offline`
- 상단 요약 카드:
  - `오프라인 성경`: 저장된 권 수 / 66권, 실제 캐시 사용량
  - `전체 성경`: 예상 다운로드 약 1.28MiB, 저장 예상 약 4.46MiB
  - `이 사이트 전체`: `navigator.storage.estimate()` 기준 usage / quota
  - `저장 보호`: 지속 저장 허용/미허용/지원하지 않음
- 권 목록은 66권을 한 화면에서 검색·필터할 수 있게 한다.
  - 전체 / 저장됨 / 저장 안 됨 / 업데이트 필요
  - 구약 / 신약
- 각 권 행에는 다음 정보를 함께 표시한다.
  - 권명과 장 수
  - 상태 Badge
  - 예상 다운로드 용량
  - 저장 후 용량 또는 실제 저장 용량
  - `오프라인 저장`, `업데이트`, `삭제` 액션
- 다중 선택:
  - 선택한 권 저장/삭제
  - 구약 전체, 신약 전체, 전체 성경 빠른 선택
  - 실행 전에 선택 권 수와 합계 용량을 확인한다.
- 전체 성경 저장은 자동으로 시작하지 않으며 명시적 확인 후 실행한다.
- 저장 중에는 권별 상태를 `대기`, `저장 중`, `저장됨`, `실패`로 표시한다.
- 여러 권 저장은 동시 요청 수를 3개 이하로 제한하고 전체 취소를 제공한다.
- 삭제 후에는 실제 캐시와 합계 용량을 다시 읽어 UI를 갱신한다.
- 저장되지 않은 권을 오프라인에서 열면 실패 Alert만 표시하지 않고 `/offline`로 이동하는 CTA를 제공한다.

### Storage language
- `예상 다운로드`: 서버에서 받을 압축 기준 데이터양
- `기기 저장`: Cache Storage에 저장될 데이터양 또는 저장된 실제 응답 크기
- `사이트 전체 사용량`: 앱 셸, 오프라인 성경, 설정/북마크 등 origin 전체 사용량
- 세 항목을 같은 의미처럼 합치지 않는다.
- 브라우저가 정확한 quota나 지속 저장 API를 제공하지 않으면 “브라우저에서 확인할 수 없음”으로 표시하고 0으로 표현하지 않는다.

### Focus mode
- 앱 sidebar와 일반 topbar를 숨긴다.
- 본문, 최소 툴바, 하단 장 이동만 유지한다.
- 화면 버튼과 `Esc`로 종료한다.
- 열린 Dialog가 있을 때 `Esc`는 Dialog를 먼저 닫고 집중 모드는 유지한다.
- `prefers-reduced-motion`에서는 진입/종료 애니메이션을 사실상 제거한다.

### Typography
- 본문은 단일 종이 면으로 표시하고 중첩 Card를 제거한다.
- 기본 본문 폭은 700px 전후, 선택 범위는 다음과 같다.
  - narrow: 약 620px
  - standard: 약 700px
  - wide: 약 780px
- 모바일에서는 viewport 폭에서 32px 안쪽 여백을 제외한 값을 상한으로 사용한다.
- 행간:
  - compact: 약 1.7
  - comfortable: 약 1.9
  - relaxed: 약 2.1
- 절 간격은 현재보다 줄이고 절 번호는 위첨자에 가까운 보조 표현으로 낮춘다.
- 절 DOM에는 안정적인 `data-verse-index`와 식별자를 제공한다.

### Chapter navigation
- 하단 버튼에 목적지를 표시한다.
  - `이전 · 창세기 1장`
  - `다음 · 창세기 3장`
- 책 안에서는 즉시 이동한다.
- 권 경계에서는 현재 Dialog 확인 흐름을 유지한다.
- 창세기 1장 이전과 요한계시록 마지막 장 이후는 인라인 안내를 유지한다.
- 새 장 로딩 성공 후 장 제목으로 포커스를 이동하고 본문 시작으로 스크롤한다.

### Keyboard behavior
- Dialog가 닫혀 있고 입력 요소에 포커스가 없을 때만 `←`/`→`로 장을 이동한다.
- `Esc`는 Dialog/Sheet 닫기를 우선하고, 열린 레이어가 없으면 집중 모드를 종료한다.
- `Tab` 순서는 툴바 → 본문 링크/액션 → 하단 장 이동 순서로 자연스럽게 유지한다.

### Verse-position resume
- 각 절을 `IntersectionObserver`로 관찰한다.
- viewport 중앙에 가장 가까운 절을 현재 위치로 판단한다.
- 위치 저장은 500ms 이상 throttle하거나 `visibilitychange`/unmount 시 최종 저장해 localStorage 쓰기를 제한한다.
- 본문 렌더링 후 저장된 절을 `block: 'center'`로 복원한다.
- 사용자가 명시적으로 다른 장을 선택하거나 이전/다음 장으로 이동한 경우 새 장 처음부터 시작한다.
- 저장 값이 현재 권/장과 다르거나 절 범위를 벗어나면 무시한다.

## Work breakdown

### 1. Extract pure reader state utilities
Status:
- Complete

Files:
- Add `src/utils/readerPreferences.js`
- Add `src/utils/readerPosition.js`
- Add corresponding `*.test.js`
- Update `package.json`

Tasks:
- 읽기 설정 기본값과 허용 값을 검증한다.
- 잘못된 localStorage 값을 안전하게 기본값으로 대체한다.
- 절 위치의 권/장/절 범위를 검증한다.
- 북마크/자동 장 위치/자동 절 위치의 적용 우선순위를 순수 함수로 고정한다.

Result:
- 읽기 설정과 절 위치 저장을 UI에서 분리하고, 필드별 기본값과 localStorage 실패 처리를 고정했다.
- 북마크 우선 진입, 저장된 장과 같은 경우에만 절 위치 복원, 실제 절 수를 벗어난 위치 무시를 테스트로 고정했다.

### 2. Establish the data adapter boundary
Status:
- Complete

Files:
- Add or consume `src/data/bibleRepository.js`
- Update `src/components/BibleViewer.jsx`

Tasks:
- 본문 로딩을 `loadBibleChapter()` 호출로 한정한다.
- effect cleanup에서 요청을 취소한다.
- 이전 요청의 성공/실패가 새로운 선택 상태를 덮지 않게 한다.
- loader의 실제 저장 방식과 독립적인 fixture를 사용해 UI 작업이 가능하게 한다.

Result:
- `BibleViewer`는 `loadBibleChapter(bookName, chapter, { signal })`만 사용하고 effect cleanup에서 이전 요청을 취소한다.
- repository 테스트는 실제 JSON 경로와 분리된 fixture로 요청 공유, 취소, 오류 복구를 검증한다.

### 3. Split reader components
Status:
- Complete

Files:
- Update `src/components/BibleViewer.jsx`
- Add reader components under `src/components/reader/`

Tasks:
- 위치 선택, 툴바, 본문 표면, 설정, 장 이동, 북마크 패널을 분리한다.
- `BibleViewer`는 상태 조정과 권 경계 전환만 소유한다.
- 기존 북마크 item shape와 동작을 변경하지 않는다.
- 중복된 상단/하단 장 이동 계산은 하나의 helper를 사용한다.

Result:
- `BibleViewer`는 위치·본문·북마크 상태와 side effect를 조정하고, reader 하위 컴포넌트는 제어형 표시 책임만 가진다.
- 상단과 하단 장 이동은 같은 navigation model을 사용해 같은 권 이동, 권 경계 확인, 성경 처음·끝 안내를 일관되게 처리한다.
- 기존 북마크 shape와 저장 순서를 순수 helper 테스트로 고정했다.

### 4. Build the e-book surface
Status:
- Complete

Files:
- Add/update reader styles in `src/index.css` or a reader-owned stylesheet
- Update reader component markup

Tasks:
- 중첩 Card를 제거하고 단일 page surface를 만든다.
- 읽기 폭, 행간, 절 번호, 장 제목 계층을 적용한다.
- 로딩 skeleton이 제목과 본문 폭을 유지하게 한다.
- 오류 상태에 `다시 시도` 액션을 제공한다.
- 빈 상태는 데이터 오류와 구분한다.

Result:
- `ReaderSurface`는 중첩 Card 대신 단일 `section/article` 종이 표면으로 렌더링하고, 본문 폭을 기본 약 700px로 유지하며 모바일에서는 안전 여백 안에서 축소한다.
- 장 제목 계층, serif 본문 행간, inline `sup` 형태의 절 번호를 적용해 본문 흐름을 목록형에서 읽기형으로 바꿨다.
- 로딩 중에도 제목 영역과 본문 폭이 유지되는 skeleton을 추가했고, 오류 상태는 본문 표면 내부에서 `다시 시도` 버튼으로 복구할 수 있게 했다.
- 데이터가 비어 있는 경우와 fetch 실패를 분리해 서로 다른 메시지로 표시하고, 상단 상태 영역의 중복 오류 표시는 제거했다.

### 5. Add focus mode and settings
Files:
- Update `src/App.jsx`
- Update `src/App.css`
- Add/update `ReaderSettingsDialog`

Tasks:
- App 소유의 집중 모드 상태와 `/viewer` 전용 레이아웃을 구현한다.
- 위치 변경과 읽기 설정을 모바일에서는 Sheet, 데스크톱에서는 Dialog 성격으로 제공한다.
- 기존 앱 테마/글자 크기 제어를 읽기 설정에서도 사용할 수 있게 연결한다.
- 행간과 본문 폭을 `bible_reader_preferences`에 저장한다.
- focus mode는 저장하지 않고 route 이탈 시 종료한다.

Result:
- `App.jsx`가 `isReaderFocusMode`와 `readerPreferences`를 소유하고 `/viewer` 이탈 시 focus를 자동 종료한다.
- `BibleViewer`는 위치 변경과 읽기 설정을 제어형 Dialog로 옮기고, 열린 overlay 집계 상태를 `App`에 알려 `Esc` 우선순위를 보장한다.
- `ReaderSettingsDialog`는 기존 앱 theme/fontSize 제어를 그대로 재사용하면서 line height와 content width만 `bible_reader_preferences`에 저장한다.
- 모바일에서는 bottom sheet 성격, 데스크톱에서는 centered dialog로 동작한다.

### 6. Build offline library management
Files:
- Add `src/components/OfflineLibrary.jsx`
- Add components under `src/components/offline/`
- Update `src/App.jsx`
- Consume `src/data/bibleOfflineStorage.js`

Tasks:
- `/offline` 라우트와 앱 내비게이션 항목을 추가한다.
- manifest의 66권과 오프라인 캐시 상태를 합쳐 목록 모델을 만든다.
- 저장됨/저장 안 됨/업데이트 필요 및 구약/신약 필터를 구현한다.
- 예상 다운로드, 저장 예상, 실제 저장, 사이트 전체 사용량을 명확히 분리한다.
- 권별 저장/업데이트/삭제와 다중 선택 저장/삭제를 구현한다.
- 전체 저장 전 합계 용량 확인 단계를 제공한다.
- 다운로드 동시성 3, 취소, 부분 실패 재시도를 제공한다.
- `navigator.storage.persisted()` 상태와 사용자 액션 기반 보호 요청을 제공한다.
- 지원하지 않는 브라우저, quota 부족, 오프라인 미저장 권에 복구 가능한 안내를 제공한다.

### 7. Add verse-position tracking
Status:
- Complete

Files:
- Update `ReaderSurface`
- Use `src/utils/readerPosition.js`

Tasks:
- IntersectionObserver와 throttle 저장을 구현한다.
- 일반 재진입에서만 절 위치를 복원한다.
- 북마크 진입과 명시적 장 이동에서는 장 처음을 우선한다.
- 글자 크기/본문 폭 변경 후에도 절 식별자를 기준으로 복원한다.

Result:
- `ReaderSurface`가 `IntersectionObserver`로 현재 viewport 중앙에 가장 가까운 절을 추적한다.
- 최근 절 위치는 500ms 단위로 제한해 저장하고, 탭이 숨겨지거나 뷰어가 unmount될 때 마지막 위치를 즉시 반영한다.
- 일반 `/viewer` 재진입에서만 같은 장의 절 위치를 복원하며, 북마크와 명시적 장 이동은 장 처음을 우선한다.
- 본문 로드 후 실제 절 수로 저장값을 다시 검증해 범위를 벗어난 절은 장 단위 복원으로 안전하게 낮춘다.
- 새로고침 후 동일 절 복원과 명시적 다음 장 이동 시 본문 시작을 로컬 브라우저에서 확인했다.

### 8. Add keyboard and accessibility behavior
Files:
- Update reader components and Dialog controls

Tasks:
- 방향키 장 이동과 `Esc` 우선순위를 구현한다.
- 장 제목을 프로그래밍 방식으로 포커스 가능하게 한다.
- 로딩/장 전환 결과를 `aria-live="polite"`로 알린다.
- 아이콘 버튼에 accessible name을 제공한다.
- 키보드 focus ring과 모바일 44px 이상 터치 타깃을 확인한다.
- 오프라인 권 목록의 상태 변경을 `aria-live="polite"`로 알리고 진행률을 텍스트로도 제공한다.

### 9. Integrate and verify
Files:
- Update `DESIGN.md` verification status after completion

Tasks:
- 데이터 작업의 최종 repository implementation과 통합한다.
- 기존 마지막 장 복원, 북마크 우선순위, 3단계 선택 회귀를 확인한다.
- light/dark/green과 모든 읽기 폭/행간 조합을 확인한다.
- 모바일, 태블릿, 데스크톱에서 가로 스크롤과 툴바 겹침을 확인한다.
- 오프라인 저장 상태가 뷰어 툴바와 `/offline` 목록에서 일치하는지 확인한다.

## Acceptance criteria
- `/viewer` 진입 시 본문이 첫 화면에서 가장 큰 시각 영역이다.
- 3단계 성경 선택기는 기본 본문 위에 항상 펼쳐져 있지 않고 위치 변경 패널에서 동작한다.
- 기존 66권/장 선택, 이전/다음 장, 권 경계 Dialog가 유지된다.
- 본문은 360px viewport에서 가로 스크롤 없이 표시된다.
- 데스크톱 standard 본문 폭은 약 700px이며 narrow/standard/wide 변경이 즉시 반영된다.
- compact/comfortable/relaxed 행간 설정이 즉시 반영되고 새로고침 후 유지된다.
- 글자 크기와 light/dark/green 테마는 기존 localStorage 키를 계속 사용한다.
- 집중 모드에서 sidebar/topbar가 숨겨지고 화면 버튼과 `Esc`로 복귀할 수 있다.
- `/viewer` 이탈 시 집중 모드가 종료되고 새로고침 후 자동 재진입하지 않는다.
- 빠른 연속 장 이동 시 마지막으로 선택한 장만 표시된다.
- 일반 재진입 시 마지막 절 부근이 복원된다.
- 북마크 진입과 명시적 장 이동에서는 자동 절 위치보다 장 처음이 우선한다.
- 저장 값이 손상되거나 범위를 벗어나도 오류 없이 장 처음을 표시한다.
- 입력/Select/Dialog 사용 중 방향키가 장 이동을 발생시키지 않는다.
- 로딩, 오류, 빈 상태, 장 전환을 보조기기가 구분할 수 있다.
- 모든 주요 아이콘 버튼에 accessible name이 있고 터치 타깃이 44px 이상이다.
- `/offline`에서 66권의 저장 상태와 용량을 한 번에 조회할 수 있다.
- 저장됨/저장 안 됨/업데이트 필요, 구약/신약 필터가 정확히 동작한다.
- 각 권은 예상 다운로드와 기기 저장 용량을 서로 다른 라벨로 표시한다.
- 오프라인 성경 용량과 이 사이트 전체 사용량이 서로 다른 요약 항목으로 표시된다.
- 권별 저장/삭제와 선택 저장/삭제 후 상태 및 합계가 실제 캐시와 일치한다.
- 전체 저장은 예상 다운로드/저장 합계 확인 전 시작되지 않는다.
- 여러 권 저장 중 전체 취소와 실패 항목 재시도가 가능하다.
- 저장된 권은 오프라인에서 열리고 저장하지 않은 권은 저장 관리 화면으로 이동할 수 있다.
- StorageManager 미지원 또는 persist 거부 상태를 오류로 오인하지 않고 설명한다.
- `npm test`, `npm run lint`, `npm run build`, `git diff --check`가 통과한다.

## Verification steps
1. `npm test`
2. `npm run lint`
3. `npm run build`
4. `/viewer` 직접 진입 및 마지막 장/절 복원
5. 홈 북마크에서 진입해 북마크 장 처음 우선 확인
6. 같은 권/다른 권의 이전·다음 이동과 빠른 연속 이동
7. 창세기 1장/요한계시록 마지막 장 경계
8. 위치 변경 Dialog에서 3단계 권 선택과 장 reset 확인
9. 집중 모드 진입, Dialog `Esc`, 집중 모드 `Esc`, route 이탈 확인
10. `/offline`의 66권 상태/용량, 검색, 필터, 다중 선택 확인
11. 권별 저장/삭제, 전체 선택 전 합계 확인, 취소, 부분 실패 재시도 확인
12. 저장된 권/저장 안 된 권을 네트워크 차단 상태에서 각각 열어 안내 확인
13. Cache Storage 실제 합계와 화면의 오프라인 성경 용량 비교
14. StorageManager 지원/미지원 및 persist 허용/거부 상태 확인
15. light/dark/green × narrow/standard/wide × 세 행간의 대표 조합 확인
16. 360px, 768px, 1024px, 1280px viewport에서 가로 스크롤/겹침 확인
17. 키보드 전용 탐색과 `prefers-reduced-motion` 확인
18. `git diff --check`

## Risks and mitigations
- Risk: 집중 모드가 앱 탐색을 숨겨 사용자가 갇힐 수 있다.
  - Mitigation: 고정된 종료 버튼, `Esc`, route 이탈 자동 종료를 모두 제공하고 focus mode를 저장하지 않는다.
- Risk: 절 위치 저장이 스크롤 성능을 저하시킬 수 있다.
  - Mitigation: IntersectionObserver와 throttle을 사용하고 scroll 이벤트마다 localStorage에 쓰지 않는다.
- Risk: 북마크와 자동 절 복원이 충돌할 수 있다.
  - Mitigation: 진입 source를 명시적으로 유지하고 bookmark > explicit navigation > automatic verse resume 우선순위를 테스트한다.
- Risk: 컴포넌트 분리 중 장 이동과 권 경계 로직이 중복될 수 있다.
  - Mitigation: 목적지 계산을 순수 helper로 추출하고 기존 경계 사례를 테스트한다.
- Risk: 전역 글자 크기와 reader 설정이 이중 상태가 될 수 있다.
  - Mitigation: 글자 크기와 테마는 App의 기존 상태를 단일 source of truth로 유지하고 reader는 props/context로 소비한다.
- Risk: 다운로드 용량과 저장 용량의 단위가 섞여 사용자가 잘못 이해할 수 있다.
  - Mitigation: 예상 다운로드/기기 저장/사이트 전체 사용량을 항상 분리하고 도움말에 산정 기준을 표시한다.
- Risk: 66권 목록과 다중 선택이 모바일에서 복잡해질 수 있다.
  - Mitigation: 상단 요약과 필터를 sticky로 유지하고 행 액션은 단일 주 액션으로 제한하며 선택 작업은 하단 action bar에 모은다.
- Risk: 일부 브라우저에서 Cache Storage가 예고 없이 정리될 수 있다.
  - Mitigation: 매 진입 시 캐시를 실제 조회하고 지속 저장 상태 및 삭제 가능성을 사용자에게 알린다.

## Explicit non-goals
- 3D 페이지 넘김 애니메이션
- 실제 페이지 번호 계산과 양면 페이지 레이아웃
- 절 하이라이트, 메모, 공유, 검색
- 여러 기기 동기화
- 성경 전체 무한 스크롤
- 북마크 데이터 shape 변경
- 사용자 동의 없는 성경 전체 자동 다운로드

## Handoff contract to data workstream
- 뷰어는 `loadBibleChapter()`의 성공 shape와 오류 구분만 요구한다.
- 오프라인 관리 화면은 `loadBibleManifest()`와 `bibleOfflineStorage` 공개 API만 사용하고 cache name이나 URL 규칙을 직접 알지 않는다.
- 파일 수, 권별/장별 묶음, precache 방식은 데이터 작업이 소유한다.
- 뷰어 테스트는 repository를 stub할 수 있어야 하며 실제 JSON 경로를 fixture에 하드코딩하지 않는다.
- 데이터 작업이 계약을 변경해야 할 경우 두 계획 문서를 먼저 갱신한다.
