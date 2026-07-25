# Design

## Source of truth
- Status: Active — reader state and component foundations implemented
- Last refreshed: 2026-07-25
- Primary product surfaces: 앱 셸(`src/App.jsx`), 대시보드(`src/components/Dashboard.jsx`), 목표 계산기(`src/components/TargetCalculator.jsx`), 분량 계산기(`src/components/CountCalculator.jsx`), 1년 회독 계산기(`src/components/DailyCalculator.jsx`), 성경 뷰어(`src/components/BibleViewer.jsx`)
- Evidence reviewed:
  - `package.json` — React 19 + Vite 7 + `react-router-dom` 7 유지, 테스트 스크립트 추가됨
  - `src/App.jsx`, `src/App.css`, `src/index.css` — 전역 CSS와 인라인 스타일 중심의 현재 UI 구조
  - `src/components/Dashboard.jsx` — 최근 계산/북마크 요약 대시보드
  - `src/components/TargetCalculator.jsx`, `src/components/CountCalculator.jsx`, `src/components/DailyCalculator.jsx` — 계산기 3종과 localStorage 저장 흐름
  - `src/components/BibleViewer.jsx` — 장 단위 lazy load, 북마크, 이전/다음 장 이동
  - `src/components/reader/**` — 위치 선택, 상태 안내, 본문, 장 이동, 북마크와 권 경계 Dialog 표시 책임
  - `src/components/BibleBookSelect.jsx` — 최근 추가된 3단계 성경 선택 UI
  - `src/data/bibleData.js`, `src/data/bibleData.test.js` — 66권/1,189장 보존 및 구약/신약/분류 메타데이터 검증
  - `src/data/bibleRepository.js` — manifest 기반 권 단위 fetch, 검증, 요청 공유 및 취소 계약
  - `scripts/build-bible-books-lib.mjs` — canonical Markdown에서 66개 content-addressed 권 파일과 용량 manifest 생성
  - `data/bible-source/SOURCE.md`, `docs/reports/bible-source-change-report.md` — 로컬 canonical source와 legacy JSON 감사 근거를 남긴 문서
- Observed facts:
  - 현재 라우트는 `/`, `/target`, `/count`, `/daily`, `/viewer`, `/offline` 6개다.
  - UI 상태는 `app_theme`, `app_font_size`, `target_history`, `count_history`, `daily_history`, `bible_bookmarks`, `bible_reading_progress`를 localStorage에 저장한다.
  - 기록 데이터 shape는 `target_history[]`, `count_history[]`, `daily_history[]`의 `{ id, date, input, result }`, `bible_bookmarks[]`의 `{ id, bookName, chapter, date, time }` 구조다.
  - `Dashboard`는 현재 마운트 시 localStorage를 다시 읽고 `storage` 이벤트를 구독한다. 리디자인 이후에도 route 재진입 시 최신 localStorage 값을 다시 읽는 동작을 보장해야 한다.
  - 성경 본문은 검증된 Markdown에서 `public/bible/books/**`로 생성되며, 뷰어는 repository를 통해 권 단위로 가져온다.
  - 같은 권의 장 이동은 메모리 캐시를 재사용하고, 이전 장 요청은 선택 변경 시 취소된다.
  - PWA는 성경 데이터 manifest만 precache하며 66개 권 payload는 자동 precache하지 않는다.
  - Google Drive와 legacy `src/data/json/**` snapshot은 제거됐고, pinned Markdown snapshot과 generated book payload가 유일한 데이터 경로다.
  - 최근 변경으로 “구약/신약 → 분류 → 성경” 3단계 선택이 계산기와 뷰어에 반영되었고, 이 흐름은 반드시 유지되어야 한다.

## Current product snapshot
- 강점:
  - 기능이 이미 분리되어 있고 라우트 기반이라 단계적 UI 교체가 가능하다.
  - localStorage 기반 저장/복원 덕분에 빠른 재진입 경험이 있다.
  - 성경 본문이 앱 JavaScript와 분리된 권 단위 런타임 데이터라 오프라인 선택 저장으로 확장하기 쉽다.
- 현재 UX 문제:
  - `src/App.css` 하나에 레이아웃/테마/대시보드/모달/뷰어 스타일이 섞여 있어 화면 단위 개선이 어렵다.
  - 앱 셸이 고정 높이(600px)와 내부 스크롤에 의존하고, 사이드바가 기본적으로 숨겨져 있어 데스크톱 탐색성이 약하다.
  - `alert`/`confirm`/인라인 스타일이 많아 시각 일관성, 접근성, 상태 제어가 불안정하다.
  - 카드/폼/결과/기록 리스트가 모두 유사하지만 재사용 컴포넌트로 정리되지 않았다.
  - 현재 테마(light/dark/green)는 존재하지만 의미 토큰이 아니라 화면별 하드코딩 색 보정에 가깝다.

## Brand
- Personality: 조용한 서재, 신뢰 가능한 성경 읽기 도구, 과장 없는 집중감
- Trust signals:
  - 장 수 계산과 책/장 이동이 정확하게 유지될 것
  - 최근 기록과 북마크가 즉시 복원될 것
  - 본문 읽기 화면이 산만하지 않고 장시간 읽기 가능할 것
- Avoid:
  - 일반적인 관리자 대시보드 같은 UI
  - 밝은 흰 배경 위 보라 그라데이션류의 AI 슬롭 미감
  - 데스크톱에서도 메뉴가 숨겨지는 구조
  - 모달/알림 남발, 작은 터치 타깃, 과한 애니메이션

