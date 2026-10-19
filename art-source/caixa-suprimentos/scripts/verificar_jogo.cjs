const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[],out=path.resolve('art-source/caixa-suprimentos/renders/jogo');fs.mkdirSync(out,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));
 try {
 await page.goto('http://127.0.0.1:5183/');await page.getByLabel('Nome do explorador').fill('QA Suprimentos');await page.getByRole('button',{name:'Entrar na colônia'}).click();
 await page.evaluate(async()=>{
  const [{useExpeditionStore:e},{useGameStore:g},{useCombatStore:c,combatRuntime:r},p]=await Promise.all([import('/src/state/useExpeditionStore.ts'),import('/src/state/useGameStore.ts'),import('/src/state/useCombatStore.ts'),import('/src/state/playerTransient.ts')]);
  window.__qa={e,g,c,r,p,place(x,z){const s=e.getState(),spawn={x,y:0,z};p.placePlayer(spawn);g.setState({isPaused:false});e.setState({spawn,panel:null,session:{...s.session,phase:'walking',revision:s.session.revision+1}});},state(){const s=r.simulation;return {reserve:s?.reserve,ammo:s?.ammo,crates:s?.crates.map(c=>({id:c.id,phase:c.phase,elapsed:c.elapsed,rewarded:c.rewarded})),player:{...p.playerPosition},paused:g.getState().isPaused};}};
 });
 await page.waitForFunction(()=>window.__qa.e.getState().ready);await page.waitForTimeout(2500);
 await page.evaluate(()=>window.__qa.place(0,29.5));await page.waitForTimeout(800);
 await page.getByRole('button',{name:'E · Entrar na aeronave',exact:true}).click();await page.getByLabel('Robôs no encontro').selectOption('1');await page.getByRole('button',{name:'Decolar para Shanghai',exact:true}).click();
 await page.getByRole('button',{name:'Desembarcar · E',exact:true}).waitFor();await page.waitForFunction(()=>window.__qa.r.simulation?.crates.length===2);await page.waitForTimeout(2500);await page.getByRole('button',{name:'Desembarcar · E',exact:true}).click();
 await page.evaluate(()=>{const r=window.__qa.r.simulation.robots[0];Object.assign(r,{x:-48,z:-51,routeIndex:0,waypoint:0,path:[],alerted:false,repath:0});window.__qa.place(-5,2);});await page.waitForTimeout(500);await page.keyboard.press('e');const far=await page.evaluate(()=>window.__qa.state());assert.ok(far.crates.every(c=>c.phase==='closed'));
 await page.evaluate(()=>window.__qa.place(-10,14.5));await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).waitFor();await page.waitForTimeout(1200);
 const aimPoint=await page.evaluate(()=>{
  const r=document.querySelector('canvas').getBoundingClientRect(),q=window.__qa,p=q.p.playerPosition,s=q.g.getState(),a=s.targetRotation,dx=-10-p.x,dz=12-p.z,h=Math.hypot(13,18.38);
  return {x:r.left+r.width/2+(dx*Math.sin(a)-dz*Math.cos(a))*s.targetZoom,y:r.top+r.height/2-(-dx*Math.cos(a)*13/h+.35*18.38/h-dz*Math.sin(a)*13/h)*s.targetZoom};
 });
 await page.mouse.move(aimPoint.x,aimPoint.y);await page.keyboard.down('w');await page.waitForTimeout(2400);await page.keyboard.up('w');await page.waitForTimeout(250);
 const collision=await page.evaluate(()=>window.__qa.state());assert.ok(collision.player.z>=13.0&&collision.player.z<13.5,JSON.stringify(collision.player));
 await page.evaluate(()=>window.__qa.place(-10,14.5));await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(out,'01-caixa-oeste-fechada.png')});
 await page.keyboard.press('e');await page.waitForFunction(()=>window.__qa.r.simulation.crates[0].elapsed>=.9);const opening=await page.evaluate(()=>window.__qa.state());await page.screenshot({path:path.join(out,'02-revelacao-oeste.png')});assert.equal(opening.crates[0].phase,'opening');assert.equal(opening.reserve,144);
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>window.__qa.state());await page.waitForTimeout(900);const frozen=await page.evaluate(()=>window.__qa.state());assert.equal(paused.crates[0].elapsed,frozen.crates[0].elapsed);await page.keyboard.press('e');assert.equal((await page.evaluate(()=>window.__qa.state())).reserve,144);
 await page.getByRole('button',{name:'Retomar exploração',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.crates[0].phase==='open');await page.keyboard.press('e');const first=await page.evaluate(()=>window.__qa.state());assert.equal(first.reserve,144);assert.equal(first.crates[0].phase,'open');assert.equal(first.crates[1].phase,'closed');await page.screenshot({path:path.join(out,'03-caixa-oeste-aberta.png')});
 await page.evaluate(()=>window.__qa.place(36,-19.5));await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).waitFor();await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'04-caixa-nordeste-fechada.png')});
 await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.crates[1].elapsed>=.9);await page.screenshot({path:path.join(out,'05-revelacao-nordeste.png')});await page.waitForFunction(()=>window.__qa.r.simulation.crates[1].phase==='open');const both=await page.evaluate(()=>window.__qa.state());assert.equal(both.reserve,192);assert.ok(both.crates.every(c=>c.phase==='open'));await page.keyboard.press('e');assert.equal((await page.evaluate(()=>window.__qa.state())).reserve,192);
 await page.keyboard.down('c');await page.waitForTimeout(900);await page.keyboard.up('c');await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'06-aberta-camera-girada.png')});
 await page.mouse.click(900,450);await page.waitForTimeout(250);const shot=await page.evaluate(()=>window.__qa.state());assert.ok(shot.ammo<24);
 await page.keyboard.press('r');await page.waitForFunction(()=>window.__qa.r.simulation.ammo===24);const reloaded=await page.evaluate(()=>window.__qa.state());assert.equal(reloaded.reserve,192-(24-shot.ammo));
 await page.evaluate(()=>window.__qa.e.getState().restartMission());await page.waitForTimeout(800);const retry=await page.evaluate(()=>window.__qa.state());assert.equal(retry.reserve,96);assert.ok(retry.crates.every(c=>c.phase==='closed'&&!c.rewarded));
 fs.writeFileSync('art-source/caixa-suprimentos/notas/jogo-browser.json',JSON.stringify({method:'App real em Vite; viagem pela UI. Posições preparadas via store para QA; 1 robô colocado na rua norte para isolar a interação; interações E/botão, W contra a caixa, disparo e R, pausas e câmera reais. Não é aprovação de gameplay.',far,collision,opening,paused,frozen,first,both,shot,reloaded,retry,errors},null,2));
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASSOU: 2 caixas, E/botão, +48 cada, pausa, câmera, isolamento, repetição e retry.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
