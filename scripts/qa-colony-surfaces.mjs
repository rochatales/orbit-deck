// QA S6.12: jogo React real, reposições assistidas, portas/props/telhados e preview.
// HORDA_QA_PACKAGE aponta ao package.json que fornece playwright-core; nenhuma dependência nova.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer, preview } from 'vite';
const { chromium }=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const executablePath=process.env.HORDA_QA_CHROMIUM ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const out='docs/handoffs/s6.12/evidencias/retomada';fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json'));
const beforeGlb=process.env.HORDA_QA_BEFORE_GLB??path.join(fs.mkdtempSync(path.join(os.tmpdir(),'s6-12-qa-')),'antes.glb');
if(!process.env.HORDA_QA_BEFORE_GLB)fs.writeFileSync(beforeGlb,execFileSync('git',['show','a23138d:src/assets/colony-v006.glb'],{maxBuffer:8*1024*1024}));
const browser=await chromium.launch({headless:true,executablePath,args:['--enable-gpu','--use-angle=metal']});
const report={data:new Date().toISOString(),reposicao:'assistida via stores; não é navegação física ou aceite do autor'};
async function open(url,label,before=false,video=true) {
 const context=await browser.newContext({viewport:{width:1280,height:800},...(video?{recordVideo:{dir:out,size:{width:1280,height:800}}}:{})});
 await context.addInitScript(()=>localStorage.setItem('exoden:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
 if(before)await context.route(/\/src\/assets\/colony-v006\.glb$/,route=>route.fulfill({path:beforeGlb,contentType:'model/gltf-binary'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.waitForTimeout(5000);
 return {page,errors,async close(){await context.close();if(video){const v=page.video(),original=await v.path();await v.saveAs(`${out}/${label}.webm`);fs.unlinkSync(original);}}};
}
async function setup(page) {
 await page.evaluate(async manifest=>{
  const T=await import('/node_modules/.vite/deps/three.js');
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
  const {useGameStore:g}=await import('/src/state/useGameStore.ts');
  const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
  const root=_roots.get(document.querySelector('canvas')).store.getState(),nodes=new Map(),doors=[];
  root.scene.traverse(n=>{if(n.userData.colony_name)nodes.set(n.userData.colony_name,n);if(n.name==='PortaAutomatica')doors.push(n);});
  const mats=n=>{const result=[];n.traverse(o=>{if(o.isMesh)result.push(...(Array.isArray(o.material)?o.material:[o.material]));});return result;};
  const roofPairs=manifest.parts.flatMap(p=>[...p.apoiado_em,...p.apoiado_em_todos].filter(n=>n.startsWith('TET_')).map(n=>({roof:n,child:p.name,a:mats(nodes.get(n)),b:mats(nodes.get(p.name))})));
  const tracked=[];
  root.scene.traverse(n=>{if(!n.isMesh)return;let door=false;for(let p=n;p;p=p.parent)if(p.name==='PortaAutomatica'||/_Port[ao]/.test(p.userData.colony_name??''))door=true;if(door)tracked.push(n);});
  const prev=tracked.map(n=>({visible:n.visible,m:n.material,d:n.material.depthWrite}));
  const stats={frames:0,doors:doors.length,trackedMeshes:tracked.length,visibleChanges:0,depthWriteChanges:0,materialChanges:0,roofMaxDifference:0,roofPairFrames:0};
  window.qa={root,nodes,doors,roofPairs,stats,move(x,z,zoom=1.6,angle=Math.PI/4){
   g.setState({isPaused:false});publishPlayerFrame(x,0,z,'mars');
   s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});
   // CameraRig remonta ao mudar spawn; aplica enquadramento depois do efeito de montagem.
   setTimeout(()=>g.setState({targetZoom:g.getState().minZoom*zoom,targetRotation:angle}),100);
  }};
  window.qaDoorPoints=doors.map(d=>{const p=d.getWorldPosition(new T.Vector3()),a=d.localToWorld(new T.Vector3(0,0,3.4)),b=d.localToWorld(new T.Vector3(0,0,-3.4));return {portal:d.userData.colonyPortal,center:[p.x,p.z],front:[a.x,a.z],back:[b.x,b.z]};});
  const loop=()=>{
   stats.frames++;
   for(let i=0;i<tracked.length;i++){
    const n=tracked[i],p=prev[i];stats.visibleChanges+=Number(p.visible!==n.visible);stats.depthWriteChanges+=Number(p.d!==n.material.depthWrite);stats.materialChanges+=Number(p.m!==n.material);
    p.visible=n.visible;p.d=n.material.depthWrite;p.m=n.material;
   }
   for(const p of roofPairs){stats.roofPairFrames++;for(const m of p.b)stats.roofMaxDifference=Math.max(stats.roofMaxDifference,Math.abs(p.a[0].opacity-m.opacity));}
   requestAnimationFrame(loop);
  };requestAnimationFrame(loop);
 },manifest);
}
async function move(page,point,zoom=1.6,angle=Math.PI/4){await page.evaluate(({point,zoom,angle})=>window.qa.move(...point,zoom,angle),{point,zoom,angle});}
async function boxes(page,prefix){
 await move(page,[14.1,-10.9],3.2);await page.waitForTimeout(1500);
 await page.screenshot({path:`${out}/${prefix}-caixas-sombra.png`});
 await page.evaluate(()=>{window.qa.root.gl.shadowMap.enabled=false;});await page.waitForTimeout(300);
 await page.screenshot({path:`${out}/${prefix}-caixas-sem-sombra.png`});
 await page.keyboard.down('q');await page.waitForTimeout(1200);await page.keyboard.up('q');
 await page.screenshot({path:`${out}/${prefix}-caixas-giro.png`});
 await page.evaluate(()=>{window.qa.root.gl.shadowMap.enabled=true;});
}
try {
const dev=await createServer({server:{host:'127.0.0.1',port:5189,strictPort:true,hmr:false,watch:{ignored:['**/*']}},logLevel:'warn'});
try {
 await dev.listen();
 const before=await open('http://127.0.0.1:5189/','caixas-antes',true);
 try{await setup(before.page);await boxes(before.page,'antes');report.antes={errors:before.errors};}finally{await before.close();}
 const game=await open('http://127.0.0.1:5189/','jogo-completo');
 try {
  const page=game.page;await setup(page);await boxes(page,'depois');
  report.portas=[];
  for(const [i,d] of (await page.evaluate(()=>window.qaDoorPoints)).entries()){
   await move(page,d.front,2.7);await page.waitForTimeout(500);
   await move(page,d.center,2.7);await page.waitForTimeout(700);
   await page.keyboard.down('q');await page.waitForTimeout(350);await page.keyboard.up('q');
   await page.screenshot({path:`${out}/porta-${String(i+1).padStart(2,'0')}-aberta.png`});
   const opened=await page.evaluate(i=>window.qa.doors[i].children[0].material.userData.doorOpacity,i);
   await move(page,d.back,2.7);await page.waitForTimeout(1000);
   await page.screenshot({path:`${out}/porta-${String(i+1).padStart(2,'0')}-fechada.png`});
   const closed=await page.evaluate(i=>window.qa.doors[i].children[0].material.userData.doorOpacity,i);
   report.portas.push({portal:d.portal,opened,closed});
  }
  const pairs=manifest.parts.filter(p=>[...p.apoiado_em,...p.apoiado_em_todos].some(n=>n.startsWith('TET_')));
  const roofs=manifest.parts.filter(p=>pairs.some(c=>[...c.apoiado_em,...c.apoiado_em_todos].includes(p.name)));
  report.telhados=[];
  for(const roof of roofs){
   const x=(roof.bounds.minX+roof.bounds.maxX)/2,z=(roof.bounds.minZ+roof.bounds.maxZ)/2;
   await move(page,[x+12,z+12],2.5);await page.waitForTimeout(1400);
   await move(page,[x,z],2.5);await page.waitForTimeout(1600);
   await page.screenshot({path:`${out}/${roof.name}-dentro.png`});
   const read=()=>page.evaluate(name=>{const p=window.qa.roofPairs.find(p=>p.roof===name);return {roof:p.a[0].opacity,children:window.qa.roofPairs.filter(p=>p.roof===name).map(p=>({name:p.child,opacities:p.b.map(m=>m.opacity)}))};},roof.name);
   const inside=await read();
   await move(page,[x+12,z+12],2.5);await page.waitForTimeout(2400);
   await page.screenshot({path:`${out}/${roof.name}-fora.png`});
   report.telhados.push({roof:roof.name,inside,outside:await read()});
  }
  report.jogo={errors:game.errors,stats:await page.evaluate(()=>window.qa.stats)};
 }finally{await game.close();}
}finally{await dev.close();}
let server;
try {
 server=await preview({preview:{host:'127.0.0.1',port:4189,strictPort:true},logLevel:'warn'});
 const prod=await open('http://127.0.0.1:4189/','preview',false,false);
 try{await prod.page.keyboard.down('q');await prod.page.waitForTimeout(1000);await prod.page.keyboard.up('q');await prod.page.screenshot({path:`${out}/preview.png`});report.preview={errors:prod.errors,canvas:await prod.page.locator('canvas').count()};}finally{await prod.close();}
}finally{if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
fs.writeFileSync(`${out}/qa.json`,JSON.stringify(report,null,2));
assert.deepEqual(report.antes.errors,[]);assert.deepEqual(report.jogo.errors,[]);assert.deepEqual(report.preview.errors,[]);
assert.equal(report.portas.length,16);assert.equal(report.telhados.length,9);
for(const d of report.portas){assert.ok(d.opened<0.141);assert.ok(d.closed>0.819);}
for(const r of report.telhados){assert.ok(r.inside.roof<0.081);assert.ok(r.outside.roof>0.999);}
for(const key of ['visibleChanges','depthWriteChanges','materialChanges','roofMaxDifference'])assert.equal(report.jogo.stats[key],0);
console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }
