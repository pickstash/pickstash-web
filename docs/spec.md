# 결정창고 — 개발 명세 (FULL)

> 이 문서는 결정창고의 전체 기능 명세다. AI 코딩 도구가 이 문서를 단일 기준(source of truth)으로 삼는다.
> 와이어프레임 PNG와 충돌하면 이 문서가 우선한다.

---

## 1. 서비스 개요

> 2026-07-20 기획 v1 반영 (노션 "결정창고 기획 정리 v1" 기준). 이 개정이 이전 명세와 충돌하면 이 문서의 현재 내용이 우선한다.

**타겟**: 카톡을 쓰는 2030. **대체 대상은 카톡 톡게시판** — 톡게시판의 4가지 불편(①투표 없음 ②알림 없음 ③게시판 무한 생성 ④댓글 사진 첨부 불가)을 해결한다. 새 기능 판단 잣대: "이게 ①~④ 중 무엇을 해결하나?"

**두 가지 사용 모드 (둘 다 1급)**:
- **모드 A. 친구와 결정**: 방장(총무형, 앱을 제대로 쓰는 한 명) + 참여자(설치·학습 의지 낮음 — 링크 클릭→카카오 로그인 1번→투표까지 마찰 제로, 창고·들썩임 등 용어 지식 제로로 완주 가능해야 함)
- **모드 B. 혼자 쓰기**: 고민 후보를 메모해두고 스스로 결정하는 개인 고민 보드. 마감 없는 상자가 자연스러움. 고민이 커지면 친구 초대로 전환(콜드 스타트 해소 루프)

도메인 구조는 3계층:

| 용어 | 의미 | 예시 |
|---|---|---|
| 창고 | 상자를 담는 공간 (어질러진 / 정리된 / 즐겨찾는) | — |
| 상자 (box) | 결정할 주제 | "해외여행 어디로 갈까?" |
| 선택지 (option) | 상자 안의 후보 | 비엔나, 터키, 아이슬란드 |

핵심 루프: **상자 생성(마감 선택) → (선택) 친구/그룹 초대 → 선택지 추가 → 좋아요 투표 → 정리 완료("이대로 결정하기") 또는 마감 → 정리된 창고에 기록으로 남음**. 동점/무투표로 마감된 상자에는 시스템이 **단순 재투표**를 제안하고, "다시 정리하기"로 재오픈할 수 있다.

**용어 카피 규칙**: 만든 용어(들썩이는 상자 등)는 첫 노출 시 반드시 한 줄 부제와 페어링한다. 행동 버튼은 결과를 말한다(예: "이대로 결정하기"). 끝장전이라는 용어는 UI에서 쓰지 않는다 — 재투표는 시스템 제안 문구("공동 1등이 나왔어요! 결승전으로 정해볼까요?")로 표현한다.

## 2. 기술 스택

- **Next.js (App Router) + TypeScript** — 초대링크의 동적 OG 메타태그(카카오톡 미리보기)에 서버 렌더링 필수
- **Supabase** — Auth(Kakao OAuth provider), Postgres, Realtime(투표·댓글 실시간 반영)
- **TanStack Query** — 서버 상태 관리, 낙관적 업데이트
- **Tailwind CSS** — 모바일 우선
- **Kakao JS SDK** — 카카오톡 공유(초대 메시지)
- **Serwist** — PWA(manifest + 서비스워커)
- **Vercel** — 배포

### 2-1. 아키텍처 원칙 — 웹→앱(React Native) 확장 대비

클라이언트(웹/앱)는 **Supabase와 직접 통신**한다. Next.js 서버는 API 게이트웨이가 아니다.
향후 RN 앱은 동일한 supabase-js로 같은 DB·RLS·Realtime을 그대로 사용하며, **웹 프로젝트의 배포·존재 여부와 완전히 독립**이다. 앱이 웹의 API Route에 의존하는 구조를 만들지 않는다.

로직 배치 규칙:

| 로직 종류 | 위치 | 이유 |
|---|---|---|
| 데이터 CRUD | 클라이언트 → Supabase 직접 호출 | RLS가 권한 보장 |
| 데이터 접근 권한 | RLS 정책 | 플랫폼 무관 |
| 공유 서버 로직 (트랜잭션, RLS 우회 조회) | Postgres RPC / Edge Function | 웹·앱 어디서나 동일하게 호출 |
| 웹 전용 관심사 (OG 렌더링, OAuth 콜백) | Next.js Route Handler | 앱에는 불필요한 웹 고유 기능 |
| 순수 계산 (getBoxStatus, 최다득표 집계) | 프레임워크 무관 TS 모듈 (`src/lib/domain/`) | RN 프로젝트에 그대로 이식 가능 |

