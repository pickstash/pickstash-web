# 홈 서랍 레일 드래그앤드롭 — 계획 (구현 대기)

> 2026-08-11 세션에서 plan mode로 확정. 다른 노트북/세션에서 그대로 구현 시작 가능하도록
> 저장소에 커밋해둔 계획 문서(`.claude/plans/`는 로컬 전용이라 git으로 안 옴).

## Context

홈 서랍 레일(`DrawerRail`)이 프로덕션에 반영된 뒤, 사용자가 두 가지를 드래그로 재정렬하고 싶어했다:
① "전체 상자" 선택 시 아래 나오는 상자 목록의 순서, ② 레일의 칩 순서(서랍들 + "전체 상자" 칩 자체 포함,
더 이상 "전체"가 항상 첫 자리에 고정되지 않고 자유롭게 옮길 수 있어야 함).

이 저장소엔 드래그앤드롭이 **한 번도 구현된 적이 없다**(라이브러리도 없음, 패턴도 없음). 조사 결과 서랍
*안* 상자 순서 저장(`box_folders.sort` + `reorderBoxFolders`)은 이미 있지만, 서랍들 *자체*의 순서를 저장하는
기능은 없다 — `folder_members.sort` 컬럼은 있고 읽기(`loadFolders`)는 이미 그 컬럼으로 정렬하지만, 쓰는
mutation이 아예 없다(죽은 컬럼). "전체 상자" 칩의 위치를 저장할 곳은 스키마에 전혀 없다(완전 신규).

## 확정된 스코프

- **상자 목록 드래그**: 서랍이 선택됐을 때만 지원(그 서랍의 상자 순서 저장, 기존 `box_folders.sort`/
  `reorderBoxFolders` 재사용 — 신규 백엔드 불필요). **"전체 상자" 선택 상태에서는 드래그 미지원** —
  "전체"는 활동순으로 계산되는 파생 목록(최대 5개 미리보기)이라 커스텀 순서를 저장할 대상이 없다.
- **레일 칩 드래그**: 서랍 칩들 + "전체 상자" 칩 전부 자유롭게 순서 이동 가능("전체"도 고정 해제).
  "+ 새 서랍" 칩은 액션 버튼이라 재정렬 대상에서 제외(항상 맨 끝 고정).
- **인터랙션**: 별도 "편집" 모드 토글 없이 **바로 드래그**(카드/칩을 길게 눌러 바로 집어서 이동). 탭(네비게이션)과
  드래그가 부딪히지 않게 드래그 라이브러리의 activation constraint(약간의 이동 거리·지연 임계값)로 구분한다.

## 1. 드래그 라이브러리 — `@dnd-kit`

