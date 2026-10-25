// QA assistido: apoio vem do layout, não da malha. Aceite visual continua do autor.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out='docs/handoffs/s2.12-b/v007-deck',report={method:'Fixture dev, Chromium GPU, 1440×900; reposição assistida de itens. Sem aceite de jogabilidade.',errors:[],cases:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM??'/Users/rochatales/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-gpu','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5193/tests/shanghai-phase01.html');await page.waitForFunction(()=>window.__shanghaiQA?.state().ready,null,{timeout:60000});await page.waitForTimeout(2000);
 await page.evaluate(async()=>{const src=await(await fetch('/src/app/GameCanvas.tsx')).text();const{_roots}=await import(src.match(/from ["']([^"']*@react-three_fiber[^"']*)["']/)[1]);window.ringRoot=[..._roots.values()][0].store;window.__shanghaiQA.disableCombat();const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');r.simulation.hearts.forEach(p=>p.active=false)});
 for(const c of [{name:'rua',x:-17.5,z:10,playerX:-14.5,playerZ:10,y:0},{name:'calcada',x:-24.8,z:5,playerX:-21.5,playerZ:5,y:.12},{name:'canteiro',x:-44.55,z:-28.9,playerX:-44.5,playerZ:-25.5,y:.148}]){
  await page.evaluate(c=>window.__shanghaiQA.place(c.playerX,c.playerZ,Math.PI/4),c);await page.waitForTimeout(1100);
  await page.evaluate(async c=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');const{placeResourceDrop}=await import('/src/combat/resourcePlacement.ts');const{phase01SurfaceHeight}=await import('/src/game/shanghai/surfaces.ts');const d=r.simulation.drops[0];d.active=false;d.spawned=false;window.pendingDrop={c,d,placeResourceDrop,phase01SurfaceHeight}},c);await page.waitForTimeout(50);
  await page.evaluate(()=>{const{c,d,placeResourceDrop,phase01SurfaceHeight}=window.pendingDrop;placeResourceDrop(d,c.x,c.z,'titanium',phase01SurfaceHeight)});await page.waitForTimeout(1400);
  const state=await page.evaluate(async()=>{const{combatRuntime:r}=await import('/src/state/useCombatStore.ts');const s=window.ringRoot.getState();const ring=s.scene.getObjectByName('ResourceRing-titanium'),matrix=ring.instanceMatrix.array;let item; s.scene.traverseVisible(o=>{if(o.name==='TitaniumCollectibleMesh'){let root=o;while(root&&root.name!=='ResourceVisual')root=root.parent;item=root?.position.toArray()}});return{drop:{...r.simulation.drops[0]},ringCount:ring.count,ringY:matrix[13],itemAnchor:item}});
  assert.equal(state.ringCount,1);assert.ok(Math.abs(state.ringY-(c.y+.006))<1e-7);assert.equal(state.drop.surfaceTitanium,c.y);
  assert.ok(state.itemAnchor[1]>c.y+.28&&state.itemAnchor[1]<c.y+.42);
  await page.screenshot({path:`${out}/anel-${c.name}.png`});report.cases.push({...c,...state});
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(`${out}/aneis-browser.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
