import { ShaderChunk, Vector4, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { useCampaignStore } from '../../state/useCampaignStore';
import { buildingPower } from './activationSequence';
import { COLONY_POWER, type PoweredBuilding } from './colonyPowerConfig';

/** Chamar após o runtime criar os materiais privados. A energia muda por evento do save. */
export function bindColonyPower(scene: Object3D, flag: 'edenActive' | 'synthesizerActive', onPower?: (powered: boolean) => void) {
    const powered = (state: ReturnType<typeof useCampaignStore.getState>) => state.mode !== 'campaign' || !!state.saved?.campaign[flag];
    if (useCampaignStore.getState().mode !== 'campaign') return undefined;
    const emissives = new Map<MeshStandardMaterial, number>();
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const standard = material as MeshStandardMaterial;
            if (standard.isMeshStandardMaterial && standard.emissiveIntensity > 0 && standard.emissive.getHex() !== 0)
                emissives.set(standard, standard.emissiveIntensity);
        }
    });
    const apply = (active: boolean) => {
        for (const [material, intensity] of emissives) material.emissiveIntensity = active ? intensity : 0;
        onPower?.(active);
    };
    apply(powered(useCampaignStore.getState()));
    return useCampaignStore.subscribe((state, previous) => {
        const active = powered(state);
        if (active !== powered(previous)) apply(active);
    });
}

/** Os materiais privados conservam os letreiros externos e sombreiam só os fragmentos internos. */
export function bindBuildingPower(scene: Object3D, id: PoweredBuilding, greenhouse?: (power: number) => void) {
    const config = COLONY_POWER[id], { minX, maxX, minZ, maxZ } = config.bounds;
    const room = new Vector4(minX + .14, maxX - .14, minZ + .14, maxZ - .14);
    const materials = new Set<MeshStandardMaterial>();
    const emissives: { material: MeshStandardMaterial; intensity: number }[] = [];
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const standard = material as MeshStandardMaterial;
            if (!standard.isMeshStandardMaterial || materials.has(standard)) continue;
            materials.add(standard);
            if (standard.emissiveIntensity > 0 && standard.emissive.getHex() !== 0)
                emissives.push({ material: standard, intensity: standard.emissiveIntensity });
            standard.customProgramCacheKey = () => 'colony-interior';
            standard.onBeforeCompile = shader => {
                shader.uniforms.colonyRoom = { value: room };
                shader.uniforms.colonyCeiling = { value: config.ceiling };
                shader.vertexShader = 'varying vec3 colonyWorld;\n' + shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    '#include <worldpos_vertex>\ncolonyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
                );
                shader.fragmentShader = 'varying vec3 colonyWorld; uniform vec4 colonyRoom; uniform float colonyCeiling;\n'
                    + shader.fragmentShader.replace('#include <lights_fragment_begin>', indoorLighting);
            };
        }
    });
    let previous = -1;
    return () => {
        const state = useCampaignStore.getState();
        const power = buildingPower(id, state.mode === 'campaign', !!state.saved?.campaign[config.flag]);
        if (power !== previous) {
            previous = power;
            for (let i = 0; i < emissives.length; i++) {
                const { material, intensity } = emissives[i];
                material.emissiveIntensity = intensity * power;
            }
            greenhouse?.(power);
        }
        return power;
    };
}

const indoorLighting = `
    bool colonyInterior = colonyWorld.y < colonyCeiling
        && colonyWorld.x > colonyRoom.x && colonyWorld.x < colonyRoom.y
        && colonyWorld.z > colonyRoom.z && colonyWorld.z < colonyRoom.w;
` + ShaderChunk.lights_fragment_begin
    .replace('getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight ); if (colonyInterior) directLight.color *= 0.0;')
    .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );',
        'irradiance += (colonyInterior ? 0.28 : 1.0) * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );');
