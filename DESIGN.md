# Design

## Source of truth
- Status: Draft
- Last refreshed: 2026-07-22
- Primary product surfaces: 앱 셸(`src/App.jsx`), 대시보드(`src/components/Dashboard.jsx`), 목표 계산기(`src/components/TargetCalculator.jsx`), 분량 계산기(`src/components/CountCalculator.jsx`), 1년 회독 계산기(`src/components/DailyCalculator.jsx`), 성경 뷰어(`src/components/BibleViewer.jsx`)
- Evidence reviewed:
  - `package.json` — React 19 + Vite 7 + `react-router-dom` 7 유지, 테스트 스크립트 추가됨
  - `src/App.jsx`, `src/App.css`, `src/index.css` — 전역 CSS와 인라인 스타일 중심의 현재 UI 구조
  - `src/components/Dashboard.jsx` — 최근 계산/북마크 요약 대시보드
  - `src/components/TargetCalculator.jsx`, `src/components/CountCalculator.jsx`, `src/components/DailyCalculator.jsx` — 계산기 3종과 localStorage 저장 흐름
  - `src/components/BibleViewer.jsx` — 장 단위 lazy load, 북마크, 이전/다음 장 이동
  - `src/components/BibleBookSelect.jsx` — 최근 추가된 3단계 성경 선택 UI
  - `src/data/bibleData.js`, `src/data/bibleData.test.js` — 66권/1,189장 보존 및 구약/신약/분류 메타데이터 검증
  - `src/utils/googleDrive.js` — 현재 주요 화면 흐름에서 사용되지 않는 보조 유틸
  - `git status` 기준 미커밋 변경 — 3단계 성경 분류 도입과 관련 테스트/스타일 확장 진행 중
- Observed facts:
  - 현재 라우트는 `/`, `/target`, `/count`, `/daily`, `/viewer` 5개다.
  - UI 상태는 `app_theme`, `app_font_size`, `target_history`, `count_history`, `daily_history`, `bible_bookmarks`를 localStorage에 저장한다.
  - 기록 데이터 shape는 `target_history[]`, `count_history[]`, `daily_history[]`의 `{ id, date, input, result }`, `bible_bookmarks[]`의 `{ id, bookName, chapter, date, time }` 구조다.
  - `Dashboard`는 현재 마운트 시 localStorage를 다시 읽고 `storage` 이벤트를 구독한다. 리디자인 이후에도 route 재진입 시 최신 localStorage 값을 다시 읽는 동작을 보장해야 한다.
  - 성경 본문은 `src/data/json/**`에서 장 단위로 lazy import 된다.
  - 최근 변경으로 “구약/신약 → 분류 → 성경” 3단계 선택이 계산기와 뷰어에 반영되었고, 이 흐름은 반드시 유지되어야 한다.

## Current product snapshot
- 강점:
  - 기능이 이미 분리되어 있고 라우트 기반이라 단계적 UI 교체가 가능하다.
  - localStorage 기반 저장/복원 덕분에 빠른 재진입 경험이 있다.
  - 성경 본문이 장 단위 코드 스플릿 구조라 뷰어 확장 여지가 좋다.
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
- Core routes/screens:
  - 홈: 최근 기록, 북마크, 빠른 진입
  - 목표 계산기: 시작 지점 + 읽을 장 수 → 마지막 지점
  - 분량 계산기: 시작 지점 + 끝 지점 → 총 장 수
  - 1년 회독 계산기: 목표 회독 수 → 하루 필요 장 수
  - 성경 뷰어: 3단계 책 선택 + 장 선택 + 본문 + 북마크
- Content hierarchy:
  - 1순위: 오늘 이어서 읽기 / 계산 결과 / 현재 선택 중인 성경 위치
  - 2순위: 최근 저장 기록 / 히스토리 관리
  - 3순위: 테마, 글자 크기, 부가 설정

### Core user flows
1. **읽던 곳으로 복귀**
   - 홈 진입 → 최근 북마크 카드 선택 → 성경 뷰어에서 해당 장 로드 → 이전/다음 장 이동 → 북마크 갱신
2. **오늘 읽을 도착 지점 계산**
   - 홈 또는 내비게이션 → 어디까지 읽을까 → 3단계로 시작 책 선택 → 시작 장/읽을 장 수 입력 → 결과 확인 → 기록 저장
3. **구간 분량 확인**
   - 총 몇 장인가 → 시작/끝 지점을 각각 3단계로 선택 → 결과 확인 → 기록 저장
