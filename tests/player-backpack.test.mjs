import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, Group, LoopOnce, Matrix4, Raycaster, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {attachBackpack,detachBackpack,createBackpackVisual}=loadSource('src/characters/player/backpackAttachment.ts');
const asset=await loadGlb('src/assets/characters/player/backpack.glb');
const player=await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('Mochila: export isolado preserva a fonte; sem Cube/câmera/luz/colisor ou rig adicional',()=>{
 const base='art-source/player-backpack/',report=JSON.parse(fs.readFileSync(base+'notas/export-v001.json'));
 assert.equal(hash(base+report.source),report.source_sha256);
 assert.equal(hash(base+report.output),report.sha256);
 assert.equal(hash('src/assets/characters/player/backpack.glb'),report.sha256);
 assert.deepEqual(asset.animations,[]);let triangles=0;
 asset.scene.traverse(n=>{assert.ok(!n.isCamera&&!n.isLight&&!n.isBone);assert.ok(!/Cube|COL_/i.test(n.name));if(n.isMesh)triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;});
 assert.equal(triangles,2108);
 const b=new Box3().setFromObject(asset.scene).getSize(new Vector3());
 assert.ok(Math.abs(b.x-.57)<1e-6&&Math.abs(b.y-.534)<1e-6&&Math.abs(b.z-.272)<1e-6);
});

test('Mochila: encaixe rígido nas costas acompanha todos os clipes, sem alterar o rig nem o cache',()=>{
 for(const clip of player.animations){
  const character=clone(player.scene),pack=asset.scene.clone(true),mixer=new AnimationMixer(character);
  const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
  assert.equal(attachBackpack(character,pack),true);
  const local=pack.matrix.clone(),original=player.scene.getObjectByName('mixamorigSpine2').quaternion.clone();
  pack.updateMatrix();local.copy(pack.matrix);
  for(let i=0;i<=12;i++){
   mixer.setTime(clip.duration*i/12);character.updateMatrixWorld(true);
   const relative=new Matrix4().copy(pack.parent.matrixWorld).invert().multiply(pack.matrixWorld);
   assert.ok(relative.elements.every((v,k)=>Math.abs(v-local.elements[k])<1e-6),clip.name);
   assert.ok(player.scene.getObjectByName('mixamorigSpine2').quaternion.equals(original));
  }

  detachBackpack(pack);detachBackpack(pack);assert.equal(pack.parent,null);
 }
 assert.equal(asset.scene.parent,null);assert.equal(attachBackpack(new Group(),asset.scene.clone(true)),false);
});


test('Mochila neon: uma luz ciano ilumina ao redor e segue o tronco sem tocar no cache',()=>{
 const character=clone(player.scene),visual=createBackpackVisual(asset.scene),pack=visual.scene;
 const lights=[];pack.traverse(n=>{if(n.isLight)lights.push(n);});assert.equal(lights.length,1);
 const light=lights[0];assert.equal(light.color.getHexString(),'00f5ff');assert.equal(light.castShadow,false);
 assert.ok(light.intensity>0&&light.intensity<=2&&light.distance>=3);assert.equal(light.decay,2);
 assert.equal(visual.materials.length,1);assert.equal(visual.materials[0].emissiveIntensity,.8);
 let sourceStripe;asset.scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.name==='Glow_Cyan')sourceStripe=m;});
 assert.equal(sourceStripe.emissiveIntensity,6);assert.notEqual(visual.materials[0],sourceStripe);
 assert.equal(asset.scene.getObjectByName('BackpackNeonLight'),undefined);
 attachBackpack(character,pack);const mixer=new AnimationMixer(character),action=mixer.clipAction(player.animations.find(c=>c.name==='Run'));action.play();
 const local=light.position.clone();let before;
 for(let i=0;i<20;i++){
  mixer.update(1/30);character.updateMatrixWorld(true);
  const world=light.getWorldPosition(new Vector3());assert.ok(light.position.equals(local));
  if(!before)before=world;else if(i===19)assert.ok(world.distanceTo(before)>.01);
 }
 mixer.timeScale=0;const paused=light.getWorldPosition(new Vector3());mixer.update(1);character.updateMatrixWorld(true);assert.ok(light.getWorldPosition(new Vector3()).equals(paused));
 detachBackpack(pack);assert.equal(character.getObjectByName('BackpackNeonLight'),undefined);
 let disposed=0;visual.materials[0].addEventListener('dispose',()=>disposed++);visual.materials.forEach(m=>m.dispose());assert.equal(disposed,1);
});