데이터 계층 격리 (Supabase 의존 표면 최소화 — 추후 이전 시 `lib/api`만 교체):

```
src/
  lib/
    domain/         # 순수 계산 로직. 프레임워크·supabase를 import하지 않음
    api/            # supabase 호출이 존재할 수 있는 유일한 위치
      boxes.ts      # getBox, createBox, closeBox, startShowdown ...
      options.ts / votes.ts / groups.ts / invites.ts ...
  hooks/            # TanStack Query 훅. lib/api만 호출
  components/ app/  # supabase를 직접 import하지 않음. 훅만 사용
```

## 3. 상자 상태·라벨 규칙 (절대 규칙)

### 3-1. 상태는 컬럼으로 저장하지 않는다

상자 상태는 `deadline_at`, `closed_at`, `current_round`에서 **조회 시점에 파생 계산**한다. cron 불필요.

```ts
type BoxStatus = 'OPEN' | 'SHOWDOWN' | 'EXPIRED' | 'RESOLVED';

function getBoxStatus(box: {
  deadlineAt: Date | null;   // null = 마감 없는 상자 (혼자 모드 등)
  closedAt: Date | null;
  currentRound: number;
}): BoxStatus {
  if (box.closedAt) return 'RESOLVED';                // 정리 완료 (수동)
  if (box.deadlineAt && box.deadlineAt < new Date()) return 'EXPIRED'; // 시간 만료 (자동)
  if (box.currentRound > 1) return 'SHOWDOWN';        // 결판 중 (재투표 진행)
  return 'OPEN';                                       // 정리 미완료
}
```

마감 없는 상자(`deadline_at IS NULL`)는 EXPIRED가 될 수 없고, 수동 "이대로 결정하기"로만 RESOLVED가 된다.

- **어질러진 창고** = OPEN + SHOWDOWN
- **정리된 창고** = RESOLVED + EXPIRED
- **즐겨찾는 창고** = favorites에 있는 상자 (상태 무관, 위 둘과 중복 가능)

### 3-2. 상자 카드 라벨 (3종, 중복 가능 / 정리상태는 1개만)

| 라벨 | 조건 | 표시 |
|---|---|---|
| NEW | `boxes.updated_at > box_participants.last_seen_at` (내가 마지막으로 본 이후 업데이트됨). **모든 창고 목록에서 표시** | NEW 뱃지 (버터) |
| 즐겨찾기 | favorites에 존재 | 별 아이콘 |
| 정리상태 | 아래 4종 중 정확히 1개 | 상태 라벨 |

정리상태 라벨 4종 (항상 1개 표시):
- RESOLVED → **"정리완료!"** (leaf)
- EXPIRED → **"시간 만료"** (중립 회색)
- SHOWDOWN → **"결판 중"** (tangerine)
- OPEN → **"정리 미완료"** (아웃라인 중립)

부가 표시:
- **최다 득표**: RESOLVED/EXPIRED 상자에서 좋아요 최다 선택지 이름을 강조 노출(버터 형광펜 밑줄). 예: "신도림으로 결정!" 동점이면 결정 문구 대신 "공동 1등 N개" 표기. (싫어요 없이 좋아요 수로만 판정)
- 정리된 창고 카드는 **결정 결과가 주인공**이다 — 결정 문구를 제목 다음 최상단에, 날짜 메타는 보조로.

## 4. 라우트 맵

