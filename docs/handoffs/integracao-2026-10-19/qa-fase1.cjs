// QA técnico de integração no App real; posições/estados preparados estão descritos no JSON.
// Não é aceite visual, sessão manual nem benchmark de GPU.
// HORDA_QA_MODULE=<caminho/playwright> HORDA_QA_CHROMIUM=<executável> node <este-script> <url-dev>
const {chromium}=require(process.env.HORDA_QA_MODULE||'/Users/rochatales/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=__dirname,base=process.argv[2]||'http://127.0.0.1:5198/';
const report={method:'App real em Vite dev; perfil e viagem pela UI. Reposicionamento pelo spawn/store para percorrer Marte e Shanghai. Seletor exercitado pela UI, forçando derrota entre rodadas. Um robô neutralizado por QA para isolar caixas. Aproximação por W e pela lateral no loop real, com uma rota reta preparada para manter o rumo inicial do robô. Percepção: posições/rumo preparados no modo 1 e passo real da simulação do App, com loop de render pausado. Sem aprovação visual/jogabilidade nem benchmark.',url:base,viewport:[1440,1000],dpr:1,errors:[],consoleErrors:[],warnings:[],httpErrors:[],checks:{}};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM||'/Users/rochatales/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
 const shot=async name=>page.screenshot({path:path.join(out,name)});
 const state=()=>page.evaluate(()=>window.__qa.state());
 const place=async(x,z)=>{await page.evaluate(({x,z})=>window.__qa.place(x,z),{x,z});await page.waitForTimeout(700);};
 try{
 await page.goto(base);await page.getByLabel('Nome do explorador').fill('QA Consolidação');await page.getByRole('button',{name:'Entrar na colônia',exact:true}).click();
 await page.evaluate(async()=>{
  const [{useExpeditionStore:e},{useGameStore:g},{useCombatStore:c,combatRuntime:r},p,sim]=await Promise.all([import('/src/state/useExpeditionStore.ts'),import('/src/state/useGameStore.ts'),import('/src/state/useCombatStore.ts'),import('/src/state/playerTransient.ts'),import('/src/combat/simulation.ts')]);
  window.__qa={e,g,c,r,p,sim,place(x,z){const s=e.getState(),spawn={x,y:0,z};p.placePlayer(spawn);g.setState({isPaused:false});e.setState({spawn,panel:null,session:{...s.session,phase:'walking',revision:s.session.revision+1}});},state(){const s=r.simulation;return {map:e.getState().session.map,phase:e.getState().session.phase,encounter:c.getState().encounter,nearCrate:c.getState().nearCrate,player:{...p.playerPosition},paused:g.getState().isPaused,combat:s?{...s.snapshot,slots:s.robots.length,crates:s.crates.map(c=>({id:c.id,x:c.x,z:c.z,phase:c.phase,elapsed:c.elapsed,rewarded:c.rewarded}))}:null};}};
 });
 await page.waitForFunction(()=>window.__qa.e.getState().ready);await page.waitForTimeout(1600);report.checks.mars=await state();assert.equal(report.checks.mars.map,'mars');await shot('01-marte.png');
 await place(0,29.5);await page.getByRole('button',{name:'E · Entrar na aeronave',exact:true}).click();
 assert.equal(await page.getByLabel('Robôs no encontro').inputValue(),'hordas');
 const options=await page.getByLabel('Robôs no encontro').locator('option').evaluateAll(options=>options.map(o=>o.value));assert.deepEqual(options,['hordas','1','3','5','32']);report.checks.options=options;
 await shot('02-cabine-hordas.png');await page.getByRole('button',{name:'Decolar para Shanghai',exact:true}).click();
 await page.waitForFunction(()=>window.__qa.e.getState().ready&&window.__qa.e.getState().session.map==='shanghai'&&window.__qa.r.simulation?.crates.length===2);await page.waitForTimeout(1500);
 await page.getByRole('button',{name:'Desembarcar · E',exact:true}).click();await page.getByText('CONTATO IMINENTE',{exact:true}).waitFor();await shot('03-chegada-faixa-horda.png');
 await page.waitForFunction(()=>window.__qa.r.simulation.wave===1);report.checks.hordas=await state();assert.equal(report.checks.hordas.encounter,'hordas');assert.equal(report.checks.hordas.combat.alive,10);assert.equal(report.checks.hordas.combat.waves,4);assert.equal(report.checks.hordas.combat.total,100);await shot('04-horda1-hud.png');
 report.checks.selectors=[];
 for(const option of ['3','5','32','hordas','1']){
  await page.evaluate(()=>{const q=window.__qa,s=q.r.simulation;s.hp=0;q.c.getState().publish(s.snapshot);});
  await page.getByRole('dialog',{name:'Explorador abatido'}).waitFor();await page.getByLabel('Robôs no encontro').selectOption(option);await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await page.waitForFunction(option=>{const q=window.__qa,s=q.r.simulation;return s&&!s.dead&&s.robots.length===(option==='hordas'?40:Number(option));},option);
  const s=await state();assert.equal(String(s.encounter),option);assert.equal(s.combat.slots,option==='hordas'?40:Number(option));assert.ok(s.combat.crates.every(c=>c.phase==='closed'));report.checks.selectors.push(s);
 }
 await page.evaluate(()=>{window.__qa.r.simulation.robots[0].hp=0;});
 await place(-10,14.5);await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).waitFor();await shot('05-caixa-oeste-fechada.png');
 await page.keyboard.press('e');await page.waitForFunction(()=>window.__qa.r.simulation.crates[0].elapsed>=.85);report.checks.westOpening=await state();assert.equal(report.checks.westOpening.combat.reserve,144);await shot('06-caixa-oeste-revelacao.png');
 await page.keyboard.press('Escape');const paused=await state();await page.waitForTimeout(450);const frozen=await state();assert.equal(paused.combat.crates[0].elapsed,frozen.combat.crates[0].elapsed);report.checks.pause={paused,frozen};
 await page.getByRole('button',{name:'Retomar exploração',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.crates[0].phase==='open');await page.keyboard.press('e');report.checks.westOpen=await state();assert.equal(report.checks.westOpen.combat.reserve,144);await shot('07-caixa-oeste-aberta.png');
 await place(36,-19.5);await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).waitFor();await shot('08-caixa-nordeste-fechada.png');
 await page.getByRole('button',{name:'E · Abrir caixa · +48 munições',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.crates[1].elapsed>=.85);await shot('09-caixa-nordeste-revelacao.png');
 await page.waitForFunction(()=>window.__qa.r.simulation.crates[1].phase==='open');await page.keyboard.press('e');report.checks.bothOpen=await state();assert.equal(report.checks.bothOpen.combat.reserve,192);assert.equal(report.checks.bothOpen.combat.ammo,24);assert.ok(report.checks.bothOpen.combat.crates.every(c=>c.phase==='open'));
 await page.keyboard.down('c');await page.waitForTimeout(500);await page.keyboard.up('c');await page.waitForTimeout(400);await shot('10-caixa-nordeste-aberta-camera.png');
 await page.getByRole('button',{name:'Reiniciar encontro',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.crates.every(c=>c.phase==='closed'));report.checks.retry=await state();assert.equal(report.checks.retry.combat.reserve,96);assert.ok(report.checks.retry.combat.crates.every(c=>!c.rewarded));
 // Recompensa novamente na nova tentativa, pela interação real E.
 await page.evaluate(()=>{window.__qa.r.simulation.robots[0].hp=0;});await place(-10,14.5);await page.keyboard.press('e');await page.waitForFunction(()=>window.__qa.r.simulation.reserve===144);report.checks.retryReward=await state();
 await page.getByRole('button',{name:'Reiniciar encontro',exact:true}).click();await page.waitForFunction(()=>window.__qa.r.simulation.robots[0].hp>0);
 await place(0,-3.2);
 await page.evaluate(()=>{const q=window.__qa,s=q.r.simulation,r=s.robots[0];s.layout={...s.layout,routes:[[{x:0,z:8}]]};Object.assign(r,{x:0,z:0,angle:0,alerted:false,alertLeft:0,routeIndex:0,waypoint:0,path:[],repath:0});});
 await page.waitForTimeout(250);
 const liveState=()=>page.evaluate(()=>{const q=window.__qa,r=q.r.simulation.robots[0],p=q.p.playerPosition;return {player:{...p},robot:{x:r.x,z:r.z,angle:r.angle,alerted:r.alerted},distance:Math.hypot(r.x-p.x,r.z-p.z)};});
 const rearBefore=await liveState();
 const aim=await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const camera=_roots.get(document.querySelector('canvas')).store.getState().camera,rect=document.querySelector('canvas').getBoundingClientRect(),r=window.__qa.r.simulation.robots[0],v=camera.position.clone().set(r.x,.9,r.z).project(camera);return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};});
 await page.mouse.move(aim.x,aim.y);await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');
 const rearAfter=await liveState();assert.ok(rearAfter.distance<3,JSON.stringify(rearAfter));assert.equal(rearAfter.robot.alerted,false);assert.ok(Math.hypot(rearAfter.player.x-rearBefore.player.x,rearAfter.player.z-rearBefore.player.z)>.2);await shot('11a-aproximacao-costas-w.png');
 const current=await liveState();await place(current.robot.x+2.5,current.robot.z);await page.waitForFunction(()=>window.__qa.r.simulation.robots[0].alerted);const lateral=await liveState();await shot('11b-aproximacao-lateral-alerta.png');report.checks.livePerception={rearBefore,rearAfter,lateral};
 await place(0,-2.8);
 await page.keyboard.press('Escape');
 report.checks.perception=await page.evaluate(()=>{
  const q=window.__qa,s=q.r.simulation,r=s.robots[0];
  function observe(player){Object.assign(r,{x:0,z:0,angle:0,hp:75,alerted:false,alertLeft:0,routeIndex:0,waypoint:0,path:[],repath:0});const visible=q.sim.canSeePlayer(r,player,s.terrain);s.step(1/60,{player,aim:{x:0,z:10},firing:false,reload:false});return {player,visible,alerted:r.alerted,alertLeft:r.alertLeft};}
  const rear=observe({x:0,z:-2.8}),side=observe({x:2.8,z:0});
  const at=degrees=>({x:2.8*Math.sin(degrees*Math.PI/180),z:2.8*Math.cos(degrees*Math.PI/180)});
  const near120=observe(at(120)),rear160=observe(at(160));
  return {rear,side,near120,rear160};
 });
 assert.equal(report.checks.perception.rear.visible,false);assert.equal(report.checks.perception.rear.alerted,false);assert.equal(report.checks.perception.side.visible,true);assert.equal(report.checks.perception.side.alerted,true);assert.equal(report.checks.perception.near120.alerted,true);assert.equal(report.checks.perception.rear160.alerted,false);
 await shot('11-percepcao-preparacao.png');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.httpErrors,[]);report.status='passed';console.log('PASSOU: Marte/nave/Shanghai, hordas e HUD, seletor 1/3/5/32/hordas, 2 caixas +48, pausa, repetição, reinício e percepção curta sem costas.');
 }catch(e){report.status='failed';report.failure=String(e.stack||e);await shot('falha.png').catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'navegador.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
