/** Vento de areia: advecção, rajadas suaves e resposta com inércia, em metros/segundo. */
export const SAND_WIND = {
    velocityX: 1.4, velocityZ: .45, responseSeconds: 1.3,
    cloudCount: 28, cloudOpacity: .16,
    minX: -27, maxX: 27, minZ: -23, maxZ: 43
} as const;
export class SandwindWind {
    time = 0;
    velocityX: number = SAND_WIND.velocityX;
    velocityZ: number = SAND_WIND.velocityZ;
    offsetX = 0;
    offsetZ = 0;
    update(delta: number, active: boolean, paused: boolean) {
        if (!active || paused || !Number.isFinite(delta) || delta <= 0) return;
        const dt = Math.min(.05, Math.max(0, delta));
        this.time += dt;
        const targetX = SAND_WIND.velocityX + Math.sin(this.time * .37) * .32 + Math.sin(this.time * .91 + .8) * .16;
        const targetZ = SAND_WIND.velocityZ + Math.sin(this.time * .21 + .9) * .18;
        const response = 1 - Math.exp(-dt / SAND_WIND.responseSeconds);
        this.velocityX += (targetX - this.velocityX) * response;
        this.velocityZ += (targetZ - this.velocityZ) * response;
        this.offsetX += this.velocityX * dt;
        this.offsetZ += this.velocityZ * dt;
    }
}
/** Pool fixo; nunca cria nuvens/arrays durante a animação. */
export class SandCloudField {
    readonly positions = new Float32Array(SAND_WIND.cloudCount * 2);
    readonly sizes = new Float32Array(SAND_WIND.cloudCount * 2);
    readonly phases = new Float32Array(SAND_WIND.cloudCount);
    time = 0;
    constructor() {
        for (let i = 0; i < SAND_WIND.cloudCount; i++) {
            const a = ((i * 17 + 11) % 31) / 31, b = ((i * 13 + 7) % 29) / 29;
            this.positions[i * 2] = SAND_WIND.minX + a * (SAND_WIND.maxX - SAND_WIND.minX);
            this.positions[i * 2 + 1] = SAND_WIND.minZ + b * (SAND_WIND.maxZ - SAND_WIND.minZ);
            this.sizes[i * 2] = 8 + a * 6; this.sizes[i * 2 + 1] = 2 + b * 1.5;
            this.phases[i] = i * 2.399963;
        }
    }
    update(delta: number, wind: SandwindWind, active: boolean, paused: boolean) {
        if (!active || paused || !Number.isFinite(delta) || delta <= 0) return;
        const dt = Math.min(.05, Math.max(0, delta)); this.time += dt;
        const w = SAND_WIND.maxX - SAND_WIND.minX, d = SAND_WIND.maxZ - SAND_WIND.minZ;
        for (let i = 0; i < SAND_WIND.cloudCount; i++) {
            let x = this.positions[i * 2] + (wind.velocityX + .06 * Math.sin(this.time + this.phases[i])) * dt;
            let z = this.positions[i * 2 + 1] + (wind.velocityZ + .08 * Math.sin(this.time * .77 + this.phases[i])) * dt;
            if (x > SAND_WIND.maxX) x -= w; if (x < SAND_WIND.minX) x += w;
            if (z > SAND_WIND.maxZ) z -= d; if (z < SAND_WIND.minZ) z += d;
            this.positions[i * 2] = x; this.positions[i * 2 + 1] = z;
        }
    }
}
export const SAND_NOISE_GLSL = `
float sandHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float sandNoise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(sandHash(i),sandHash(i+vec2(1.,0.)),f.x),mix(sandHash(i+vec2(0.,1.)),sandHash(i+vec2(1.,1.)),f.x),f.y);
}
float sandCloudNoise(vec2 p) { return sandNoise(p)*.57 + sandNoise(p*2.03+11.7)*.29 + sandNoise(p*4.01+3.1)*.14; }
`;