| 라우트 | 화면 | 비고 |
|---|---|---|
| `/login` | 로그인 | 카카오 로그인 버튼만. 비로그인 시 전 페이지가 여기로 리다이렉트. 비회원 둘러보기 없음 |
| `/auth/callback` | OAuth 콜백 | Supabase 세션 교환 |
| `/` | 메인 | 7-1 참조 |
| `/box/new` | 상자 생성 | 7-2 |
| `/box/[id]` | 상자 상세 | 7-3 |
| `/box/[id]/invite` | 친구 초대 | 7-4 |
| `/box/[id]/option/new` | 선택지 생성 | 7-6 |
| `/box/[id]/option/[optionId]` | 선택지 상세 | 7-5 |
| `/box/[id]/option/[optionId]/edit` | 선택지 수정 | 생성과 동일 폼 재사용 |
| `/messy` | 어질러진 창고 | 7-7 |
| `/done` | 정리된 창고 | 7-7 |
| `/favorites` | 즐겨찾는 창고 | 7-7 |
| `/invite/[code]` | 상자 초대 랜딩 | **generateMetadata로 OG 동적 렌더링** + 로그인 전 상자 미리보기 |
| `/groups` | 그룹 관리 | 7-8 |
| `/groups/[id]` | 그룹 상세 | 7-8 |
| `/group-invite/[code]` | 그룹 초대 랜딩 | OG 동적 렌더링 |
| `/profile` | 프로필 관리 | 7-9 |
| `/profile/withdraw` | 탈퇴하기 | 7-9 |

모달/바텀시트 (라우트 아님, 컴포넌트):
- 마감일시 설정 바텀시트, 그룹 검색 바텀시트, 참여 친구/그룹 필터 바텀시트, 그룹 만들기 모달, 햄버거 메뉴 드로어

## 5. DB 스키마 (Supabase SQL)

```sql
-- 프로필 (auth.users 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,                       -- 카카오 프로필 또는 기본 이미지
  created_at timestamptz not null default now()
);

-- 상자
create table boxes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  memo text,
  deadline_at timestamptz,               -- null = 마감 없는 상자 (혼자 모드)
  closed_at timestamptz,                 -- 수동 "이대로 결정하기" 시각. null이면 미완료
  current_round int not null default 1,  -- 끝장전 시작 시 +1
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 선택지
create table options (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes(id) on delete cascade,
  name text not null,
  content jsonb not null default '[]',   -- 본문 블록(순서 배치): [{type:'text',id,text} | {type:'image',id,url} | {type:'link',id,label,url}, ...]
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
  -- (레거시/휴면) summary·links·memo·images 컬럼은 006에서 content로 이관 후 미사용. 드롭하지 않고 스키마에만 남김.
);

-- 투표 (유저당 선택지×라운드 하나에 좋아요 1개 — 싫어요 없음)
create table votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('like', 'dislike')),
  round int not null default 1,          -- 끝장전 재투표는 round 2, 3...
  created_at timestamptz not null default now(),
  unique (option_id, user_id, round)
);

-- 상자 참여자
create table box_participants (
  box_id uuid not null references boxes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  last_seen_at timestamptz not null default now(),  -- NEW 라벨·들썩이는 상자 판정용
  joined_at timestamptz not null default now(),
  primary key (box_id, user_id)
);

-- 그룹
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,             -- 그룹명 전역 중복 불가 (그룹만들기 모달의 "중복확인")
  owner_id uuid not null references profiles(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- 그룹 멤버
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 즐겨찾기
create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  box_id uuid not null references boxes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, box_id)
);

-- 댓글 (선택지에 달림)
create table comments (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 탈퇴 사유 (익명 수집, 유저 FK 없음 — 탈퇴 후 보관)
create table withdraw_reasons (
  id uuid primary key default gen_random_uuid(),
  reasons jsonb not null default '[]',   -- 체크된 사유 목록
  detail text,                           -- 직접입력
  created_at timestamptz not null default now()
);

-- 상자 활동 로그 (들썩이는 상자에 "누가 뭘 했는지" 표시용, 2026-07 추가)
create table box_activities (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'option_added', 'vote_cast', 'comment_added',
    'box_closed', 'box_reopened', 'rematch_started',
    'deadline_changed', 'participant_joined'
  )),
  meta jsonb not null default '{}',      -- { "option_name": "비엔나" } 등 표시용 부가정보
  created_at timestamptz not null default now()
);
create index box_activities_box_created_idx on box_activities (box_id, created_at desc);
```

**활동 기록은 DB 트리거로 일원화한다** (클라이언트가 직접 기록하지 않음 — RN 앱도 자동 적용):
- `options`/`comments`/`votes`/`box_participants` AFTER INSERT 트리거 → `box_activities` insert
- `box_activities` AFTER INSERT 트리거 → `boxes.updated_at = new.created_at` 갱신
- 이로써 **이벤트 매트릭스**가 서버에서 보장된다: 선택지 추가·투표·댓글·참여·정리완료·재오픈·재투표 시작·마감 변경 전부가 들썩임(NEW) 신호를 만든다.