## Product goals
- Goals:
  - 기존 다섯 기능을 “성경 읽기 워크스페이스”로 재구성해 하나의 제품처럼 느껴지게 만든다.
  - 최근 추가된 3단계 성경 선택 흐름을 모든 관련 화면에서 핵심 탐색 패턴으로 정착시킨다.
  - 계산 화면과 뷰어 화면의 시각 언어를 통일하고, 읽기/계획/복귀 속도를 높인다.
  - shadcn/ui 도입을 계기로 공통 컴포넌트와 토큰 기반 테마 체계를 만든다.
  - 오프라인 성경 데이터의 저장 여부와 용량을 투명하게 보여주고 사용자가 저장할 권을 직접 선택하게 한다.
- Non-goals:
  - 이번 단계에서 Next.js로 전환하지 않는다.
  - 로컬 저장 구조를 백엔드/클라우드 동기화 구조로 바꾸지 않는다.
  - 계산 로직이나 성경 데이터 모델을 UI와 무관하게 재설계하지 않는다.
  - 스크린샷 기반 픽셀 매칭 워크플로를 도입하지 않는다.
- Success signals:
  - 모든 주요 흐름이 3탭 이내에 도달 가능하다.
  - 데스크톱과 모바일에서 내비게이션이 항상 명확하다.
  - 3단계 성경 선택, 북마크, 계산 기록 저장/삭제가 회귀 없이 유지된다.
  - 구현 후에도 `npm test`, `npm run build`, `npm run lint`를 통과한다.

## Personas and jobs
- Primary personas:
  - 매일 통독하는 개인 사용자: 오늘 읽을 분량과 이어 읽을 지점을 빠르게 확인하고 싶다.
  - 계획형 사용자: 특정 시작/종료 지점 기준 분량과 페이스를 계산하고 싶다.
  - 반복 학습 사용자: 북마크와 최근 기록으로 자주 보던 본문을 빠르게 복귀하고 싶다.
- User jobs:
  - “오늘 여기서 몇 장 읽으면 어디까지 가는지” 계산한다.
  - “여기서 여기까지 총 몇 장인지” 확인한다.
  - “1년에 n독 하려면 하루 몇 장 읽어야 하는지” 계산한다.
  - 저장한 위치로 돌아가 본문을 이어 읽는다.
- Key contexts of use:
  - 모바일 한 손 사용, 교회/이동 중 짧은 확인
  - 태블릿/데스크톱에서 긴 본문 읽기
  - 낮/밤/편안한 읽기 테마 전환

## Information architecture
- Primary navigation:
  - 홈
  - 어디까지 읽을까 (`/target`)
  - 총 몇 장인가 (`/count`)
  - 하루 페이스 (`/daily`)
  - 성경 읽기 (`/viewer`)
  - 오프라인 저장 (`/offline`)
- Core routes/screens:
  - 홈: 최근 기록, 북마크, 빠른 진입
  - 목표 계산기: 시작 지점 + 읽을 장 수 → 마지막 지점
  - 분량 계산기: 시작 지점 + 끝 지점 → 총 장 수
  - 1년 회독 계산기: 목표 회독 수 → 하루 필요 장 수
  - 성경 뷰어: 3단계 책 선택 + 장 선택 + 본문 + 북마크
  - 오프라인 저장: 사이트/성경 저장 사용량 + 66권 저장 상태 + 권별/선택 다운로드 및 삭제
- Content hierarchy:
  - 1순위: 오늘 이어서 읽기 / 계산 결과 / 현재 선택 중인 성경 위치
  - 2순위: 최근 저장 기록 / 히스토리 관리
  - 3순위: 테마, 글자 크기, 부가 설정

### Core user flows
1. **읽던 곳으로 복귀**
   - 홈 진입 → 최근 북마크 카드 선택 또는 성경 읽기 직접 진입 → 북마크가 있으면 해당 장, 없으면 마지막 읽던 장 로드 → 이전/다음 장 이동 → 마지막 위치 자동 저장
2. **오늘 읽을 도착 지점 계산**
   - 홈 또는 내비게이션 → 어디까지 읽을까 → 3단계로 시작 책 선택 → 시작 장/읽을 장 수 입력 → 결과 확인 → 기록 저장
3. **구간 분량 확인**
   - 총 몇 장인가 → 시작/끝 지점을 각각 3단계로 선택 → 결과 확인 → 기록 저장
4. **연간 목표 페이스 산정**
   - 하루 페이스 → 연간 회독 수 입력 → 일일 장 수 확인 → 기록 저장
5. **오프라인에서 읽을 권 관리**
   - 오프라인 저장 진입 → 전체/저장됨/저장 안 됨 상태와 용량 확인 → 권별 또는 다중 선택 → 예상 다운로드/저장 합계 확인 → 저장 → 네트워크 없이 해당 권 읽기

## Design principles
- Principle 1: **Scripture first** — 성경 본문과 현재 읽는 맥락이 가장 강하게 보여야 한다.
- Principle 2: **Planning without friction** — 계산기는 입력 수를 최소화하고 결과/기록을 즉시 재사용 가능해야 한다.
- Principle 3: **Persistent familiarity** — 기존 localStorage 키, 3단계 선택 구조, 한국어 라벨을 보존한다.
- Principle 4: **Calm depth** — 화려함보다 서재 같은 집중감, 그러나 단조롭지 않은 고급감을 준다.
- Tradeoffs:
  - Tailwind/shadcn 도입으로 초기 리팩터링 비용은 증가하지만 이후 화면별 일관성 확보가 쉬워진다.
  - 본문 뷰어의 집중도를 위해 장식은 줄이되, 홈과 결과 패널에는 충분한 시각적 계층을 둔다.

