// Node, a partir da raiz: node art-source/armas/facao/scripts/medir_encaixe.mjs
// Reproduz o transform local glTF, sem regravar assets nem alterar fontes.
import { loadGlb } from '../../../../tests/load-glb.mjs';
import { AnimationMixer, Vector3, Quaternion, Matrix4, LoopOnce } from 'three';
import fs from 'node:fs';
const g = await loadGlb('src/assets/characters/player/explorador-facao-v001.glb');
const mixer = new AnimationMixer(g.scene);
mixer.clipAction(g.animations.find(c => c.name === 'Machete_Idle')).play();
mixer.update(0); g.scene.updateMatrixWorld(true);
const bone = name => g.scene.getObjectByName('mixamorig' + name);
const palm = side => bone(side + 'HandIndex1').getWorldPosition(new Vector3())
  .add(bone(side + 'HandThumb2').getWorldPosition(new Vector3())).multiplyScalar(.5);
const right = palm('Right'), left = palm('Left'), hand = bone('RightHand');
const y = left.clone().sub(right).normalize();
const z = new Vector3(0, 0, 1).applyQuaternion(hand.getWorldQuaternion(new Quaternion()));
z.addScaledVector(y, -z.dot(y)).normalize();
const x = new Vector3().crossVectors(y, z).normalize();
const worldQ = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
const q = hand.getWorldQuaternion(new Quaternion()).invert().multiply(worldQ);
const scale = right.distanceTo(left) / .18 / hand.getWorldScale(new Vector3()).x;
const position = hand.worldToLocal(right.clone()).sub(new Vector3(0, .21, 0).multiplyScalar(scale).applyQuaternion(q));
const report = {
  position: position.toArray(), quaternion: q.toArray(), scale: [scale, scale, scale],
  gripRightWorld: right.toArray(), gripLeftWorld: left.toArray(), worldLength: scale * hand.getWorldScale(new Vector3()).x * 1.002528,
  method: 'Centros da palma: média de HandIndex1 e HandThumb2 no Machete_Idle t=0; Grip_R/Grip_L y=.21/.39; +Y do asset vai da mão direita à esquerda; lâmina aponta -Y.'
};
fs.writeFileSync('art-source/armas/facao/notas/encaixe-v001.json', JSON.stringify(report, null, 2) + '\n');
// Ensaio do encaixe dinâmico e do apoio do quadril no avatar real, sem navegador.
const { loadSource } = await import('../../../../tests/load-source.mjs');
const { attachMachete, MacheteGripRig } = loadSource('src/characters/player/macheteAttachment.ts');
const character = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const sword = await loadGlb('src/assets/weapons/facao-v001.glb');
const runtimeMixer = new AnimationMixer(character.scene);
attachMachete(character.scene, sword.scene); const rig = new MacheteGripRig(character.scene, sword.scene);
report.runtime = [];
for (const clip of g.animations.filter(c => c.name !== 'Machete_Block')) {
  runtimeMixer.stopAllAction(); const action = runtimeMixer.clipAction(clip); action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
  let rightError = 0, leftError = 0, drift = 0, anchor;
  for (let frame = 0; frame <= 36; frame++) {
    runtimeMixer.setTime(frame / 36 * clip.duration); rig.update(); character.scene.updateMatrixWorld(true);
    for (const side of ['Right', 'Left']) {
      const point = character.scene.getObjectByName('mixamorig' + side + 'HandIndex1').getWorldPosition(new Vector3())
        .add(character.scene.getObjectByName('mixamorig' + side + 'HandThumb2').getWorldPosition(new Vector3())).multiplyScalar(.5);
      const error = point.distanceTo(sword.scene.getObjectByName(side === 'Right' ? 'Grip_R' : 'Grip_L').getWorldPosition(new Vector3()));
      if (side === 'Right') rightError = Math.max(rightError, error); else leftError = Math.max(leftError, error);
    }
    const hips = character.scene.getObjectByName('mixamorigHips').getWorldPosition(new Vector3());
    anchor ??= hips; drift = Math.max(drift, Math.hypot(hips.x - anchor.x, hips.z - anchor.z));
  }
  report.runtime.push({ clip: clip.name, samples: 37, rightError, leftError, horizontalRootDrift: drift });
}
fs.writeFileSync('art-source/armas/facao/notas/encaixe-v001.json', JSON.stringify(report, null, 2) + '\n');
