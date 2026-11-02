// QA de código/estado. Não captura imagens nem concede aprovação visual/jogabilidade.
// HORDA_QA_PACKAGE=/.../playwright-core/package.json HORDA_QA_CHROMIUM=/.../chrome node scripts/qa-greenhouse-v001.mjs [url]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
await page.bringToFront();
const report={method:'Estado do runtime, eventos de interface e W/S reais; posições de início configuradas por QA. Sem screenshots, revisão artística ou aceite de jogabilidade.',errors:[],httpErrors:[],angles:[]};
page.on('pageerror',error=>report.errors.push(String(error)));
page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({url:response.url(),status:response.status()});});
await page.addInitScript(()=>localStorage.setItem('horda-survivor:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));

const ready=map=>page.waitForFunction(async map=>{const{useExpeditionStore:store}=await import('/src/state/useExpeditionStore.ts');return store.getState().ready&&store.getState().session.map===map;},map);
const relocate=async(x,z)=>{
 await page.evaluate(async({x,z})=>{
  const{useExpeditionStore:expedition}=await import('/src/state/useExpeditionStore.ts');
  const{useGameStore:game}=await import('/src/state/useGameStore.ts');
  const{publishPlayerFrame}=await import('/src/state/playerTransient.ts');
  game.setState({isPaused:false});publishPlayerFrame(x,0,z,expedition.getState().session.map);
  expedition.setState({spawn:{x,y:0,z},panel:null,session:{...expedition.getState().session,phase:'walking',revision:expedition.getState().session.revision+1}});
 },{x,z});
 await page.waitForTimeout(900);
};

const snapshot=()=>page.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').find(resource=>resource.name.includes('@react-three_fiber.js'))?.name;
 if(!url)throw Error('R3F não carregado');
 const{_roots}=await import(url),state=_roots.get(document.querySelector('canvas')).store.getState();
 const root=state.scene.getObjectByName('Greenhouse');if(!root)throw Error('Raiz Greenhouse ausente');
 const effectiveVisible=node=>{for(let current=node;current;current=current.parent)if(!current.visible)return false;return true;};
 const nodes=[],lights=[],legacy=[];
 root.traverse(node=>{
  if(node.isPointLight)lights.push({name:node.name,intensity:node.intensity,color:node.color.getHexString(),visible:effectiveVisible(node)});
  if(!node.userData.id_estavel)return;
  const materials=node.isMesh?(Array.isArray(node.material)?node.material:[node.material]):[];
  nodes.push({id:node.userData.id_estavel,role:node.userData.papel,state:node.userData.estado_operacao,visible:effectiveVisible(node),supports:node.userData.apoiado_em,allSupports:node.userData.apoiado_em_todos,materials:materials.map(material=>({name:material.name,opacity:material.opacity,emissiveIntensity:material.emissiveIntensity??0,emissive:material.emissive?.getHexString()??'000000'}))});
 });
 state.scene.traverse(node=>{const id=node.userData.id_estavel??'';if(/^ARQ_Pavilhao_|^TET_Pavilhao$/.test(id))legacy.push(id);});
 const{playerPosition}=await import('/src/state/playerTransient.ts');
 const {useGameStore:game}=await import('/src/state/useGameStore.ts');
 const {simulationBlocked}=await import('/src/game/simulationGate.ts');
 return {paused:game.getState().isPaused,simulationBlocked:simulationBlocked(),focused:document.hasFocus(),activeElement:document.activeElement?.tagName,state:root.userData.operationalState,nodes,lights,legacy,player:{...playerPosition},camera:state.camera.position.toArray(),calls:state.gl.info.render.calls,triangles:state.gl.info.render.triangles};
});
const visible=(data,id)=>{const node=data.nodes.find(node=>node.id===id);assert.ok(node,'ID ausente '+id);return node.visible;};
const wallsVisible=data=>assert.deepEqual(data.nodes.filter(node=>node.role==='wall'&&!node.visible).map(node=>node.id),[],'paredes permanecem visíveis');
const switchState=async online=>{
 await page.getByTestId(online?'greenhouse-online':'greenhouse-offline').click();
 await page.waitForFunction(expected=>document.querySelector('[data-testid="greenhouse-state"]')?.textContent?.includes(expected),online?'ONLINE':'OFFLINE');
 await page.waitForTimeout(500);
 const data=await snapshot();assert.equal(data.state,online?'ONLINE':'OFFLINE');return data;
};

