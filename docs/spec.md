# 결정창고 — 개발 명세 (FULL)

> 이 문서는 결정창고의 전체 기능 명세다. AI 코딩 도구가 이 문서를 단일 기준(source of truth)으로 삼는다.
> 와이어프레임 PNG와 충돌하면 이 문서가 우선한다.

---

## 1. 서비스 개요

> 2026-07-20 기획 v1 반영 (노션 "결정창고 기획 정리 v1" 기준). 이 개정이 이전 명세와 충돌하면 이 문서의 현재 내용이 우선한다.

**타겟**: 카톡을 쓰는 2030. **대체 대상은 카톡 톡게시판** — 톡게시판의 4가지 불편(①투표 없음 ②알림 없음 ③게시판 무한 생성 ④댓글 사진 첨부 불가)을 해결한다. 새 기능 판단 잣대: "이게 ①~④ 중 무엇을 해결하나?"

**두 가지 사용 모드 (둘 다 1급)**:
- **모드 A. 친구와 결정**: 총무형 한 명(앱을 제대로 챙기는 사람 — 별도 권한 없음, 참여자 모두 동등) + 참여자(설치·학습 의지 낮음 — 링크 클릭→카카오 로그인 1번→투표까지 마찰 제로, 창고·들썩임 등 용어 지식 제로로 완주 가능해야 함)
- **모드 B. 혼자 쓰기**: 고민 후보를 메모해두고 스스로 결정하는 개인 고민 보드. 마감 없는 상자가 자연스러움. 고민이 커지면 친구 초대로 전환(콜드 스타트 해소 루프)

도메인 구조는 3계층:

| 용어 | 의미 | 예시 |
|---|---|---|
| 창고 | 상자를 담는 공간 (어질러진 / 정리된 / 즐겨찾는) | — |
| 상자 (box) | 결정할 주제 | "해외여행 어디로 갈까?" |
| 선택지 (option) | 상자 안의 후보 | 비엔나, 터키, 아이슬란드 |

핵심 루프: **상자 생성(결정 방식 선택) → (선택) 친구 초대 → 선택지·자료 추가 → 좋아요로 선호 표시 → 결정 → 정리된 창고에 기록으로 남음**. 결정 방식은 상자마다 둘 중 하나: **① 직접 정하기**(사람이 후보를 1개 이상 골라 확정, 마감 없음) 또는 **② 마감 투표**(마감 시각에 좋아요 최다가 자동 결정). 모든 결정은 **번복 가능**하고, 정리완료 후에도 상자는 계속 편집 가능한 **살아있는 기록**이다. *(v2 결정 모델, 2026-07-24 재정립 — 상세 §3.)*

> **v2에서 폐기된 개념**: 4상태(SHOWDOWN/EXPIRED)·시간만료 자동결정 limbo·재투표(끝장전)·라운드·동점 결승전·정리완료 쓰기잠금. 아래 명세에서 이들과 충돌하는 이전 서술은 §3/§6 v2 내용이 우선한다.

**용어 카피 규칙**: 만든 용어(들썩이는 상자 등)는 첫 노출 시 반드시 한 줄 부제와 페어링한다. 행동 버튼은 결과를 말한다(예: "이걸로 정하기"). 좋아요는 "투표"가 아니라 **참고용 선호 신호**로 표현한다(자동 결정은 마감 투표 모드에서만).

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

## 3. 상자 상태·결정 규칙 (절대 규칙) — v2 (2026-07-24)

> 기존 4상태(OPEN/SHOWDOWN/EXPIRED/RESOLVED)·시간만료 자동결정·재투표·라운드는 **폐기**한다. 이 §3이 현재 기준이며, 이전 서술과 충돌하면 이 내용이 우선한다.

### 3-1. 상태는 2개뿐, 컬럼으로 저장하지 않는다

상자 상태는 `closed_at` **하나**에서 조회 시점에 파생한다. cron 불필요.

```ts
// 실제 구현: src/lib/domain/box-status.ts
type BoxStatus = 'OPEN' | 'RESOLVED';   // 정리중 / 정리완료

function getBoxStatus(box: { closed_at: string | null }): BoxStatus {
  return box.closed_at ? 'RESOLVED' : 'OPEN';
}
```

- **정리중(OPEN)** = `closed_at IS NULL` — 아직 안 정함
- **정리완료(RESOLVED)** = `closed_at IS NOT NULL` — 정함(기록/아카이브)

`SHOWDOWN`·`EXPIRED`·`current_round`·시간만료 limbo는 **없다.**

### 3-2. 결정 방식 (상자마다 선택)

상자 생성 시 둘 중 하나를 고른다 (`boxes.decision_mode`). 결정 = **선택지에 "결정됨" 표시 + `closed_at` 세팅.**

| 방식 | 마감 | 결정이 일어나는 순간 |
|---|---|---|
| **직접 정하기** (`manual`, 기본) | 없음 | 사람이 후보 **1개 이상** 선택 → 확정. 여럿 상자는 참여자 누구나 가능(되돌리기 쉬움 + 활동 알림) |
| **마감 투표** (`auto_deadline`) | 있음 | 마감 시각에 **좋아요 최다 선택지(들)가 자동 결정** (동점이면 공동 결정) |

