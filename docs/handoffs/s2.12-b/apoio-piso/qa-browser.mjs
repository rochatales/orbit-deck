import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const stage=process.argv[2]??'depois',out='docs/handoffs/s2.12-b/apoio-piso',report={stage,method:'Fixture técnica: slots isolados e imóveis no mesmo ponto de calçada, câmera próxima; não é aceite do autor.',errors:[],types:{}};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
try{
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
await page.goto('http://127.0.0.1:5196/tests/shanghai-phase01.html');await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
await page.evaluate(async()=>{window.cs=await import('/src/state/useCombatStore.ts');window.es=await import('/src/state/useExpeditionStore.ts');window.gs=await import('/src/state/useGameStore.ts');cs.useCombatStore.getState().selectEncounter('hordas');es.useExpeditionStore.getState().restartMission()});
await page.waitForFunction(()=>cs.combatRuntime.simulation?.waves[0]===13,null,{timeout:60000});await page.evaluate(()=>window.__shanghaiQA.place(-22,5,Math.PI/4));await page.waitForTimeout(1500);
await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();const{_roots}=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.root=[..._roots.values()][0].store;gs.useGameStore.getState().setZoom(80);const s=cs.combatRuntime.simulation;s.step=()=>{};s.robots.forEach(r=>{r.spawned=false;r.hp=0})});
for(const[kind,slot]of[['patrol',0],['largePatrol',3],['smallMutant',4]]){
await page.evaluate(({kind,slot})=>{const s=cs.combatRuntime.simulation;s.robots.forEach(r=>r.spawned=false);Object.assign(s.robots[slot],{kind,x:-24.8,z:5,hp:75,spawned:true,generation:s.robots[slot].generation+1,angle:Math.PI/4,pace:0});},{kind,slot});
await page.waitForTimeout(1000);
report.types[kind]=await page.evaluate(()=>{const scene=root.getState().scene;let y=null;scene.traverseVisible(o=>{if(o.type==='Group'&&Math.abs(o.position.x+24.8)<.001&&Math.abs(o.position.z-5)<.001)y=o.position.y});return{y}});
await page.screenshot({path:`${out}/${kind}-${stage}.png`});
}
if(stage==='depois') {
 report.support=[];
 for(const[kind,slot]of[['patrol',0],['largePatrol',3],['smallMutant',4]])for(const[x,z,h]of[[-17.5,10,0],[-24.8,5,.12],[-44.55,-28.9,.148],[-44.144267376547816,-27.661831820686604,.25]]){
  await page.evaluate(({kind,slot,x,z})=>{const s=cs.combatRuntime.simulation;s.robots.forEach(r=>r.spawned=false);Object.assign(s.robots[slot],{kind,x,z,hp:75,spawned:true,generation:s.robots[slot].generation+1,pace:0});},{kind,slot,x,z});
  await page.waitForTimeout(200);
  const y=await page.evaluate(({x,z})=>{let y=null;root.getState().scene.traverseVisible(o=>{if(o.type==='Group'&&Math.abs(o.position.x-x)<1e-6&&Math.abs(o.position.z-z)<1e-6)y=o.position.y});return y;},{x,z});
  assert.ok(Math.abs(y-h)<1e-5);report.support.push({kind,x,z,expected:h,y});
 }
 report.player=[];
 for(const[x,z,h]of[[-17.5,10,0],[-24.8,5,.12],[-44.55,-28.9,.148],[-44.144267376547816,-27.661831820686604,.25]]){
  await page.evaluate(({x,z})=>window.__shanghaiQA.place(x,z,Math.PI/4),{x,z});await page.waitForTimeout(1000);
  const y=await page.evaluate(()=>{const r=root.getState().scene.getObjectByName('PlayerRifle');r.updateWorldMatrix(true,false);return r.matrixWorld.elements[13]-.85;});
  assert.ok(Math.abs(y-h)<1e-4,`player ${x},${z}: ${y} != ${h}`);report.player.push({x,z,expected:h,y});
 }
}
assert.deepEqual(report.errors,[]);fs.writeFileSync(`${out}/${stage}.json`,JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close()}