// O ponto de mira é projetado pela câmera real no plano y=.9 usado por PlayerAim.
const aimEast=async()=>{
 const point=await page.evaluate(async()=>{
  const url=performance.getEntriesByType('resource').find(resource=>resource.name.includes('@react-three_fiber.js')).name;
  const{_roots}=await import(url),canvas=document.querySelector('canvas'),state=_roots.get(canvas).store.getState();
  const{playerPosition}=await import('/src/state/playerTransient.ts');
  const projected=state.camera.position.clone().set(playerPosition.x+4,.85,22.5).project(state.camera),rect=canvas.getBoundingClientRect();
  return {x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2};
 });
 await page.mouse.move(point.x,point.y);
};
const walk=async(key,targetX)=>{
 await aimEast();await page.waitForTimeout(400);
 const before=await snapshot();assert.equal(before.simulationBlocked,false,'simulação bloqueada antes de caminhar: '+JSON.stringify({paused:before.paused,focused:before.focused,active:before.activeElement}));
 const samples=[],start=Date.now();await page.keyboard.down(key);
 try {
  while(Date.now()-start<14000) {
   await aimEast();await page.waitForTimeout(90);
   const point=await page.evaluate(async()=>({...((await import('/src/state/playerTransient.ts')).playerPosition)}));samples.push(point);
   if(key==='KeyW'?point.x>=targetX:point.x<=targetX)break;
  }
 } finally {await page.keyboard.up(key);}
 await page.waitForTimeout(400);
 const final=await snapshot();assert.ok(samples.length>2,'amostra de movimento insuficiente');
 assert.ok(key==='KeyW'?final.player.x>=targetX:final.player.x<=targetX,`${key} não chegou ao destino: ${JSON.stringify({player:final.player,paused:final.paused,blocked:final.simulationBlocked,focus:final.focused,active:final.activeElement})}`);
 assert.ok(samples.every(point=>Math.abs(point.z-22.5)<.45),'desvio para os canteiros');
 return {key,targetX,durationMs:Date.now()-start,samples,final};
};

