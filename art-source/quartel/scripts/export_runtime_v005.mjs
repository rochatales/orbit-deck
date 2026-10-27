import fs from 'node:fs';
import crypto from 'node:crypto';
import {Group,Vector3,Quaternion,Box3,AnimationMixer,LoopOnce} from 'three';
import {loadGlb} from '../../../tests/load-glb.mjs';
const root='art-source/quartel/',file=root+'export/barracks-v005.glb';
const asset=await loadGlb(file),placement=new Group();placement.position.x=12;placement.rotation.y=-Math.PI/2;placement.add(asset.scene);placement.updateMatrixWorld(true);
const p=new Vector3(),s=new Vector3(),q=new Quaternion();
const bounds=node=>{const b=new Box3().setFromObject(node);return {minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};};
const nodes=[];asset.scene.traverse(n=>{if(n.name.startsWith('COL_'))nodes.push(n);});
const box=n=>{
 n.getWorldPosition(p);n.getWorldScale(s);n.getWorldQuaternion(q);
 const vertices=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertices.push(new Vector3(x,y,z).applyMatrix4(n.matrixWorld));
 const b=new Box3().setFromPoints(vertices);
 return {id:n.name,kind:n.userData.kind,position:{x:p.x,y:p.y,z:p.z},halfExtents:[Math.abs(s.x),Math.abs(s.y),Math.abs(s.z)],rotation:{x:q.x,y:q.y,z:q.z,w:q.w},bounds:{minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z},panel:n.userData.door_panel??null};
};
const all=nodes.map(box),statics=all.filter(n=>['wall','pedestal-edge'].includes(n.kind)),dynamic=all.filter(n=>n.kind==='door');
const mixer=new AnimationMixer(asset.scene),actions=asset.animations.map(c=>{const a=mixer.clipAction(c);a.setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;a.time=c.duration;return a;});mixer.update(0);placement.updateMatrixWorld(true);
for(const d of dynamic){const node=nodes.find(n=>n.name===d.id);node.getWorldPosition(p);d.slide={x:p.x-d.position.x,y:p.y-d.position.y,z:p.z-d.position.z};d.side=d.panel.startsWith('Door_W')?'north':'west';}
for(const a of actions)a.time=0;mixer.update(0);placement.updateMatrixWorld(true);
const base=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),old={minX:7.25,maxX:13.75,minZ:-3.25,maxZ:3.25};
const removedColliders=base.colliders.filter(c=>c.id.startsWith('wall-design-')||(c.id.startsWith('interior-')&&c.minX>=old.minX&&c.maxX<=old.maxX&&c.minZ>=old.minZ&&c.maxZ<=old.maxZ)).map(c=>c.id);
const ramps=[['north','Entrance_W_Ramp'],['west','Entrance_S_Ramp']].map(([side,name])=>({side,...bounds(asset.scene.getObjectByName(name)),width:2,top:.2625,run:1.2,rise:.2625,start:side==='north'?-6:5.25,end:side==='north'?-4.8:6.45}));
const plinth={minX:6.4125,maxX:17.5875,minZ:-4.8375,maxZ:4.8375,radius:1.3125,top:.2625};
const originalColony=await loadGlb('src/assets/colony-v007.glb'),removedZoneMarkers=[];
originalColony.scene.updateMatrixWorld(true);
originalColony.scene.traverse(n=>{const id=n.userData.id_estavel;if(typeof id==='string'&&id.startsWith('Demarcacao_build-zone-a_')){const b=bounds(n);if(b.minX<plinth.maxX&&b.maxX>plinth.minX&&b.minZ<plinth.maxZ&&b.maxZ>plinth.minZ)removedZoneMarkers.push(id);}});
const manifest={removedZoneMarkers,dimensions:{width:10.5,depth:9,doorWidth:1.8,doorHeight:1.998,furnitureScale:1.1},version:'v005',sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),placement:{x:12,y:0,z:0,rotationY:-Math.PI/2,scale:1},legacyRoomId:'design',name:'Quartel',wallArea:{minX:6.75,maxX:17.25,minZ:-4.5,maxZ:4.5},roofArea:{minX:6.94,maxX:17.06,minZ:-4.31,maxZ:4.31},plinth,ramps,connectors:[{id:'east-connector-design',minX:4,maxX:ramps[1].minX,minZ:-1.3,maxZ:1.3},{id:'lab-quarters-connector',minX:9.2,maxX:11.8,minZ:-8,maxZ:ramps[0].minZ}],doors:[{side:'north',x:10.5,z:-4.5,clip:'Door_Open'},{side:'west',x:6.75,z:0,clip:'Door_S_Open'}],staticCuboids:statics,dynamicCuboids:dynamic,removedParts:[...base.parts.filter(p=>p.ambiente==='design').map(p=>p.id),...removedZoneMarkers],removedColliders,removedAreas:['design','east-connector-design','lab-quarters-connector'],floorCutAreas:[plinth,...ramps],geometryBounds:bounds(asset.scene)};
fs.mkdirSync('src/assets/quartel',{recursive:true});fs.copyFileSync(file,'src/assets/quartel/barracks-v005.glb');fs.writeFileSync('src/assets/quartel/barracks-v005.manifest.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(root+'notas/runtime-v005.json',JSON.stringify(manifest,null,2)+'\n');
console.log('COL:',statics.length,'estáticos',dynamic.length,'folhas; clipes',asset.animations.map(c=>c.name));console.log(dynamic.map(d=>[d.id,d.slide]));
