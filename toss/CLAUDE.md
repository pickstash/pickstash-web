# toss/ — 앱인토스(Apps in Toss) 미니앱

**웹(../)의 얇은 WebView 셸**이다. Vite + React 19 + granite(@apps-in-toss/web-framework)로 빌드하고,
화면·데이터·디자인은 웹과 **동일한 공유 코드를 그대로 재사용**한다. 산출물은 `pickstash.ait`.

## 핵심 아키텍처 (필수)

- **디자인 시스템은 Tailwind v4 하나뿐.** 웹의 `../src/app/globals.css`(@theme 크림/잉크/버터 토큰)를
  `src/index.css`에서 그대로 import하고, `@source "../../src"`로 공유 컴포넌트를 스캔한다. → 웹과 픽셀 동일.
- **TDS(@toss/tds-mobile\*)를 쓰지 않는다.** TDS Provider가 주입하는 전역 CSS가 우리 Tailwind 디자인을
  덮어써 border·배경·링크색이 깨졌던 게 과거 실패 원인. 다시 도입 금지. (앱인토스는 WebView 미니앱에 TDS를 강제하지 않음.)
- **공유 코드 재사용**: `@/*` → `../src/*` (vite.config·tsconfig.app.json alias). 화면(`@/components/*`),
  데이터(`@/lib/api/*`), 순수 로직(`@/lib/domain/*`), nav 추상(`@/lib/nav/nav`)을 웹과 공유한다.
  새 화면 이식 = 웹 페이지의 client 컴포넌트를 그대로 렌더하는 `src/screens/*` 셸을 추가하는 것.
- **토스 전용(셸)만 여기 둔다**: 토스 로그인 배관(`src/lib/auth.ts` → mTLS → verifyOtp), supabase 클라이언트
  shim(`src/lib/supabase-client.ts`, 웹의 @supabase/ssr 대체), `TossNavProvider`, MemoryRouter, providers, granite.config.
- **React 버전은 웹과 일치**(현재 19.2.4). 공유 컴포넌트가 양쪽에서 같은 React로 돌아야 안전. vite dedupe로 단일 인스턴스.

## 명령어

- `npm run dev` — granite 개발 서버(vite)
- `npm run build` — `.ait` 아티팩트 생성 (작업 완료 전 통과 확인)
- `npx tsc -p tsconfig.app.json --noEmit` — 타입 체크(공유 코드 포함)

## 참고 문서

@docs/skills/apps-in-toss.md
