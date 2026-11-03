import { DoorSoundClock } from '../../audio/events';
import { BuildingAtlasSampling } from './buildingAtlasSampling';
import { EDEN } from '../../game/config';
import type { Material, Mesh, Object3D } from 'three';
import { CONTROL_ROOM } from '../../game/controlRoomLayout';

const ROOF_NODE_NAMES = ['TET_Control', 'PROP_Control_Telhado', 'TET_Control_Luminarias'] as const;

interface DoorPair {
    sound: DoorSoundClock;
    side: 'south' | 'east';
    x: number;
    z: number;
    axis: 'x' | 'z';
    slide: number;
    leafA: Object3D;
    leafB: Object3D;
    baseA: number;
    baseB: number;
}

export class ControlRoomRuntime {
    readonly status = { roofOpacity: 1, south: 0, east: 0, interaction: false };
    private roofNodes: Object3D[] = [];
    private roofMaterials: { own: Material; opacity: number; transparent: boolean; depthWrite: boolean }[] = [];
    private doors: DoorPair[] = [];
    private interactionNode: Object3D | null = null;
    private projectionNode: Object3D | null = null;
    private projectionBaseY = 0;
    private elapsed = 0;
    private disposed = false;

    private readonly ownedMaterials: Material[] = [];
    private readonly atlasSampling: BuildingAtlasSampling;

    constructor(scene: Object3D) {
        const copies = new Map<Material,Material>();
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const copy = (original: Material) => {
                    let own = copies.get(original);
                    if (!own) { own = original.clone(); copies.set(original,own); this.ownedMaterials.push(own); }
                    return own;
                };
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
            }
        });

        this.atlasSampling = new BuildingAtlasSampling(scene);
        for (const name of ROOF_NODE_NAMES) {
            const roofPart = scene.getObjectByName(name);
            if (!roofPart) continue;
            this.roofNodes.push(roofPart);
            roofPart.traverse(node => {
                const mesh = node as Mesh;
                if (!mesh.isMesh) return;
                const copy = (material: Material) => {
                    const own = material.clone();
                    this.roofMaterials.push({
                        own,
                        opacity: material.opacity,
                        transparent: material.transparent,
                        depthWrite: material.depthWrite
                    });
                    return own;
                };
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
            });
        }

        for (const spec of CONTROL_ROOM.doors) {
            const leafA = scene.getObjectByName(spec.leafA);
            const leafB = scene.getObjectByName(spec.leafB);
            if (!leafA || !leafB) continue;
            this.doors.push({
                sound: new DoorSoundClock(),
                side: spec.side,
                x: spec.x,
                z: spec.z,
                axis: spec.axis,
                slide: spec.slide,
                leafA,
                leafB,
                baseA: spec.axis === 'x' ? leafA.position.x : leafA.position.z,
                baseB: spec.axis === 'x' ? leafB.position.x : leafB.position.z
            });
        }

        this.interactionNode = scene.getObjectByName('PROP_Control_Interacao') ?? null;
        if (this.interactionNode) {
            this.interactionNode.visible = false;
        }

        this.projectionNode = scene.getObjectByName('PROP_Control_EDEN_Projecao') ?? null;
        if (this.projectionNode) {
            this.projectionBaseY = this.projectionNode.position.y;
        }
    }

    update(player: { x: number; z: number }, delta: number) {
        const dt = Math.min(0.05, Math.max(0, delta));
        const step = 1 - Math.exp(-12 * dt);
        this.elapsed += dt;

        const bounds = CONTROL_ROOM.roofArea;
        const inside =
            player.x > bounds.minX &&
            player.x < bounds.maxX &&
            player.z > bounds.minZ &&
            player.z < bounds.maxZ;

        this.status.roofOpacity += ((inside ? 0 : 1) - this.status.roofOpacity) * step;
        const roofVisible = this.status.roofOpacity > 0.01;
        for (let i = 0; i < this.roofNodes.length; i++) {
            this.roofNodes[i].visible = roofVisible;
        }
        for (let i = 0; i < this.roofMaterials.length; i++) {
            const material = this.roofMaterials[i];
            const opacity = this.status.roofOpacity;
            const transparent = material.transparent || opacity < 0.995;
            material.own.opacity = material.opacity * opacity;
            if (material.own.transparent !== transparent) {
                material.own.transparent = transparent;
                material.own.needsUpdate = true;
            }
            material.own.depthWrite = material.depthWrite && opacity > 0.995;
        }

        for (let i = 0; i < this.doors.length; i++) {
            const door = this.doors[i];
            const dx = player.x - door.x;
            const dz = player.z - door.z;
            const openTarget = dx * dx + dz * dz < 2.6 * 2.6 ? 1 : 0;
            door.sound.update(openTarget === 1, this.status[door.side], door.x, door.z);
            this.status[door.side] += (openTarget - this.status[door.side]) * step;
            const offset = this.status[door.side] * door.slide;
            if (door.axis === 'x') {
                door.leafA.position.x = door.baseA - offset;
                door.leafB.position.x = door.baseB + offset;
            } else {
                door.leafA.position.z = door.baseA + offset;
                door.leafB.position.z = door.baseB - offset;
            }
        }

        const edx = player.x - EDEN.position.x;
        const edz = player.z - EDEN.position.z;
        const nearEden = edx * edx + edz * edz <= EDEN.interactionRadius * EDEN.interactionRadius;
        this.status.interaction = nearEden;
        if (this.interactionNode) {
            this.interactionNode.visible = nearEden;
        }

        if (this.projectionNode) {
            this.projectionNode.position.y = this.projectionBaseY + Math.sin(this.elapsed * 2.2) * 0.025;
        }
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        for (let i = 0; i < this.roofMaterials.length; i++) {
            this.roofMaterials[i].own.dispose();
        }
        for (const material of this.ownedMaterials) material.dispose();
        this.atlasSampling.dispose();
    }
}
