// S2.12 · QA de mapas: rota ao deck com W pela mira (portas), cabine, viagem, combate em
// movimento em Shanghai (mirar, atirar, recarregar), retorno e controles depois da troca de mapa.
// Uso: node qa_mapas.mjs <url-dev> <pasta-saida>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/rochatales/Automations/football-museum/package.json');
const { chromium } = require('playwright-core');
const [URL, OUT] = [process.argv[2] || 'http://127.0.0.1:5193/', process.argv[3] || '.'];
fs.mkdirSync(OUT, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
const C = { x: 640, y: 400 };
const tela = (dx, dz, L = 240) => { const r = 0.707 * (dx - dz), d = 0.425 * (dx + dz), m = Math.hypot(r, d) || 1; return { x: C.x + L * r / m, y: C.y + L * d / m }; };
const b = await chromium.launch({ headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.addInitScript(() => localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA', color: '#66e6ff' }, briefingSeen: true })));
const erros = []; page.on('pageerror', e => erros.push(String(e)));
const pronto = c => page.waitForFunction(c => !!document.querySelector(c ? '.combat-canvas' : 'canvas') && !document.querySelector('.overlay[role=status]') && !!window.__hordaPlayerMotion, c, { timeout: 120000 });
const txt = () => page.evaluate(() => document.querySelector('.interaction')?.textContent ?? null);
const hud = () => page.evaluate(() => document.querySelector('.combat-hud')?.textContent ?? '');
const est = () => page.evaluate(async () => { const m = await import('/src/state/playerTransient.ts'); const mo = window.__hordaPlayerMotion; return { x: +m.playerPosition.x.toFixed(2), z: +m.playerPosition.z.toFixed(2), st: mo.animationState, v: +mo.planarSpeed.toFixed(2) }; });
const r = { erros };
await page.goto(URL); await espera(1500); await page.goto(URL); await pronto(false); await espera(2500);

// 1. rota ao deck só com W e o cursor apontado para cada ponto (condução pela mira, passando
// pelas aberturas do complexo; pontos da rota BFS da S2.10, folga 0,42 m)
const pontos = [[0, 13.75], [2.5, 13.75], [2.5, 16.75], [0.25, 16.75], [0.25, 28.6]];
const trilha = [];
async function irPara(px, pz, tol = 0.35) {
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 120; i++) {
    const e = await est(); const dx = px - e.x, dz = pz - e.z; if (Math.hypot(dx, dz) < tol) break;
    const p = tela(dx, dz); await page.mouse.move(p.x, p.y); await espera(60);
  }
  await page.keyboard.up('KeyW'); await espera(350); trilha.push(await est());
}
for (const [px, pz] of pontos) await irPara(px, pz);
for (let i = 0; i < 10 && !((await txt()) ?? '').includes('aeronave'); i++) { await page.keyboard.down('KeyW'); await espera(100); await page.keyboard.up('KeyW'); await espera(300); }
r.rota = trilha; r.aviso_deck = await txt();
console.log('ROTA', JSON.stringify(trilha), r.aviso_deck);
// 2. cabine e viagem com 1 robô
await page.keyboard.press('KeyE'); await espera(500);
r.cabine = await page.evaluate(() => !!document.querySelector('[aria-label="Cabine da aeronave"]'));
r.mov_bloqueado_na_cabine = await (async () => { const a = await est(); await page.keyboard.down('KeyW'); await espera(500); await page.keyboard.up('KeyW'); const c = await est(); return Math.hypot(c.x - a.x, c.z - a.z) < 0.01 && c.st === 'idle'; })();
await page.selectOption('select[aria-label="Robôs no encontro"]', '1');
await page.getByRole('button', { name: 'Decolar para Shanghai' }).click(); await espera(500); await pronto(true);
await page.keyboard.press('KeyE'); await espera(2000);
r.shanghai_inicio = await est();
// 3. combate em movimento: mira para −z, atira andando para a frente e recuando, recarrega recuando
let p = tela(0, -1); await page.mouse.move(p.x, p.y); await espera(300);
await page.mouse.down(); await page.keyboard.down('KeyW'); await espera(700); const c1 = await est(); await page.keyboard.up('KeyW');
await page.keyboard.down('KeyS'); await espera(700); const c2 = await est(); await page.mouse.up();
await page.keyboard.press('KeyR'); await espera(400); const recarga = await hud(); await espera(1400); await page.keyboard.up('KeyS'); await espera(400);
r.combate = { atirando_W: c1, atirando_S: c2, hud_apos_recarga: (await hud()).slice(-90), hud_durante_recarga: recarga.slice(0, 60) };
// 4. retorno a Marte pela cabine (desembarque em Shanghai fica junto da nave)
const ex = await page.evaluate(async () => { const { MAPS } = await import('/src/game/config.ts'); const t = await import('/src/state/playerTransient.ts'); return [t.playerPosition.x, t.playerPosition.z, MAPS.shanghai.exit]; });
p = tela(ex[2].x - ex[0], ex[2].z - ex[1]); await page.mouse.move(p.x, p.y); await espera(350);
for (let i = 0; i < 30 && !((await txt()) ?? '').includes('aeronave'); i++) { await page.keyboard.down('KeyW'); await espera(90); await page.keyboard.up('KeyW'); await espera(150); }
r.aviso_volta_nave = await txt();
await page.keyboard.press('KeyE'); await espera(500);
await page.getByRole('button', { name: 'Retornar a Marte' }).click(); await espera(500); await pronto(false);
await page.keyboard.press('KeyE'); await espera(1500);
p = tela(0, -1); await page.mouse.move(p.x, p.y); await espera(400);
const m0 = await est(); await page.keyboard.down('KeyW'); await espera(600); const m1 = await est(); await page.keyboard.up('KeyW');
r.marte_depois_da_volta = { titulo: await page.evaluate(() => document.querySelector('.hud-top .eyebrow')?.textContent), antes: m0, W: m1 };
r.selo = await page.evaluate(() => document.querySelector('.qa-asset')?.textContent);
fs.writeFileSync(`${OUT}/qa_mapas.json`, JSON.stringify(r, null, 1));
console.log(JSON.stringify(r).slice(0, 2500));
await b.close();
