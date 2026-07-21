# 결정창고 인수인계 — 2026-07-21

새 세션/에이전트가 이 문서 하나로 맥락을 이어받도록 정리함. `docs/spec.md`(기능 명세)와 루트 `CLAUDE.md`(작업 규칙)를 반드시 함께 읽을 것.

---

## 1. 프로젝트 한 줄

카톡 쓰는 2030이 **톡게시판 대신** 쓰는 의사결정 도구. 흩어지는 링크·의견을 상자에 모아 투표로 정하고 기록으로 남긴다. **친구와 함께** + **혼자 고민 정리** 두 모드 모두 1급.
스택: Next.js 16(App Router) + TypeScript + Supabase + TanStack Query + Tailwind v4 + Serwist(PWA). 배포: Vercel(`pickstash-web.vercel.app`).

## 2. 현재 국면

바이브 코딩으로 만든 초기 구현을 **기획 v1 확정 → 재구현 + 전체 리디자인**한 상태. 핵심 재구현·리스킨·사진첨부까지 끝나 main에 push됨(Vercel 자동배포). 남은 건 Later 항목 몇 개.

## 3. 완료된 것 (2026-07 리뉴얼)

- **기획 v1**: 타겟·톡게시판 4대 불편(투표없음·알림없음·게시판무한생성·사진첨부불가)·용도·시나리오 4개 확정 → `spec.md` 반영, 노션 "기획 정리 v1"에 정리.
- **디자인**: "다정한 손그림 창고" 컨셉(크림 `#F7F6EA`/잉크 `#2A2A27`/버터 `#FFD84A`). `globals.css` Tailwind v4 `@theme`에 토큰 정의 + Pretendard 번들. **전 화면 리스킨 완료**(구 파랑/회색 토큰 0). 공통 `PageHeader`(safe-area 헤더 + idx 기반 뒤로가기), `max-w-[430px]` 컨테이너.
- **DB 마이그레이션 (둘 다 라이브 적용됨)**:
  - `004_replan.sql`: `box_activities` 활동로그 + 트리거로 들썩임/updated_at 일원화, `deadline_at` nullable(마감 없는 상자), 정리된 상자 votes·options 쓰기 가드 RLS, `close_box`/`reopen_box`/`start_rematch`/`get_box_preview_by_invite_code` RPC.
  - `005_option_images.sql`: `options.images` + `option-images` 스토리지 버킷·정책.
  - **둘 다 idempotent**(if exists/or replace 가드) — 재실행 안전.
- **기능**: 마감 없는 상자, 결정 실패(EXPIRED 동점) 시 시스템 제안형 재투표 + 다시 정리하기, "이대로 결정하기", 들썩임 활동 문구, 초대 랜딩 로그인 전 미리보기, 선택지 사진 첨부(카드 썸네일 비교 뷰), 테스트 로그인 프로덕션 숨김.
- **검증**: 마감없는 상자 생성·선택지 추가(트리거+RLS)·사진 업로드/저장/표시 브라우저로 확인됨.

## 4. 반드시 지킬 규칙·제약

- **상자 상태는 DB 컬럼 저장 금지** — `deadline_at`/`closed_at`/`current_round`에서 파생(`getBoxStatus`, spec 3-1). 상태 4종: OPEN/SHOWDOWN/EXPIRED/RESOLVED.
- **Supabase 호출은 `src/lib/api/*`에만.** 컴포넌트·페이지는 TanStack Query 훅으로만 접근.
- **웹·앱(RN) 공유 서버 로직은 Postgres RPC/Edge Function.** Route Handler엔 OG·OAuth 콜백 등 웹 전용만. 순수 계산은 `src/lib/domain/`(프레임워크 무관 TS).
- **마이그레이션은 Supabase 대시보드 SQL Editor에서 수동 실행.** CLI 링크 안 됨(`supabase/config.toml` 없음). 새 마이그레이션 파일은 idempotent로 작성.
- **⚠️ 배포 순서**: 마이그레이션 의존 코드를 push하기 **전에** 반드시 대시보드에서 마이그레이션 먼저 적용. Vercel이 main push 시 자동배포하므로, 안 지키면 라이브 오류.
- **git author**: 이 저장소는 로컬 config가 개인 계정(`youngae.kim <kya754@gmail.com>`)으로 오버라이드됨. **글로벌 config(회사 이메일)는 건드리지 말 것.** 커밋 시 개인 계정으로 찍히는지 확인.
- 모바일 390px 우선. 모든 mutation에 낙관적 업데이트 또는 invalidation.
- **화면 구성 기준은 코드가 아니라 Excalidraw 와이어프레임**(사용자 확정). 와이어프레임은 사용자 Chrome localStorage에만 있음(파일 아님).

