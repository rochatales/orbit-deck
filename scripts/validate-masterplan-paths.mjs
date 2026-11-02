/** Geometria apenas: flood fill conservador de 5 cm, cápsula com raio de 36 cm. */
import fs from 'node:fs';
import { loadSource } from '../tests/load-source.mjs';
const { createWorld } = loadSource('src/game/marsWorld.ts');
const { MAPS, INITIAL_POSITION, EDEN } = loadSource('src/game/config.ts');
const world=createWorld(),step=.05,radius=.36,b=world.bounds;
const nx=Math.round((b.maxX-b.minX)/step)+1,nz=Math.round((b.maxZ-b.minZ)/step)+1;
const floor=new Uint8Array(nx*nz),blocked=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz);
const index=(x,z)=>Math.round((z-b.minZ)/step)*nx+Math.round((x-b.minX)/step);
const rectIndices=r=>[Math.max(0,Math.ceil((r.minX-b.minX)/step-1e-6)),Math.min(nx-1,Math.floor((r.maxX-b.minX)/step+1e-6)),Math.max(0,Math.ceil((r.minZ-b.minZ)/step-1e-6)),Math.min(nz-1,Math.floor((r.maxZ-b.minZ)/step+1e-6))];
for(const r of world.walkableAreas){const[x0,x1,z0,z1]=rectIndices(r);for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)floor[z*nx+x]=1;}
// Conservative square dilation of obstacles covers the whole capsule and swept grid step.
for(const r of world.obstacles){const[x0,x1,z0,z1]=rectIndices({minX:r.minX-radius-step/2,maxX:r.maxX+radius+step/2,minZ:r.minZ-radius-step/2,maxZ:r.maxZ+radius+step/2});for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)blocked[z*nx+x]=1;}
// Summed-area table ensures every cell under a 0.72m square footprint has floor, including seams.
const stride=nx+1,integral=new Int32Array((nx+1)*(nz+1));
for(let z=0;z<nz;z++){let row=0;for(let x=0;x<nx;x++){row+=floor[z*nx+x];integral[(z+1)*stride+x+1]=integral[z*stride+x+1]+row;}}
const pad=Math.ceil(radius/step);
for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
 const i=z*nx+x;if(blocked[i]||!floor[i])continue;
 if(x<pad||z<pad||x+pad>=nx||z+pad>=nz){blocked[i]=1;continue;}
 const a=x-pad,c=z-pad,d=x+pad+1,e=z+pad+1;
 const count=integral[e*stride+d]-integral[c*stride+d]-integral[e*stride+a]+integral[c*stride+a];
 if(count!==(2*pad+1)**2)blocked[i]=1;
}
const queue=new Int32Array(nx*nz),start=index(INITIAL_POSITION.x,INITIAL_POSITION.z);let tail=0;
if(floor[start]&&!blocked[start]){queue[tail++]=start;seen[start]=1;}
for(let head=0;head<tail;head++){const i=queue[head],x=i%nx;for(const j of[i-nx,i+nx,...(x>0?[i-1]:[]),...(x<nx-1?[i+1]:[])])if(j>=0&&j<seen.length&&!seen[j]&&floor[j]&&!blocked[j]){seen[j]=1;queue[tail++]=j;}}
const targets=[['EDEN',EDEN.position.x,EDEN.position.z,1.8],['LAB',10.5,-10.5,1.8],['DATA',-10.5,0,1.8],['QUARTERS',10.5,0,1.8],['WAR',-10.5,8.5,1.8],['WORKSHOP',10.5,8.5,1.8],['CARGO',0,14.5,2],['FOOD',7.2,15,1.3],['BUILD_A',18,2,.1],['BUILD_B',-10,24,.1],['GREENHOUSE',14,22.5,.1],['EMBARQUE',MAPS.mars.exit.x,MAPS.mars.exit.z,.1],['GREENHOUSE_EAST',20.7,22.5,.1],['TANK_WEST',12,27,.1],['TANK_EAST',18.5,27,.1],['TANK_SOUTH',16,28.5,.1]];
const results=targets.map(([id,x,z,tolerance])=>{let nearest=Infinity;for(let q=0;q<tail;q++){const i=queue[q],px=b.minX+(i%nx)*step,pz=b.minZ+Math.floor(i/nx)*step;nearest=Math.min(nearest,Math.hypot(px-x,pz-z));}return{id,reachable:nearest<=tolerance,nearestDistance:nearest,tolerance};});
const report={step,radius,method:'Inflacao quadrada conservadora; erosao do piso pela uniao; flood-fill 4 direcoes',reachableArea:tail*step*step,spawnClear:!!seen[start],destinations:results};
fs.writeFileSync(process.argv[2]??'art-source/mars-masterplan-v007/notas/alcancabilidade.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!report.spawnClear||results.some(r=>!r.reachable))process.exitCode=1;
