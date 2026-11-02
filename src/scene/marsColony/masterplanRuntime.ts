import { type Mesh, Quaternion, Vector3, type Material, type Object3D } from 'three';
import type { RectBounds } from '../../utils/math';

export interface MasterplanPart {
    id: string;
    papel: string;
    ambiente: string;
    estado_inicial: string;
    apoiado_em: string[];
    apoiado_em_todos: string[];
}
export interface MasterplanDoor { id: string; x: number; z: number; axis: string; width: number; owner: string }
export interface MasterplanManifest {
    parts: MasterplanPart[];
    walkableAreas: (RectBounds & { id: string })[];
    doors: MasterplanDoor[];
}
interface VisualPart { node: Object3D; materials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[]; roofs: string[]; initialVisible: boolean }

/** Validação estrita na montagem. Nenhum nome sanitizado pelo GLTFLoader é usado como chave. */
export function validateMasterplan(scene: Object3D, manifest: MasterplanManifest) {
    const nodes = new Map<string, Object3D>();
    scene.traverse(node => {
        const id = node.userData.id_estavel;
        if (id === undefined) return;
        if (typeof id !== 'string' || !id || nodes.has(id)) throw new Error(`ID estável inválido/duplicado: ${id}`);
        nodes.set(id, node);
    });
    const parts = new Map<string, MasterplanPart>();
    for (const part of manifest.parts) {
        if (parts.has(part.id)) throw new Error(`ID duplicado no manifesto: ${part.id}`);
        if (!nodes.has(part.id)) throw new Error(`Peça ausente no GLB: ${part.id}`);
        if (!['visivel', 'oculto'].includes(part.estado_inicial)) throw new Error(`Estado inicial inválido: ${part.id}`);
        const data = nodes.get(part.id)!.userData;
        for (const key of ['apoiado_em', 'apoiado_em_todos'] as const) {
            const ids = typeof data[key] === 'string' ? data[key].split(',').filter(Boolean) : data[key];
            if (!Array.isArray(ids) || ids.join(',') !== part[key].join(',')) throw new Error(`Metadado divergente: ${part.id}/${key}`);
        }
        if (data.estado_inicial !== part.estado_inicial) throw new Error(`Estado divergente: ${part.id}`);
        parts.set(part.id, part);
    }
    for (const id of nodes.keys()) if (!parts.has(id)) throw new Error(`ID sem manifesto: ${id}`);
    const active = new Set<string>(), done = new Set<string>();
    const visit = (id: string) => {
        if (active.has(id)) throw new Error(`Ciclo de apoio: ${id}`);
        if (done.has(id)) return;
        const part = parts.get(id);
        if (!part) throw new Error(`Apoio ausente: ${id}`);
        active.add(id);
        for (const support of [...part.apoiado_em, ...part.apoiado_em_todos]) visit(support);
        active.delete(id); done.add(id);
    };
    for (const id of parts.keys()) visit(id);
    return { nodes, parts };
}

