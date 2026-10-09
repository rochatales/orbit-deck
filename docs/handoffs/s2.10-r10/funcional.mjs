// Checagens funcionais automáticas, iguais nos builds S2.9 e S2.10 (produção).
import { createRequire } from 'node:module';
const require = createRequire('/Users/rochatales/Automations/football-museum/package.json');
const { chromium } = require('playwright-core');
const espera = ms => new Promise(r => setTimeout(r, ms));
const BUILDS = [['S2.9', 'http://127.0.0.1:4174/'], ['S2.10', 'http://127.0.0.1:4175/']];
const b = await chromium.launch({ headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
for (const [nome, url] of BUILDS) {
  const page = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.addInitScript(() => localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA', color: '#66e6ff' }, briefingSeen: true })));
  const erros = []; page.on('pageerror', e => erros.push(String(e)));
  const r = {};
  const txt = () => page.evaluate(() => document.querySelector('.interaction')?.textContent ?? null);
  const pronto = (c) => page.waitForFunction(c => !!document.querySelector(c ? '.combat-canvas' : 'canvas') && !document.querySelector('.overlay[role=status]'), c, { timeout: 60000 });
  const seg = async (k, ms) => { await page.keyboard.down(k); await espera(ms); await page.keyboard.up(k); await espera(350); };
  await page.goto(url); await pronto(false); await espera(3000);
  r.aviso_spawn = await txt();
  // pausa por Escape e retomada
  await page.keyboard.press('Escape'); await espera(300);
  r.pausa_escape = await page.evaluate(() => !!Array.from(document.querySelectorAll('.overlay h2')).find(h => h.textContent.includes('pausada')));
  await page.keyboard.press('Escape'); await espera(300);
  r.retomou_escape = await page.evaluate(() => !Array.from(document.querySelectorAll('.overlay h2')).find(h => h.textContent.includes('pausada')));
  // perda de foco com W pressionado: pausa e libera teclas
  await page.keyboard.down('KeyW'); await espera(300); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await espera(300);
  r.pausa_blur = await page.evaluate(() => !!Array.from(document.querySelectorAll('.overlay h2')).find(h => h.textContent.includes('pausada')));
  await page.keyboard.up('KeyW'); await page.keyboard.press('Escape'); await espera(500);
  // rota ao deck (mesma do R10, a partir do spawn: recarrega para partir do mesmo ponto)
  await page.goto(url); await pronto(false); await espera(3000);
  const t = d => Math.round((d / 3.2) * 1000 + 30);
  await seg('KeyW', t(13)); await seg('KeyA', t(2.5)); await seg('KeyW', t(3)); await seg('KeyD', t(2.25)); await seg('KeyW', t(11.75));
  for (let i = 0; i < 8 && !((await txt()) ?? '').includes('aeronave'); i++) await seg('KeyW', 120);
  r.aviso_deck = await txt();
  await page.keyboard.press('KeyE'); await espera(500);
  r.cabine_aberta = await page.evaluate(() => !!document.querySelector('[aria-label="Cabine da aeronave"]'));
  await page.keyboard.press('KeyE'); await espera(800);   // desembarca em Marte
  r.desembarque_marte_aviso = await txt();
  await page.keyboard.press('KeyE'); await espera(500);
  await page.getByRole('button', { name: 'Decolar para Shanghai' }).click(); await espera(500); await pronto(true);
  r.chegou_shanghai = await page.evaluate(() => !!document.querySelector('.combat-canvas'));
  await page.keyboard.press('KeyE'); await espera(1500);
  r.aviso_desembarque_shanghai = await txt();
  await page.keyboard.press('KeyE'); await espera(500);
  await page.getByRole('button', { name: 'Retornar a Marte' }).click(); await espera(500); await pronto(false);
  await page.keyboard.press('KeyE'); await espera(1500);
  r.volta_marte = await page.evaluate(() => document.querySelector('.hud-top .eyebrow')?.textContent);
  r.aviso_volta = await txt();
  r.erros = erros;
  console.log(nome, JSON.stringify(r));
}
await b.close();