- **중복(여러 개) 결정 가능** — 결정된 후보가 1개 이상일 수 있음.
- **모든 결정은 번복 가능** — `closed_at`을 다시 null로 → 정리중 복귀, 재결정 가능.
- **마감은 오직 마감 투표 모드에서만 존재**한다(항상 실제로 결정을 발동하므로 "지나도 의미 없는 마감"이 생기지 않음). 직접 정하기 상자는 마감 없음.
- 자동 결정 커밋 방식(마감 경과 후 첫 조회 시 lazy commit vs 예약 작업)은 **구현 시 결정** — cron 지양 원칙 유지.

### 3-3. 마감 투표 — 신호 없을 때 (엣지)

자동 결정은 **신호가 있을 때만** 발동하고, 없으면 빈 결정을 만들지 않고 사람에게 넘긴다:

- **선택지 0개**로 마감 도달 → 결정 안 함. 상자는 그대로 정리중, "선택지가 없어 결정 못 했어요" 넛지(선택지 추가 or 마감 재설정)
- **좋아요 0개**(후보는 있으나 아무도 안 누름)로 마감 도달 → 자동결정 실패 → **직접 정하기로 폴백** ("아무도 안 골랐어요. 직접 정하거나 기한을 늘리세요")

→ limbo 없음. 마감 지나도 결정 못 하면 그냥 정리중에 머문다.

### 3-4. 편집 잠금 없음

정리완료여도 상자는 **살아있는 기록**이다. 제목·메모·선택지·자료·댓글·좋아요 **전부 언제나 편집 가능**(하드 잠금 없음, "정리된 상자 쓰기 가드" RLS 폐기). 단 **결정으로 표시된 선택지**를 삭제·수정할 땐 확인 한 번(실수로 결정 내용이 바뀌는 것 방지).

### 3-5. 창고 분류

| 창고 | 조건 |
|---|---|
| **어질러진 창고** | 정리중 (`closed_at IS NULL`) — 마감 투표 카운트다운 중·신호 없어 폴백 대기 중도 여기 |
| **정리된 창고** | 정리완료 (`closed_at IS NOT NULL`) = 기록 |
| **즐겨찾는 창고** | favorites에 있는 상자 (상태 무관, 위 둘과 가로지름) |

### 3-6. 카드 라벨

| 라벨 | 조건 | 표시 |
|---|---|---|
| NEW | `boxes.updated_at > last_seen_at` (모든 목록) | NEW 뱃지(버터) |
| 즐겨찾기 | favorites 존재 | 별 아이콘 |
| 정리상태 | 정리중 / 정리완료 중 1개 | 상태 라벨 |

- 정리중 → **"정리중"**(아웃라인 중립) / 정리완료 → **"정리완료!"**(색연필 손그림 동그라미 스탬프)
- **결정 결과 강조**: 정리완료 카드는 결정된 선택지 이름을 형광펜(버터) 밑줄로 최상단 노출 — "○○(으)로 결정!". 중복 결정이면 "○○ 외 N개로 결정".
- **좋아요**(여럿 상자)는 실시간 인기 신호, 결정권 없음(참고). **혼자 상자는 좋아요 미표시.**

### 3-7. 폴더 (주제별 상자 묶음, 사용자 정의) — 2026-07-28 추가

사용자가 만든 **이름 있는 상자 묶음**. 예: "여행" 폴더에 *여행지·항공권·음식·숙소* 결정 상자를 모아둠. 상태(어질러진/정리된)·즐겨찾기에 이은 **세 번째 분류 축**(주제)이다.

- **⚠️ 그룹(사람 묶음)과 다름**: `groups`/`group_members`는 *같이 초대할 친구 집합*(현재 UI 숨김). 폴더는 *상자 조직화*로 완전히 별개 축이다. 이름을 "그룹"으로 재사용하지 않는다.
- **모델 (개인별 폴더링)**: 폴더는 **각자 자기 것**(`folders.user_id`). 상자를 폴더에 넣는 것도 **사람마다 독립**(`box_folders(user_id, box_id, folder_id)` 조인) — 같은 공유 상자를 나는 "여행", 친구는 "모임"에 따로 넣어도 안 부딪힌다. **방장 개념에 의존하지 않음**(011의 owner/role 폐기와 정합). 사용자별 상자를 **여러 폴더에 중복 포함 가능**(018 — PK `(user_id, box_id, folder_id)`). 상자 상세 "폴더 지정"은 **다중 선택**.
- **상태 가로지름**: 폴더는 어질러진/정리된을 가로지른다(즐겨찾기처럼). 폴더 뷰(`/folder/[id]`)는 내가 그 폴더에 넣은 상자 전체를 **상태 무관** 노출.
- **미분류**(내 `box_folders` 행 없음) 상자는 기존 어질러진/정리된/즐겨찾는에 그대로 노출(폴더는 추가 뷰일 뿐 기존 뷰를 대체하지 않음).
- **폴더 삭제 시 상자는 지우지 않는다** — 분류(`box_folders`)만 FK cascade로 사라지고 상자는 그대로(미분류 복귀).
- **진입**: 햄버거 드로어에 "폴더" 섹션(내 폴더 목록 + 새 폴더). 상자 상세 편집 메뉴 "폴더 지정"(참여자 누구나 자기 폴더에).
- **폴더 공유 (018)**: 폴더도 상자처럼 `folders.invite_code`(예측불가 8자)로 **통째 링크 공유**한다. 링크(`/folder-invite/[code]`)는 상자 초대(§6-1)를 폴더 단위로 미러링한다.
  - **뷰어(비로그인 포함)**: `get_folder_view_by_invite_code`(security definer)로 폴더 + 그 안 상자 목록 스냅샷을 읽기 전용 노출. 각 상자는 자기 `invite_code`로 **상자 읽기전용 뷰어(§6-1)**로 연결(선택지·결과·댓글까지 열람).
  - **참여(로그인)**: `join_folder_by_invite_code` — 폴더 안 **모든 상자에 참여자로 즉시 등록**(`on conflict do nothing` — 이미 참여 중인 상자는 그대로 유지) + **폴더를 내 계정으로 복사**(`folders`+`box_folders`, 초대자가 만든 것처럼). 복사본은 `source_folder_id`로 원본을 기억해 **재참여 멱등**(중복 폴더 안 생김). 복사 후 내 폴더(`/folder/[id]`)로 이동.
  - **라이브 동기화 (019)**: 참여는 스냅샷 복사가 아니라 원본 폴더 **구독**이다. 소유자가 폴더에 상자를 추가하면 구독자 전원 그 상자에 자동 참여 + 복사본 폴더에 추가되고, 소유자가 폴더에서 상자를 제외하면 구독자 복사본에서도 그 상자 분류가 제거된다(참여 자격은 유지). `box_folders` 트리거 `sync_folder_box_to_subscribers`(security definer)로 서버 일원화(웹·RN 공통). **폴더 삭제는 전파하지 않음**(복사본 독립 유지, `source_folder_id` on delete set null로 구독만 종료).
  - 폴더 소유자/이미 참여(복사)한 사용자가 링크를 열면 자기 폴더로 리다이렉트(상자 뷰어의 "참여자→/box/[id]"와 동형).

