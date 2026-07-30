import { useEffect, useMemo, useState } from "react";
import { Color } from "three";
import { SceneErrorBoundary } from "../scene/SceneErrorBoundary";
import { TextureLoadBanner } from "../scene/TextureLoadBanner";
import { usePixelTexture, type PixelTextureState } from "../scene/usePixelTexture";
import { BrandBrainRegistrationPanel } from "./BrandBrainRegistrationPanel";
import {
  BRAND_BRAIN_REGISTRATION_STEPS,
  EMPTY_BRAND_BRAIN_REGISTRATION_DRAFT,
  getDialogueLines,
  type BrandBrainRegistrationDraft,
  type BrandBrainRegistrationStep
} from "./brandBrainRegistrationFlow";
import {
  PIXEL_STAGE_HEIGHT,
  PIXEL_STAGE_WIDTH
} from "../scene/InteractionPixelStage";
import { InteractionSceneShell } from "../scene/InteractionSceneShell";
import { PixelDialogueBubble } from "../scene/PixelDialogueBubble";
import { PixelPortrait } from "../scene/PixelPortrait";
import {
  createBadgeTexture,
  createGlowTexture
} from "../scene/pixelSceneTextures";
import { usePixelTalkCycle } from "../scene/usePixelTalkCycle";
import { useDialogueStore } from "../../state/useDialogueStore";

// Real pixel-art assets for the EDEN interaction screen.
// Source dimensions (trimmed alpha bounds, used to keep aspect ratios true):
//   eden.png    1024x1024  bbox 602x937  aspect 0.642
//   player.png  1024x1024  bbox 444x816  aspect 0.544
//   background.png 1920x1080  aspect 1.778 (matches the 16:9 stage exactly)
const EDEN_TEXTURE_URL = "/art/interaction/eden/eden.png";
const PLAYER_TEXTURE_URL = "/art/interaction/eden/player.png";
const BACKGROUND_TEXTURE_URL = "/art/interaction/eden/background.png";

interface BrandBrainSceneProps {
  step: BrandBrainRegistrationStep;
  eden: PixelTextureState;
  player: PixelTextureState;
  background: PixelTextureState;
}

// Plane sizes derived from the trimmed alpha aspect ratios of the source
// PNGs, then snapped to the PX=4 grid. The transparent padding around the
// character pixels means the plane is slightly larger than the visible
// sprite; that's fine and keeps the canvas square for the loader.
//
// Floor line is y = -240 (snap aligned). Both characters' plane bottoms sit
// on that line so they share the same floor regardless of their height,
// matching the reference frame.
//
//   EDEN plane:    488 x 488 (square source 1024x1024)
//                  feet at y=-240 -> center_y = -240 + 488/2 = +4 (snapped)
//   Player plane:  384 x 384 (square source 1024x1024)
//                  feet at y=-240 -> center_y = -240 + 384/2 = -48
const EDEN_PLANE_SIZE: [number, number] = [488, 488];
const PLAYER_PLANE_SIZE: [number, number] = [384, 384];
const EDEN_POSITION: [number, number, number] = [-220, 4, 4];
const PLAYER_POSITION: [number, number, number] = [220, -48, 5];

