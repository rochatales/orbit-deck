import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";
import { DevPixelGrid, isPixelGridEnabled } from "./DevPixelGrid";

export const PIXEL_STAGE_WIDTH = 960;
export const PIXEL_STAGE_HEIGHT = 540;

interface InteractionPixelStageProps {
  ariaLabel: string;
  children: ReactNode;
  hud?: ReactNode;
}

function configurePixelCamera(camera: ThreeOrthographicCamera) {
  camera.left = -PIXEL_STAGE_WIDTH / 2;
  camera.right = PIXEL_STAGE_WIDTH / 2;
  camera.top = PIXEL_STAGE_HEIGHT / 2;
  camera.bottom = -PIXEL_STAGE_HEIGHT / 2;
  camera.near = 0.1;
  camera.far = 100;
  camera.zoom = 1;
  camera.position.set(0, 0, 10);
  camera.updateProjectionMatrix();
}

export function InteractionPixelStage({
  ariaLabel,
  children,
  hud
}: InteractionPixelStageProps) {
  return (
    <div
      className="interaction-scene-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className="interaction-scene-stage"
        style={{
          width: `${PIXEL_STAGE_WIDTH}px`,
          height: `${PIXEL_STAGE_HEIGHT}px`
        }}
      >
        <Canvas
          orthographic
          dpr={1}
          flat
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          camera={{
            left: -PIXEL_STAGE_WIDTH / 2,
            right: PIXEL_STAGE_WIDTH / 2,
            top: PIXEL_STAGE_HEIGHT / 2,
            bottom: -PIXEL_STAGE_HEIGHT / 2,
            near: 0.1,
            far: 100,
            zoom: 1,
            position: [0, 0, 10]
          }}
          onCreated={({ camera }) => {
            configurePixelCamera(camera as ThreeOrthographicCamera);
          }}
          className="interaction-scene-canvas"
        >
          {children}
          {isPixelGridEnabled() ? <DevPixelGrid /> : null}
        </Canvas>
        {hud ? <div className="interaction-scene-hud">{hud}</div> : null}
      </div>
    </div>
  );
}
