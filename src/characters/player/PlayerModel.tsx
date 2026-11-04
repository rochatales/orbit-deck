import { weaponCarryMode } from './weaponCarry';
import { useWeaponStore } from '../../state/useWeaponStore';
import { PlayerMachete, PlayerMacheteClips } from './PlayerMachete';
import { createSwordLight } from './swordNeon';
import { playerStepDust } from './stepDust';
import { useExpeditionStore } from "../../state/useExpeditionStore";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Object3D } from "three";
import { useCombatStore } from "../../state/useCombatStore";
import { GLBCharacter, type GLBActionMap } from "../GLBCharacter";
import { PLAYER_ASSET_VARIANTS, type PlayerAssetVariant } from "../characterAssetConfig";
import { LocomotionController } from "./LocomotionController";
import { usePlayerAsset } from "./playerAssetChoice";
import { PlayerRifle } from "./PlayerRifle";
import { ColonyPlayerVisor } from "./ColonyPlayerVisor";
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
  const weapon = useWeaponStore(s => s.weapon);
  const rifleCarry = weaponCarryMode('rifle', weapon, combat);
  const macheteCarry = weaponCarryMode('machete', weapon, combat);
  const falling = useCombatStore(s => s.dead) && combat && weapon === 'machete';
  const bodyRef = useRef<Group>(null);
  const swordLight = useMemo(() => createSwordLight(), []);
  useFrame(() => { if (bodyRef.current) bodyRef.current.rotation.y = motionRef.current.bodyYaw; }, -35);
  const asset = PLAYER_ASSET_VARIANTS[variant];
  const color = useExpeditionStore(s=>s.profile?.color ?? asset.accentColor);
  const [scene, setScene] = useState<Object3D | null>(null);
  const [rifleAttached, setRifleAttached] = useState(false);
  useEffect(() => {
    if (!scene) return;
    playerStepDust.bind(scene);
    return () => playerStepDust.unbind(scene);
  }, [scene]);
  const [macheteActions, setMacheteActions] = useState<GLBActionMap>(SEM_ACOES);
  const [actions, setActions] = useState<GLBActionMap>(SEM_ACOES);
  const combinedActions = useMemo(() => ({ ...actions, ...macheteActions }), [actions, macheteActions]);
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
        <group ref={bodyRef}>
          <GLBCharacter
            key={variant}
            animationPriority={-30}
            keepAnimating={falling}
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
        <LocomotionController motionRef={motionRef} actions={combinedActions} asset={asset} combat={combat} />
        {variant === 'astronauta' && <PlayerMacheteClips actions={actions} ready={setMacheteActions}/>}
        {variant === 'astronauta' && scene && macheteCarry !== 'hidden' && <PlayerMachete scene={scene} motionRef={motionRef} combat={combat} light={combat ? swordLight : null}/>}
        {variant === 'astronauta' && combat && <primitive object={swordLight} dispose={null}/>}
        {variant === 'astronauta' && scene && <PlayerBackpack scene={scene} illuminated={combat} />}
        {variant === 'astronauta' && scene && <ColonyPlayerVisor scene={scene} illuminated={!combat} />}
        {variant === 'astronauta' && scene && rifleCarry !== 'hidden' && <PlayerRifle equipped={weapon === 'rifle'} combat={combat} scene={scene} motionRef={motionRef} onAttached={setRifleAttached} />}
      </group>
      {combat && weapon === 'rifle' && !rifleAttached && <group name="PlayerRifle" position={[RIFLE_POSE.side, RIFLE_POSE.height - PLAYER_COLLIDER_CENTER_Y, RIFLE_POSE.gripForward]}>
        <mesh castShadow><boxGeometry args={[0.16, 0.18, 0.7]} /><meshStandardMaterial color="#243842" /></mesh>
        <mesh name="RifleBarrel" position={[0, 0, RIFLE_POSE.barrelForward]}><boxGeometry args={[0.08, 0.08, RIFLE_POSE.barrelLength]} /><meshStandardMaterial color="#78cddd" /></mesh>
      </group>}
    </>
  );
}
