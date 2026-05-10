import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { OfficeScene } from "../scene/OfficeScene";
import { KEYBOARD_CONTROLS_MAP } from "../controls/keyboardControls";

export function GameCanvas() {
  return (
    <KeyboardControls map={KEYBOARD_CONTROLS_MAP}>
      <Canvas className="game-canvas" shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <OfficeScene />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}
