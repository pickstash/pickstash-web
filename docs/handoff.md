# 결정창고 인수인계 — 2026-07-23

새 세션/에이전트가 이 문서 하나로 맥락을 이어받도록 정리함. `docs/spec.md`(기능 명세)와 루트 `CLAUDE.md`(작업 규칙)를 반드시 함께 읽을 것.

---

## 1. 프로젝트 한 줄

카톡 쓰는 2030이 **톡게시판 대신** 쓰는 의사결정 도구. 흩어지는 링크·의견을 상자에 모아 투표로 정하고 기록으로 남긴다. **친구와 함께** + **혼자 고민 정리** 두 모드 모두 1급.
스택: Next.js 16(App Router) + TypeScript + Supabase + TanStack Query + Tailwind v4 + Serwist(PWA). 배포: Vercel(`pickstash-web.vercel.app`).

## 2. 현재 국면

바이브 코딩 초기 구현 → **기획 v1 확정 → 재구현 + 전체 리디자인** → **선택지 기능 심화 + UI/UX 대폭 리뉴얼**까지 완료. 전부 main에 반영됨(Vercel 자동배포). 남은 건 Later 항목.

**최근 세션(2026-07-22~23)**: 선택지 본문 **블록-라이트 모델(006)** · **정렬/무한스크롤** · **좋아요 전용 투표** · **링크 미리보기(OG 언퍼)·유튜브 인라인·링크 모아보기** · **아이콘 시스템 통일(이모지→SVG)** · **상자 상세 IA 재설계**를 완료해 커밋·push. 상세는 §3-B. `006_option_content.sql`은 이미 대시보드에 적용됨. 마지막 두 라운드(카드·아이콘·상세)는 dev 서버 브라우저로 실제 확인까지 완료.

## 3. 완료된 것 (2026-07 리뉴얼)

- **기획 v1**: 타겟·톡게시판 4대 불편(투표없음·알림없음·게시판무한생성·사진첨부불가)·용도·시나리오 4개 확정 → `spec.md` 반영, 노션 "기획 정리 v1"에 정리.
- **디자인**: "다정한 손그림 창고" 컨셉(크림 `#F7F6EA`/잉크 `#2A2A27`/버터 `#FFD84A`). `globals.css` Tailwind v4 `@theme`에 토큰 정의 + Pretendard 번들. **전 화면 리스킨 완료**(구 파랑/회색 토큰 0). 공통 `PageHeader`(safe-area 헤더 + idx 기반 뒤로가기), `max-w-[430px]` 컨테이너.
- **DB 마이그레이션 (셋 다 라이브 적용됨)**:
  - `004_replan.sql`: `box_activities` 활동로그 + 트리거로 들썩임/updated_at 일원화, `deadline_at` nullable(마감 없는 상자), 정리된 상자 votes·options 쓰기 가드 RLS, `close_box`/`reopen_box`/`start_rematch`/`get_box_preview_by_invite_code` RPC.
  - `005_option_images.sql`: `options.images` + `option-images` 스토리지 버킷·정책.
  - `006_option_content.sql`: 선택지 본문을 순서 있는 `content` jsonb 블록 배열로 통합(summary/memo/images/links → content). 백필과 동시에 원본 4컬럼을 비워 **재실행 안전**. 구 4컬럼은 드롭 안 함(데이터만 이관).
  - **셋 다 idempotent**(if exists/or replace 가드) — 재실행 안전.
- **기능**: 마감 없는 상자, 결정 실패(EXPIRED 동점) 시 시스템 제안형 재투표 + 다시 정리하기, "이대로 결정하기", 들썩임 활동 문구, 초대 랜딩 로그인 전 미리보기, 선택지 사진 첨부, 테스트 로그인 프로덕션 숨김.
- **검증**: 마감없는 상자 생성·선택지 추가(트리거+RLS)·사진 업로드/저장/표시 브라우저로 확인됨.

### 3-B. 최근 세션(2026-07-22~23) 리뉴얼 상세

