import {
    Color,
    DynamicDrawUsage,
    Group,
    InstancedBufferAttribute,
    InstancedMesh,
    Matrix4,
    PlaneGeometry,
    Quaternion,
    ShaderMaterial,
    Vector3,
} from 'three';
import { RIO_WATER_CONFIG, rioWaterDepth, type RioWaterConfig } from './seabed';

export const WATER_CONTACT = {
    rippleCapacity: 16,
    splashCapacity: 36,
    shaderRippleSlots: 8,
    minSpeed: 0.22,
    referenceSpeed: 4.2,
    stepStride: 0.44,
    footOffset: 0.14,
    surfaceY: 0.014,
} as const;

export interface WaterRippleSlot {
    x: number;
    z: number;
    age: number;
    duration: number;
    minRadius: number;
    maxRadius: number;
    intensity: number;
    alpha: number;
    radius: number;
    active: boolean;
}

export interface WaterSplashParticle {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    duration: number;
    size: number;
    alpha: number;
}

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Pool pré-alocado de ondulações locais e pequenos respingos nos pés para a faixa rasa do Rio.
 * Zero alocações por quadro e congelamento exato durante pausa (dt === 0).
 */
export class RioWaterContactPool {
    readonly ripples: WaterRippleSlot[];
    readonly splashes: WaterSplashParticle[];
    /** Uniform compacto (8 vec4: x, z, radius, strength) compartilhado com o shader da água. */
    readonly shaderUniformData = new Float32Array(WATER_CONTACT.shaderRippleSlots * 4);
    private rippleCursor = 0;
    private splashCursor = 0;
    private distanceAccum = 0;
    private footSide = 1;
    private prevX = Number.NaN;
    private prevZ = Number.NaN;
    private smoothedSpeed = 0;
    private moveAngle = 0;

    constructor(private readonly config: RioWaterConfig = RIO_WATER_CONFIG) {
        this.ripples = Array.from({ length: WATER_CONTACT.rippleCapacity }, () => ({
            x: 0, z: 0, age: 0, duration: 1, minRadius: 0.14, maxRadius: 0.9,
            intensity: 0, alpha: 0, radius: 0.14, active: false,
        }));
        this.splashes = Array.from({ length: WATER_CONTACT.splashCapacity }, () => ({
            x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
            life: 0, duration: 0.4, size: 0.05, alpha: 0,
        }));
    }

    reset() {
        this.rippleCursor = 0;
        this.splashCursor = 0;
        this.distanceAccum = 0;
        this.prevX = Number.NaN;
        this.prevZ = Number.NaN;
        this.smoothedSpeed = 0;
        this.shaderUniformData.fill(0);
        for (const r of this.ripples) { r.active = false; r.alpha = 0; }
        for (const s of this.splashes) { s.life = 0; s.alpha = 0; }
    }

    /** Emite manualmente uma ondulação e respingos num ponto de pé dentro da água (útil em testes e passos). */
    emitFootContact(footX: number, footZ: number, speed: number, moveAngle: number, depth = rioWaterDepth(footX, footZ, this.config)) {
        if (depth < this.config.contactMinDepth || speed < WATER_CONTACT.minSpeed) return false;
        const speedNorm = clamp((speed - WATER_CONTACT.minSpeed) / WATER_CONTACT.referenceSpeed, 0.15, 1.35);
        const depthNorm = clamp((depth - this.config.contactMinDepth) / 0.18, 0.25, 1.0);
        const strength = clamp(speedNorm * (0.65 + 0.35 * depthNorm), 0.16, 1.25);

        const ripple = this.ripples[this.rippleCursor];
        this.rippleCursor = (this.rippleCursor + 1) % this.ripples.length;
        ripple.x = footX;
        ripple.z = footZ;
        ripple.age = 0;
        ripple.duration = 0.85 + 0.35 * strength;
        ripple.minRadius = 0.13;
        ripple.maxRadius = 0.68 + 0.42 * strength;
        ripple.radius = ripple.minRadius;
        ripple.intensity = strength;
        ripple.alpha = 0.55 * strength;
        ripple.active = true;

        const dropletCount = Math.max(2, Math.min(6, Math.round(2 + 3.5 * speedNorm)));
        for (let i = 0; i < dropletCount; i++) {
            const p = this.splashes[this.splashCursor];
            this.splashCursor = (this.splashCursor + 1) % this.splashes.length;
            const spread = (i / dropletCount) * Math.PI * 2 + (this.rippleCursor * 1.17);
            const radialSpeed = (0.28 + 0.38 * ((i * 7 % 5) / 4)) * speedNorm;
            p.x = footX + Math.cos(spread) * 0.05;
            p.y = WATER_CONTACT.surfaceY + 0.02;
            p.z = footZ + Math.sin(spread) * 0.05;
            p.vx = Math.cos(spread) * radialSpeed - Math.sin(moveAngle) * (0.18 * speedNorm);
            p.vz = Math.sin(spread) * radialSpeed - Math.cos(moveAngle) * (0.18 * speedNorm);
            p.vy = (0.68 + 0.48 * ((i * 3 % 4) / 3)) * speedNorm;
            p.duration = 0.28 + 0.16 * speedNorm;
            p.life = p.duration;
            p.size = 0.045 + 0.03 * speedNorm;
            p.alpha = 0.52 * strength;
        }
        return true;
    }