### RLS 방침
- 모든 테이블 RLS 활성화
- `boxes`/`options`/`votes`/`comments`: 해당 상자의 `box_participants`만 select/insert
- `boxes` 수정(정리 완료, 재투표 시작, 마감일 변경, 제목 수정): `role = 'owner'`만
- `votes`/`comments`/`favorites`: 본인 row만 insert/update/delete (`user_id = auth.uid()`)
- `options` 수정/삭제: `created_by = auth.uid()` 또는 상자 owner
- **정리된 상자 쓰기 가드 (서버 강제)**: 상자가 종결 상태(`closed_at IS NOT NULL` 또는 `deadline_at < now()`)면 `votes` insert/update/delete와 `options` insert/update/delete를 RLS에서 거부한다. UI disabled에만 의존하지 않는다. 예외: `comments`는 종결 상자에서도 허용(기록에 대한 대화), 본인 삭제도 허용
- `groups`: 멤버만 조회, owner만 수정. `group_members`: 본인 행 delete(그룹 나가기) 가능
- 예외: `/invite/[code]`, `/group-invite/[code]` 랜딩은 비참여자도 이름 조회 필요 → invite_code 기반 조회용 RPC 함수(`security definer`)로 처리
- 탈퇴: `auth.users` 삭제 → cascade로 전부 정리. 단 본인이 owner인 상자/그룹은 탈퇴 전 처리 정책 필요(가장 단순: 함께 삭제하고 탈퇴 화면에서 경고 문구 표시)

### RPC 함수 (웹·앱이 공유하는 서버 로직)

```sql
-- 비참여자가 초대 랜딩에서 상자 이름만 조회 (RLS 우회, 제한적 노출)
create or replace function get_box_by_invite_code(p_code text)
returns table (id uuid, title text) as $$
  select id, title from boxes where invite_code = p_code;
$$ language sql security definer;

-- 초대 수락: 현재 로그인 유저를 참여자로 등록
create or replace function join_box_by_invite_code(p_code text)
returns uuid as $$
declare v_box_id uuid;
begin
  select id into v_box_id from boxes where invite_code = p_code;
  insert into box_participants (box_id, user_id)
  values (v_box_id, auth.uid())
  on conflict do nothing;
  return v_box_id;
end;
$$ language plpgsql security definer;

-- 그룹 전원을 상자 참여자로 초대 (트랜잭션)
create or replace function invite_group_to_box(p_box_id uuid, p_group_id uuid)
returns void as $$
begin
  insert into box_participants (box_id, user_id)
  select p_box_id, user_id from group_members where group_id = p_group_id
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- 이대로 결정하기 (owner 검증 + 활동 기록, 2026-07 추가)
create or replace function close_box(p_box_id uuid) returns void ...;

-- 다시 정리하기: closed_at 해제 + (선택) 새 마감. EXPIRED 상자는 새 마감 필수 (2026-07 추가)
create or replace function reopen_box(p_box_id uuid, p_deadline timestamptz) returns void ...;

-- 재투표 시작: current_round += 1 + 새 마감 (owner 검증, 2026-07 추가)
create or replace function start_rematch(p_box_id uuid, p_deadline timestamptz) returns void ...;
```

(세 함수 전문은 `supabase/migrations/004_replan.sql`에 있다. 모두 `security definer` + owner 검증 + `box_activities` 기록 포함.)

호출 방식: `supabase.rpc('함수명', { 파라미터 })` — 웹과 RN 앱에서 완전히 동일하다.

## 6. 핵심 플로우

### 초대 플로우 (3가지 방식)
1. **카카오톡 초대**: Kakao JS SDK `Share.sendDefault`로 초대 메시지 전송 (제목: 상자 이름, 버튼: 초대링크)
2. **초대링크 복사**: `https://<도메인>/invite/<invite_code>` 클립보드 복사. 링크 클릭 시 OG 미리보기(상자 이름 + "투표하러 가기") 노출 → **랜딩에서 로그인 전에 상자 미리보기**(제목·메모·선택지 이름·참여 인원 — S2 마찰 제로의 핵심, `get_box_preview_by_invite_code` RPC) → 카카오 로그인 → `box_participants` insert → 상자 상세로
3. **그룹으로 초대**: 그룹 검색 바텀시트에서 그룹 선택 → 해당 그룹 멤버 전원을 `box_participants`에 insert

