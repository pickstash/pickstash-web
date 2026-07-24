# 결정창고 인수인계 — 2026-07-24 (v2 결정 모델)

새 세션/에이전트/다른 컴퓨터가 이 문서 하나로 맥락을 이어받도록 정리함. `docs/spec.md`(기능 명세)와 루트 `CLAUDE.md`(작업 규칙)를 반드시 함께 읽을 것.

---

## 0. ⚠️ 지금 가장 중요한 것 (다른 컴퓨터에서 시작 시 먼저 확인)

- **로컬에 push 안 된 커밋이 있는지 먼저 확인**: `git log origin/main..main --oneline`. 있으면 `git push origin main`으로 라이브(Vercel 자동배포)와 맞춘다.
- **007 마이그레이션은 이미 라이브 DB에 적용됨**(대시보드 수동 실행 완료). 007은 v1 RPC(`start_rematch`, 2인자 `reopen_box`)를 **삭제**하므로, v2 코드가 push되기 전까지는 라이브(구 v1 코드)의 "다시 정리하기/재투표"가 깨진 상태다. **→ v2 코드 push가 라이브 정상화 조건.**
- 로컬 dev는 v2 코드 + v2 DB로 일관됨(정상).

## 1. 프로젝트 한 줄

카톡 쓰는 2030이 **톡게시판 대신** 쓰는 의사결정 도구. 흩어지는 링크·의견을 상자에 모아 좋아요로 선호를 표시하고 결정해 기록으로 남긴다. **친구와 함께** + **혼자 고민 정리** 두 모드 모두 1급.
스택: Next.js 16(App Router) + TypeScript + Supabase + TanStack Query + Tailwind v4 + Serwist(PWA). 배포: Vercel(`pickstash-web.vercel.app`, main push 시 자동배포).

## 2. 현재 국면

바이브 코딩 초기 구현 → 기획 v1 확정·재구현·전체 리디자인 → 선택지 기능 심화·UI 리뉴얼 → **결정 모델 v2 재정립·구현**까지 완료. v2는 **로컬 커밋됨(2커밋), push 대기**(§0).

**v2 재정립(2026-07-24)**: 기존 4상태·시간만료 자동결정 limbo·재투표(끝장전)·라운드·동점 결승전·정리완료 쓰기잠금이 "복잡하고 목적 불명"이라는 사용자 판단으로 **전면 단순화**. 상세는 §3, spec.md §1/§3/§6.

## 3. v2 결정 모델 (현재 기준 — spec.md §3이 상세 단일 기준)

- **상태는 2개뿐, 컬럼 저장 안 함**: `closed_at` 하나에서 파생. `getBoxStatus`(`src/lib/domain/box-status.ts`)는 `closed_at ? 'RESOLVED' : 'OPEN'`. 라벨: **정리중(OPEN)** / **정리완료!(RESOLVED)**. `SHOWDOWN`·`EXPIRED`·`current_round`·시간만료 limbo **없음**.
- **결정 방식은 상자마다 선택**(`boxes.decision_mode`):
  - `manual` **직접 정하기** — 사람이 선택지 1개+ 골라 확정. 마감 없음. (혼자 상자 기본, 안 정하고 메모장처럼 모아둬도 됨)
  - `auto_deadline` **마감 투표** — 마감 시각에 좋아요 최다가 자동 결정(lazy commit).
  - **생성 후에도 변경 가능**(방장, 편집 메뉴 → 결정 방식 모달; 마감 투표 선택 시 마감일 시트).
- **결정 = 선택지에 `decided_at` 표시 + `closed_at` 세팅**. `decided_at`은 **여러 개 가능**(중복 결정 = 공동 결정).
- **모든 결정은 번복 가능**: "다시 정리하기" → `closed_at`·`decided_at` 모두 해제 → 정리중 복귀.
- **좋아요 = 참고 신호**(여럿 상자만 표시, 혼자 상자는 미표시). "지금 1위"(좋아요 최다, 공동 1위 포함)는 결정과 **독립 라벨**.
- **편집 잠금 없음**: 정리완료여도 제목·메모·선택지·좋아요·댓글 전부 편집 가능(구 "정리된 상자 쓰기 가드 RLS" 폐기). 결정 표시된 선택지 삭제·수정 시 확인 1회.
- **창고 분류**: 어질러진 = `closed_at IS NULL`, 정리된 = `closed_at IS NOT NULL`, 즐겨찾기 = 별도 플래그. 혼자 안 정한 메모 상자는 어질러진에 남음(의도된 동작).
- **그룹 UI 숨김**: 그룹 개념 미확립으로 드로어 "그룹 관리"·"그룹으로 초대" 진입 숨김(코드·페이지는 보존).

## 4. 완료된 것 (이전 리뉴얼, 라이브 반영됨)

- **기획 v1 + "다정한 손그림 창고" 디자인**(크림 `#F7F6EA`/잉크 `#2A2A27`/버터 `#FFD84A`, `globals.css` `@theme` 토큰, Pretendard 번들, 공통 `PageHeader` + `max-w-[430px]`). 전 화면 리스킨.
- **선택지 본문 블록-라이트 모델**(`content jsonb`, `src/lib/domain/option-content.ts`) + 정렬/무한스크롤 + 링크 미리보기(OG 언퍼, `src/app/api/unfurl/route.ts`, SSRF 하드닝) + 유튜브 인라인 + 링크 모아보기 + 아이콘 SVG 통일 + 선택지 사진 첨부.
- **좋아요 전용 투표**(싫어요 제거). 승자 = 좋아요 최다.

