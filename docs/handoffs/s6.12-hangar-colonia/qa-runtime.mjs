// QA assistido: teleporte só entre casos/capturas; rotas caminham com W e mira reais.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s6.12-hangar-colonia',origin=process.env.HORDA_QA_ORIGIN??'http://127.0.0.1:5195';
const report={base:'604b7bb',method:'Chromium GPU, 1600×1000 DPR1; App/física/controller reais. Fixture reposiciona apenas no início dos casos e das capturas. Rotas dirigidas por W e mouse, sem setar posição durante percurso. Não é aceite do autor.',errors:[],httpErrors:[],routes:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
let page;
try{
 page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
 await page.goto(`${origin}/tests/shanghai-phase01.html?map=mars`);await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
 await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();window.qaFiber=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.qaExp=(await import('/src/state/useExpeditionStore.ts')).useExpeditionStore;window.qaGame=(await import('/src/state/useGameStore.ts')).useGameStore;window.qaTransient=await import('/src/state/playerTransient.ts');window.qaRoot=()=>[...window.qaFiber._roots.values()][0]?.store.getState();});
 await page.waitForFunction(()=>!!window.qaRoot()?.scene.getObjectByName('Hangar')&&!document.querySelector('[role=status]'),null,{timeout:60000});
 async function inspect(){return page.evaluate(()=>{const root=window.qaRoot(),hangar=root?.scene.getObjectByName('Hangar');const removed=[],retained=[];root?.scene.traverse(n=>{if(n.userData.ambiente==='meeting-suite'||n.userData.ambiente==='meeting-exterior-airlock')removed.push(n.name);if(n.userData.ambiente==='coffee-nook')retained.push(n.name)});return{position:{...window.qaTransient.playerPosition},session:{...window.qaExp.getState().session},hangar:hangar?{...hangar.userData.hangar,roof:hangar.getObjectByName('TETO_Hangar').visible,body:hangar.getObjectByName('HangarMesh').visible}:null,removed,refectoryParts:retained.length};});}
 async function place(x,z,angle=Math.PI/3,zoom=1.8){await page.evaluate(({x,z,angle})=>window.__shanghaiQA.place(x,z,angle),{x,z,angle});await page.waitForTimeout(800);await page.evaluate(zoom=>{const g=window.qaGame.getState();g.setZoom(g.minZoom*zoom)},zoom);await page.waitForTimeout(600);}
 async function drive(points,label){const samples=[];for(const[x,z]of points){await page.keyboard.up('KeyW');for(let tick=0;tick<220;tick++){
  const view=await page.evaluate(({x,z})=>{const p=window.qaTransient.playerPosition,root=window.qaRoot(),v=root.camera.position.clone().set(x,.85,z).project(root.camera);return{distance:Math.hypot(x-p.x,z-p.z),x:(v.x+1)*root.size.width/2,y:(1-v.y)*root.size.height/2,position:{...p}}},{x,z});
  if(view.distance<.24){samples.push({target:{x,z},position:view.position,tick});break;}
  assert.ok(view.x>0&&view.x<1600&&view.y>0&&view.y<1000,JSON.stringify(view));
  await page.mouse.move(view.x,view.y);if(tick===0)await page.waitForTimeout(250);await page.keyboard.down('KeyW');await page.waitForTimeout(70);
  if(tick===219)throw new Error(`Rota ${label} bloqueada: ${JSON.stringify(view)}`);
 }await page.keyboard.up('KeyW');await page.waitForTimeout(120);}
 report.routes.push({label,samples,end:await inspect()});console.log('ROTA',label,'OK');}
 await place(0,3,Math.PI/3);report.initial=await inspect();assert.equal(report.initial.removed.length,0);assert.ok(report.initial.refectoryParts>0);
 await drive([[0,7],[0,11.8],[0,14],[0,17],[0,19],[0,21],[0,24],[0,29.5]],'praça → norte → interior → rampa → deck → embarque');
 assert.ok(report.routes[0].samples.some(s=>s.position.y>.14));assert.ok(report.routes[0].samples.some(s=>s.position.y<.01));
 await page.keyboard.press('e');await page.waitForFunction(()=>window.qaExp.getState().session.phase==='aboard');report.boarded=await inspect();await page.keyboard.press('e');await page.waitForFunction(()=>window.qaExp.getState().session.phase==='walking');
 await place(5.9,15);await drive([[4.5,15],[3.1,15.5],[3.1,16.5],[0,16.5]],'Refeitório → porta leste → interior');
 await drive([[3.1,16.5],[3.1,15.5],[4.5,15],[5.9,15]],'interior → porta leste → Refeitório');
 await place(0,10,5*Math.PI/4,2);report.northEntry=await inspect();await page.screenshot({path:`${out}/entrada-praca.png`});
 await place(0,15.8,Math.PI/3,2.7);report.interior=await inspect();assert.equal(report.interior.hangar.roof,false);assert.equal(report.interior.hangar.body,true);await page.screenshot({path:`${out}/interior-teto-cortado.png`});
 await place(0,19,Math.PI/3,2.2);report.ramp=await inspect();assert.ok(report.ramp.hangar.rampOpen>.99);assert.ok(Math.abs(report.ramp.position.y-.08836)<.01);await page.screenshot({path:`${out}/rampa-aberta.png`});
 await place(0,24.3,3*Math.PI/4,1.25);report.southwest=await inspect();assert.ok(report.southwest.hangar.rampOpen<.01);assert.equal(report.southwest.hangar.roof,true);await page.screenshot({path:`${out}/deck-sudoeste.png`});
 await place(0,24.3,5*Math.PI/4,1.25);await page.screenshot({path:`${out}/deck-noroeste.png`});
 // Guardar o status antigo permite conferir o evento mesmo se a carga de Shanghai for instantânea.
 await place(0,29.5);await page.evaluate(()=>{window.departureStatus=window.qaRoot().scene.getObjectByName('Hangar').userData.hangar});
 await page.keyboard.press('e');await page.waitForFunction(()=>window.qaExp.getState().session.phase==='aboard');
 await page.getByRole('button',{name:'Decolar para Shanghai',exact:true}).click();
 await page.waitForFunction(()=>window.qaExp.getState().session.map==='shanghai'&&window.qaExp.getState().ready,null,{timeout:60000});
 report.departure=await page.evaluate(()=>({...window.departureStatus}));assert.ok(report.departure.departures>=1);
 await page.getByRole('button',{name:'Retornar a Marte',exact:true}).click();
 await page.waitForFunction(()=>window.qaExp.getState().session.map==='mars'&&window.qaExp.getState().ready&&!!window.qaRoot()?.scene.getObjectByName('Hangar')&&!document.querySelector('[role=status]'),null,{timeout:60000});
 report.landing=await inspect();assert.ok(report.landing.hangar.landings>=1);assert.equal(report.landing.hangar.alert,true);
 await page.waitForFunction(()=>window.qaRoot().scene.getObjectByName('Hangar').userData.hangar.alert===false,null,{timeout:20000});report.afterLanding=await inspect();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
 fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');console.log('QA OK',JSON.stringify({routes:report.routes.length,errors:report.errors,departure:report.departure,landing:report.landing.hangar}));
}catch(error){report.failure=String(error);if(page)report.last=await page.evaluate(()=>({state:window.__shanghaiQA?.state(),position:window.__shanghaiQA?.position()})).catch(()=>null);fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');throw error;}finally{await browser.close()}
