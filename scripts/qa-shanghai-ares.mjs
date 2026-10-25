// QA da integração S6.3 no jogo real. Reposição assistida só em Marte para
// chegar ao embarque; viagem, desembarque e retorno pelos controles da UI.
// HORDA_QA_PACKAGE=<package.json com playwright-core> node scripts/qa-shanghai-ares.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const out = 'docs/handoffs/s6.3-shanghai-ares-runtime/evidencias';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
    executablePath: process.env.HORDA_QA_CHROMIUM ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    args: ['--enable-gpu', '--use-angle=metal'] });
const report = { metodo: 'Chrome headless com GPU, 1440×900, DPR 1; jogo dev, câmera real; reposição assistida até deck Marte. Não é aceite de jogabilidade nem tempo de GPU.', views: [], errors: [] };
try {
    for (const [phase, url] of [['antes', process.env.HORDA_QA_BASE ?? 'http://127.0.0.1:5181/'], ['depois', process.env.HORDA_QA_URL ?? 'http://127.0.0.1:5180/']]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        try {
            await context.addInitScript(() => localStorage.setItem('exoden:hub:v1', JSON.stringify({ version: 1, profile: { displayName: 'Explorador QA', color: '#66e6ff' }, briefingSeen: true })));
            const page = await context.newPage();
            page.on('pageerror', error => report.errors.push({ phase, message: String(error) }));
            await page.goto(url + '?perf');
            await page.waitForTimeout(5500);
            await page.evaluate(async () => {
                const { useExpeditionStore: s } = await import('/src/state/useExpeditionStore.ts');
                const { useGameStore: g } = await import('/src/state/useGameStore.ts');
                const { publishPlayerFrame } = await import('/src/state/playerTransient.ts');
                g.setState({ isPaused: false });
                publishPlayerFrame(0, 0, 29.5, 'mars');
                s.setState({ spawn: { x: 0, y: 0, z: 29.5 }, panel: null, session: { ...s.getState().session, phase: 'walking', revision: s.getState().session.revision + 1 } });
            });
            await page.waitForTimeout(1800);
            // Mesma câmera e enquadramento para o deck de Marte antes/depois.
            await page.evaluate(async () => {
                const source=await (await fetch('/src/app/GameCanvas.tsx')).text();
                const { _roots }=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
                window.aresQA=_roots.get(document.querySelector('canvas')).store;
            });
            report[`${phase}Mars`]=await page.evaluate(()=>{
                const r=window.aresQA.getState();
                return {ship:!!r.scene.getObjectByName('MarsARES'),deck:!!r.scene.getObjectByName('MarsARESDeck'),render:{...r.gl.info.render}};
            });
            await page.screenshot({path:`${out}/${phase}-marte.png`});
            report[`${phase}MarsPerf`]=await page.evaluate(()=>window.__hordaPerf.sample(10000));
            await page.keyboard.press('e');
            await page.getByRole('dialog', { name: 'Cabine da aeronave' }).waitFor();
            await page.getByRole('combobox', { name: 'Robôs no encontro' }).selectOption('1');
            await page.getByRole('button', { name: 'Decolar para Shanghai' }).click();
            await page.getByRole('heading', { name: 'Área de pouso · Shanghai' }).waitFor();
            await page.waitForTimeout(4000);
            await page.getByRole('button', { name: 'Desembarcar · E' }).click();
            await page.waitForTimeout(1800);
            const initial = await page.evaluate(async () => {
                const source = await (await fetch('/src/app/GameCanvas.tsx')).text();
                const { _roots } = await import(source.match(/from "([^"]*@react-three_fiber[^\"]*)"/)[1]);
                const { useExpeditionStore: s } = await import('/src/state/useExpeditionStore.ts');
                const { playerPosition } = await import('/src/state/playerTransient.ts');
                window.aresQA = _roots.get(document.querySelector('canvas')).store;
                const root = window.aresQA.getState();
                const ares = root.scene.getObjectByName('ShanghaiARES');
                return { session: s.getState().session, player: { ...playerPosition }, ares: !!ares,
                    position: ares?.position.toArray(), render: { ...root.gl.info.render }, memory: { ...root.gl.info.memory } };
            });
            assert.equal(initial.session.phase, 'walking');
            assert.ok(Math.hypot(initial.player.x, initial.player.z - 9.5) < .05);
            assert.equal(initial.ares, phase === 'depois');
            report[phase] = initial;
            await page.screenshot({ path: `${out}/${phase}-chegada.png` });
            report[`${phase}Perf`] = await page.evaluate(() => window.__hordaPerf.sample(10000));
            if (phase === 'depois') {
                for (let i = 0; i < 8; i++) {
                    await page.evaluate(async i => {
                        const { useGameStore: g } = await import('/src/state/useGameStore.ts');
                        g.setState({ targetRotation: i * Math.PI / 4 });
                    }, i);
                    await page.waitForTimeout(1000);
                    report.views.push(await page.evaluate(i => {
                        const root = window.aresQA.getState();
                        const ares = root.scene.getObjectByName('ShanghaiARES');
                        const materials = [];
                        ares.traverse(o => { if (o.isMesh) materials.push({ name: o.name, visible: o.visible, opacity: o.material.opacity }); });
                        return { angle: i * 45, camera: root.camera.position.toArray(), render: { ...root.gl.info.render }, materials };
                    }, i));
                    await page.screenshot({ path: `${out}/giro-${i * 45}.png` });
                }
                // Aproximação com o zoom real máximo, sem outra câmera.
                await page.evaluate(async () => {
                    const { useGameStore: g } = await import('/src/state/useGameStore.ts');
                    g.setState({ targetRotation: -Math.PI / 4, targetZoom: g.getState().minZoom * 3.25 });
                });
                await page.waitForTimeout(1500);
                await page.screenshot({ path: `${out}/detalhe-entrada.png` });
                // Tecla real W de frente para a escada: o colisor impede atravessar.
                await page.evaluate(async () => {
                    const { useGameStore: g } = await import('/src/state/useGameStore.ts');
                    g.setState({ targetRotation: Math.PI / 4, targetZoom: g.getState().minZoom * 1.6 });
                });
                await page.waitForTimeout(1000);
                const target = await page.evaluate(async () => {
                    const T = await import('/node_modules/.vite/deps/three.js');
                    const root = window.aresQA.getState();
                    const p = new T.Vector3(0, .65, 14).project(root.camera);
                    const b = root.gl.domElement.getBoundingClientRect();
                    return { x: b.x + (p.x + 1) * b.width / 2, y: b.y + (1 - p.y) * b.height / 2 };
                });
                await page.mouse.move(target.x, target.y);
                await page.keyboard.down('w'); await page.waitForTimeout(1100); await page.keyboard.up('w');
                report.collision = await page.evaluate(async () => {
                    const { playerPosition } = await import('/src/state/playerTransient.ts');
                    return { ...playerPosition };
                });
                assert.ok(report.collision.z < 10, 'escada bloqueia avanço antes do casco');
                await page.keyboard.press('e');
                await page.getByRole('dialog', { name: 'Cabine da aeronave' }).waitFor();
                await page.screenshot({ path: `${out}/embarque.png` });
                await page.getByRole('button', { name: 'Retornar a Marte' }).click();
                await page.getByRole('heading', { name: 'Deck de lançamento · Marte' }).waitFor();
                await page.waitForTimeout(2200);
                await page.getByRole('button', { name: 'Desembarcar · E' }).click();
                await page.waitForTimeout(1800);
                report.roundtrip = await page.evaluate(async () => {
                    const { useExpeditionStore: s } = await import('/src/state/useExpeditionStore.ts');
                    const { playerPosition } = await import('/src/state/playerTransient.ts');
                    return { session: s.getState().session, player: { ...playerPosition } };
                });
                assert.equal(report.roundtrip.session.map, 'mars');
                assert.equal(report.roundtrip.session.phase, 'walking');
                assert.ok(Math.hypot(report.roundtrip.player.x, report.roundtrip.player.z - 29.5) < .05);
                await page.screenshot({ path: `${out}/retorno-marte.png` });
                await page.evaluate(async()=>{
                    const source=await (await fetch('/src/app/GameCanvas.tsx')).text();
                    const {_roots}=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
                    window.aresQA=_roots.get(document.querySelector('canvas')).store;
                });
                report.marsViews=[];
                for(let i=0;i<8;i++){
                    await page.evaluate(async i=>{const {useGameStore:g}=await import('/src/state/useGameStore.ts');g.setState({targetRotation:i*Math.PI/4});},i);
                    await page.waitForTimeout(900);
                    await page.screenshot({path:`${out}/marte-giro-${i*45}.png`});
                    report.marsViews.push(await page.evaluate(i=>{
                        const r=window.aresQA.getState(),ship=r.scene.getObjectByName('MarsARES'),deck=r.scene.getObjectByName('MarsARESDeck');
                        return {angle:i*45,camera:r.camera.position.toArray(),ship:!!ship,deck:!!deck,render:{...r.gl.info.render}};
                    },i));
                }
                // Reentrada depois do retorno testa reutilização do cache de Marte e
                // novo carregamento independente em Shanghai, sem material descartado.
                await page.keyboard.press('e');
                await page.getByRole('button',{name:'Decolar para Shanghai'}).click();
                await page.getByRole('heading',{name:'Área de pouso · Shanghai'}).waitFor();
                await page.waitForTimeout(2400);
                await page.getByRole('button',{name:'Desembarcar · E'}).click();
                await page.waitForTimeout(1600);
                await page.evaluate(async()=>{
                    const source=await (await fetch('/src/app/GameCanvas.tsx')).text();
                    const {_roots}=await import(source.match(/from "([^"\n]*@react-three_fiber[^"\n]*)"/)[1]);
                    window.aresQA=_roots.get(document.querySelector('canvas')).store;
                });
                report.secondArrival=await page.evaluate(async()=>{
                    const {playerPosition}=await import('/src/state/playerTransient.ts');
                    const r=window.aresQA.getState();return {player:{...playerPosition},ship:!!r.scene.getObjectByName('ShanghaiARES'),memory:{...r.gl.info.memory}};
                });
                assert.ok(report.marsViews.every(v=>v.ship&&v.deck));
                assert.equal(report.secondArrival.ship,true);
                assert.ok(Math.hypot(report.secondArrival.player.x,report.secondArrival.player.z-9.5)<.05);

            }
        } finally { await context.close(); }
    }
} finally {
    fs.writeFileSync(`${out}/qa.json`, JSON.stringify(report, null, 2) + '\n');
    await browser.close();
}
assert.deepEqual(report.errors, []);
console.log('ARES_QA_OK', JSON.stringify({ antes: report.antes, depois: report.depois, collision: report.collision, roundtrip: report.roundtrip, errors: report.errors }));
