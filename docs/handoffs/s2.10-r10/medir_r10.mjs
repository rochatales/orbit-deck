// Comparação ?perf S2.9 × S2.10 em build de produção (M1, M2, S1, S2).
// Mesmo roteiro de entradas nos dois builds; alterna a ordem a cada repetição.
// Uso: node medir_r10.mjs <repeticoes> [cenarios...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/rochatales/Automations/football-museum/package.json');
const { chromium } = require('playwright-core');
const BUILDS = [
  { nome: 'S2.9', commit: 'ab9afc4', url: 'http://127.0.0.1:4174/?perf' },
  { nome: 'S2.10', commit: 'f28b6bb', url: 'http://127.0.0.1:4175/?perf' }
];
const REP = Number(process.argv[2] || 3);
const CENARIOS = process.argv.slice(3).length ? process.argv.slice(3) : ['M1', 'M2', 'S1', 'S2'];
const VIEW = { width: 1280, height: 800 };
const espera = ms => new Promise(r => setTimeout(r, ms));

function init() {
  localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA', color: '#66e6ff' }, briefingSeen: true }));
  const renderers = new Map(); let id = 1; window.__commits = {};
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers,
    inject(r) { const i = id++; renderers.set(i, r); window.__commits[i] = 0; return i; },
    onCommitFiberRoot(i) { window.__commits[i] = (window.__commits[i] || 0) + 1; },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, onScheduleFiberRoot() {} };
}

async function pronto(page, combate = false) {
  await page.waitForFunction(c => !!document.querySelector(c ? '.combat-canvas' : 'canvas') && !document.querySelector('.overlay[role=status]') && !!window.__hordaPerf, combate, { timeout: 60000 });
}
async function segurar(page, tecla, ms) { await page.keyboard.down(tecla); await espera(ms); await page.keyboard.up(tecla); await espera(350); }
const texto = page => page.evaluate(() => document.querySelector('.interaction')?.textContent ?? '');

// rota do spawn ao deck de Marte (BFS na geometria de produção, folga 0,42 m).
// Sem mira, o personagem olha para +z: W = +z, A = +x, D = −x (contrato da S2.1).
async function irAoDeck(page) {
  const v = 3.2, t = d => Math.round((d / v) * 1000 + 30);
  await segurar(page, 'KeyW', t(13)); await segurar(page, 'KeyA', t(2.5)); await segurar(page, 'KeyW', t(3.0));
  await segurar(page, 'KeyD', t(2.25)); await segurar(page, 'KeyW', t(11.75));
  for (let i = 0; i < 8 && !(await texto(page)).includes('aeronave'); i++) await segurar(page, 'KeyW', 120);
  if (!(await texto(page)).includes('aeronave')) throw new Error('não chegou ao deck: ' + await texto(page));
}

async function irAShanghai(page, robos) {
  await espera(3000);   // cena e física prontas (Suspense) antes de andar
  await irAoDeck(page);
  await page.keyboard.press('KeyE');
  await page.waitForSelector('[aria-label="Cabine da aeronave"]', { timeout: 10000 });
  await page.selectOption('select[aria-label="Robôs no encontro"]', String(robos));
  await page.getByRole('button', { name: 'Decolar para Shanghai' }).click();
  await espera(500); await pronto(page, true);
  await page.keyboard.press('KeyE');            // desembarca
  await espera(2500);
}

// mira para −z (rua à frente do desembarque, de onde vêm os robôs): na câmera
// isométrica (ângulo π/4), −z aparece para a direita e para cima do centro
const MIRA = { x: VIEW.width / 2 + 0.707 * 150, y: VIEW.height / 2 - 0.425 * 150 };

async function amostra(page, roteiro) {
  const antes = await page.evaluate(() => ({ ...window.__commits }));
  const p = page.evaluate(() => window.__hordaPerf.sample(10000));
  await roteiro();
  const r = await p;
  const depois = await page.evaluate(() => ({ ...window.__commits }));
  const commits = Object.fromEntries(Object.keys(depois).map(k => [k, depois[k] - (antes[k] || 0)]));
  return { r, commits };
}

const alternarWS = page => async () => { for (let i = 0; i < 5; i++) { await page.keyboard.down(i % 2 ? 'KeyS' : 'KeyW'); await espera(1800); await page.keyboard.up(i % 2 ? 'KeyS' : 'KeyW'); await espera(150); } };

async function cenario(page, nome) {
  if (nome === 'M1') { await espera(3000); return amostra(page, async () => {}); }
  if (nome === 'M2') { await espera(3000); return amostra(page, alternarWS(page)); }
  if (nome === 'S1') {
    await irAShanghai(page, 1);
    await page.mouse.move(MIRA.x, MIRA.y); await page.mouse.down(); await espera(4000); await page.mouse.up();
    const hud = await page.evaluate(() => document.querySelector('.combat-hud')?.textContent ?? '');
    await espera(1500);
    const res = await amostra(page, alternarWS(page));
    res.hud_antes = hud; return res;
  }
  if (nome === 'S2') {
    await irAShanghai(page, 5);
    await page.mouse.move(MIRA.x, MIRA.y); await espera(300);
    return amostra(page, async () => {
      await page.mouse.down(); const w = alternarWS(page)(); await espera(5000); await page.keyboard.press('KeyR'); await w; await page.mouse.up();
    });
  }
}

const browser = await chromium.launch({ headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const saida = [];
for (let rep = 0; rep < REP; rep++) {
  const ordem = rep % 2 ? [...BUILDS].reverse() : BUILDS;
  for (const nome of CENARIOS) for (const b of ordem) {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); await page.addInitScript(init);
    const erros = []; page.on('pageerror', e => erros.push(String(e)));
    try {
      await page.goto(b.url); await pronto(page);
      const vis = await page.evaluate(() => document.visibilityState);
      const { r, commits, hud_antes } = await cenario(page, nome);
      const hud = await page.evaluate(() => document.querySelector('.combat-hud')?.textContent ?? '');
      const reg = { rep, build: b.nome, commit: b.commit, cenario: nome, visibilidade: vis, status: r.status, motivos: r.invalidReasons ?? r.reasons ?? null, avisos: r.warnings,
        raf: r.rafIntervals, loaf: r.longAnimationFrames, renderer: r.renderer, cobertura: r.coverage, commits, hud_antes, hud_depois: hud, erros, contexto: rep === 0 ? r.context ?? null : undefined };
      saida.push(reg);
      console.log(JSON.stringify({ rep, b: b.nome, c: nome, st: r.status, p50: r.rafIntervals?.p50, p95: r.rafIntervals?.p95, max: r.rafIntervals?.max, o33: r.rafIntervals?.rafOver33, o50: r.rafIntervals?.rafOver50, commits, hud_antes: (hud_antes || "").slice(-60), hud: hud.slice(-60), erros: erros.length }));
    } catch (e) { saida.push({ rep, build: b.nome, cenario: nome, falha: String(e) }); console.log('FALHA', b.nome, nome, String(e).slice(0, 200)); }
    await ctx.close();
  }
}
fs.writeFileSync(new URL('./r10_resultados.json', import.meta.url), JSON.stringify(saida, null, 1));
await browser.close();
