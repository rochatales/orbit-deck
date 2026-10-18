// Auditoria geométrica: só conta área positiva sobreposta, nunca arestas compartilhadas.
import { Vector3 } from 'three';
function cross(a, b, p) { return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]); }
function overlap(a, b) {
 let polygon = a;
 const sign = Math.sign(cross(b[0], b[1], b[2]));
 for (let k=0;k<3 && polygon.length;k++) {
  const p=b[k],q=b[(k+1)%3],input=polygon; polygon=[];
  for(let i=0;i<input.length;i++) {
   const s=input[i],e=input[(i+1)%input.length],ds=sign*cross(p,q,s),de=sign*cross(p,q,e);
   if(ds>=0)polygon.push(s);
   if((ds>=0)!==(de>=0)) {const t=ds/(ds-de);polygon.push([s[0]+t*(e[0]-s[0]),s[1]+t*(e[1]-s[1])]);}
  }
 }
 return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
}
export function coplanarProps(scene) {
 scene.updateMatrixWorld(true);
 const triangles=[],a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3(),edge=new Vector3();
 const roots=[];scene.traverseVisible(n=>{if((n.userData.colony_name??n.name).startsWith('PROP_') && n.userData.colony_name)roots.push(n);});
 for(const root of roots)root.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
  for(let i=0;i<(idx?idx.count:p.count);i+=3) {
   [a,b,c].forEach((v,j)=>v.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
   normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
   if(normal.lengthSq()<0.5)continue;
   const abs=normal.toArray().map(Math.abs),axis=abs.indexOf(Math.max(...abs));
   if(normal.getComponent(axis)<0)normal.negate();
   const axes=[0,1,2].filter(k=>k!==axis);
   triangles.push({name:root.userData.colony_name,mesh:mesh.name,material:mesh.material.name,
    facing:Math.sign(new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a)).getComponent(axis)),normal:normal.clone(),d:normal.dot(a),axis,points:[a,b,c].map(v=>axes.map(k=>v.getComponent(k))),
    min:[0,1,2].map(k=>Math.min(a.getComponent(k),b.getComponent(k),c.getComponent(k))),
    max:[0,1,2].map(k=>Math.max(a.getComponent(k),b.getComponent(k),c.getComponent(k)))});
  }
 });
 const pairs=new Map();
 for(let i=0;i<triangles.length;i++)for(let j=i+1;j<triangles.length;j++) {
  const a=triangles[i],b=triangles[j];
  if(a.facing!==b.facing || a.axis!==b.axis || a.min.some((v,k)=>v>b.max[k]+1e-5||b.min[k]>a.max[k]+1e-5))continue;
  if(a.normal.dot(b.normal)<1-1e-10||Math.abs(a.d-b.d)>1e-5)continue;
  const area=overlap(a.points,b.points);
  if(area<1e-7)continue;
  const key=[a.name,b.name,a.material,b.material].join('|');
  const r=pairs.get(key)??{parts:[a.name,b.name],materials:[a.material,b.material],trianglePairs:0,projectedArea:0,planes:[]};
  r.trianglePairs++;r.projectedArea+=area;const plane=[a.axis,a.facing,+a.d.toFixed(5)].join(',');if(!r.planes.includes(plane))r.planes.push(plane);pairs.set(key,r);
 }
 return {props:roots.length,triangles:triangles.length,trianglePairs:[...pairs.values()].reduce((s,r)=>s+r.trianglePairs,0),pairs:[...pairs.values()]};
}