- **선택지 본문 블록-라이트 모델**: `content jsonb` 순서 블록 배열. 타입 `text`/`image`/`link`(+링크 미리보기 필드·아이콘). 순수 로직 `src/lib/domain/option-content.ts`(parseBlocks·cleanBlocks·getOptionPreview·linkKindOf/linkHref·parseYouTubeId 등). 폼(`option-form.tsx`)은 블록 에디터(글/사진/링크 추가·↑↓·삭제), 상세(`option-detail-client.tsx`)는 블록 순서 렌더.
- **정렬/무한스크롤**: `src/lib/domain/option-sort.ts`(최신/좋아요순 순수 정렬) + `src/hooks/use-infinite-reveal.ts`(IntersectionObserver 점진 노출). votes가 상자 단위 전량 로드라 클라이언트 정렬.
- **링크 미리보기(노션식 OG 언퍼)**: 링크 붙여넣으면 서버가 OG 메타(제목·설명·썸네일)를 긁어 카드로. `src/app/api/unfurl/route.ts` — **웹 전용 Route Handler 예외**(Supabase CLI 링크 없어 Edge 배포 번거로워 Route Handler 채택, RN은 이 HTTP 엔드포인트 재사용). **SSRF 하드닝**: 로그인 세션 필수 + 호스트 DNS 해석해 모든 IP 공인 검증(사설/루프백/IPv6-mapped/CGNAT 차단) + 리다이렉트 매 홉 재검증 + 512KB/5s 상한. 클라이언트 `src/lib/api/unfurl.ts`. (잔여: 능동 DNS 리바인딩은 인증 게이트로 축소, rate-limit 없음.)
- **유튜브 인라인**: 링크가 유튜브면 상세에서 썸네일 파사드 → 탭 시 인라인 재생(`src/components/youtube-embed.tsx`). 별도 '영상' 블록 없음(링크로 통합).
- **링크 아이콘 3종**(🔗링크/📍지도/▶️유튜브) + **링크 모아보기** 페이지(`src/app/box/[id]/links/`) — 상자의 모든 선택지 링크를 종류 필터로 모아봄. 상자 상세 '선택지 N개' 옆 링크 칩으로 진입.
- **좋아요 전용 투표**: 싫어요(붐따) 앱 전체 제거. 승자 = **좋아요 최다**(`winner.ts`의 getVoteResult/getLeaderKey/buildOptionVoteSummaries 좋아요만). 동점→EXPIRED/재투표 메커니즘 유지. 구 `votes.vote_type='dislike'` 행은 남아도 판정에서 무시(무해). VoteCount의 dislike 필드는 미표시로 잔존.
- **선택지 카드 리디자인**(`options-section.tsx`): 텍스트 우선 + 우측 56px 썸네일(없으면 플레이스홀더). 요약 항상 1줄+말줄임+공간유지. 좋아요 칩(미선택 테두리). **1위 칩 + 노란 테두리**(좋아요 단독 최다). 카드 전체 탭→상세(오버레이 링크), 좋아요만 독립 클릭.
- **아이콘 시스템**: `src/components/icon.tsx` — 공용 `Icon`(Feather 라인 지오메트리, name+size+filled+className). 구조 이모지 전부 SVG로 교체(⭐→투톤 별[fill-butter+stroke-butter-dark], 👍→하트, 🔔→벨, 홈 나비 📦✅⭐→box/check/star, 뒤로/햄버거/삭제 등). 캐주얼 라벨(📁·🔥·링크종류 이모지·✏️ 메모)만 이모지 유지. **활성/강조 색은 fill-*/stroke-* 유틸 또는 인라인 `var(--color-*)`로.**
- **상자 상세 IA 재설계**(`box-detail-client.tsx`): 헤더 제목 제거 → **히어로 질문**(제목 중복 제거, `PageHeader` title 옵셔널화). 상태·마감(칩)·생성일·참여를 **가벼운 메타/크림 스트립**으로 병합(참여자 별도 카드 제거). **⋯ 오버플로 메뉴 = 관리 액션만**(제목수정·상자삭제; 삭제는 확인 모달). 링크 모아보기는 '선택지 N개' 옆 칩. 하단 = **「이대로 결정하기」만**(선택지추가는 목록 끝 점선 카드, 삭제는 메뉴로 이동해 오탭 방지). 브라우저 검증 완료.

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
- `supabase/migrations/006_option_content.sql` — 선택지 본문 블록 모델(**대시보드 적용 대기**). 관련 코드: `src/lib/domain/option-content.ts`(블록 파싱·프리뷰·링크 헬퍼), `src/lib/domain/option-sort.ts`(정렬), `src/hooks/use-infinite-reveal.ts`(무한스크롤)
- 노션(사용자 개인 워크스페이스):
  - 기획 정리 v1: `3a3180f9-6236-818f-aa59-ca3c5a250ac9` — ✏️ 피드백 블록 있음(사용자가 채울 수 있음)
  - 리디자인 갭 분석·기획/UX 진단(부록): `3a3180f9-6236-819b-9589-d3c22430f541`
  - 결정창고 메인: `d13180f9-6236-832c-971b-015f8e954656`
- Claude Design(개인 계정, /design-login 별도 인증): projectId `b93bd63d-628e-4f46-bcf4-7d76bf181c0a` — to-be 12카드 업로드됨
- Claude Code 메모리(같은 프로젝트 세션이면 자동 로드): `~/.claude/projects/-Users-kkomyoung-workspace-pickstash-web/memory/` (`project_pickstash.md`가 상세 이력)

## 6. 남은 일 (Later, 기획 문서에서 분류됨)

- **다크모드** — 리스킨으로 전 화면 토큰화돼 이제 현실적으로 가능. `globals.css`에 다크 값 주석으로 대기 중. 토큰을 테마 전환형으로 바꾸는 작업.
- ~~선택지 정렬(최신/좋아요순) + 무한스크롤~~ → **구현 완료**(2026-07-22). 클라이언트 정렬(`src/lib/domain/option-sort.ts`) + 점진 윈도잉(`src/hooks/use-infinite-reveal.ts`). 006과 함께 push 대기.
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
