import { useRef, useState, type MutableRefObject } from "react";
import { Group, type Object3D } from "three";
import { GLBCharacter, type GLBActionMap } from "../GLBCharacter";
import { PLAYER_CHARACTER_ASSET } from "../characterAssetConfig";
import { LocomotionController } from "./LocomotionController";
import { PLAYER_MODEL_ROOT_Y, type PlayerMotionState } from "./playerConfig";

interface PlayerModelProps {
  motionRef: MutableRefObject<PlayerMotionState>;
}

export function PlayerModel({ motionRef }: PlayerModelProps) {
  const rootRef = useRef<Group>(null);
  const visualRef = useRef<Group>(null);
  const glbSceneRef = useRef<Object3D | null>(null);
  // GLB animation actions arrive asynchronously after the model finishes
  // loading; useState here re-renders so LocomotionController picks them up.
  const [actions, setActions] = useState<GLBActionMap>({});

  return (
    <group ref={rootRef} position={[0, PLAYER_MODEL_ROOT_Y, 0]}>
      <group ref={visualRef}>
        <GLBCharacter
          assetPath={PLAYER_CHARACTER_ASSET.assetPath}
          scale={PLAYER_CHARACTER_ASSET.scale}
          positionOffset={PLAYER_CHARACTER_ASSET.positionOffset}
          rotationOffset={PLAYER_CHARACTER_ASSET.rotationOffset}
          name={PLAYER_CHARACTER_ASSET.name}
          accentColor={PLAYER_CHARACTER_ASSET.accentColor}
          animationState={motionRef.current.animationState}
          fallbackType={PLAYER_CHARACTER_ASSET.fallbackType}
          fallbackLabel="Player Fallback"
          onSceneReady={(scene) => {
            glbSceneRef.current = scene;
          }}
          onAnimationsReady={(loadedActions) => {
            setActions(loadedActions);
          }}
        />
      </group>
      <LocomotionController motionRef={motionRef} actions={actions} />
    </group>
  );
}
