import { Matrix4, Vector3, type Camera, type DirectionalLight, type OrthographicCamera } from 'three';

/**
 * Caixa de sombra do sol ajustada ao que a câmera mostra (S6.12, 18/10/2026).
 *
 * Causa da "quebra de luz" relatada pelo autor: a caixa de sombra era fixa
 * (±24 m em volta da origem). O deck e o foguete, em z = 25–38, ficavam fora
 * dela, e fora da caixa o three.js trata tudo como iluminado: chão mais claro,
 * nenhum objeto com sombra. O limite aparecia como uma diagonal reta no meio
 * do mapa.
 *
 * Regra: a cada quadro, a caixa cobre a área do chão (e até `casterHeight`)
 * vista pela câmera, em qualquer zoom e giro Q/C. A luz não se move: só a
 * janela da câmera de sombra desliza no espaço da luz, em passos de um texel,
 * para a sombra não tremer ao andar. O meio-lado é quantizado em `sizeStep`
 * para não refazer a projeção a cada quadro de zoom. Sem alocação no quadro.
 */
export interface ShadowFitOptions {
    mapSize: number;
    casterHeight: number;   // altura máxima de quem recebe/projeta sombra na tela (m)
    casterReach: number;    // folga de profundidade rumo à luz para projetores fora da tela (m)
    margin: number;         // folga lateral (m), cobre o atraso de um quadro da câmera
    sizeStep: number;       // passo do meio-lado (m)
}

// casterHeight 6 m: módulos têm ~3 m; o topo do foguete (9,8 m) só perde sombra recebida
// quando está na borda da tela, enquanto a caixa menor mantém o texel perto do de antes.
export const DEFAULT_SHADOW_FIT: ShadowFitOptions = { mapSize: 2048, casterHeight: 6, casterReach: 30, margin: 2, sizeStep: 2 };

const CORNERS = [-1, -1, 1, -1, 1, 1, -1, 1];

export class ShadowFit {
    private readonly lightView = new Matrix4();
    private readonly eye = new Vector3();
    private readonly origin = new Vector3();
    private readonly forward = new Vector3();
    private readonly point = new Vector3();
    private readonly up = new Vector3(0, 1, 0);
    private readonly rotation = new Matrix4();
    readonly box = { left: 0, right: 0, bottom: 0, top: 0, near: 0, far: 0 };

    constructor(private readonly options: ShadowFitOptions = DEFAULT_SHADOW_FIT) {}

    /** Recalcula a janela; devolve true se a projeção da sombra mudou. */
    fit(light: DirectionalLight, camera: Camera): boolean {
        const shadowCamera = light.shadow.camera as OrthographicCamera;
        light.updateMatrixWorld();
        light.target.updateMatrixWorld();
        this.eye.setFromMatrixPosition(light.matrixWorld);
        this.point.setFromMatrixPosition(light.target.matrixWorld);
        // Mesma orientação que DirectionalLightShadow.updateMatrices dá à câmera de sombra.
        this.rotation.lookAt(this.eye, this.point, this.up);
        this.lightView.copy(this.rotation).setPosition(this.eye).invert();

        camera.updateMatrixWorld();
        camera.getWorldDirection(this.forward);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minD = Infinity, maxD = -Infinity;
        for (let i = 0; i < 8; i += 2) {
            this.origin.set(CORNERS[i], CORNERS[i + 1], -1).unproject(camera);
            for (let level = 0; level < 2; level++) {
                const height = level === 0 ? 0 : this.options.casterHeight;
                if (Math.abs(this.forward.y) < 1e-6) continue;
                const t = (height - this.origin.y) / this.forward.y;
                this.point.copy(this.forward).multiplyScalar(t).add(this.origin).applyMatrix4(this.lightView);
                minX = Math.min(minX, this.point.x); maxX = Math.max(maxX, this.point.x);
                minY = Math.min(minY, this.point.y); maxY = Math.max(maxY, this.point.y);
                minD = Math.min(minD, -this.point.z); maxD = Math.max(maxD, -this.point.z);
            }
        }
        const { mapSize, casterReach, margin, sizeStep } = this.options;
        const halfX = Math.ceil(((maxX - minX) / 2 + margin) / sizeStep) * sizeStep;
        const halfY = Math.ceil(((maxY - minY) / 2 + margin) / sizeStep) * sizeStep;
        const texelX = (2 * halfX) / mapSize, texelY = (2 * halfY) / mapSize;
        const cx = Math.round((minX + maxX) / 2 / texelX) * texelX;
        const cy = Math.round((minY + maxY) / 2 / texelY) * texelY;
        const near = Math.max(0.1, Math.floor(minD - casterReach));
        const far = Math.ceil(maxD + margin);
        const box = this.box;
        if (box.left === cx - halfX && box.right === cx + halfX && box.bottom === cy - halfY && box.top === cy + halfY
            && box.near === near && box.far === far) return false;
        box.left = cx - halfX; box.right = cx + halfX; box.bottom = cy - halfY; box.top = cy + halfY; box.near = near; box.far = far;
        shadowCamera.left = box.left; shadowCamera.right = box.right;
        shadowCamera.bottom = box.bottom; shadowCamera.top = box.top;
        shadowCamera.near = near; shadowCamera.far = far;
        shadowCamera.updateProjectionMatrix();
        return true;
    }
}