### 투표 플로우
1. 선택지의 좋아요 탭 → `votes` upsert (현재 `boxes.current_round` 기준). 재탭 = 취소(delete). 싫어요는 없음(좋아요 전용)
2. Supabase Realtime으로 같은 상자를 보는 참여자에게 카운트 실시간 반영. TanStack Query 낙관적 업데이트 병행
3. 화면에 노출되는 카운트·최다득표 계산은 항상 **현재 라운드의 votes만** 집계

### 재투표(단순) 플로우 — 구 "끝장전"의 축소판

복잡한 규칙(투표 자격 제한, 라운드 제한)은 의도적으로 버렸다. 재투표는 **시스템 제안**으로만 노출된다:

1. EXPIRED 상자 상세에서 owner에게 상황별 제안 배너 표시:
   - 공동 1등 → "공동 1등이 나왔어요! 결승전으로 정해볼까요?" + [재투표 시작] [이대로 두기]
   - 무투표/승자 있음 → "다시 정리하기" 버튼만
2. [재투표 시작] → 마감일시 바텀시트 → `start_rematch` RPC (`current_round += 1`, 새 deadline)
3. 이전 라운드 투표는 보존되지만 화면 집계에서 제외. 상태는 SHOWDOWN("결판 중")
4. 새 라운드에서 다시 투표 → 마감 또는 "이대로 결정하기"로 종료

### 마감/재오픈 플로우
- 수동: owner가 "이대로 결정하기" 탭 → `close_box` RPC (`closed_at = now()`) → 스탬프 피드백
- 자동: `deadline_at` 경과 시 조회 시점에 EXPIRED로 계산. 배치 작업 없음. 마감 없는 상자는 자동 마감 없음
- **다시 정리하기**: RESOLVED/EXPIRED 상자에서 owner가 재오픈 → confirm + (EXPIRED였다면 새 마감 필수 입력) → `reopen_box` RPC (`closed_at = null`)

### 읽음 처리 플로우
- 상자 상세 진입 시 `box_participants.last_seen_at = now()` 갱신
- 메인의 "지금 들썩이는 상자" = 내가 참여한 상자 중 `updated_at > last_seen_at`인 것. "모두 확인 처리" 버튼은 전부 `last_seen_at = now()`
- 들썩 항목에는 최신 `box_activities`를 문구로 표시: "하영님이 선택지를 추가했어요" (내 활동은 제외 — 트리거가 기록해도 표시에서 actor_id = 나면 제외)

## 7. 화면별 명세

### 7-1. 메인 `/`
- 헤더: "{닉네임}님의 결정창고" + 햄버거 메뉴
- **지금 들썩이는 상자** 패널 (버터 틴트 배경): 항목마다 NEW 뱃지 + 제목 + 최신 활동 문구("하영님이 선택지를 추가했어요") + "모두 확인 처리" 버튼
    - 빈 상태에도 패널 유지: "아직 들썩이는 상자가 없네요 / 친구들이 의견을 더하면 상자가 다시 들썩이기 시작할거에요!"
- 창고 진입 카드 3종 (동일 레이아웃 + 각 카운트): 어질러진 / 정리된 / 즐겨찾는
- 하단 고정: "새로운 상자 만들기" 버튼
- 첫 사용자(상자 0개)면 캐릭터 빈 상태 + 안내

### 7-2. 상자 생성 `/box/new`
- 상자 이름 input (필수, 빈 값 검증)
- 메모 input (선택)
- "마감 기한 설정" 체크박스: 체크 시 마감일시 표시, 탭하면 **마감일시 바텀시트**
    - 바텀시트: 날짜(YYYY-MM-DD), 시간(HH:MM) 선택, "현재 시간으로 변경" 체크, 확인 버튼
    - 과거 시간 선택 불가 검증
    - **미체크 시 마감 없는 상자로 생성** (`deadline_at = null`) — 혼자 고민 보드 용도. 부제: "마감 없이 두면 혼자 고민 정리용으로 좋아요"
- "상자 만들기" 버튼 → 생성 후 상자 상세로 이동, 생성자는 owner로 box_participants에 자동 insert

