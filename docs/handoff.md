# 결정창고 인수인계 — 2026-07-28

새 세션/에이전트/다른 컴퓨터가 이 문서 하나로 맥락을 이어받도록 정리함. `docs/spec.md`(기능 명세, 단일 기준)와 루트 `CLAUDE.md`(작업 규칙)를 반드시 함께 읽을 것.

---

## 0. ⚠️ 지금 가장 중요한 것 (다른 컴퓨터에서 시작 시 먼저 확인)

- **push 안 된 커밋 확인**: `git log origin/main..main --oneline`. 있으면 라이브(Vercel 자동배포)와 맞춘다.
- **⚠️ 배포 순서 절대 규칙**: 마이그레이션 의존 코드를 push하기 **전에** 대시보드 SQL Editor에서 마이그레이션을 먼저 적용한다. Supabase CLI 링크 없음(`supabase/config.toml` 없음) → **전부 수동 실행**. 새 파일은 반드시 idempotent.
- **미적용 마이그레이션 주의**: `014_public_box_view.sql`(링크 뷰어 RPC)이 최신. 이 RPC를 호출하는 코드(`/invite/[code]`)를 push하기 전에 대시보드에서 014를 먼저 적용해야 라이브가 안 깨진다. *(워킹트리에 다른 세션의 진행 중 변경 `013_decide_touch_updated_at.sql` 등이 섞여 있을 수 있으니 커밋 전 `git status` 확인.)*

## 1. 프로젝트 한 줄

카톡 쓰는 2030이 **톡게시판 대신** 쓰는 의사결정 PWA. 흩어지는 링크·의견을 상자에 모아 좋아요로 선호를 표시하고 결정해 기록으로 남긴다. **친구와 함께** + **혼자 고민 정리** 두 모드 모두 1급.
스택: Next.js 16(App Router) + TypeScript + Supabase + TanStack Query + Tailwind v4 + Serwist(PWA). 배포: Vercel(`pickstash-web.vercel.app`, main push 시 자동배포).

## 2. 현재 국면

바이브 코딩 초기 구현 → 기획 v1 확정·재구현·전체 리디자인 → 선택지 심화 → **결정 모델 v2** → **협업 개방·방장 제거** → **댓글 강화·폴더·푸시** → **초대 링크 읽기 전용 뷰어**까지. 대부분 라이브 반영 완료. spec.md는 이번 세션(2026-07-28)에 코드 현실로 전면 최신화됨.

## 3. 핵심 도메인 규칙 (현재 기준 — spec.md §3이 상세 단일 기준)

- **상태 2종, 컬럼 저장 안 함**: `closed_at` 하나에서 파생. `getBoxStatus`(`src/lib/domain/box-status.ts`)는 `closed_at ? 'RESOLVED' : 'OPEN'`. 라벨 정리중/정리완료!. `SHOWDOWN`·`EXPIRED`·시간만료 limbo·재투표 **없음**.
- **결정 방식 상자별**(`boxes.decision_mode`): `manual`(직접 정하기, 마감 없음) / `auto_deadline`(마감 투표, 마감 시 좋아요 최다 자동 결정=lazy commit). 생성 후 변경 가능.
- **결정 = 선택지 `decided_at` + 상자 `closed_at`**. `decided_at`은 **여러 개 가능**(중복=공동 결정). **번복 가능**(다시 정리하기 → 둘 다 해제).
- **좋아요 = 참고 신호**(여럿 상자만 표시, 혼자 상자 미표시). "지금 1위"는 결정과 독립.
- **편집 잠금 없음**: 정리완료여도 제목·메모·선택지·좋아요·댓글·폴더 편집 가능(007에서 "쓰기 가드 RLS" 폐기). *투표(좋아요)만 정리완료 시 UI에서 비활성.*
- **방장(owner) 개념 없음(011)**: `boxes.owner_id`·`box_participants.role` 컬럼 삭제. 모든 상자·선택지 편집은 **참여자 누구나**(008). 상자 직접 삭제 없음 = 나가기만, 마지막 1명 나가면 자동 삭제.
- **폴더(§3-7, 012)**: 개인별 상자 분류(각자 자기 `folders` + `box_folders(user_id, box_id)`). 그룹(사람 묶음)과 완전 별개. 상태 가로지름.
- **그룹 UI 숨김**: 개념 미확립. 드로어 "그룹 관리"·초대 "그룹으로 초대" 숨김(코드·페이지·`/group-invite`·RPC 보존). 그룹은 상자와 달리 `owner_id` 유지.
- **초대 링크 = 읽기 전용 뷰어(§6-1, 014)**: 비로그인 포함 누구나 `/invite/[code]`로 상자 전체(선택지·내용·결과·좋아요수·댓글)를 읽기 전용 열람. 쓰기는 로그인+참여자만. 참여자는 `/box/[id]`로 리다이렉트.

## 4. DB 마이그레이션 (전부 라이브 대시보드 적용됨 — 014 제외 확인 필요, 모두 idempotent)

