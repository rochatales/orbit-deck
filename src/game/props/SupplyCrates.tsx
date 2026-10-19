import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AdditiveBlending, AnimationMixer, LoopOnce, Material, Mesh, PointLight } from 'three';
import type { AnimationClip, Group } from 'three';
import type { SupplyCrate } from '../../combat/simulation';
import { SUPPLY_CRATE, revealIntensity } from './supplyCrate';
import crateUrl from '../../assets/props/caixa-suprimentos/caixa-suprimentos-v001.glb';

function createRig(source: Group, animations: AnimationClip[], crate: SupplyCrate) {
    const root = source.clone(true), materials = new Map<Material, Material>(), ids = new Set<string>();
    root.name = crate.id;
    root.position.set(crate.x, .015, crate.z);
    root.traverse(object => {
        const id = object.userData.id_estavel;
        if (id) {
            if (ids.has(id)) throw new Error(`Caixa: ID duplicado ${id}`);
            ids.add(id);
        }
        if (!(object instanceof Mesh)) return;
        const clone = (source: Material) => {
            let material = materials.get(source);
            if (!material) {
                material = source.clone();
                if (material.transparent) { material.depthWrite = false; material.blending = AdditiveBlending; }
                materials.set(source, material);
            }
            return material;
        };
        object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
        object.castShadow = !object.name.startsWith('VFX');
        object.receiveShadow = true;
    });
    for (const id of ['LID_Pivot', 'LOCK_Left', 'LOCK_Right', 'VFX_Reveal'])
        if (!ids.has(id)) throw new Error(`Caixa: peça ausente ${id}`);
    const clip = animations.find(a => a.name === 'Open');
    if (!clip) throw new Error('Caixa: animação Open ausente');
    const mixer = new AnimationMixer(root), action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play(); mixer.setTime(0);
    const light = new PointLight(SUPPLY_CRATE.neon, 0, 5, 2);
    light.position.set(0, .94, .04); root.add(light);
    let lastTime = -1;
    return {
        root,
        update() {
            if (lastTime !== crate.elapsed) { mixer.setTime(crate.elapsed); lastTime = crate.elapsed; }
            light.intensity = revealIntensity(crate);
            light.visible = light.intensity > 0;
        },
        dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); materials.forEach(m => m.dispose()); }
    };
}

/** Duas instâncias compartilham geometrias/texturas; animação e luz são independentes. Sem física automática. */
export function SupplyCrates({ crates }: { crates: SupplyCrate[] }) {
    const asset = useGLTF(crateUrl);
    const rigs = useMemo(() => crates.map(crate => createRig(asset.scene, asset.animations, crate)), [asset, crates]);
    useEffect(() => () => rigs.forEach(rig => rig.dispose()), [rigs]);
    useFrame(() => { for (const rig of rigs) rig.update(); });
    return <>{rigs.map(rig => <primitive key={rig.root.name} object={rig.root} dispose={null}/>)}</>;
}
