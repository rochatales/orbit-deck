// Referência de medição: 79cdc72. Não integra o runtime.
import { Box3, Ray, Vector3 } from 'three';
/** Visibilidade local por caixas simples. Todos os buffers são criados na montagem. */
export class ColonyVisibility {
    constructor(scene, parts) {
        this.ray = new Ray();
        this.origin = new Vector3();
        this.direction = new Vector3();
        this.hit = new Vector3();
        // O GLTFLoader normaliza nomes como Rocha.001; extras preservam a identidade da fonte.
        const nodes = new Map();
        scene.traverse(node => nodes.set(node.userData.colony_name ?? node.name, node));
        this.entries = parts.map(part => {
            const node = nodes.get(part.name);
            if (!node)
                throw new Error(`Peça ausente na colônia: ${part.name}`);
            const b = part.bounds;
            const cuttable = (part.name.startsWith('ARQ_') || part.name.startsWith('TET_'))
                && !part.name.includes('Piso') && !part.name.includes('Patio')
                && !part.name.startsWith('ARQ_Deck') && !part.name.includes('Folhas');
            return { part, node, cuttable, hidden: false, visible: true, clearFor: 0,
                box: new Box3(new Vector3(b.minX, b.minY, b.minZ), new Vector3(b.maxX, b.maxY, b.maxZ)),
                any: [], all: [] };
        });
        this.byName = new Map(this.entries.map((entry, index) => [entry.part.name, index]));
        for (const entry of this.entries) {
            const resolve = (name) => {
                const index = this.byName.get(name);
                if (index === undefined)
                    throw new Error(`Suporte ausente na colônia: ${name}`);
                return index;
            };
            entry.any = entry.part.apoiado_em.map(resolve);
            entry.all = entry.part.apoiado_em_todos.map(resolve);
        }
    }
    update(player, camera, delta) {
        const doorOpen = Math.hypot(player.x - 9.5, player.z + 10) < 2.35;
        for (const entry of this.entries) {
            let blocked = false;
            if (entry.cuttable) {
                // Três alturas do corpo: libera paredes e coberturas que encobrem o jogador.
                for (let sample = 0; sample < 3; sample++) {
                    this.origin.set(player.x, 0.3 + sample * 0.5, player.z);
                    this.direction.subVectors(camera, this.origin);
                    const distance = this.direction.length();
                    this.direction.normalize();
                    this.ray.set(this.origin, this.direction);
                    if (this.ray.intersectBox(entry.box, this.hit) && this.hit.distanceTo(this.origin) < distance) {
                        blocked = true;
                        break;
                    }
                }
                entry.clearFor = blocked ? 0 : entry.clearFor + delta;
                if (blocked)
                    entry.hidden = true;
                else if (entry.clearFor >= 0.5)
                    entry.hidden = false;
            }
            entry.visible = !entry.hidden;
            if (entry.part.name === 'ARQ_Laboratorio_Porta_Folhas')
                entry.visible = !doorOpen;
            if (entry.part.name === 'ARQ_Laboratorio_Porta_Folhas_Aberta')
                entry.visible = doorOpen;
        }
        // Suportes resolvidos antes de aplicar: sem peças suspensas e sem depender da ordem do GLB.
        for (let pass = 0; pass < this.entries.length; pass++) {
            let changed = false;
            for (const entry of this.entries) {
                if (!entry.visible)
                    continue;
                let missingAny = false, missingAll = entry.all.length > 0;
                for (const index of entry.any)
                    if (!this.entries[index].visible)
                        missingAny = true;
                for (const index of entry.all)
                    if (this.entries[index].visible)
                        missingAll = false;
                if (missingAny || missingAll) {
                    entry.visible = false;
                    changed = true;
                }
            }
            if (!changed)
                break;
        }
        for (const entry of this.entries)
            entry.node.visible = entry.visible;
    }
}
