import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Group,Raycaster,Vector3,SRGBColorSpace} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const {QUARTEL,QUARTEL_CIRCULATION:C,quartelSupportHeight}=loadSource('src/game/quartelLayout.ts');
const {removeRoomForQuartel}=loadSource('src/scene/marsColony/quartelColony.ts');
const {SandwindController,sandwindResources}=loadSource('src/scene/marsColony/SandwindController.ts');
const {sandwindTargets}=loadSource('src/scene/marsColony/sandwindTargets.ts');
const [paving,colony]=await Promise.all(['quartel/quartel-circulation-v001.glb','colony-v007.glb'].map(f=>loadGlb(`src/assets/${f}`)));
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
function colorAt(mesh,x,z){const p=mesh.geometry.attributes.position,col=mesh.geometry.attributes.color,idx=mesh.geometry.index;
 for(let i=0;i<(idx?.count??p.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k),v=ids.map(k=>[p.getX(k),p.getZ(k)]),[a,b,c]=v,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/den,w=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/den,t=1-u-w;if(Math.min(u,w,t)<-1e-6)continue;return [0,1,2].map(k=>col.getComponent(ids[0],k)*u+col.getComponent(ids[1],k)*w+col.getComponent(ids[2],k)*t);
 }throw new Error(`Ponto sem piso ${x},${z}`);
}
test('Quartel: duas lacunas pavimentadas com tile v007, sem sobrepor piso existente ou pedestal',()=>{
 const bytes=fs.readFileSync('src/assets/quartel/quartel-circulation-v001.glb');assert.equal(createHash('sha256').update(bytes).digest('hex'),C.sha256);
 const m=paving.scene.getObjectByName('QuartelCirculation'),p=m.geometry.attributes.position,idx=m.geometry.index;assert.equal(idx.count/3,C.triangles);let area=0;
 for(let i=0;i<idx.count;i+=3){const ids=[0,1,2].map(k=>idx.getX(i+k)),xs=ids.map(k=>p.getX(k)),zs=ids.map(k=>p.getZ(k));
  assert.ok(C.areas.some(a=>ids.every(k=>p.getX(k)>=a.minX-1e-6&&p.getX(k)<=a.maxX+1e-6&&p.getZ(k)>=a.minZ-1e-6&&p.getZ(k)<=a.maxZ+1e-6)));
  area+=Math.abs((xs[1]-xs[0])*(zs[2]-zs[0])-(zs[1]-zs[0])*(xs[2]-xs[0]))/2;
  for(const k of ids)assert.ok(Math.abs(p.getY(k))<1e-7);
 }
 assert.ok(Math.abs(area-2.559375)<1e-5,area);
 const original=colony.scene.getObjectByName('PISO_v007_Externo');assert.equal(m.material.name,original.material.name);
 for(const[x,z]of [[14.74,-5.31],[15.1,-5.1],[14.1,5.31],[14.9,5.61]]){
  const a=colorAt(m,x,z),b=colorAt(original,x-5,z);for(let k=0;k<3;k++)assert.ok(Math.abs(a[k]-b[k])<.005,JSON.stringify({x,z,a,b}));
 }
 for(const a of C.areas){const x=(a.minX+a.maxX)/2,z=(a.minZ+a.maxZ)/2;assert.ok(!manifest.walkableAreas.some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ));assert.equal(quartelSupportHeight(x,z),null);}
});
test('Quartel: piso preservado nos quatro cantos arredondados e recorte exato somente sob rampas',()=>{
 const s=colony.scene.clone(true),owned=[],source=colony.scene.getObjectByName('PISO_v007_Externo'),count=source.geometry.index.count;
 removeRoomForQuartel(s,manifest,owned);s.updateMatrixWorld(true);const floor=s.getObjectByName('PISO_v007_Externo'),ray=new Raycaster(new Vector3(),new Vector3(0,-1,0));
 function hit(x,z){ray.ray.origin.set(x,1,z);return ray.intersectObject(floor,true).some(h=>Math.abs(h.point.y)<1e-6);}
 for(const x of [6.7,17.3])for(const z of [-4.55,4.55]){assert.equal(quartelSupportHeight(x,z),null);assert.ok(hit(x,z),`canto ${x},${z}`);}
 for(const[x,z]of [[5.8,0],[10.5,-5.5]])assert.equal(hit(x,z),false,'sem duplicar piso sob a rampa');
 assert.ok(hit(5.1,0));assert.equal(source.geometry.index.count,count,'cache original intacto');owned.forEach(g=>g.dispose());
});
test('Quartel: complemento de corredor recebe areia sem ser descartado com o prédio e restaura cache',()=>{
 const scope=new Group(),floor=paving.scene.clone(true),architecture=new Group();scope.add(floor,architecture);floor.name='QuartelCirculationRoot';
 const before={...sandwindResources},original=paving.scene.getObjectByName('QuartelCirculation').material;
 const targets=sandwindTargets(scope,architecture,{parts:[],doors:[],walkableAreas:[]});assert.equal(targets.length,0);
 const controller=new SandwindController(scope,[paving.scene],targets,SRGBColorSpace);
 controller.update(200,200,.2,{enabled:true,culling:true,wind:true,profile:'compact'},false);assert.equal(floor.visible,true);assert.equal(floor.parent,scope);
 controller.dispose();assert.equal(floor.getObjectByName('QuartelCirculation').material,original);assert.deepEqual(sandwindResources,before);
});
