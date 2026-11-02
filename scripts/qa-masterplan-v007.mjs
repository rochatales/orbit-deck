// QA funcional de código/estado em navegador. Sem screenshots ou avaliação artística.
// HORDA_QA_PACKAGE=/.../playwright-core/package.json node scripts/qa-masterplan-v007.mjs [url]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const report={errors:[],httpErrors:[],angles:[]};
page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
await page.addInitScript(()=>localStorage.setItem('horda-survivor:hub:v1',JSON.stringify({version:1,profile:{displayName:'Explorador QA',color:'#66e6ff'},briefingSeen:true})));
const ready=map=>page.waitForFunction(async map=>{const{useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');return s.getState().ready&&s.getState().session.map===map;},map);
const relocate=async(x,z)=>{
 await page.evaluate(async({x,z})=>{const{useExpeditionStore:s}=await import('/src/state/useExpeditionStore.ts');const{useGameStore:g}=await import('/src/state/useGameStore.ts');const{publishPlayerFrame}=await import('/src/state/playerTransient.ts');g.setState({isPaused:false});publishPlayerFrame(x,0,z,s.getState().session.map);s.setState({spawn:{x,y:0,z},panel:null,session:{...s.getState().session,phase:'walking',revision:s.getState().session.revision+1}});},{x,z});
 await page.waitForTimeout(1000);
};
const info=()=>page.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').find(r=>r.name.includes('@react-three_fiber.js'))?.name;if(!url)throw Error('R3F não carregado');
 const{_roots}=await import(url),state=_roots.get(document.querySelector('canvas')).store.getState();
 const data={ids:[],roofs:[],wallsInvisible:[],doors:[],camera:state.camera.position.toArray(),calls:state.gl.info.render.calls,triangles:state.gl.info.render.triangles};
 state.scene.traverse(n=>{if(!n.userData.id_estavel)return;data.ids.push(n.userData.id_estavel);if(n.userData.papel==='roof')data.roofs.push({id:n.userData.id_estavel,visible:n.visible});if(n.userData.papel==='wall'&&!n.visible)data.wallsInvisible.push(n.userData.id_estavel);if(n.userData.papel==='door')data.doors.push({id:n.userData.id_estavel,x:n.position.x,z:n.position.z});});return data;
});
try{
 await page.goto(process.argv[2]??'http://127.0.0.1:4182/?perf');await ready('mars');await page.waitForTimeout(2500);
 report.spawn=await info();assert.ok(report.spawn.ids.includes('TET_central-hub'));assert.equal(report.spawn.roofs.find(r=>r.id==='TET_central-hub').visible,false);assert.deepEqual(report.spawn.wallsInvisible,[]);
 for(let angle=0;angle<8;angle++){await page.evaluate(async angle=>{const{useGameStore:g}=await import('/src/state/useGameStore.ts');g.setState({targetRotation:angle*Math.PI/4});},angle);await page.waitForTimeout(250);const result=await info();assert.deepEqual(result.wallsInvisible,[]);report.angles.push({angle,camera:result.camera,wallsInvisible:result.wallsInvisible});}
 await relocate(0,-9);await page.keyboard.press('KeyE');await page.getByRole('dialog',{name:'Conversa com EDEN'}).waitFor({state:'visible'});assert.equal(await page.getByRole('dialog',{name:'Conversa com EDEN'}).count(),1);await page.keyboard.press('Escape');report.eden=true;
 await relocate(6.5,5);report.plaza=await info();assert.ok(report.plaza.roofs.every(r=>r.visible),'praça não corta coberturas dos módulos');
 await relocate(0,29.5);await page.keyboard.press('KeyE');await page.getByRole('button',{name:'Decolar para Shanghai'}).click();await ready('shanghai');await page.waitForTimeout(1200);await page.keyboard.press('KeyE');await page.waitForTimeout(400);report.shanghai=await info();
 await page.keyboard.press('KeyE');await page.getByRole('button',{name:'Retornar a Marte',exact:true}).click();await ready('mars');await page.waitForTimeout(1200);await page.keyboard.press('KeyE');await page.waitForTimeout(400);report.return=await info();assert.ok(report.return.ids.includes('TET_smart-lab'));report.travel=true;
 await relocate(0,.8);await page.keyboard.press('Escape');assert.equal(await page.getByText('Exploração pausada',{exact:true}).count(),1);await page.keyboard.press('Escape');report.pause=true;
 report.sample=await page.evaluate(async()=>await window.__hordaPerf.sample(3000));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);console.log('QA v007 OK: carregamento, IDs, corte por sala, oito rotações, EDEN, viagem e pausa.');
}finally{fs.writeFileSync('art-source/mars-masterplan-v007/notas/qa-runtime.json',JSON.stringify(report,null,2));await browser.close();}
