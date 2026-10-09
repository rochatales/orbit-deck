import { useExpeditionStore } from "../../state/useExpeditionStore";
import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { Group, type Object3D } from "three";
import { GLBCharacter, type GLBActionMap } from "../GLBCharacter";
import { PLAYER_ASSET_VARIANTS } from "../characterAssetConfig";
import { LocomotionController } from "./LocomotionController";
import { usePlayerAsset } from "./playerAssetChoice";
import { PLAYER_MODEL_ROOT_Y, type PlayerMotionState } from "./playerConfig";

const SEM_ACOES: GLBActionMap = {};

interface PlayerModelProps {
  motionRef: MutableRefObject<PlayerMotionState>;
}

export function PlayerModel({ motionRef }: PlayerModelProps) {
  // S2.12: o GLB do player vem da variante escolhida (r7 por padrão; o ativo anterior para
  // comparar). Trocar remonta só o visual e o animador; o corpo físico é o mesmo.
  const variant = usePlayerAsset(s => s.variant);
  const asset = PLAYER_ASSET_VARIANTS[variant];
  const color = useExpeditionStore(s=>s.profile?.color ?? asset.accentColor);
  const rootRef = useRef<Group>(null);
  const visualRef = useRef<Group>(null);
  const glbSceneRef = useRef<Object3D | null>(null);
  // GLB animation actions arrive asynchronously after the model finishes
  // loading; useState here re-renders so LocomotionController picks them up.
  // As ações ficam associadas à variante que as carregou: ao trocar de GLB, as do anterior
  // deixam de valer até o novo terminar de carregar (sem efeito de limpeza, que rodaria depois
  // do callback do filho e apagaria as ações recém-carregadas).
  const [loaded, setLoaded] = useState<{ variant: string; actions: GLBActionMap }>({ variant: "", actions: {} });
  const actions = loaded.variant === variant ? loaded.actions : SEM_ACOES;
  const onAnimationsReady = useCallback((loadedActions: GLBActionMap) => {
    setLoaded({ variant: usePlayerAsset.getState().variant, actions: loadedActions });
    usePlayerAsset.getState().setClips(Object.keys(loadedActions).filter(nome => loadedActions[nome]).sort());
    // Só em desenvolvimento: QA de locomoção no navegador (estado, ações e contato dos pés).
    if (import.meta.env.DEV) Object.assign(window, { __hordaPlayerActions: loadedActions, __hordaPlayerMotion: motionRef.current });
  }, [motionRef]);
  const onSceneReady = useCallback((scene: Object3D) => {
    glbSceneRef.current = scene;
    // Só em desenvolvimento: medição do contato dos pés no navegador (handoff da S2.12).
    if (import.meta.env.DEV) (window as unknown as { __hordaPlayerScene?: Object3D }).__hordaPlayerScene = scene;
  }, []);

  return (
    <group ref={rootRef} position={[0, PLAYER_MODEL_ROOT_Y, 0]}>
      <group ref={visualRef}>
        <GLBCharacter
          key={variant}
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
      <LocomotionController key={variant} motionRef={motionRef} actions={actions} />
    </group>
  );
}