## Visual language
- Aesthetic direction: **Quiet Scriptorium**
  - 핵심 인상은 “조용한 서재의 성경 읽기 책상”이다.
  - 기억 포인트는 계산기까지 모두 하나의 읽기 도구처럼 느껴지게 하는 잉크 톤, 종이 질감 계열 표면, 절제된 성전(聖典) 느낌의 타이포 계층이다.
- Color:
  - 기본 테마는 종이색 배경 + 잉크색 텍스트 + 코발트/올리브 포인트를 사용한다.
  - 다크/그린 테마는 기존 사용 습관을 유지하되 의미 기반 토큰으로 재정의한다.
- Typography:
  - Display/section heading: `MaruBuri`
  - UI/body: `SUIT Variable`
  - Scripture text / 긴 읽기 본문: `Noto Serif KR`
- Spacing/layout rhythm:
  - 8pt 기반 간격 시스템
  - 주요 화면 좌우 패딩 16/24/32px 계층
  - 카드 내부 간격 20~24px, reader 본문은 더 넓은 line-height 사용
- Shape/radius/elevation:
  - 앱 셸 24px radius(데스크톱), 카드 20px, 입력/버튼 14px
  - 그림자는 얕고 넓게, border와 함께 사용
- Motion:
  - 140ms~220ms 범위의 짧은 easing
  - 사이드 패널, 북마크, 결과 등장만 강조
  - 계산 결과/저장 완료는 scale 대신 fade+slide 중심
- Imagery/iconography:
  - emoji 중심 표현은 단계적으로 축소하고 Lucide 계열 라인 아이콘으로 정리
  - 성경/북마크/계산 같은 핵심 의미만 명확한 아이콘 유지

## Design tokens
- Base semantic tokens:
  - `--bg-canvas`, `--bg-panel`, `--bg-elevated`
  - `--fg-primary`, `--fg-secondary`, `--fg-muted`
  - `--border-subtle`, `--border-strong`, `--ring-focus`
  - `--accent-primary`, `--accent-secondary`, `--accent-success`, `--accent-danger`
  - `--shadow-soft`, `--shadow-raised`, `--radius-sm`, `--radius-md`, `--radius-lg`
- Theme mapping:
  - Light: parchment canvas + navy ink + muted cobalt accent
  - Dark: charcoal canvas + warm-gray text + steel-blue accent
  - Green(유지): olive canvas + sage text + deep green accent
- Compatibility rule:
  - localStorage 값은 기존 `light`, `dark`, `green`을 유지하고, 내부 토큰 세트만 새 디자인 언어에 맞게 교체한다.

## Screen-by-screen changes
| 화면 | 현재 상태 | 변경 방향 |
| --- | --- | --- |
| 앱 셸 | 기본 숨김 사이드바 + 고정 높이 컨테이너 | 데스크톱 persistent sidebar, 모바일 sheet, 상단 context bar, full-height 레이아웃 |
| 홈 | 최근 기록 카드 4개 | “오늘 이어 읽기” 우선, 최근 계산 요약/빠른 시작/북마크 복귀를 더 분명히 배치 |
| 어디까지 읽을까 | 단일 컬럼 폼 + 결과 + 기록 | 공통 계산 카드 레이아웃, 3단계 책 선택을 시각적으로 명확한 fieldset으로 승격 |
| 총 몇 장인가 | 시작/끝 입력 구조가 길고 단조로움 | 시작/끝을 좌우 또는 상하 그룹으로 구분하고 결과 패널을 즉시 인지 가능하게 강화 |
| 하루 페이스 | 최소 입력 구조 | 목표 설명, 예시, 저장된 최근 목표를 더 명확히 보여주는 단일 집중 카드 |
| 성경 읽기 | 본문은 기능적이지만 인라인 스타일, alert/confirm 의존 | sticky reader toolbar, 넓은 본문 영역, 북마크 drawer/dialog 정리, 권 경계 이동은 접근성 있는 Dialog 확인으로 통일하고 마지막 책 끝은 인라인 Alert로 안내 |

## E-book reader experience plan

### Execution workstreams
- 데이터 로컬화·무결성·로딩 계약: `docs/plans/data-localization-and-integrity.md`
- 전자책형 뷰어 UI·상호작용: `docs/plans/ebook-reader-viewer.md`
- 두 작업은 `loadBibleChapter(bookName, chapter, { signal })` 계약을 경계로 분리하며, 뷰어는 실제 파일 경로와 묶음 방식을 알지 않는다.
- PWA는 성경 전체를 자동 precache하지 않고 앱 셸과 성경 manifest만 precache한다. 권 데이터는 사용자가 `/offline`에서 명시적으로 저장한다.

### Experience goal
- 성경 뷰어를 “기능이 배치된 카드 화면”에서 “본문이 중심인 전자책 리더”로 전환한다.
- 사용자가 읽기 화면에 들어온 뒤에는 책/장 선택 UI보다 본문, 현재 위치, 이전/다음 이동이 먼저 인지되어야 한다.
- 전자책의 시각적 인상은 종이 질감, 안정적인 한 줄 길이, 충분한 행간, 절제된 조작부로 만든다.

### Core design decision
- 1차 구현은 **장 단위 세로 스크롤 리더**로 한다.
  - 현재 데이터가 장 단위로 lazy load 되고 모바일/데스크톱의 화면 높이와 글자 크기가 다양하므로, 고정 페이지 분할보다 안정적이다.
  - 페이지 넘김 애니메이션이나 실제 양면 페이지 분할은 1차 범위에서 제외한다.
  - “전자책답다”는 느낌은 페이지 애니메이션보다 본문 집중도, 읽던 절 복원, 최소 조작, 타이포 품질로 먼저 달성한다.
- 데스크톱에서도 본문은 단일 컬럼을 유지하고 약 640~760px 범위의 읽기 폭을 기본으로 한다.
- 기존 장 단위 이전/다음 이동과 권 경계 확인 Dialog는 유지한다.

