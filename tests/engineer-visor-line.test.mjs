import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
import { engineerHelmetSurface, certifyVisorCurve } from './visor-surface.mjs';
const { ENGINEER_VISOR_POINTS: points, ENGINEER_VISOR_RADIUS_SCALE: radiusScale } = loadSource('src/npcs/engineerVisor.ts');
const { COLONY_VISOR_LIGHT: light } = loadSource('src/scene/lightingConfig.ts');
const surface = await engineerHelmetSurface();

test('S3.2 faixa: GLB real, altura quase reta, pontas sem subir e largura do jogador em metros', async () => {
    const y = points.map(p => p[1]);
    assert.ok(Math.max(...y) - Math.min(...y) <= .012, 'variação Y da faixa deve ser no máximo 12 mm no Head');
    assert.ok(y[0] <= y[Math.floor(y.length / 2)] && y.at(-1) <= y[Math.floor(y.length / 2)], 'pontas não sobem');
    const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
    const { createColonyVisor } = loadSource('src/characters/player/colonyVisorAttachment.ts');
    const visor = createColonyVisor(player.scene, false); visor.head.add(visor.group); player.scene.updateMatrixWorld(true);
    const playerPoints = visor.stripe.geometry.parameters.path.points;
    const width = (Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]))) * surface.scale;
    const playerWidth = (Math.max(...playerPoints.map(p => p.x)) - Math.min(...playerPoints.map(p => p.x))) * visor.head.getWorldScale(new Vector3()).x;
    assert.ok(Math.abs(width - playerWidth) < .005, `larguras: Engenheiro ${width}, jogador ${playerWidth}`);
    visor.dispose();
});

test('S3.2 faixa: toda a curva, incluindo raio do halo, fica fora do capacete real em Idle, sem flutuar', () => {
    const result = certifyVisorCurve(points, surface, light.haloRadius * radiusScale);
    assert.ok(result.minClearance > 0, `folga conservadora de todo o halo: ${result.minClearance} m`);
    assert.ok(result.maxDistance < .020, `centro da faixa a no máximo 20 mm da superfície: ${result.maxDistance} m`);
});