## 5. DB 마이그레이션 (전부 라이브 대시보드 적용됨, 모두 idempotent)

- `001~003`: 초기 스키마·RLS·RPC.
- `004_replan.sql`: `box_activities` 활동로그·트리거, `deadline_at` nullable, (v2에서 폐기될) 4상태 RPC.
- `005_option_images.sql`: `options.images` + 스토리지 버킷.
- `006_option_content.sql`: 선택지 본문 `content jsonb` 블록 통합(구 4컬럼 데이터만 이관, 드롭 안 함).
- **`007_v2_decision.sql`** (v2 핵심): `boxes.decision_mode`(default `manual`, CHECK) + `options.decided_at` 추가. `start_rematch`·2인자 `reopen_box` **드롭**. `decide_box(p_box_id, p_option_ids uuid[])`·`reopen_box(p_box_id)`·`auto_decide_box(p_box_id)` 생성(참여자/조건 체크, security definer, 활동로그 `box_closed`/`box_reopened`). votes/options RLS에서 "정리된 상자 쓰기 가드" 제거. 기존 정리완료 상자 `decided_at` 백필(좋아요 최다, 재실행 안전 가드).

## 6. 반드시 지킬 규칙·제약

- **상자 상태는 DB 컬럼 저장 금지** — `closed_at` 하나에서 파생(`getBoxStatus`). 상태 **2종: OPEN(정리중)/RESOLVED(정리완료)**. (v1의 SHOWDOWN/EXPIRED/current_round는 폐기.)
- **Supabase 호출은 `src/lib/api/*`에만.** 컴포넌트·페이지는 TanStack Query 훅으로만 접근.
- **웹·앱(RN) 공유 서버 로직은 Postgres RPC/Edge Function.** Route Handler엔 OG·OAuth 콜백 등 웹 전용만. 순수 계산은 `src/lib/domain/`(프레임워크 무관 TS).
- **마이그레이션은 Supabase 대시보드 SQL Editor에서 수동 실행**(CLI 링크 없음, `supabase/config.toml` 없음). 새 파일은 **반드시 idempotent**.
- **⚠️ 배포 순서**: 마이그레이션 의존 코드를 push하기 **전에** 대시보드에서 마이그레이션 먼저 적용. Vercel 자동배포라 순서 어기면 라이브 오류.
- **git author**: 로컬 config가 개인 계정(`youngae.kim <kya754@gmail.com>`)으로 오버라이드됨. **글로벌 config(회사 이메일) 건드리지 말 것.** 커밋 시 개인 계정 확인.
- **`.omc/`는 커밋 금지**(OMC 운영 상태, `.gitignore` 처리됨). 스테이징은 `git add -u` + 새 파일 명시, **`git add .` 금지**.
- **브라우저 테스트(Chrome Claude 익스텐션)는 사용자가 명시적으로 요청할 때만.** 기본 검증은 `tsc`/`eslint`/`build`.
- 모바일 390px 우선. 모든 mutation에 낙관적 업데이트 또는 invalidation.

## 7. 산출물 위치

- `docs/spec.md` — 기능 명세(단일 기준, v2 반영: §1/§3/§6 + §5-0 스키마 델타 + §7 화면 델타).
- `docs/design-system-v1.html` — 디자인 제안서(토큰·컴포넌트·화면 목업).
- `docs/handoff.md` — 이 문서.
- `supabase/migrations/007_v2_decision.sql` — v2 스키마·RPC(라이브 적용 완료).
- 관련 코드: `src/lib/domain/box-status.ts`(2상태), `src/lib/api/boxes.ts`(decideBox/reopenBox/autoDecideBox/updateBoxDecisionMode), `src/hooks/use-boxes.ts`(대응 훅), `src/app/box/[id]/box-detail-client.tsx`(결정 모달·결정방식 변경), `src/components/options-section.tsx`(결정/1위 라벨), `src/app/box/new/create-box-form.tsx`(방식 선택).
- Claude Code 메모리(같은 프로젝트 세션 자동 로드): `~/.claude/projects/-Users-kkomyoung-workspace-pickstash-web/memory/`(`project_pickstash.md`가 상세 이력).
- 노션(사용자 개인 워크스페이스): 기획 정리 v1 `3a3180f9-6236-818f-aa59-ca3c5a250ac9`, 결정창고 메인 `d13180f9-6236-832c-971b-015f8e954656`.

## 8. 남은 일 (Later)

- **push로 라이브 v2 정상화**(§0) — 최우선.
- **다크모드** — 리스킨으로 토큰화돼 가능. `globals.css` 다크 값 주석 대기.
- **마감 투표 lazy commit 실동작 검증**: `auto_decide_box`는 상세 진입 시 `page.tsx`에서 호출(마감 지난 auto_deadline 상자 자동 결정). 2계정·마감 경과 시나리오 미검증.
- **미검증 경로**: 2계정 들썩임 활동 문구, 결정 방식 변경 후 마감 투표 자동결정 왕복.
- **테스트 데이터 정리**: 라이브 test1 소유 상자 잔존 가능.

## 9. 검증 방법

- 빌드/타입: `npm run build`, `npx tsc --noEmit`, `npm run lint`.
- 앱 확인: dev 서버(`npm run dev` — https, Serwist는 dev에서 disable + Turbopack). test1/test2 로그인 버튼으로 진입, 라이브 DB에 붙음.
- **브라우저 자동검증은 사용자 요청 시에만**(§6).
