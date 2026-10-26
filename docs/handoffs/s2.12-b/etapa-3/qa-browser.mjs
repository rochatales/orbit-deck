import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s2.12-b/etapa-3',report={base:'aa74335',method:'Fixture Shanghai, runtime/GLBs reais. Progressão acelerada até horda 4 eliminando slots entre hordas. 45 s de simulação por captura, HP restaurado, sem reposicionar inimigos. QA técnico, sem aceite visual.',errors:[],httpErrors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(r.url())});
 await page.goto('http://127.0.0.1:5196/tests/shanghai-phase01.html');await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
 await page.evaluate(async()=>{window.cs=await import('/src/state/useCombatStore.ts');window.es=await import('/src/state/useExpeditionStore.ts');window.ps=await import('/src/state/playerTransient.ts');window.gs=await import('/src/state/useGameStore.ts');cs.useCombatStore.getState().selectEncounter('hordas');es.useExpeditionStore.getState().restartMission()});
 await page.waitForFunction(()=>window.cs.combatRuntime.simulation?.waves[0]===13,null,{timeout:60000});
 await page.evaluate(()=>window.__shanghaiQA.place(0,0,0));await page.waitForTimeout(1400);
 await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();const{_roots}=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.root=[..._roots.values()][0].store;gs.useGameStore.setState({targetRotation:0});});
 await page.waitForTimeout(800);
 for(const target of [1,4]){
  report['wave'+target]=await page.evaluate(target=>{
   const s=cs.combatRuntime.simulation,p=ps.playerPosition,input={player:p,aim:p,facingAngle:0,firing:false,reload:false};
   while(s.wave<target){s.robots.forEach(r=>r.hp=0);s.hp=100;s.waveLeft=.0001;s.step(1/60,input);}
   for(let i=0;i<45*60;i++){s.hp=100;s.step(1/60,input);}
   return{wave:s.wave,alive:s.alive,types:s.robots.filter(r=>r.hp>0).reduce((o,r)=>(o[r.kind]=(o[r.kind]??0)+1,o),{}),positions:s.robots.filter(r=>r.hp>0).map(r=>({id:r.id,kind:r.kind,x:r.x,z:r.z}))};
  },target);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/horda-${target}.png`});
 }
 assert.deepEqual(report.wave1.types,{patrol:10,smallMutant:3});assert.deepEqual(report.wave4.types,{patrol:30,largePatrol:10});assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
 fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close()}