- `001~003`: 초기 스키마·RLS·RPC.
- `004_replan.sql`: `box_activities` 활동로그·트리거, `deadline_at` nullable, (v2에서 폐기될) 4상태 RPC.
- `005_option_images.sql`: `options.images` + 스토리지 버킷.
- `006_option_content.sql`: 선택지 본문 `content jsonb` 블록 통합(구 4컬럼 데이터만 이관, 드롭 안 함).
- `007_v2_decision.sql`: v2 결정 모델. `decision_mode`·`decided_at` 추가, `start_rematch`·2인자 `reopen_box` 드롭, `decide_box`·1인자 `reopen_box`·`auto_decide_box` 신설, 쓰기 가드 RLS 폐기, 기존 정리완료 상자 `decided_at` 백필.
- `008_open_collab.sql`: 상자·선택지 편집을 참여자 누구나로 개방 + `delete_box_when_empty` 트리거(마지막 참여자 나가면 자동 삭제).
- `009_realtime_votes.sql`: `votes`·`comments` Realtime publication 등록 + `replica identity full`(DELETE 이벤트 전달).
- `010_comment_features.sql`: 답글(`parent_comment_id`, 플랫 2단계 트리거)·`edited_at` + `comment_likes` 테이블 + Realtime.
- `011_remove_owner.sql`: **`boxes.owner_id`·`box_participants.role` 컬럼 삭제** + 참조 RLS·RPC 재작성(`close_box` 드롭, 미리보기 owner 제거, `auto_decide_box` actor 폴백을 첫 참여자로).
- `012_folders.sql`: `folders` + `box_folders` + RLS(본인 행만).
- `013_decide_touch_updated_at.sql`: *(다른 세션의 진행 중 파일 — 내용 확인 후 취급)*
- **`014_public_box_view.sql`**: `get_box_view_by_invite_code`(security definer, invite_code 제한, anon·authenticated grant) — 링크 읽기 전용 뷰어용 상자 전체 스냅샷 jsonb.

## 5. 반드시 지킬 규칙·제약 (CLAUDE.md와 동일)

- **상자 상태 DB 컬럼 저장 금지** — `closed_at` 하나에서 파생. 상태 2종.
- **Supabase 호출은 `src/lib/api/*`에만.** 컴포넌트·페이지는 TanStack Query 훅으로만.
- **웹·앱(RN) 공유 서버 로직은 Postgres RPC/Edge Function.** Route Handler엔 OG·OAuth 콜백 등 웹 전용만. 순수 계산은 `src/lib/domain/`.
- **마이그레이션 수동 실행 + idempotent + 배포 순서(§0).**
- **git author**: 로컬 config가 개인 계정(`youngae.kim <kya754@gmail.com>`)으로 오버라이드됨. 글로벌 config(회사 이메일) 건드리지 말 것. 커밋 시 개인 계정 확인.
- **`.omc/` 커밋 금지.** 스테이징은 `git add -u` + 새 파일 명시, `git add .` 금지. `[code]` 등 대괄호 경로는 `GIT_LITERAL_PATHSPECS=1`.
- **브라우저 테스트(Chrome 익스텐션)는 사용자 명시 요청 시에만.** 기본 검증은 `tsc`/`eslint`/`build`.
- 모바일 390px 우선. 모든 mutation에 낙관적 업데이트 또는 invalidation.

## 6. 산출물·코드 위치

- `docs/spec.md` — 기능 명세(단일 기준, 2026-07-28 코드 현실로 최신화).
- `docs/design-system-v1.html` — 디자인 목업.
- `docs/handoff.md` — 이 문서.
- `supabase/migrations/*.sql` — 001~014. `supabase/functions/send-push/` — 푸시 Edge Function.
- 도메인: `src/lib/domain/`(box-status, winner, option-content, comments, mentions, option-sort, activity-label).
- API: `src/lib/api/`(boxes, options, votes, comments, favorites, folders, groups, invites, profile, push, unfurl …).
- 뷰어(신규): `src/app/invite/[code]/`(page.tsx·box-viewer.tsx·join-client.tsx), `src/lib/api/invites.ts`.
- Claude Code 메모리: `~/.claude/projects/-Users-kkomyoung-workspace-pickstash-web/memory/`(`project_pickstash.md` 상세 이력).

## 7. 남은 일 (Later)

- **그룹 기능 UI 확정**(현재 숨김).
- **다크모드**(토큰화 됨, `globals.css` 다크 값 대기).
- 창고 목록 **검색·친구/그룹 필터** 완성, 친구 자동 등록.
- **휴면 컬럼 정리**: `boxes.current_round`·`votes.round`·`votes.vote_type='dislike'`·options 레거시 4컬럼. 코드 의존(예: `current_round` 전달) 제거 후 드롭 검토 — `types.ts`에도 `owner_id`·`close_box`·`current_round`가 남아 있어 재생성 권장.
- **마감 투표 lazy commit 실동작 검증**: `auto_decide_box`는 상세/뷰어 진입 시 호출. 2계정·마감 경과 왕복 미검증.

## 8. 검증 방법

- 빌드/타입: `npm run build`, `npx tsc --noEmit`, `npm run lint`.
- 앱 확인: dev 서버(`npm run dev` — https, Serwist는 dev에서 disable + Turbopack). test1/test2 로그인 버튼으로 진입, 라이브 DB에 붙음.
- **브라우저 자동검증은 사용자 요청 시에만**(§5).
