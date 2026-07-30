import { useEffect, useState } from "react";
import { Top } from "@toss/tds-mobile";
import { getAnonymousKey } from "@apps-in-toss/web-framework";
import { BOX_STATUS_LABEL, getBoxStatus } from "@/lib/domain/box-status";
import { supabase } from "./lib/supabase";
import "./App.css";

// 첫 세로 슬라이스 — 파이프라인 배선 확인용 화면.
// 1) 웹과 공유하는 코어(도메인 로직)를 그대로 import해서 쓰는지
// 2) Supabase(웹과 같은 프로젝트)에 연결되는지
// 3) 토스 SDK(getAnonymousKey)가 호출되는지  (실제 동작은 토스 앱 런타임에서만)
function App() {
  // (1) 공유 코어 재사용 증명: 순수 함수라 Vite에서 그대로 동작
  const sharedLabel = BOX_STATUS_LABEL[getBoxStatus({ closed_at: null })];

  const [supabaseStatus, setSupabaseStatus] = useState("확인 중…");
  const [tossKey, setTossKey] = useState("확인 중…");

  useEffect(() => {
    // (2) Supabase 연결 확인 — RLS로 결과는 비어도 요청이 통하면 연결 성공
    supabase
      .from("boxes")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        setSupabaseStatus(error ? `실패: ${error.message}` : "성공");
      });
  }, []);

  useEffect(() => {
    // (3) 토스 익명 키 — 토스 앱 밖(일반 브라우저/dev)에서는 미지원/오류가 정상
    getAnonymousKey()
      .then((res) => {
        if (!res) setTossKey("미지원 (토스 앱 밖이거나 낮은 버전)");
        else if (res === "ERROR") setTossKey("오류");
        else setTossKey(res.hash);
      })
      .catch(() => setTossKey("토스 앱 밖에서는 호출 불가"));
  }, []);

  return (
    <>
      <Top
        title={<Top.TitleParagraph size={22}>결정창고 · 토스 미니앱</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>배선 확인용 화면이에요.</Top.SubtitleParagraph>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
        <StatusRow label="공유 코어(도메인) import" value={`OK — 라벨 "${sharedLabel}"`} />
        <StatusRow label="Supabase 연결" value={supabaseStatus} />
        <StatusRow label="토스 익명 키(getAnonymousKey)" value={tossKey} />
      </div>
    </>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: "#8b8b88" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export default App;
