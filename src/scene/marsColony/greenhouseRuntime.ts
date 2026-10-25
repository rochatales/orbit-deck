import { Mesh, MeshStandardMaterial, PointLight, type Material, type Object3D } from 'three';
import { MasterplanRuntime, validateMasterplan, type MasterplanManifest, type MasterplanPart } from './masterplanRuntime';

export type GreenhouseState = 'OFFLINE' | 'ONLINE';
interface MaterialState { color: string; emissive: string; emissiveIntensity: number }
interface SwitchMaterial { name: string; offline: MaterialState; online: MaterialState }
export interface GreenhouseManifest extends MasterplanManifest {
    parts: (MasterplanPart & { estado_operacao: string })[];
    switchMaterials: SwitchMaterial[];
    growLights: { x: number; y: number; z: number; intensity: number; distance: number; color: string }[];
}
interface DynamicMaterial { material: MeshStandardMaterial; definition: SwitchMaterial }

/** Estado visual isolado: não altera progressão, save, malha de colisão ou cache do GLTFLoader. */
export class GreenhouseRuntime {
    private readonly architecture: MasterplanRuntime;
    private readonly ownedMaterials = new Set<Material>();
    private readonly dynamicMaterials: DynamicMaterial[] = [];
    private readonly onlineParts: string[] = [];
    private readonly lights: { node: PointLight; intensity: number }[] = [];
    private state: GreenhouseState = 'OFFLINE';
    private disposed = false;
    constructor(private readonly scene: Object3D, manifest: GreenhouseManifest) {
        const { nodes, parts } = validateMasterplan(scene, manifest);
        if (parts.get('TET_Estufa')?.papel !== 'roof') throw new Error('Telhado TET_Estufa ausente ou inválido');
        if (!parts.get('TET_Estufa_GrowLights')?.apoiado_em.includes('TET_Estufa')) throw new Error('Grow lights sem apoio no teto da estufa');
        if (manifest.growLights.length > 4) throw new Error('A estufa aceita no máximo quatro luzes locais');
        for (const light of manifest.growLights) {
            if (![light.x, light.y, light.z, light.intensity, light.distance].every(Number.isFinite)
                || light.intensity < 0 || light.distance <= 0 || !/^#[0-9a-f]{6}$/i.test(light.color)) throw new Error('Luz local inválida na estufa');
        }
        for (const part of manifest.parts) {
            if (!['both', 'online'].includes(part.estado_operacao)
                || nodes.get(part.id)!.userData.estado_operacao !== part.estado_operacao) throw new Error(`Estado operacional divergente: ${part.id}`);
            if (part.estado_operacao === 'online') {
                if (part.estado_inicial !== 'oculto') throw new Error(`Peça ONLINE precisa iniciar oculta: ${part.id}`);
                this.onlineParts.push(part.id);
            }
        }
        const definitions = new Map<string, SwitchMaterial>();
        for (const definition of manifest.switchMaterials) {
            if (!definition.name || definitions.has(definition.name)) throw new Error(`Material de estado duplicado: ${definition.name}`);
            for (const state of [definition.offline, definition.online]) {
                if (!/^#[0-9a-f]{6}$/i.test(state.color) || !/^#[0-9a-f]{6}$/i.test(state.emissive)
                    || !Number.isFinite(state.emissiveIntensity) || state.emissiveIntensity < 0) throw new Error(`Material de estado inválido: ${definition.name}`);
            }
            definitions.set(definition.name, definition);
        }
        // Valide tudo antes de criar recursos próprios. Materiais compartilhados nunca recebem os estados.
        const available = new Set<string>();
        scene.traverse(node => {
            if (!(node as Mesh).isMesh) return;
            const mesh = node as Mesh;
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                if (!definitions.has(material.name)) continue;
                if (!(material as MeshStandardMaterial).isMeshStandardMaterial) throw new Error(`Material da estufa não é PBR: ${material.name}`);
                available.add(material.name);
            }
        });
        for (const name of definitions.keys()) if (!available.has(name)) throw new Error(`Material de estado ausente: ${name}`);
        const copies = new Map<Material, Material>();
        scene.traverse(node => {
            if (!(node as Mesh).isMesh) return;
            const mesh = node as Mesh;
            const privateMaterial = (material: Material) => {
                if (!definitions.has(material.name)) return material;
                let own = copies.get(material);
                if (!own) { own = material.clone(); copies.set(material, own); this.ownedMaterials.add(own); }
                return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(privateMaterial) : privateMaterial(mesh.material);
        });
        try { this.architecture = new MasterplanRuntime(scene, manifest); }
        catch (error) { for (const material of this.ownedMaterials) material.dispose(); throw error; }
        // O runtime do teto pode clonar o material novamente: os estados usam as instâncias finais.
        const switched = new Set<Material>();
        scene.traverse(node => {
            if (!(node as Mesh).isMesh) return;
            const mesh = node as Mesh;
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                const definition = definitions.get(material.name);
                if (!definition || switched.has(material)) continue;
                switched.add(material);
                this.dynamicMaterials.push({ material: material as MeshStandardMaterial, definition });
            }
        });
        for (let i = 0; i < manifest.growLights.length; i++) {
            const light = manifest.growLights[i];
            const node = new PointLight(light.color, 0, light.distance, 2);
            node.name = `GreenhouseGrowLight_${i}`;
            node.position.set(light.x, light.y, light.z);
            node.castShadow = false;
            scene.add(node);
            this.lights.push({ node, intensity: light.intensity });
        }
        this.setState('OFFLINE');
    }
    setState(state: GreenhouseState) {
        if (state !== 'OFFLINE' && state !== 'ONLINE') throw new Error(`Estado da estufa inválido: ${state}`);
        this.state = state;
        this.scene.userData.operationalState = state;
        for (const id of this.onlineParts) this.architecture.setPartVisible(id, state === 'ONLINE');
        for (const { material, definition } of this.dynamicMaterials) {
            const values = state === 'ONLINE' ? definition.online : definition.offline;
            material.color.set(values.color);
            material.emissive.set(values.emissive);
            material.emissiveIntensity = values.emissiveIntensity;
        }
        this.updateLightIntensity();
    }
    private updateLightIntensity() {
        const opacity = this.architecture.getRoofOpacity('TET_Estufa');
        const strength = this.state === 'ONLINE' && opacity > .01 ? opacity : 0;
        for (const light of this.lights) light.node.intensity = light.intensity * strength;
    }
    update(player: { x: number; z: number }, delta: number) {
        this.architecture.update(player, delta);
        this.updateLightIntensity();
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.architecture.dispose();
        for (const material of this.ownedMaterials) material.dispose();
        for (const light of this.lights) { light.node.removeFromParent(); light.node.dispose(); }
    }
}

/** Defesa para GLBs de bases anteriores: retire o provisório antes de validar/montar o runtime. */
export function removeProvisionalGreenhouse(scene: Object3D, manifest: MasterplanManifest): MasterplanManifest {
    const removedIds = new Set(manifest.parts.filter(part => part.ambiente === 'orbit-garden').map(part => part.id));
    const removed: Object3D[] = [];
    scene.traverse(node => {
        if (removedIds.has(node.userData.id_estavel) || node.userData.ambiente === 'orbit-garden') removed.push(node);
    });
    for (const node of removed) node.removeFromParent();
    return {
        ...manifest,
        parts: manifest.parts.filter(part => !removedIds.has(part.id)),
        doors: manifest.doors.filter(door => door.owner !== 'orbit-garden'),
    };
}
