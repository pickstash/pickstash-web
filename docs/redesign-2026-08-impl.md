# 결정창고 개편 — 실행(구현) 계획

## Context
`docs/redesign-2026-08.md` 확정안을 구현한다. **출시는 소셜까지 한 번에**지만, 내부 빌드는 의존성 순서(프론트 정리 → 스키마/백엔드 → 소셜 프론트 → 통합)로 진행한다.
현 상태: 상자는 참여자 전용 RLS + invite-code definer RPC로만 접근 → **소셜(공개·팔로우·탐색·프로필)은 전부 greenfield**. 마이그레이션은 대시보드 수동·idempotent, 코드 push 전에 적용(CLAUDE.md).

---

## M0. 운영 안전 (단일 Supabase/Vercel — 무중단 전제) ★
구 앱(현재 라이브·심사 중)과 새 스키마가 **같은 DB를 공유**하므로, 전 과정을 하위호환으로.
- **확장-수축 원칙**: 이번 마이그레이션은 전부 **추가전용**(새 테이블 / 기본값 있는 nullable 컬럼 / RLS는 넓히기만). 컬럼 drop·rename·접근 축소 **금지**. → 구 앱은 새 스키마를 몰라도 그대로 동작(visibility 무시=현행). "수축"은 새 앱 100% 라이브 후.
- **토스 심사**: 새 `.ait`는 테스트앱(샌드박스) 스킴으로 먼저 검증 → 라이브는 구 .ait 유지(추가전용 DB라 안전) → 확신 후 제출.
- **Vercel**: 개편은 feature 브랜치 → main 자동배포 없음(웹 운영 그대로). 검증은 프리뷰/고정 별칭(pickstash-toss-dev), 토스 build env도 프리뷰 지정. 컷오버 때만 main 병합.
- **확정 수위**: 단일 운영 유지 + 추가전용(무중단). 별도 스테이징 없음. **Supabase 브랜치에서 마이그레이션 리허설** 후 운영(대시보드) 적용.


- **탭바 4개**: `toss/src/components/tab-bar.tsx` → 홈/돋보기/알림/프로필. `toss/src/App.tsx` 라우트 — 상자·서랍 탭 제거, `/explore`·`/profile` 자리 추가(내용은 M3), `/messy·/done·/favorites·/boxes·/folders`는 홈/해당 화면으로 정리(딥링크 호환 리다이렉트).
- **홈·대시** (`src/components/home-view.tsx`, `src/lib/api/home.ts`, `src/lib/domain/home.ts`):
  - 히어로 = **마감 임박(auto_deadline + deadline 근접)일 때만**. 없으면 미렌더. (`decision-hero.tsx` 조건화)
  - **서랍 = 그룹 카드**: `folder-chips.tsx` → 멤버·상자수 보이는 카드형.
  - **내 상자 스트림**: 진행/정리 통합 단일 목록, **최근 활동순**(box_activities 최신 시각 활용), 정리됨은 배지. 카드 mode-aware(체크형 진행률 N/M — 목업 `Card` 로직 이식).
  - 하단 **새 상자 FAB**.
- **상태 분리 제거**: `src/lib/api/box-list.ts` → 단일 스트림 로더(활동순). `recap-rail.tsx`/`home-empty.tsx` 정리.
- 검증: tsc(web+toss), 홈에서 결정형·체크형 섞여 정상 표시.

