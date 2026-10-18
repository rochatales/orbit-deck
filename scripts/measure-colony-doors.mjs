// Comparação reproduzível de 16 portas: referência aprovada a23138d vs runtime atual.
// 180 passos/porta a 60 Hz; coplanaridade usa triângulos reais contra a caixa das folhas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Triangle, Vector3 } from 'three';
import { loadSource } from '../tests/load-source.mjs';
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'s6-12-doors-before-'));
fs.writeFileSync(path.join(dir,'visibility.ts'),execFileSync('git',['show','a23138d:src/scene/marsColony/visibility.ts']));
const {ColonyVisibility:Before}=loadSource(path.join(dir,'visibility.ts'));
const {ColonyVisibility:After}=loadSource('src/scene/marsColony/visibility.ts');
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {applyColonyLayout}=loadSource('src/scene/marsColony/layout.ts');
const bytes=fs.readFileSync('src/assets/colony-v006.glb');
const report={baseline:'a23138d',delta:1/60,stepsPerDoor:180,results:[]};
for(const [phase,Controller] of [['antes',Before],['depois',After]]){
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 applyColonyLayout(scene);const world=createWorld(),controller=new Controller(scene,manifest.parts,world.group);
 const doors=[],meshes=[];world.group.traverse(n=>{if(n.name==='PortaAutomatica')doors.push(n);});
 scene.traverseVisible(n=>{if(n.isMesh)meshes.push({mesh:n,box:new Box3().setFromObject(n)});});
 const triangle=new Triangle(),box=new Box3(),far=new Vector3(1000,0,1000),camera=new Vector3(),player=new Vector3();
 function intersections(door){
  world.group.updateMatrixWorld(true);let triangles=0,coplanar=0;
  for(const leaf of door.children){if(!leaf.isMesh)continue;box.setFromObject(leaf);
   for(const {mesh,box:other} of meshes){if(!box.intersectsBox(other))continue;
    const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
    for(let i=0;i<(idx?idx.count:p.count);i+=3){
     [triangle.a,triangle.b,triangle.c].forEach((v,j)=>v.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
     if(!box.intersectsTriangle(triangle))continue;triangles++;
     for(const axis of ['x','y','z'])if(Math.abs(triangle.a[axis]-triangle.b[axis])<1e-6&&Math.abs(triangle.a[axis]-triangle.c[axis])<1e-6&&(Math.abs(triangle.a[axis]-box.min[axis])<1e-5||Math.abs(triangle.a[axis]-box.max[axis])<1e-5))coplanar++;
    }
   }
  }return {triangles,coplanar};
 }
 const result=[];
 for(const [id,door] of doors.entries()){
  const p=door.getWorldPosition(new Vector3());
  world.update(far,10);const closed=intersections(door);world.update(p,10);const open=intersections(door);
  const tracked=[];door.traverse(n=>{if(n.isMesh)tracked.push(n);});scene.traverse(n=>{if(n.isMesh&&n.name.includes('Port')&&new Box3().setFromObject(n).distanceToPoint(p)<4)tracked.push(n);});
  const prev=tracked.map(n=>({v:n.visible,d:n.material.depthWrite,m:n.material}));
  let visibleChanges=0,depthWriteChanges=0,materialChanges=0;
  for(let frame=0;frame<180;frame++){
   const angle=frame/180*Math.PI*2,distance=frame<90?3.5-frame/90*3:0.5+(frame-90)/90*3;
   player.set(p.x,p.y,p.z+distance);camera.set(p.x+Math.sin(angle)*7,4.5,p.z+Math.cos(angle)*7);
   world.update(player,1/60);controller.update(player,camera,1/60);
   for(const [i,n] of tracked.entries()){const old=prev[i];visibleChanges+=Number(n.visible!==old.v);depthWriteChanges+=Number(n.material.depthWrite!==old.d);materialChanges+=Number(n.material!==old.m);old.v=n.visible;old.d=n.material.depthWrite;old.m=n.material;}
  }
  result.push({id,portal:door.userData.colonyPortal,closed,open,visibleChanges,depthWriteChanges,materialChanges});
 }
 // Regressão do trajeto aprovado: nenhum toggle de visible (câmera fixa e giro completo).
 const route=[];
 for(const rotating of [false,true]){
  const nodes=[];scene.traverse(n=>{if(n.userData.colony_name)nodes.push(n);});
  const prev=nodes.map(n=>n.visible),points=[[0,0.8],[0,-8],[9.5,-10],[0,33]];let visibleChanges=0;
  for(let frame=0;frame<960;frame++){
   const t=frame/960*3,k=Math.min(2,Math.floor(t)),u=t-k;
   player.set(points[k][0]*(1-u)+points[k+1][0]*u,0,points[k][1]*(1-u)+points[k+1][1]*u);
   const angle=Math.PI/4+(rotating?frame/960*Math.PI*2:0);
   camera.set(player.x+Math.sin(angle)*60,48,player.z+Math.cos(angle)*60);
   world.update(player,1/60);controller.update(player,camera,1/60);
   nodes.forEach((n,i)=>{visibleChanges+=Number(n.visible!==prev[i]);prev[i]=n.visible;});
  }
  route.push({rotating,frames:960,visibleChanges});
 }
 controller.dispose();report.results.push({phase,result,route});
}
const out='docs/handoffs/s6.12/evidencias/portas';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/revalidacao.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.results.map(p=>({phase:p.phase,doors:p.result.length,closedTriangles:p.result.reduce((s,r)=>s+r.closed.triangles,0),openTriangles:p.result.reduce((s,r)=>s+r.open.triangles,0),closedCoplanar:p.result.reduce((s,r)=>s+r.closed.coplanar,0),openCoplanar:p.result.reduce((s,r)=>s+r.open.coplanar,0),visible:p.result.reduce((s,r)=>s+r.visibleChanges,0),depthWrite:p.result.reduce((s,r)=>s+r.depthWriteChanges,0),material:p.result.reduce((s,r)=>s+r.materialChanges,0),route:p.route})),null,2));
