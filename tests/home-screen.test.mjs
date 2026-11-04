import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
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
        if (spec.endsWith('.webp')) return path.basename(spec);
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
function render(profile = null) {
    cache.clear(); memory.clear();
    if (profile) memory.set(SAVE_KEY, JSON.stringify({ version: 1, profile, briefingSeen: false }));
    const { HomeScreen } = loadUi('src/ui/HomeScreen.tsx');
    return renderToStaticMarkup(React.createElement(HomeScreen, { onEnter() {} }));
}

test('Tela inicial: Início, Continuar e Configurações, nessa ordem; sem escolha de cor', () => {
    const html = render(), buttons = [...html.matchAll(/<button[^>]*>([^<]*)/g)].map(match => match[1]);
    assert.deepEqual(buttons, ['Início', 'Continuar', 'Configurações']);
    assert.doesNotMatch(html, /type="color"/); assert.doesNotMatch(html, /[Cc]or do traje|[Pp]aleta/);
    assert.match(html, /Nome do explorador/); assert.match(html, /EXODEN Recomeço/);
    assert.match(html, /explorador-perfil\.webp/); assert.match(html, /colonia\.webp/);
});

test('Tela inicial: Continuar só vale com perfil salvo e mostra de quem é', () => {
    assert.match(render(), /<button[^>]*type="button"[^>]*disabled[^>]*>Continuar/);
    const html = render({ displayName: 'Marina', color: '#123456' });
    assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Continuar/);
    assert.match(html, /Continuar<small>Marina<\/small>/);
    assert.match(html, /value="Marina"/);
});

test('Tela inicial: textos fictícios das artes de conceito não entram na tela', () => {
    assert.doesNotMatch(render(), /EDEN OS|v1\.04|TELEMETRY|Telemetry|Entrar na colônia/);
});

test('Início sem escolher cor: cria perfil com a cor padrão, e refazer preserva briefing e cor salva', () => {
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

test('Entrada: o jogo só monta depois de escolher Início ou Continuar, mesmo com save', () => {
    const app = fs.readFileSync('src/app/App.tsx', 'utf8');
    assert.match(app, /entered && profile \? <Runtime \/> : <HomeScreen onEnter=/);
    assert.doesNotMatch(app, /function Welcome|className="welcome"/);
    const home = fs.readFileSync('src/ui/HomeScreen.tsx', 'utf8');
    assert.doesNotMatch(home, /removeItem|localStorage|send\(/, 'a tela não apaga save nem inicia missão');
});

test('Configurações: só opções que funcionam, com foco e Escape', () => {
    const home = fs.readFileSync('src/ui/HomeScreen.tsx', 'utf8');
    assert.match(home, /<AudioControls\/>/); assert.match(home, /<ControlList\/>/);
    assert.match(home, /role="dialog" aria-modal="true" aria-label="Configurações"/);
    assert.match(home, /event\.code === 'Escape'/); assert.match(home, /close\.current\?\.focus\(\)/);
    assert.match(home, /toggleAttribute\('inert', settings\)/); assert.match(home, /settingsButton\.current\?\.focus\(\)/);
    const app = fs.readFileSync('src/app/App.tsx', 'utf8');
    assert.match(app, /<ControlList\/>/, 'a pausa e a tela inicial usam a mesma lista');
});

test('Artes da tela inicial leves e com fonte reproduzível', () => {
    for (const [file, limit] of [['src/assets/home/colonia.webp', 400_000], ['src/assets/home/explorador-perfil.webp', 120_000]]) {
        assert.ok(fs.statSync(file).size < limit, file);
        assert.equal(fs.readFileSync(file).subarray(8, 12).toString(), 'WEBP');
    }
    for (const script of ['render_perfil.py', 'render_colonia.py']) assert.ok(fs.existsSync(`art-source/home-exoden/scripts/${script}`), script);
});