function BrandBrainScene({ step, eden, player, background }: BrandBrainSceneProps) {
  const isEdenSpeaking = step.speaker === "EDEN";
  const edenTalking = usePixelTalkCycle(isEdenSpeaking);
  const playerTalking = usePixelTalkCycle(!isEdenSpeaking);

  // Talk cycle is rendered as a subtle Y bob until Phase C lands real
  // mouth-frame variants. A 4 wu (1 art pixel) bob reads as "speaking" at
  // the 320 ms cadence from usePixelTalkCycle without breaking the floor
  // line. Idle = no bob.
  const edenBobY = edenTalking ? 4 : 0;
  const playerBobY = playerTalking ? 4 : 0;

  const escTexture = useMemo(() => createBadgeTexture("ESC"), []);
  const vignetteTexture = useMemo(
    () => createGlowTexture("rgba(0, 0, 0, 0)", "rgba(5, 8, 18, 0.92)"),
    []
  );
  const edenGlowTexture = useMemo(
    () => createGlowTexture("rgba(102, 238, 255, 0.52)", "rgba(38, 98, 174, 0.1)"),
    []
  );
  const playerGlowTexture = useMemo(
    () => createGlowTexture("rgba(255, 115, 214, 0.38)", "rgba(116, 62, 180, 0.08)"),
    []
  );

  return (
    <>
      <color attach="background" args={["#070b16"]} />

      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[PIXEL_STAGE_WIDTH, PIXEL_STAGE_HEIGHT]} />
        <meshBasicMaterial color={new Color("#08111f")} toneMapped={false} />
      </mesh>

      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[PIXEL_STAGE_WIDTH, PIXEL_STAGE_HEIGHT]} />
        {background.texture ? (
          <meshBasicMaterial map={background.texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color={new Color("#0a1426")} toneMapped={false} />
        )}
      </mesh>

      <mesh position={[-220, -80, 0]}>
        <planeGeometry args={[360, 360]} />
        <meshBasicMaterial map={edenGlowTexture} transparent opacity={0.65} toneMapped={false} />
      </mesh>

      <mesh position={[220, -120, 0]}>
        <planeGeometry args={[280, 280]} />
        <meshBasicMaterial map={playerGlowTexture} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {eden.texture ? (
        <PixelPortrait
          position={[EDEN_POSITION[0], EDEN_POSITION[1] + edenBobY, EDEN_POSITION[2]]}
          size={EDEN_PLANE_SIZE}
          texture={eden.texture}
        />
      ) : null}

      {player.texture ? (
        <PixelPortrait
          position={[PLAYER_POSITION[0], PLAYER_POSITION[1] + playerBobY, PLAYER_POSITION[2]]}
          size={PLAYER_PLANE_SIZE}
          texture={player.texture}
        />
      ) : null}

      {/*
        Phase B bubble: 480x144 plane (2x upscale of the 240x72 pixel-art
        canvas), tail points at whoever is talking. EDEN sits on the left
        of the stage so EDEN-as-speaker => tail on the left; player on
        the right => tail on the right.

        Bubble lives at the TOP of the stage (y=+170), above the
        characters, so it doesn't collide with the HTML registration
        panel (`brand-brain-pixel-ui`) anchored bottom-right. Tail still
        drops downward, pointing toward the speaker below.
      */}
      <PixelDialogueBubble
        position={[0, 178, 8]}
        size={[480, 144]}
        speaker={step.speaker}
        lines={getDialogueLines(step.prompt)}
        tail={isEdenSpeaking ? "left" : "right"}
      />

      <mesh position={[360, 224, 10]}>
        <planeGeometry args={[112, 36]} />
        <meshBasicMaterial map={escTexture} transparent toneMapped={false} />
      </mesh>

      <mesh position={[0, 0, 12]}>
        <planeGeometry args={[PIXEL_STAGE_WIDTH, PIXEL_STAGE_HEIGHT]} />
        <meshBasicMaterial map={vignetteTexture} transparent opacity={0.78} toneMapped={false} />
      </mesh>
    </>
  );
}

export function BrandBrainInteractionScene() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<BrandBrainRegistrationDraft>(
    EMPTY_BRAND_BRAIN_REGISTRATION_DRAFT
  );
  const isOpen = useDialogueStore(
    (state) =>
      state.isOpen &&
      state.mode === "interaction-screen" &&
      state.activeNpcId === "brand-brain" &&
      state.activeScreenId === "brand-brain"
  );
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const step = BRAND_BRAIN_REGISTRATION_STEPS[stepIndex];
  const totalSteps = BRAND_BRAIN_REGISTRATION_STEPS.length - 1;

  // Texture loaders live here (parent) so both the in-canvas scene and
  // the out-of-canvas HUD banner can read their status. usePixelTexture
  // is crash-safe; a 404 lights up the banner instead of unmounting.
  const eden = usePixelTexture(EDEN_TEXTURE_URL);
  const player = usePixelTexture(PLAYER_TEXTURE_URL);
  const background = usePixelTexture(BACKGROUND_TEXTURE_URL);

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setDraft(EMPTY_BRAND_BRAIN_REGISTRATION_DRAFT);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, isOpen]);

  if (!isOpen) return null;

  return (
    // ErrorBoundary lives OUTSIDE the Canvas so its HTML fallback can
    // render. R3F errors thrown by Canvas children still bubble up
    // through the React tree to this boundary.
    <SceneErrorBoundary>
      <InteractionSceneShell
        ariaLabel="EDEN Brand Brain registration scene"
        hud={
          <>
            <TextureLoadBanner
              textures={{
                "eden.png": eden,
                "player.png": player,
                "background.png": background
              }}
            />
            <BrandBrainRegistrationPanel
              draft={draft}
              onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
              onClose={closeDialog}
              onDraftChange={setDraft}
              onNext={() =>
                setStepIndex((current) =>
                  Math.min(BRAND_BRAIN_REGISTRATION_STEPS.length - 2, current + 1)
                )
              }
              onSuccess={() => setStepIndex(BRAND_BRAIN_REGISTRATION_STEPS.length - 1)}
              step={step}
              stepIndex={stepIndex}
              totalSteps={totalSteps}
            />
          </>
        }
      >
        <BrandBrainScene
          step={step}
          eden={eden}
          player={player}
          background={background}
        />
      </InteractionSceneShell>
    </SceneErrorBoundary>
  );
}
