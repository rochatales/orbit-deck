import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, Vector3, type InstancedMesh } from 'three';
import { RioFootprints } from '../../game/rio/footprints';
import { rioSandHeight, rioSandStepKind } from '../../game/rio/sandSurface';
import { simulationBlocked } from '../../game/simulationGate';
import type { MapId } from '../../game/session';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { playerFacing, playerVisualPosition } from '../../state/playerTransient';
import { interiorPowerAt } from '../../scene/marsColony/colonyPower';
import { STEP_DUST, dustSurfaceHeight, hasDustSupport, playerStepDust as pool } from './stepDust';

/** Um batch mundial de billboards suaves; não há textura, luz, sombra ou objeto por passo. */
export function PlayerStepDust({ world, map }: { world: OfficeWorld; map: MapId }) {
    const mesh = useRef<InstancedMesh>(null);
    const footprints = useMemo(() => map === 'rio' ? new RioFootprints() : null, [map]);
    const pose = useMemo(() => ({ point: new Vector3(), size: new Vector3(), matrix: new Matrix4() }), []);
    const resources = useMemo(() => {
        const alpha = new InstancedBufferAttribute(new Float32Array(STEP_DUST.capacity), 1).setUsage(DynamicDrawUsage);
        const tint = new InstancedBufferAttribute(new Float32Array(STEP_DUST.capacity), 1).setUsage(DynamicDrawUsage);
        const geometry = new PlaneGeometry(1, 1); geometry.setAttribute('dustAlpha', alpha); geometry.setAttribute('dustTint', tint);
        const material = new ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
            uniforms: { dustColor: { value: new Color(STEP_DUST.colors[map]) }, indoorColor: { value: new Color(STEP_DUST.colors.indoor) }, sandColor: { value: new Color(STEP_DUST.colors.sand) } },
            vertexShader: 'attribute float dustAlpha; attribute float dustTint; varying vec2 uv0; varying float alpha0; varying float tint0; void main(){uv0=uv;alpha0=dustAlpha;tint0=dustTint;vec3 p=position;p.y+=.5;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}',
            fragmentShader: 'uniform vec3 dustColor; uniform vec3 indoorColor; uniform vec3 sandColor; varying vec2 uv0; varying float alpha0; varying float tint0; void main(){float r=length(uv0*2.-1.);float soft=exp(-r*r*2.5)*(1.-smoothstep(.45,1.,r));gl_FragColor=vec4(tint0>1.5?sandColor:mix(dustColor,indoorColor,tint0),soft*alpha0);\n#include <colorspace_fragment>\n}',
        });
        return { alpha, tint, geometry, material };
    }, [map]);
    useLayoutEffect(() => {
        pool.reset();
        if (mesh.current) { mesh.current.count = 0; mesh.current.instanceMatrix.setUsage(DynamicDrawUsage); }
        return () => { pool.reset(); resources.geometry.dispose(); resources.material.dispose(); };
    }, [resources]);
    useLayoutEffect(() => () => footprints?.dispose(), [footprints]);
    useFrame(({ camera }, delta) => {
        const target = mesh.current;
        if (!target) return;
        const blocked = simulationBlocked();
        if (!blocked) {
            pool.step(delta);
            footprints?.step(delta);
            const floor = pool.pending > 0 ? dustSurfaceHeight(world, playerVisualPosition.x, playerVisualPosition.z) - STEP_DUST.groundOffset : 0;
            // Mixer a -30; amostragem depois da pose animada e da física, no espaço mundial.
            for (let i = 0; i < pool.pending; i++) {
                if (!hasDustSupport(pool.grounded[i] === 1, playerVisualPosition.y, floor)) continue;
                const side = pool.sides[i], foot = side === 0 ? pool.leftFoot : pool.rightFoot;
                if (foot) foot.getWorldPosition(pose.point);
                else {
                    const offset = side === 0 ? -.14 : .14, angle = playerFacing.angle;
                    pose.point.set(playerVisualPosition.x + Math.cos(angle) * offset, 0, playerVisualPosition.z - Math.sin(angle) * offset);
                }
                if (footprints) {
                    const { x, z } = pose.point;
                    const sandY = rioSandHeight(x, z);
                    if (sandY !== null) {
                        const time = world.group.userData.coastalWater?.getSimulationTime() ?? 0;
                        const kind = rioSandStepKind(x, z, time);
                        if (kind) {
                            const damp = kind === 'damp';
                            footprints.stamp(x, sandY, z, playerFacing.angle, side === 0, damp);
                            pool.emit(x, sandY + STEP_DUST.groundOffset, z, pool.angles[i], Math.random, 2, damp ? .26 : 1);
                        }
                        continue;
                    }
                    if (floor < -.015) continue;
                }
                // Piso interno de prédio ligado não tem areia marciana: a poeira sai cinza clara.
                const indoor = map === 'mars' && interiorPowerAt(pose.point.x, pose.point.z) > .5 ? 1 : 0;
                pool.emit(pose.point.x, dustSurfaceHeight(world, pose.point.x, pose.point.z), pose.point.z, pool.angles[i], Math.random, indoor);
            }
        }
        pool.pending = 0; // Pausa descarta solicitações, sem rajada acumulada ao retomar.
        let count = 0;
        for (let i = 0; i < pool.particles.length; i++) {
            const p = pool.particles[i];
            if (p.life <= 0) continue;
            pose.point.set(p.x, p.y, p.z); pose.size.set(p.size * p.stretch, p.size, p.size);
            pose.matrix.compose(pose.point, camera.quaternion, pose.size);
            target.setMatrixAt(count, pose.matrix); resources.tint.setX(count, p.tint); resources.alpha.setX(count++, p.alpha);
        }
        target.count = count; target.instanceMatrix.needsUpdate = true; resources.alpha.needsUpdate = true; resources.tint.needsUpdate = true;
    });
    return <>{footprints && <primitive object={footprints.mesh} dispose={null}/>}<instancedMesh name="PlayerFootstepDust" ref={mesh} args={[resources.geometry, resources.material, STEP_DUST.capacity]} frustumCulled={false} dispose={null} /></>;
}
