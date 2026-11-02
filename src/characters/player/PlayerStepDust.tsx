import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage, InstancedBufferAttribute, Matrix4, PlaneGeometry, ShaderMaterial, Vector3, type InstancedMesh } from 'three';
import { simulationBlocked } from '../../game/simulationGate';
import type { MapId } from '../../game/session';
import type { OfficeWorld } from '../../world/createOfficeMap';
import { playerFacing, playerVisualPosition } from '../../state/playerTransient';
import { STEP_DUST, dustSurfaceHeight, playerStepDust as pool } from './stepDust';

/** Um batch mundial de billboards suaves; não há textura, luz, sombra ou objeto por passo. */
export function PlayerStepDust({ world, map }: { world: OfficeWorld; map: MapId }) {
    const mesh = useRef<InstancedMesh>(null);
    const pose = useMemo(() => ({ point: new Vector3(), size: new Vector3(), matrix: new Matrix4() }), []);
    const resources = useMemo(() => {
        const alpha = new InstancedBufferAttribute(new Float32Array(STEP_DUST.capacity), 1).setUsage(DynamicDrawUsage);
        const geometry = new PlaneGeometry(1, 1); geometry.setAttribute('dustAlpha', alpha);
        const material = new ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
            uniforms: { dustColor: { value: new Color(STEP_DUST.colors[map]) } },
            vertexShader: 'attribute float dustAlpha; varying vec2 uv0; varying float alpha0; void main(){uv0=uv;alpha0=dustAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
            fragmentShader: 'uniform vec3 dustColor; varying vec2 uv0; varying float alpha0; void main(){float r=length(uv0*2.-1.);float soft=exp(-r*r*2.5)*(1.-smoothstep(.45,1.,r));gl_FragColor=vec4(dustColor,soft*alpha0);\n#include <colorspace_fragment>\n}',
        });
        return { alpha, geometry, material };
    }, [map]);
    useLayoutEffect(() => {
        pool.reset();
        if (mesh.current) { mesh.current.count = 0; mesh.current.instanceMatrix.setUsage(DynamicDrawUsage); }
        return () => { pool.reset(); resources.geometry.dispose(); resources.material.dispose(); };
    }, [resources]);
    useFrame(({ camera }, delta) => {
        const target = mesh.current;
        if (!target) return;
        const blocked = simulationBlocked();
        if (!blocked) {
            pool.step(delta);
            // Mixer a -30; amostragem depois da pose animada e da física, no espaço mundial.
            for (let i = 0; i < pool.pending; i++) {
                const side = pool.sides[i], foot = side === 0 ? pool.leftFoot : pool.rightFoot;
                if (foot) foot.getWorldPosition(pose.point);
                else {
                    const offset = side === 0 ? -.14 : .14, angle = playerFacing.angle;
                    pose.point.set(playerVisualPosition.x + Math.cos(angle) * offset, 0, playerVisualPosition.z - Math.sin(angle) * offset);
                }
                pool.emit(pose.point.x, dustSurfaceHeight(world, pose.point.x, pose.point.z), pose.point.z, pool.angles[i]);
            }
        }
        pool.pending = 0; // Pausa descarta solicitações, sem rajada acumulada ao retomar.
        let count = 0;
        for (let i = 0; i < pool.particles.length; i++) {
            const p = pool.particles[i];
            if (p.life <= 0) continue;
            pose.point.set(p.x, p.y, p.z); pose.size.set(p.size * p.stretch, p.size, p.size);
            pose.matrix.compose(pose.point, camera.quaternion, pose.size);
            target.setMatrixAt(count, pose.matrix); resources.alpha.setX(count++, p.alpha);
        }
        target.count = count; target.instanceMatrix.needsUpdate = true; resources.alpha.needsUpdate = true;
    });
    return <instancedMesh name="PlayerFootstepDust" ref={mesh} args={[resources.geometry, resources.material, STEP_DUST.capacity]} frustumCulled={false} dispose={null} />;
}
