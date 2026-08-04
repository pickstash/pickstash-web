// next/image 대체 shim (토스=Vite라 next 없음). vite.config에서 'next/image' → 이 파일로 alias.
// 공유 뷰어(BoxViewer 등)가 최적화 없이 그냥 <img>로 뜨면 충분하다(웹은 진짜 next/image 사용).
import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> & {
  src: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  alt?: string;
};

export default function Image({ fill, priority: _priority, style, ...rest }: Props) {
  // fill: 부모를 채우는 next/image 모드 → absolute inset-0 + object-cover 흉내
  const fillStyle = fill ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const } : undefined;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img {...rest} style={{ ...fillStyle, ...style }} />;
}