### Reader information hierarchy
1. 현재 위치: `창세기 1장`과 읽기 진행 상태
2. 본문: 절 번호는 보조 정보로 낮추고 문장 흐름을 우선
3. 장 이동: 이전 장 / 다음 장
4. 보조 기능: 책·장 선택, 북마크, 읽기 설정
5. 앱 전체 탐색: 집중 모드에서는 숨기고 명시적인 종료 액션으로 복귀

### Planned reader modes
- **기본 읽기 모드**
  - 현재 앱 셸 안에서 동작한다.
  - 상단에 현재 책/장, 집중 모드 진입, 북마크, 읽기 설정을 한 줄로 배치한다.
  - 긴 3단계 책 선택기는 항상 펼쳐 두지 않고 “본문 위치 변경” 패널에서 사용한다.
- **집중 모드**
  - 앱 사이드바와 일반 화면 헤더를 숨기고 본문과 최소 툴바만 표시한다.
  - 상단 툴바는 스크롤 중 축소되며, 화면 상단 이동 또는 명시적 조작 시 다시 나타난다.
  - `Esc`와 화면 내 “집중 모드 종료” 버튼으로 원래 레이아웃에 복귀한다.
  - 새 라우트보다는 `/viewer` 내부 상태로 시작해 현재 복원/북마크 흐름을 보존한다.

### Reading controls
- 상단 최소 툴바:
  - 현재 책/장
  - 위치 변경
  - 현재 장 북마크
  - 읽기 설정
  - 집중 모드 진입/종료
- 하단 장 이동:
  - 이전 장과 다음 장을 큰 터치 타깃으로 제공한다.
  - 다음 장 버튼에는 가능한 경우 다음 위치를 함께 표시한다. 예: `다음 · 창세기 2장`
- 키보드:
  - 입력창이나 Dialog에 포커스가 없을 때 `←`/`→`로 이전/다음 장 이동
  - `Esc`로 열린 패널을 닫거나 집중 모드 종료
- 모바일:
  - 스와이프 이동은 브라우저 뒤로 가기와 충돌할 수 있어 1차 범위에서 제외한다.
  - 화면 가장자리 탭 이동도 오조작 가능성이 있어 도입하지 않고 하단 버튼을 우선한다.

### Typography and page surface
- 본문 기본 글꼴은 `--font-scripture`를 유지한다.
- 본문 한 줄 길이는 한국어 기준 약 32~42자를 목표로 하며 화면 크기에 따라 유동적으로 조정한다.
- 기본 행간은 1.9 전후, 문단/절 간격은 현재보다 촘촘하게 조정해 한 절마다 카드처럼 분리되어 보이지 않게 한다.
- 절 번호는 작은 고정 열보다 본문 시작 지점의 위첨자에 가까운 표현을 사용해 시선 방해를 줄인다.
- 본문 표면은 카드 중첩을 줄이고 하나의 종이 면처럼 보이게 한다.
- 읽기 설정은 최소한 다음 항목을 제공한다.
  - 글자 크기
  - 행간: 좁게 / 기본 / 넓게
  - 본문 폭: 좁게 / 기본 / 넓게
  - 테마: 현재 `light` / `dark` / `green` 값 유지

### Reading position and persistence
- 기존 `bible_reading_progress`의 `{ bookName, chapter }` 계약은 변경하지 않는다.
- 장 안에서 읽던 위치를 복원하기 위해 별도 키 `bible_reader_position`을 계획한다.
  - 데이터 형태: `{ bookName, chapter, verseIndex }`
  - 현재 화면 중앙에 가장 가까운 절을 기준으로 낮은 빈도로 저장한다.
  - 재진입 시 해당 절로 이동하되 사용자가 북마크로 진입한 경우 북마크 위치를 우선한다.
  - 손상되거나 범위를 벗어난 값은 무시하고 장의 처음을 보여준다.
- 읽기 설정은 별도 키 `bible_reader_preferences`에 저장한다.
  - 데이터 형태: `{ lineHeight, contentWidth }`
  - 앱 전체 글자 크기와 테마 키는 기존 값을 그대로 재사용한다.
- 집중 모드는 새로고침 후 유지하지 않으며 `/viewer` 이탈 시 종료한다.

### States and feedback
- Loading: 종이 면과 제목 영역을 유지한 본문 skeleton으로 레이아웃 흔들림을 줄인다.
- Error: 본문 영역 안에서 재시도 버튼과 함께 표시한다.
- Position restore: 반복적인 Alert 대신 짧은 비침습적 상태 문구로 읽던 위치 복원을 알린다.
- Chapter transition: 새 장을 불러온 뒤 본문 시작으로 이동하고 현재 위치 제목에 포커스를 주어 스크린 리더에도 전환을 알린다.
- Focus mode: 진입/종료 시 짧은 fade만 사용하고 `prefers-reduced-motion`을 존중한다.

### Scope by phase
1. **Reader foundation**
   - 기존 카드 중첩 축소, 단일 종이 면과 읽기 폭/행간/절 번호 개선
   - 상단 최소 툴바와 하단 장 이동 재구성
   - 로딩/오류/빈 상태를 본문 레이아웃 안으로 통합
2. **Focus and preferences**
   - 집중 모드 추가
   - 위치 변경/북마크/읽기 설정을 Dialog 또는 Sheet로 분리
   - 행간/본문 폭 설정 저장
3. **Resume within chapter**
   - 현재 절 감지와 `bible_reader_position` 저장
   - 직접 재진입 시 절 위치 복원, 북마크 우선순위 회귀 검증
