import { useMemo } from "react";
import { useParams } from "react-router-dom";
import BoxLinksPage from "@/app/box/[id]/links/page";
import NewOptionPage from "@/app/box/[id]/option/new/page";
import EditOptionPage from "@/app/box/[id]/option/[optionId]/edit/page";

// 이 웹 페이지들은 이미 'use client' + 훅으로 CSR fetch를 하고, params만 Promise로 받는다(Next 규약).
// 토스(react-router)는 params를 평범한 객체로 주므로, 안정적인(useMemo) resolved Promise로 감싸 그대로 재사용한다.
// → 화면 코드를 한 벌도 다시 안 짜고 웹 페이지를 100% 재사용.

export function BoxLinksScreen() {
  const { id } = useParams<{ id: string }>();
  const params = useMemo(() => Promise.resolve({ id: id! }), [id]);
  return <BoxLinksPage params={params} />;
}

export function OptionNewScreen() {
  const { id } = useParams<{ id: string }>();
  const params = useMemo(() => Promise.resolve({ id: id! }), [id]);
  return <NewOptionPage params={params} />;
}

export function OptionEditScreen() {
  const { id, optionId } = useParams<{ id: string; optionId: string }>();
  const params = useMemo(() => Promise.resolve({ id: id!, optionId: optionId! }), [id, optionId]);
  return <EditOptionPage params={params} />;
}
