// Mede somente a faixa do Engenheiro; --write troca apenas o array de pontos.
import fs from 'node:fs';
import { Vector3 } from 'three';
import { loadSource } from '../../tests/load-source.mjs';
import { loadGlb } from '../../tests/load-glb.mjs';
import { engineerHelmetSurface, certifyVisorCurve } from '../../tests/visor-surface.mjs';
const surface = await engineerHelmetSurface();
const { ENGINEER_VISOR_RADIUS_SCALE: radiusScale } = loadSource('src/npcs/engineerVisor.ts');
const { COLONY_VISOR_LIGHT: light } = loadSource('src/scene/lightingConfig.ts');
const { createColonyVisor } = loadSource('src/characters/player/colonyVisorAttachment.ts');
const points = [];
for (let i = 0; i < 17; i++) {
    const x = -.109 + i * .218 / 16, y = .06, surfaceZ = surface.frontZ(x, y);
    let lo = surfaceZ, hi = surfaceZ + .08;
    // O raio fornece a frente real nesta altura. Ajusta só Z até 15,7 mm
    // de distância à malha; compensa a inclinação nas laterais sem afastar o centro.
    for (let j = 0; j < 40; j++) {
        const z = (lo + hi) / 2;
        if (surface.distance(new Vector3(x, y, z)) * surface.scale < .0157) lo = z;
        else hi = z;
    }
    points.push([+x.toFixed(8), y, +hi.toFixed(8)]);
}
const certificate = certifyVisorCurve(points, surface, light.haloRadius * radiusScale);
if (certificate.minClearance <= 0) throw Error('Curva/halo sem folga positiva.');
const player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
const visor = createColonyVisor(player.scene, false); visor.head.add(visor.group); player.scene.updateMatrixWorld(true);
const playerPoints = visor.stripe.geometry.parameters.path.points;
const measures = { base: 'f4f8e41aba92b701dca17a6fad83e8c66735f554', pose: 'Idle',
    headScale: surface.scale, headYRange: 0, widthWorld: .218 * surface.scale,
    playerWidthWorld: (Math.max(...playerPoints.map(p => p.x)) - Math.min(...playerPoints.map(p => p.x))) * visor.head.getWorldScale(new Vector3()).x,
    targetCenterSurfaceDistanceWorld: .0157, haloRadiusWorld: light.haloRadius * radiusScale * surface.scale,
    conservativeWholeCurve: certificate, points };
visor.dispose();
if (process.argv.includes('--write')) {
    const file = 'src/npcs/engineerVisor.ts', source = fs.readFileSync(file, 'utf8');
    const array = `export const ENGINEER_VISOR_POINTS = [\n${points.map(p => `    [${p.join(', ')}]`).join(',\n')}\n] as const;`;
    fs.writeFileSync(file, source.replace(/export const ENGINEER_VISOR_POINTS = \[[\s\S]*?\] as const;/, array));
}
fs.writeFileSync('docs/sprint-3/evidencias/s3.2-primeira-expedicao/faixa-reta-medidas.json', JSON.stringify(measures, null, 2) + '\n');
console.log(JSON.stringify(measures));
