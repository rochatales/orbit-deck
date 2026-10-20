// S0.4 / Fase 5.1: evidência técnica no build do checkout principal.
// Não aprova jogabilidade nem mede tempo de GPU. Não acessa imports de src/ ou ganchos DEV.
// npm run build
// HORDA_QA_PACKAGE=/caminho/playwright/package.json node scripts/qa-s0.4-build.mjs [pasta-nova]
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),out=path.resolve(process.argv[2]??'docs/sprint-0/evidencias/796ae3a');
fs.mkdirSync(out,{recursive:true});
assert.ok(!fs.existsSync(path.join(out,'carregamento.json')),'Usar uma pasta nova para preservar a evidência anterior.');
const require=createRequire(path.join(root,'package.json'));
const {preview}=require('vite');
const qaRequire=createRequire(process.env.HORDA_QA_PACKAGE??path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json'));
const {chromium}=qaRequire('playwright-core');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const runtimeBase='796ae3a6776a623fb2c839310f04eb58925efc93';
assert.equal(execFileSync('git',['diff',runtimeBase,'--','src','package.json','pnpm-lock.yaml'],{cwd:root,encoding:'utf8'}),'');
const port=Number(process.env.HORDA_QA_PORT??4196),url=`http://127.0.0.1:${port}/?perf`;
const record={status:'running',runtimeBase,buildCheckout:root,buildCommit:revision,date:new Date().toISOString(),method:'Vite preview do build do checkout principal, perfil limpo criado pela UI; somente DOM, teclado/mouse e API pública ?perf. M1 30 s parado; M2 30 s com W/S alternados por automação, sem validação humana da rota. Sessão automatizada não substitui S0.4/S2.9 manuais.',limitations:['Chromium headless/ANGLE Metal, sem aprovação de fluidez ou gameplay.','rAF p50/p95 são intervalos do navegador, não tempo de GPU.','Carregamento inicial inclui o preenchimento do perfil; início é performance.now() da navegação.','M2 registra entrada W/S automatizada; não certifica 30 s de trajeto sem obstrução.'],environment:{model:execFileSync('sysctl',['-n','hw.model'],{encoding:'utf8'}).trim(),cpu:execFileSync('sysctl',['-n','machdep.cpu.brand_string'],{encoding:'utf8'}).trim(),ramBytes:Number(execFileSync('sysctl',['-n','hw.memsize'],{encoding:'utf8'})),os:execFileSync('sw_vers',[],{encoding:'utf8'}).trim(),viewport:[1440,1000],dpr:1},pageErrors:[],consoleErrors:[],warnings:[],httpErrors:[],scenarios:[]};
let server,browser,page;
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
try{
 server=await preview({root,preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
 browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM??path.join(os.homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'),args:['--enable-gpu','--use-angle=metal','--ignore-gpu-blocklist']});
 record.environment.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page=await context.newPage();page.setDefaultTimeout(90000);
 page.on('pageerror',e=>record.pageErrors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')record.consoleErrors.push(m.text());if(m.type()==='warning')record.warnings.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)record.httpErrors.push({url:r.url(),status:r.status()});});
 await page.goto(url);await page.getByLabel('Nome do explorador').fill('Referência S0.4');await page.getByRole('button',{name:'Entrar na colônia',exact:true}).click();
 await page.waitForFunction(()=>window.__hordaPerf?.report().sceneEvents.some(e=>e.kind==='scene-assets-ready'&&e.map==='mars'));
 record.loading=await page.evaluate(()=>window.__hordaPerf.report());
 assert.equal(record.loading.context.build,'production');assert.ok(record.loading.latestCounters.drawCalls>0);
 record.productionHooks=await page.evaluate(()=>({playerMotion:typeof window.__hordaPlayerMotion,playerActions:typeof window.__hordaPlayerActions,playerScene:typeof window.__hordaPlayerScene,assetBadge:!!document.querySelector('.qa-asset')}));
 assert.deepEqual(record.productionHooks,{playerMotion:'undefined',playerActions:'undefined',playerScene:'undefined',assetBadge:false});
 await page.screenshot({path:path.join(out,'01-marte-carregado.png')});
 await page.waitForTimeout(1500);
 const m1=await page.evaluate(()=>window.__hordaPerf.sample(30000));assert.equal(m1.status,'valid');assert.deepEqual(m1.warnings,[]);assert.ok(m1.rafIntervals&&m1.coverage.intervalsCollected>0);
 record.scenarios.push({id:'M1',condition:'Marte parado, 30 s, entrada inicial, r7, perfil de teste, sem movimentar câmera',sample:m1});console.log('M1 válida:',m1.rafIntervals);
 await page.screenshot({path:path.join(out,'02-marte-m1.png')});
 // Câmera inicial π/4: aponta para o norte do mundo. W/S têm tempos proporcionais a 4,2/1,2 m/s.
 await page.mouse.move(970,300);
 const moving=page.evaluate(()=>window.__hordaPerf.sample(30000));
 const start=Date.now();let cycles=0;
 while(Date.now()-start<30000){
  await page.keyboard.down('KeyW');await page.waitForTimeout(220);await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyS');await page.waitForTimeout(770);await page.keyboard.up('KeyS');cycles++;
 }
 const m2=await moving;assert.equal(m2.status,'valid');assert.deepEqual(m2.warnings,[]);assert.ok(m2.rafIntervals&&m2.coverage.intervalsCollected>0);
 record.scenarios.push({id:'M2',condition:'Marte com W/S alternados, 30 s de entrada automatizada; sem certificar percurso livre',cycles,sample:m2});console.log('M2 válida:',m2.rafIntervals);
 await page.screenshot({path:path.join(out,'03-marte-m2.png')});
 write('perf-referencia.json',await page.evaluate(()=>window.__hordaPerf.report()));
 record.controls={};
 await page.keyboard.down('KeyQ');await page.waitForTimeout(180);await page.keyboard.up('KeyQ');
 await page.keyboard.down('KeyC');await page.waitForTimeout(180);await page.keyboard.up('KeyC');record.controls.qc='entrada real exercitada; aceite visual pendente';
 await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Exploração pausada',exact:true}).waitFor();record.controls.pause=true;
 await page.getByRole('button',{name:'Retomar exploração',exact:true}).click();
 record.dom=await page.locator('body').innerText();
 assert.deepEqual(record.pageErrors,[]);assert.deepEqual(record.consoleErrors,[]);assert.deepEqual(record.httpErrors,[]);
 record.status='passed';console.log('PASSOU: build de produção, cena/GLBs prontos, 2 amostras de 30 s, Q/C e pausa.');
}catch(e){record.status='failed';record.failure=String(e.stack??e);if(page)await page.screenshot({path:path.join(out,'falha.png')}).catch(()=>{});throw e;}
finally{
 write('carregamento.json',record);
 if(browser)await browser.close();
 if(server)await new Promise(resolve=>server.httpServer.close(resolve));
}