### 7-3. 상자 상세 `/box/[id]`
- 헤더: 뒤로가기(**내비 스택 유지** — 진입한 창고로 복귀), 제목, 즐겨찾기 토글
- 정리상태 라벨 + 상자 제목 + 수정하기(owner만) + 메모
- 생성일 / 마감일(없으면 "마감 없음") 표시 + "변경하기"(owner만, 바텀시트 재사용)
- 참여 인원 수 + 아바타 목록 + "+친구초대" → `/box/[id]/invite`. **참여자가 나 혼자면 초대 유도를 강요하지 않는다** (혼자 모드)
- 선택지 N개 목록: 카드마다 이름·본문 미리보기(첫 사진 + 첫 글 스니펫)·좋아요 버튼+카운트, 상단에 정렬 토글(최신순/좋아요순) + 무한스크롤, 탭하면 선택지 상세로
- 하단 버튼: "선택지 추가하기" / "이대로 결정하기"(owner만, 결과형 카피)
- RESOLVED: 결정 결과 + 스탬프 + "다시 정리하기"(owner) / EXPIRED: 상황별 재투표 제안 배너(6장 참조) + "다시 정리하기"(owner)
- RESOLVED/EXPIRED 상자는 투표·선택지 추가·수정·삭제 비활성 (서버 가드 병행). 댓글은 허용

### 7-4. 친구 초대 `/box/[id]/invite`
- 상자 이름 표시
- 버튼 3개: "카카오톡 초대" / "초대링크 복사" / "그룹으로 초대"
- 그룹으로 초대 → **그룹 검색 바텀시트**: 그룹명 검색 input, 내 그룹 목록(멤버 수 표시), 선택 → "초대하기"
- 현재 참여 친구 목록

### 7-5. 선택지 상세 `/box/[id]/option/[optionId]`
- 선택지 이름 + 편집(작성자 또는 owner) / 삭제(작성자만). **RESOLVED/EXPIRED 상자에서는 편집·삭제 UI를 숨긴다** (서버 가드 병행)
- 좋아요 버튼 + 카운트 (현재 라운드 기준)
- 본문: `content` 블록을 순서대로 렌더 — 글(문단)·사진·라벨 링크가 자유롭게 섞인다. 링크는 라벨 칩(비면 도메인명) + URL 형태로 표시
- 댓글: 입력창("댓글을 입력하세요" + 등록) + 작성자 아바타·닉네임·내용 목록, Realtime 반영

### 7-6. 선택지 생성/수정 `/box/[id]/option/new`, `.../edit`
- 동일 폼 컴포넌트 재사용. 상단: 취소 / 완료 버튼
- 선택지 이름 input (필수)
- 본문 블록 에디터: `＋글`·`＋사진`·`＋링크`로 블록 추가, 블록별 ↑↓ 이동·삭제. 사진은 1블록 1장(최대 6장), 링크는 라벨+URL. 상한 20블록. 저장 시 빈 글/빈 URL 블록은 제거
- 완료 시 저장 후 이전 화면 복귀, 취소 시 변경사항 폐기 (수정 중 이탈 시 confirm)

### 7-7. 창고 목록 3종 `/messy`, `/done`, `/favorites`
- 공통: 뒤로가기 + 페이지 타이틀 + 설명 문구
    - 어질러진: "아직 결정을 내리지 못한 상자들이에요. 마감 언저리 후보를 추가하고 결정을 도와줄 수 있어요."
    - 정리된: "아직 결정을 내리지 못한 상자들이 정리되어 모여있어요."
    - 즐겨찾는: "다시 꺼내보고 싶은 상자들이 모였어요."
- 검색: "상자명, 선택지 명" input + 검색 버튼 (상자 제목 + 선택지 이름 모두 매칭)
- 필터: "친구/그룹 선택" 칩 → **참여 친구/그룹 필터 바텀시트**
    - 이름 검색 input, 그룹 체크박스 목록, 친구 체크박스 목록, "적용하기" → 선택된 친구/그룹이 참여한 상자만 필터
- 정렬: 최신 순 / 오래된 순 / 업데이트 순 / 마감일 순
- 상자 카드: 라벨(NEW/즐겨찾기/정리상태), 제목, 최다득표 강조 텍스트(정리된 창고), 생성일·마감일, 참여 친구/그룹 칩
- 무한 스크롤 또는 더보기 페이지네이션

### 7-8. 그룹 `/groups`, `/groups/[id]`
- 그룹 관리: 설명 문구("초대하고 수락하는 과정 없이, 언제나 함께 상자를 정리할 수 있는 모임이에요"), 소속 그룹 목록(이름 + 멤버 N명), "새로운 그룹 만들기"
    - **그룹 만들기 모달**: 그룹명 input + "중복확인" 버튼 (동일 이름 존재 시 "동일한 이름의 그룹이 존재합니다."), 취소/확인. 생성자는 자동으로 멤버+owner
