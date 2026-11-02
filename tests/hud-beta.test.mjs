import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSource } from './load-source.mjs';
const { BACKPACK, cargoWeight, canCarryDrop, recoverBackpackEnergy } = loadSource('src/game/backpackConfig.ts');
const { advanceDash } = loadSource('src/characters/player/playerDash.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { useBackpackEnergy, backpackEnergy, publishBackpackEnergy, resetBackpackEnergy } = loadSource('src/state/useBackpackEnergy.ts');

// Renderiza os componentes React reais em Node; somente imagens ficam sem loader Vite.
const nativeRequire = createRequire(import.meta.url), cache = new Map();
function loadUi(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = spec => {
    if (!spec.startsWith('.')) return nativeRequire(spec);
    if (spec.endsWith('.png')) return 'item-icons-beta-v001.png';
    if (spec.endsWith('.json')) return JSON.parse(fs.readFileSync(path.resolve(path.dirname(absolute), spec), 'utf8'));
    const base = path.resolve(path.dirname(absolute), spec);
    return loadUi(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: absolute })(require, module, module.exports);
  return module.exports;
}
const { GameplayHud, BackpackContents, VitalBar } = loadUi('src/ui/GameplayHud.tsx');
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('HUD beta: vida vermelha/energia azul, quatro slots, mochila e munição; sem painéis legados', () => {
  for (const combat of [false, true]) {
    const html = render(GameplayHud, { combat, openBackpack() {} });
    assert.equal((html.match(/class="beta-equipment-slot /g) ?? []).length, 4);
    assert.match(html, /beta-vital life/); assert.match(html, /beta-vital energy/);
    assert.match(html, /Abrir mochila · B/); assert.match(html, /Peso da mochila/);
    assert.match(html, /Munição do rifle/); assert.match(html, /Usar kit médico · 3/); assert.match(html, /beta-kit-count/); assert.match(html, /item-icons-beta-v001.png/);
    assert.doesNotMatch(html, /combat-hud|equipment-inventory|hud-ident|ITENS \/ EQUIPAMENTOS/);
  }
  const life = render(VitalBar, { label: 'VIDA', value: 23, max: 100, kind: 'life' });
  assert.match(life, /aria-valuenow="23"/); assert.match(life, /width:23%/);
  const mars = render(GameplayHud, { combat: false, openBackpack() {} });
  assert.match(mars, /MOCHILA · EM ESPERA/); assert.match(mars, /ARMA NO COLDRE/);
  const app = fs.readFileSync('src/app/App.tsx', 'utf8');
  assert.doesNotMatch(app, /className="radio"|className="mission"|className="hud-top"/);
  assert.match(app, /beta-radio-log/); assert.match(app, /Última transmissão/);
});

test('HUD beta: mochila ilustra os quatro recursos em cores próprias e mostra capacidade/pesos', () => {
  const html = render(BackpackContents, { combat: true });
  for (const label of ['Ferro', 'Cobre', 'Titânio', 'Matéria orgânica', '/ 30 kg', '0,5 kg', '0,3 kg', '0,4 kg', '0,2 kg']) assert.ok(html.includes(label), label);
  assert.equal((html.match(/class="beta-resource"/g) ?? []).length, 4);
  const bytes = fs.readFileSync('src/assets/ui/item-icons-beta-v001.png');
  assert.equal(bytes.subarray(1,4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), bytes.readUInt32BE(20) * 2, 'atlas com oito células quadradas em grade 4 × 2');
  assert.equal(bytes[25], 6, 'RGBA preserva transparência');
});

test('Mochila: limite 30 kg, par ferro/cobre atômico, recurso excedente fica no chão sem som/contador', () => {
  assert.equal(BACKPACK.capacityKg, 30);
  const cargo = { iron: 30, copper: 30, titanium: 10, organic: 10 };
  assert.equal(cargoWeight(cargo), 30);
  for (const kind of ['metals', 'titanium', 'organic']) assert.equal(canCarryDrop(cargo, kind), false);
  assert.equal(canCarryDrop({ iron: 59, copper: 0, titanium: 0, organic: 0 }, 'metals'), false);
  assert.equal(canCarryDrop({ iron: 59, copper: 0, titanium: 0, organic: 0 }, 'titanium'), true);
  const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
  const input = { player: { x: 0, z: 0 }, aim: { x: 0, z: 10 }, facingAngle: 0, firing: false, reload: false };
  for (const kind of ['metals', 'titanium', 'organic']) {
    const sim = new CombatSimulation({ bounds, walkableAreas: [bounds], obstacles: [] }, 1);
    sim.robots.forEach(r => r.hp = 0); Object.assign(sim, cargo);
    const drop = sim.drops[0]; Object.assign(drop, { active: true, spawned: true, kind, x: 0, z: 0 });
    sim.step(1/60, input); assert.equal(drop.active, true); assert.equal(cargoWeight(sim), 30);
    assert.equal(sim.sounds.slots.slice(0,sim.sounds.count).filter(e => e.type === 'collect').length, 0);
    sim.iron -= 2; sim.sounds.clear(); sim.step(1/60, input);
    assert.equal(drop.active, false); assert.ok(cargoWeight(sim) <= 30);
    assert.equal(sim.sounds.count, kind === 'metals' ? 2 : 1);
    const counts = [sim.iron, sim.copper, sim.titanium, sim.organic];
    sim.step(1/60,input); assert.deepEqual([sim.iron, sim.copper, sim.titanium, sim.organic], counts);
  }
});

test('Energia: dois Dashs, terceira pressão negada; vazio → cheio em 5 s pelo passo fixo', () => {
  const energy = { value: BACKPACK.energy.max }, until = { current: 0 }, cooldown = { current: 0 }, held = { current: false };
  const tick = (now, pressed, blocked = false) => advanceDash(now, pressed, blocked, until, cooldown, held, energy);
  assert.equal(tick(0, true), true); assert.equal(energy.value, 1);
  tick(.8, false); assert.equal(tick(1, true), true); assert.equal(energy.value, 0);
  tick(1.8, false); assert.equal(tick(2, true), false); assert.equal(energy.value, 0);
  for (let i = 0; i < 150; i++) recoverBackpackEnergy(energy, 1/60);
  assert.ok(Math.abs(energy.value - 1) < 1e-8);
  for (let i = 0; i < 150; i++) recoverBackpackEnergy(energy, 1/60);
  assert.ok(Math.abs(energy.value - 2) < 1e-8);
  assert.equal(tick(7, true), false, 'segurar a pressão negada não dispara após recarregar');
  tick(7.01, false); assert.equal(tick(7.02, true), true);
  const before = energy.value; tick(7.03, false, true); assert.equal(energy.value, before, 'pausa cancela sem consumir');
  tick(7.04, true, true); assert.equal(energy.value, before, 'mapa bloqueado não consome');
});

test('Energia: HUD publica só porcentagem alterada, reset restaura; regeneração é depois da trava da simulação', () => {
  resetBackpackEnergy(); let updates = 0; const unsubscribe = useBackpackEnergy.subscribe(() => updates++);
  publishBackpackEnergy(); assert.equal(updates, 0);
  backpackEnergy.value = 1; publishBackpackEnergy(); assert.equal(updates, 1); assert.equal(useBackpackEnergy.getState().percent, 50);
  for (let i = 0; i < 10; i++) publishBackpackEnergy(); assert.equal(updates, 1);
  resetBackpackEnergy(); assert.equal(updates, 2); assert.equal(useBackpackEnergy.getState().percent, 100); unsubscribe();
  const controller = fs.readFileSync('src/characters/player/PlayerController.tsx', 'utf8');
  assert.ok(controller.indexOf('recoverBackpackEnergy(backpackEnergy, dt)') > controller.indexOf('if (simulationBlocked())'));
  assert.match(controller, /resetBackpackEnergy\(\); \}, \[officeWorld, sessionRevision\]/);
  const app = fs.readFileSync('src/app/App.tsx', 'utf8');
  assert.match(app, /KeyB/); assert.match(app, /setPauseView\('backpack'\); useGameStore.setState\(\{ isPaused: true \}\)/);
});
