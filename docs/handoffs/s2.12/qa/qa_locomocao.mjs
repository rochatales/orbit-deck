// S2.12 · QA de locomoção no navegador (servidor de desenvolvimento, câmera real do jogo).
// Uso: node qa_locomocao.mjs <url-dev> <pasta-saida>
// Requer playwright-core instalado localmente (aqui: o de outro projeto, sem dependência nova).
// Lê só o que o jogo expõe em DEV: window.__hordaPlayerMotion, __hordaPlayerActions,
// __hordaPlayerScene e o módulo playerTransient (posição real).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/rochatales/Automations/football-museum/package.json');
const { chromium } = require('playwright-core');
const [URL, OUT] = [process.argv[2] || 'http://127.0.0.1:5193/', process.argv[3] || '.'];
fs.mkdirSync(OUT, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
const VIEW = { width: 1280, height: 800 }, C = { x: 640, y: 400 };
// câmera isométrica (ângulo π/4): direção de mundo (dx, dz) → deslocamento de tela
const tela = (dx, dz, L = 220) => { const n = Math.hypot(dx, dz) || 1; const r = 0.707 * (dx - dz) / n, d = 0.425 * (dx + dz) / n; const m = Math.hypot(r, d); return { x: C.x + L * r / m, y: C.y + L * d / m }; };

const b = await chromium.launch({ headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: VIEW } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA', color: '#66e6ff' }, briefingSeen: true })));
const erros = []; page.on('pageerror', e => erros.push(String(e)));
await page.goto(URL); await espera(2000); await page.goto(URL);
await page.waitForFunction(() => !!document.querySelector('canvas') && !document.querySelector('.overlay[role=status]') && !!window.__hordaPlayerMotion && !!window.__hordaPlayerScene, null, { timeout: 120000 });
await espera(2500);

const estado = () => page.evaluate(async () => {
  const m = await import('/src/state/playerTransient.ts'); const mo = window.__hordaPlayerMotion, a = window.__hordaPlayerActions || {};
  const ativo = Object.entries(a).filter(([, x]) => x && x.isRunning() && x.getEffectiveWeight() > 0.5).map(([n, x]) => `${n}@${x.timeScale.toFixed(2)}`);
  return { x: m.playerPosition.x, z: m.playerPosition.z, st: mo.animationState, v: mo.planarSpeed, f: mo.facingAngle, ativo };
});
const r = [];
const reg = async (nome, extra = {}) => { const e = await estado(); r.push({ nome, ...e, ...extra }); return e; };
const segura = async (teclas, ms) => { for (const t of teclas) await page.keyboard.down(t); await espera(ms); };
const solta = async teclas => { for (const t of teclas) await page.keyboard.up(t); };

// amostragem por quadro do contato dos pés (mundo) e da posição real do corpo
async function amostrarPes(ms) {
  return page.evaluate(async ms => {
    const m = await import('/src/state/playerTransient.ts');
    const sc = window.__hordaPlayerScene;
    const ossos = ['mixamorigLeftFoot', 'mixamorigRightFoot', 'mixamorigLeftToeBase', 'mixamorigRightToeBase'].map(n => sc.getObjectByName(n));
    const out = []; const t0 = performance.now();
    await new Promise(res => { (function f(t) { const q = ossos.map(o => [o.matrixWorld.elements[12], o.matrixWorld.elements[13], o.matrixWorld.elements[14]]);
      out.push({ t, px: m.playerPosition.x, pz: m.playerPosition.z, st: window.__hordaPlayerMotion.animationState, q });
      if (t - t0 < ms) requestAnimationFrame(f); else res(); })(performance.now()); });
    return out;
  }, ms);
}
function analisarPes(fr, J = 6) {
  // Física a 60 Hz e render a 120 Hz: velocidades em janelas de J quadros (~50 ms).
  // Pé de apoio = pé cujos dedos ficam a até 1,5 cm do mínimo da amostra e abaixo dos dedos
  // do outro pé em toda a janela. Mede-se a velocidade horizontal do tornozelo no mundo.
  const yMin = Math.min(...fr.flatMap(f => [f.q[2][1], f.q[3][1]]));
  const vel = [], corpo = [];
  for (let i = 0; i + J < fr.length; i++) {
    const a = fr[i], c = fr[i + J], dt = (c.t - a.t) / 1000; if (dt <= 0) continue;
    corpo.push(Math.hypot(c.px - a.px, c.pz - a.pz) / dt);
    for (const k of [0, 1]) {
      let apoio = true;
      for (let n = i; n <= i + J; n++) { const f = fr[n]; if (f.q[2 + k][1] - yMin > 0.015 || f.q[2 + k][1] > f.q[3 - k][1] + 1e-4) { apoio = false; break; } }
      if (apoio) vel.push(Math.hypot(c.q[k][0] - a.q[k][0], c.q[k][2] - a.q[k][2]) / dt);
    }
  }
  // critério tolerante (corrida tem fase aérea): pé mais baixo da janela, a até 3 cm do mínimo
  const vel2 = [];
  for (let i = 0; i + J < fr.length; i++) {
    const a = fr[i], c = fr[i + J], dt = (c.t - a.t) / 1000; if (dt <= 0) continue;
    const k = a.q[2][1] <= a.q[3][1] ? 0 : 1;
    if (a.q[2 + k][1] - yMin < 0.03 && c.q[2 + k][1] - yMin < 0.03) vel2.push(Math.hypot(c.q[k][0] - a.q[k][0], c.q[k][2] - a.q[k][2]) / dt);
  }
  const q = (v, p) => { const s = [...v].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(3) : null; };
  return { quadros: fr.length, janelas_apoio: vel.length, corpo_m_s: q(corpo, 0.5), pe_apoio_mediana_m_s: q(vel, 0.5), pe_apoio_p90_m_s: q(vel, 0.9),
    deslize_relativo_mediana: vel.length && q(corpo, 0.5) ? +(q(vel, 0.5) / q(corpo, 0.5)).toFixed(3) : null,
    tolerante: { janelas: vel2.length, pe_mediana_m_s: q(vel2, 0.5), deslize_relativo: vel2.length && q(corpo, 0.5) ? +(q(vel2, 0.5) / q(corpo, 0.5)).toFixed(3) : null }, estados: [...new Set(fr.map(f => f.st))] };
}

await reg('inicio');
// 1. W na direção do cursor (cursor para +z no mundo: corredor livre a partir do spawn)
let m = tela(0, 1); await page.mouse.move(m.x, m.y); await espera(600);
const a0 = await reg('mira +z parado');
await segura(['KeyW'], 1200); const w1 = await reg('W 1,2 s (mira +z)'); const pesRun = analisarPes(await amostrarPes(1500)); await solta(['KeyW']);
await espera(800); const sw = await reg('soltou W');
// 2. S recua mantendo o corpo voltado ao cursor
await segura(['KeyS'], 1200); const s1 = await reg('S 1,2 s (mira +z)'); const pesBack = analisarPes(await amostrarPes(1500)); await solta(['KeyS']);
await espera(800); await reg('soltou S');
// 3. W + S juntos, A e D sozinhos
const p0 = await estado(); await segura(['KeyW', 'KeyS'], 1000); const ws = await reg('W+S 1 s'); await solta(['KeyW', 'KeyS']);
await segura(['KeyA'], 700); await solta(['KeyA']); await segura(['KeyD'], 700); await solta(['KeyD']); await espera(300); const ad = await reg('A e D 0,7 s cada');
// 4. alternância rápida W/S
const seq = [];
for (let i = 0; i < 8; i++) { const k = i % 2 ? 'KeyS' : 'KeyW'; await page.keyboard.down(k); await espera(260); seq.push((await estado()).st); await page.keyboard.up(k); }
await espera(500); await reg('após alternância rápida', { sequencia: seq });
// 5. cursor girando durante a corrida e o recuo: deslocamento coerente com a orientação
const coer = [];
for (const tecla of ['KeyW', 'KeyS']) {
  await page.keyboard.down(tecla);
  for (let i = 0; i < 24; i++) { const ang = i * 0.26; const p = tela(Math.sin(ang), Math.cos(ang)); await page.mouse.move(p.x, p.y); const e1 = await estado(); await espera(70); const e2 = await estado();
    const dx = e2.x - e1.x, dz = e2.z - e1.z, d = Math.hypot(dx, dz);
    // só amostras sem obstrução (velocidade real ≥ 90% da esperada): parede desvia o deslocamento
    if (d > 0.05 && e1.v >= 0.9 * (tecla === 'KeyW' ? 4.2 : 1.2) && e2.v >= 0.9 * (tecla === 'KeyW' ? 4.2 : 1.2)) coer.push({ tecla, cos: (dx * Math.sin(e2.f) + dz * Math.cos(e2.f)) / d }); }
  await page.keyboard.up(tecla); await espera(500);
}
r.push({ nome: 'coerência deslocamento × orientação ao girar o cursor', W_cos_min: Math.min(...coer.filter(c => c.tecla === 'KeyW').map(c => c.cos)), S_cos_max: Math.max(...coer.filter(c => c.tecla === 'KeyS').map(c => c.cos)), amostras: coer.length });
// 6. cursor sobre o personagem durante o recuo: orientação estável
m = tela(0, 1); await page.mouse.move(m.x, m.y); await espera(400);
await page.keyboard.down('KeyS'); const fs0 = []; for (let i = 0; i < 20; i++) { await page.mouse.move(C.x + (i % 3 - 1) * 4, C.y + (i % 2 ? 4 : -4)); await espera(50); fs0.push((await estado()).f); } await page.keyboard.up('KeyS');
r.push({ nome: 'cursor sobre o personagem (S)', variacao_orientacao_rad: Math.max(...fs0) - Math.min(...fs0) });
// 7. giro de câmera (Q) mantendo movimento pela mira
m = tela(1, 0); await page.mouse.move(m.x, m.y); await espera(400);
await page.keyboard.down('KeyQ'); await espera(600); await page.keyboard.up('KeyQ');
const q0 = await estado(); await segura(['KeyW'], 600); const q1 = await estado(); await solta(['KeyW']);
r.push({ nome: 'W após girar a câmera (Q)', cos_desloc_orientacao: ((q1.x - q0.x) * Math.sin(q1.f) + (q1.z - q0.z) * Math.cos(q1.f)) / Math.max(1e-6, Math.hypot(q1.x - q0.x, q1.z - q0.z)) });
await page.keyboard.down('KeyC'); await espera(600); await page.keyboard.up('KeyC'); await espera(600);
// 8. parede: recuar contra o colisor atrás do spawn
await page.goto(URL); await page.waitForFunction(() => !!window.__hordaPlayerMotion && !document.querySelector('.overlay[role=status]'), null, { timeout: 120000 }); await espera(2500);
m = tela(0, 1); await page.mouse.move(m.x, m.y); await espera(500);   // corpo voltado a +z; S recua para −z (parede)
await segura(['KeyS'], 1500); const parede = await reg('S contra a parede 1,5 s'); await solta(['KeyS']);
await segura(['KeyW'], 700); const retoma = await reg('retomada W após parede'); await solta(['KeyW']); await espera(600);
// 9. pausa com W pressionado
await page.keyboard.down('KeyW'); await espera(300); await page.keyboard.press('Escape'); await espera(200); const pz0 = await estado(); await espera(800); const pz1 = await estado();
await page.keyboard.up('KeyW'); r.push({ nome: 'pausa com W', deslocamento_m: Math.hypot(pz1.x - pz0.x, pz1.z - pz0.z), estado: pz1.st, pausa: await page.evaluate(() => !!Array.from(document.querySelectorAll('.overlay h2')).find(h => h.textContent.includes('pausada'))) });
await page.keyboard.press('Escape'); await espera(400);

const rel = { url: URL, erros, resultados: r, pes: { run: pesRun, backward: pesBack },
  checagens: { W_desloca_na_mira: ((w1.x - a0.x) * Math.sin(w1.f) + (w1.z - a0.z) * Math.cos(w1.f)) / Math.hypot(w1.x - a0.x, w1.z - a0.z) > 0.98, S_recua_oposto: ((s1.x - sw.x) * Math.sin(s1.f) + (s1.z - sw.z) * Math.cos(s1.f)) / Math.hypot(s1.x - sw.x, s1.z - sw.z) < -0.98, S_mantem_orientacao: Math.abs(Math.atan2(Math.sin(s1.f - w1.f), Math.cos(s1.f - w1.f))) < 0.1,
    WS_parado: Math.hypot(ws.x - p0.x, ws.z - p0.z) < 0.05, AD_parado: Math.hypot(ad.x - ws.x, ad.z - ws.z) < 0.05, parede_idle: parede.st === 'idle', retomada: retoma.st === 'walking' } };
fs.writeFileSync(`${OUT}/qa_locomocao.json`, JSON.stringify(rel, null, 1));
console.log(JSON.stringify(rel.checagens), JSON.stringify(rel.pes));
await ctx.close(); await b.close();
