// App normal do build de produção; somente UI/teclado e API opcional ?perf.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
import {loadSource} from '../../../tests/load-source.mjs';
const{preview}=createRequire(import.meta.url)('vite');
const{chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const{Navigation,smoothPath}=loadSource('src/combat/navigation.ts');
const{createWorld}=loadSource('src/game/marsWorld.ts');
const mars=createWorld(),nav=new Navigation(mars,.40,.25);
const out='docs/handoffs/s2.11',summary={base:'0f8d485',method:'App normal em Vite preview, build produção. Chromium headless ANGLE Metal, viewport 1440×1000/DPR1. Duas amostras de 10 s por opção, Marte e Shanghai/horda1. W/S alternados, sem mudar configuração ou estado do combate. Sem validação humana de fluidez.',errors:[],cases:[]};
const server=await preview({preview:{host:'127.0.0.1',port:4197,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
try{
for(const mode of [0,1]){
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',e=>summary.errors.push(e.message));
 await page.goto(`http://127.0.0.1:4197/?perf${mode?'&interp=1':''}`);await page.getByLabel('Nome do explorador').fill('Comparação S2.11');await page.getByRole('button',{name:'Entrar na colônia',exact:true}).click();
 await page.waitForFunction(()=>window.__hordaPerf?.report().sceneEvents.some(e=>e.kind==='scene-assets-ready'&&e.map==='mars'));
 async function pose(){return page.evaluate(()=>window.__hordaPerf.pose())}
 async function aim(x,z){const p=await pose(),dx=x-p.cameraTarget.x,dz=z-p.cameraTarget.z,a=p.cameraAngle;await page.mouse.move(Math.max(360,Math.min(1110,720+(dx*Math.sin(a)-dz*Math.cos(a))*p.cameraZoom)),Math.max(350,Math.min(700,500+((dx*Math.cos(a)+dz*Math.sin(a))*.5774-(.85-p.cameraTarget.y)*.8165)*p.cameraZoom)));}
 async function sample(map){
  await page.waitForTimeout(1000);const start=await pose();if(map==='shanghai'){assert.equal(start.wave,1);assert.equal(start.alive,13);}await aim(start.physical.x,start.physical.z-4);
  const sampling=page.evaluate(()=>window.__hordaPerf.sample(10000));
  for(let i=0;i<10;i++){await page.keyboard.down('KeyW');await page.waitForTimeout(210);await page.keyboard.up('KeyW');await page.keyboard.down('KeyS');await page.waitForTimeout(735);await page.keyboard.up('KeyS');}
  const result=await sampling,report=await page.evaluate(()=>window.__hordaPerf.report());assert.equal(result.status,'valid');assert.equal(report.context.build,'production');
  const row={map,mode,start,finish:await pose(),sample:result};summary.cases.push(row);fs.writeFileSync(`${out}/perf-${map}-${mode?'interp':'atual'}.json`,JSON.stringify(report,null,2)+'\n');await page.screenshot({path:`${out}/${map}-${mode?'interp':'atual'}.png`});console.log(map,mode,result.rafIntervals);
 }
 await sample('mars');
 // Caminho calculado nos mesmos dados/colisores; executado por teclado, sem teleporte.
 let p=(await pose()).physical;const raw=nav.path(p,{x:0,z:29.5}),route=smoothPath(p,raw,mars,.40);assert.ok(route.length);
 summary.cases.at(-1).route=route;
 for(const point of route){
  const began=Date.now();
  while(true){const p=(await pose()).physical,d=Math.hypot(point.x-p.x,point.z-p.z);if(d<.23)break;assert.ok(Date.now()-began<30000,`rota bloqueada ${JSON.stringify({point,p})}`);await aim(p.x+(point.x-p.x)/d*4,p.z+(point.z-p.z)/d*4);await page.keyboard.down('KeyW');await page.waitForTimeout(65);}
 }
 await page.keyboard.up('KeyW');await page.waitForTimeout(400);await page.keyboard.press('KeyE');
 await page.getByRole('button',{name:'Decolar para Shanghai',exact:true}).click();await page.waitForFunction(()=>window.__hordaPerf?.report().sceneEvents.some(e=>e.kind==='scene-assets-ready'&&e.map==='shanghai'));
 await page.getByRole('button',{name:'Desembarcar · E',exact:true}).click();await page.waitForTimeout(4500);
 await sample('shanghai');
 await page.keyboard.press('Escape');const paused=await pose();await page.waitForTimeout(400);const still=await pose();assert.deepEqual(still.physical,paused.physical);assert.deepEqual(still.visual,paused.visual);
 summary.cases.at(-1).pause={physical:paused.physical,visual:paused.visual,after:still};
 await page.keyboard.press('Escape');await context.close();
}
assert.deepEqual(summary.errors,[]);fs.writeFileSync(`${out}/comparison.json`,JSON.stringify(summary,null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
