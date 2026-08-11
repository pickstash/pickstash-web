import { useParams } from "react-router-dom";
import { PublicBoxView } from "@/components/public-box-view";

// 공개 상자 읽기 전용 뷰어 (/p/:id) — 탐색·프로필에서 진입.
export function PublicBoxScreen() {
  const { id } = useParams<{ id: string }>();
  return <PublicBoxView boxId={id!} />;
}
