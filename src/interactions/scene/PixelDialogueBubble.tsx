import { useMemo } from "react";
import { createSpeechBubbleTexture, type PixelBubbleTail } from "./pixelSceneTextures";
import { usePixelFontReady } from "./usePixelFontReady";

interface PixelDialogueBubbleProps {
  lines: string[];
  position: [number, number, number];
  /** Plane size in world units. Default matches the Phase B 2x upscale. */
  size?: [number, number];
  speaker: string;
  /** Side the tail drops out of, pointing at the active speaker. */
  tail?: PixelBubbleTail;
  /** Hex color for the speaker label. Defaults to ice cyan. */
  accentColor?: string;
}

export function PixelDialogueBubble({
  lines,
  position,
  size = [480, 128],
  speaker,
  tail = "none",
  accentColor
}: PixelDialogueBubbleProps) {
  // Stable key so the texture memo doesn't re-render on every parent
  // render — getDialogueLines returns a fresh array each time.
  const linesKey = lines.join("\n");
  // Re-create the texture once the Press Start 2P font is loaded, so the
  // first paint with the monospace fallback gets replaced by the real
  // pixel glyphs.
  const fontReady = usePixelFontReady();
  const texture = useMemo(
    () => createSpeechBubbleTexture({ speaker, lines, tail, accentColor }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speaker, linesKey, tail, accentColor, fontReady]
  );

  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