- 그룹 상세: 그룹명, 설명("상자 정리를 같이 할 친구를 초대해보세요. (최대 N명)"), "카카오톡 초대" / "초대링크 복사"(`/group-invite/[code]`), 현재 참여 친구 목록, "그룹 나가기"
- 그룹 멤버 상한: 30명 (초과 시 초대 불가 안내)

### 7-9. 프로필 / 탈퇴 `/profile`, `/profile/withdraw`
- 프로필 관리: 프로필 이미지(탭하여 변경 — 기본 프로필 이미지 또는 카카오 프로필), 닉네임 변경 input, "로그아웃", "탈퇴하기"
- 탈퇴하기: "결정창고를 정말 탈퇴하시겠어요?", 탈퇴 사유 체크박스(복수 선택: 사유1, 사유2, 직접입력 → 사유 입력 textarea), "정말 탈퇴하기"
    - 처리: withdraw_reasons에 사유 저장 → auth.users 삭제(cascade) → 로그인 페이지로
    - 본인이 owner인 상자/그룹이 있으면 함께 삭제됨을 경고

### 7-10. 공통: 햄버거 메뉴 (드로어)
- 결정창고: 어질러진 창고 / 정리된 창고 / 즐겨찾는 창고
- 마이페이지: 그룹 관리 / 프로필 관리

## 8. 권장 구현 순서

기능 구현 1~8단계(구 순서)는 2026-06까지 완료됨. **현재는 2026-07 리뉴얼 국면** — 아래 순서로 진행한다. 각 단계는 빌드 가능한 상태로 끝낸다.

1. **스키마 리뉴얼**: `004_replan.sql` — box_activities + 활동 트리거 + close/reopen/rematch RPC + deadline_at nullable + 정리된 상자 쓰기 가드 RLS + 초대 미리보기 RPC
2. **도메인·데이터 레이어**: getBoxStatus(null 마감), 라벨 4종, activities API/훅, 이벤트 매트릭스
3. **공통 리스킨 기반**: max-width 컨테이너, to-be 토큰(디자인 시스템 v1) 공통 컴포넌트, 테스트 로그인 숨김
4. **화면 재구현**: 로그인 → 메인(들썩 활동·빈 상태) → 창고 3종(라벨 4종·NEW 확대) → 상자 상세(결정/재투표/재오픈) → 선택지 → 생성(무마감) → 초대 착지(미리보기)
5. **마감재**: 드로어·그룹·프로필 리스킨, 전수 검증

완료(2026-07): 사진 첨부(005), 선택지 정렬(최신/좋아요순)·무한스크롤, 선택지 본문 블록-라이트 모델(006 — summary/memo/images/links → content 블록).
Later(이번 범위 아님): 친구 자동 등록, 그룹 라벨 파생, 다크모드, 검색/필터 완성

## 9. AI 작업 규칙

- 이 문서와 다른 스키마·상태 로직을 제안하지 않는다. 변경이 필요하면 먼저 이유를 설명하고 동의를 받는다.
- 상자 상태를 DB 컬럼으로 저장하는 코드를 작성하지 않는다 (3-1 절대 규칙).
- 8번 구현 순서에서 요청받은 단계만 작업한다. 다음 단계 기능을 선제 구현하지 않는다.
- 화면 작업 시 와이어프레임 PNG 캡처가 첨부되면 그 레이아웃을 우선한다.
- 모든 mutation에는 TanStack Query 낙관적 업데이트 또는 invalidation을 명시한다.
- 모바일(390px) 우선으로 스타일링한다.
- 컴포넌트·페이지에서 supabase 클라이언트를 직접 import하지 않는다. 모든 Supabase 호출은 `src/lib/api/*`에만 작성하고, UI는 TanStack Query 훅을 통해서만 데이터에 접근한다.
- 웹과 앱이 공유할 서버 로직을 Next.js Route Handler에 작성하지 않는다. Postgres RPC 또는 Edge Function으로 작성한다. Route Handler에는 OG 렌더링·OAuth 콜백 등 웹 전용 관심사만 둔다.
- 순수 계산 로직(getBoxStatus, 득표 집계 등)은 `src/lib/domain/`에 프레임워크 의존성 없는 순수 TS로 작성한다.
