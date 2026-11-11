import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, DoubleSide, type PointLight } from 'three';
import { playerPosition } from '../../state/playerTransient';
import { useCampaignStore } from '../../state/useCampaignStore';
import { buildingPower } from './activationSequence';
import { COLONY_POWER, type PoweredBuilding } from './colonyPowerConfig';

const rooms = (Object.keys(COLONY_POWER) as PoweredBuilding[]).map(id => {
    const config = COLONY_POWER[id], { minX, maxX, minZ, maxZ } = config.bounds;
    return { id, config, color: new Color(config.color), x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
        width: maxX - minX, depth: maxZ - minZ };
});
const emergency = new Color('#ff5836');
export const INTERIOR_LIGHT_LIMIT = 4;

export function ColonyInteriorLights() {
    const lights = useRef<(PointLight | null)[]>([]);
    const assigned = useRef(new Int8Array(INTERIOR_LIGHT_LIMIT).fill(-1));
    const nearest = useRef(new Int8Array(INTERIOR_LIGHT_LIMIT));
    const distances = useRef(new Float64Array(rooms.length));
    const powers = useRef(new Float64Array(rooms.length));
    useFrame((_, delta) => {
        const { mode, saved } = useCampaignStore.getState();
        const step = 1 - Math.exp(-12 * Math.min(.05, delta));
        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];
            powers.current[i] = buildingPower(room.id, mode === 'campaign', !!saved?.campaign[room.config.flag]);
            const dx = playerPosition.x - room.x, dz = playerPosition.z - room.z;
            distances.current[i] = powers.current[i] > 0 ? dx * dx + dz * dz : Infinity;
        }
        nearest.current.fill(-1);
        for (let slot = 0; slot < INTERIOR_LIGHT_LIMIT; slot++) {
            let best = -1, distance = Infinity;
            for (let i = 0; i < rooms.length; i++) {
                if (distances.current[i] < distance) { best = i; distance = distances.current[i]; }
            }
            if (best < 0) break;
            nearest.current[slot] = best;
            distances.current[best] = Infinity;
        }
        for (let slot = 0; slot < INTERIOR_LIGHT_LIMIT; slot++) {
            const light = lights.current[slot];
            if (!light) continue;
            let index = assigned.current[slot];
            const retained = index >= 0 && nearest.current.includes(index);
            if (!retained && light.intensity < .02) {
                index = -1;
                for (let i = 0; i < INTERIOR_LIGHT_LIMIT; i++) {
                    const candidate = nearest.current[i];
                    if (candidate >= 0 && !assigned.current.includes(candidate)) { index = candidate; break; }
                }
                assigned.current[slot] = index;
                if (index >= 0) {
                    const room = rooms[index];
                    light.position.set(room.x, room.config.ceiling - .35, room.z);
                    light.distance = Math.max(room.width, room.depth) * .78;
                }
            }
            const power = index >= 0 && nearest.current.includes(index) ? powers.current[index] : 0;
            light.intensity += (power * 16 - light.intensity) * step;
            if (index >= 0) {
                const room = rooms[index];
                light.color.copy(room.color);
                if (room.config.emergency) light.color.lerp(emergency, Math.max(0, (1 - powers.current[index]) / .84));
            }
        }
    });
    return <group name="ColonyInteriorLights">
        {rooms.map(({ id, x, z, width, depth, config }) => <mesh key={id} name={`ColonyRoofShadow-${id}`}
            position={[x, config.ceiling, z]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <planeGeometry args={[width, depth]}/>
            <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide}/>
        </mesh>)}
        {Array.from({ length: INTERIOR_LIGHT_LIMIT }, (_, index) => <pointLight key={index}
            ref={light => { lights.current[index] = light; }} intensity={0} decay={2}/>)}
    </group>;
}
