import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Mesh, PlaneGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coplanarFloorSurfaces } from '../scripts/lib/colony-geometry.mjs';

const bytes = fs.readFileSync('src/assets/colony-v006.glb');
const scenePromise = new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
 .then(({scene}) => { scene.updateMatrixWorld(true); return scene; });
const cross = (a,b,p) => (b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
function topTriangles(node) {
 const triangles=[];
 node.traverse(mesh => {
  if (!mesh.isMesh) return;
  const p=mesh.geometry.attributes.position, color=mesh.geometry.attributes.color, idx=mesh.geometry.index;
  for(let i=0;i<(idx?.count??p.count);i+=3) {
   const ids=[0,1,2].map(j=>idx?idx.getX(i+j):i+j);
   const vertices=ids.map(i=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
   const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
   if(normal.y<=1e-8)continue;
   triangles.push({vertices,area:normal.length()/2,colors:ids.map(i=>[color.getX(i),color.getY(i),color.getZ(i)])});
  }
 });
 return triangles;
}
function colorAt(triangles,p) {
 for(const t of triangles) {
  const [a,b,c]=t.vertices,den=cross(a,b,c);
  const weights=[cross(b,c,p)/den,cross(c,a,p)/den,cross(a,b,p)/den];
  if(weights.some(w=>w< -1e-6))continue;
  return [0,1,2].map(k=>weights.reduce((s,w,i)=>s+w*t.colors[i][k],0));
 }
 return null;
}
const mod=(a,b)=>((a%b)+b)%b;
test('S6.12: piso externo repete escala, junta e cores reais do pátio, sem mudar área/altura', async()=>{
 const scene=await scenePromise,reference=topTriangles(scene.getObjectByName('ARQ_Lab_Piso_Patio'));
 for(const [name,area,maxTriangles] of [['ARQ_Piso_Passarelas',183,15000],['ARQ_Piso_Externo',305.9375,21000]]) {
  const node=scene.getObjectByName(name),triangles=topTriangles(node);
  assert.equal(node.material.name,'M_Piso_Patio_Vcol');
  assert.ok(node.material.vertexColors);
  assert.ok(Math.abs(triangles.reduce((s,t)=>s+t.area,0)-area)<1e-4,name);
  assert.ok(node.geometry.index.count/3<maxTriangles,'limite de tesselação por peça');
  let samples=0,joints=0;
  for(let i=0;i<triangles.length;i+=37) {
   const t=triangles[i],p=t.vertices.reduce((sum,v)=>sum.add(v),new Vector3()).multiplyScalar(1/3);
   assert.ok(Math.abs(p.y)<1e-6,'o tile não adiciona outra camada ao piso');
   const source={x:9.5+mod(p.x-9.5,5),z:-3-mod(-p.z-3,9)};
   const expected=colorAt(reference,source),actual=t.colors[0].map((_,k)=>t.colors.reduce((s,c)=>s+c[k],0)/3);
   assert.ok(expected,JSON.stringify(source));
   actual.forEach((c,k)=>assert.ok(Math.abs(c-expected[k])<0.003,`${name}: cor ${c} != ${expected[k]} em ${p.x},${p.z}`));
   if(expected[0]<0.12)joints++;
   samples++;
  }
  assert.ok(samples>70&&joints>5,`${name}: amostra cobre placas e juntas`);
  // A junta de 30 mm coincide com o pátio em ambos os eixos da grade mundial.
  for(const delta of [0.005,0.014,0.016,0.04]) {
   const color=colorAt(reference,{x:10.75+delta,z:-6.3});
   assert.ok(delta<0.015?color[0]<0.12:color[0]>0.25);
  }
 }
});

test('S6.12: faces do piso com tile não se sobrepõem nem dividem plano com arquitetura',async()=>{
 const report=coplanarFloorSurfaces(await scenePromise);
 assert.equal(report.trianglePairs,0,JSON.stringify(report.pairs));
 // Uma camada duplicada seria detectada mesmo usando o mesmo material do tile.
 const scene=new Group(),floor=new Mesh(new PlaneGeometry(2,2),new MeshStandardMaterial({name:'Tile'}));
 floor.rotation.x=-Math.PI/2;floor.userData.colony_name='ARQ_Piso_Passarelas';scene.add(floor);
 const overlay=floor.clone();overlay.userData={colony_name:'ARQ_Piso_Externo'};scene.add(overlay);
 assert.ok(coplanarFloorSurfaces(scene).trianglePairs>0);
 overlay.position.x=2;assert.equal(coplanarFloorSurfaces(scene).trianglePairs,0);
});