## 4. 라우트 맵

| 라우트 | 화면 | 비고 |
|---|---|---|
| `/login` | 로그인 | 카카오 로그인 버튼만. 비로그인 시 대부분 페이지가 여기로 리다이렉트. 예외: `/invite/[code]`·`/group-invite/[code]`는 비로그인 접근 허용(§6-1 뷰어) |
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
| `/folder/[id]` | 폴더 (주제별 상자 묶음) | 상태 무관 전체. §3-7 |
| `/folder-invite/[code]` | 폴더 초대 랜딩 = **읽기 전용 뷰어** | OG 동적 렌더링 + 비로그인 포함 누구나 폴더 안 상자 목록을 열람(각 상자는 §6-1 상자 뷰어로). 로그인 후 참여 시 전체 상자 참여+폴더 복사. 소유자/기참여자는 `/folder/[id]`로 리다이렉트. §3-7·018 |
| `/invite/[code]` | 상자 초대 랜딩 = **읽기 전용 뷰어** | **generateMetadata로 OG 동적 렌더링** + 비로그인 포함 누구나 상자 전체(선택지·내용·결과·좋아요수·댓글)를 읽기 전용으로 열람. 참여자는 `/box/[id]`로 리다이렉트. §6-1 |
| `/groups` | 그룹 관리 | 7-8 |
| `/groups/[id]` | 그룹 상세 | 7-8 |
| `/group-invite/[code]` | 그룹 초대 랜딩 | OG 동적 렌더링 |
| `/profile` | 프로필 관리 | 7-9 |
| `/profile/withdraw` | 탈퇴하기 | 7-9 |

모달/바텀시트 (라우트 아님, 컴포넌트):
- 마감일시 설정 바텀시트, 그룹 검색 바텀시트, 참여 친구/그룹 필터 바텀시트, 그룹 만들기 모달, 햄버거 메뉴 드로어

## 5. DB 스키마 (Supabase SQL)

> **스키마 적용 이력 (007~014 전부 라이브 적용 완료 — 아래 SQL 블록은 이미 이 변경들을 반영한 현재 상태다):**
> - **007 v2 결정**: `boxes.decision_mode`(`'manual'`|`'auto_deadline'`) + `options.decided_at`(중복 결정 가능) 추가. `start_rematch`·2인자 `reopen_box` 드롭. `decide_box(p_box_id, p_option_ids uuid[])`·1인자 `reopen_box`·`auto_decide_box` 신설. "정리된 상자 쓰기 가드" RLS 폐기.
> - **008 협업 개방**: 상자·선택지 수정/삭제를 `owner`/작성자 한정 → **참여자 누구나**. 상자 직접 삭제 폐기, '나가기'만 + 마지막 1명 나가면 자동 삭제 트리거.
> - **010 댓글 강화**: `comments.parent_comment_id`(답글, 플랫 2단계 트리거 강제)·`edited_at` + `comment_likes` 테이블 + Realtime 발행.
> - **011 방장 제거**: **`boxes.owner_id`·`box_participants.role` 컬럼 삭제**. 이를 참조하던 RLS·RPC(`close_box`, 미리보기의 owner_nickname) 재작성.
> - **012 폴더**: `folders`(각자 자기 폴더) + `box_folders(user_id, box_id, folder_id)` 조인. 개인별 폴더링(사람마다 독립, 방장 무관). §3-7. RLS: 본인 행만.
> - **014 링크 뷰어**: `get_box_view_by_invite_code`(비로그인 포함 읽기 전용 상자 전체 조회). §6-1.
> - **018 폴더 공유**: `folders.invite_code`·`folders.source_folder_id` 추가. **`box_folders` PK → `(user_id, box_id, folder_id)`**(상자 다중 폴더 포함). RPC 3종(`get_folder_by_invite_code`·`get_folder_view_by_invite_code`·`join_folder_by_invite_code`). §3-7.
> - **019 폴더 라이브 동기화**: `box_folders` AFTER INSERT/DELETE 트리거 `sync_folder_box_to_subscribers`(security definer) — 소유자 원본 폴더의 상자 추가/제외를 구독 복사본(`source_folder_id`)에 전파(추가=참여+분류, 제외=분류 제거, 폴더 삭제는 전파 안 함). 순수 DB, 앱 코드 변경 없음. §3-7.
> - **휴면(드롭 안 함)**: `boxes.current_round`, `votes.round`(항상 1), `votes.vote_type='dislike'`, options의 레거시 4컬럼. 코드가 아직 일부를 읽어(예: `current_round` 전달) 물리 삭제하지 않음.

