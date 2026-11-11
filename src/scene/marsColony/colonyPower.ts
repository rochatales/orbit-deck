import { Color, ShaderChunk, Vector4, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { useCampaignStore } from '../../state/useCampaignStore';
import { buildingPower } from './activationSequence';
import { COLONY_POWER, INTERIOR_LIGHT, type PoweredBuilding } from './colonyPowerConfig';

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
    // Um único uniforme por prédio: todos os materiais internos leem a mesma luz de teto.
    const light = { value: new Color(0, 0, 0) }, lift = { value: 0 };
    const materials = new Set<MeshStandardMaterial>();
    const emissives: { material: MeshStandardMaterial; intensity: number }[] = [];
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const standard = material as MeshStandardMaterial;
            if (!standard.isMeshStandardMaterial || materials.has(standard)) continue;
            materials.add(standard);
            // Prédio sem equipamento luminoso próprio (Hangar): nenhuma face emissiva, nem por dentro.
            if (!config.glow) { standard.emissive.setScalar(0); standard.emissiveMap = null; }
            if (standard.emissiveIntensity > 0 && standard.emissive.getHex() !== 0)
                emissives.push({ material: standard, intensity: standard.emissiveIntensity });
            standard.customProgramCacheKey = () => 'colony-interior';
            standard.onBeforeCompile = shader => {
                shader.uniforms.colonyRoom = { value: room };
                shader.uniforms.colonyCeiling = { value: config.ceiling };
                shader.uniforms.colonyLight = light;
                shader.uniforms.colonyLift = lift;
                shader.vertexShader = 'varying vec3 colonyWorld;\n' + shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    '#include <worldpos_vertex>\ncolonyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
                );
                shader.fragmentShader = 'varying vec3 colonyWorld; uniform vec4 colonyRoom; uniform float colonyCeiling; uniform vec3 colonyLight; uniform float colonyLift;\n'
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
            interiorLightColor(light.value, power, config.initial);
            lift.value = Math.min(1, power);
        }
        return power;
    };
}

const white = new Color(INTERIOR_LIGHT.color), emergency = new Color(INTERIOR_LIGHT.emergency);
/** Abaixo da energia plena, a luz de teto é fraca e avermelhada (emergência). */
export function interiorLightColor(target: Color, power: number, initial: number) {
    const dim = initial > 0 && initial < 1 ? Math.max(0, Math.min(1, (1 - power) / (1 - initial))) : 0;
    return target.copy(white).lerp(emergency, dim).multiplyScalar(power);
}

const indoorLighting = `
    bool colonyInterior = colonyWorld.y < colonyCeiling
        && colonyWorld.x > colonyRoom.x && colonyWorld.x < colonyRoom.y
        && colonyWorld.z > colonyRoom.z && colonyWorld.z < colonyRoom.w;
    float colonyUp = max(dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)), 0.0);
    // Piso e tampos escuros clareiam com a energia; juntas e desenho da textura continuam visíveis.
    if (colonyInterior) material.diffuseColor = mix(material.diffuseColor,
        pow(material.diffuseColor, vec3(${INTERIOR_LIGHT.floorGamma.toFixed(2)})), colonyUp * colonyLift);
    // Fachadas, telhados e portas não brilham: contornos e pontilhados emissivos dos modelos antigos
    // saem do exterior. Quem mostra um prédio ligado é o interior (e a fumaça ou a corrente).
    if (!colonyInterior) totalEmissiveRadiance = vec3(0.0);
` + ShaderChunk.lights_fragment_begin
    .replace('getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight ); if (colonyInterior) directLight.color *= 0.0;')
    .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );',
        `irradiance += (colonyInterior ? ${INTERIOR_LIGHT.hemisphere.toFixed(2)} : 1.0) * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );`)
    // Luz branca uniforme do teto, sem fonte visível: mais forte nas faces viradas para cima (piso e tampos).
    .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );',
        `vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
        if (colonyInterior) irradiance += colonyLight * (${INTERIOR_LIGHT.base.toFixed(2)} + ${INTERIOR_LIGHT.floor.toFixed(2)} * colonyUp);`);

const POWERED = Object.keys(COLONY_POWER) as PoweredBuilding[];
const sharedLighting = `
    bool colonyInterior = false; vec3 colonyLight = vec3(0.0); float colonyLift = 0.0;
    for (int i = 0; i < ${POWERED.length}; i++) {
        vec4 room = colonyRooms[i];
        if (colonyWorld.x > room.x && colonyWorld.x < room.y && colonyWorld.z > room.z && colonyWorld.z < room.w) {
            colonyInterior = true; colonyLight = colonyLights[i]; colonyLift = colonyLifts[i];
        }
    }
    float colonyUp = 1.0;
    if (colonyInterior) material.diffuseColor = mix(material.diffuseColor,
        pow(material.diffuseColor, vec3(${INTERIOR_LIGHT.floorGamma.toFixed(2)})), colonyLift);
` + indoorLighting.slice(indoorLighting.indexOf(ShaderChunk.lights_fragment_begin.slice(0, 40)));

