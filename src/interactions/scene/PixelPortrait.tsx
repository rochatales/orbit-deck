import type { Texture } from "three";

interface PixelPortraitProps {
  position: [number, number, number];
  size: [number, number];
  texture: Texture;
}

export function PixelPortrait({ position, size, texture }: PixelPortraitProps) {
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