```sql
-- 프로필 (auth.users 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,                       -- 카카오 프로필 또는 기본 이미지
  created_at timestamptz not null default now()
);

-- 상자  (owner_id·role은 011에서 제거됨 — 참여자 누구나 동등)
create table boxes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  memo text,
  decision_mode text not null default 'manual',  -- 'manual'(직접 정하기) | 'auto_deadline'(마감 투표). 007
  deadline_at timestamptz,               -- auto_deadline에서만 사용. manual은 null(마감 없음)
  closed_at timestamptz,                 -- 정리완료 시각. null이면 정리중 (상태는 여기서만 파생)
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- (휴면) current_round: v1 끝장전 잔재. 미사용이나 드롭 안 함(코드가 아직 값을 읽어 전달) — types.ts에도 남음.
);

-- 선택지
create table options (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes(id) on delete cascade,
  name text not null,
  content jsonb not null default '[]',   -- 본문 블록(순서 배치): [{type:'text',id,text} | {type:'image',id,url} | {type:'link',id,label,url}, ...]
  decided_at timestamptz,                -- null=미결정, 값=결정된 선택지. 한 상자에 여러 개 가능(중복 결정). 007
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
  -- (레거시/휴면) summary·links·memo·images 컬럼은 006에서 content로 이관 후 미사용. 드롭하지 않고 스키마에만 남김.
);

-- 투표 (유저당 선택지 하나에 좋아요 1개 — 싫어요 없음, 라운드 없음)
create table votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('like', 'dislike')),  -- 실제로는 'like'만 사용('dislike' 휴면)
  round int not null default 1,          -- (휴면) v1 끝장전 잔재. 항상 1. 미사용이나 코드가 값을 전달해 드롭 안 함
  created_at timestamptz not null default now(),
  unique (option_id, user_id, round)
);

-- 상자 참여자  (role은 011에서 제거 — 참여자 누구나 동등. 생성자=첫 참여자일 뿐 특권 없음)
create table box_participants (
  box_id uuid not null references boxes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),  -- NEW 라벨·들썩이는 상자 판정용
  joined_at timestamptz not null default now(),
  primary key (box_id, user_id)
);
-- 라이프사이클(008): 상자 직접 삭제 없음 = '나가기'(box_participants delete)만. 마지막 1명이 나가면 트리거가 상자 자동 삭제(cascade).

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

-- 폴더 (주제별 상자 묶음, 사용자 정의). 그룹(사람 묶음)과 무관 — §3-7. 개인별: box_folders 조인으로 연결.
-- 018: invite_code(공유 링크)·source_folder_id(참여 복사 원본) 추가.
create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,  -- 폴더 만든 사람(각자 자기 폴더)
  name text not null,
  sort int not null default 0,           -- 드로어 표시 순서
  invite_code text not null unique default substr(md5(random()::text), 1, 8),  -- 018 공유 링크
  source_folder_id uuid references folders(id) on delete set null,             -- 018 참여로 복사된 원본(멱등 재참여)
  created_at timestamptz not null default now()
);

-- 상자↔폴더 분류 (개인별). "이 사용자가 이 상자를 이 폴더에 넣음".
-- 018: PK에 folder_id 포함 → 한 상자를 여러 폴더에 중복 포함 가능(사용자별).
create table box_folders (
  user_id uuid not null references profiles(id) on delete cascade,
  box_id uuid not null references boxes(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  sort int not null default 0,           -- 폴더 안 상자 순서(015)
  created_at timestamptz not null default now(),
  primary key (user_id, box_id, folder_id)
);

-- 댓글 (선택지에 달림). 답글은 플랫 2단계(parent_comment_id, 답글의 답글 금지)
-- 멘션은 별도 컬럼 없이 body에 `@[닉네임](userId)` 토큰으로 인라인 저장(닉네임 unique 아님 → id 기준)
create table comments (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  parent_comment_id uuid references comments(id) on delete cascade,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

-- 댓글 좋아요 (참여자 누구나 토글)
create table comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
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

### RLS 방침  (008·011 반영 — 상자 단위는 방장 없이 "참여자면 누구나")
- 모든 테이블 RLS 활성화
- `boxes`/`options`/`votes`/`comments`: 해당 상자의 `box_participants`만 select/insert
- **`boxes` 수정**(제목·메모·마감·결정방식): **참여자 누구나**(008/011 — `role='owner'` 조건 폐기). 직접 delete 정책 없음(나가기 트리거만).
- **`options` 수정/삭제**: **참여자 누구나**(008 — 구 "작성자·owner" 조건 폐기). insert는 `created_by = self` + 참여자.
- `votes`/`comments`/`favorites`: 본인 row만 insert/update/delete (`user_id = auth.uid()`)
- **정리된 상자 쓰기 가드 폐기**(007, §3-4): 정리완료(`closed_at IS NOT NULL`) 상자에서도 좋아요·선택지·댓글 편집을 RLS가 막지 않는다. *(투표 차단은 UI 레벨에서만 — "정리된 상자에선 투표할 수 없어요".)*
- `comments`: 답글은 플랫 2단계로 서버 트리거가 강제(답글의 답글 insert 거부). 수정 시 트리거가 `edited_at` 자동 기록. `@[닉네임](userId)` 멘션 포함 댓글 등록 시 멘션된 사용자에게 "OO님이 언급했어요" 타겟 push 별도 발송(참여자 전체 브로드캐스트와 별개).
- `comment_likes`: 참여자면 select, insert/delete는 본인 row만(update 없는 순수 토글).
- `folders`/`box_folders`(012): 본인 행만 select/insert/update/delete (`user_id = auth.uid()`).
- `groups`: 멤버만 조회, owner만 수정. `group_members`: 본인 행 delete(그룹 나가기). *(그룹은 별개 기능이라 `owner_id` 유지 — 상자의 방장 제거와 무관.)*
- 예외: `/invite/[code]`, `/group-invite/[code]`, `/folder-invite/[code]` 랜딩은 비참여자·비로그인도 조회 필요 → invite_code 기반 `security definer` RPC로 처리(`get_box_by_invite_code`·`get_box_view_by_invite_code`·그룹 대응·폴더 대응 `get_folder_by_invite_code`·`get_folder_view_by_invite_code`·`join_folder_by_invite_code`).
- 탈퇴: `auth.users` 삭제 → cascade로 전부 정리. 상자는 방장이 없으므로(011) 탈퇴=나가기 취급 → 마지막 참여자면 상자 자동 삭제(008). 그룹은 owner면 별도 정책.

### RPC 함수 (웹·앱이 공유하는 서버 로직)

```sql
-- 비참여자가 초대 랜딩에서 상자 이름만 조회 (RLS 우회, 제한적 노출 — OG/메타태그용)
create or replace function get_box_by_invite_code(p_code text)
returns table (id uuid, title text) as $$
  select id, title from boxes where invite_code = p_code;