    /** Avança o estado dos efeitos; quando dt <= 0 (pausa), preserva o estado congelado. */
    step(playerX: number, playerZ: number, dt: number) {
        if (dt <= 0) return;
        const clampedDt = Math.min(dt, 0.1);

        if (!Number.isFinite(this.prevX) || !Number.isFinite(this.prevZ)) {
            this.prevX = playerX;
            this.prevZ = playerZ;
        }
        const dx = playerX - this.prevX;
        const dz = playerZ - this.prevZ;
        this.prevX = playerX;
        this.prevZ = playerZ;

        const dist = Math.hypot(dx, dz);
        // Ignora teletransporte de spawn/reset
        const instantSpeed = dist > 2.5 ? 0 : dist / clampedDt;
        const blend = 1 - Math.exp(-14 * clampedDt);
        this.smoothedSpeed += (instantSpeed - this.smoothedSpeed) * blend;
        if (dist > 1e-4 && dist <= 2.5) {
            this.moveAngle = Math.atan2(dx, dz);
        }

        const depth = rioWaterDepth(playerX, playerZ, this.config);
        if (depth >= this.config.contactMinDepth && this.smoothedSpeed >= WATER_CONTACT.minSpeed && dist <= 2.5) {
            this.distanceAccum += dist;
            const stride = Math.max(0.28, WATER_CONTACT.stepStride - 0.025 * Math.min(this.smoothedSpeed, 6));
            while (this.distanceAccum >= stride) {
                this.distanceAccum -= stride;
                this.footSide = -this.footSide;
                const perpX = Math.cos(this.moveAngle) * WATER_CONTACT.footOffset * this.footSide;
                const perpZ = -Math.sin(this.moveAngle) * WATER_CONTACT.footOffset * this.footSide;
                const fx = playerX + perpX;
                const fz = playerZ + perpZ;
                const footDepth = rioWaterDepth(fx, fz, this.config);
                if (footDepth >= this.config.contactMinDepth) {
                    this.emitFootContact(fx, fz, this.smoothedSpeed, this.moveAngle, footDepth);
                }
            }
        } else {
            this.distanceAccum = Math.min(this.distanceAccum, WATER_CONTACT.stepStride * 0.5);
        }

        // Atualiza ondulações locais
        for (let i = 0; i < this.ripples.length; i++) {
            const r = this.ripples[i];
            if (!r.active) continue;
            r.age += clampedDt;
            if (r.age >= r.duration) {
                r.active = false;
                r.alpha = 0;
                continue;
            }
            const u = r.age / r.duration;
            r.radius = r.minRadius + (r.maxRadius - r.minRadius) * (1 - (1 - u) * (1 - u));
            r.alpha = r.intensity * Math.min(1, u / 0.12) * (1 - u) * (1 - u) * 0.65;
        }

        // Atualiza gotículas de respingo
        const drag = Math.exp(-2.5 * clampedDt);
        for (let i = 0; i < this.splashes.length; i++) {
            const s = this.splashes[i];
            if (s.life <= 0) continue;
            s.life = Math.max(0, s.life - clampedDt);
            s.x += s.vx * clampedDt;
            s.y += s.vy * clampedDt;
            s.z += s.vz * clampedDt;
            s.vx *= drag;
            s.vz *= drag;
            s.vy -= 3.6 * clampedDt;
            if (s.y <= WATER_CONTACT.surfaceY * 0.5) {
                s.life = 0;
                s.alpha = 0;
                continue;
            }
            const u = 1 - s.life / s.duration;
            s.alpha = 0.58 * Math.min(1, u / 0.15) * (1 - u);
        }

        // Preenche uniform compacto para o shader da água
        this.shaderUniformData.fill(0);
        let slot = 0;
        for (let i = 0; i < this.ripples.length && slot < WATER_CONTACT.shaderRippleSlots; i++) {
            const r = this.ripples[i];
            if (!r.active || r.alpha <= 0.005) continue;
            const base = slot * 4;
            this.shaderUniformData[base] = r.x;
            this.shaderUniformData[base + 1] = r.z;
            this.shaderUniformData[base + 2] = r.radius;
            this.shaderUniformData[base + 3] = r.alpha;
            slot++;
        }
    }

    get activeRippleCount() {
        let count = 0;
        for (let i = 0; i < this.ripples.length; i++) if (this.ripples[i].active) count++;
        return count;
    }

    get activeSplashCount() {
        let count = 0;
        for (let i = 0; i < this.splashes.length; i++) if (this.splashes[i].life > 0) count++;
        return count;
    }
}

