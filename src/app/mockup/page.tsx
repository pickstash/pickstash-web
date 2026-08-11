'use client'

// TEMP 리디자인 목업 — '다정한 손그림 창고' 컨셉으로 서랍(주인공)·상자 리디자인 + 서랍 스케일.
// 결정 후 삭제: src/app/mockup, proxy '/mockup', toss App /boxes 스왑 원복.
import { useState } from 'react'
import { Icon } from '@/components/icon'

// ── 더미 데이터 (서랍 많은 헤비유저 시나리오)
type Box = { id: string; title: string; mode: 'decide' | 'checklist'; done?: boolean; winner?: string; leader?: string; likes?: number; comments?: number; checked?: number; total?: number; deadline?: string; fav?: boolean }
type Folder = { id: string; name: string; members: number; boxes: Box[] }

const FOLDERS: Folder[] = [
  { id: 'f1', name: '나고야 여행', members: 3, boxes: [
    { id: 'b1', title: '숙소 어디로', mode: 'decide', leader: '료칸', likes: 5, comments: 3, deadline: 'D-2' },
    { id: 'b2', title: '먹킷리스트', mode: 'checklist', checked: 4, total: 9 },
    { id: 'b3', title: '2일차 코스', mode: 'decide', leader: '오사카성', likes: 2 },
    { id: 'b4', title: '준비물', mode: 'checklist', checked: 7, total: 7, done: true },
    { id: 'b5', title: '기념품', mode: 'decide', done: true, winner: '킷캣 말차' },
  ] },
  { id: 'f2', name: '가족', members: 4, boxes: [
    { id: 'b6', title: '주말 외식', mode: 'decide', leader: '고깃집', likes: 3 },
    { id: 'b7', title: '엄마 생신 선물', mode: 'decide', done: true, winner: '스카프' },
  ] },
  { id: 'f3', name: '회사 점심', members: 6, boxes: [
    { id: 'b8', title: '오늘 뭐 먹지', mode: 'decide', leader: '국밥', likes: 8, comments: 5 },
  ] },
  { id: 'f4', name: '집꾸미기', members: 1, boxes: [
    { id: 'b9', title: '소파 살까', mode: 'decide', likes: 1 },
    { id: 'b10', title: '이사 체크', mode: 'checklist', checked: 2, total: 12 },
  ] },
  { id: 'f5', name: '독서모임', members: 5, boxes: [
    { id: 'b11', title: '다음 책', mode: 'decide', leader: '데미안', likes: 4 },
  ] },
]

const LOOSE: Box[] = [
  { id: 'l1', title: '주말 볼 영화', mode: 'decide', leader: '듄2', likes: 3, comments: 2, fav: true },
  { id: 'l2', title: '장보기', mode: 'checklist', checked: 3, total: 5 },
  { id: 'l3', title: '노트북 살까 말까', mode: 'decide', done: true, winner: '질렀다' },
]

