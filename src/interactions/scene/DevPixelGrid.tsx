import { useMemo } from "react";
import { BufferAttribute, BufferGeometry } from "three";
import { PX, STAGE_PX } from "./pixelSceneTextures";
import { PIXEL_STAGE_HEIGHT, PIXEL_STAGE_WIDTH } from "./InteractionPixelStage";

/**
 * Dev-only overlay that draws thin lines every `PX` world units across the
 * stage so we can eyeball whether sprites and bubbles land on the grid.
 *
 * Mounted by `InteractionPixelStage` when the URL has `?grid=1`. Never ships
 * to a normal player run.
 *
 * Color rules:
 *  - Faint cyan grid every PX (4 wu) world units.
 *  - Bright magenta lines on the 4×PX (16 wu) coarser cadence, so the eye can
 *    tell "small grid" from "big block" at a glance.
 *  - Yellow center cross at (0, 0).
 */
export function DevPixelGrid({
  z = 100,
  fineColor = "#36e3ff",
  coarseColor = "#ff5cff",
  axisColor = "#ffe85c"
}: {
  z?: number;
  fineColor?: string;
  coarseColor?: string;
  axisColor?: string;
} = {}) {
  const halfWidth = PIXEL_STAGE_WIDTH / 2;
  const halfHeight = PIXEL_STAGE_HEIGHT / 2;
  const coarseEvery = 4; // every 4 fine cells = 16 wu cadence

  const { fineGeom, coarseGeom, axisGeom } = useMemo(() => {
    const fine: number[] = [];
    const coarse: number[] = [];
    const axis: number[] = [];

    for (let i = -STAGE_PX.width / 2; i <= STAGE_PX.width / 2; i += 1) {
      const x = i * PX;
      const target = i === 0 ? axis : i % coarseEvery === 0 ? coarse : fine;
      target.push(x, -halfHeight, z, x, halfHeight, z);
    }
    for (let j = -STAGE_PX.height / 2; j <= STAGE_PX.height / 2; j += 1) {
      const y = j * PX;
      const target = j === 0 ? axis : j % coarseEvery === 0 ? coarse : fine;
      target.push(-halfWidth, y, z, halfWidth, y, z);
    }

    const make = (verts: number[]) => {
      const geom = new BufferGeometry();
      geom.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
      return geom;
    };

    return {
      fineGeom: make(fine),
      coarseGeom: make(coarse),
      axisGeom: make(axis)
    };
  }, [halfHeight, halfWidth, z]);

  return (
    <group>
      <lineSegments geometry={fineGeom}>
        <lineBasicMaterial color={fineColor} transparent opacity={0.18} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={coarseGeom}>
        <lineBasicMaterial color={coarseColor} transparent opacity={0.42} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={axisGeom}>
        <lineBasicMaterial color={axisColor} transparent opacity={0.85} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

/**
 * URL-gated flag so we don't have to thread a prop through. Reads
 * `?grid=1`. Returns false in non-browser environments (SSR/tests).
 */
export function isPixelGridEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("grid") === "1";
  } catch {
    return false;
  }
}
