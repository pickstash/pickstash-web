# 결정창고 (Decision Warehouse)

친구들과 함께 의사결정하는 PWA 웹앱. Next.js(App Router) + TypeScript + Supabase + TanStack Query + Tailwind.

## 작업 방식 (필수)

- 전체 기능 명세는 `docs/spec.md`가 유일한 기준이다. **새 기능 작업을 시작하기 전에 반드시 spec.md의 해당 섹션(화면 명세, 스키마, 플로우)을 읽고 시작하라.**
- spec.md의 "권장 구현 순서"에서 요청받은 단계만 작업한다. 다음 단계 기능을 선제 구현하지 않는다.
- spec.md와 다른 스키마·로직을 제안하려면 먼저 이유를 설명하고 동의를 받아라.

## 절대 규칙

- 상자 상태(OPEN/SHOWDOWN/EXPIRED/RESOLVED)를 DB 컬럼으로 저장하지 않는다. `deadline_at`·`closed_at`·`current_round`에서 조회 시 파생한다 (spec.md 3-1).
- 컴포넌트·페이지에서 supabase 클라이언트를 직접 import하지 않는다. 모든 Supabase 호출은 `src/lib/api/*`에만 두고, UI는 TanStack Query 훅으로만 데이터에 접근한다.
- 웹과 앱(RN)이 공유할 서버 로직은 Next.js Route Handler에 쓰지 않는다. Postgres RPC 또는 Edge Function으로 작성한다. Route Handler에는 OG 렌더링·OAuth 콜백 등 웹 전용 관심사만.
- 순수 계산 로직(getBoxStatus, 득표 집계)은 `src/lib/domain/`에 프레임워크 의존성 없는 TS로 작성한다.
- 모바일(390px) 우선 스타일링. 모든 mutation에 낙관적 업데이트 또는 invalidation 명시.

## 명령어

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드 (작업 완료 전 통과 확인)
- `npm run lint` / `npx tsc --noEmit` — 린트·타입 체크
