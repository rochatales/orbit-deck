import test from 'node:test';
import assert from 'node:assert/strict';
import { DirectionalLight, OrthographicCamera, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';

const { ShadowFit } = loadSource('src/scene/shadowFrustum.ts');

// Câmera como a do CameraRig (1440 × 900, limites de Marte), em qualquer giro e zoom.
const W = 1440, H = 900;
const fit = Math.min(W / Math.max(35, 44 * 0.8), H / Math.max(26, 54 * 0.65));
function gameCamera(x, z, angle, zoom) {
    const camera = new OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 160);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    camera.position.set(x + Math.cos(angle) * 18.38, 13.55, z + Math.sin(angle) * 18.38);
    camera.lookAt(x, 0.55, z);
    camera.updateMatrixWorld();
    return camera;
}
function sun(position) {
    const light = new DirectionalLight();
    light.position.set(...position);
    light.shadow.mapSize.set(2048, 2048);
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    return light;
}
// Pontos da tela no chão (y = 0) e até 6 m de altura; quantos ficam fora da caixa de sombra.
function outside(light, camera) {
    light.shadow.updateMatrices(light);
    const shadow = light.shadow.camera;
    const forward = camera.getWorldDirection(new Vector3());
    const origin = new Vector3(), p = new Vector3();
    let count = 0;
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) for (const h of [0, 6]) {
        origin.set(-1 + i / 5, -1 + j / 5, -1).unproject(camera);
        p.copy(forward).multiplyScalar((h - origin.y) / forward.y).add(origin);
        p.applyMatrix4(shadow.matrixWorldInverse).applyMatrix4(shadow.projectionMatrix);
        if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z < -1 || p.z > 1) count++;
    }
    return count;
}

test('S6.12: caixa de sombra cobre toda a tela em qualquer giro e zoom (quebra de luz)', () => {
    // Antes: caixa fixa ±24 m na origem; o deck/foguete em (0; 33) caía fora dela.
    const old = sun([11, 16, 9]);
    Object.assign(old.shadow.camera, { near: 1, far: 58, left: -24, right: 24, top: 28, bottom: -20 });
    old.shadow.camera.updateProjectionMatrix();
    assert.ok(outside(old, gameCamera(0, 33, Math.PI / 4, fit * 1.6)) > 0, 'a configuração antiga deixava o deck fora');

    const light = sun([44, 64, 36]);
    const shadowFit = new ShadowFit();
    for (const [x, z] of [[0, 33], [0, 0], [-15, 20], [12, -10]]) {
        for (let k = 0; k < 16; k++) {
            for (const zoom of [fit, fit * 1.6, fit * 3.25]) {
                const camera = gameCamera(x, z, k * Math.PI / 8, zoom);
                shadowFit.fit(light, camera);
                assert.equal(outside(light, camera), 0, `(${x}; ${z}) giro ${k}/16 zoom ${(zoom / fit).toFixed(2)}`);
            }
        }
    }
});

test('S6.12: janela da sombra anda em passos de texel e não refaz a projeção parada', () => {
    const light = sun([44, 64, 36]);
    const shadowFit = new ShadowFit();
    shadowFit.fit(light, gameCamera(0, 10, Math.PI / 4, fit * 1.6));
    const first = { ...shadowFit.box };
    const texel = (first.right - first.left) / 2048;
    assert.equal(shadowFit.fit(light, gameCamera(0, 10, Math.PI / 4, fit * 1.6)), false);
    for (let step = 1; step <= 20; step++) {
        shadowFit.fit(light, gameCamera(step * 0.037, 10 + step * 0.021, Math.PI / 4, fit * 1.6));
        assert.equal(shadowFit.box.right - shadowFit.box.left, first.right - first.left, 'mesmo tamanho ao andar');
        const shift = (shadowFit.box.left - first.left) / texel;
        assert.ok(Math.abs(shift - Math.round(shift)) < 1e-6, `deslocamento em texels inteiros (${shift})`);
    }
});