## M2. 소셜 스키마·백엔드 (마이그레이션 036+, idempotent, 대시보드 수동)
- **036_profile_handle**: `profiles.handle`(unique, citext/lower 인덱스) + 설정 RPC + 검색 인덱스. 닉네임(표시명) 유지.
- **037_box_visibility_tags**: `boxes.visibility`('private' 기본|'public'), `published_by`(공개 주체), `published_at`; 태그 `boxes.tags text[]`(또는 box_tags) + 인덱스.
- **038_follows**: `follows(follower_id, followee_id, created_at)` PK 2열 + RLS(본인 팔로우/언팔로우, 카운트 조회) + 카운트 함수.
- **039_bookmarks**: `bookmarks(user_id, box_id, created_at)` + RLS(본인만).
- **040_public_read**: security-definer 공개 조회 RPC 묶음 — `get_public_box_view`(**익명화**: 여럿 상자면 남 닉네임·아바타·댓글작성자 가림, "N명 참여"; 혼자 상자는 전체), `get_public_feed`(인기/최근), `get_profile_feed(handle)`, `search_public`(제목·태그·핸들·닉네임). 공개 상자 열람 경로(anon/authenticated) — 기존 `014 get_box_view_by_invite_code` 패턴 재사용.
- **041_join_requests**: `join_requests(box_id, user_id, status, created_at)` + RLS(외부인 pending insert, 참여자 승인 update) + 승인 시 `box_participants` insert 하는 definer RPC + 알림.
- **042_social_alerts**: box_activities/알림 타입에 follow·join_request·join_approved 추가 + prefs.
- 배포: 각 파일 재실행 안전, **대시보드 먼저 적용 → 코드 push**.

## M3. 소셜 프론트 (M2 의존)
- **@handle 설정**: 최초 1회(온보딩 또는 프로필 진입). `src/lib/api/profile*.ts` 확장.
- **공개 토글 + 태그**: `src/app/box/[id]/box-detail-client.tsx` — 공개/비공개 토글, 공개 시 태그 입력·published_by=me.
- **돋보기(탐색)** `/explore`: 검색(공개상자/사람) + 인기·최근 피드 + 태그 둘러보기. 신규 `src/lib/api/explore.ts` + 화면 + `toss/src/screens/explore-screen.tsx`.
- **프로필(인스타식)**: 현 `src/app/profile/profile-client.tsx`(설정)는 설정 서브로 이동, 프로필 = 헤더(핸들·소개·공개수/팔로워/팔로잉·팔로우 버튼) + **공개 상자 그리드** + **'저장함'(북마크) 탭**. 남의 프로필 `/u/[handle]`. 신규 `src/lib/api/profile-feed.ts`.
- **공개 상자 열람 + 참여 신청**: 기존 `BoxViewer`(`src/app/invite/[code]/box-viewer.tsx`) 재사용 + '참여 신청' 버튼(join_requests).
- **북마크 토글**, **팔로우 버튼**, **알림 확장**(`alerts-view.tsx`/`alerts.ts`에 follow/join 타입).
- 탭바 돋보기·프로필 활성화.

## M4. 통합·검증
- tsc(web+toss), `npm run build`, `.ait` 빌드.
- e2e(진단계정 test1/test2): 공개 토글 → 탐색 검색 → 남 프로필 팔로우 → 공개상자 열람(**익명화 확인**) → 참여 신청 → 승인 → 참여, 북마크 저장 → 저장함, @handle 설정.
- 마이그레이션 라이브 적용 순서·idempotent 재점검.

---

## 🔷 구현 중 확정할 세부
- 익명화 방식(남 댓글 숨김 vs 작성자만 가림).
- @handle 설정 시점(온보딩 강제 vs 프로필 최초 진입) + 중복·금칙어 규칙.
- 서랍(공유 그룹) vs 팔로우/공개 개념 중복 — 이번엔 병존, 후속 검토.
- 탐색 인기 랭킹 기준(좋아요·조회·최근).
- 공개 시 다른 참여자 고지 여부.

## 규모/리스크
- M1: 독립·중간 규모(홈/탭바 재작성). M2·M3: **큼**(신규 테이블 6~7, definer RPC 다수, 신규 화면 3+). 프라이버시(익명화·공개 RLS)가 가장 신중해야 할 부분.
- 실행 시 M2 마이그레이션은 순차, M3 화면은 영역별 병렬 가능(explore/profile/box-detail).

## 산출물 저장
- 승인 시 이 실행 계획을 `docs/redesign-2026-08-impl.md`로 저장하고 M1부터 착수.
