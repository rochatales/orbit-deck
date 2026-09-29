import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
// Only label drawing is stubbed: floor shapes and collision rectangles are the production geometry.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
const {createWorld:createMars}=loadSource('src/game/marsWorld.ts');
const {createWorld:createShanghai}=loadSource('src/game/shanghaiWorld.ts');
const {MAPS,INITIAL_POSITION,EDEN}=loadSource('src/game/config.ts');
const {circleIntersectsRect}=loadSource('src/utils/math.ts');
function traversable(world,x,z){return world.walkableAreas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ)&&!world.obstacles.some(a=>circleIntersectsRect(x,z,0.36,a));}
function reachable(world,start,target,radius=0.5){
 const step=0.25;const queue=[[start.x,start.z]],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];if(Math.hypot(x-target.x,z-target.z)<=radius)return true;
  for(const [dx,dz]of[[step,0],[-step,0],[0,step],[0,-step]]){
   const nx=Math.round((x+dx)*100)/100,nz=Math.round((z+dz)*100)/100,k=`${nx},${nz}`;
   if(seen.has(k)||nx<world.bounds.minX||nx>world.bounds.maxX||nz<world.bounds.minZ||nz>world.bounds.maxZ)continue;
   seen.add(k);if(traversable(world,nx,nz))queue.push([nx,nz]);
  }
 }return false;
}
test('Marte: spawn → EDEN and launch deck are connected with player clearance',()=>{
 const world=createMars();assert.ok(traversable(world,INITIAL_POSITION.x,INITIAL_POSITION.z),'initial spawn overlaps an obstacle');
 assert.ok(reachable(world,INITIAL_POSITION,EDEN.position,2.3),'EDEN unreachable');
 assert.ok(reachable(world,INITIAL_POSITION,MAPS.mars.exit),'launch deck unreachable');
 assert.ok(reachable(world,MAPS.mars.exit,{x:6.5,z:-10},3),'laboratory unreachable after return');
});
test('Shanghai: disembark point and streets are reachable and within bounds',()=>{
 const world=createShanghai();assert.ok(traversable(world,MAPS.shanghai.exit.x,MAPS.shanghai.exit.z));
 for(const point of [{x:0,z:-14},{x:-5,z:-5},{x:5,z:5},{x:-14,z:-16}])assert.ok(reachable(world,MAPS.shanghai.exit,point),JSON.stringify(point));
});