`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. 이유: 터치 포인터 지원이 검증돼 있고(모바일
390px 우선 원칙과 맞음), 가로(레일 칩)·세로(상자 목록) 정렬 모두 `useSortable`로 동일 패턴 재사용,
activation constraint로 탭/드래그 구분 기본 지원. **웹(`package.json`)과 토스(`toss/package.json`) 둘 다에
설치 필요**(두 프로젝트가 각자 `node_modules` — 공유 컴포넌트라도 워크스페이스로 묶여있지 않음).

## 2. 신규 백엔드

### 2-1. 서랍(칩) 순서 — 기존 죽은 컬럼 되살리기, 신규 컬럼 없음

`folder_members.sort`(012/021 마이그레이션에서 이미 생성, 현재 아무도 안 씀)를 쓰는 mutation만 추가:

```ts
// src/lib/api/folders.ts — reorderBoxFolders와 완전히 동일한 upsert 패턴
export async function reorderFolders(orderedFolderIds: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || orderedFolderIds.length === 0) return
  const rows = orderedFolderIds.map((folderId, i) => ({ folder_id: folderId, user_id: user.id, sort: i }))
  const { error } = await supabase.from('folder_members').upsert(rows, { onConflict: 'folder_id,user_id' })
  if (error) throw error
}
```

`loadFolders`(`folders-list.ts`)는 이미 `folder_members.sort`로 정렬하므로(63행) **읽기 쪽은 무수정** —
이 mutation 하나만 추가하면 레일에 바로 반영된다. 마이그레이션 불필요(컬럼 이미 존재).

### 2-2. "전체 상자" 칩 위치 — 신규 컬럼 1개

```sql
-- supabase/migrations/0xx_home_all_chip_sort.sql (idempotent, 대시보드 수동 적용)
alter table profiles add column if not exists home_all_chip_sort int not null default -1;
```

기본값 `-1` = "정렬 안 정해짐 → 첫 자리"(지금 동작과 동일하게 시작). 드래그로 옮기면 그 인덱스로 갱신.
`src/lib/api/folders.ts`(또는 profiles API)에 `setHomeAllChipSort(index: number)` 추가 — 단순 update 1줄.

**렌더링 시 병합 로직**(`DrawerRail` 또는 그 데이터 훅): 실제 서랍들을 `folder_members.sort`로 정렬한 배열에
`home_all_chip_sort` 인덱스 위치로 "전체" 가상 아이템을 끼워 넣는다(범위 벗어나면 클램프). 드래그 종료 시
최종 배열에서 "전체"의 새 인덱스를 뽑아 `setHomeAllChipSort`로 저장하고, 나머지(실제 서랍)는 새 순서로
`reorderFolders`에 넘긴다 — 두 mutation을 한 번의 드롭에서 함께 호출.

## 3. 프론트엔드

### 3-1. `src/components/drawer-rail.tsx` — 칩 레일에 `DndContext`+`SortableContext`(horizontal) 적용

- 각 칩(전체 포함, "+새 서랍" 제외)을 `useSortable`로 감싼다. `PointerSensor`에 `activationConstraint:
  { distance: 8 }` 정도로 탭과 구분(짧은 탭=선택, 일정 거리 이상 이동=드래그 시작).
- `onDragEnd`에서 새 순서 배열 계산 → 위 2-2의 병합 로직으로 "전체"/실제 서랍 분리 → `reorderFolders` +
  (필요 시) `setHomeAllChipSort` 낙관적 업데이트 + 실제 mutation 호출.
- 쿼리 무효화: 기존 `invalidateFolderViews`(`use-folders.ts`)에 이미 `['folders-page']`가 포함돼 있어
  재사용 가능 — 새 mutation들의 `onSuccess`에서 그대로 호출.

### 3-2. 서랍 선택 시 상자 목록에도 동일 패턴 적용(수직 `SortableContext`)

- `!isAll`(서랍 선택 상태)일 때만 목록에 드래그 적용. `onDragEnd`에서 `useReorderFolderBoxes(folderId)`(이미
  있는 훅, `use-folders.ts`) 호출 — **신규 백엔드 불필요**, `/folder/[id]`가 이미 쓰는 것과 동일 mutation.
- "전체" 선택 상태에서는 카드에 드래그 핸들/센서를 아예 안 붙인다(스코프에서 제외 확정).

### 3-3. 참고할 기존 패턴

- `src/app/folder/[id]/folder-view.tsx`의 `move(i,dir)`/`finishEdit` — 로컬 state로 즉시 반영 후 드롭(또는
  "완료") 시점에 한 번에 서버 저장하는 낙관적 업데이트 흐름은 그대로 참고. 다만 이번엔 버튼이 아니라
  dnd-kit의 `onDragEnd`가 그 트리거를 대신한다.

## 4. 검증

- `npm run build`(웹), `cd toss && npm run build`(.ait) — 새 의존성이 두 빌드 다 정상 포함되는지.
- 웹은 광고/터치 드래그 자체는 데스크톱 마우스로 확인, **터치 동작의 실제 검증은 토스 앱에서** — 마우스
  드래그와 터치 드래그는 activation constraint 체감이 다를 수 있어 실기기 확인 필요.
- 레일 칩 드래그: "전체"를 중간으로 옮기고 새로고침 후에도 위치 유지되는지, 서랍들끼리 순서 바꾼 것도
  유지되는지, `/folders` 페이지(별도 화면)의 순서에도 영향 없는지(그 화면은 순서 개념이 아직 없으므로 무관해야 함).
- 서랍 선택 후 상자 드래그: 순서 바꾼 게 `/folder/[id]` 페이지에서도 동일하게 보이는지(같은 `box_folders.sort`
  데이터 공유 확인).
- "전체" 선택 상태에서 카드에 드래그가 전혀 안 걸리는지(의도된 제한) 확인.

### 구현 대상 핵심 파일
- `package.json`, `toss/package.json` — `@dnd-kit/*` 추가
- `src/lib/api/folders.ts` — `reorderFolders` 신규
- `src/lib/api/folders.ts` 또는 `profiles.ts` — `setHomeAllChipSort` 신규
- `src/hooks/use-folders.ts` — `useReorderFolders`, `useSetHomeAllChipSort` 신규 훅
- `src/components/drawer-rail.tsx` — DndContext 적용(칩 + 조건부 상자 목록)
- 신규 마이그레이션 1개(`profiles.home_all_chip_sort`)