4. **Polish and accessibility**
   - 키보드 장 이동, 포커스 복원, 스크린 리더 전환 안내
   - 모바일 터치 타깃, 데스크톱/태블릿 읽기 폭, 각 테마 대비 검증

### E-book reader acceptance criteria
- 기본 화면에서 본문이 첫 화면의 가장 큰 시각 영역을 차지한다.
- 데스크톱에서 본문 한 줄이 과도하게 길어지지 않고 모바일 360px에서도 가로 스크롤이 생기지 않는다.
- 위치 변경 패널에서 기존 3단계 성경 선택과 장 선택이 모두 동작한다.
- 이전/다음 장, 권 경계 Dialog, 마지막 책 경계 안내가 기존과 동일하게 동작한다.
- 집중 모드에서 앱 셸이 숨겨지고 `Esc`와 화면 버튼으로 안전하게 복귀할 수 있다.
- 글자 크기, 행간, 본문 폭, 테마가 새로고침 후 유지된다.
- 동일 장 재진입 시 마지막으로 읽던 절 부근이 복원되며 잘못된 저장 값은 장 처음으로 안전하게 대체된다.
- 북마크 진입은 자동 저장된 장/절 위치보다 항상 우선한다.
- 키보드 조작과 스크린 리더 사용 중 장 전환을 인지할 수 있다.
- `npm test`, `npm run lint`, `npm run build`가 모두 통과한다.

### Explicit non-goals for the first release
- 실제 종이책처럼 보이는 3D 페이지 넘김 애니메이션
- 두 페이지 양면 배치
- 절 하이라이트, 메모, 공유, 검색
- 여러 기기 간 읽기 위치 동기화
- 성경 전체를 한 번에 로드하는 무한 스크롤
- 사용자 동의 없는 성경 전체 자동 다운로드

## Offline Bible library

### User goal
- 사용자는 어떤 성경 권이 기기에 저장되어 있는지, 저장되지 않았는지, 각 권이 다운로드와 기기 저장 공간을 얼마나 사용하는지 한 화면에서 확인한다.
- 사용자는 오프라인에서 읽고 싶은 권만 선택해 저장하고 필요하지 않은 권은 삭제한다.

### Information hierarchy
1. 오프라인 성경: 저장된 권 수와 실제 캐시 사용량
2. 전체 성경: 예상 다운로드 약 1.28MiB, 저장 예상 약 4.46MiB
3. 사이트 전체: 브라우저가 제공하는 origin 전체 usage/quota
4. 권별 상태: 저장됨 / 저장 안 됨 / 업데이트 필요 / 오류
5. 권별 예상 다운로드, 기기 저장 용량과 저장/삭제 액션

### Interaction rules
- `/offline` 전용 화면에서 66권을 검색하고 저장 상태 및 구약/신약으로 필터링한다.
- 권별 저장/삭제와 선택 저장/삭제를 모두 제공한다.
- 구약 전체, 신약 전체, 전체 성경 빠른 선택을 제공하되 실제 다운로드 전에 권 수와 합계 용량을 확인한다.
- 여러 권 다운로드는 동시에 최대 3개만 실행하고 전체 취소와 실패 항목 재시도를 제공한다.
- 저장 여부는 기록 값이 아니라 `bible-offline-v1` Cache Storage의 실제 응답과 content hash를 기준으로 판별한다.
- 저장 공간 보호 상태를 표시하고 사용자가 요청할 때만 브라우저 지속 저장 권한을 요청한다.

### Implemented surface
- `src/components/OfflineBibleManager.jsx`가 `/offline` 화면의 요약, 검색/필터, 빠른 선택, 권별/선택 작업을 소유한다.
- `src/data/bibleOfflineStorage.js`가 `bible-offline-v1`의 실제 Cache Storage 상태와 StorageManager 정보를 소유한다.
- `src/data/bibleRepository.js`는 현재 manifest URL과 정확히 일치하는 저장 응답을 먼저 읽고, 없거나 캐시 조회가 실패하면 네트워크로 복구한다.
- 용량 문구는 manifest와 실제 response bytes에서 계산하며 문서에 적힌 예시 수치를 하드코딩하지 않는다.

### Capacity language
- `예상 다운로드`: gzip 기준 서버 전송 예상량
- `기기 저장`: Cache Storage에 저장되는 원본 응답 또는 실제 측정량
- `사이트 전체 사용량`: 앱 셸, 오프라인 성경, 설정과 북마크를 포함한 origin 전체 사용량
- 브라우저에서 확인할 수 없는 값은 0으로 표시하지 않고 “확인할 수 없음”으로 안내한다.

## Components
- Existing components to reuse:
  - 라우트 구성과 페이지 분리 구조
  - `BibleBookSelect`의 3단계 책 선택 로직
  - localStorage 기반 기록/북마크 구조
  - `bibleData`와 장 단위 lazy import 방식
- New/changed components:
  - `AppShell` — 내비게이션, 테마, 글자 크기, 현재 화면 제목
  - `SectionHeader` — 화면 타이틀/설명 공통
  - `CalculatorCard` — 설명, 입력, 결과, 저장 액션 공통 틀
  - `ResultPanel` — 성공/오류/저장 액션 포함 결과 박스
  - `HistoryList` — 저장 기록 공통 리스트
  - `ReaderToolbar` — 책/장/북마크/이동 액션
  - `BookmarkPanel` — 북마크 목록과 삭제/이동
  - `OfflineLibrary` — 전체 저장 요약, 66권 상태/용량, 검색/필터, 선택 저장/삭제
  - `StorageUsageSummary` — 오프라인 성경과 사이트 전체 저장 사용량을 분리해 표시
  - `OfflineBookRow` — 권별 상태, 예상 다운로드, 기기 저장 용량과 액션