4. **연간 목표 페이스 산정**
   - 하루 페이스 → 연간 회독 수 입력 → 일일 장 수 확인 → 기록 저장

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
  - 본문은 정적 번들 기반이므로 네트워크보다 첫 로드/캐시 상태를 우선 고려
  - PWA 캐시와 로컬 데이터가 충돌하지 않도록 UI 메시지 단순화

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
  - 성경 본문 장 단위 lazy load 구조를 유지한다.
  - 전체 본문를 한 번에 메모리에 올리는 설계는 금지한다.
- Compatibility constraints:
  - 현재 localStorage key뿐 아니라 데이터 shape도 유지한다 (`{ id, date, input, result }`, `{ id, bookName, chapter, date, time }`).
  - 대시보드는 route 재진입 시 항상 localStorage 최신 값을 다시 읽고, 저장/삭제 직후에도 최신 상태를 반영해야 한다.
  - 최근 추가된 `BibleBookSelect` 흐름과 `bibleData.test.js` 보장을 깨지 않는다.
- Test/screenshot expectations:
  - 사용자는 로컬에서 직접 시각 확인한다.
  - 스크린샷 검증은 필수 아님
  - 대신 빌드/린트/테스트와 수동 흐름 검증을 완료 조건으로 둔다.

## Migration plan
1. **기반 정리**
   - `DESIGN.md` 확정
   - lint baseline 범위 확정: 현재 `npm run lint`는 `src/components/DailyCalculator.jsx`의 `react-hooks/set-state-in-effect`와 `vanilla_version/app.js`의 unused globals 3건으로 실패하므로, 리디자인 대상 lint baseline을 `src/**` 중심으로 정리하거나 `vanilla_version/**`를 reference snapshot으로 ESLint 대상에서 제외하는 결정을 먼저 문서화한다.
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
5. **성경 뷰어 개편**
   - reader toolbar, 본문 타이포, 북마크 패널, chapter navigation 상태 개선
   - 이전/다음 권 경계는 `confirm`/`alert` 대신 접근성 있는 Dialog 확인으로 고정하고, 마지막 책 마지막 장은 인라인 Alert로 안내
6. **정리 및 회귀 확인**
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
- UI 목표:
  - 데스크톱에서 내비게이션이 항상 보이거나 즉시 인지 가능하다.
  - 모바일에서 각 핵심 액션이 손가락 친화적 크기와 간격을 가진다.
  - 계산 화면 3종이 공통 레이아웃과 상태 표현을 공유한다.
  - 본문 읽기 화면은 장시간 읽기에 적합한 타이포/폭/대비를 가진다.
- 기술 목표:
  - React + Vite 유지
  - shadcn/ui 기반 컴포넌트 도입
  - semantic token 기반 테마 정착

## Test and verification plan
- Automated baseline / completion checks:
  - `npm test` — `src/data/bibleData.test.js`로 66권/1,189장 및 분류 무결성 확인
  - `npm run build` — route/UI 리팩터 후 번들 빌드 확인
  - `npm run lint` — JSX/Hook/style 정리 후 정적 검증
- Manual flow checks:
  - 홈에서 각 화면으로 이동 가능
  - target/count에서 시작/끝 책을 3단계로 선택 가능
  - target/count/viewer에서 책 변경 시 chapter가 1장으로 reset 되는지 확인
  - 시작/끝 경계(창세기 1장 이전 없음, 요한계시록 마지막 장 이후 없음) 처리와 권 경계 Dialog/인라인 Alert가 맞는지 확인
  - daily 계산 결과 저장/삭제 가능
  - viewer에서 책/장 변경, 이전/다음 이동, 북마크 저장/로드/삭제 가능
  - 북마크와 계산 기록의 localStorage item shape가 기존 구조와 동일한지 확인
  - 대시보드가 route 재진입 및 저장/삭제 후 최신 값으로 다시 렌더되는지 확인
  - light/dark/green 전환과 글자 크기 변경이 새로고침 후 유지
  - 모바일(360~430px), 태블릿(768px), 데스크톱(1024px+)에서 레이아웃 붕괴 없음
- Verified baseline at plan time:
  - 2026-07-22 기준 `npm test` 통과
  - 2026-07-22 기준 `npm run build` 통과
  - 2026-07-22 기준 `npm run lint` 실패: `src/components/DailyCalculator.jsx`의 `react-hooks/set-state-in-effect` 1건, `vanilla_version/app.js`의 `no-unused-vars` 3건

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
- [ ] Google Drive 유틸을 향후 복귀 기능으로 연결할지, 현 단계에서는 완전히 비노출로 둘지 결정 필요 / owner: product / impact: medium
- [ ] 홈 화면에 “진행률” 개념을 넣을지, 현재처럼 최근 기록 중심으로 둘지 결정 필요 / owner: product / impact: medium
