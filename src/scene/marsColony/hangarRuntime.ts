import { AnimationClip, AnimationMixer, BufferGeometry, Float32BufferAttribute, LoopOnce, LoopRepeat, Mesh, MeshStandardMaterial, type AnimationAction, type Material, type Object3D, type SkinnedMesh } from 'three';
import { HANGAR } from '../../game/hangarLayout';
import { MasterplanRuntime, type MasterplanManifest, type MasterplanPart } from './masterplanRuntime';

const CHANNELS: Record<string, readonly string[]> = {
    Idle: ['Crane_Hook_L.quaternion', 'Crane_Hook_R.quaternion', 'Cable_L.quaternion', 'Cable_R.quaternion'],
    CraneWork: ['Crane_Bridge.position', 'Crane_Trolley_L.position', 'Crane_Hook_L.position', 'Crane_Hook_R.position', 'Cable_L.scale', 'Cable_R.scale'],
    RampOpenClose: ['Access_Ramp.quaternion', 'Portal_Shutter.position'],
    AlertPulse: ['Cooling_Fans.position'],
};
/** Clipes complementares por propriedade; nunca altere tracks/buffers do cache. */
export function hangarClip(source: AnimationClip) {
    const selected = CHANNELS[source.name];
    if (!selected) throw new Error(`Clipe inesperado no Hangar: ${source.name}`);
    const tracks = source.tracks.filter(track => selected.includes(track.name));
    if (tracks.length !== selected.length) throw new Error(`Tracks ausentes no Hangar: ${source.name}`);
    return new AnimationClip(source.name, source.duration, tracks);
}

export class HangarRuntime {
    readonly status = { rampOpen: 0, roofOpacity: 1, alert: false, idleTime: 0, craneTime: 0, departures: 0, landings: 0 };
    private architecture: MasterplanRuntime;
    private mixer: AnimationMixer;
    private actions: Record<string, AnimationAction> = {};
    private ownedMaterials = new Set<Material>();
    private emissive: { material: MeshStandardMaterial; base: number }[] = [];
    private localPlayer = { x: 0, z: 0 };
    private landing = 0;
    private departing = false;
    private disposed = false;
    private bridgeGeometry: BufferGeometry;
    constructor(private scene: Object3D, clips: AnimationClip[]) {
        const parts: MasterplanPart[] = [];
        const copies = new Map<Material, Material>();
        scene.traverse(node => {
            if (node.userData.id_estavel) {
                node.userData.apoiado_em = ''; node.userData.apoiado_em_todos = ''; node.userData.estado_inicial = 'visivel';
                parts.push({ id: node.userData.id_estavel, papel: node.userData.papel, ambiente: 'hangar', estado_inicial: 'visivel', apoiado_em: [], apoiado_em_todos: [] });
            }
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const copy = (source: Material) => {
                let own = copies.get(source);
                if (!own) { own = source.clone(); copies.set(source, own); this.ownedMaterials.add(own); }
                return own;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(copy) : copy(mesh.material);
            mesh.castShadow = true; mesh.receiveShadow = true;
        });
        if (parts.length !== 6 || !scene.getObjectByName('TETO_Hangar')) throw new Error('Hangar v002 incompleto');
        const architecture: MasterplanManifest = { parts, walkableAreas: [HANGAR.roofArea], doors: HANGAR.doors };
        this.architecture = new MasterplanRuntime(scene, architecture);
        const seen = new Set<Material>();
        scene.traverse(node => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                const material = mat as MeshStandardMaterial;
                if (!seen.has(material) && (material.emissiveMap || material.name === 'MAT_Hangar_Atlas_2K')) { seen.add(material); this.emissive.push({ material, base: material.emissiveIntensity }); }
            }
        });
        this.mixer = new AnimationMixer(scene);
        for (const name of Object.keys(CHANNELS)) {
            const source = clips.find(clip => clip.name === name);
            if (!source) throw new Error(`Clipe ausente no Hangar: ${name}`);
            const action = this.mixer.clipAction(hangarClip(source));
            action.setLoop(name === 'RampOpenClose' ? LoopOnce : LoopRepeat, name === 'RampOpenClose' ? 1 : Infinity);
            action.clampWhenFinished = true; action.play();
            action.paused = name === 'RampOpenClose' || name === 'AlertPulse';
            this.actions[name] = action;
        }
        this.actions.RampOpenClose.time = this.actions.RampOpenClose.getClip().duration / 2;
        this.mixer.update(0);
        const b = HANGAR.bridge, c = HANGAR.placement.z;
        this.bridgeGeometry = new BufferGeometry();
        this.bridgeGeometry.setAttribute('position', new Float32BufferAttribute([b.minX,b.top,b.minZ-c, b.minX,b.top,b.maxZ-c, b.maxX,0,b.maxZ-c, b.maxX,0,b.minZ-c], 3));
        this.bridgeGeometry.setIndex([0,1,2,0,2,3]); this.bridgeGeometry.computeVertexNormals();
        const bridgeMaterial = new MeshStandardMaterial({ color: '#8c9290', roughness: .8, metalness: .15 });
        this.ownedMaterials.add(bridgeMaterial);
        const bridge = new Mesh(this.bridgeGeometry, bridgeMaterial); bridge.name = 'HangarFloorBridge'; bridge.receiveShadow = true; scene.add(bridge);
        scene.userData.hangar = this.status;
    }
    setDeparture(active: boolean) { if (active && !this.departing) this.status.departures++; this.departing = active; }
    startLanding() { this.landing = HANGAR.animation.landingPulse; this.status.landings++; }
    update(player: { x: number; z: number }, delta: number) {
        const dt = Math.min(Math.max(0, delta), .05), r = HANGAR.ramp;
        const near = Math.abs(player.x) < r.nearHalfWidth && player.z > r.nearInsideZ && player.z < r.nearOutsideZ;
        this.status.rampOpen += ((near ? 1 : 0) - this.status.rampOpen) * (1 - Math.exp(-HANGAR.animation.response * dt));
        const ramp = this.actions.RampOpenClose;
        ramp.time = (1 - this.status.rampOpen) * ramp.getClip().duration / 2;
        this.landing = Math.max(0, this.landing - dt);
        this.status.alert = this.departing || this.landing > 0;
        const alert = this.actions.AlertPulse;
        alert.paused = !this.status.alert;
        if (!this.status.alert) alert.time = 0;
        this.mixer.update(dt);
        this.localPlayer.x = player.x; this.localPlayer.z = player.z - HANGAR.placement.z;
        this.architecture.update(this.localPlayer, dt);
        this.status.roofOpacity = this.architecture.getRoofOpacity('TET_hangar');
        this.status.idleTime = this.actions.Idle.time; this.status.craneTime = this.actions.CraneWork.time;
        const gain = this.status.alert ? .65 + 2.35 * Math.sin(alert.time / alert.getClip().duration * Math.PI * 2) ** 2 : 1;
        for (const { material, base } of this.emissive) material.emissiveIntensity = base * gain;
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.scene); this.architecture.dispose();
        for (const material of this.ownedMaterials) material.dispose();
        this.bridgeGeometry.dispose();
        const skeletons = new Set();
        this.scene.traverse(node => { const mesh = node as SkinnedMesh; if (mesh.isSkinnedMesh && !skeletons.has(mesh.skeleton)) { skeletons.add(mesh.skeleton); mesh.skeleton.dispose(); } });
    }
}
