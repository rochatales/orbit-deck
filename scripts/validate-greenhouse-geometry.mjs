/** Auditoria do GLB real: todos os estados, faces nos dois sentidos e folgas de vidro. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Vector3, Triangle} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length2=a=>dot(a,a);
const addScaled=(a,b,t)=>a.map((v,i)=>v+b[i]*t);
const cross2=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);

function projectedOverlap(a,b) {
 let polygon=a,sign=Math.sign(cross2(b[0],b[1],b[2]));
 for(let k=0;k<3&&polygon.length;k++) {
  const p=b[k],q=b[(k+1)%3],input=polygon;polygon=[];
  for(let i=0;i<input.length;i++) {
   const s=input[i],e=input[(i+1)%input.length],ds=sign*cross2(p,q,s),de=sign*cross2(p,q,e);
   if(ds>=0)polygon.push(s);
   if((ds>=0)!==(de>=0)){const t=ds/(ds-de);polygon.push([s[0]+t*(e[0]-s[0]),s[1]+t*(e[1]-s[1])]);}
  }
 }
 return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
}

/** Sem traverseVisible: gelo/plantas inicialmente ocultos também precisam ser auditados. */
export function collectGreenhouseTriangles(scene) {
 scene.updateMatrixWorld(true);
 const triangles=[],ids=new Set(),a=new Vector3(),b=new Vector3(),c=new Vector3();
 scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  let owner=mesh;while(owner&&!owner.userData.id_estavel)owner=owner.parent;
  if(!owner)return;
  const id=owner.userData.id_estavel;ids.add(id);
  const pos=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let i=0;i<(index?index.count:pos.count);i+=3) {
   const vertices=[a,b,c].map((v,k)=>v.fromBufferAttribute(pos,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld).toArray());
   let normal=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]));const magnitude=Math.sqrt(length2(normal));
   if(magnitude<1e-12)continue;
   normal=normal.map(v=>v/magnitude);const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),facing=Math.sign(normal[axis]);
   if(facing<0)normal=normal.map(v=>-v);
   const axes=[0,1,2].filter(k=>k!==axis);
   triangles.push({id,vertices,normal,axis,facing,d:dot(normal,vertices[0]),points:vertices.map(v=>axes.map(k=>v[k])),min:[0,1,2].map(k=>Math.min(...vertices.map(v=>v[k]))),max:[0,1,2].map(k=>Math.max(...vertices.map(v=>v[k])))});
  }
 });
 return {ids,triangles};
}

/** Inclui normais opostas: materiais double-sided não tornam uma coincidência segura. */
export function greenhouseCoplanarity(triangles,{planeTolerance=1e-5,minimumArea=1e-5}={}) {
 const sorted=[...triangles].sort((a,b)=>a.min[0]-b.min[0]),pairs=new Map();
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++) {
  const a=sorted[i],b=sorted[j];if(b.min[0]>a.max[0]+planeTolerance)break;
  if(a.axis!==b.axis||a.min.some((v,k)=>v>b.max[k]+planeTolerance||b.min[k]>a.max[k]+planeTolerance))continue;
  if(dot(a.normal,b.normal)<1-1e-10||Math.abs(a.d-b.d)>planeTolerance)continue;
  const area=projectedOverlap(a.points,b.points);if(area<1e-7)continue;
  const ids=[a.id,b.id].sort(),key=ids.join('|');
  const pair=pairs.get(key)??{parts:ids,trianglePairs:0,opposedTrianglePairs:0,projectedArea:0};
  pair.trianglePairs++;if(a.facing!==b.facing)pair.opposedTrianglePairs++;pair.projectedArea+=area;pairs.set(key,pair);
 }
 const positivePairs=[...pairs.values()].filter(pair=>pair.projectedArea>=minimumArea);
 return {planeTolerance,minimumPairArea:minimumArea,trianglePairs:positivePairs.reduce((n,p)=>n+p.trianglePairs,0),pairs:positivePairs};
}

