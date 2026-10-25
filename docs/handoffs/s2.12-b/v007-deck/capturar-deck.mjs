// Captura no jogo DEV e câmera CameraRig real; nenhuma câmera substituta.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const phase=process.argv[2];
const view=process.argv[3]??'sudoeste';
const setup=view==='noroeste'
 ?{viewport:{width:2000,height:1240},clip:{x:175,y:40,width:1306,height:898},player:{x:-5.6,z:26.9},rotation:-24*Math.PI/180,zoom:66.7,prefix:'noroeste-'}
 :{viewport:{width:2722,height:1552},clip:{x:760,y:0,width:1922,height:1552},player:{x:-1.25,z:26.1},rotation:215.5*Math.PI/180,zoom:79,prefix:''};
if(!['antes','depois'].includes(phase))throw new Error('Usar antes ou depois');
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE??`${process.env.HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json`)('playwright-core');
const out=path.dirname(new URL(import.meta.url).pathname);
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM??`${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`,args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const context=await browser.newContext({viewport:setup.viewport,deviceScaleFactor:1});
 await context.addInitScript(()=>localStorage.setItem('horda-survivor:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.HORDA_QA_URL??'http://127.0.0.1:5193/')+'?comparar');
 await page.waitForTimeout(4500);
 await page.evaluate(async({x,z})=>{
  const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
  const {useGameStore:g}=await import('/src/state/useGameStore.ts');
  const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
  publishPlayerFrame(x,0,z,'mars');
  s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});
  g.setState({isPaused:false});
 },setup.player);
 await page.waitForTimeout(1400);
 await page.evaluate(async setup=>{
  const {useGameStore:g}=await import('/src/state/useGameStore.ts');
  g.setState({targetRotation:setup.rotation,targetZoom:setup.zoom});
 },setup);
 await page.evaluate(async()=>{
  const source=await(await fetch('/src/app/GameCanvas.tsx')).text();
  const {_roots}=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
  window.deckCaptureStore=_roots.get(document.querySelector('canvas')).store;
 });
 await page.waitForFunction(setup=>{
  const c=window.deckCaptureStore.getState().camera;
  return Math.abs(c.zoom-setup.zoom)<1e-5&&Math.hypot(c.position.x-(setup.player.x+Math.cos(setup.rotation)*55.14),c.position.z-(setup.player.z+Math.sin(setup.rotation)*55.14))<1e-5;
 },setup,{timeout:15000});
 const report=await page.evaluate(async clip=>{
  const source=await(await fetch('/src/app/GameCanvas.tsx')).text();
  const {_roots}=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
  const {playerPosition}=await import('/src/state/playerTransient.ts');
  const {useGameStore:g}=await import('/src/state/useGameStore.ts');
  const root=_roots.get(document.querySelector('canvas')).store.getState();
  const T=await import('/node_modules/.vite/deps/three.js');
  const consoles=[];root.scene.traverse(n=>{
   if(!['PLAT_Console_Oeste','PLAT_Console_Leste','PLAT_Rack_Cilindros','PROP_Tanques','PROP_Tanques_2','PLAT_Carro_1','PLAT_Carro_2'].includes(n.userData.colony_name??n.name))return;
   const b=new T.Box3().setFromObject(n);
   consoles.push({name:n.userData.colony_name??n.name,min:b.min.toArray(),max:b.max.toArray(),rotation:n.rotation.toArray(),position:n.position.toArray()});
  });
  return {camera:{position:root.camera.position.toArray(),quaternion:root.camera.quaternion.toArray(),zoom:root.camera.zoom,viewport:{width:innerWidth,height:innerHeight},clip,targetRotation:g.getState().targetRotation},player:{...playerPosition},consoles};
 },setup.clip);
 await page.screenshot({path:`${out}/${setup.prefix}${phase}.png`,clip:report.camera.clip});
 if(phase==='depois'&&view==='sudoeste'){
  async function place(x,z){
   await page.evaluate(async({x,z})=>{
    const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
    const {useGameStore:g}=await import('/src/state/useGameStore.ts');
    const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
    publishPlayerFrame(x,0,z,'mars');
    s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});g.setState({isPaused:false});
   },{x,z});
   await page.waitForTimeout(1300);
  }
  async function walk(x,z,ms){
   const target=await page.evaluate(async({x,z})=>{
    const source=await(await fetch('/src/app/GameCanvas.tsx')).text();
    const {_roots}=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
    const root=_roots.get(document.querySelector('canvas')).store.getState();
    const T=await import('/node_modules/.vite/deps/three.js');
    const p=new T.Vector3(x,.9,z).project(root.camera),b=root.gl.domElement.getBoundingClientRect();
    return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};
   },{x,z});
   await page.mouse.move(target.x,target.y);await page.keyboard.down('w');await page.waitForTimeout(ms);await page.keyboard.up('w');await page.waitForTimeout(200);
   return await page.evaluate(async()=>({...((await import('/src/state/playerTransient.ts')).playerPosition)}));
  }
  await place(0,20);
  report.percurso=await walk(0,29.5,2150);
  assert.ok(Math.abs(report.percurso.x)<.15 && report.percurso.z>27,'caminhada real praça → passarela → deck');
  await page.keyboard.press('e');
  await page.getByRole('dialog',{name:'Cabine da aeronave'}).waitFor();report.embarque=true;
  await page.getByRole('button',{name:'Desembarcar · E'}).click();await page.waitForTimeout(500);
  report.desembarque=await page.evaluate(async()=>({...((await import('/src/state/playerTransient.ts')).playerPosition)}));
  assert.ok(Math.hypot(report.desembarque.x,report.desembarque.z-29.5)<.02);
  await place(-3,24.2);
  report.bloqueioOeste=await walk(-3,27,1800);
  assert.ok(report.bloqueioOeste.z<25.25 && report.bloqueioOeste.z>24.5,'colisor segura o controller antes do console');
 }
 fs.writeFileSync(`${out}/${setup.prefix}${phase}.json`,JSON.stringify({...report,errors,metodo:`DEV, reposição assistida, vista ${view}, câmera real e mesmo enquadramento antes/depois; não é aceite de jogabilidade.`},null,2)+'\n');
 console.log(JSON.stringify({phase,...report,errors}));
 if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}
