// Evidências temporais da correção. Reposição assistida não substitui playtest.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s6.12/evidencias/depois';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-gpu','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>localStorage.setItem('exoden:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
try{
 await page.goto(process.argv[2]??'http://127.0.0.1:5189/');await page.waitForTimeout(6000);
 await page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
  const {useGameStore:g}=await import('/src/state/useGameStore.ts');
  const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
  window.qaMove=(x,z)=>{g.setState({isPaused:false});publishPlayerFrame(x,0,z,'mars');s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});};
  window.qaRoot=_roots.get(document.querySelector('canvas')).store.getState();
  window.qaMove(9.5,-6.8);
 });
 await page.waitForTimeout(1200);await page.screenshot({path:`${out}/porta-fechada.png`});
 await page.evaluate(()=>window.qaMove(9.5,-8));await page.waitForTimeout(100);
 await page.screenshot({path:`${out}/porta-abrindo.png`});await page.waitForTimeout(1000);
 await page.screenshot({path:`${out}/porta-aberta.png`});
 await page.evaluate(()=>window.qaMove(9.5,-6.8));await page.waitForTimeout(1200);
 await page.screenshot({path:`${out}/porta-fechou.png`});
 // Replay visual determinístico do corte, usando a mesma malha, câmera e pontos da medição.
 // Renderer isolado: evita fingir que o trajeto interpolado atravessando salas é navegação física.
 await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {GLTFLoader}=await import('/scripts/fixtures/colony-loader.js');
  const {ColonyVisibility:Before}=await import('/scripts/fixtures/colony-visibility-before.js');
  const {ColonyVisibility:After}=await import('/src/scene/marsColony/visibility.ts');
  const {applyColonyLayout}=await import('/src/scene/marsColony/layout.ts');
  const manifest=await (await fetch('/src/assets/colony-v006.manifest.json')).json();
  const gltf=await new GLTFLoader().loadAsync('/src/assets/colony-v006.glb');
  const root=document.createElement('div');root.style='position:fixed;inset:0;z-index:9999;background:#b4927a;display:flex';document.body.append(root);
  const views=[];
  for(const before of [true,false]){
   const panel=document.createElement('div');panel.style='width:50%;position:relative';root.append(panel);
   const label=document.createElement('div');label.style='position:absolute;top:15px;left:15px;background:white;color:#172d36;padding:12px;font:16px sans-serif';label.textContent=(before?'ANTES · binário':'DEPOIS · fade / triângulos')+' · replay técnico, não navegação';panel.append(label);
   const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(720,900);panel.append(renderer.domElement);
   const scene=new THREE.Scene();scene.background=new THREE.Color('#b4927a');scene.add(new THREE.AmbientLight('white',2));const light=new THREE.DirectionalLight('white',3);light.position.set(10,30,10);scene.add(light);
   const model=gltf.scene.clone(true);if(!before)applyColonyLayout(model);scene.add(model);
   const control=new (before?Before:After)(model,manifest.parts);
   const marker=new THREE.Mesh(new THREE.CapsuleGeometry(0.24,0.8),new THREE.MeshStandardMaterial({color:'#ff5050'}));scene.add(marker);
   const camera=new THREE.OrthographicCamera(-12,12,15,-15,0.1,250);
   views.push({renderer,scene,control,marker,camera});
  }
  window.qaReplay=()=>new Promise(resolve=>{
   const points=[[0,0.8],[0,-8],[9.5,-10],[0,33]],player={x:0,z:0};let start,previous;
   const step=now=>{start??=now;previous??=now;const time=Math.min(16,(now-start)/1000),t=Math.min(2.999999,time/16*3),i=Math.floor(t),u=t-i;
    player.x=points[i][0]*(1-u)+points[i+1][0]*u;player.z=points[i][1]*(1-u)+points[i+1][1]*u;
    const angle=Math.PI/4+time/16*Math.PI*2;
    for(const v of views){v.marker.position.set(player.x,0.8,player.z);v.camera.position.set(player.x+Math.sin(angle)*60,48,player.z+Math.cos(angle)*60);v.camera.lookAt(player.x,0.8,player.z);v.control.update(player,v.camera.position,Math.min(0.05,(now-previous)/1000));v.renderer.render(v.scene,v.camera);}
    previous=now;if(time<16)requestAnimationFrame(step);else resolve();
   };requestAnimationFrame(step);
  });
 });
 await page.evaluate(()=>window.qaReplay());await page.screenshot({path:`${out}/trajeto-comparativo.png`});
 assert.deepEqual(errors,[]);
}finally{await context.close();const original=await page.video().path();await page.video().saveAs(`${out}/portas-e-trajeto.webm`);fs.unlinkSync(original);await browser.close();}