$$ language sql security definer;

-- 초대 링크 읽기 전용 뷰어(§6-1): 비로그인 포함 누구나 상자 전체 스냅샷을 jsonb로 조회.
--   (상자·참여자·선택지(내용/결정/좋아요수)·댓글(답글/좋아요수/작성자)). invite_code로만 제한.
--   014_public_box_view.sql. anon·authenticated 모두 execute grant. 순수 조회(쓰기 없음).
create or replace function get_box_view_by_invite_code(p_code text)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object( /* box + participants + options[+comments] ... */ )
  from boxes b where b.invite_code = p_code;
$$;

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

-- 폴더 공유(018): 이름 조회(OG)·뷰어 스냅샷·참여(전체 상자 참여 + 폴더 복사). 상세 = 018_folder_sharing.sql.
create or replace function get_folder_by_invite_code(p_code text)
returns table (id uuid, name text) as $$
  select id, name from folders where invite_code = p_code;
$$ language sql security definer;  -- anon·authenticated grant

-- 뷰어: 폴더 + 그 안 상자 목록(공유자의 box_folders 분류) 스냅샷 jsonb. 각 상자에 invite_code 포함(상자 뷰어 링크).
create or replace function get_folder_view_by_invite_code(p_code text)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object('id', f.id, 'name', f.name, 'owner_id', f.user_id, 'boxes', /* … */ '[]'::jsonb)
  from folders f where f.invite_code = p_code;
$$;  -- anon·authenticated grant

-- 참여: 폴더 안 모든 상자에 참여자 등록(on conflict do nothing) + 폴더를 내 계정으로 복사(source_folder_id로 멱등). 내 폴더 id 반환.
create or replace function join_folder_by_invite_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$ /* … */ $$;  -- authenticated grant

-- 결정하기 (참여자 검증 + 활동 기록). 선택 옵션(들)에 decided_at + closed_at 세팅, 나머지 해제. 007
create or replace function decide_box(p_box_id uuid, p_option_ids uuid[]) returns void ...;

-- 다시 정리하기(번복): closed_at·decided_at 모두 해제 → 정리중 복귀. 마감 인자 없음. 007
create or replace function reopen_box(p_box_id uuid) returns void ...;

