import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {createPhase01Terrain,SHANGHAI_PHASE01:d,isLandingReserved}=loadSource('src/game/shanghai/layout.ts');
const {Navigation,traversable,clearSegment}=loadSource('src/combat/navigation.ts');
const {cameraFit,SHANGHAI_FRAMING}=loadSource('src/scene/cameraFraming.ts');
const world=createPhase01Terrain();
test('S6.3: limites, pouso e reservas sem spawns',()=>{
 assert.deepEqual({...world.bounds},{minX:-51,maxX:51,minZ:-54,maxZ:54});
 assert.ok(traversable(d.exit,world,.36));assert.equal(d.ship.x,0);assert.equal(d.ship.z,13);
 assert.equal(d.spawns.length,32);assert.equal(d.loot.length,8);
 for(const p of d.spawns){assert.ok(!isLandingReserved(p.x,p.z,.42),p.id);assert.ok(traversable(p,world,.42),p.id);}
});
test('S6.3: todos os destinos e patrulhas conectados ao desembarque com folga',()=>{
 const nav=new Navigation(world,.36,.5);
 for(const p of [...d.spawns,...d.loot,...d.routes.flat(),...d.patrolRoutes.flat()]){
  assert.ok(traversable(p,world,.36),JSON.stringify(p));const route=nav.path(d.exit,p);
  assert.ok(route.length,JSON.stringify(p));let prev=d.exit;
  for(const q of route){assert.ok(clearSegment(prev,q,world,.36));prev=q;}
 }
 for(const route of d.patrolRoutes)for(let i=0;i<route.length;i++) assert.ok(clearSegment(route[i],route[(i+1)%route.length],world,.42),'patrulha cruza obstáculo');
});
test('S6.3: zoom antigo de Shanghai e enquadramento de Marte preservados',()=>{
 const old={minX:-17,maxX:17,minZ:-18,maxZ:18};
 assert.equal(cameraFit(1280,800,old),cameraFit(1280,800,world.bounds,SHANGHAI_FRAMING));
 const mars={minX:-22,maxX:22,minZ:-15,maxZ:39};
 assert.equal(cameraFit(1280,800,mars),Math.min(1280/35.2,800/35.1));
});
test('S6.3: peças de 0,26 a 1,55 m estão contidas em colisores simples',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=JSON.parse(readFileSync('art-source/shanghai-fase01/export/layout.json','utf8'));
 const contains=(x,z)=>source.obstacles.some(o=>x>=o.minX-1e-6&&x<=o.maxX+1e-6&&z>=o.minZ-1e-6&&z<=o.maxZ+1e-6);
 for(const p of source.parts){
  if(p.y+p.h/2<=.26||p.y-p.h/2>1.55)continue;
  for(const [x,z] of [[0,0],[-p.w/2,-p.d/2],[-p.w/2,p.d/2],[p.w/2,-p.d/2],[p.w/2,p.d/2]])
   assert.ok(contains(p.x+x*Math.cos(p.angle)+z*Math.sin(p.angle),p.z-x*Math.sin(p.angle)+z*Math.cos(p.angle)),p.id);
 }
 for(const o of source.obstacles)assert.ok(source.parts.some(p=>p.id===o.source),o.id);
});
