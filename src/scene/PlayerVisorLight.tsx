import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type SpotLight } from 'three';
import { playerWeaponPose } from '../state/playerWeaponPose';
import { useWeaponStore } from '../state/useWeaponStore';
import { playerPosition, playerFacing } from '../state/playerTransient';
import { VISOR_LIGHT } from './lightingConfig';
import { writeVisorLight } from './visorPose';

/** Foco de Shanghai: boca do rifle ou origem estável à frente do corpo com espada, inclusive no Dash. */
export function PlayerVisorLight() {
    const light=useRef<SpotLight>(null),target=useMemo(()=>new Object3D(),[]);
    useEffect(()=>()=>{target.removeFromParent();},[target]);
    useFrame(()=>{if(light.current){writeVisorLight(light.current.position,target.position,playerPosition,playerFacing.angle,useWeaponStore.getState().weapon === 'rifle' ? playerWeaponPose : undefined);target.updateMatrixWorld();}});
    return <><primitive object={target}/><spotLight name="PlayerVisorLight" ref={light} target={target}
        color={VISOR_LIGHT.color} intensity={VISOR_LIGHT.intensity} distance={VISOR_LIGHT.reach}
        angle={VISOR_LIGHT.angle} penumbra={VISOR_LIGHT.penumbra} decay={2} castShadow
        shadow-mapSize-width={VISOR_LIGHT.shadowMap} shadow-mapSize-height={VISOR_LIGHT.shadowMap}
        shadow-camera-near={.08} shadow-camera-far={VISOR_LIGHT.reach} shadow-bias={-.0001} shadow-normalBias={VISOR_LIGHT.shadowNormalBias}/></>;
}