-- 마감 투표 자동 결정(lazy commit): auto_deadline + 마감경과 + 미결일 때 좋아요 최다(들) 결정. 신호 없으면 no-op. 007/011
create or replace function auto_decide_box(p_box_id uuid) returns void ...;
```

- 위 결정계 RPC 전문은 `supabase/migrations/007_v2_decision.sql`(+011 patch)에 있다. **owner 검증이 아니라 참여자 검증**(`box_participants`에 auth.uid()) + `box_activities` 기록.
- **폐기됨(드롭)**: `close_box(uuid)`(011), `start_rematch`·2인자 `reopen_box`(007). 재투표·`current_round` 개념 없음(§3 v2).

호출 방식: `supabase.rpc('함수명', { 파라미터 })` — 웹과 RN 앱에서 완전히 동일하다.

## 6. 핵심 플로우

### 6-1. 초대 링크 = 읽기 전용 뷰어 (노션식, 2026-07-28 추가)

`/invite/[code]`는 **로그인 안 한 사람을 포함해 누구나** 상자 전체를 **읽기 전용**으로 볼 수 있는 페이지다(노션 공개 페이지처럼 "링크를 아는 사람은 열람 가능"). 예측 불가한 8자 `invite_code`가 접근 키.

- **노출 범위**: 상자 제목·메모·참여 인원/아바타·결정 상태·결정 결과 + **모든 선택지**(이름·본문 블록(글/사진/링크/유튜브)·좋아요 수·"지금 1위"·결정 표시) + **모든 댓글**(답글·좋아요 수·멘션·수정됨 표시). 여럿 상자만 좋아요/1위 노출(혼자 상자는 미표시 — 앱과 동일).
- **읽기 전용**: 좋아요·댓글·결정·참여 등 **쓰기 액션은 전부 없음**. 하단 고정 CTA "카카오로 로그인하고 참여하기"로만 유도. RLS는 그대로(쓰기는 로그인+참여자만) — 뷰어는 `get_box_view_by_invite_code`(security definer, invite_code 제한) 하나로 조회.
- **분기**: 비로그인/비참여자 → 뷰어. 이미 **참여자**면 편집 가능한 `/box/[id]`로 즉시 리다이렉트. 유효하지 않은 코드 → "유효하지 않은 초대 링크예요."
- **lazy commit**: 로그인 사용자가 마감 지난 `auto_deadline` 상자를 뷰어로 열면 `auto_decide_box` 호출 후 재조회(비로그인 열람은 쓰기 유발 없이 저장된 상태 그대로).

### 초대 플로우 (3가지 방식)
1. **카카오톡 초대**: Kakao JS SDK `Share.sendDefault`로 초대 메시지 전송 (제목: 상자 이름, 버튼: 초대링크)
2. **초대링크 복사**: `https://<도메인>/invite/<invite_code>` 클립보드 복사. 링크 클릭 시 OG 미리보기(상자 이름 + "함께 정하러 가기") 노출 → **랜딩 = 읽기 전용 뷰어(§6-1)로 로그인 전에 상자 전체 열람** → "카카오로 로그인하고 참여하기" → `box_participants` insert → 상자 상세로. *(구 미리보기 카드(`get_box_preview_by_invite_code`)는 뷰어로 대체됐고 RPC는 OG/메타용으로 잔존.)*
3. **그룹으로 초대**: 그룹 검색 바텀시트에서 그룹 선택 → 해당 그룹 멤버 전원을 `box_participants`에 insert

### 좋아요(선호 표시) 플로우 — 여럿 상자만
1. 선택지의 좋아요 탭 → `votes` upsert. 재탭 = 취소(delete). 싫어요 없음(좋아요 전용). **라운드 개념 없음.**
2. Supabase Realtime으로 카운트 실시간 반영 + **"지금 1위: ○○" 실시간 표시.** TanStack Query 낙관적 업데이트 병행.
3. 좋아요는 **참고용 인기 신호**다 — 결정권 없음. **혼자 상자에선 좋아요를 노출하지 않는다.**

### 결정 플로우 ① 직접 정하기 (`manual`)
1. 참여자 누구나 "이걸로 정하기" → 선택지 **1개 이상** 선택 → 확정.
2. 확정 = 선택 옵션에 "결정됨" 표시 + `closed_at = now()` → 정리완료(정리된 창고). 활동 기록 + 참여자 알림("○○로 정리했어요").
3. **번복**: 정리완료 상자에서 "다시 정리하기" → `closed_at = null` + 결정 표시 해제 → 정리중 복귀, 재결정 가능.

### 결정 플로우 ② 마감 투표 (`auto_deadline`)
1. 생성 시 마감 시각 설정. 마감 전까지 좋아요로 선호가 쌓임("지금 1위" 실시간).
2. **마감 도달 → 좋아요 최다 선택지(들)를 자동 "결정됨" 표시 + `closed_at` 세팅** (동점이면 공동 결정=중복). 커밋 시점(마감 후 첫 조회 시 lazy commit vs 예약 작업)은 구현에서 결정, cron 지양.
3. **엣지(§3-3)**: 선택지 0 → 마감 무효, 정리중 유지 + 넛지. 좋아요 0 → 자동결정 실패 → 직접 정하기로 폴백.
4. 마감 투표 상자도 결정 후 **번복 가능**(다시 정리하기 → 정리중).

> **v2 제거**: `EXPIRED`·`SHOWDOWN`·재투표·`start_rematch`·`current_round`·동점 결승전. 동점은 그냥 공동 결정으로 끝난다.

### 읽음 처리 플로우
- 상자 상세 진입 시 `box_participants.last_seen_at = now()` 갱신
- 메인의 "지금 들썩이는 상자" = 내가 참여한 상자 중 `updated_at > last_seen_at`인 것. "모두 확인 처리" 버튼은 전부 `last_seen_at = now()`
- 들썩 항목에는 최신 `box_activities`를 문구로 표시: "하영님이 선택지를 추가했어요" (내 활동은 제외 — 트리거가 기록해도 표시에서 actor_id = 나면 제외)