// ── 상자 카드 v2 (종류별 리치 — 좌측 색 스트립 + 모티프)
function BoxCardV2({ box }: { box: Box }) {
  const isCheck = box.mode === 'checklist'
  const pct = box.total ? Math.round(((box.checked ?? 0) / box.total) * 100) : 0
  return (
    <div className="flex overflow-hidden rounded-card border border-[#ECEADC] bg-paper shadow-[0_2px_10px_rgba(42,42,39,0.05)]">
      {/* 좌측 종류 스트립 */}
      <div className={`w-1.5 shrink-0 ${isCheck ? 'bg-leaf' : 'bg-butter'}`} />
      <div className="min-w-0 flex-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md ${isCheck ? 'bg-leaf-tint text-leaf' : 'bg-butter-tint text-ink'}`}>
              <Icon name={isCheck ? 'check' : 'box'} size={11} strokeWidth={2.5} />
            </span>
            <h3 className="truncate text-[15px] font-extrabold text-ink">{box.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {box.fav && <Icon name="star" size={14} style={{ fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' }} />}
            {box.done && <span className="rounded-full bg-leaf-tint px-2 py-0.5 text-[10.5px] font-bold text-leaf">정리됨</span>}
            {box.deadline && <span className="rounded-full bg-tomato-tint px-2 py-0.5 text-[10.5px] font-extrabold text-tomato">{box.deadline}</span>}
          </div>
        </div>

        {isCheck ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11.5px] font-bold text-ink-soft">
              <span>{box.checked}/{box.total} 체크</span><span className="text-ink-faint">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></div>
          </div>
        ) : box.done ? (
          <p className="mt-1.5 text-[13px] font-extrabold text-ink"><span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{box.winner}</span>(으)로 결정!</p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2.5 text-[12px] font-bold text-ink-soft">
            {box.leader && <span className="text-ink"><span className="rounded-full bg-butter px-1.5 py-0.5 text-[10px]">인기</span> {box.leader}</span>}
            {!!box.likes && <span className="flex items-center gap-0.5"><Icon name="heart" size={12} />{box.likes}</span>}
            {!!box.comments && <span className="flex items-center gap-0.5"><Icon name="comment" size={12} />{box.comments}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// 상자(1급) — 서랍은 '묶고 싶을 때만' 쓰는 선택지라, 서랍 밖 상자도 정상. 정리 대기·필링 압박 없음.
function LooseShelf({ boxes }: { boxes: Box[] }) {
  return (
    <section className="mt-7 px-5">
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[14px] font-extrabold text-ink">
        <Icon name="box" size={14} className="text-ink-soft" />상자
      </h2>
      <div className="space-y-2.5">
        {boxes.map(b => <BoxCardV2 key={b.id} box={b} />)}
      </div>
    </section>
  )
}

// ── A. 스택(카드지갑식) — 서랍들이 겹쳐 쌓이고, 열면 그 서랍의 상자
function DrawerStack({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  return (
    <div className="relative">
      {FOLDERS.map((f, i) => {
        const open = openId === f.id
        const shared = f.members > 1
        return (
          <div key={f.id} className={i > 0 ? '-mt-3' : ''} style={{ zIndex: FOLDERS.length - i }}>
            <button
              onClick={() => setOpenId(open ? null : f.id)}
              className={`relative block w-full border-[1.5px] border-butter-deep bg-butter-tint px-4 py-3.5 text-left shadow-[0_-3px_10px_rgba(42,42,39,0.07)] active:brightness-95 ${open ? 'rounded-t-[18px]' : 'rounded-[18px]'}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[14.5px] font-extrabold text-ink"><Icon name="folder" size={15} />{f.name}</span>
                <span className="flex items-center gap-2 text-[11.5px] font-bold text-ink-soft">
                  상자 {f.boxes.length}{shared && ` · ${f.members}명`}
                  <span className={`transition-transform ${open ? 'rotate-90' : ''}`}><Icon name="chevronRight" size={15} /></span>
                </span>
              </div>
            </button>
            {open && (
              <div className="space-y-2 rounded-b-[18px] border-x-[1.5px] border-b-[1.5px] border-butter-deep bg-cream px-3 pb-3 pt-2.5">
                {f.boxes.map(b => <BoxCardV2 key={b.id} box={b} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── B. 스와이프 캐러셀 — 서랍을 가로로 넘기고, 고른 서랍의 상자가 아래
function DrawerSwipe({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string) => void }) {
  const sel = FOLDERS.find(f => f.id === openId) ?? FOLDERS[0]
  return (
    <div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FOLDERS.map(f => {
          const active = f.id === sel.id
          return (
            <button
              key={f.id}
              onClick={() => setOpenId(f.id)}
              className={`flex h-[124px] w-[78%] shrink-0 snap-center flex-col justify-between rounded-[20px] border-[1.5px] p-4 text-left ${active ? 'border-butter-deep bg-butter-tint shadow-[0_4px_14px_-4px_rgba(227,185,58,0.5)]' : 'border-line bg-paper/70'}`}
            >
              <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-ink"><Icon name="folder" size={16} />{f.name}</span>
              <div className="flex flex-wrap gap-1">
                {f.boxes.slice(0, 3).map(b => (
                  <span key={b.id} className="max-w-[46%] truncate rounded-lg border border-line bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink">{b.title}</span>
                ))}
                {f.boxes.length > 3 && <span className="px-1 text-[10.5px] font-bold text-ink-faint">+{f.boxes.length - 3}</span>}
              </div>
              <span className="text-[11.5px] font-bold text-ink-soft">상자 {f.boxes.length}{f.members > 1 ? ` · ${f.members}명` : ''}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-4 space-y-2.5">
        <p className="text-[12px] font-bold text-ink-soft"># {sel.name} · 상자 {sel.boxes.length}</p>
        {sel.boxes.map(b => <BoxCardV2 key={b.id} box={b} />)}
      </div>
    </div>
  )
}

export default function MockupPage() {
  const [openId, setOpenId] = useState<string | null>('f1')
  const [hasFolders, setHasFolders] = useState(true)
  const [drawerMode, setDrawerMode] = useState<'stack' | 'swipe'>('stack')
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-cream pb-28">
      {/* (미리보기 전용) 서랍 유무 토글 */}
      <div className="flex justify-end px-5 pt-3">
        <label className="flex items-center gap-2 text-[11px] font-bold text-ink-faint">서랍 있는 유저
          <input type="checkbox" checked={hasFolders} onChange={e => setHasFolders(e.target.checked)} />
        </label>
      </div>

      <header className="px-5 pt-2 pb-1">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">구찌님의 결정창고 <span className="text-[11px] font-bold text-tomato">(리디자인)</span></h1>
      </header>

      {/* 마감 임박 히어로 */}
      <div className="mx-5 mt-3 rounded-[24px] border border-butter-deep bg-butter-tint px-[18px] py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[19px] font-extrabold tracking-tight text-ink">{hasFolders ? '숙소 어디로' : '주말 볼 영화'}</h3>
          <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-extrabold text-tomato">마감 {hasFolders ? 'D-2' : 'D-1'}</span>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-soft">{hasFolders ? '# 나고야 여행 · 3명 · 마감이 곧이에요' : '마감이 곧이에요'}</p>
      </div>

      {hasFolders ? (
        <>
          {/* 서랍 = 주인공. 스택(겹쳐 쌓임) / 스와이프(가로 넘김) 방식 토글 */}
          <section className="mt-6 px-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-ink"><Icon name="folder" size={15} />서랍</h2>
              <div className="flex items-center gap-1 rounded-full bg-[#EDEBDD] p-0.5">
                {(['stack', 'swipe'] as const).map(m => (
                  <button key={m} onClick={() => setDrawerMode(m)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${drawerMode === m ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'}`}>
                    {m === 'stack' ? '스택' : '스와이프'}
                  </button>
                ))}
              </div>
            </div>
            {drawerMode === 'stack' ? (
              <DrawerStack openId={openId} setOpenId={setOpenId} />
            ) : (
              <DrawerSwipe openId={openId} setOpenId={setOpenId} />
            )}
          </section>
          <LooseShelf boxes={LOOSE} />
        </>
      ) : (
        <>
          {/* 서랍 없는 유저 — 상자 선반이 본문 + 첫 서랍 만들기 초대 */}
          <LooseShelf boxes={[...LOOSE, { id: 'x1', title: '점심 뭐 먹지', mode: 'decide', leader: '국밥', likes: 4 }, { id: 'x2', title: '이사 체크', mode: 'checklist', checked: 1, total: 8 }]} />
          {/* 서랍은 선택 — 상자가 많아 묶고 싶을 때만. 가볍게 안내(압박 X). */}
          <section className="mt-5 px-5">
            <div className="flex items-center gap-2 rounded-field border border-dashed border-[#D9D6C2] bg-paper/50 px-3.5 py-2.5">
              <Icon name="folder" size={15} className="text-ink-faint" />
              <p className="min-w-0 flex-1 text-[11.5px] text-ink-soft">상자가 많아지면 <b className="font-bold text-ink">서랍</b>으로 주제별로 묶을 수 있어요.</p>
              <span className="shrink-0 text-[12px] font-bold text-ink-soft">＋ 서랍</span>
            </div>
          </section>
        </>
      )}

      <button className="fixed bottom-24 right-5 z-30 flex items-center gap-1.5 rounded-full bg-ink px-4 py-3 text-[13px] font-extrabold text-cream shadow-[0_6px_18px_-4px_rgba(42,42,39,0.4)]">
        <Icon name="plus" size={16} strokeWidth={2.5} />새 상자
      </button>
    </div>
  )
}
