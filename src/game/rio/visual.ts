import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { RectBounds } from '../../utils/math';
import { ARES_COLLIDERS } from '../aresCollisions';
import { BuildingFade } from '../shanghai/buildingFade';
import { box } from '../worldUtils';
import { RIO_ARES_POSITION, RIO_LAYOUT } from './layout';

const ASPHALT = '#42464c';
const SIDEWALK = '#aaa79a';
const BAND_COLORS: Record<string, string> = {
    lote_fundo: '#8d8271', lote_frente: '#8d8271',
    calcada_fundo: SIDEWALK, calcada_meio: SIDEWALK, calcada_orla: SIDEWALK,
    rua_fundo: ASPHALT, pista_cidade: ASPHALT, canteiro: ASPHALT, pista_praia: ASPHALT,
    calcadao: '#dedbd1', areia: '#d5b783', mar: '#347b99',
};

function center(rect: RectBounds) {
    return { x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 };
}

function floor(group: Group, rect: RectBounds, y: number, color: string, name: string) {
    const { x, z } = center(rect);
    const mesh = new Mesh(new PlaneGeometry(rect.maxX - rect.minX, rect.maxZ - rect.minZ),
        new MeshStandardMaterial({ color, roughness: 1 }));
    mesh.name = name;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
}

function landingMark(group: Group, rect: RectBounds) {
    const { x, z } = center(rect), w = rect.maxX - rect.minX, d = rect.maxZ - rect.minZ;
    const color = '#f4dd9c', line = .18, y = .032;
    for (const side of [rect.minX, rect.maxX]) {
        floor(group, { minX: side - line, maxX: side + line, minZ: z - d / 2, maxZ: z + d / 2 }, y, color, 'Reserva_Pouso');
    }
    for (const end of [rect.minZ, rect.maxZ]) {
        floor(group, { minX: x - w / 2 + line, maxX: x + w / 2 - line, minZ: end - line, maxZ: end + line }, y, color, 'Reserva_Pouso');
    }
}

function aresBlockout(group: Group) {
    const ship = new Group();
    ship.name = 'RioARES';
    ship.position.set(RIO_ARES_POSITION.x, RIO_ARES_POSITION.y, RIO_ARES_POSITION.z);
    for (const rect of ARES_COLLIDERS) {
        const { x, z } = center(rect), w = rect.maxX - rect.minX, d = rect.maxZ - rect.minZ;
        const hull = rect.id === 'casco', pod = rect.id.startsWith('pod');
        const h = hull ? 1.85 : pod ? 1.05 : .36;
        const y = hull ? 1.55 : pod ? 1.25 : h / 2;
        box(ship, x, y, z, w, h, d, hull ? '#deded2' : '#627887').name = rect.id;
    }
    box(ship, -2.55, 2.68, 0, 1.7, .43, 1.92, '#294d67');
    for (const z of [-2.04, 2.04]) box(ship, 4.12, 1.25, z, .24, .52, 1.05, '#69b8c6');
    group.add(ship);
}

function border(group: Group) {
    for (const limit of RIO_LAYOUT.limits) {
        if (limit.kind === 'mar') continue;
        const west = limit.kind === 'morro';
        const start = west ? limit.minZ : limit.minX;
        const end = west ? limit.maxZ : limit.maxX;
        const count = Math.ceil((end - start) / 8), width = (end - start) / count;
        for (let i = 0; i < count; i++) {
            const along = start + (i + .5) * width;
            const rock = west || (limit.kind === 'morro_escombros' && (along < -10 || along > 12));
            const x = west ? center(limit).x : along;
            const z = west ? along : rock ? center(limit).z : limit.kind === 'escombros' ? limit.minZ + 4 : limit.maxZ - 4;
            const h = rock ? 12 + (i * 11 % 13) : 2 + (i * 7 % 9) * .38;
            if (rock) {
                const mesh = new Mesh(new CylinderGeometry(width * .45, width * .86, h, 5),
                    new MeshStandardMaterial({ color: i % 2 ? '#596556' : '#687363', roughness: 1 }));
                mesh.position.set(x, h / 2, z);
                mesh.rotation.y = i * .43;
                mesh.castShadow = mesh.receiveShadow = true;
                group.add(mesh);
            } else {
                const rubble = box(group, x, h / 2 - .24, z, width * .87, h, 4 + (i % 3), i % 2 ? '#807772' : '#a08f81');
                rubble.rotation.set(i % 2 ? .17 : -.16, i % 2 ? .25 : -.31, -.18);
                box(group, x + 1.2, .48, z + 2, width * .51, 1.25, 3.7, '#645f5c').rotation.y = .32;
            }
        }
    }
}

