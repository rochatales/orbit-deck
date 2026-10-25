// QA assistido em fixture dev: confere carregamento/modelos/coleta, não aprova jogabilidade.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s6.1-patrol-grande-recursos/evidencias';
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
const report={base:'a15af914440577ed1b4e26bdeb44e6dd727a06c8',metodo:'Fixture dev, Chromium headless GPU, 1440×900 DPR 1; salto assistido às hordas 3/4 e reposição assistida para inspeção/coleta. Não é playtest, benchmark ou aceite do autor.',errors:[],waves:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${process.env.HORDA_QA_ORIGIN??'http://127.0.0.1:5193'}/tests/shanghai-phase01.html`);
 await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
 await page.waitForTimeout(3000);
 await page.evaluate(async()=>{const {useCombatStore:c}=await import('/src/state/useCombatStore.ts');const{useExpeditionStore:e}=await import('/src/state/useExpeditionStore.ts');c.getState().selectEncounter('hordas');e.getState().restartMission()});
 await page.waitForFunction(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');return r.simulation?.waves.length===4&&!document.querySelector('[role=status]')},null,{timeout:60000});
 await page.evaluate(async()=>{const source=await(await fetch('/src/app/GameCanvas.tsx')).text();const{_roots}=await import(source.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.resourceRoot=[..._roots.values()][0].store;window.__shanghaiQA.place(-17.5,9.5,Math.PI/4)});await page.waitForTimeout(1200);
 await page.evaluate(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');const{playerPosition}=await import('/src/state/playerTransient.ts');const s=r.simulation;s.robots.forEach(v=>v.hp=0);s.wave=2;s.waveLeft=.0001;s.hp=100;s.step(1/60,{player:playerPosition,aim:{x:0,z:0},firing:false,reload:false});const large=s.robots.find(v=>v.kind==='largePatrol'),normal=s.robots.find(v=>v.kind==='patrol');Object.assign(large,{x:-20,z:3,path:[],repath:0});Object.assign(normal,{x:-14,z:6,path:[],repath:0});Object.assign(s.drops[0],{x:-19.5,z:10,kind:'metals',active:true,spawned:true});Object.assign(s.drops[1],{x:-15.5,z:10,kind:'titanium',active:true,spawned:true})});
 await page.waitForTimeout(1400);
 async function inspect(){return await page.evaluate(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');const s=r.simulation,scene=window.resourceRoot.getState().scene,visible={};scene.traverseVisible(o=>{if(o.isSkinnedMesh)visible[o.name]=(visible[o.name]??0)+1});return{wave:s.wave,total:s.alive,large:s.robots.filter(v=>v.hp>0&&v.kind==='largePatrol').length,visible,titaniumInstances:scene.getObjectByName('TitaniumDrops')?.count,snapshot:s.snapshot}})}
 report.waves.push(await inspect());assert.equal(report.waves[0].total,30);assert.equal(report.waves[0].large,5);assert.equal(report.waves[0].visible.LargePatrolUnitMesh,5);assert.equal(report.waves[0].visible.IronCollectibleMesh,1);assert.equal(report.waves[0].visible.CopperCollectibleMesh,1);assert.equal(report.waves[0].titaniumInstances,1);
 await page.screenshot({path:`${out}/horda-3-recursos.png`});
 await page.evaluate(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');r.simulation.robots.forEach(v=>v.hp=0);r.simulation.waveLeft=100;window.__shanghaiQA.place(-19.5,10,Math.PI/4)});await page.waitForTimeout(500);
 report.collectMetals=await inspect();assert.equal(report.collectMetals.snapshot.iron,1);assert.equal(report.collectMetals.snapshot.copper,1);assert.equal(report.collectMetals.snapshot.titanium,0);
 await page.evaluate(()=>window.__shanghaiQA.place(-15.5,10,Math.PI/4));await page.waitForTimeout(500);report.collectTitanium=await inspect();assert.equal(report.collectTitanium.snapshot.titanium,1);
 await page.evaluate(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');const{playerPosition}=await import('/src/state/playerTransient.ts');r.simulation.waveLeft=.0001;r.simulation.step(1/60,{player:playerPosition,aim:{x:0,z:0},firing:false,reload:false})});await page.waitForTimeout(300);
 report.waves.push(await inspect());assert.equal(report.waves[1].total,40);assert.equal(report.waves[1].large,10);assert.equal(report.waves[1].visible.LargePatrolUnitMesh,10);
 await page.screenshot({path:`${out}/horda-4-hud.png`});assert.deepEqual(report.errors,[]);
 fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
