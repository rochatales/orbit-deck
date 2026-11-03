import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, TextureLoader, DoubleSide } from 'three';
import cloudTextureUrl from '../assets/shanghai-limites/nuvem.png';
import { simulationBlocked } from '../game/simulationGate';

interface CloudInstance {
    x: number;
    y: number;
    z: number;
    scale: number;
    baseOpacity: number;
    driftSpeed: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Nuvens atmosféricas de Shanghai (S6.3):
 * - Densa nas bordas, suaves no centro do mapa.
 * - Planos horizontais com textura de puff alpha e depthWrite=false (sem oclusão de combate).
 * - Deriva contínua sem alocação no useFrame (instância única de InstancedMesh).
 * - Respeita prefers-reduced-motion (velocidade zero se ativo).
 */
export function ShanghaiClouds() {
    const texture = useLoader(TextureLoader, cloudTextureUrl);
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);

    const instances = useMemo<CloudInstance[]>(() => {
        const list: CloudInstance[] = [];

        // 1. Anel externo / bordas (48 nuvens mais densas)
        const outerCount = 48;
        for (let i = 0; i < outerCount; i++) {
            const side = i % 4;
            const t = (Math.floor(i / 4) / 12) * 2 - 1; // -1 a 1
            let x = 0, z = 0;
            if (side === 0) { // Norte (z = -58 a -68)
                x = t * 62;
                z = -60 + ((i * 17) % 11) - 5;
            } else if (side === 1) { // Sul (z = 58 a 68)
                x = t * 62;
                z = 60 + ((i * 19) % 11) - 5;
            } else if (side === 2) { // Oeste (x = -56 a -66)
                x = -58 + ((i * 13) % 11) - 5;
                z = t * 64;
            } else { // Leste (x = 56 a 66)
                x = 58 + ((i * 23) % 11) - 5;
                z = t * 64;
            }
            const y = 2.4 + ((i * 7) % 10) * 0.18;
            const scale = 22.0 + ((i * 11) % 14);
            const driftSpeed = reducedMotion ? 0 : 0.35 + ((i * 5) % 8) * 0.05;

            list.push({
                x,
                y,
                z,
                scale,
                baseOpacity: 0.32,
                driftSpeed,
                minX: -76,
                maxX: 76,
                minZ: -78,
                maxZ: 78
            });
        }

        // 2. Interior do mapa (16 nuvens bem suaves / tênues no centro)
        const innerCount = 16;
        for (let i = 0; i < innerCount; i++) {
            const angle = (i / innerCount) * Math.PI * 2;
            const r = 12.0 + ((i * 17) % 24);
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = 3.2 + ((i * 13) % 8) * 0.15;
            const scale = 16.0 + ((i * 7) % 10);
            const driftSpeed = reducedMotion ? 0 : 0.25 + ((i * 3) % 6) * 0.04;

            list.push({
                x,
                y,
                z,
                scale,
                baseOpacity: 0.08,
                driftSpeed,
                minX: -55,
                maxX: 55,
                minZ: -58,
                maxZ: 58
            });
        }

        return list;
    }, []);

    // Configuração inicial das instâncias
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        dummy.rotation.x = -Math.PI / 2; // deitado horizontalmente
        for (let i = 0; i < instances.length; i++) {
            const inst = instances[i];
            dummy.position.set(inst.x, inst.y, inst.z);
            dummy.scale.set(inst.scale, inst.scale, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }, [instances, dummy]);

    // Deriva lenta no useFrame (sem alocação)
    useFrame((_, delta) => {
        if (reducedMotion || simulationBlocked()) return;
        const mesh = meshRef.current;
        if (!mesh) return;

        const dt = Math.min(delta, 0.1);
        dummy.rotation.x = -Math.PI / 2;

        let moved = false;
        for (let i = 0; i < instances.length; i++) {
            const inst = instances[i];
            if (inst.driftSpeed <= 0) continue;

            inst.x += inst.driftSpeed * dt;
            inst.z += inst.driftSpeed * 0.4 * dt;

            // Envolve as coordenadas na fronteira
            if (inst.x > inst.maxX) inst.x = inst.minX;
            if (inst.z > inst.maxZ) inst.z = inst.minZ;

            dummy.position.set(inst.x, inst.y, inst.z);
            dummy.scale.set(inst.scale, inst.scale, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            moved = true;
        }

        if (moved) {
            mesh.instanceMatrix.needsUpdate = true;
        }
    });

    const material = useMemo(() => {
        return new MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.28,
            depthWrite: false,
            side: DoubleSide
        });
    }, [texture]);

    const geometry = useMemo(() => new PlaneGeometry(1, 1), []);

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, instances.length]}
            name="ShanghaiClouds"
            frustumCulled={false}
        />
    );
}
