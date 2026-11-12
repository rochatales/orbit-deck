import {
    BufferAttribute, BufferGeometry, DataTexture, Mesh, MeshStandardMaterial, SRGBColorSpace, type Object3D
} from 'three';
import { CONTROL_DESK_FRONT_Z } from '../../game/controlRoomLayout';
import { activationClock, useActivationSequence } from './activationSequence';
import { COLONY_POWER } from './colonyPowerConfig';

// Coordenadas do GLB v002, nos eixos locais da bancada. O quadro e o vidro
// foram exportados como caixas inclinadas 18°, com centros distintos.
const MONITOR_CENTERS = [.42, 1.2, 1.98];
const MONITOR_SETBACK = .25;
const FRAME = { y: 1.4, z: -2.32, width: .64, height: .39, depth: .11 };
const GLASS = { y: 1.41, z: -2.253, width: .54, height: .29, depth: .02 };

const SUPPORT = { y: 1.18, z: -2.34, width: .14, height: .14, depth: .09 };
const MONITOR_PARTS = [FRAME, GLASS, SUPPORT];

function prepareDesk(desk: Mesh) {
    const geometry = desk.geometry.clone();
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    const tilt = Math.PI / 10, tiltCos = Math.cos(tilt), tiltSin = Math.sin(tilt);
    // Bordas e chanfro do móvel v002. Os periféricos ficam entre as extremidades em X.
    const front = -2.30, bevel = .045;
    const extension = CONTROL_DESK_FRONT_Z - desk.position.z - front;
    const onEdge = (value: number, size: number) => Math.abs(Math.abs(value) - size / 2) < .0001;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        if ((x < .10 || x > 2.30) && y <= 1.1501 && z >= front - bevel - .0001) {
            position.setZ(i, z + extension);
            continue;
        }
        for (const box of MONITOR_PARTS) {
            if (!MONITOR_CENTERS.some(center => onEdge(x - center, box.width))) continue;
            const cos = box === SUPPORT ? 1 : tiltCos, sin = box === SUPPORT ? 0 : tiltSin;
            const dy = y - box.y, dz = z - box.z;
            const vertical = cos * dy + sin * dz, depth = -sin * dy + cos * dz;
            if (!onEdge(vertical, box.height) || !onEdge(depth, box.depth)) continue;
            position.setXYZ(i, x, box.y + vertical, box.z + depth - MONITOR_SETBACK);
            const ny = normal.getY(i), nz = normal.getZ(i);
            normal.setXYZ(i, normal.getX(i), cos * ny + sin * nz, -sin * ny + cos * nz);
            break;
        }
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function displayTexture() {
    const width = 64, height = 32, pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const header = y >= 25 && y <= 26 && x >= 4 && x < 59;
            const readout = x >= 5 && x < 29 && y >= 6 && y < 22 && y % 4 === 1
                && x < 17 + ((y * 7) % 12);
            const graph = x >= 35 && x < 58 && y >= 6 && y <= 7 + (x % 5) * 2 + Math.floor((x - 35) / 4);
            const lit = header || readout || graph;
            const line = y % 4 === 0 || x % 8 === 0;
            pixels[i] = lit ? 174 : line ? 22 : 10;
            pixels[i + 1] = lit ? 248 : line ? 91 : 48;
            pixels[i + 2] = lit ? 255 : line ? 108 : 71;
            pixels[i + 3] = 255;
        }
    }
    const texture = new DataTexture(pixels, width, height);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

/** Superfícies frontais medidas no GLB. O vidro usa o tile escuro do atlas v002. */
export function bindControlRoomScreens(scene: Object3D) {
    const desk = scene.getObjectByName('PROP_Control_Consoles_N') as Mesh | undefined;
    const original = desk?.geometry, positioned = desk?.isMesh ? prepareDesk(desk) : undefined;
    if (desk && positioned) desk.geometry = positioned;
    const vertices: number[] = [], uv: number[] = [], faces: number[] = [];
    const add = (x: number, y: number, z: number, width: number, height: number, yaw = 0) => {
        const i = vertices.length / 3, half = width / 2, dx = Math.cos(yaw) * half, dz = -Math.sin(yaw) * half;
        vertices.push(
            x - dx, y - height / 2, z - dz, x + dx, y - height / 2, z + dz,
            x + dx, y + height / 2, z + dz, x - dx, y + height / 2, z - dz
        );
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        faces.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };
    for (const x of MONITOR_CENTERS) add(x, 1.26, -12.741 - MONITOR_SETBACK, .53, .28);
    add(1.22, 1.92, -13.48, 2.59, .52);  // telão norte
    add(-3.1555, 1.27, -11.6, .65, .34, Math.PI / 2);  // terminal oeste
    for (let side = 0; side < 4; side++) {
        const yaw = side * Math.PI / 2, x = Math.sin(yaw), z = Math.cos(yaw);
        add(x * .767, .175, -10.5 + z * .767, .183, .043, yaw);
        add(x * .553, .67, -10.5 + z * .553, .222, .061, yaw);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    const texture = displayTexture();
    const material = new MeshStandardMaterial({
        color: '#080f14', roughness: .78, emissive: '#8cf7ff', emissiveMap: texture, emissiveIntensity: 0
    });
    const screens = new Mesh(geometry, material);
    screens.name = 'ControlRoomScreens';
    scene.add(screens);

    return {
        update(roomPower: number) {
            const starting = useActivationSequence.getState().kind === 'edenActive';
            const boot = starting ? Math.max(0, (activationClock.elapsed - COLONY_POWER['control-room'].delay - .65) / .7) : 1;
            material.emissiveIntensity = 1.55 * Math.min(roomPower, boot);
        },
        dispose() {
            screens.removeFromParent();
            geometry.dispose(); texture.dispose(); material.dispose();
            if (desk && positioned && original) {
                desk.geometry = original;
                positioned.dispose();
            }
        }
    };
}