/** Corte somente da cobertura do ambiente ocupado. Paredes, portais e vidro não desaparecem. */
export class MasterplanRuntime {
    private readonly spin = new Quaternion();
    private readonly up = new Vector3(0, 1, 0);
    private readonly dishes: Object3D[] = [];
    private readonly visuals: VisualPart[] = [];
    private readonly visualsById = new Map<string, VisualPart>();
    private readonly roofs = new Map<string, { area: RectBounds; opacity: number; inside: boolean }>();
    private readonly doors: { node: Object3D; x: number; z: number; dx: number; dz: number; originX: number; originZ: number; amount: number }[] = [];
    constructor(scene: Object3D, manifest: MasterplanManifest) {
        const { nodes, parts } = validateMasterplan(scene, manifest);
        const roofAncestors = (id: string): string[] => {
            const part = parts.get(id)!;
            if (part.papel === 'roof') return [id];
            return [...new Set([...part.apoiado_em, ...part.apoiado_em_todos].flatMap(roofAncestors))];
        };
        for (const part of manifest.parts) {
            const node = nodes.get(part.id)!;
            if (part.papel === 'dish') this.dishes.push(node);
            if (part.papel === 'roof') {
                const area = manifest.walkableAreas.find(area => area.id === part.ambiente);
                if (!area) throw new Error(`Ambiente do telhado ausente: ${part.id}`);
                this.roofs.set(part.id, { area, opacity: 1, inside: false });
            }
            const visual: VisualPart = { node, materials: [], roofs: roofAncestors(part.id), initialVisible: part.estado_inicial !== 'oculto' };
            node.visible = visual.initialVisible;
            node.traverse(object => {
                const mesh = object as Mesh;
                if (!mesh.isMesh) return;
                object.castShadow = true; object.receiveShadow = true;
                // Materiais privados só para quem muda de opacidade; o cache do GLB fica intacto.
                if (!visual.roofs.length) return;
                const clone = (material: Material) => {
                    const own = material.clone();
                    visual.materials.push({ own, opacity: own.opacity, transparent: own.transparent, depthWrite: own.depthWrite });
                    return own;
                };
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
            });
            this.visuals.push(visual);
            this.visualsById.set(part.id, visual);
            if (part.papel === 'door') {
                const door = manifest.doors.find(door => part.id === `${door.id}_L` || part.id === `${door.id}_R`);
                if (!door) throw new Error(`Porta sem âncora: ${part.id}`);
                const dx = node.userData.slide_x, dz = node.userData.slide_z;
                if (!Number.isFinite(dx) || !Number.isFinite(dz)) throw new Error(`Trilho inválido: ${part.id}`);
                this.doors.push({ node, x: door.x, z: door.z, dx, dz, originX: node.position.x, originZ: node.position.z, amount: 0 });
            }
        }
    }
    /** Estado de operação compõe com o corte do teto, sem reaparecer peças sustentadas. */
    setPartVisible(id: string, visible: boolean) {
        const visual = this.visualsById.get(id);
        if (!visual) throw new Error(`Peça de estado ausente: ${id}`);
        visual.initialVisible = visible;
        let opacity = 1;
        for (const roofId of visual.roofs) opacity = Math.min(opacity, this.roofs.get(roofId)!.opacity);
        visual.node.visible = visible && opacity > .01;
    }
    getRoofOpacity(id: string) {
        const roof = this.roofs.get(id);
        if (!roof) throw new Error(`Telhado ausente: ${id}`);
        return roof.opacity;
    }
    update(player: { x: number; z: number }, delta: number) {
        this.spin.setFromAxisAngle(this.up, Math.min(delta, .05) * .12);
        for (const dish of this.dishes) dish.quaternion.premultiply(this.spin);
        const step = 1 - Math.exp(-12 * Math.min(delta, .05));
        for (const roof of this.roofs.values()) {
            const b = roof.area;
            // Faixa interna de 5 cm evita alternância na soleira; não corta ao caminhar fora.
            const margin = roof.inside ? 0 : .05;
            roof.inside = player.x > b.minX + margin && player.x < b.maxX - margin
                && player.z > b.minZ + margin && player.z < b.maxZ - margin;
            roof.opacity += ((roof.inside ? 0 : 1) - roof.opacity) * step;
        }
        for (const visual of this.visuals) {
            if (!visual.roofs.length) continue;
            let opacity = 1;
            for (const id of visual.roofs) opacity = Math.min(opacity, this.roofs.get(id)!.opacity);
            visual.node.visible = visual.initialVisible && opacity > .01;
            for (const material of visual.materials) {
                material.own.opacity = material.opacity * opacity;
                const transparent = material.transparent || opacity < .995;
                if (material.own.transparent !== transparent) {
                    material.own.transparent = transparent;
                    material.own.needsUpdate = true;
                }
                material.own.depthWrite = material.depthWrite && opacity > .995;
            }
        }
        for (const door of this.doors) {
            const dx = player.x - door.x, dz = player.z - door.z;
            door.amount += ((dx * dx + dz * dz < 2.35 * 2.35 ? 1 : 0) - door.amount) * step;
            door.node.position.x = door.originX + door.dx * door.amount;
            door.node.position.z = door.originZ + door.dz * door.amount;
        }
    }
    dispose() {
        for (const visual of this.visuals) for (const material of visual.materials) material.own.dispose();
    }
}
