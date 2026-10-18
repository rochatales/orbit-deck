// Antes/depois do piso e deck no jogo + contagens do mesmo enquadramento.
// Não é benchmark de GPU nem aceite visual. Servidor e browser encerram em finally.
// HORDA_QA_PACKAGE=<package.json que fornece playwright-core> node scripts/qa-colony-floor-deck.mjs
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createHash} from 'node:crypto';
import {coplanarFloorSurfaces} from './lib/colony-geometry.mjs';
import assert from 'node:assert/strict';

const BASE='ed302dd',out='docs/handoffs/s6.12/evidencias/piso-deck';
fs.mkdirSync(out,{recursive:true});
const before=execFileSync('git',['show',`${BASE}:src/assets/colony-v006.glb`],{maxBuffer:1<<26});
const after=fs.readFileSync('src/assets/colony-v006.glb');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={base:BASE,comparison:'Mesmo jogo atual/câmera; só o GLB anterior é interceptado. Física anterior avaliada separadamente nos testes.',assets:[],views:[]};
const signatures=[];
for(const [phase,bytes] of [['antes',before],['depois',after]]) {
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 let meshes=0,triangles=0;const floors=[],unchanged=[];
 scene.traverse(node=>{
  if(!node.isMesh)return;
  meshes++;const g=node.geometry,count=(g.index?.count??g.attributes.position.count)/3;triangles+=count;
  if(/^ARQ_Piso_(Passarelas|Externo)$/.test(node.name))floors.push({name:node.name,triangles:count});
  else {
   const hash=createHash('sha256');
   for(const [name,attr] of Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)))hash.update(name).update(Buffer.from(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength));
   if(g.index)hash.update(Buffer.from(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength));
   unchanged.push([node.name,hash.digest('hex')]);
  }
 });
 signatures.push(unchanged);
 const audit=coplanarFloorSurfaces(scene);
 fs.writeFileSync(`${out}/coplanar-${phase}.json`,JSON.stringify(audit,null,2)+'\n');
 assert.equal(audit.trianglePairs,0);
 report.assets.push({phase,sha256:sha(bytes),bytes:bytes.length,meshes,triangles,floors,coplanarPairs:audit.trianglePairs});
}
assert.deepEqual(signatures[0],signatures[1],'Toda geometria fora dos dois pisos, incluindo as molduras aprovadas, permanece idêntica');
report.unchangedMeshes=signatures[0].length;
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM??`${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`,args:['--enable-gpu','--use-angle=metal']});
const server=await createServer({server:{host:'127.0.0.1',port:5192,strictPort:true,hmr:false,watch:{ignored:['**/*']}},logLevel:'warn'});
try {
 await server.listen();
 for(const phase of ['antes','depois']) {
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  try {
   await context.addInitScript(()=>localStorage.setItem('horda-survivor:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
   if(phase==='antes')await context.route(/\/src\/assets\/colony-v006\.glb$/,route=>route.fulfill({body:before,contentType:'model/gltf-binary'}));
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:5192/');await page.waitForTimeout(5000);
   await page.evaluate(async()=>{
    const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');
    const {useGameStore:g}=await import('/src/state/useGameStore.ts');
    const {publishPlayerFrame}=await import('/src/state/playerTransient.ts');
    window.qaRoot=_roots.get(document.querySelector('canvas')).store.getState();
    window.qaMove=(x,z,zoom)=>{g.setState({isPaused:false});publishPlayerFrame(x,0,z,'mars');s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});setTimeout(()=>g.setState({targetZoom:g.getState().minZoom*zoom,targetRotation:Math.PI/4}),100);};
   });
   for(const [view,point,zoom] of [['piso-passarelas',[2.5,5.3],2.7],['piso-patio',[11.5,-8],3.5],['piso-externo',[12.5,6],2.7],['deck',[0,29.5],2.7]]) {
    await page.evaluate(({point,zoom})=>window.qaMove(...point,zoom),{point,zoom});await page.waitForTimeout(2200);
    const metrics=await page.evaluate(()=>{
     const {gl,camera}=window.qaRoot,info=gl.info;
     return {render:{...info.render},memory:{...info.memory},camera:{position:camera.position.toArray(),zoom:camera.zoom},viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};
    });
    await page.screenshot({path:`${out}/${phase}-${view}.png`});
    report.views.push({phase,view,metrics});
   }
   assert.deepEqual(errors,[]);report[`${phase}Errors`]=errors;
   if(phase==='depois') {
    // Acesso real à interação na borda: abertura e saída pela sessão do jogo.
    await page.keyboard.press('e');await page.waitForTimeout(500);
    report.board=await page.evaluate(async()=>{const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');return {phase:s.getState().session.phase,panel:s.getState().panel};});
    await page.screenshot({path:`${out}/depois-embarque.png`});
    await page.keyboard.press('e');await page.waitForTimeout(500);
    report.exit=await page.evaluate(async()=>{const {useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');return {phase:s.getState().session.phase,spawn:s.getState().spawn};});
   }
  } finally {await context.close();}
 }
}finally{await server.close();await browser.close();}
assert.equal(report.board.phase,'aboard');assert.equal(report.exit.phase,'walking');
report.rendererComparison=report.views.filter(v=>v.phase==='antes').map(before=>{
 const after=report.views.find(v=>v.phase==='depois'&&v.view===before.view);
 assert.equal(after.metrics.render.calls,before.metrics.render.calls,'tile não acrescenta draw calls');
 return {view:before.view,callsBefore:before.metrics.render.calls,callsAfter:after.metrics.render.calls,
  trianglesBefore:before.metrics.render.triangles,trianglesAfter:after.metrics.render.triangles,
  deltaTriangles:after.metrics.render.triangles-before.metrics.render.triangles};
});
fs.writeFileSync(`${out}/medicao-e-qa.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