## 7. 화면별 명세

> **화면 현황 (전부 구현 완료 — 아래 개별 명세와 충돌하면 이 요약이 현재 동작 기준):**
> - **상자 생성**: **결정 방식 선택**(직접 정하기 / 마감 투표) 카드. 마감일시는 마감 투표를 고를 때만 노출.
> - **상자 상세**: 재투표·시간만료 UI 없음. "이걸로 정하기"(선택지 1+, 참여자 누구나) + 정리완료 후 "다시 정리하기"(번복). 여럿 상자 "지금 1위" 실시간, 혼자 상자 좋아요 미표시. 정리완료여도 편집 가능. 편집 메뉴에 결정 방식 변경·폴더 지정·나가기.
> - **창고 목록**: `closed_at` 기준(정리중/정리완료) 판정. 결정된 선택지 형광펜 강조.
> - **폴더(§3-7)**: 드로어 "폴더" 섹션(목록+생성), `/folder/[id]` 뷰(상태 무관), 상세 편집 메뉴 "폴더 지정"(개인별). 구현 완료.
> - **댓글**: 답글(플랫 2단계)·좋아요·수정("· 수정됨")·`@`멘션 자동완성/강조·Realtime 전부 구현.
> - **초대 링크 = 읽기 전용 뷰어(§6-1)**: `/invite/[code]`에서 비로그인 포함 전체 열람.
> - **그룹/그룹초대**: 개념 정립 전까지 UI 숨김(드로어 "그룹 관리", 초대 화면 "그룹으로 초대" 주석 처리 — 코드/페이지/`/group-invite`는 유지).
> - **푸시 알림**: `push_subscriptions` + Serwist SW + send-push Edge Function. 활동/멘션 시 발송(§7-11).

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
- **결정 방식 선택** (`decision_mode`):
    - **직접 정하기** (기본) — 마감 없음. 부제: "원할 때 직접 골라 정해요 (안 정하고 모아두기만 해도 돼요)". 생성 후 편집 메뉴(참여자 누구나)에서 결정 방식 변경 가능.
    - **마감 투표** — 선택 시 **마감일시 바텀시트**(날짜·시간, 과거 불가 검증). 부제: "마감 때 좋아요 최다가 자동 결정돼요"
- "상자 만들기" 버튼 → 생성 후 상자 상세로 이동, 생성자는 box_participants에 자동 insert(첫 참여자 — 별도 role/owner 없음)

### 7-3. 상자 상세 `/box/[id]`
> 상태는 2종(OPEN/RESOLVED)뿐 — EXPIRED 없음. 모든 편집 액션은 **참여자 누구나**(방장 없음, 008/011). 편집 메뉴(⋯)에 제목·메모·결정방식·마감·폴더 지정·나가기를 모은다.
- 헤더: 뒤로가기(**내비 스택 유지** — 진입한 창고로 복귀), 제목, 즐겨찾기 토글
- 정리상태 라벨 + 상자 제목 + 메모 + 편집 메뉴(제목·메모 수정)
- 마감일(`auto_deadline`만 표시, `manual`은 마감 없음) + "변경하기"(바텀시트) / 결정 방식 변경(정리중일 때)
- 참여 인원 수 + 아바타 목록 + "+친구초대" → `/box/[id]/invite`. **참여자가 나 혼자면 초대 유도를 강요하지 않는다** (혼자 모드)
- 선택지 N개 목록: 카드마다 이름·본문 미리보기(첫 사진 + 첫 글 스니펫)·(여럿 상자만)좋아요 버튼+카운트·"1위" 뱃지·"결정" 뱃지, 상단에 정렬 토글(최신순/좋아요순) + 무한스크롤, 탭하면 선택지 상세로
- 하단 버튼: "선택지 추가하기" / `manual`·정리중이면 "이걸로 정하기"(선택지 1+ 선택→확정, 참여자 누구나)
- **정리완료(RESOLVED)**: 결정 결과("○○(으)로 결정!", 없으면 "결정 없이 마무리") + 스탬프 + "다시 정리하기"(번복, 누구나). **정리완료여도 제목·메모·선택지·댓글·좋아요·폴더 편집은 계속 가능**(§3-4). 단 투표(좋아요)만 UI에서 비활성("정리된 상자에선 투표할 수 없어요").

### 7-4. 친구 초대 `/box/[id]/invite`
- 상자 이름 표시
- 버튼: "카카오톡 초대" / "초대링크 복사" *("그룹으로 초대"는 현재 숨김 — §7-8 그룹 UI 숨김과 정합)*
- (숨김) 그룹으로 초대 → **그룹 검색 바텀시트**: 그룹명 검색 input, 내 그룹 목록(멤버 수 표시), 선택 → "초대하기"
- 현재 참여 친구 목록

### 7-5. 선택지 상세 `/box/[id]/option/[optionId]`
- 선택지 이름 + 편집 메뉴(수정·삭제 — **참여자 누구나**, 008). 정리완료 상자에서도 편집 가능(§3-4).
- (여럿 상자만) 좋아요 버튼 + 카운트. 정리완료 상자는 좋아요 비활성. 혼자 상자는 좋아요 미표시.
- 본문: `content` 블록을 순서대로 렌더 — 글(문단)·사진·라벨 링크가 자유롭게 섞인다. 링크는 라벨 칩(비면 도메인명) + URL 형태로 표시
- 댓글: 입력창("댓글을 입력하세요" + 등록) + 작성자 아바타·닉네임·작성 시각(상대 시간)·내용 목록, Realtime 반영
  - 답글(플랫 2단계, 부모 아래 들여쓰기), 좋아요(하트+카운트 토글), 본인 댓글 수정("· 수정됨" 표시)·삭제(답글도 함께 삭제)
  - `@` 입력 시 상자 참여자 자동완성 → 멘션 강조 표시 + 멘션된 사람에게 타겟 push

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

