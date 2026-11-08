import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Renderiza a tela real em Node; imagens e áudio ficam sem o carregador do Vite.
const nativeRequire = createRequire(import.meta.url), cache = new Map();
const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); }, removeItem: key => { memory.delete(key); } };
globalThis.localStorage = storage;
function loadUi(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const require = spec => {
        if (!spec.startsWith('.')) return nativeRequire(spec);
        if (/\.(webp|mp4)$/.test(spec)) return path.basename(spec);
        if (spec.endsWith('.css')) return {};
        if (spec.endsWith('.json')) return JSON.parse(fs.readFileSync(path.resolve(path.dirname(absolute), spec), 'utf8'));
        if (spec.includes('audio/AudioRuntime')) return { AudioControls: () => React.createElement('fieldset', { className: 'audio-controls' }) };
        if (spec.includes('audio/runtime')) return { audio: { unlock: async () => {} } };
        const base = path.resolve(path.dirname(absolute), spec);
        return loadUi(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    };
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: absolute })(require, module, module.exports);
    return module.exports;
}
const SAVE_KEY = 'exoden:hub:v1';
/** O render de servidor lê o estado inicial do store: cada caso carrega o store com seu save. */
function render({ profile = null, campaign = null } = {}) {
    cache.clear(); memory.clear();
    if (profile) memory.set(SAVE_KEY, JSON.stringify({ version: 1, profile, briefingSeen: false }));
    if (campaign) {
        const { createCampaignSave, CAMPAIGN_SAVE_KEY } = loadUi('src/game/campaignSave.ts');
        memory.set(CAMPAIGN_SAVE_KEY, JSON.stringify(createCampaignSave(campaign)));
    }
    const { HomeScreen } = loadUi('src/ui/HomeScreen.tsx');
    return renderToStaticMarkup(React.createElement(HomeScreen, { onEnter() {}, onExit() {} }));
}

test('Tela inicial: quatro ações, título e fundo em vídeo silencioso', () => {
    const html = render(), buttons = [...html.matchAll(/<button[^>]*>([^<]*)/g)].map(match => match[1]);
    assert.deepEqual(buttons, ['Novo jogo', 'Carregar', 'Configurações', 'Sair']);
    assert.match(html, /EXODEN Recomeço/);
    assert.match(html, /<video[^>]+poster="intro-poster\.webp"[^>]+muted=""[^>]+loop=""[^>]+playsinline=""/i);
    assert.doesNotMatch(html, /Nome do explorador|Encontro de teste|<video[^>]+controls/);
});

test('Tela inicial: Carregar depende de campanha salva, mesmo com perfil de desenvolvimento', () => {
    const profile = { displayName: 'Marina', color: '#123456' };
    assert.match(render({ profile }), /<button[^>]*disabled[^>]*>Carregar/);
    assert.doesNotMatch(render({ campaign: profile }), /<button[^>]*disabled[^>]*>Carregar/);
});

test('Perfil de desenvolvimento: helper preserva cor e briefing do save existente', () => {
    cache.clear(); memory.clear();
    const { useExpeditionStore } = loadUi('src/state/useExpeditionStore.ts'), { DEFAULT_SUIT_COLOR } = loadUi('src/game/session.ts');
    useExpeditionStore.getState().start('Ana', DEFAULT_SUIT_COLOR);
    assert.deepEqual(useExpeditionStore.getState().profile, { displayName: 'Ana', color: DEFAULT_SUIT_COLOR });
    useExpeditionStore.setState({ briefingSeen: true, profile: { displayName: 'Ana', color: '#abcdef' } });
    const { profile } = useExpeditionStore.getState();
    useExpeditionStore.getState().start('Bia', profile.color);
    const saved = JSON.parse(memory.get(SAVE_KEY));
    assert.deepEqual(saved.profile, { displayName: 'Bia', color: '#abcdef' }); assert.equal(saved.briefingSeen, true);
});

test('Entrada: a home aparece mesmo quando já existe um perfil', () => {
    const app = fs.readFileSync('src/app/App.tsx', 'utf8');
    assert.match(app, /const home = !entered \|\| !profile/);
    assert.match(app, /home \? <HomeScreen .* : <Runtime onHome=/);
    const home = fs.readFileSync('src/ui/HomeScreen.tsx', 'utf8');
    assert.doesNotMatch(home, /removeItem|localStorage|send\(/, 'o menu usa os fluxos da sessão para entrar e sair');
});

test('Fundo da home: MP4 compacto sem áudio e poster WebP', () => {
    const file = 'src/assets/home/intro-loop.mp4';
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length < 8_000_000);
    assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
    assert.ok(bytes.indexOf('moov') < bytes.indexOf('mdat'), 'metadados prontos para streaming');
    const poster = fs.readFileSync('src/assets/home/intro-poster.webp');
    assert.equal(poster.subarray(8, 12).toString(), 'WEBP');
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
    if (!probe.error) {
        assert.equal(probe.status, 0);
        const { streams, format } = JSON.parse(probe.stdout);
        assert.equal(streams.length, 1);
        assert.equal(streams[0].codec_name, 'h264');
        assert.equal(Number(format.duration), 25.5);
    }
});
