import { Component, type ReactNode } from "react";

// 실기기 디버깅용 — 렌더 중 에러가 나면 크림 빈 화면 대신 메시지를 노출한다.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-cream px-6 text-center">
          <p className="text-sm font-bold text-tomato">화면 오류</p>
          <p className="break-all text-[12px] leading-relaxed text-ink-soft">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