### 7-8. 그룹 `/groups`, `/groups/[id]`  ⚠️ 현재 진입 UI 숨김(개념 정립 전까지 — 코드·페이지·RPC는 유지)
> 그룹은 상자의 방장 제거(011)와 무관한 별개 기능이라 `groups.owner_id`를 유지한다. 아래는 코드에 남아있는 명세.
- 그룹 관리: 설명 문구("초대하고 수락하는 과정 없이, 언제나 함께 상자를 정리할 수 있는 모임이에요"), 소속 그룹 목록(이름 + 멤버 N명), "새로운 그룹 만들기"
    - **그룹 만들기 모달**: 그룹명 input + "중복확인" 버튼 (동일 이름 존재 시 "동일한 이름의 그룹이 존재합니다."), 취소/확인. 생성자는 자동으로 멤버+owner
- 그룹 상세: 그룹명, 설명("상자 정리를 같이 할 친구를 초대해보세요. (최대 N명)"), "카카오톡 초대" / "초대링크 복사"(`/group-invite/[code]`), 현재 참여 친구 목록, "그룹 나가기"
- 그룹 멤버 상한: 30명 (초과 시 초대 불가 안내)

### 7-9. 프로필 / 탈퇴 `/profile`, `/profile/withdraw`
- 프로필 관리: 프로필 이미지(탭하여 변경 — 기본 프로필 이미지 또는 카카오 프로필), 닉네임 변경 input, "로그아웃", "탈퇴하기"
- 탈퇴하기: "결정창고를 정말 탈퇴하시겠어요?", 탈퇴 사유 체크박스(복수 선택: 사유1, 사유2, 직접입력 → 사유 입력 textarea), "정말 탈퇴하기"
    - 처리: withdraw_reasons에 사유 저장 → auth.users 삭제(cascade) → 로그인 페이지로
    - 상자엔 방장이 없으므로(011) 탈퇴=나가기 취급 → 내가 마지막 참여자인 상자만 함께 삭제(008). 본인이 owner인 **그룹**이 있으면 함께 삭제 경고.

### 7-10. 공통: 햄버거 메뉴 (드로어)
- 결정창고: 어질러진 창고 / 정리된 창고 / 즐겨찾는 창고
- **폴더**(§3-7): 내 폴더 목록(각각 `/folder/[id]`) + 인라인 "새 폴더" 생성
- 마이페이지: 프로필 관리 *(그룹 관리는 현재 숨김 — §7-8)*

### 7-11. 푸시 알림 (Web Push)
- **구독**: `PushNotificationBanner`가 권한 요청(1회, localStorage로 dismiss 기억) → `subscribeToPush`가 VAPID 키로 구독해 `push_subscriptions`(user_id, endpoint, keys) upsert. 프로필에서 on/off.
- **발송**: `send-push` **Edge Function**(`supabase/functions/send-push`)을 `lib/api`에서 `functions.invoke('send-push', …)`로 호출 — 선택지 추가(options)·댓글/멘션(comments)·결정 등 활동 시 상자 참여자에게. 멘션은 대상자에게 별도 타겟 발송.
- SW는 Serwist(`src/app/sw.ts`)가 push 이벤트 수신·표시.

## 8. 구현 현황 (2026-07-28 기준)

**대부분 구현·라이브 반영 완료.** 아래는 완료된 굵직한 마일스톤과 남은 일.

완료:
- 스키마·데이터 레이어(004 box_activities/활동 트리거, getBoxStatus, 라벨, 이벤트 매트릭스) + "다정한 손그림 창고" 전 화면 리스킨(디자인 시스템 v1).
- 선택지: 사진 첨부(005), 본문 블록-라이트 모델(006 content jsonb), 정렬(최신/좋아요순)·무한스크롤, 링크 미리보기(OG 언퍼·SSRF 하드닝)·유튜브 인라인.
- 결정 모델 **v2**(007): 상태 2종(closed_at), 결정 방식(manual/auto_deadline), decided_at 중복 결정, 번복, 마감 투표 lazy commit.
- 협업 개방(008): 방장 특권 폐기 → 참여자 누구나 + 나가기 기반 라이프사이클. **방장 개념 완전 제거(011)**.
- 댓글 강화(010): 답글·좋아요·수정·`@`멘션·Realtime.
- 폴더(012, §3-7), 푸시 알림(§7-11), **초대 링크 읽기 전용 뷰어(014, §6-1)**.

Later(미완/차기):
- **그룹 기능 UI 확정** — 현재 숨김. 개념 정립 후 재노출.
- **다크모드** — 토큰화는 됨, `globals.css` 다크 값 대기.
- 창고 목록 **검색·친구/그룹 필터** 완성, 친구 자동 등록.
- **휴면 컬럼 정리**(`current_round`·`votes.round`·`dislike`·options 레거시 4컬럼) — 코드 의존 제거 후 드롭 검토.

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
