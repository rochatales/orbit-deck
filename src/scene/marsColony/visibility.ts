import { alignColonyDoors } from './doorAlignment';
import { colonyRoofOwners } from './roofSupports';
import { Box3, Ray, Vector3, type Material, type Mesh, type Object3D } from 'three';

export interface ColonyPart {
    name: string;
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    apoiado_em: string[];
    apoiado_em_todos: string[];
}

/*
 * Regras do corte suave da colônia (S6.12). Leia antes de mudar este arquivo.
 *
 * Causa do "contorno verde das portas piscando" (17/10/2026): batente
 * (`ARQ_*_Porta_*`), verga (`*_Verga`), folhas e as paredes da mesma fachada
 * eram entradas independentes. Cada uma fazia o próprio teste de raio e o
 * próprio fade; ao andar perto de uma porta, o batente esmaecia e voltava fora
 * de sincronia com as paredes (medição: 23.919 quadros com diferença de
 * opacidade > 0,3 em 17 portas). Além disso, o batente esmaecido mantinha
 * `depthWrite` ligado; como a ordem das transparências muda com a câmera que
 * segue o jogador, ele tampava e destampava o que estava atrás (7.582 quadros).
 *
 * Regras (cobertas por tests/colony-v006.test.mjs):
 * 1. Quem decide o corte é um GRUPO, nunca uma peça presa a outra. Um portal
 *    (batente) forma um único grupo com as paredes em que se apoia; peças com
 *    um só grupo de apoio (verga, folhas do GLB, folhas animadas, telas e
 *    sinais na parede) entram nesse grupo. O grupo testa o raio contra a malha
 *    dos seus membros que decidem e tem UMA opacidade.
 * 2. Peça apoiada em grupos diferentes (cantos entre duas fachadas) não testa
 *    raio: segue a menor opacidade dos apoios.
 * 3. Cobertura (`TET_*`) decide pelo teto; o que se apoia nele usa o mesmo
 *    fator no mesmo passo (roofSupports.ts).
 * 4. Material com opacidade < 0,995 nunca escreve profundidade, sem exceção.
 *    Folhas animadas (translúcidas por desenho) nunca escrevem.
 * 5. Sem `visible` binário e sem alocação por quadro: buffers e materiais
 *    privados são preparados na montagem.
 */

interface Member { node: Object3D; meshes: Mesh[]; triangles: Float32Array; dynamic: boolean }
interface FadeMaterial { material: Material; opacity: number; depthWrite: boolean; dynamic: boolean }
export interface FadeGroup {
    name: string; parts: string[]; members: Member[]; materials: FadeMaterial[];
    box: Box3; dynamic: boolean; hidden: boolean; clearFor: number; opacity: number;
}
export interface FadeFollower { name: string; supports: FadeGroup[]; materials: FadeMaterial[]; opacity: number }

const FADED = 0.08;
const RETURN_AFTER = 1.2;

const isCuttable = (name: string) => ((name.startsWith('ARQ_') || name.startsWith('TET_'))
    && !name.includes('Piso') && !name.includes('Patio')
    && !name.startsWith('ARQ_Deck') && !name.includes('Folhas'))
    || name === 'PLAT_B3_Foguete' || name === 'PLAT_B3_Base_Lancamento';
const isPortal = (name: string) => /_Port[ao]/.test(name) && !name.includes('Verga') && !name.includes('Folhas');

/** Triângulos em coordenadas mundiais e materiais privados, preparados na montagem. */
export class ColonyVisibility {
    private readonly ray = new Ray();
    private readonly origin = new Vector3();
    private readonly direction = new Vector3();
    private readonly hit = new Vector3();
    private readonly a = new Vector3();
    private readonly b = new Vector3();
    private readonly c = new Vector3();
    readonly groups: FadeGroup[] = [];
    readonly followers: FadeFollower[] = [];
    /** Grupo de fade de cada peça (inclui seguidores de um só grupo). */
    readonly groupOfPart = new Map<string, FadeGroup>();