## 5. 산출물 위치

- `docs/spec.md` — 기능 명세(단일 기준, v1 반영됨)
- `docs/design-system-v1.html` — 디자인 제안서(토큰·컴포넌트·화면 목업)
- `docs/handoff.md` — 이 문서
- 노션(사용자 개인 워크스페이스):
  - 기획 정리 v1: `3a3180f9-6236-818f-aa59-ca3c5a250ac9` — ✏️ 피드백 블록 있음(사용자가 채울 수 있음)
  - 리디자인 갭 분석·기획/UX 진단(부록): `3a3180f9-6236-819b-9589-d3c22430f541`
  - 결정창고 메인: `d13180f9-6236-832c-971b-015f8e954656`
- Claude Design(개인 계정, /design-login 별도 인증): projectId `b93bd63d-628e-4f46-bcf4-7d76bf181c0a` — to-be 12카드 업로드됨
- Claude Code 메모리(같은 프로젝트 세션이면 자동 로드): `~/.claude/projects/-Users-kkomyoung-workspace-pickstash-web/memory/` (`project_pickstash.md`가 상세 이력)

## 6. 남은 일 (Later, 기획 문서에서 분류됨)

- **다크모드** — 리스킨으로 전 화면 토큰화돼 이제 현실적으로 가능. `globals.css`에 다크 값 주석으로 대기 중. 토큰을 테마 전환형으로 바꾸는 작업.
- **선택지 정렬(최신/좋아요순) + 무한스크롤** — 현재 `created_at` 오름차순 고정·전량 로드. 선택지 10개+ 상자 생기면.
- **그룹 라벨 자동 파생** — 참여자 ⊇ 그룹 멤버 전원이면 카드에 그룹 라벨. 명세만 있고 미구현.
- **미검증 경로**: 2계정 들썩임 활동 문구(내 활동은 나에게 안 뜨는 설계라 test2 필요), close_box/재투표 RPC 직접 호출(코드 경로만 확인).
- **테스트 데이터 정리**: 라이브에 test1 소유 상자 "혼자 고민 - 노트북 살까 말까"(id `11c1aed9-4e01-413e-943f-3a48a686cd27`) + 선택지 2개(테스트 이미지 포함) 남김.

## 7. 알아둘 것 (gotchas)

- 기존 lint 에러(배너/시트/드로어의 setState-in-effect, 생성된 `sw.js`의 module 할당)는 이번 작업과 무관. 빌드는 통과.
- dev(https)에서 serwist 서비스워커 등록 에러(`/sw.js`가 리다이렉트 뒤) — 별개 이슈. 프록시(`src/proxy.ts`)가 미인증 요청을 `/login`으로 보낼 때 sw.js 예외 처리 확인 필요.
- 스토리지 버킷은 마이그레이션 SQL에서 `insert into storage.buckets`로 생성함(대시보드 수작업 불필요).
- 테스트 로그인 버튼: `NEXT_PUBLIC_ENABLE_TEST_LOGIN=true`거나 비프로덕션에서만 노출.

## 8. 검증 방법

- 빌드/타입: `npm run build`, `npx tsc --noEmit`
- 앱 확인: dev 서버(`npm run dev` — https)에서 test1/test2 로그인 버튼으로 진입. 라이브 DB에 붙으므로 마이그레이션 반영 상태 그대로 테스트됨.
