# Local Bible Data Workstream Plan

## Status
- State: Completed — explicit offline library and legacy cleanup complete
- Last updated: 2026-07-24
- Owner scope: Bible content source, conversion, validation, loading, caching, and Google Drive removal
- Consumer: E-book viewer workstream in `docs/plans/ebook-reader-viewer.md`

### Implementation progress
- [x] Phase 0: pinned Markdown snapshot vendored
- [x] Phase 0: upstream source/license documentation added
- [x] Phase 0: per-file SHA-256 lock generated
- [x] Phase 0: local source verifier and regression tests added
- [x] Phase 1: strict verse parser and source structure validation added
- [x] Phase 1: deterministic recovery and omission regression tests added
- [x] Phase 2: legacy JSON comparison report generated
- [x] Phase 2: review 33 blocking source issues and approve structural corrections
- [x] Phase 2: independently verify all 61 legacy JSON differences against source Markdown
- [x] Phase 3: deterministic 66-book bundling and manifest generation
- [x] Phase 4: runtime repository loader and request/cache validation
- [x] Phase 5: exclude all book payloads from automatic PWA precache
- [x] Phase 5: explicit per-book offline storage, usage UI, and repository cache reuse
- [x] Phase 6: replace Vite glob loading and cancel stale viewer requests
- [x] Phase 7: remove Google Drive and legacy JSON remnants

## Requirements summary
- Google Drive를 성경 본문 공급원으로 사용하지 않고 저장소에 포함된 로컬 데이터를 유일한 런타임 공급원으로 확정한다.
- 원본 GitHub Markdown의 고정된 snapshot을 canonical source로 보존하고 출처 URL, commit, 라이선스와 파일 hash를 기록한다.
- JSON은 직접 관리하거나 수정하는 원본이 아니라 검증된 Markdown에서 언제든 동일하게 재생성되는 배포 산출물로 취급한다.
- 고정된 Markdown에서 권 단위 66개 배포 JSON을 생성해 장 이동 시 추가 네트워크 요청이 발생하지 않게 한다.
- 뷰어가 물리적인 파일 경로나 Vite의 `import.meta.glob()`에 의존하지 않도록 데이터 저장소 인터페이스를 제공한다.
- 현재 확인된 빈 절, 합쳐진 절, Markdown 표식 잔여물을 정리하고 다시 발생하지 않도록 검증을 자동화한다.
- PWA 설치 시 성경 전체를 자동 precache하지 않고, 사용자가 선택한 권만 명시적인 오프라인 캐시에 저장한다.
- 사용자가 권별 예상 다운로드 용량, 실제 저장 상태, 저장된 용량과 사이트 전체 저장 사용량을 확인할 수 있는 메타데이터와 저장소 API를 제공한다.

## Evidence and current constraints
- Upstream source: `https://github.com/JeongWhanLee/KoreanRevisedVersion-obsidian.git`
- Pinned snapshot: `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a` (`main`, 2021-10-08)
- Translation: 개역한글판 성경전서 1961
- Repository license: Unlicense. Upstream README는 해당 개역한글판의 저작권이 2012년에 만료되었다고 명시한다.
- Pinned snapshot의 `KoreanRevisedVersion/**`에는 66개 권 디렉터리와 Markdown 1,255개가 있다. 이 중 1,189개는 장 본문이고 66개는 권별 navigation/index 파일이다.
- 위 snapshot과 legacy `src/data/json/**` 사이의 parity는 보존된 `docs/reports/bible-source-change-report.{md,json}` 감사 산출물로 확인했다. legacy snapshot 자체는 Phase 7에서 제거됐다.
- 전환 전 `BibleViewer`는 `import.meta.glob('../data/json/**/*.json')`과 파일명 검색에 의존했다. 현재는 `loadBibleChapter()`만 호출한다.
- 현재 장 로딩 effect는 `AbortController`로 이전 선택을 취소하며, 취소를 오류 UI로 표시하지 않는다.
- 현재 Workbox 결과는 precache 12개이며 `bible/manifest.json` 1개, `bible/books/*.json` 0개다.
- historical audit note: legacy converter와 snapshot 차이는 `docs/reports/bible-source-change-report.{md,json}`에 보존돼 있다.
- 데이터 점검 결과:
  - 66권, 1,189장, 31,101개 절 슬롯
  - 장별 JSON 1,189개와 사용하지 않는 빈 권별 placeholder 66개
  - 빈 절 슬롯 17개
  - 숫자를 포함한 잔여 절 표식 16개
  - 숫자 없는 `######` 서식 표식 29개
  - 마가복음 9장 28절 본문은 원본의 절 표식과 같은 줄에 있으며 strict parser가 본문을 보존해 복구한다.

