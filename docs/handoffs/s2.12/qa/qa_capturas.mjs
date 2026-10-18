// S2.12 · capturas e vídeos na câmera real do jogo (Shanghai, área aberta), Explorador r7 e
// personagem atual, nas mesmas posições, câmera e luz: frente, costas, dois perfis (orientação
// em relação à câmera) e transições W/S, no zoom padrão e no zoom máximo do jogo. Uso: node qa_capturas.mjs <url-dev> <pasta-saida>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/rochatales/Automations/football-museum/package.json');
const { chromium } = require('playwright-core');
const [URL, OUT] = [process.argv[2] || 'http://127.0.0.1:5193/', process.argv[3] || '.'];
const espera = ms => new Promise(r => setTimeout(r, ms));
const VIEW = { width: 1280, height: 800 }, C = { x: 640, y: 400 };
const tela = (dx, dz, L = 240) => { const r = 0.707 * (dx - dz), d = 0.425 * (dx + dz), m = Math.hypot(r, d) || 1; return { x: C.x + L * r / m, y: C.y + L * d / m }; };
// câmera em (+x, +z) do player: frente = olhando para a câmera
const ORIENT = { frente: [1, 1], costas: [-1, -1], perfil_dir: [1, -1], perfil_esq: [-1, 1] };
const b = await chromium.launch({ headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const resumo = {};
for (const variante of ['r7', 'atual']) {
  const dir = `${OUT}/${variante}`; fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 960, height: 600 } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA', color: '#66e6ff' }, briefingSeen: true })));
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  const url = `${URL}?personagem=${variante}`;
  const pronto = c => page.waitForFunction(c => !!document.querySelector(c ? '.combat-canvas' : 'canvas') && !document.querySelector('.overlay[role=status]') && !!window.__hordaPlayerMotion, c, { timeout: 120000 });
  await page.goto(url); await pronto(false); await espera(2500);
  // viagem pela store (o fluxo de viagem não muda nesta tarefa e foi validado em qa_mapas)
  await page.evaluate(async () => {
    const { MAPS } = await import('/src/game/config.ts'); const t = await import('/src/state/playerTransient.ts');
    const { useExpeditionStore: e } = await import('/src/state/useExpeditionStore.ts'); const { useCombatStore: c } = await import('/src/state/useCombatStore.ts');
    t.placePlayer(MAPS.mars.exit); c.getState().selectEncounter(1); e.getState().send('board'); e.getState().send('depart');
  });
  await espera(800); await pronto(true); await page.keyboard.press('KeyE'); await espera(2000);
  let p = tela(0, -1); await page.mouse.move(p.x, p.y); await page.mouse.down(); await espera(3500); await page.mouse.up();
  await page.keyboard.down('KeyW'); await espera(1300); await page.keyboard.up('KeyW'); await espera(900);   // para a área aberta (z ≈ 3)
  const estados = {};
  for (const zoom of ['padrao', 'max']) {
  if (zoom === 'max') { await page.mouse.move(C.x + 200, C.y); await page.keyboard.down('Equal'); await espera(2500); await page.keyboard.up('Equal'); await espera(800); }
  for (const [o, [dx, dz]] of Object.entries(ORIENT)) {
    const nome = `${o}_${zoom}`;
    p = tela(dx, dz); await page.mouse.move(p.x, p.y); await espera(900);
    await page.screenshot({ path: `${dir}/${nome}_parado.png` });
    await page.keyboard.down('KeyW'); await espera(450); await page.screenshot({ path: `${dir}/${nome}_correndo.png` }); await espera(250); await page.keyboard.up('KeyW'); await espera(700);
    await page.keyboard.down('KeyS'); await espera(650); await page.screenshot({ path: `${dir}/${nome}_recuando.png` });
    estados[nome] = await page.evaluate(() => window.__hordaPlayerMotion.animationState);
    await espera(500); await page.keyboard.up('KeyS'); await espera(600);
    for (let i = 0; i < 4; i++) { const k = i % 2 ? 'KeyS' : 'KeyW'; await page.keyboard.down(k); await espera(380); await page.keyboard.up(k); }
    await espera(700);
  }
  }
  resumo[variante] = { erros, estado_no_recuo: estados, video: (await page.video().path()).split('/').pop() };
  await ctx.close();
}
fs.writeFileSync(`${OUT}/capturas.json`, JSON.stringify(resumo, null, 1));
console.log(JSON.stringify(resumo));
await b.close();
