// 서랍 상세 '상자 추가하기' → 상자 만들기 폼으로 넘어갈 때, 만들 상자를 담을 서랍을 잠깐 전달하는 채널.
// 웹(Next)·토스(MemoryRouter) 라우터가 달라 쿼리스트링을 공유 폼에서 안정적으로 못 읽는다(토스는 window.location이 안 바뀜).
// 둘 다 SPA(내비 시 리로드 없음)라 모듈 변수로 넘긴 뒤 폼에서 한 번 소비하고 비운다.
export type PendingFolder = { id: string; name: string }

let pending: PendingFolder | null = null

export function setPendingBoxFolder(folder: PendingFolder | null): void {
  pending = folder
}

/** 값을 읽고 즉시 비운다(1회성). 폼 마운트 시 한 번만 소비. */
export function takePendingBoxFolder(): PendingFolder | null {
  const v = pending
  pending = null
  return v
}
