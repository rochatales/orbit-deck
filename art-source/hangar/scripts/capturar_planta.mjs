import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
try{
 const page=await browser.newPage({viewport:{width:1320,height:1450},deviceScaleFactor:1});
 await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:1320px;height:1450px}svg{display:block}</style></head><body>'+fs.readFileSync(path.join(root,'renders/v002/planta_encaixe.svg'),'utf8')+'</body></html>');
 await page.screenshot({path:path.join(root,'renders/v002/planta_encaixe.png'),fullPage:true,timeout:30000});
}finally{await browser.close()}
