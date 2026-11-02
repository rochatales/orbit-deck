// QA das portas S6.12: sobe Vite (dev e preview), roda as medições e encerra os servidores.
// Replay técnico e reposição assistida; não substitui navegação física nem aceite do autor.
// Uso: HORDA_QA_PACKAGE=/caminho/playwright-core/package.json node scripts/qa-colony-doors-run.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createServer, preview } from 'vite';

const { chromium } = createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
// Repassado ao replay filho; padrão: headless shell já presente no cache local do Playwright.
process.env.HORDA_QA_CHROMIUM ??= `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const executablePath = process.env.HORDA_QA_CHROMIUM;
const out = 'docs/handoffs/s6.12/evidencias/portas';

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${args.join(' ')} saiu com ${code}`))));
  });
}

/** Jogo real (Marte montado pelo React): percorre as 16 portas, abre/fecha e gira a câmera com Q/C. */
async function tourGame(url, dir, sourceAccess) {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--enable-gpu', '--use-angle=metal'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir, size: { width: 1280, height: 800 } } });
  const page = await context.newPage(), errors = [], warnings = {};
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Aviso de DEV preexistente: CameraRig/PlayerAim irmãos com key={revision} em OfficeScene.
    if (m.text().includes('two children with the same key')) warnings.chavesReactDuplicadas = (warnings.chavesReactDuplicadas ?? 0) + 1;
    else errors.push(m.text());
  });
  await page.addInitScript(() => localStorage.setItem('exoden:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'Explorador QA', color: '#66e6ff' }, briefingSeen: true })));
  let result;
  try {
    await page.goto(url);
    await page.waitForTimeout(6000);
    if (!sourceAccess) {
      // Preview: só bundle de produção. Confirma carga, canvas e ausência de erros.
      await page.keyboard.down('q'); await page.waitForTimeout(1500); await page.keyboard.up('q');
      await page.screenshot({ path: `${dir}/preview-marte.png` });
      result = { canvas: await page.locator('canvas').count() };
    } else {
      await page.evaluate(async () => {
        const T = await import('/node_modules/.vite/deps/three.js');
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const { useExpeditionStore: s } = await import('/src/state/useExpeditionStore.ts');
        const { useGameStore: g } = await import('/src/state/useGameStore.ts');
        const { publishPlayerFrame } = await import('/src/state/playerTransient.ts');
        const root = _roots.get(document.querySelector('canvas')).store.getState();
        window.qaMove = (x, z) => { g.setState({ isPaused: false }); publishPlayerFrame(x, 0, z, 'mars'); s.setState({ spawn: { x, y: 0, z }, panel: null, session: { ...s.getState().session, phase: 'walking', revision: s.getState().session.revision + 1 } }); };
        const doors = [], tracked = [];
        root.scene.traverse(n => { if (n.name === 'PortaAutomatica') doors.push(n); });
        const p = new T.Vector3();
        window.qaDoors = doors.map(d => {
          d.getWorldPosition(p); const front = d.localToWorld(new T.Vector3(0, 0, 3.2)), back = d.localToWorld(new T.Vector3(0, 0, -3.2));
          return { x: p.x, z: p.z, front: [front.x, front.z], back: [back.x, back.z] };
        });
        // Acompanha folhas/faixas e batentes do GLB num raio de 4 m de cada porta.
        root.scene.traverse(n => {
          if (!n.isMesh) return;
          let door = false; for (let o = n; o; o = o.parent) if (o.name === 'PortaAutomatica') door = true;
          const name = n.userData.colony_name ?? n.name ?? '';
          let portal = false; for (let o = n; o; o = o.parent) if (/_Port[ao]/.test(o.userData?.colony_name ?? o.name ?? '')) portal = true;
          if (door || portal) tracked.push(n);
        });
        const stats = { frames: 0, visible: 0, depthWrite: 0, material: 0, opacityJumps: 0, opacityJumpsFrameNormal: 0, maxStepFrameNormal: 0, maxFrameMs: 0, samples: [], tracked: tracked.length, doors: doors.length };
        const prev = tracked.map(n => ({ v: n.visible, d: n.material.depthWrite, m: n.material, o: n.material.opacity }));
        window.qaStats = stats;
        let last = performance.now();
        const loop = now => {
          stats.frames++;
          const dt = now - last; last = now; stats.maxFrameMs = Math.max(stats.maxFrameMs, dt);
          for (let i = 0; i < tracked.length; i++) {
            const n = tracked[i], o = prev[i];
            stats.visible += Number(o.v !== n.visible); stats.depthWrite += Number(o.d !== n.material.depthWrite);
            stats.material += Number(o.m !== n.material);
            const step = Math.abs(o.o - n.material.opacity);
            // Salto > 0,25 em um frame: troca binária, salvo travada do próprio frame (catch-up do amortecimento).
            if (step > 0.25) {
              stats.opacityJumps++;
              if (dt <= 1000 / 30) stats.opacityJumpsFrameNormal++;
              if (stats.samples.length < 12) stats.samples.push({ mesh: n.name || n.parent?.name, de: +o.o.toFixed(3), para: +n.material.opacity.toFixed(3), frameMs: +dt.toFixed(1) });
            }
            if (dt <= 1000 / 30) stats.maxStepFrameNormal = Math.max(stats.maxStepFrameNormal, step);
            o.v = n.visible; o.d = n.material.depthWrite; o.m = n.material; o.o = n.material.opacity;
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
      const doors = await page.evaluate(() => window.qaDoors);
      for (let i = 0; i < doors.length; i++) {
        const d = doors[i];
        await page.evaluate(([x, z]) => window.qaMove(x, z), d.front); await page.waitForTimeout(900);
        await page.evaluate(([x, z]) => window.qaMove(x, z), [d.x, d.z]); await page.waitForTimeout(700);
        await page.keyboard.down('q'); await page.waitForTimeout(900); await page.keyboard.up('q');
        if (i % 4 === 0) await page.screenshot({ path: `${dir}/porta-${String(i + 1).padStart(2, '0')}-aberta.png` });
        await page.evaluate(([x, z]) => window.qaMove(x, z), d.back); await page.waitForTimeout(700);
        await page.keyboard.down('c'); await page.waitForTimeout(900); await page.keyboard.up('c');
        if (i % 4 === 0) await page.screenshot({ path: `${dir}/porta-${String(i + 1).padStart(2, '0')}-fechada.png` });
      }
      result = await page.evaluate(() => window.qaStats);
    }
  } finally {
    await context.close();
    const original = await page.video().path();
    await page.video().saveAs(`${dir}/${sourceAccess ? 'jogo-portas' : 'preview'}.webm`);
    fs.unlinkSync(original);
    await browser.close();
  }
  return { errors, warnings, result };
}

const report = { data: new Date().toISOString() };
const dev = await createServer({ server: { host: '127.0.0.1', port: 5189, strictPort: true }, logLevel: 'warn' });
await dev.listen();
try {
  await run(['scripts/qa-colony-doors.mjs', 'depois', 'http://127.0.0.1:5189/']);
  report.jogo = await tourGame('http://127.0.0.1:5189/', `${out}/jogo`, true);
} finally {
  await dev.close();
}
const server = await preview({ preview: { host: '127.0.0.1', port: 4189, strictPort: true }, logLevel: 'warn' });
try {
  report.preview = await tourGame('http://127.0.0.1:4189/', `${out}/preview`, false);
} finally {
  await new Promise(resolve => server.httpServer.close(resolve));
}
fs.writeFileSync(`${out}/jogo-e-preview.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
