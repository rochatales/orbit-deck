// S6.3 · capturas e medições da Shanghai fase 01 com a câmera real do jogo.
// Não é benchmark de GPU nem aceite visual. Servidor e browser encerram em finally.
// HORDA_QA_PACKAGE=<package.json que fornece playwright-core> node scripts/s6.3/qa-capturas.mjs
//
// Saída em docs/handoffs/s6.3/evidencias/:
//   vistas/<ponto>-<k>.jpg  8 orientações (Q/C em passos de 45°) na chegada e em 3 pontos de rota
//   closes/<tema>.jpg       zoom máximo: rua, calçada, fachada, entulho
//   comparacao/ref-<n>.jpg  referência do autor lado a lado com a captura do jogo
//   planta.svg              ruas/prédios, colisores, spawns, patrulhas, loot e reserva de pouso
//   qa.json                 contagens do renderer, ?perf (p50/p95) e comparação com Shanghai atual e Marte
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const out = 'docs/handoffs/s6.3/evidencias';
for (const dir of ['vistas', 'closes', 'comparacao']) fs.mkdirSync(`${out}/${dir}`, { recursive: true });
const layout = JSON.parse(fs.readFileSync('src/assets/shanghai-fase01/layout.json', 'utf8'));
const PORT = 5195, ORIGIN = `http://127.0.0.1:${PORT}`;
const { chromium } = createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HORDA_QA_CHROMIUM ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    args: ['--enable-gpu', '--use-angle=metal'],
});
const server = await createServer({ server: { host: '127.0.0.1', port: PORT, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'warn' });
const report = { viewport: [1440, 900], dpr: 1, limitation: 'Chromium headless com ANGLE/Metal; tempos de quadro são de requestAnimationFrame, não de GPU.', views: [], closes: [], perf: [], errors: [] };

async function open(context, url) {
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(`${url}: ${e}`));
    await page.goto(url);
    await page.waitForFunction(() => window.__shanghaiQA?.state().ready, null, { timeout: 60000 });
    await page.waitForFunction(() => !document.querySelector('[role=status]'), null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.evaluate(async () => {
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        window.qaRoot = _roots.get(document.querySelector('canvas')).store.getState();
        window.__shanghaiQA.disableCombat();
    });
    return page;
}
const counters = page => page.evaluate(() => {
    const { gl, camera } = window.qaRoot;
    return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, zoom: camera.zoom };
});
async function place(page, x, z, angle, zoomFactor) {
    await page.evaluate(({ x, z, angle, zoomFactor }) => {
        window.__shanghaiQA.place(x, z, angle);
        if (zoomFactor) setTimeout(async () => {
            const { useGameStore: g } = await import('/src/state/useGameStore.ts');
            g.setState({ targetZoom: g.getState().minZoom * zoomFactor });
        }, 150);
    }, { x, z, angle, zoomFactor });
    await page.waitForTimeout(2600);
}

try {
    await server.listen();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('horda-survivor:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'QA S6.3', color: '#66e6ff' }, briefingSeen: true })));
    const page = await open(context, `${ORIGIN}/tests/shanghai-phase01.html?shanghaiFase01&perf`);

    // 8 orientações na chegada e em 3 pontos das rotas, zoom inicial do jogo.
    for (const point of layout.viewpoints) {
        for (let k = 0; k < 8; k++) {
            await place(page, point.x, point.z, Math.PI / 4 + k * Math.PI / 4);
            await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/vistas/${point.id}-${k}.jpg` });
            report.views.push({ point: point.id, x: point.x, z: point.z, orientation: k, ...(await counters(page)) });
        }
    }
    // Closes no zoom máximo (3,25 × o mínimo), mesma luz do jogo.
    const building = layout.buildings.find(b => !b.ruin) ?? layout.buildings[0];
    const rubble = layout.buildings.find(b => b.ruin) ?? layout.buildings[1];
    const closes = [
        ['rua', layout.exit.x, layout.exit.z - 6],
        ['calcada', layout.viewpoints[1].x, layout.viewpoints[1].z],
        ['fachada', building.x + building.w / 2 + 3, building.z],
        ['entulho', rubble.x + rubble.w / 2 + 3, rubble.z],
    ];
    for (const [name, x, z] of closes) {
        await place(page, x, z, Math.PI / 4, 3.25);
        await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/closes/${name}.jpg` });
        report.closes.push({ name, x, z, ...(await counters(page)) });
    }
    // ?perf na chegada, zoom inicial.
    await place(page, layout.exit.x, layout.exit.z, Math.PI / 4, 1.6);
    report.perf.push({ ...(await page.evaluate(() => window.__hordaPerf.sample(4000))), scenario: 'shanghai-fase01', counters: await counters(page) });
    await page.close();

    // Comparação: Shanghai atual (sem ?shanghaiFase01) e Marte, mesmo viewport.
    for (const [map, url] of [['shanghai-atual', `${ORIGIN}/tests/shanghai-phase01.html?perf`], ['marte', `${ORIGIN}/tests/shanghai-phase01.html?map=mars&perf`]]) {
        const other = await open(context, url);
        await other.waitForTimeout(1500);
        report.perf.push({ ...(await other.evaluate(() => window.__hordaPerf.sample(4000))), scenario: map, counters: await counters(other) });
        await other.close();
    }

    // Referências lado a lado: esquina oblíqua × rota; cruzamento × chegada no zoom mínimo.
    const side = await context.newPage();
    const pairs = [[1, 'fase01-ref-1-esquina.webp', 'vistas/' + layout.viewpoints[1].id + '-0.jpg'], [2, 'fase01-ref-2-cruzamento.webp', 'vistas/chegada-0.jpg']];
    for (const [n, ref, shot] of pairs) {
        const refUrl = `data:image/webp;base64,${fs.readFileSync(`docs/sprint-6/referencias-shanghai/${ref}`).toString('base64')}`;
        const shotUrl = `data:image/jpeg;base64,${fs.readFileSync(`${out}/${shot}`).toString('base64')}`;
        await side.setViewportSize({ width: 1800, height: 620 });
        await side.setContent(`<body style="margin:0;background:#1d2326;color:#eee;font:14px sans-serif;display:flex;gap:12px;padding:12px">
            <figure style="margin:0;flex:1"><img src="${refUrl}" style="width:100%;height:560px;object-fit:contain"><figcaption>Referência do autor (${ref})</figcaption></figure>
            <figure style="margin:0;flex:1"><img src="${shotUrl}" style="width:100%;height:560px;object-fit:contain"><figcaption>Jogo, câmera real (${shot})</figcaption></figure></body>`);
        await side.screenshot({ type: 'jpeg', quality: 82, path: `${out}/comparacao/ref-${n}.jpg` });
    }
    await side.close();
    await context.close();
} finally {
    await server.close();
    await browser.close();
}

