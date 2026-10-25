// QA técnico em fixture dev; não aprova jogabilidade. Ver comandos em s2.12-b.md.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
const report={base:'2b1c91beeb6a59d3ef8815cdf3f3f1ab66689b28',metodo:'Fixture tests/shanghai-phase01.html, Vite dev 5192, Chromium headless GPU, 1280×800 DPR 1. Verificação técnica de pose/segmento; sem aceite visual/jogabilidade ou benchmark.',errors:[],shots:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${process.env.HORDA_QA_ORIGIN ?? 'http://127.0.0.1:5192'}/tests/shanghai-phase01.html`);
 await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
 await page.waitForTimeout(5000);
 await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();const {_roots}=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);if(!_roots.size)throw Error('Sem root; '+document.body.innerText.slice(0,1200));window.rifleQA=[..._roots.values()][0].store;window.__shanghaiQA.disableCombat();window.__shanghaiQA.place(-17.5,9.5,Math.PI/4)});
 await page.waitForTimeout(2000);
 for(const [x,z] of [[-17.5,19.5],[-7.5,9.5],[-17.5,-.5]]){
  const mouse=await page.evaluate(([x,z])=>{const {camera,scene,gl}=window.rifleQA.getState();const v=scene.position.clone().set(x,.85,z).project(camera),r=gl.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2}},[x,z]);
  await page.mouse.move(mouse.x,mouse.y);await page.waitForTimeout(1600);
  await page.mouse.down();
  const shot=await page.evaluate(async()=>{
   const {combatRuntime:r}=await import('/src/state/useCombatStore.ts');const {playerPosition,playerFacing}=await import('/src/state/playerTransient.ts');const {RIFLE_POSE,writeRifleMuzzle}=await import('/src/combat/config.ts');
   const start=performance.now();return await new Promise((resolve,reject)=>{function sample(){const shot=r.simulation?.shots[0];if(shot){const scene=window.rifleQA.getState().scene;scene.updateMatrixWorld(true);const barrel=scene.getObjectByName('RifleBarrel'),tip=barrel.localToWorld(barrel.position.clone().set(0,0,RIFLE_POSE.barrelLength/2));const muzzle={x:0,z:0};writeRifleMuzzle(muzzle,playerPosition.x,playerPosition.z,playerFacing.angle);resolve({from:{...shot.from},to:{...shot.to},bodyAngle:playerFacing.angle,muzzle,renderedTip:tip.toArray(),height:RIFLE_POSE.height,aim:{...r.aim},length:Math.hypot(shot.to.x-shot.from.x,shot.to.z-shot.from.z)});return}if(performance.now()-start>4000){reject(Error('nenhum disparo capturado'));return}requestAnimationFrame(sample)}sample()})
  });
  await page.mouse.up();
  assert.ok(Math.hypot(shot.from.x-shot.renderedTip[0],shot.from.z-shot.renderedTip[2])<.002,JSON.stringify(shot));
  assert.ok(Math.abs(shot.renderedTip[1]-.85)<1e-6);assert.ok(shot.length<=32+1e-6);report.shots.push(shot);await page.waitForTimeout(350);
 }
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 fs.writeFileSync('docs/handoffs/s2.12-b/evidencias/etapa-1-browser.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close()}