    constructor(scene: Object3D, parts: ColonyPart[], doors?: Object3D) {
        const animatedDoors = doors ? alignColonyDoors(scene, parts, doors) : [];
        scene.updateMatrixWorld(true);
        const nodes = new Map<string, Object3D>();
        scene.traverse(node => nodes.set(node.userData.colony_name ?? node.name, node));
        const present = (name: string) => { const node = nodes.get(name); return !!node && node.visible; };
        const supportsOf = (part: ColonyPart) => [...part.apoiado_em, ...part.apoiado_em_todos].filter(present);

        // Regra 3: o teto decide; o que se apoia nele segue no mesmo passo.
        const roofOwners = colonyRoofOwners(parts);
        const roofChildren = new Map<string, string[]>();
        for (const [name, owner] of roofOwners) if (name !== owner && present(name))
            roofChildren.set(owner, [...(roofChildren.get(owner) ?? []), name]);
        const roofChild = (name: string) => roofOwners.has(name) && roofOwners.get(name) !== name;

        // Regra 1: união-busca de grupos. Portal + paredes de apoio formam um grupo.
        const parent = new Map<string, string>();
        const find = (name: string): string => {
            let root = name;
            while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
            parent.set(name, root);
            return root;
        };
        const union = (x: string, y: string) => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); };
        const cuttable = parts.filter(part => present(part.name) && isCuttable(part.name) && !roofChild(part.name));
        const cuttableNames = new Set(cuttable.map(part => part.name));
        const wallSide = (name: string) => cuttableNames.has(name) && !name.startsWith('TET_');
        for (const part of cuttable) {
            find(part.name);
            if (isPortal(part.name) && !part.name.startsWith('TET_'))
                for (const support of supportsOf(part)) if (wallSide(support)) union(part.name, support);
        }
        // Peças presas a paredes/portais (cortáveis ou não), resolvidas até um ponto fixo.
        const dependents = parts.filter(part => present(part.name) && !roofChild(part.name) && !part.name.startsWith('TET_')
            && !(cuttableNames.has(part.name) && isPortal(part.name)) && supportsOf(part).length > 0);
        const rootsOf = new Map<string, Set<string>>();
        for (let pass = 0; pass <= dependents.length; pass++) {
            let changed = false;
            for (const part of dependents) {
                const roots = new Set<string>();
                let resolved = true;
                for (const support of supportsOf(part)) {
                    if (rootsOf.has(support)) rootsOf.get(support)!.forEach(root => roots.add(find(root)));
                    else if (wallSide(support) && !dependents.some(other => other.name === support)) roots.add(find(support));
                    else { resolved = false; break; }
                }
                if (!resolved || roots.size === 0) continue;
                const before = rootsOf.get(part.name);
                if (before && before.size === roots.size && [...roots].every(root => before.has(root))) continue;
                rootsOf.set(part.name, roots);
                changed = true;
            }
            if (!changed) break;
        }
        // Um só grupo de apoio: a peça entra nele (e, se for cortável, também decide).
        const followerOnly = new Map<string, string[]>();
        const joiners = new Map<string, string>();
        for (const [name, roots] of rootsOf) {
            const list = [...new Set([...roots].map(find))];
            if (list.length === 1) {
                if (cuttableNames.has(name)) union(name, list[0]);
                else joiners.set(name, list[0]);
            } else followerOnly.set(name, list);
        }

        const groupFor = (root: string) => {
            const key = find(root);
            let group = this.groups.find(g => g.name === key);
            if (!group) {
                group = { name: key, parts: [], members: [], materials: [], box: new Box3(), dynamic: false, hidden: false, clearFor: 0, opacity: 1 };
                this.groups.push(group);
            }
            return group;
        };
        const prepare = (node: Object3D, target: FadeMaterial[], decides: boolean, dynamic: boolean, unitOpacity: boolean): Member => {
            const meshes: Mesh[] = [];
            const triangles: number[] = [];
            node.traverse(object => {
                const mesh = object as Mesh;
                if (!mesh.isMesh) return;
                meshes.push(mesh);
                // Sem sombra binária mudando com o fade. Recursos do cache GLTF não são alterados.
                mesh.castShadow = false;
                const clone = (material: Material) => {
                    const copy = material.clone();
                    // Mesma opacidade absoluta em toda a cobertura (vidros dos equipamentos incluídos).
                    if (unitOpacity) copy.opacity = 1;
                    copy.transparent = true;
                    if (dynamic) copy.depthWrite = false;
                    target.push({ material: copy, opacity: copy.opacity, depthWrite: dynamic ? false : material.depthWrite, dynamic });
                    return copy;
                };
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
                if (!decides) return;
                const position = mesh.geometry.attributes.position;
                const index = mesh.geometry.index;
                const count = index ? index.count : position.count;
                for (let i = 0; i < count; i++) {
                    this.a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
                    triangles.push(this.a.x, this.a.y, this.a.z);
                }
            });
            return { node, meshes, triangles: new Float32Array(triangles), dynamic };
        };
        // Decisores: cortáveis que não viraram seguidores de grupos diferentes.
        for (const part of cuttable) {
            if (followerOnly.has(part.name)) continue;
            const group = groupFor(part.name);
            group.parts.push(part.name);
            group.members.push(prepare(nodes.get(part.name)!, group.materials, true, false, false));
            this.groupOfPart.set(part.name, group);
            for (const child of roofChildren.get(part.name) ?? []) {
                prepare(nodes.get(child)!, group.materials, false, false, true);
                this.groupOfPart.set(child, group);
            }
        }
        for (const door of animatedDoors) {
            const portal = door.userData.colonyPortal as string;
            const group = groupFor(portal);
            group.members.push(prepare(door, group.materials, true, true, false));
            group.dynamic = true;
        }
        for (const [name, root] of joiners) {
            // Não cortável com um só grupo de apoio (folhas do GLB, telas, sinais): segue o grupo sem decidir.
            const group = groupFor(root);
            group.parts.push(name);
            prepare(nodes.get(name)!, group.materials, false, false, false);
            this.groupOfPart.set(name, group);
        }
        for (const [name, roots] of followerOnly) {
            const supports = [...new Set(roots.map(root => groupFor(root)))];
            const follower: FadeFollower = { name, supports, materials: [], opacity: 1 };
            prepare(nodes.get(name)!, follower.materials, false, false, false);
            this.followers.push(follower);
        }
        for (const group of this.groups) this.updateBox(group);
    }

    /** Compatibilidade com scripts de medição anteriores: os grupos são as entradas que decidem. */
    get entries() { return this.groups; }

    private updateBox(group: FadeGroup) {
        group.box.makeEmpty();
        for (const member of group.members) {
            const t = member.triangles;
            for (let i = 0; i < t.length; i += 3) group.box.expandByPoint(this.a.set(t[i], t[i + 1], t[i + 2]));
        }
    }

    private refreshDynamic(group: FadeGroup) {
        // Animação já aplicada neste quadro: atualiza os buffers existentes, sem alocar.
        for (const member of group.members) {
            if (!member.dynamic) continue;
            member.node.updateWorldMatrix(true, true);
            let offset = 0;
            for (const mesh of member.meshes) {
                const position = mesh.geometry.attributes.position, index = mesh.geometry.index;
                for (let i = 0; i < (index ? index.count : position.count); i++) {
                    this.a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
                    member.triangles[offset++] = this.a.x;
                    member.triangles[offset++] = this.a.y;
                    member.triangles[offset++] = this.a.z;
                }
            }
        }
        this.updateBox(group);
    }

    private blocked(group: FadeGroup, player: { x: number; z: number }, camera: Vector3) {
        // AABB só rejeita candidatos: vãos e caixas vazias nunca acionam o corte.
        for (let sample = 0; sample < 3; sample++) {
            this.origin.set(player.x, 0.3 + sample * 0.5, player.z);
            this.direction.subVectors(camera, this.origin);
            const distance = this.direction.length();
            this.direction.normalize();
            this.ray.set(this.origin, this.direction);
            if (!this.ray.intersectBox(group.box, this.hit)) continue;
            for (const member of group.members) {
                const t = member.triangles;
                for (let i = 0; i < t.length; i += 9) {
                    this.a.fromArray(t, i); this.b.fromArray(t, i + 3); this.c.fromArray(t, i + 6);
                    if (this.ray.intersectTriangle(this.a, this.b, this.c, false, this.hit)
                        && this.hit.distanceToSquared(this.origin) < distance * distance) return true;
                }
            }
        }
        return false;
    }

    private apply(materials: FadeMaterial[], opacity: number) {
        for (const item of materials) {
            item.material.opacity = (item.dynamic ? item.material.userData.doorOpacity ?? item.opacity : item.opacity) * opacity;
            // Regra 4: nada translúcido escreve profundidade.
            item.material.depthWrite = !item.dynamic && item.depthWrite && opacity > 0.995;
        }
    }

    update(player: { x: number; z: number }, camera: Vector3, delta: number) {
        const step = 1 - Math.exp(-8 * Math.min(delta, 0.05));
        for (const group of this.groups) {
            if (group.dynamic) this.refreshDynamic(group);
            const blocked = this.blocked(group, player, camera);
            group.clearFor = blocked ? 0 : group.clearFor + delta;
            if (blocked) group.hidden = true;
            else if (group.clearFor >= RETURN_AFTER) group.hidden = false;
            group.opacity += ((group.hidden ? FADED : 1) - group.opacity) * step;
            this.apply(group.materials, group.opacity);
        }
        for (const follower of this.followers) {
            let opacity = 1;
            for (const support of follower.supports) opacity = Math.min(opacity, support.opacity);
            follower.opacity = opacity;
            this.apply(follower.materials, opacity);
        }
    }

    dispose() {
        for (const owner of [...this.groups, ...this.followers]) for (const item of owner.materials) item.material.dispose();
    }
}
