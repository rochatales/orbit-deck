// QA técnico com Chromium; não aprova jogabilidade. Não instala dependências.
// HORDA_QA_PACKAGE=/caminho/package.json node scripts/qa-colony-v006.mjs <url-dev>
// Para conferir o build: ... <url-preview/?perf> --production
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(process.env.HORDA_QA_PACKAGE);
const {chromium}=require('playwright-core');
const out='docs/handoffs/s6.12/evidencias'; fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>localStorage.setItem('horda-survivor:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
const result={errors,cycles:[],angles:[]};
try {
 await page.goto(process.argv[2]??'http://127.0.0.1:5188/?perf');
 await page.waitForTimeout(7000);
 if(process.argv.includes('--production')) {
  const perf=await page.evaluate(async()=>({sample:await window.__hordaPerf.sample(3000),report:window.__hordaPerf.report()}));
  fs.writeFileSync(`${out}/producao.json`,JSON.stringify({errors,...perf},null,2));
  await page.screenshot({path:`${out}/producao.png`});
  assert.deepEqual(errors,[]);
  console.log('Prévia de produção sem erros; amostra',perf.sample.status);
  await browser.close();
  process.exit(0);
 }
 const ready=map=>page.waitForFunction(async map=>{const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');return s.getState().ready&&s.getState().session.map===map;},map);
 const relocate=async(x,z)=>{
  await page.evaluate(async({x,z})=>{
   const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
   const {useGameStore:g}=await import('/src/state/useGameStore.ts');
   const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
   const spawn={x,y:0,z};g.setState({isPaused:false});
   publishPlayerFrame(x,0,z,s.getState().session.map);
   s.setState({spawn,panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});
  },{x,z});
  await page.waitForTimeout(700);
 };
 const sceneInfo=()=>page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const s=_roots.get(document.querySelector('canvas')).store.getState();
  let parts=0,closed=null,open=null;
  s.scene.traverse(n=>{if(n.userData.colony_name)parts++;if(n.userData.colony_name==='ARQ_Laboratorio_Porta_Folhas')closed=n.visible;if(n.userData.colony_name==='ARQ_Laboratorio_Porta_Folhas_Aberta')open=n.visible;});
  return {parts,closed,open,camera:s.camera.position.toArray(),memory:{...s.gl.info.memory},calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles};
 });
 await ready('mars');
 result.spawn=await sceneInfo(); assert.equal(result.spawn.parts,383);
 await page.screenshot({path:`${out}/spawn.png`});
 await relocate(0,-8); await page.keyboard.press('KeyE');
 assert.equal(await page.getByRole('dialog',{name:'Conversa com EDEN'}).count(),1);
 await page.keyboard.press('Escape');
 result.eden=true;
 await relocate(9.5,-10); result.lab=await sceneInfo();assert.equal(result.lab.closed,false);
 await page.screenshot({path:`${out}/laboratorio.png`});
 await relocate(0,29.5);
 for(let angle=0;angle<8;angle++) {
  await page.evaluate(async angle=>{const {useGameStore:g}=await import('/src/state/useGameStore.ts');g.setState({targetRotation:angle*Math.PI/4});},angle);
  await page.waitForTimeout(800);
  result.angles.push(await sceneInfo());
  if(angle===1)await page.screenshot({path:`${out}/plataforma.png`});
 }
 for(let cycle=0;cycle<3;cycle++) {
  await relocate(0,29.5);await page.keyboard.press('KeyE');
  await page.getByRole('button',{name:'Decolar para Shanghai'}).click();
  await ready('shanghai');await page.waitForTimeout(1200);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
  const shanghai=await sceneInfo();assert.equal(shanghai.parts,0);
  await page.keyboard.press('KeyE');
  await page.getByRole('button',{name:'Retornar a Marte',exact:true}).click();
  await ready('mars');await page.waitForTimeout(800);await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const mars=await sceneInfo();assert.equal(mars.parts,383);
  result.cycles.push({shanghai,mars});console.log('Ciclo',cycle+1,'concluído');
 }
 await relocate(0,0.8);
 await page.keyboard.down('KeyW');await page.waitForTimeout(800);await page.keyboard.up('KeyW');
 result.movement=await page.evaluate(async()=>{const {playerPosition:p}=await import('/src/state/playerTransient.ts');return {x:p.x,z:p.z};});
 assert.ok(Math.hypot(result.movement.x,result.movement.z-0.8)>0.2);
 await page.keyboard.press('Escape');
 assert.equal(await page.getByText('Exploração pausada',{exact:true}).count(),1);
 await page.keyboard.press('Escape');
 result.perf=await page.evaluate(async()=>await window.__hordaPerf.sample(3000));
 assert.deepEqual(errors,[]);
 console.log('QA concluído: EDEN, laboratório, 8 ângulos, 3 ciclos, movimento e pausa.');
} finally {
 fs.writeFileSync(`${out}/qa.json`,JSON.stringify(result,null,2));await browser.close();
}