/** O pavimento é uma malha única sob todos os prédios: cada fragmento procura a sua sala. */
export function bindSharedFloorPower(scene: Object3D) {
    const rooms = POWERED.map(id => { const { minX, maxX, minZ, maxZ } = COLONY_POWER[id].bounds; return new Vector4(minX + .14, maxX - .14, minZ + .14, maxZ - .14); });
    const lights = POWERED.map(() => new Color(0, 0, 0)), lifts = POWERED.map(() => 0);
    const uniforms = { colonyRooms: { value: rooms }, colonyLights: { value: lights }, colonyLifts: { value: lifts } };
    const copies = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    const own = (material: MeshStandardMaterial) => {
        if (!material.isMeshStandardMaterial) return material;
        let copy = copies.get(material);
        if (!copy) {
            // Cópia por instância: o cache do GLTF continua sem o shader da colônia.
            copy = material.clone(); copies.set(material, copy);
            copy.customProgramCacheKey = () => 'colony-shared-floor';
            copy.onBeforeCompile = shader => {
                Object.assign(shader.uniforms, uniforms);
                shader.vertexShader = 'varying vec3 colonyWorld;\n' + shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    '#include <worldpos_vertex>\ncolonyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
                );
                shader.fragmentShader = `varying vec3 colonyWorld; uniform vec4 colonyRooms[${POWERED.length}]; uniform vec3 colonyLights[${POWERED.length}]; uniform float colonyLifts[${POWERED.length}];\n`
                    + shader.fragmentShader.replace('#include <lights_fragment_begin>', sharedLighting);
            };
        }
        return copy;
    };
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? (mesh.material as MeshStandardMaterial[]).map(own) : own(mesh.material as MeshStandardMaterial);
    });
    const update = () => {
        const state = useCampaignStore.getState();
        for (let i = 0; i < POWERED.length; i++) {
            const config = COLONY_POWER[POWERED[i]];
            const power = buildingPower(POWERED[i], state.mode === 'campaign', !!state.saved?.campaign[config.flag]);
            interiorLightColor(lights[i], power, config.initial);
            lifts[i] = Math.min(1, power);
        }
    };
    return { update, dispose: () => { for (const copy of copies.values()) copy.dispose(); } };
}

/** Energia da sala que contém o ponto, ou -1 fora de qualquer prédio. Só leitura, sem alocar. */
export function interiorPowerAt(x: number, z: number) {
    const state = useCampaignStore.getState();
    for (let i = 0; i < POWERED.length; i++) {
        const config = COLONY_POWER[POWERED[i]], { minX, maxX, minZ, maxZ } = config.bounds;
        if (x > minX + .14 && x < maxX - .14 && z > minZ + .14 && z < maxZ - .14)
            return buildingPower(POWERED[i], state.mode === 'campaign', !!state.saved?.campaign[config.flag]);
    }
    return -1;
}

/** Luz do ambiente sobre o personagem: uniformes globais, atualizados por quadro só em Marte. */
export const characterInterior = { light: { value: new Color(0, 0, 0) }, inside: { value: 0 } };
const characterLighting = ShaderChunk.lights_fragment_begin
    .replace('getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= 1.0 - colonyInside;')
    .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );',
        'vec3 irradiance = getAmbientLightIrradiance( ambientLightColor ) + colonyCharacterLight;');
/** Encadeia com patches existentes (areia): dentro de um prédio o sol sai e entra a luz branca da sala. */
export function bindCharacterInteriorLight(scene: Object3D) {
    const seen = new Set<MeshStandardMaterial>();
    scene.traverse(node => {
        const mesh = node as Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            const standard = material as MeshStandardMaterial;
            if (!standard.isMeshStandardMaterial || seen.has(standard)) continue;
            seen.add(standard);
            const compile = standard.onBeforeCompile, key = standard.customProgramCacheKey;
            standard.customProgramCacheKey = () => key.call(standard) + ':colony-character';
            standard.onBeforeCompile = (shader, renderer) => {
                compile.call(standard, shader, renderer);
                shader.uniforms.colonyCharacterLight = characterInterior.light;
                shader.uniforms.colonyInside = characterInterior.inside;
                shader.fragmentShader = 'uniform vec3 colonyCharacterLight; uniform float colonyInside;\n'
                    + shader.fragmentShader.replace('#include <lights_fragment_begin>', characterLighting);
            };
            standard.needsUpdate = true;
        }
    });
}
/** step = fração de aproximação do quadro; (x, z) fora de Marte nunca é chamado. */
export function updateCharacterInterior(x: number, z: number, step: number) {
    const power = interiorPowerAt(x, z), inside = characterInterior.inside;
    inside.value += ((power >= 0 ? 1 : 0) - inside.value) * step;
    const target = Math.max(0, power) * INTERIOR_LIGHT.character * inside.value;
    characterInterior.light.value.copy(white).multiplyScalar(target);
}
export function resetCharacterInterior() {
    characterInterior.inside.value = 0; characterInterior.light.value.setScalar(0);
}
