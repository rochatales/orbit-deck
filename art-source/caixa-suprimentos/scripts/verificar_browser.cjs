// PLAYWRIGHT_MODULE / CHROME_EXECUTABLE apontam para ferramentas instaladas, sem dependência nova no jogo.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out=path.resolve('art-source/caixa-suprimentos/renders');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:1440,height:1000}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5183/tests/caixa-suprimentos.html');await page.waitForFunction(()=>window.__cratePreview?.ready);await page.waitForTimeout(1500);
 await page.keyboard.press('e');const far=await page.evaluate(()=>window.__cratePreview.state());
 if(far.phase!=='closed')throw Error('Abriu fora do alcance');
 await page.getByRole('button',{name:'Aproximar',exact:true}).click();await page.waitForTimeout(500);
 await page.screenshot({path:path.join(out,'preview-fechada.png')});await page.keyboard.press('e');await page.waitForTimeout(1000);
 const mid=await page.evaluate(()=>window.__cratePreview.state());await page.screenshot({path:path.join(out,'preview-revelacao.png')});
 if(mid.phase!=='opening'||mid.light<5)throw Error('Revelação não iniciou');
 await page.waitForTimeout(1800);const done=await page.evaluate(()=>window.__cratePreview.state());
 if(done.phase!=='open')throw Error('Abertura não terminou');
 await page.keyboard.press('e');await page.waitForTimeout(300);const repeated=await page.evaluate(()=>window.__cratePreview.state());if(repeated.elapsed!==2.4)throw Error('Interação repetida reiniciou');
 await page.screenshot({path:path.join(out,'preview-aberta.png')});await page.waitForTimeout(500);
 fs.writeFileSync('art-source/caixa-suprimentos/notas/browser.json',JSON.stringify({far,mid,done,repeated,errors,viewport:[1440,1000],method:'Prévia isolada com GLB real e Explorador r7. E fora/perto, conclusão e repetição. Não é aprovação de gameplay.'},null,2));
 const video=page.video();await context.close();await video.saveAs(path.join(out,'abertura-interacao.webm'));await browser.close();
 if(errors.length)throw Error(errors.join('\n'));console.log('PASSOU: distante bloqueado, E próximo, luz, fim mantido, sem repetição nem erros.');
})();