try {
 const url=new URL(process.argv[2]??'http://127.0.0.1:4183/');url.searchParams.set('perf','');url.searchParams.set('greenhousePreview','');
 await page.goto(url.href);await ready('mars');await page.getByTestId('greenhouse-preview').waitFor({state:'visible'});await page.waitForTimeout(1500);
 await relocate(7.5,22.5);
 report.offline=await snapshot();assert.equal(report.offline.state,'OFFLINE');assert.deepEqual(report.offline.legacy,[]);
 assert.equal(new Set(report.offline.nodes.map(node=>node.id)).size,report.offline.nodes.length,'IDs duplicados');
 assert.equal(visible(report.offline,'TET_Estufa'),true);assert.equal(visible(report.offline,'TET_Estufa_GrowLights'),true);wallsVisible(report.offline);
 assert.equal(visible(report.offline,'PROP_Estufa_Plantas_Online'),false);
 assert.ok(report.offline.lights.every(light=>light.intensity===0));
 await page.screenshot({path:'docs/handoffs/s2.12-b/v007-deck/greenhouse-offline.png'});
 report.offlinePerf=await page.evaluate(async()=>await window.__hordaPerf.sample(3000));

 report.online=await switchState(true);assert.equal(visible(report.online,'PROP_Estufa_Plantas_Online'),true);
 assert.ok(report.online.lights.some(light=>light.intensity>0),'ONLINE precisa iluminar o interior');wallsVisible(report.online);
 await page.screenshot({path:'docs/handoffs/s2.12-b/v007-deck/greenhouse-online.png'});
 report.onlinePerf=await page.evaluate(async()=>await window.__hordaPerf.sample(3000));
 report.enter=await walk('KeyW',14);
 assert.equal(visible(report.enter.final,'TET_Estufa'),false);assert.equal(visible(report.enter.final,'TET_Estufa_GrowLights'),false);
 assert.equal(visible(report.enter.final,'PROP_Estufa_Plantas_Online'),true);wallsVisible(report.enter.final);
 assert.ok(report.enter.final.lights.every(light=>light.intensity<.001),'luz apoiada no teto deve seguir seu corte');

 for(let angle=0;angle<8;angle++){
  await page.evaluate(async angle=>{const{useGameStore:store}=await import('/src/state/useGameStore.ts');store.setState({targetRotation:angle*Math.PI/4});},angle);
  await page.waitForTimeout(220);const data=await snapshot();wallsVisible(data);assert.equal(visible(data,'TET_Estufa'),false);
  report.angles.push({angle,camera:data.camera,wallsVisible:true,roofVisible:false});
 }
 report.offlineInside=await switchState(false);assert.equal(visible(report.offlineInside,'PROP_Estufa_Plantas_Online'),false);assert.equal(visible(report.offlineInside,'TET_Estufa'),false);
 report.exit=await walk('KeyS',7.5);assert.equal(visible(report.exit.final,'TET_Estufa'),true);wallsVisible(report.exit.final);
 report.onlineRestored=await switchState(true);assert.equal(visible(report.onlineRestored,'TET_Estufa_GrowLights'),true);assert.ok(report.onlineRestored.lights.some(light=>light.intensity>0));

 // Regressões funcionais de sistemas compartilhados. Os pontos iniciais são reposicionados por QA.
 await relocate(0,-9);await page.keyboard.press('KeyE');await page.getByRole('dialog',{name:'Conversa com EDEN'}).waitFor({state:'visible'});await page.keyboard.press('Escape');report.eden=true;
 await relocate(0,29.5);await page.keyboard.press('KeyE');await page.getByRole('button',{name:'Decolar para Shanghai'}).click();await ready('shanghai');await page.waitForTimeout(1200);await page.keyboard.press('KeyE');await page.waitForTimeout(400);
 await page.keyboard.press('KeyE');await page.getByRole('button',{name:'Retornar a Marte',exact:true}).click();await ready('mars');await page.waitForTimeout(1200);await page.keyboard.press('KeyE');await page.waitForTimeout(400);report.travel=true;
 report.return=await snapshot();assert.equal(report.return.state,'OFFLINE','prévia não persiste em save nem desbloqueia a estufa');
 await relocate(7.5,22.5);await page.keyboard.press('Escape');assert.equal(await page.getByText('Exploração pausada',{exact:true}).count(),1);await page.keyboard.press('Escape');report.pause=true;
 report.sample=await page.evaluate(async()=>await window.__hordaPerf.sample(3000));
 await relocate(0,20);await page.evaluate(async()=>{const{useGameStore:g}=await import('/src/state/useGameStore.ts');g.setState({targetZoom:22,targetRotation:Math.PI/4})});await page.waitForTimeout(1500);await page.screenshot({path:'docs/handoffs/s2.12-b/v007-deck/v007-vista-geral.png'});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
 console.log('QA greenhouse OK: OFFLINE/ONLINE, entrada W e saída S pelo vão, corte de teto/suportes, oito rotações, EDEN, viagem e pausa.');
} catch(error) {report.failure=String(error);throw error;}
finally {
 const output='docs/handoffs/s2.12-b/v007-deck/greenhouse-browser.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));await browser.close();
}