## Architecture decision

### Canonical source
- `data/bible-source/markdown/**`에 `JeongWhanLee/KoreanRevisedVersion-obsidian`의 commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`에서 가져온 `KoreanRevisedVersion/**` snapshot을 보존한다.
- 애플리케이션 빌드는 GitHub 네트워크 상태나 upstream 기본 브랜치에 의존하지 않는다.
- `data/bible-source/source-lock.json`에 다음을 기록한다.
  - upstream repository URL
  - 고정 commit SHA
  - 가져온 날짜
  - 라이선스와 원문 배포 조건
  - 대상 Markdown 파일 목록과 SHA-256
- `data/bible-source/SOURCE.md`에 사람이 읽을 수 있는 출처, 번역본 명칭, 라이선스, 업데이트 방법을 기록한다.
- upstream 전체 Git history를 submodule로 포함하기보다 필요한 Markdown snapshot만 vendor한다.
  - submodule 초기화 누락으로 빌드가 실패하는 것을 피한다.
  - upstream 갱신은 별도 `sync:bible-source` 명령으로만 수행한다.
- legacy `src/data/json/**` snapshot은 parity audit 후 제거됐고, canonical source에는 포함되지 않는다.

### Conversion pipeline
- 변환 단계:

```text
pinned Markdown snapshot
  -> source hash verification
  -> strict verse parser
  -> reviewed structural corrections
  -> canonical in-memory model
  -> integrity validation
  -> 66 book JSON + manifest
  -> change report
```

- 현재처럼 정규식 하나로 줄 시작만 읽지 않는다.
- parser는 한 줄 중간의 `###### <verse>`도 토큰화하되 다음 조건을 강제한다.
  - 권/장 안에서 절 번호가 1부터 순차적으로 증가
  - 중복, 역순, 누락, 빈 절은 hard error
  - 숫자 없는 `######`는 자동 삭제하지 않고 검토가 필요한 오류로 보고
  - navigation 링크와 Markdown 장식은 허용 목록에 포함된 패턴만 제거
- 일반 Markdown AST parser만으로 문제를 해결했다고 가정하지 않는다. upstream에 인라인 heading 형태가 있으므로 성경 절 표식용 검증 parser를 별도로 둔다.
- `data/bible-source/corrections.json`은 자동 파싱으로 해결할 수 없는 검토된 예외만 보관한다.
  - 각 항목은 권/장/절, 원본 파일 hash, 정확한 줄과 구조 token, 이유, 고정 commit, 검토일을 포함한다.
  - 현재 승인 항목은 `말라가` 장 제목 alias 4건과 요한계시록 1–3장의 비숫자 heading을 현재 절의 continuation으로 강등하는 29건이다.
  - correction은 원본 파일 전체 SHA-256과 path/line/raw token이 모두 일치할 때만 적용한다.
  - 본문을 추측해 채우는 correction은 허용하지 않는다.
- 변환 결과 JSON은 수동 편집하지 않는다. 수정은 Markdown snapshot, parser 또는 근거가 기록된 correction에서만 한다.

### Generated delivery format
- 빌드 전에 `public/bible/books/<NN>-<contentHash>.json` 66개와 `public/bible/manifest.json`을 생성한다.
- 파일명은 Unicode 경로와 정규화 문제를 피하기 위해 ASCII 권 ID와 내용 해시를 사용한다.
- 내용 해시가 바뀌면 URL도 바뀌므로 저장된 이전 버전과 업데이트가 필요한 권을 명확히 구분할 수 있다.
- 권 파일 스키마:

```json
{
  "schemaVersion": 1,
  "bookId": 1,
  "bookName": "창세기",
  "chapters": [
    ["1절", "2절"],
    ["1절", "2절"]
  ]
}
```

- manifest 항목 스키마:

```json
{
  "schemaVersion": 1,
  "generatedFrom": "local-bible-source-v1",
  "totals": {
    "books": 66,
    "chapters": 1189,
    "rawBytes": 4673952,
    "gzipBytes": 1341677
  },
  "books": [
    {
      "bookId": 1,
      "bookName": "창세기",
      "chapters": 50,
      "url": "/bible/books/01-<contentHash>.json",
      "contentHash": "<contentHash>",
      "rawBytes": 220621,
      "gzipBytes": 62443
    }
  ]
}
```

- 생성 파일은 원본이 아니라 빌드 산출물이다. `.gitignore`에 추가하고 `predev`, `prebuild`에서 항상 재생성한다.
- 생성기는 기존 파일을 덮어쓰기 전에 전체 원본 검증을 통과해야 한다.
- UI의 “예상 다운로드 용량”은 `gzipBytes`, “저장 후 차지하는 용량”은 `rawBytes`를 기본값으로 사용하되 실제 캐시 응답 크기를 측정할 수 있으면 그 값을 우선한다.

### Runtime repository contract
- 새 모듈: `src/data/bibleRepository.js`
- 뷰어에 공개할 계약:

```js
loadBibleChapter(bookName, chapter, { signal } = {})
// Promise<{ bookName: string, chapter: number, verses: string[] }>
```

- 동작 계약:
  - 존재하지 않는 권/장은 네트워크 요청 전에 명시적 오류를 반환한다.
  - 최초 접근 시 해당 권 JSON 한 개만 `fetch`한다.
  - 같은 세션에서 같은 권은 Promise/결과 캐시를 재사용한다.
  - `AbortSignal`이 취소되면 결과를 UI 상태에 반영하지 않는다.
  - 응답의 `schemaVersion`, `bookName`, 장 수, 절 배열을 검증한다.
  - 빈 문자열, 문자열이 아닌 절, `######` 잔여물이 있으면 데이터 오류로 취급한다.

### PWA policy
- 앱 셸과 `manifest.json`만 precache한다.
- 성경 권 데이터는 자동 precache 대상에서 명시적으로 제외한다.
- 일반 온라인 읽기는 `fetch`와 세션 메모리 캐시를 사용하며, 지속적인 Cache Storage 저장은 사용자 액션으로만 수행한다.
- 명시적 오프라인 저장은 버전이 고정된 전용 캐시 `bible-offline-v1`이 소유한다.
- 전체 성경 저장은 “전체 선택” 액션으로 제공할 수 있지만 예상 다운로드 약 1.28MiB, 저장 공간 약 4.46MiB를 먼저 표시하고 사용자가 실행해야 한다.
- 브라우저 저장 정책에 따라 캐시가 제거될 수 있으므로 `navigator.storage.persisted()` 상태를 표시하고 사용자가 원할 때만 `navigator.storage.persist()`를 요청한다.

### Offline storage contract
- 새 모듈: `src/data/bibleOfflineStorage.js`
- UI에 공개할 계약:

```js
loadBibleManifest({ signal } = {})
listOfflineBibleBooks()
downloadBibleBook(bookId, { signal } = {})
removeOfflineBibleBook(bookId)
getBibleStorageSummary()
requestPersistentBibleStorage()
```

- 상태 모델:
  - `not-saved` — 명시적 오프라인 캐시에 없음
  - `downloading` — 다운로드 진행 중
  - `saved` — 현재 manifest의 content hash와 일치하는 응답이 저장됨
  - `update-available` — 같은 권의 이전 content hash가 저장됨
  - `error` — 다운로드, 검증 또는 캐시 저장 실패
- `getBibleStorageSummary()`는 다음을 구분한다.
  - manifest 기준 전체 성경 예상 다운로드/저장 크기
  - 명시적으로 저장된 성경 권 수와 실제 캐시 본문 합계
  - `navigator.storage.estimate()` 기준 이 사이트 전체 사용량과 quota
- origin 전체 사용량에는 앱 셸, localStorage, 다른 캐시가 포함될 수 있으므로 성경 캐시 용량과 같은 값으로 표시하지 않는다.

## Work breakdown

### 0. Restore and lock the upstream source
Files:
- Add `data/bible-source/markdown/**`
- Add `data/bible-source/source-lock.json`
- Add `data/bible-source/SOURCE.md`
- Add `scripts/sync-bible-source.js`

Tasks:
- 확인된 upstream URL과 commit `6fefd61b1e5a7601ab9bc8ded3e147df68b0f86a`를 lock metadata에 기록한다.
- 해당 commit의 `KoreanRevisedVersion/**` Markdown만 snapshot으로 가져온다.
- 파일별 SHA-256과 source metadata를 lock file에 기록한다.
- 번역본 명칭 “개역한글판 성경전서 1961”, upstream의 저작권 만료 설명과 Unlicense 원문을 `SOURCE.md`에 기록한다.
- 1,189개 장 파일과 66개 navigation/index 파일을 분류하고, navigation/index 파일은 본문 생성 입력에서 제외한다.
- `sync:bible-source`는 명시적으로 실행할 때만 네트워크를 사용하고 commit 미지정 상태를 거부한다.
- 일반 `dev`, `test`, `build`는 저장소 snapshot만 사용하며 네트워크를 요청하지 않는다.

Stop condition:
- 고정 commit의 hash 검증이나 파일별 SHA-256 검증이 실패하면 변환을 시작하지 않는다.
- upstream에 없는 본문을 다른 번역본이나 출처에서 임의로 가져오지 않는다.

### 1. Replace the converter and lock parser behavior
Files:
- Replace `convert_md_to_json.js` with focused scripts under `scripts/`
- Add `scripts/parse-bible-markdown.js`
- Add `scripts/validate-bible-source.js`
- Add `src/data/bibleContent.test.js`
- Add parser fixtures under `test/fixtures/bible-source/`
- Update `package.json`

Tasks:
- 정상 heading, 인라인 절 heading, navigation 줄, 줄바꿈 본문을 fixture로 고정한다.
- 중복 절, 누락 절, 빈 절, 숫자 없는 marker가 반드시 실패하는 fixture를 추가한다.
- 현재 발견된 여호수아 8장, 요한복음 21장, 요한계시록 2장 사례를 회귀 fixture로 포함한다.
- 66개 권 디렉터리와 `bibleData` 순서가 일치하는지 검증한다.
- parser가 생성한 각 권의 장 수가 `book.chapters`와 일치하는지 검증한다.
- canonical model의 모든 장이 `{ verses: string[] }`와 동등한 구조인지 검증한다.
- 빈 절, 공백 절, `######`, 비문자열 절을 실패 처리한다.
- 예상 총 장 수 1,189를 검증한다.
- 권별 파일 생성 결과가 원본 장 배열과 동일한지 검증한다.

### 2. Regenerate and review current content defects
Files:
- `data/bible-source/markdown/**`
- `data/bible-source/corrections.json`
- Generated comparison report

Tasks:
- 고정된 Markdown snapshot을 새 parser로 변환한다.
- 현재 JSON과 새 canonical model을 권/장/절 단위로 비교하는 report를 생성한다.
- 숫자 표식이 남은 16개 항목이 올바른 절로 분리되는지 확인한다.
- 숫자 없는 `######` 29개는 검토된 path/line/hash allowlist와 일치할 때만 현재 절 continuation으로 처리한다.
- 빈 절 17개를 재검사하고 upstream 원문에 존재하는 본문이 모두 복원되는지 확인한다.
- 마가복음 9장 28절은 동일 줄의 숫자 marker 뒤에 있는 본문을 parser가 그대로 보존한다.
- 변경 report에는 추가/삭제/수정된 절과 전후 문자열을 모두 남겨 사람이 검토할 수 있게 한다.

Result:
- content validation: 66권, 1,189장, 31,101절, hard error 0
- reviewed warnings: deterministic parser recovery 17건, approved structural correction 33건, omission literal 11건
- legacy JSON differences: 61절. 독립 검증에서 split marker 영향 32절, inline text 1절, 요한계시록 marker 영향 28절로 전부 설명됐으며 예상 밖 본문 변경은 0건이다.

Stop condition:
- 승인된 원본을 확보하지 못한 절은 추측하여 작성하지 않는다.
- 나머지 구조/로더 작업은 계속할 수 있지만 데이터 무결성 완료 판정은 보류한다.

### 3. Add deterministic book bundling
Files:
- Add `scripts/build-bible-books.js`
- Update `.gitignore`
- Update `package.json`

Tasks:
- `bibleData`의 정규 순서를 기준으로 66개 권 파일을 생성한다.
- 입력은 pinned Markdown을 parser로 변환한 canonical in-memory model이며 legacy JSON을 읽지 않는다.
- 임시 디렉터리에 생성 및 검증한 뒤 `public/bible/books`로 교체해 부분 생성 상태를 방지한다.
- `predev`와 `prebuild`에서 생성기를 실행한다.
- 생성 결과에 `schemaVersion`, `bookId`, `bookName`, `chapters`를 기록한다.
- 각 권 파일의 content hash, raw bytes, gzip bytes를 계산해 manifest에 기록한다.
- manifest에 전체 권/장 수와 raw/gzip 합계를 기록한다.
- 빌드 시각처럼 매번 바뀌는 값은 포함하지 않아 재현 가능한 결과를 만든다.

Result:
- `npm run build:bible`이 66권, 1,189장, 31,101절을 생성한다.
- 전체 크기는 raw 4,732,318 bytes, deterministic gzip 1,322,873 bytes다.
- 동일 입력으로 두 번 생성한 67개 JSON(manifest + 66권)의 SHA-256 목록이 완전히 동일하다.
- 생성 파일은 `public/bible/`에 위치하지만 `.gitignore` 대상이며 `predev`/`prebuild`에서 재생성한다.

### 4. Introduce the repository loader
Files:
- Add `src/data/bibleRepository.js`
- Add `src/data/bibleRepository.test.js`

Tasks:
- 권명과 장 번호를 검증하는 순수 함수를 분리한다.
- manifest에서 권 ID에 대응하는 content-hashed URL을 찾아 fetch한다.
- 권 단위 메모리 캐시를 구현한다.
- 중복 동시 요청은 같은 Promise를 공유한다.
- 실패한 Promise는 캐시에서 제거해 재시도가 가능하게 한다.
- AbortError와 데이터 오류를 구분한다.
- 뷰어가 사용자에게 표시할 수 있는 안정적인 오류 코드 또는 오류 타입을 제공한다.

Result:
- manifest와 권 payload의 schema, 순서, 장 수, hash/size metadata, 절 문자열을 검증한다.
- 같은 권의 동시 요청과 장 이동은 하나의 권 fetch를 공유한다.
- 실패한 권 요청은 캐시에서 제거되어 재시도할 수 있다.
- 호출자 취소는 공유 요청을 손상시키지 않고 해당 호출에만 `AbortError`를 반환한다.

### 5. Add explicit offline storage management — completed
Files:
- Add `src/data/bibleOfflineStorage.js`
- Add `src/data/bibleOfflineStorage.test.js`
- Update `vite.config.js`

Tasks:
- 앱 셸과 manifest만 precache하고 66개 권 파일은 제외한다.
- `bible-offline-v1` 캐시에서 저장 상태를 content hash 기준으로 판별한다.
- 권별 다운로드, 삭제, 업데이트, 전체 선택 작업을 구현한다.
- 다운로드 취소 시 부분 응답을 캐시에 남기지 않는다.
- 저장 전후 실제 cached response 크기를 계산한다.
- `navigator.storage.estimate()`, `persisted()`, `persist()`를 지원 여부와 함께 감싼다.
- Cache Storage 또는 StorageManager를 지원하지 않는 환경에 명확한 fallback 상태를 제공한다.

Result:
- `/offline`에서 66권의 저장 상태, 예상 다운로드, 저장 후 예상, 실제 캐시 크기를 함께 확인한다.
- 권별 및 선택 저장/삭제, 구약·신약·전체 빠른 선택, 검색/상태 필터를 제공한다.
- 선택 저장은 동시에 최대 3권을 처리하고 진행 중인 fetch를 취소할 수 있다.
- `bible-offline-v1`은 현재 content-addressed URL과 이전 hash URL을 구분하며 업데이트 필요 상태를 표시한다.
- repository는 현재 manifest URL의 전용 캐시 응답을 우선 사용하고, 캐시 미지원/조회 실패 시 온라인 fetch로 복구한다.

### 6. Replace Vite glob loading
Files:
- Update `src/components/BibleViewer.jsx`
- Update `vite.config.js`

Tasks:
- `import.meta.glob()`과 파일명 검색 로직을 제거한다.
- `loadBibleChapter()`만 사용해 본문을 가져온다.
- effect cleanup에서 이전 요청을 취소한다.
- 취소된 요청은 오류 UI를 표시하지 않는다.
- 빠르게 책/장을 변경해도 마지막 선택의 본문만 반영되는지 확인한다.
- PWA precache에 권 데이터가 포함되지 않고 manifest와 앱 셸만 포함되는지 확인한다.
- 명시적으로 저장된 권은 오프라인에서 repository가 전용 캐시 응답을 사용하도록 연결한다.

Result:
- `src/**`와 `vite.config.js`에서 `import.meta.glob`, `src/data/json`, `data/json` 런타임 참조가 0건이다.
- production build의 성경 장 JavaScript 청크는 0개다.
- Workbox precache는 1,262개에서 12개로 감소했고 성경 권 JSON은 0개, 데이터 manifest는 1개다.
- 전용 오프라인 캐시 연결을 완료했다.

### 7. Remove Google Drive remnants
Files:
- Delete `src/utils/googleDrive.js`
- Delete `src/data/json/**`
- Delete legacy comparison tooling (`convert_md_to_json.js`, `scripts/bible-source-change-report-lib.mjs`, `scripts/generate-bible-source-change-report.mjs`)
- Update `package.json`
- Update `package-lock.json`
- Update `DESIGN.md`

Tasks:
- 사용되지 않는 `gapi-script` 의존성을 제거한다.
- Google OAuth client ID와 동적 스크립트 로딩 코드를 제거한다.
- legacy `src/data/json/**` snapshot과 이를 재생성/비교하던 실행 경로를 제거한다.
- 감사 근거로 남길 `docs/reports/bible-source-change-report.{md,json}`는 역사 기록으로 유지한다.
- `DESIGN.md`의 Google Drive open question을 “로컬 데이터 확정” 결정으로 닫는다.
- 저장소 전체에서 `gapi`, Google Drive scope, client ID 참조가 0건인지 확인한다.

Result:
- `src/utils/googleDrive.js`, `src/data/json/**`, `convert_md_to_json.js`, legacy change-report generator/test를 제거했다.
- `gapi-script` 의존성과 관련 lock entry를 제거했다.
- historical parity evidence는 `docs/reports/bible-source-change-report.{md,json}`에만 남기고 활성 toolchain에서는 legacy JSON 비교를 제거했다.

## Acceptance criteria
- `data/bible-source/markdown/**`와 source lock이 유일한 canonical 입력이다.
- parser 결과가 정확히 66권, 1,189장이며 모든 장의 `verses`가 비어 있지 않은 문자열 배열이다.
- legacy `src/data/json/**`은 제거됐고 런타임과 빌드 어디에서도 참조하지 않는다.
- 빈 권별 placeholder를 포함한 불필요한 JSON 출력이 생성되지 않는다.
- 빈 절, 공백 절, `######` 표식이 각각 0건이다.
- `npm run build:bible`이 66개 권 파일을 재현 가능하게 생성한다.
- clean checkout에서 네트워크 없이 pinned Markdown만으로 동일한 66개 권 파일과 manifest를 생성한다.
- `source-lock.json`의 모든 Markdown SHA-256이 실제 snapshot과 일치한다.
- source URL, commit, 번역본 명칭과 라이선스가 `SOURCE.md`에 기록된다.
- 변환 중 중복/누락/빈 절/알 수 없는 marker가 하나라도 있으면 빌드가 실패한다.
- generated JSON을 직접 수정하지 않아도 source/parser/correction만으로 결과가 재현된다.
- upstream snapshot 갱신 시 parser/correction 검증이 선행되며, 남겨둔 legacy parity report는 역사 기록으로만 사용된다.
- 생성된 66개 권 파일의 전체 장 수가 1,189이고 원본과 절 순서가 동일하다.
- manifest의 권별 raw/gzip 크기 합계가 실제 생성 파일 계산과 일치한다.
- `BibleViewer`는 `import.meta.glob()`이나 물리적 데이터 경로 검색을 사용하지 않는다.
- 동일 권에서 장을 이동할 때 추가 fetch가 발생하지 않는다.
- 빠른 장 변경 시 이전 요청 결과가 현재 장을 덮어쓰지 않는다.
- `dist/assets`에 1,189개 성경 장 JavaScript 청크가 생성되지 않는다.
- PWA precache에 성경 권 파일이 0개이고 manifest만 포함된다.
- 사용자가 저장하지 않은 권은 `bible-offline-v1`에 존재하지 않는다.
- 권별 저장/삭제/업데이트 후 상태와 표시 용량이 실제 캐시 내용과 일치한다.
- 전체 선택 전 예상 다운로드 및 저장 용량이 표시되고 명시적 실행 전에는 다운로드가 시작되지 않는다.
- 오프라인 상태에서 저장된 권은 읽을 수 있고 저장하지 않은 권은 복구 가능한 안내를 표시한다.
- origin 전체 사용량과 오프라인 성경 용량이 별도 항목으로 제공된다.
- 저장소의 활성 코드/스크립트 경로에서 `googleDrive`, `gapi-script`, Google Drive OAuth scope 참조가 0건이다.
- `npm test`, `npm run lint`, `npm run build`, `git diff --check`가 통과한다.

## Verification steps
1. `npm test`
2. `npm run verify:bible-source` — lock hash, source metadata, parser invariant 확인
3. `npm run build:bible`
4. 두 번 연속 생성한 66개 권 파일과 manifest hash가 동일한지 확인
5. legacy JSON 대비 권/장/절 change report 검토
6. 생성 파일 수, 총 권/장/절 및 데이터 표식 검사
7. `npm run lint`
8. `npm run build`
9. `dist/assets`의 성경 장 JS 청크가 0개인지 검사
10. `dist/sw.js` 또는 Workbox manifest에서 성경 권 precache가 0개이고 manifest만 포함되는지 검사
11. 브라우저에서 권별 저장, 취소, 삭제, 업데이트 및 전체 선택 전 용량 안내 확인
12. 저장된 권/저장하지 않은 권을 각각 오프라인에서 열어 동작 차이를 확인
13. Cache Storage 합계와 UI의 저장된 성경 용량이 일치하는지 확인
14. `navigator.storage.estimate()` 미지원/거부 상태 fallback 확인
15. 같은 권 내 장 이동, 다른 권 이동, 빠른 연속 이동 확인
16. `git diff --check`

## Risks and mitigations
- Risk: 잘못된 자동 분리로 절 내용이 바뀔 수 있다.
  - Mitigation: parser는 원문의 명시적 절 표식만 구조화하고 본문을 추측해 채우지 않는다. 모든 구조 변화는 change report와 회귀 fixture로 검토한다.
- Risk: upstream 기본 브랜치 변경이나 삭제로 동일 데이터를 다시 만들 수 없다.
  - Mitigation: commit SHA와 파일 hash가 고정된 Markdown snapshot을 저장소에 vendor하고 빌드는 네트워크를 사용하지 않는다.
- Risk: 원문 라이선스가 불명확해 공개 배포가 문제가 될 수 있다.
  - Mitigation: 변환 전에 번역본 명칭과 라이선스를 `SOURCE.md`의 필수 항목으로 검증하고 불명확하면 배포 완료를 차단한다.
- Risk: parser가 알 수 없는 Markdown을 조용히 버릴 수 있다.
  - Mitigation: 허용 목록 외 marker/heading/navigation 패턴은 hard error로 처리하고 change report에 모든 제거/보정 내역을 기록한다.
- Risk: 생성 파일이 오래된 원본을 반영할 수 있다.
  - Mitigation: `predev`/`prebuild`에서 항상 재생성하고 생성 파일을 canonical source로 취급하지 않는다.
- Risk: PWA가 이전 1,255개 청크 캐시를 유지할 수 있다.
  - Mitigation: Workbox cache cleanup과 새 precache revision을 확인하고 업그레이드 시 이전 캐시 제거를 수동 검증한다.
- Risk: 브라우저가 저장 공간 부족으로 오프라인 성경 캐시를 제거할 수 있다.
  - Mitigation: 지속 저장 상태를 표시하고 명시적 사용자 액션에서만 `navigator.storage.persist()`를 요청하며 제거 가능성을 문구로 안내한다.
- Risk: 압축 전송량과 실제 Cache Storage 사용량이 달라 사용자가 혼동할 수 있다.
  - Mitigation: “예상 다운로드”와 “기기 저장”을 별도 열로 표시하고 origin 전체 사용량도 별도 카드로 분리한다.
- Risk: 마가복음 9장 28절을 임의로 채울 수 있다.
  - Mitigation: 승인된 동일 번역 원본 없이는 내용 수정 완료로 처리하지 않는다.

## Handoff contract to viewer workstream
- 뷰어는 `loadBibleChapter()` 외의 데이터 경로와 스키마에 의존하지 않는다.
- 데이터 작업은 함수 시그니처와 성공 결과 shape를 변경하지 않는 한 내부 파일 배치를 자유롭게 변경할 수 있다.
- 북마크, 마지막 장, 마지막 절 위치 저장은 뷰어 책임이며 본문 저장소는 localStorage를 사용하지 않는다.
- 데이터 오류 메시지의 사용자 표현은 뷰어 책임이고, 저장소는 구분 가능한 오류만 제공한다.
