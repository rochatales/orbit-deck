// Conferência das faces internas em preto com as portas abertas e fechadas.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s6.12-hangar-colonia/contorno-preto',origin=process.env.HORDA_QA_ORIGIN??'http://127.0.0.1:5195';
const report={base:'bdd4abe',method:'App real em Chromium GPU 1600×1000 DPR1. Posicionamento de fixture para inspeção de materiais/portas; não é aceite visual do autor.',errors:[],httpErrors:[],views:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()})});
 await page.goto(`${origin}/tests/shanghai-phase01.html?map=mars`);await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});
 await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();window.qaFiber=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.qaGame=(await import('/src/state/useGameStore.ts')).useGameStore;window.qaRoot=()=>[...window.qaFiber._roots.values()][0]?.store.getState();});
 await page.waitForFunction(()=>!!window.qaRoot()?.scene.getObjectByName('Hangar')&&!document.querySelector('[role=status]'),null,{timeout:60000});
 for(const [name,x,z,angle,zoom] of [['porta-norte-fechada',0,8.9,5*Math.PI/4,3.2],['porta-norte-aberta',0,10.3,5*Math.PI/4,3.2],['contorno-interno',0,13.5,Math.PI/3,3.4]]){
  await page.evaluate(({x,z,angle})=>window.__shanghaiQA.place(x,z,angle),{x,z,angle});await page.waitForTimeout(900);
  await page.evaluate(zoom=>{const g=window.qaGame.getState();g.setZoom(g.minZoom*zoom)},zoom);await page.waitForTimeout(700);
  const state=await page.evaluate(()=>{const h=window.qaRoot().scene.getObjectByName('Hangar'),body=h.getObjectByName('HangarMesh'),black=body.material.find(m=>m.name==='HangarDoorRevealBlack');return{color:black.color.getHexString(),map:!!black.map,emissive:black.emissive.getHexString(),offset:black.polygonOffset,triangles:body.geometry.groups[1].count/3,roof:h.getObjectByName('TETO_Hangar').visible,northDoorX:h.getObjectByName('D_hangar_north_L').position.x};});
  assert.equal(state.color,'050505');assert.equal(state.map,false);assert.equal(state.emissive,'000000');assert.equal(state.offset,true);assert.equal(state.triangles,62);
  report.views.push({name,...state});await page.screenshot({path:`${out}/${name}.png`});
 }
 assert.equal(report.views[2].roof,false);assert.ok(Math.abs(report.views[1].northDoorX-report.views[0].northDoorX)>1);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);fs.writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close()}