/** Píer quebrado e destroços da planta v1, em volumes simples. A colisão vem só dos dados. */
function wreckage(group: Group) {
    for (const part of RIO_LAYOUT.parts) {
        if (part.kind !== 'pier') continue;
        const { x, z } = center(part), w = part.maxX - part.minX, d = part.maxZ - part.minZ;
        if ('walkable' in part && part.walkable) {
            box(group, x, .03, z, w, .06, d, '#8a6a45').name = part.id;
        } else {
            // Trecho desabado: pedaços soltos e inclinados, fora da área caminhável.
            const fallen = box(group, x - .6, -.12, z + .8, w * .5, .08, d * .45, '#5d4a35');
            fallen.rotation.set(.22, .3, -.28); fallen.name = part.id;
            box(group, x + 1.2, -.2, z - 1.4, w * .3, .08, d * .3, '#5d4a35').rotation.set(-.3, -.5, .2);
        }
    }
    for (const prop of RIO_LAYOUT.props) {
        if (prop.kind === 'entulho') {
            const heap = box(group, prop.x, prop.height * .35, prop.z, prop.w * .9, prop.height * .7, (prop.d ?? prop.w) * .9, '#857c74');
            heap.rotation.y = .18; heap.name = prop.id;
            box(group, prop.x + prop.w * .15, prop.height * .78, prop.z - .3, prop.w * .5, prop.height * .4, (prop.d ?? prop.w) * .4, '#6e6761').rotation.set(.2, -.4, .15);
            continue;
        }
        const wreck = new Group();
        wreck.name = prop.id;
        wreck.position.set(prop.x, 0, prop.z);
        wreck.rotation.y = (prop.axis === 'x' ? Math.PI / 2 : 0) + (prop.yaw ?? 0) * Math.PI / 180;
        const length = prop.length ?? prop.w;
        box(wreck, 0, .65, 0, prop.w, 1.1, length, '#8a4a2e');
        box(wreck, 0, .65 + prop.height * .4, 0, prop.w * .9, prop.height * .5, length * .72, '#74402a');
        group.add(wreck);
    }
}

export function buildRioVisual(group: Group) {
    const { bounds, bands, buildings, landingReservation, limits, obstacles, parts } = RIO_LAYOUT;
    for (const limit of limits) {
        if (limit.kind === 'mar') continue;
        const rock = limit.kind !== 'escombros';
        floor(group, limit, 0, rock ? '#687363' : '#968373', limit.id);
    }
    for (const band of bands) {
        const rect = { ...bounds, ...band };
        // O plano d'água continua fora do mapa; a faixa caminhável termina na linha da planta.
        floor(group, band.id === 'mar' ? { ...rect, maxX: rect.maxX + 165, minZ: rect.minZ - 165, maxZ: rect.maxZ + 165 } : rect, 0, BAND_COLORS[band.id], band.id);
    }
    for (const part of parts) {
        if (part.id.startsWith('travessa_')) {
            floor(group, part, .006, SIDEWALK, part.id);
            floor(group, { ...part, minZ: part.minZ + 2, maxZ: part.maxZ - 2 }, .012, ASPHALT, part.id);
        } else if (part.kind === 'praca') {
            floor(group, part, .012, '#809274', part.id);
        } else if (part.kind === 'deck') {
            floor(group, part, .024, '#7d7e79', part.id);
        } else if (part.kind === 'quiosque') {
            const { x, z } = center(part);
            box(group, x, -.025, z, part.maxX - part.minX, .15, part.maxZ - part.minZ, '#a58261').name = part.id;
            const core = obstacles.find(obstacle => obstacle.source === part.id)!;
            const radius = (core.maxX - core.minX) / 2;
            const mesh = new Mesh(new CylinderGeometry(radius, radius, core.maxY, 20),
                new MeshStandardMaterial({ color: '#637f80', roughness: .9 }));
            mesh.position.set(x, core.maxY / 2, z);
            mesh.castShadow = mesh.receiveShadow = true;
            group.add(mesh);
        }
    }
    wreckage(group);
    const meshes = new Map<string, Mesh<BoxGeometry, MeshStandardMaterial>>();
    for (const b of buildings) {
        const mesh = box(group, b.x, b.height / 2, b.z, b.w, b.height, b.d, b.row === 'orla' ? '#d7c8b2' : '#b0a497');
        mesh.name = b.id;
        meshes.set(b.id, mesh);
    }
    group.userData.buildingFade = new BuildingFade(group, buildings, meshes);
    border(group);
    landingMark(group, landingReservation);
    aresBlockout(group);
}
