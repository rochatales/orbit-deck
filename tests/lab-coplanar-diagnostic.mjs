/** Diagnóstico geométrico, não teste visual: interseção de triângulos coplanares de mesma face. */
import { Vector3 } from 'three';
export function coplanarOverlaps(mesh) {
 const index=mesh.geometry.index,p=mesh.geometry.attributes.position,groups=new Map(),v=new Vector3();mesh.updateMatrixWorld(true);mesh.skeleton?.update();
 for(let t=0;t<(index?.count??p.count);t+=3){const ps=[0,1,2].map(k=>mesh.getVertexPosition(index?index.getX(t+k):t+k,new Vector3()).applyMatrix4(mesh.matrixWorld));const n=new Vector3().subVectors(ps[1],ps[0]).cross(v.subVectors(ps[2],ps[0]));if(n.length()<1e-9)continue;n.normalize();const d=n.dot(ps[0]),key=[n.x,n.y,n.z,d].map(x=>x.toFixed(4)).join('/'),axis=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)].indexOf(Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z))),axes=[0,1,2].filter(x=>x!==axis),pts=ps.map(p=>axes.map(a=>p.getComponent(a)));if(!groups.has(key))groups.set(key,[]);groups.get(key).push({triangle:t/3,ps,pts,n,key});}
 const area=poly=>Math.abs(poly.reduce((a,p,i)=>{const q=poly[(i+1)%poly.length];return a+p[0]*q[1]-q[0]*p[1]},0))/2;
 function intersect(subject,clip){let poly=subject;const sign=clip.reduce((a,p,i)=>{const q=clip[(i+1)%clip.length];return a+p[0]*q[1]-q[0]*p[1]},0)>0?1:-1;
  for(let i=0;i<3&&poly.length;i++){const a=clip[i],b=clip[(i+1)%3],dist=p=>sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])),out=[];
   for(let j=0;j<poly.length;j++){const p=poly[j],q=poly[(j+1)%poly.length],dp=dist(p),dq=dist(q);if(dp>=-1e-10)out.push(p);if(dp*dq<0){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}poly=out;}return poly;}
 const overlaps=[];
 for(const tris of groups.values())for(let i=0;i<tris.length;i++)for(let j=i+1;j<tris.length;j++){const a=tris[i],b=tris[j];if([0,1].some(k=>Math.max(...a.pts.map(p=>p[k]))<Math.min(...b.pts.map(p=>p[k]))||Math.max(...b.pts.map(p=>p[k]))<Math.min(...a.pts.map(p=>p[k]))))continue;const overlap=area(intersect(a.pts,b.pts));if(overlap>1e-7)overlaps.push({a:a.triangle,b:b.triangle,area:overlap,plane:a.key,points:a.ps.map(p=>p.toArray())});}
 return overlaps;
}