const noRaycast = () => {};

/** Cria os dois InstancedMeshes reutilizáveis (ondulações e respingos) para o grupo visual do Rio. */
export function createRioWaterContactVisual(pool: RioWaterContactPool) {
    const root = new Group();
    root.name = 'RioWaterContactEffects';

    // 1. Ondulações circulares na superfície da água
    const rippleAlpha = new InstancedBufferAttribute(new Float32Array(WATER_CONTACT.rippleCapacity), 1).setUsage(DynamicDrawUsage);
    const rippleGeo = new PlaneGeometry(2, 2);
    rippleGeo.rotateX(-Math.PI / 2);
    rippleGeo.setAttribute('rippleAlpha', rippleAlpha);
    const rippleMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
            ringColor: { value: new Color('#f2ece0') },
        },
        vertexShader: `
            attribute float rippleAlpha;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                vUv = uv * 2.0 - 1.0;
                vAlpha = rippleAlpha;
                gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 ringColor;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                float r = length(vUv);
                if (r > 1.0) discard;
                float outerRing = exp(-pow((r - 0.78) / 0.11, 2.0));
                float innerRing = 0.55 * exp(-pow((r - 0.44) / 0.13, 2.0));
                float a = (outerRing + innerRing) * vAlpha;
                if (a < 0.004) discard;
                gl_FragColor = vec4(ringColor, a);
                #include <colorspace_fragment>
            }
        `,
    });
    const rippleMesh = new InstancedMesh(rippleGeo, rippleMat, WATER_CONTACT.rippleCapacity);
    rippleMesh.name = 'RioWaterRipples';
    rippleMesh.frustumCulled = false;
    rippleMesh.renderOrder = 3;
    rippleMesh.raycast = noRaycast;
    rippleMesh.count = 0;
    rippleMesh.instanceMatrix.setUsage(DynamicDrawUsage);

    // 2. Pequenos respingos discretos junto aos pés
    const splashAlpha = new InstancedBufferAttribute(new Float32Array(WATER_CONTACT.splashCapacity), 1).setUsage(DynamicDrawUsage);
    const splashGeo = new PlaneGeometry(1, 1);
    splashGeo.rotateX(-Math.PI / 4);
    splashGeo.setAttribute('splashAlpha', splashAlpha);
    const splashMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
            dropColor: { value: new Color('#f5efe4') },
        },
        vertexShader: `
            attribute float splashAlpha;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                vUv = uv * 2.0 - 1.0;
                vAlpha = splashAlpha;
                gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 dropColor;
            varying vec2 vUv;
            varying float vAlpha;
            void main() {
                float r = length(vUv);
                if (r > 1.0) discard;
                float soft = exp(-r * r * 3.2) * (1.0 - smoothstep(0.55, 1.0, r));
                gl_FragColor = vec4(dropColor, soft * vAlpha);
                #include <colorspace_fragment>
            }
        `,
    });
    const splashMesh = new InstancedMesh(splashGeo, splashMat, WATER_CONTACT.splashCapacity);
    splashMesh.name = 'RioWaterSplashes';
    splashMesh.frustumCulled = false;
    splashMesh.renderOrder = 4;
    splashMesh.raycast = noRaycast;
    splashMesh.count = 0;
    splashMesh.instanceMatrix.setUsage(DynamicDrawUsage);

    root.add(rippleMesh, splashMesh);

    const pos = new Vector3();
    const scale = new Vector3();
    const quat = new Quaternion();
    const splashQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);
    const mat4 = new Matrix4();

    function syncVisual() {
        let rCount = 0;
        for (let i = 0; i < pool.ripples.length; i++) {
            const r = pool.ripples[i];
            if (!r.active || r.alpha <= 0.004) continue;
            pos.set(r.x, WATER_CONTACT.surfaceY, r.z);
            scale.set(r.radius, 1, r.radius);
            mat4.compose(pos, quat, scale);
            rippleMesh.setMatrixAt(rCount, mat4);
            rippleAlpha.setX(rCount, r.alpha);
            rCount++;
        }
        rippleMesh.count = rCount;
        rippleMesh.instanceMatrix.needsUpdate = true;
        rippleAlpha.needsUpdate = true;

        let sCount = 0;
        for (let i = 0; i < pool.splashes.length; i++) {
            const s = pool.splashes[i];
            if (s.life <= 0 || s.alpha <= 0.004) continue;
            pos.set(s.x, s.y, s.z);
            scale.set(s.size, s.size * 1.35, s.size);
            mat4.compose(pos, splashQuat, scale);
            splashMesh.setMatrixAt(sCount, mat4);
            splashAlpha.setX(sCount, s.alpha);
            sCount++;
        }
        splashMesh.count = sCount;
        splashMesh.instanceMatrix.needsUpdate = true;
        splashAlpha.needsUpdate = true;
    }

    return { root, rippleMesh, splashMesh, syncVisual };
}