function segmentSegmentDistanceSquared(p1,q1,p2,q2) {
 const d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=length2(d1),e=length2(d2),f=dot(d2,r);let s,t;
 if(a<=1e-18&&e<=1e-18)return length2(r);
 if(a<=1e-18){s=0;t=Math.max(0,Math.min(1,f/e));}
 else {const c=dot(d1,r);if(e<=1e-18){t=0;s=Math.max(0,Math.min(1,-c/a));}
  else {const b=dot(d1,d2),den=a*e-b*b;s=den!==0?Math.max(0,Math.min(1,(b*f-c*e)/den)):0;t=(b*s+f)/e;
   if(t<0){t=0;s=Math.max(0,Math.min(1,-c/a));}else if(t>1){t=1;s=Math.max(0,Math.min(1,(b-c)/a));}
  }
 }
 return length2(sub(addScaled(p1,d1,s),addScaled(p2,d2,t)));
}

function segmentIntersectsTriangle(p,q,t) {
 const dir=sub(q,p),e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(dir,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-12)return false;
 const inv=1/det,s=sub(p,t[0]),u=inv*dot(s,h);if(u<0||u>1)return false;
 const v=inv*dot(dir,cross(s,e1));if(v<0||u+v>1)return false;
 const distance=inv*dot(e2,cross(s,e1));return distance>=0&&distance<=1;
}

/** Distância euclidiana superfície↔superfície; não apenas distância de centros/AABB. */
export function triangleDistanceSquared(a,b) {
 const va=a.map(v=>new Vector3(...v)),vb=b.map(v=>new Vector3(...v)),ta=new Triangle(...va),tb=new Triangle(...vb),nearest=new Vector3();let best=Infinity;
 for(let i=0;i<3;i++) {
  if(segmentIntersectsTriangle(a[i],a[(i+1)%3],b)||segmentIntersectsTriangle(b[i],b[(i+1)%3],a))return 0;
  best=Math.min(best,ta.closestPointToPoint(vb[i],nearest).distanceToSquared(vb[i]),tb.closestPointToPoint(va[i],nearest).distanceToSquared(va[i]));
  for(let j=0;j<3;j++)best=Math.min(best,segmentSegmentDistanceSquared(a[i],a[(i+1)%3],b[j],b[(j+1)%3]));
 }
 return best;
}

function aabbDistanceSquared(a,b) {return [0,1,2].reduce((s,k)=>s+Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])**2,0);}

export function greenhouseClearances(triangles,specifications,tolerance=2e-5) {
 const byId=new Map();for(const t of triangles){if(!byId.has(t.id))byId.set(t.id,[]);byId.get(t.id).push(t);}
 const results=[];
 for(const spec of specifications) {
  if(!byId.has(spec.panelId)||!spec.otherIds.length)throw Error('Painel/interface de folga ausente: '+spec.panelId);
  for(const otherId of spec.otherIds) {
   if(!byId.has(otherId))throw Error('Suporte de folga ausente: '+otherId);
   let best=Infinity;
   for(const a of byId.get(spec.panelId))for(const b of byId.get(otherId)) {
    if(aabbDistanceSquared(a,b)>=best)continue;
    best=Math.min(best,triangleDistanceSquared(a.vertices,b.vertices));
   }
   const measured=Math.sqrt(best),minimum=spec.minimum??.002;
   results.push({panelId:spec.panelId,otherId,minimum,measured,pass:measured+tolerance>=minimum});
  }
 }
 return {tolerance,minimumRequested:.002,interfaces:results,failures:results.filter(r=>!r.pass)};
}

export async function auditGreenhouse(glbPath='src/assets/greenhouse/greenhouse-v001.glb',manifestPath='src/assets/greenhouse/greenhouse-v001.manifest.json') {
 const bytes=fs.readFileSync(glbPath),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const {triangles,ids}=collectGreenhouseTriangles(scene);
 return {parts:ids.size,triangles:triangles.length,states:'OFFLINE e ONLINE, sem filtro de visibilidade',coplanarity:greenhouseCoplanarity(triangles),clearance:greenhouseClearances(triangles,manifest.clearances??[])};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const report=await auditGreenhouse(),output='art-source/greenhouse-v001/notas/auditoria-geometria.json';
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({parts:report.parts,triangles:report.triangles,coplanarPairs:report.coplanarity.pairs.length,clearanceInterfaces:report.clearance.interfaces.length,clearanceFailures:report.clearance.failures},null,2));
 if(report.coplanarity.pairs.length||report.clearance.failures.length||!report.clearance.interfaces.length)process.exitCode=1;
}
