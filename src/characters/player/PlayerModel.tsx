import { useExpeditionStore } from "../../state/useExpeditionStore";
import { useCallback, useState, type MutableRefObject } from "react";
import type { Object3D } from "three";
import { GLBCharacter, type GLBActionMap } from "../GLBCharacter";
import { PLAYER_ASSET_VARIANTS, type PlayerAssetVariant } from "../characterAssetConfig";
import { LocomotionController } from "./LocomotionController";
import { usePlayerAsset } from "./playerAssetChoice";
import { PlayerRifle } from "./PlayerRifle";
import { PlayerBackpack } from "./PlayerBackpack";
import { RIFLE_POSE } from "../../combat/config";
import { PLAYER_COLLIDER_CENTER_Y, PLAYER_MODEL_ROOT_Y, type PlayerMotionState } from "./playerConfig";

const SEM_ACOES: GLBActionMap = {};

interface PlayerModelProps {
  motionRef: MutableRefObject<PlayerMotionState>;
  combat: boolean;
}

export function PlayerModel(props: PlayerModelProps) {
  const variant = usePlayerAsset(s => s.variant);
  // Trocar remonta só cena, rifle e animador; a cápsula e o controller continuam os mesmos.
  return <PlayerVariant key={variant} {...props} variant={variant} />;
}

function PlayerVariant({ motionRef, combat, variant }: PlayerModelProps & { variant: PlayerAssetVariant }) {
  const asset = PLAYER_ASSET_VARIANTS[variant];
  const color = useExpeditionStore(s=>s.profile?.color ?? asset.accentColor);
  const [scene, setScene] = useState<Object3D | null>(null);
  const [rifleAttached, setRifleAttached] = useState(false);
  const [actions, setActions] = useState<GLBActionMap>(SEM_ACOES);
  const onAnimationsReady = useCallback((loadedActions: GLBActionMap) => {
    setActions(loadedActions);
    usePlayerAsset.getState().setClips(Object.keys(loadedActions).filter(nome => loadedActions[nome]).sort());
    // Só em desenvolvimento: QA de locomoção no navegador (estado, ações e contato dos pés).
    if (import.meta.env.DEV) Object.assign(window, { __hordaPlayerActions: loadedActions, __hordaPlayerMotion: motionRef.current });
  }, [motionRef]);
  const onSceneReady = useCallback((scene: Object3D) => {
    setScene(scene);
    // Só em desenvolvimento: medição do contato dos pés no navegador (handoff da S2.12).
    if (import.meta.env.DEV) (window as unknown as { __hordaPlayerScene?: Object3D }).__hordaPlayerScene = scene;
  }, []);

  return (
    <>
      <group position={[0, PLAYER_MODEL_ROOT_Y, 0]}>
        <group>
          <GLBCharacter
            key={variant}
            animationPriority={-30}
            assetPath={asset.assetPath}
            scale={asset.scale}
            positionOffset={asset.positionOffset}
            rotationOffset={asset.rotationOffset}
            name={asset.name}
            accentColor={color}
            animationState={motionRef.current.animationState}
            fallbackType={asset.fallbackType}
            fallbackLabel="Player Fallback"
            materialProfile={asset.materialProfile}
            onSceneReady={onSceneReady}
            onAnimationsReady={onAnimationsReady}
          />
        </group>
        <LocomotionController motionRef={motionRef} actions={actions} asset={asset} combat={combat} />
        {variant === 'astronauta' && scene && <PlayerBackpack scene={scene} />}
        {variant === 'astronauta' && scene && <PlayerRifle combat={combat} scene={scene} motionRef={motionRef} onAttached={setRifleAttached} />}
      </group>
      {combat && !rifleAttached && <group name="PlayerRifle" position={[RIFLE_POSE.side, RIFLE_POSE.height - PLAYER_COLLIDER_CENTER_Y, RIFLE_POSE.gripForward]}>
        <mesh castShadow><boxGeometry args={[0.16, 0.18, 0.7]} /><meshStandardMaterial color="#243842" /></mesh>
        <mesh name="RifleBarrel" position={[0, 0, RIFLE_POSE.barrelForward]}><boxGeometry args={[0.08, 0.08, RIFLE_POSE.barrelLength]} /><meshStandardMaterial color="#78cddd" /></mesh>
      </group>}
    </>
  );
}
