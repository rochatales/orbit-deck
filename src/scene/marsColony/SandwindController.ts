import { SandwindWind, SAND_NOISE_GLSL } from './sandwindWind';
import { Box3, Color, Group, Vector2, type Mesh, type ColorSpace, type Material, type Object3D } from 'three';
import { distanceToBoundsSquared, SANDWIND_APPEARANCE, SANDWIND_PROFILES, shouldHideInSandwind, type GroundBounds, type SandwindProfile } from './sandwindPolicy';

export interface SandwindTarget { id: string; nodes: Object3D[]; bounds?: GroundBounds }
interface Entry { gate: Group; bounds: GroundBounds; hidden: boolean; triangles: number }
interface MaterialPatch { material: Material; compile: Material['onBeforeCompile']; key: Material['customProgramCacheKey'] }
interface MeshRestore { mesh: Mesh; material: Material | Material[] }
export interface SandwindSettings { enabled: boolean; culling: boolean; wind: boolean; profile: SandwindProfile }
/** Diagnóstico de propriedade, não estimativa de VRAM. Não guarda cenas nem materiais. */
export const sandwindResources = { controllers: 0, clones: 0, patches: 0 };

const VERTEX_POSITION = `
    vec4 swWorld = vec4(transformed, 1.0);
    #ifdef USE_BATCHING
        swWorld = batchingMatrix * swWorld;
    #endif
    #ifdef USE_INSTANCING
        swWorld = instanceMatrix * swWorld;
    #endif
    vSandwindPosition = (modelMatrix * swWorld).xyz;
`;
const FRAGMENT_FOG = `
    float swDistance = length(vSandwindPosition.xz - swCenter);
    float swDensity = pow(smoothstep(swClear, swOpaque, swDistance), swFalloff) * swEnabled;
    float swFog = swDensity;
    if (swDensity > .001 && swDensity < .999) {
        float swWave = sandCloudNoise((vSandwindPosition.xz - swDrift) * .085);
        swFog = clamp(swDensity + swDensity * (1.0 - swDensity) * (swWave - .5) * swTurbulence, 0.0, 1.0);
    }
    gl_FragColor.rgb = mix(gl_FragColor.rgb, swColor, swFog);
`;

/**
 * S6.19c v007: gates próprios, sem escrever visible/opacidade nos nós dos runtimes.
 * Instalar após seus layout effects: materiais finais privados mantêm identidade.
 */
export class SandwindController {
    readonly uniforms = {
        swCenter: { value: new Vector2() }, swClear: { value: 22 }, swOpaque: { value: 42 },
        swTime: { value: 0 }, swDrift: { value: new Vector2() },
        swFalloff: { value: SANDWIND_APPEARANCE.falloffExponent }, swTurbulence: { value: SANDWIND_APPEARANCE.turbulence }, swEnabled: { value: 1 }, swColor: { value: new Color() }
    };
    readonly stats = { total: 0, hidden: 0, retained: 0, hiddenTriangles: 0, materials: 0, clones: 0 };
    private readonly entries: Entry[] = [];
    private readonly patches: MaterialPatch[] = [];
    private readonly restores: MeshRestore[] = [];
    private readonly ownedMaterials = new Set<Material>();
    private readonly parents = new Map<Object3D, Object3D[]>();
    private elapsed = 1;
    private signature = '';
    private wasActive = false;
    private disposed = false;

