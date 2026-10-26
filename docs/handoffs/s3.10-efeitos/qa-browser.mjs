import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core'),out='docs/handoffs/s3.10-efeitos',report={base:'2d9b45f',method:'Fixture App Shanghai. Tiro real chamado uma vez por caso e passo congelado após o tiro para capturar efeitos de 50 ms; posicionamento técnico, sem aceite visual.',cases:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto('http://127.0.0.1:5196/tests/shanghai-phase01.html');await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
await page.evaluate(async()=>{window.cs=await import('/src/state/useCombatStore.ts');cs.useCombatStore.getState().selectEncounter('hordas');const{useExpeditionStore:e}=await import('/src/state/useExpeditionStore.ts');e.getState().restartMission()});await page.waitForTimeout(1500);
for(const kind of ['patrol','smallMutant','wall']){
 await page.evaluate(kind=>window.__shanghaiQA.place(kind==='wall'?-30:-21.5,kind==='wall'?-12:5,Math.PI/4),kind);await page.waitForFunction(()=>window.cs?.combatRuntime.simulation!==null,null,{timeout:60000});await page.waitForTimeout(1200);
 const row=await page.evaluate(async kind=>{const{playerPosition:p}=await import('/src/state/playerTransient.ts'),s=cs.combatRuntime.simulation;const step=Object.getPrototypeOf(s).step.bind(s);s.hp=100;s.ammo=24;s.reloadLeft=0;s.hitFlash=0;s.damageFlash=0;s.step=()=>{};s.robots.forEach(r=>{r.hp=0;r.spawned=false});s.effects.clear();s.shots.length=0;s.cooldown=0;
 let angle=0,aim={x:-29.66,z:20};
 if(kind!=='wall'){const r=s.robots[kind==='smallMutant'?4:0];Object.assign(r,{kind,x:-21.16,z:9.5,hp:75,spawned:true,generation:r.generation+1});angle=0;aim={x:-21.16,z:12};}
 step(1/60,{player:p,aim,facingAngle:angle,firing:true,reload:false});return{kind,muzzle:{...s.effects.muzzle},particles:s.effects.particles.filter(p=>p.life>0).map(p=>({...p})),shot:s.shots[0]};},kind);
 assert.equal(row.muzzle.life,.05);assert.equal(row.particles.length,12);assert.ok(row.particles.every(p=>p.kind===(kind==='wall'?'dust':kind==='smallMutant'?'organic':'metal')));report.cases.push(row);await page.evaluate(()=>cs.combatRuntime.simulation.effects.step(.025));await page.waitForTimeout(200);await page.screenshot({path:`${out}/${kind}.png`});
}
assert.deepEqual(report.errors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');console.log(report.cases.map(c=>({kind:c.kind,impact:c.shot.to,muzzle:c.muzzle})));}finally{await browser.close()}
