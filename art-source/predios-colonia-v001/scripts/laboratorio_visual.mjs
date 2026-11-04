/** Derivação visual cirúrgica do GLB aprovado: recorte 2D das faces que disputavam o mesmo plano.
 * Preserva fontes, texturas, nós, rig, clipes, volumes e bytes originais de animação.
 * node art-source/predios-colonia-v001/scripts/laboratorio_visual.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Vector3 } from 'three';
import { loadGlb } from '../../../tests/load-glb.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
process.chdir(root);
const source='src/assets/laboratorio/laboratorio-v002.glb', target='src/assets/laboratorio/laboratorio-visual-v003.glb';
const bytes=fs.readFileSync(source), jsonLength=bytes.readUInt32LE(12), doc=JSON.parse(bytes.subarray(20,20+jsonLength));
const oldBin=bytes.subarray(28+jsonLength,28+jsonLength+bytes.readUInt32LE(20+jsonLength));
const gltf=await loadGlb(source);gltf.scene.updateMatrixWorld(true);
const mesh=gltf.scene.getObjectByName('LaboratorySynthesizerMesh');mesh.skeleton.update();
const attrs=mesh.geometry.attributes,index=mesh.geometry.index,normal=new Vector3(),delta=new Vector3();
const geometry=doc.meshes[doc.nodes.find(n=>n.name==='LaboratorySynthesizerMesh').mesh].primitives[0];
const triangles=[], groups=new Map();
export function affected(n,p) {
 if(n.y>.9999&&Math.abs(p.y-.002)<1e-5)return 'faixa_piso';
 if(n.z<-.9999&&Math.abs(p.z-1.04)<1e-5)return 'anel_porta';
 if(Math.abs(n.x)>.9999&&Math.abs(Math.abs(p.x)-1.49)<1e-5)return 'tampas_laterais';
 if(n.y>.9999&&Math.abs(p.y-3.6)<1e-5)return 'cantos_parede';
 return null;
}
const area=poly=>Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.xy[0]*q.xy[1]-q.xy[0]*p.xy[1]},0))/2;
const lerp=(a,b,t)=>({xy:a.xy.map((v,k)=>v+(b.xy[k]-v)*t),weights:a.weights.map((v,k)=>v+(b.weights[k]-v)*t)});
function halfPlane(poly,a,b,sign,inside) {
 const dist=p=>{const d=sign*((b[0]-a[0])*(p.xy[1]-a[1])-(b[1]-a[1])*(p.xy[0]-a[0]));return Math.abs(d)<1e-10?0:d},out=[];
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=dist(p),dq=dist(q);if(inside?dp>=0:dp<=0)out.push(p);if(dp*dq<0)out.push(lerp(p,q,dp/(dp-dq)));}
 return out;
}
function subtract(poly,clip) {
 const sign=clip.reduce((s,p,i)=>{const q=clip[(i+1)%3];return s+p.xy[0]*q.xy[1]-q.xy[0]*p.xy[1]},0)>0?1:-1,out=[];
 let current=poly;
 for(let k=0;k<3&&current.length;k++){
  const a=clip[k].xy,b=clip[(k+1)%3].xy,outside=halfPlane(current,a,b,sign,false);
  if(outside.length>=3&&area(outside)>1e-10)out.push(outside);
  current=halfPlane(current,a,b,sign,true);
 }
 return out;
}
for(let t=0;t<index.count;t+=3){
 const ids=[0,1,2].map(k=>index.getX(t+k)),ps=ids.map(i=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));
 normal.subVectors(ps[1],ps[0]).cross(delta.subVectors(ps[2],ps[0])).normalize();
 const kind=affected(normal,ps[0]),axis=[Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z)].indexOf(Math.max(Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z))),axes=[0,1,2].filter(k=>k!==axis);
 const triangle={id:t/3,ids,kind,poly:ps.map((p,i)=>({xy:axes.map(k=>p.getComponent(k)),weights:[0,1,2].map(k=>i===k?1:0)}))};triangles.push(triangle);
 if(!kind)continue;
 const bone=attrs.skinIndex.getX(ids[0]);
 if(!ids.every(i=>attrs.skinIndex.getX(i)===bone&&attrs.skinWeight.getX(i)>.99999))throw Error('Correção exige grupo rígido íntegro');
 const key=kind+'/'+bone+'/'+[normal.x,normal.y,normal.z,normal.dot(ps[0])].map(x=>Math.abs(x)<1e-5?'0':x.toFixed(5)).join('/');
 if(!groups.has(key))groups.set(key,[]);groups.get(key).push(triangle);
}
const data=Object.fromEntries(Object.entries(attrs).map(([k,a])=>[k,Array.from(a.array)]));
const result=[],stats={};let appended=0;
const addVertex=(tri,w)=>{
 const next=data.position.length/3;
 for(const[key,a]of Object.entries(attrs))for(let k=0;k<a.itemSize;k++){
  const value=key==='skinIndex'?a.array[tri.ids[0]*a.itemSize+k]:tri.ids.reduce((sum,id,j)=>sum+w[j]*a.array[id*a.itemSize+k],0);
  data[key].push(value);
 }
 appended++;return next;
};
const modified=new Map();
for(const list of groups.values())for(let i=0;i<list.length;i++){
 const a=list[i];let polys=[a.poly];const originalArea=area(a.poly);
 for(let j=i+1;j<list.length&&polys.length;j++){
  const b=list[j];if([0,1].some(k=>Math.max(...a.poly.map(p=>p.xy[k]))<=Math.min(...b.poly.map(p=>p.xy[k]))||Math.max(...b.poly.map(p=>p.xy[k]))<=Math.min(...a.poly.map(p=>p.xy[k]))))continue;
  polys=polys.flatMap(poly=>subtract(poly,b.poly));
 }
 const remaining=polys.reduce((sum,p)=>sum+area(p),0),removed=originalArea-remaining;
 if(removed<1e-8)continue;
 const s=stats[a.kind]??={triangles_changed:0,overlap_removed_m2:0};s.triangles_changed++;s.overlap_removed_m2+=removed;
 const newIndices=[];
 for(const poly of polys){const ids=poly.map(p=>addVertex(a,p.weights));for(let k=1;k<ids.length-1;k++)newIndices.push(ids[0],ids[k],ids[k+1]);}
 modified.set(a.id,newIndices);
}
for(const tri of triangles)result.push(...(modified.get(tri.id)??tri.ids));
const buffers=[oldBin];let offset=oldBin.length;
function append(array,itemSize,componentType,type,normalized=false) {
 const padding=(4-offset%4)%4;if(padding){buffers.push(Buffer.alloc(padding));offset+=padding;}
 const block=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:block.length});buffers.push(block);offset+=block.length;
 const accessor={bufferView:view,componentType,count:array.length/itemSize,type};if(normalized)accessor.normalized=true;
 if(type==='VEC3'&&array instanceof Float32Array){accessor.min=[Infinity,Infinity,Infinity];accessor.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {const k=i%3;accessor.min[k]=Math.min(accessor.min[k],array[i]);accessor.max[k]=Math.max(accessor.max[k],array[i]);}}
 doc.accessors.push(accessor);return doc.accessors.length-1;
}
const semantics={position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',skinIndex:'JOINTS_0',skinWeight:'WEIGHTS_0',tangent:'TANGENT',color:'COLOR_0'};
for(const[key,a]of Object.entries(attrs)){
 const semantic=semantics[key];if(!semantic)throw Error('Atributo desconhecido '+key);
 const old=doc.accessors[geometry.attributes[semantic]];
 geometry.attributes[semantic]=append(new a.array.constructor(data[key]),a.itemSize,old.componentType,old.type,old.normalized);
}
geometry.indices=append(new Uint32Array(result),1,5125,'SCALAR');
doc.buffers[0].byteLength=offset;
let json=Buffer.from(JSON.stringify(doc));if(json.length%4)json=Buffer.concat([json,Buffer.alloc(4-json.length%4,32)]);
let bin=Buffer.concat(buffers);if(bin.length%4)bin=Buffer.concat([bin,Buffer.alloc(4-bin.length%4)]);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.write('JSON',16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.write('BIN\0',4);
const output=Buffer.concat([header,json,binHeader,bin]);fs.writeFileSync(target,output);fs.writeFileSync('art-source/predios-colonia-v001/export/laboratorio-visual-v003.glb',output);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.writeFileSync('art-source/predios-colonia-v001/notas/laboratorio-visual-v003.json',JSON.stringify({source,source_sha256:hash(bytes),target,sha256:hash(output),method:'Diferença poligonal no mesmo plano e grupo rígido; prioridade da última face da fonte. Sem offset, sem mover vértices existentes.',stats,triangles_before:index.count/3,triangles_after:result.length/3,vertices_appended:appended,preserved:['nós','skins','animações','texturas','volumes','vértices e atributos originais']},null,2)+'\n');
console.log(stats);
