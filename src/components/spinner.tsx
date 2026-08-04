// 로딩 스피너 — loading.gif(public/loading.gif). 웹·토스 공유. next/image 대신 <img>로 프레임워크 비의존.
// 딤 없이 인라인으로만 쓴다(화면 진입·탭 이동·리스트 로딩 모두 동일 디자인). 전체화면 로딩은 size를 키워서 쓴다.

/** 인라인 로딩. size로 크기 조절(전체화면은 96 등 크게, 리스트 안은 기본 60). */
export function Spinner({ size = 60, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/loading.gif" alt="" width={size} height={size} style={{ width: size, height: size }} />
    </div>
  )
}