// Planta vetorial a partir dos mesmos dados do runtime.
const { minX, maxX, minZ, maxZ } = layout.bounds, S = 8, W = (maxX - minX) * S, H = (maxZ - minZ) * S;
const X = x => ((x - minX) * S).toFixed(1), Z = z => ((z - minZ) * S).toFixed(1);
const rect = (r, style) => `<rect x="${X(r.minX)}" y="${Z(r.minZ)}" width="${((r.maxX - r.minX) * S).toFixed(1)}" height="${((r.maxZ - r.minZ) * S).toFixed(1)}" ${style}/>`;
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 40}" width="${W}" height="${H + 40}" font-family="sans-serif" font-size="11">`,
    `<rect width="${W}" height="${H}" fill="#55524c"/>`,
    ...layout.buildings.map(b => rect({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 }, `fill="${b.ruin ? '#8a6f5c' : '#b9ad98'}"`)),
    ...layout.obstacles.map(o => rect(o, 'fill="none" stroke="#e8463c" stroke-width="1.5"')),
    rect(layout.landingReservation, 'fill="#4fb3e8" fill-opacity="0.25" stroke="#4fb3e8"'),
    ...layout.patrolRoutes.map(r => `<polyline points="${[...r, r[0]].map(p => `${X(p.x)},${Z(p.z)}`).join(' ')}" fill="none" stroke="#f2c94c" stroke-dasharray="6 4"/>`),
    ...layout.routes.map(r => `<polyline points="${r.map(p => `${X(p.x)},${Z(p.z)}`).join(' ')}" fill="none" stroke="#66e6ff" stroke-width="3" stroke-opacity="0.8"/>`),
    ...layout.spawns.map(s => `<circle cx="${X(s.x)}" cy="${Z(s.z)}" r="3" fill="#e8463c"/>`),
    ...layout.loot.map(l => `<rect x="${(+X(l.x) - 5).toFixed(1)}" y="${(+Z(l.z) - 5).toFixed(1)}" width="10" height="10" fill="${l.kind === 'deposito' ? '#7be07b' : '#c792ea'}"/>`),
    `<circle cx="${X(layout.ship.x)}" cy="${Z(layout.ship.z)}" r="6" fill="#ffffff"/>`,
    `<text x="8" y="${H + 26}" fill="#222">Prédios (bege; ruína marrom) · colisores (vermelho) · reserva de pouso (azul) · rotas (ciano) · patrulhas (amarelo) · spawns (pontos vermelhos) · depósitos (verde) · esconderijos (lilás) · nave (branco). 1 m = ${S} px</text>`,
    '</svg>'].join('\n');
fs.writeFileSync(`${out}/planta.svg`, svg + '\n');
fs.writeFileSync(`${out}/qa.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ views: report.views.length, closes: report.closes.length, perf: report.perf.map(p => ({ scenario: p.scenario, calls: p.counters.calls, triangles: p.counters.triangles })), errors: report.errors }, null, 2));