test('Mochila: Breathing_Idle centralizado nas costas e 4 cm acima, com casco por fora do traje',()=>{
 const character=clone(player.scene),pack=asset.scene.clone(true),mixer=new AnimationMixer(character);
 mixer.clipAction(player.animations.find(c=>c.name==='Idle_Colony')).play();
 attachBackpack(character,pack);mixer.update(0);character.updateMatrixWorld(true);
 const old=asset.scene.clone(true),historical=JSON.parse(fs.readFileSync('art-source/player-backpack/notas/encaixe-v001.json'));
 attachBackpack(character,old);old.position.fromArray(historical.position);old.quaternion.fromArray(historical.quaternion).normalize();character.updateMatrixWorld(true);
 const center=new Box3().setFromObject(pack).getCenter(new Vector3()),before=new Box3().setFromObject(old).getCenter(new Vector3());
 const left=character.getObjectByName('mixamorigLeftArm').getWorldPosition(new Vector3());
 const right=character.getObjectByName('mixamorigRightArm').getWorldPosition(new Vector3());
 assert.ok(left.x>right.x,'+X é a esquerda anatômica do astronauta');
 assert.ok(Math.abs(center.x-(left.x+right.x)/2)<.005,'centro entre os ombros, sem viés para o direito');
 assert.ok(center.x-before.x>.065&&center.x-before.x<.075,'deslocamento para a esquerda de aproximadamente 7 cm');
 assert.ok(Math.abs(center.y-before.y-.04)<1e-6,'elevação de 4 cm');
 assert.ok(Math.abs(center.z-before.z+.1544865001)<1e-6,'recuo medido para apoiar fora da malha do traje');
 assert.ok(pack.scale.equals(old.scale),'tamanho preservado');
 detachBackpack(pack);detachBackpack(old);
});


test('Mochila: painel paralelo ao tronco e os dois lados por fora da malha no idle da colônia',()=>{
 const character=clone(player.scene),pack=asset.scene.clone(true),mixer=new AnimationMixer(character);
 const clip=player.animations.find(c=>c.name==='Idle_Colony');mixer.clipAction(clip).play();attachBackpack(character,pack);
 const bone=n=>character.getObjectByName('mixamorig'+n).getWorldPosition(new Vector3());
 for(const phase of [0,.25,.5,.75,.99]){
  mixer.setTime(clip.duration*phase);character.updateMatrixWorld(true);
  const up=bone('Neck').sub(bone('Spine1')).normalize(),lateral=bone('LeftArm').sub(bone('RightArm')).normalize();
  const forward=new Vector3().crossVectors(lateral,up).normalize(),panel=pack.getWorldDirection(new Vector3());
  assert.ok(panel.dot(forward)>.999,'painel alinhado ao plano anatômico das costas');
  const meshes=[];character.traverse(n=>{if(n.isSkinnedMesh){n.computeBoundingSphere();n.computeBoundingBox();meshes.push(n);}});
  for(const y of [-.18,-.12,0,.09,.12,.18]){
   const distances=[];
   for(const side of [-1,0,1]){
    // Face rígida do casco: as tiras avançam mais 2,2 cm e podem encostar no traje.
    const contact=pack.localToWorld(new Vector3(side*.14,y,y<-.11?.005:0));
    // Só no teste: raycast na malha deformada mede folga visual; nunca participa da física.
    const ray=new Raycaster(contact.clone().addScaledVector(forward,-1),forward,0,2);
    const hit=ray.intersectObjects(meshes,false)[0];assert.ok(hit,'ponto de apoio nas costas');
    const clearance=hit.distance-1;assert.ok(clearance>=.002,`lado ${side} afundou ${clearance} na fase ${phase}`);
    distances.push(clearance);
   }
   assert.ok(Math.abs(distances[0]-distances[2])<.025,`folga lateral desigual: ${distances}`);
  }
 }
 detachBackpack(pack);
});