- Variants and states:
  - 계산 카드: default / focused / success / error
  - 버튼: primary / secondary / ghost / destructive
  - nav item: default / active / hover / keyboard-focus
  - reader verse row: default / highlighted(optional future) / selected bookmark context
- Token/component ownership:
  - 전역 토큰은 `src/index.css` 또는 theme 레이어에 집중
  - shadcn 기반 컴포넌트 스타일은 토큰을 소비하고, 화면별 레이아웃만 route component가 소유
  - 기존 `App.css`는 단계적으로 축소 후 화면별/공통 레이어로 분리

### shadcn/ui mapping
| 기능 | shadcn/ui 매핑 | 비고 |
| --- | --- | --- |
| 앱 내비게이션 | `Sidebar` 패턴 + 모바일 `Sheet` | 데스크톱 숨김 내비게이션 문제 해결 |
| 화면 카드 | `Card` | 홈/계산/결과 공통 기반 |
| 버튼 | `Button` | primary/ghost/destructive 변형 통일 |
| 입력 필드 | `Input`, `Label`, `Select` | 현재 폼 하드코딩 대체 |
| 3단계 성경 선택 | `Select` 3개 + `fieldset`/`Separator` | 현재 로직 유지, 시각적 위계 강화 |
| 결과/에러 | `Alert`, `Card` | 결과/검증 상태 구분 |
| 저장 기록 리스트 | `ScrollArea`, `Badge`, `Separator` | 긴 기록 관리 개선 |
| 북마크 목록 | `Dialog` 또는 모바일 `Sheet` + `ScrollArea` | 기존 커스텀 모달 대체 |
| 테마 전환 | `ToggleGroup` | light/dark/green 유지 |
| 토스트 | `Toast` | 저장 완료 피드백 표준화 |

## Accessibility
- Target standard: WCAG 2.1 AA
- Keyboard/focus behavior:
  - 사이드바, 북마크 패널, 책 선택 3단계 모두 Tab 순서가 논리적이어야 한다.
  - 포커스 링은 토큰 기반으로 일관되게 표시한다.
  - 모달/시트는 focus trap과 Escape 닫기를 지원한다.
- Contrast/readability:
  - 본문 텍스트와 배경 대비는 각 테마에서 4.5:1 이상 확보
  - 긴 본문은 1.75 이상 line-height, 지나치게 긴 줄 길이 제한
- Screen-reader semantics:
  - 3단계 책 선택은 `fieldset`/`legend` 또는 명확한 라벨 구조 사용
  - 계산 결과는 `aria-live="polite"` 영역으로 갱신
  - 북마크 삭제/이동 버튼은 아이콘만 두지 않고 accessible name 제공
- Reduced motion and sensory considerations:
  - `prefers-reduced-motion`에서 slide/fade 최소화
  - toast, panel transition은 짧고 비침습적으로 유지

## Responsive behavior
- Supported breakpoints/devices:
  - 360px 이상 모바일
  - 768px 이상 태블릿
  - 1024px 이상 데스크톱
  - 1280px 이상 와이드 리더 뷰
- Layout adaptations:
  - 모바일: 상단 바 + 하단 여유 공간, 폼/카드 1열
  - 태블릿: 홈 카드 2열, 계산 폼 1열 유지
  - 데스크톱: persistent sidebar + 넓은 reader surface + 홈 2~3열 카드
- Touch/hover differences:
  - 터치 기기에서는 FAB/작은 아이콘 버튼보다 하단 고정 액션 또는 큰 버튼 우선
  - hover 의존 정보는 focus/active 상태에서도 동일하게 노출

## Interaction states
- Loading:
  - 성경 본문 로딩은 skeleton 또는 reader placeholder 사용
- Empty:
  - 기록/북마크 없음 상태에서 “다음 행동” CTA 제공
- Error:
  - alert 대신 인라인 오류 패널 + 복구 액션 제공
- Success:
  - 저장 성공은 toast + 관련 카드 상태 갱신
- Disabled:
  - 입력 부족/유효성 미충족 시 버튼 비활성화와 이유 제공
- Offline/slow network, if applicable:
  - 앱 셸과 성경 manifest만 자동 precache하고 성경 권은 사용자가 명시적으로 저장한다.
  - 저장된 권은 오프라인에서 읽고, 저장되지 않은 권은 `/offline`로 이동하는 복구 액션을 제공한다.
  - 예상 다운로드/기기 저장/사이트 전체 사용량을 서로 다른 값으로 설명한다.
  - 브라우저가 저장 공간을 회수할 수 있음을 알리고 지속 저장 상태를 표시한다.

## Content voice
- Tone: 차분하고 친절한 안내형, 과장 없는 확신
- Terminology:
  - 기존 한국어 메뉴명은 유지하되 더 설명적인 서브카피를 보강한다.
  - “장”, “북마크”, “최근 기록”, “목표” 같은 핵심 용어를 일관되게 쓴다.
- Microcopy rules:
  - 버튼은 동사형으로 통일 (`계산하기`, `저장하기`, `이어 읽기`)
  - 오류는 원인과 해결 방향을 함께 제시
  - 결과 박스는 숫자/도착 지점을 한눈에 보이게 배치

## Implementation constraints
- Framework/styling system:
  - React + Vite 유지
  - Tailwind CSS v4 + `@tailwindcss/vite`를 도입하고, shadcn/ui는 JavaScript 프로젝트 기준 `components.json`(`tsx: false`, `rsc: false`)으로 설정한다.
  - `jsconfig.json`에 `@/* -> ./src/*` alias를 정의하고, shadcn 컴포넌트는 `src/components/ui`에 둔다.
  - `src/index.css`는 Tailwind import, semantic token, base/components/utilities layer를 소유하고, `src/App.css`는 마이그레이션 중 앱 셸/레거시 레이아웃 브리지 책임만 가진 뒤 단계적으로 축소한다.
