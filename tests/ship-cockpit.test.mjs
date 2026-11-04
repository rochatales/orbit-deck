import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSource } from './load-source.mjs';
const nativeRequire = createRequire(import.meta.url), cache = new Map();
function loadUi(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const require = spec => {
        if (!spec.startsWith('.')) return nativeRequire(spec);
        if (/\.(jpg|png|mp4|css)$/.test(spec)) return spec;
        const base = path.resolve(path.dirname(absolute), spec);
        if (spec.endsWith('.json')) return JSON.parse(fs.readFileSync(base, 'utf8'));
        return loadUi(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    };
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: absolute })(require, module, module.exports);
    return module.exports;
}
const { ShipCockpit } = loadUi('src/ui/ShipCockpit.tsx');
const props = { map: 'mars', phase: 'aboard', ready: true, error: null, name: 'Explorador', onDepart() {}, onExit() {}, onRetry() {} };
const render = (changes = {}) => renderToStaticMarkup(React.createElement(ShipCockpit, { ...props, ...changes }));

test('Cabine: localização/destino reais, máscara sobre vídeo local e navegação/carga sem radar ou HUD de combate', () => {
    for (const map of ['mars', 'shanghai']) {
        const html = render({ map });
        assert.match(html, /role="dialog" aria-modal="true" aria-label="Cabine da aeronave"/);
        assert.match(html, /<video[^>]+muted=""[^>]+loop=""[^>]+playsinline=""/);
        assert.match(html, new RegExp(`cockpit/${map}\\.png`));
        assert.match(html, /mask="url\(#cockpit-windows\)"/);
        assert.match(html, /Navegação/); assert.match(html, /Carga/); assert.match(html, /150 kg/);
        assert.match(html, map === 'mars' ? /Decolar para Shanghai/ : /Retornar a Marte/);
        assert.match(html, /Desembarcar/); assert.match(html, /E \/ ESC/);
        assert.doesNotMatch(html, /sonar|radar|beta-vital|HORDA|<canvas|Shield|Fuel/i);
    }
    const app = fs.readFileSync('src/app/App.tsx', 'utf8');
    assert.match(app, /!inCockpit && <>/);
    assert.match(app, /onDepart=\{\(\) => s.send\('depart'\)\}/);
    assert.match(app, /onExit=\{\(\) => s.send\('exit'\)\}/);
    assert.match(app, /if \(state.session.phase === 'aboard'\)\s+state.send\('exit'\)/);
});

