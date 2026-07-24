# 결정창고 (Decision Warehouse)

카톡 쓰는 2030이 톡게시판 대신 쓰는 의사결정 PWA. 흩어지는 링크·의견을 상자에 모아 투표로 정하고 기록으로 남긴다.
스택: **Next.js 16(App Router) + TypeScript + Supabase + TanStack Query + Tailwind v4 + Serwist(PWA)**. 배포: Vercel(main push 시 자동배포).

## 작업 방식 (필수)

- 전체 기능 명세는 `docs/spec.md`가 유일한 기준이다. **새 기능 작업 전에 반드시 spec.md의 해당 섹션(화면 명세·스키마·플로우)을 읽고 시작하라.** 세션 인수인계는 `docs/handoff.md`.
- spec.md의 "권장 구현 순서"에서 요청받은 단계만 작업한다. 다음 단계 기능을 선제 구현하지 않는다.
- spec.md와 다른 스키마·로직을 제안하려면 먼저 이유를 설명하고 동의를 받아라. 합의된 변경은 spec.md에 반영한 뒤 구현한다.

## 절대 규칙 (아키텍처)

- 상자 상태(OPEN/RESOLVED = 정리중/정리완료) 2종을 DB 컬럼으로 저장하지 않는다. `closed_at` 하나에서 조회 시 파생한다 (spec §3-1, v2). *(v1의 SHOWDOWN/EXPIRED/current_round·시간만료 자동결정·재투표는 폐기.)*
- 컴포넌트·페이지에서 supabase 클라이언트를 직접 import하지 않는다. 모든 Supabase 호출은 `src/lib/api/*`에만 두고, UI는 TanStack Query 훅으로만 데이터에 접근한다.
- 웹과 앱(RN)이 공유할 서버 로직은 Next.js Route Handler에 쓰지 않는다. Postgres RPC 또는 Edge Function으로 작성한다. Route Handler에는 OG 렌더링·OAuth 콜백 등 웹 전용 관심사만.
- 순수 계산 로직(getBoxStatus·득표 집계·선택지 정렬/블록 파싱 등)은 `src/lib/domain/`에 프레임워크·API 의존성 없는 TS로 작성한다.
- 모바일(390px) 우선 스타일링. 모든 mutation에 낙관적 업데이트 또는 invalidation 명시.

## 마이그레이션 규칙 (라이브 DB — 주의)

- Supabase CLI 링크가 없다(`supabase/config.toml` 없음). 마이그레이션은 **대시보드 SQL Editor에서 수동 실행**한다.
- 새 마이그레이션 파일은 **반드시 idempotent(재실행 안전)**로 작성한다: `add column if not exists`, `create or replace`, `drop policy if exists` 등. 이 저장소는 실제로 마이그레이션을 재실행하므로, 재실행이 데이터를 손상/부활시키지 않는지 검증한다.
- **배포 순서**: 마이그레이션 의존 코드를 push하기 **전에** 반드시 대시보드에서 마이그레이션을 먼저 적용한다. Vercel이 main push 시 자동배포하므로 순서를 어기면 라이브 오류.
- 데이터를 이관·소거하는 마이그레이션은 실행 전 해당 테이블 백업을 권장한다.

## 커밋

- 이 저장소는 로컬 git config가 개인 계정(`youngae.kim <kya754@gmail.com>`)으로 오버라이드돼 있다. **글로벌 config(회사 이메일)는 건드리지 말 것.** 커밋 시 개인 계정으로 찍히는지 확인한다.

## 디자인

- 컨셉 "다정한 손그림 창고" — 크림 `#F7F6EA`/잉크 `#2A2A27`/버터 `#FFD84A`. 토큰은 `globals.css`의 Tailwind v4 `@theme`에 정의(예: `bg-paper`·`text-ink`·`border-line`·`butter-tint`). 목업은 `docs/design-system-v1.html`. 공통 `PageHeader` + `max-w-[430px]` 컨테이너.

## 명령어

- `npm run dev` — 개발 서버(https)
- `npm run build` — 프로덕션 빌드 (작업 완료 전 통과 확인)
- `npm run lint` / `npx tsc --noEmit` — 린트·타입 체크
