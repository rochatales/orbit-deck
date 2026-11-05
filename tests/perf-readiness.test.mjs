import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from 'three';
import { loadSource } from './load-source.mjs';
const { perfCharactersReady } = loadSource('src/dev/perf/sceneReadiness.ts');
const { createPerfShared, createSceneTracker } = loadSource('src/dev/perf/perfMetrics.ts');

test('S2.9: astronauta e EDEN atuais concluem prontidão só depois dos GLBs carregados e desenhados', () => {
  const scene = new Group(), player = new Group(), edenWrapper = new Group(), edenFigure = new Group();
  player.name = 'Explorador astronauta'; edenWrapper.name = 'ControlRoomEden'; edenFigure.name = 'EdenFigura';
  const shared = createPerfShared(), tracker = createSceneTracker(shared, 'mars', 0, true);
  scene.add(edenWrapper);
  tracker.onFrame(10, 10, perfCharactersReady(scene, 'mars', player.name));
  scene.add(player);
  tracker.onFrame(20, 10, perfCharactersReady(scene, 'mars', player.name));
  assert.equal(perfCharactersReady(scene, 'mars', player.name), false, 'wrapper vazio da EDEN não é seu GLB');
  assert.equal(shared.sceneEvents.some(e => e.kind === 'scene-assets-ready'), false);
  edenWrapper.add(edenFigure);
  tracker.onFrame(30, 10, perfCharactersReady(scene, 'mars', player.name));
  assert.equal(shared.sceneEvents.some(e => e.kind === 'scene-assets-ready'), false, 'espera o desenho seguinte');
  tracker.onFrame(40, 10, perfCharactersReady(scene, 'mars', player.name));
  assert.equal(shared.sceneEvents.at(-1).kind, 'scene-assets-ready');
  assert.equal(tracker.done, true);
});

test('S2.9: Shanghai exige o jogador selecionado sem depender da EDEN de Marte', () => {
  const scene = new Group(), previous = new Group(), astronaut = new Group();
  previous.name = 'Explorador'; astronaut.name = 'Explorador astronauta'; scene.add(previous);
  assert.equal(perfCharactersReady(scene, 'shanghai', astronaut.name), false, 'variante anterior não substitui a atual');
  assert.equal(perfCharactersReady(scene, 'shanghai', previous.name), true, 'comparação com a variante anterior continua válida');
  scene.add(astronaut);
  assert.equal(perfCharactersReady(scene, 'shanghai', astronaut.name), true);
  assert.equal(perfCharactersReady(scene, 'mars', astronaut.name), false);
});
