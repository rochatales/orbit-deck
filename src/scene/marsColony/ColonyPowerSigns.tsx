import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, NormalBlending, ShaderMaterial } from 'three';
import { COLONY_BUILDINGS } from '../../game/colonyBuildingsLayout';
import { useCampaignStore } from '../../state/useCampaignStore';
import { useGameStore } from '../../state/useGameStore';
import { playerVisualPosition } from '../../state/playerTransient';
import { resetCharacterInterior, updateCharacterInterior } from './colonyPower';
import { buildingPower } from './activationSequence';
import { COLONY_POWER, SOLAR_CURRENT, WORKSHOP_SMOKE } from './colonyPowerConfig';
import type { ColonyBuildingRuntime } from './colonyBuildingRuntime';

const power = (id: 'workshop' | 'data-center') => {
    const { mode, saved } = useCampaignStore.getState();
    return buildingPower(id, mode === 'campaign', !!saved?.campaign[COLONY_POWER[id].flag]);
};

/** Ponto local do GLB levado ao mundo pela implantação do prédio (rotação em Y). */
export function buildingPoint(id: string, local: { x: number; y: number; z: number }) {
    const { x, z, rotationY } = COLONY_BUILDINGS.find(building => building.id === id)!.placement;
    const cos = Math.cos(rotationY), sin = Math.sin(rotationY);
    return [x + local.x * cos + local.z * sin, local.y, z - local.x * sin + local.z * cos] as const;
}

/** Fumaça contínua da chaminé: a Oficina está em funcionamento. Movimento todo no shader. */
export function WorkshopSmoke({ runtime }: { runtime: RefObject<ColonyBuildingRuntime | undefined> }) {
    const origin = useMemo(() => buildingPoint('workshop', WORKSHOP_SMOKE.local), []);
    const geometry = useMemo(() => {
        const value = new BufferGeometry(), count = WORKSHOP_SMOKE.puffs;
        const seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) seeds[i] = i / count;
        value.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
        value.setAttribute('seed', new BufferAttribute(seeds, 1));
        return value;
    }, []);
    const material = useMemo(() => new ShaderMaterial({
        transparent: true, depthWrite: false, blending: NormalBlending,
        uniforms: {
            time: { value: 0 }, power: { value: 0 }, scale: { value: 1 },
            tint: { value: new Color(WORKSHOP_SMOKE.color) }
        },
        vertexShader: `
            attribute float seed; uniform float time; uniform float scale; varying float age;
            void main() {
                age = fract(time / ${WORKSHOP_SMOKE.life.toFixed(2)} + seed);
                float sway = sin(seed * 43.0 + age * 5.0) * 0.22 * age;
                vec3 p = vec3(${WORKSHOP_SMOKE.drift.x.toFixed(2)} * age * age + sway, ${WORKSHOP_SMOKE.rise.toFixed(2)} * age,
                    ${WORKSHOP_SMOKE.drift.z.toFixed(2)} * age * age + cos(seed * 29.0) * 0.18 * age);
                vec4 view = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * view;
                gl_PointSize = ${WORKSHOP_SMOKE.size.toFixed(2)} * (0.35 + age) * scale;
            }`,
        fragmentShader: `
            uniform vec3 tint; uniform float power; varying float age;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                float alpha = smoothstep(1.0, 0.25, d) * smoothstep(0.0, 0.12, age) * (1.0 - age) * ${WORKSHOP_SMOKE.opacity.toFixed(2)} * power;
                if (alpha < 0.004) discard;
                gl_FragColor = vec4(tint, alpha);
            }`
    }), []);
    useFrame(({ size, camera }, delta) => {
        const uniforms = material.uniforms;
        // Câmera ortográfica: metros → pixels sem divisão por profundidade.
        uniforms.scale.value = size.height * camera.projectionMatrix.elements[5] * .5;
        if (!useGameStore.getState().isPaused) uniforms.time.value += Math.min(delta, .05);
    });
    return <points name="WorkshopSmoke" position={origin} geometry={geometry} material={material} frustumCulled={false} renderOrder={5}
        onBeforeRender={() => {
            // Lê o estado final do teto depois das atualizações do quadro.
            const opacity = runtime.current?.status.roofOpacity ?? 0;
            material.uniforms.power.value = opacity > .01 ? power('workshop') * opacity : 0;
        }}/>;
}

/** Pulsos de corrente no cabo da fazenda solar até o Data Center: o prédio recebe energia. */
function SolarCurrent() {
    const { x, y, fromZ, toZ, width } = SOLAR_CURRENT, length = Math.abs(toZ - fromZ);
    const material = useMemo(() => new ShaderMaterial({
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
        uniforms: { time: { value: 0 }, power: { value: 0 }, tint: { value: new Color(SOLAR_CURRENT.color) } },
        vertexShader: 'varying vec2 at; void main() { at = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform vec3 tint; uniform float time; uniform float power; varying vec2 at;
            void main() {
                // at.y cresce da fazenda solar para o prédio; os pulsos correm nesse sentido.
                float run = fract(at.y * ${SOLAR_CURRENT.pulses.toFixed(1)} - time * ${(SOLAR_CURRENT.speed / length * SOLAR_CURRENT.pulses).toFixed(4)});
                float pulse = smoothstep(0.55, 1.0, run) * smoothstep(1.0, 0.92, run);
                // Fio central fino e halo largo: lê como eletricidade mesmo com a câmera afastada.
                float side = abs(at.x - 0.5) * 2.0;
                float core = smoothstep(0.32, 0.0, side), halo = smoothstep(1.0, 0.0, side);
                float alpha = ((0.45 + pulse) * core + (0.06 + 0.5 * pulse) * halo) * power;
                gl_FragColor = vec4(tint * (0.8 + pulse * 1.8), min(1.0, alpha));
            }`
    }), [length]);
    useFrame((_, delta) => {
        material.uniforms.power.value = power('data-center');
        if (!useGameStore.getState().isPaused) material.uniforms.time.value += Math.min(delta, .05);
    });
    // Plano deitado sobre o cabo; rotação mantém uv.y no sentido fazenda → prédio.
    return <mesh name="SolarCurrent" position={[x, y, (fromZ + toZ) / 2]} rotation={[-Math.PI / 2, 0, toZ > fromZ ? Math.PI : 0]} material={material} renderOrder={4}>
        <planeGeometry args={[width, length]}/>
    </mesh>;
}

/** O Salvager recebe a luz da sala em que está; ao sair de Marte volta à luz do mapa. */
function CharacterInteriorLight() {
    useEffect(() => resetCharacterInterior, []);
    useFrame((_, delta) => updateCharacterInterior(playerVisualPosition.x, playerVisualPosition.z, 1 - Math.exp(-8 * Math.min(.05, delta))));
    return null;
}

export function ColonyPowerSigns() {
    return <group name="ColonyPowerSigns"><SolarCurrent/><CharacterInteriorLight/></group>;
}