- Design-token constraints:
  - 기존 `light/dark/green` 사용자 선택 값은 유지한다.
  - Tailwind/shadcn 토큰은 `light`, `dark`, `green` 클래스와 연결해 `--bg-*`, `--fg-*`, `--accent-*` semantic token을 공급한다.
  - 토큰은 화면 하드코딩 값 대신 semantic naming 사용
- Performance constraints:
  - 성경은 권 단위 JSON을 필요할 때 로드하고 같은 권의 장 이동은 메모리에서 처리한다.
  - 전체 본문를 한 번에 메모리에 올리는 설계는 금지한다.
  - PWA 설치 시 66권 전체를 자동 다운로드하지 않는다.
- Bible source constraints:
  - `JeongWhanLee/KoreanRevisedVersion-obsidian`의 commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`에 있는 개역한글판 성경전서 1961 Markdown snapshot을 `data/bible-source/markdown`에 보존하고 canonical source로 사용한다.
  - source URL, commit SHA, 번역본 명칭, 라이선스와 파일 SHA-256을 `source-lock.json`/`SOURCE.md`에 기록한다.
  - 일반 dev/test/build는 외부 GitHub에 접속하지 않고 저장소 snapshot만 사용한다.
  - JSON은 수동 편집하지 않는 배포 산출물이며 Markdown → strict parser → reviewed correction → validation을 통해 생성한다.
  - 중복/누락/빈 절/알 수 없는 Markdown marker는 자동 보정하지 않고 빌드를 실패시킨다.
  - upstream 갱신 시 권/장/절 단위 change report를 사람이 검토한다.
- Compatibility constraints:
  - 현재 localStorage key뿐 아니라 데이터 shape도 유지한다 (`{ id, date, input, result }`, `{ id, bookName, chapter, date, time }`).
  - 마지막 읽던 위치는 별도 키 `bible_reading_progress`의 `{ bookName, chapter }` 형태로 저장하며, 손상되거나 범위를 벗어난 값은 창세기 1장으로 안전하게 대체한다.
  - 북마크를 통한 진입은 자동 저장된 마지막 위치보다 우선한다.
  - 대시보드는 route 재진입 시 항상 localStorage 최신 값을 다시 읽고, 저장/삭제 직후에도 최신 상태를 반영해야 한다.
  - 최근 추가된 `BibleBookSelect` 흐름과 `bibleData.test.js` 보장을 깨지 않는다.
- Test/screenshot expectations:
  - 사용자는 로컬에서 직접 시각 확인한다.
  - 스크린샷 검증은 필수 아님
  - 대신 빌드/린트/테스트와 수동 흐름 검증을 완료 조건으로 둔다.

## Migration plan
1. **기반 정리**
   - `DESIGN.md` 확정
   - lint baseline 범위 확정: 초기에는 `src/components/DailyCalculator.jsx`와 `vanilla_version/app.js`에서 lint 오류가 있었으나 정리했으며, 현재 전체 저장소 lint 통과 상태를 기준선으로 사용한다.
   - Tailwind CSS v4 + `@tailwindcss/vite` + shadcn/ui(JS 모드) 기본 설정
   - `jsconfig.json` alias(`@/* -> ./src/*`), `components.json`(`tsx:false`, `rsc:false`), `src/components/ui` 구조 생성
   - `src/index.css`에 semantic token/theme layer를 만들고 `src/App.css`는 임시 레이아웃 브리지 책임으로 축소 시작
2. **앱 셸 교체**
   - `src/App.jsx` 중심으로 persistent sidebar / mobile sheet / top bar 구축
   - 기존 테마/글자 크기 localStorage 연동 유지
3. **공통 계산기 패턴 정리**
   - `TargetCalculator`, `CountCalculator`, `DailyCalculator`에 공통 카드/결과/기록 구조 도입
   - 3단계 성경 선택을 공통 fieldset 패턴으로 고정
   - 기록 localStorage key와 item shape를 그대로 유지
4. **대시보드 개편**
   - 최근 기록 중심 카드 → “이어 읽기 + 최근 계산 + 빠른 시작” 구조로 재배열
   - route 재진입 시 최신 localStorage 값을 다시 읽는 refresh contract 유지
5. **로컬 데이터와 오프라인 저장 기반**
   - 확인된 GitHub commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`와 Unlicense 정보를 사용해 pinned Markdown snapshot과 source lock을 복원
   - `docs/plans/data-localization-and-integrity.md`에 따라 strict parser, 권 단위 로더, manifest, 데이터 검증을 구현
   - 앱 셸/manifest만 precache하고 권별 명시적 오프라인 저장 API를 구현
   - Google Drive 유틸과 의존성을 제거
6. **성경 뷰어와 오프라인 저장 화면 개편**
   - `E-book reader experience plan`의 1~4단계를 순서대로 적용
   - reader toolbar, 본문 타이포, 집중 모드, 북마크/위치 변경/읽기 설정 패널, chapter navigation 상태 개선
   - `/offline` 저장 요약, 권별 상태/용량, 필터, 선택 저장/삭제 화면 구현
   - 이전/다음 권 경계는 `confirm`/`alert` 대신 접근성 있는 Dialog 확인으로 고정하고, 마지막 책 마지막 장은 인라인 Alert로 안내
7. **정리 및 회귀 확인**
   - 남은 인라인 스타일 제거
   - `App.css` 축소/분리
   - 린트/테스트/빌드/수동 검증 완료

## Acceptance criteria
- 기능 보존:
  - 3단계 성경 선택은 target/count/viewer에서 모두 동작한다.
  - 책 변경 시 chapter는 항상 1장으로 reset되고, 이전/다음 권 경계 처리도 회귀 없이 동작한다.
  - 북마크 저장/이동/삭제, 계산 기록 저장/삭제, 테마/글자 크기 저장이 유지된다.
  - localStorage key뿐 아니라 북마크/계산 기록 item shape도 유지된다.
  - 대시보드는 route 재진입 시 최신 localStorage 값을 다시 읽고, 저장/삭제 직후에도 최신 상태를 반영한다.
  - 성경 뷰어의 이전/다음 장 이동과 장 로딩이 유지되고, 권 경계 이동은 Dialog 확인/인라인 Alert 패턴으로 일관화된다.
  - 성경 뷰어에서 책이나 장을 변경하면 마지막 읽던 위치가 자동 저장되고, `/viewer` 직접 재진입 시 복원된다.
  - 북마크로 진입한 경우 해당 북마크 위치가 마지막 읽던 위치보다 우선한다.
- UI 목표:
  - 데스크톱에서 내비게이션이 항상 보이거나 즉시 인지 가능하다.
  - 모바일에서 각 핵심 액션이 손가락 친화적 크기와 간격을 가진다.
  - 계산 화면 3종이 공통 레이아웃과 상태 표현을 공유한다.
  - 본문 읽기 화면은 장시간 읽기에 적합한 타이포/폭/대비를 가진다.
  - 오프라인 저장 화면에서 66권 상태, 예상 다운로드, 기기 저장 용량과 사이트 전체 사용량을 구분해 확인할 수 있다.
  - 전체 자동 다운로드 없이 권별/선택 저장과 삭제를 실행할 수 있다.
- 기술 목표:
  - React + Vite 유지
  - shadcn/ui 기반 컴포넌트 도입
  - semantic token 기반 테마 정착

## Test and verification plan
- Automated baseline / completion checks:
  - `npm test` — 66권/1,189장 및 분류 무결성과 마지막 읽기 위치 검증/저장/우선순위 로직 확인
  - `npm run build` — route/UI 리팩터 후 번들 빌드 확인
  - `npm run lint` — JSX/Hook/style 정리 후 정적 검증
- Manual flow checks:
  - 홈에서 각 화면으로 이동 가능
  - target/count에서 시작/끝 책을 3단계로 선택 가능
  - target/count/viewer에서 책 변경 시 chapter가 1장으로 reset 되는지 확인
  - 시작/끝 경계(창세기 1장 이전 없음, 요한계시록 마지막 장 이후 없음) 처리와 권 경계 Dialog/인라인 Alert가 맞는지 확인
  - daily 계산 결과 저장/삭제 가능
  - viewer에서 책/장 변경, 이전/다음 이동, 북마크 저장/로드/삭제 가능
  - viewer 직접 재진입 시 마지막 읽던 책/장이 복원되고, 북마크 진입 시 북마크가 우선되는지 확인
  - 북마크와 계산 기록의 localStorage item shape가 기존 구조와 동일한지 확인
  - 대시보드가 route 재진입 및 저장/삭제 후 최신 값으로 다시 렌더되는지 확인
  - light/dark/green 전환과 글자 크기 변경이 새로고침 후 유지
  - 모바일(360~430px), 태블릿(768px), 데스크톱(1024px+)에서 레이아웃 붕괴 없음
- Verified baseline at plan time:
  - 2026-07-22 기준 `npm test` 통과: 7 tests
  - 2026-07-22 기준 `npm run build` 통과
  - 2026-07-22 기준 `npm run lint` 통과

## Risks and rollback criteria
- Risks:
  - Tailwind/shadcn 도입 시 기존 전역 CSS와 충돌 가능
  - App shell 교체 중 라우트 접근성이 일시적으로 깨질 가능성
  - 뷰어 리팩터 중 북마크/장 이동 회귀 가능
- Mitigations:
  - 화면 단위로 순차 마이그레이션하고 기존 localStorage key + data shape 계약을 유지한다.
  - `BibleBookSelect`와 `bibleData.test.js`를 회귀 방지 기준으로 삼는다.
  - 공통 컴포넌트 도입 전후에 동일한 수동 흐름 체크리스트를 사용한다.
- Rollback criteria:
  - 3단계 성경 선택이 한 화면이라도 깨지면 해당 단계 롤백
  - 북마크 복귀/계산 기록 저장 중 하나라도 실패하면 해당 화면 리팩터 롤백
  - `npm test`, `npm run build`, `npm run lint` 중 하나라도 실패한 상태에서는 다음 단계 진행 금지
  - 데스크톱 기본 탐색성이 현재보다 나빠지면 앱 셸 변경을 재조정

## Open questions
- [ ] heading/body/scripture 폰트를 실제 배포 자산으로 어떻게 제공할지(웹폰트 vs self-host) 결정 필요 / owner: implementation / impact: medium
- [ ] green 테마를 현재 이름 그대로 유지할지, UI 라벨만 “편안한 읽기” 등으로 바꿀지 결정 필요 / owner: product / impact: low
- [x] 성경 본문 공급원은 로컬 데이터로 확정하고 미사용 Google Drive 유틸과 의존성을 제거한다 / owner: data workstream / impact: medium
- [x] 원본은 `JeongWhanLee/KoreanRevisedVersion-obsidian` commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`, 개역한글판 성경전서 1961, repository Unlicense로 확정했다 / owner: product-data / impact: high
- [ ] 홈 화면에 “진행률” 개념을 넣을지, 현재처럼 최근 기록 중심으로 둘지 결정 필요 / owner: product / impact: medium