test('Cabine: voo bloqueia saída/carga/decolagem; erro oferece retry, chegada oferece desembarque', () => {
    const flight = render({ ready: false, phase: 'travelling' });
    assert.match(flight, /Preparando a chegada/);
    assert.match(flight, /disabled=""[^>]*aria-label="Desembarcar/);
    assert.doesNotMatch(flight, /class="cockpit-depart"/);
    assert.match(render({ error: 'Destino indisponível' }), /Destino indisponível/);
    assert.match(render({ error: 'Destino indisponível' }), /Tentar novamente/);
    assert.match(render({ map: 'shanghai' }), /Shanghai/);
});

test('Cabine: embarcar não decola, viagem mantém a simulação travada e chega a bordo; carga não se perde', () => {
    const { useExpeditionStore: e } = loadSource('src/state/useExpeditionStore.ts');
    const { useGameStore: g } = loadSource('src/state/useGameStore.ts');
    const { placePlayer } = loadSource('src/state/playerTransient.ts');
    const { MAPS } = loadSource('src/game/config.ts');
    const { simulationBlocked } = loadSource('src/game/simulationGate.ts');
    const { useShipCargoStore: cargo } = loadSource('src/state/useShipCargoStore.ts');
    const saved = e.getState(), game = g.getState(), hold = cargo.getState().cargo;
    try {
        g.setState({ isPaused: false }); cargo.setState({ cargo: { iron: 5, copper: 2, titanium: 1, organic: 3 } });
        e.setState({ ready: true, error: null, panel: null, session: { map: 'mars', phase: 'walking', destination: null, revision: 1 } });
        placePlayer(MAPS.mars.exit); e.getState().send('board');
        assert.equal(e.getState().session.phase, 'aboard'); assert.equal(e.getState().session.destination, null);
        assert.equal(simulationBlocked(), true);
        e.getState().send('depart'); assert.equal(e.getState().session.destination, 'shanghai'); assert.equal(simulationBlocked(), true);
        e.getState().send('arrive'); e.getState().setReady(true);
        assert.equal(e.getState().session.phase, 'aboard'); assert.equal(e.getState().session.map, 'shanghai');
        assert.equal(simulationBlocked(), true);
        assert.deepEqual(cargo.getState().cargo, { iron: 5, copper: 2, titanium: 1, organic: 3 });
        e.getState().send('exit'); assert.equal(simulationBlocked(), false);
    } finally { e.setState(saved); g.setState(game); cargo.setState({ cargo: hold }); }
});

test('Cabine: vídeo pausa ao ocultar/reduzir movimento; troca limpa decoder e falha mantém poster', async () => {
    const { bindCockpitVideo } = loadSource('src/ui/cockpitVideo.ts');
    const page = Object.assign(new EventTarget(), { hidden: false }), motion = Object.assign(new EventTarget(), { matches: false });
    const video = Object.assign(new EventTarget(), { dataset: {}, plays: 0, pauses: 0, loads: 0,
        play() { this.plays++; return Promise.resolve(); }, pause() { this.pauses++; }, load() { this.loads++; }, removeAttribute(name) { delete this[name]; }
    });
    const close = bindCockpitVideo(video, 'mars.mp4', page, motion);
    assert.equal(video.src, 'mars.mp4'); assert.equal(video.muted, true); assert.equal(video.plays, 1);
    page.hidden = true; page.dispatchEvent(new Event('visibilitychange')); assert.equal(video.pauses, 1);
    motion.matches = true; page.hidden = false; page.dispatchEvent(new Event('visibilitychange')); assert.equal(video.plays, 1);
    motion.matches = false; motion.dispatchEvent(new Event('change')); assert.equal(video.plays, 2);
    video.dispatchEvent(new Event('error')); assert.equal(video.dataset.failed, 'true');
    const plays = video.plays; motion.dispatchEvent(new Event('change')); assert.equal(video.plays, plays);
    close(); assert.equal(video.src, undefined); assert.equal(video.loads, 1);
    motion.dispatchEvent(new Event('change')); page.dispatchEvent(new Event('visibilitychange')); assert.equal(video.plays, plays);
    const closeAgain = bindCockpitVideo(video, 'shanghai.mp4', page, motion);
    assert.equal(video.src, 'shanghai.mp4'); assert.equal(video.dataset.failed, 'false');
    closeAgain();
    video.play = () => Promise.reject(new Error('autoplay negado'));
    const reject = bindCockpitVideo(video, 'mars.mp4', page, motion); await Promise.resolve(); reject();
});

test('Cabine: Tab/Shift-Tab ficam no diálogo, detalhes fechados não entram e o foco volta ao sair', () => {
    const { bindDialogFocus } = loadSource('src/ui/dialogFocus.ts');
    const original = globalThis.HTMLElement, page = Object.assign(new EventTarget(), { activeElement: null });
    class Element extends EventTarget { isConnected = true; offsetParent = {}; focus() { page.activeElement = this; } }
    globalThis.HTMLElement = Element;
    try {
        const old = new Element(), first = new Element(), last = new Element(), hidden = new Element(); hidden.offsetParent = null;
        const menu = new Element(); menu.querySelector = () => first; menu.querySelectorAll = () => [first, last, hidden]; menu.contains = el => [first, last].includes(el);
        old.focus(); const close = bindDialogFocus(menu, page); assert.equal(page.activeElement, first);
        function tab(shift) { const event = new Event('keydown', { cancelable: true }); Object.assign(event, { key: 'Tab', shiftKey: shift }); page.dispatchEvent(event); return event; }
        assert.equal(tab(true).defaultPrevented, true); assert.equal(page.activeElement, last);
        assert.equal(tab(false).defaultPrevented, true); assert.equal(page.activeElement, first);
        close(); assert.equal(page.activeElement, old);
        first.focus(); assert.equal(tab(true).defaultPrevented, false, 'listener removido');
        menu.querySelectorAll = () => []; const cleanup = bindDialogFocus(menu, page);
        old.focus(); assert.equal(tab(false).defaultPrevented, true); assert.equal(page.activeElement, menu); cleanup();
    } finally { if (original === undefined) delete globalThis.HTMLElement; else globalThis.HTMLElement = original; }
});

test('Cabine: referência intacta e vídeos H264 reais de 6 s, sem áudio; hashes do manifesto conferem', () => {
    const manifest = JSON.parse(fs.readFileSync('art-source/ui/cockpit/manifesto.json', 'utf8'));
    for (const asset of manifest.assets) {
        const bytes = fs.readFileSync(asset.file);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    }
    assert.deepEqual(fs.readFileSync('src/assets/ui/cockpit/cabine.jpg'), fs.readFileSync('art-source/ui/cockpit/referencias/cabine-janelas-brancas.jpg'));
    for (const map of ['mars', 'shanghai']) {
        const file = `src/assets/ui/cockpit/${map}.mp4`, bytes = fs.readFileSync(file);
        assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
        // Valida o arquivo produzido, não só os metadados do gerador. Testes seguem portáveis sem ffprobe.
        const p = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
        if (!p.error) {
            assert.equal(p.status, 0); const actual = JSON.parse(p.stdout);
            assert.equal(actual.streams.length, 1); assert.equal(actual.streams[0].codec_type, 'video');
            assert.equal(actual.streams[0].codec_name, 'h264'); assert.equal(Number(actual.format.duration), 6);
        }
    }
});