    constructor(scope: Object3D, sources: readonly Object3D[], targets: SandwindTarget[], outputColorSpace: ColorSpace, readonly wind = new SandwindWind()) {
        new Color(SANDWIND_APPEARANCE.color).getRGB(this.uniforms.swColor.value, outputColorSpace);
        const shared = new Set<Material>();
        for (const source of sources) source.traverse(object => {
            const mesh = object as Mesh;
            if (mesh.isMesh) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) shared.add(material);
        });
        const cloned = new Map<Material, Material>(), patched = new Set<Material>();
        const patch = (material: Material) => {
            if (patched.has(material)) return;
            patched.add(material);
            const compile = material.onBeforeCompile, key = material.customProgramCacheKey;
            this.patches.push({ material, compile, key });
            material.onBeforeCompile = (shader, renderer) => {
                compile.call(material, shader, renderer);
                Object.assign(shader.uniforms, this.uniforms);
                shader.vertexShader = 'varying vec3 vSandwindPosition;\n' + shader.vertexShader;
                shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + VERTEX_POSITION);
                shader.fragmentShader = `varying vec3 vSandwindPosition;
                    uniform vec2 swCenter, swDrift;
                    uniform float swClear, swOpaque, swTime, swEnabled, swFalloff, swTurbulence;
                    uniform vec3 swColor;\n${SAND_NOISE_GLSL}\n` + shader.fragmentShader;
                shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n' + FRAGMENT_FOG);
            };
            material.customProgramCacheKey = () => key.call(material) + ':exoden-sandwind-v007';
            material.needsUpdate = true;
        };
        scope.traverse(object => {
            const mesh = object as Mesh;
            if (!mesh.isMesh || mesh.userData.sandwindCloud) return;
            const original = mesh.material;
            const prepare = (material: Material) => {
                // Apenas os materiais ainda vindos do cache são clonados. Fades,
                // ONLINE/OFFLINE e AlertPulse continuam apontando para os mesmos privados.
                if (!shared.has(material)) { patch(material); return material; }
                let copy = cloned.get(material);
                if (!copy) {
                    copy = material.clone(); copy.onBeforeCompile = material.onBeforeCompile;
                    copy.customProgramCacheKey = material.customProgramCacheKey;
                    cloned.set(material, copy); this.ownedMaterials.add(copy); patch(copy);
                }
                return copy;
            };
            this.restores.push({ mesh, material: original });
            mesh.material = Array.isArray(original) ? original.map(prepare) : prepare(original);
        });
        scope.updateWorldMatrix(true, true);
        const box = new Box3();
        for (const target of targets) {
            if (!target.nodes.length) continue;
            const parent = target.nodes[0].parent;
            if (!parent || target.nodes.some(node => node.parent !== parent)) throw new Error(`Grupo Sandwind sem pai comum: ${target.id}`);
            if (!this.parents.has(parent)) this.parents.set(parent, parent.children.slice());
            const gate = new Group(); gate.name = `SandwindDistance_${target.id}`;
            parent.add(gate);
            for (const node of target.nodes) gate.add(node); // pai identidade: tracks locais continuam iguais
            gate.updateWorldMatrix(true, true); box.setFromObject(gate);
            if (target.bounds) {
                box.min.x = Math.min(box.min.x, target.bounds.minX); box.max.x = Math.max(box.max.x, target.bounds.maxX);
                box.min.z = Math.min(box.min.z, target.bounds.minZ); box.max.z = Math.max(box.max.z, target.bounds.maxZ);
            }
            // Envelope conservador para folhas móveis. Inclui partes inicialmente ocultas.
            const bounds = { minX: box.min.x - 1, maxX: box.max.x + 1, minZ: box.min.z - 1, maxZ: box.max.z + 1 };
            let triangles = 0;
            gate.traverse(object => {
                const mesh = object as Mesh;
                if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
            });
            this.entries.push({ gate, bounds, hidden: false, triangles });
        }
        this.stats.total = this.stats.retained = this.entries.length;
        this.stats.materials = this.patches.length; this.stats.clones = this.ownedMaterials.size;
        sandwindResources.controllers++; sandwindResources.clones += this.ownedMaterials.size; sandwindResources.patches += this.patches.length;
    }

    update(x: number, z: number, delta: number, settings: SandwindSettings, paused: boolean) {
        if (this.disposed) return;
        const p = SANDWIND_PROFILES[settings.profile];
        this.uniforms.swCenter.value.set(x, z);
        this.uniforms.swClear.value = p.clear; this.uniforms.swOpaque.value = p.opaque;
        this.uniforms.swEnabled.value = settings.enabled ? 1 : 0;
        this.wind.update(delta, settings.enabled && settings.wind, paused);
        this.uniforms.swTime.value = this.wind.time;
        this.uniforms.swDrift.value.set(this.wind.offsetX, this.wind.offsetZ);
        this.elapsed += Math.min(delta, 0.2);
        const active = settings.enabled && settings.culling;
        const changed = settings.profile !== this.signature || active !== this.wasActive;
        if (!changed && this.elapsed < 0.2) return;
        this.signature = settings.profile; this.wasActive = active; this.elapsed = 0;
        let hidden = 0, hiddenTriangles = 0;
        for (const entry of this.entries) {
            entry.hidden = active && shouldHideInSandwind(entry.hidden, distanceToBoundsSquared(x, z, entry.bounds), settings.profile);
            entry.gate.visible = !entry.hidden;
            if (entry.hidden) { hidden++; hiddenTriangles += entry.triangles; }
        }
        this.stats.hidden = hidden; this.stats.retained = this.entries.length - hidden;
        this.stats.hiddenTriangles = hiddenTriangles;
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        for (const { gate } of this.entries) {
            const parent = gate.parent;
            if (parent) { while (gate.children.length) parent.add(gate.children[0]); gate.removeFromParent(); }
        }
        for (const [parent, original] of this.parents) {
            const order = new Map(original.map((node, i) => [node, i]));
            parent.children.sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity));
        }
        for (const { material, compile, key } of this.patches) {
            material.onBeforeCompile = compile; material.customProgramCacheKey = key; material.needsUpdate = true;
        }
        for (const item of this.restores) item.mesh.material = item.material;
        for (const material of this.ownedMaterials) material.dispose();
        sandwindResources.controllers--; sandwindResources.clones -= this.ownedMaterials.size; sandwindResources.patches -= this.patches.length;
    }
}
