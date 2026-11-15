import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Group,
    Mesh,
    ShaderMaterial,
    UniformsUtils,
    UniformsLib,
    Vector2,
    Vector3,
    Vector4,
} from 'three';
import {
    RIO_WATER_CONFIG,
    rioSeabedHeight,
    type RioWaterConfig,
} from './seabed';
import {
    RioWaterContactPool,
    WATER_CONTACT,
    createRioWaterContactVisual,
} from './waterContact';

import { RIO_ARES_POSITION } from './layout';

const noRaycast = () => {};

/** Gera malha subdividida não-uniforme concentrando resolução na faixa costeira (X = 31..46, Z = -56..56). */
function buildCoastalGridGeometry(
    xStops: number[],
    zStops: number[],
    heightFn: (x: number, z: number) => number,
): BufferGeometry {
    const nx = xStops.length;
    const nz = zStops.length;
    const positions = new Float32Array(nx * nz * 3);
    const normals = new Float32Array(nx * nz * 3);
    const uvs = new Float32Array(nx * nz * 2);

    const xMin = xStops[0], xSpan = Math.max(1e-5, xStops[nx - 1] - xMin);
    const zMin = zStops[0], zSpan = Math.max(1e-5, zStops[nz - 1] - zMin);

    let ptr = 0, uvPtr = 0;
    for (let iz = 0; iz < nz; iz++) {
        const z = zStops[iz];
        const v = (z - zMin) / zSpan;
        for (let ix = 0; ix < nx; ix++) {
            const x = xStops[ix];
            const y = heightFn(x, z);
            positions[ptr] = x;
            positions[ptr + 1] = y;
            positions[ptr + 2] = z;
            normals[ptr] = 0;
            normals[ptr + 1] = 1;
            normals[ptr + 2] = 0;
            ptr += 3;
            uvs[uvPtr++] = (x - xMin) / xSpan;
            uvs[uvPtr++] = v;
        }
    }

    const quadCount = (nx - 1) * (nz - 1);
    const indices = new Uint32Array(quadCount * 6);
    let idx = 0;
    for (let iz = 0; iz < nz - 1; iz++) {
        const row0 = iz * nx;
        const row1 = (iz + 1) * nx;
        for (let ix = 0; ix < nx - 1; ix++) {
            const a = row0 + ix;
            const b = row0 + ix + 1;
            const c = row1 + ix;
            const d = row1 + ix + 1;
            indices[idx++] = a;
            indices[idx++] = c;
            indices[idx++] = b;
            indices[idx++] = b;
            indices[idx++] = c;
            indices[idx++] = d;
        }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('normal', new BufferAttribute(normals, 3));
    geo.setAttribute('uv', new BufferAttribute(uvs, 2));
    geo.setIndex(new BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
}

function buildStops(segments: Array<{ from: number; to: number; steps: number }>): number[] {
    const out: number[] = [];
    for (let s = 0; s < segments.length; s++) {
        const { from, to, steps } = segments[s];
        const start = s === 0 ? 0 : 1;
        for (let i = start; i <= steps; i++) {
            out.push(from + ((to - from) * i) / steps);
        }
    }
    return out;
}

const SHARED_COASTAL_GLSL = /* glsl */ `
uniform float uTime;
uniform float uWaterlineX;
uniform float uSwashMinX;
uniform float uSlopeStartX;
uniform float uShallowLimitX;
uniform float uShallowMinZ;
uniform float uWaterlineDepth;
uniform float uMaxShallowDepth;
uniform float uMaxDeepDepth;
uniform float uDeepTransitionSpan;
uniform float uAmplitude;
uniform float uSwashAmplitude;
uniform vec2 uDirection;
uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
uniform float uWetDecayRate;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float grainBand(vec2 p, float footprint) {
    // Amortece detalhe subpixel quando a câmera se afasta ou gira.
    return mix(valueNoise(p), 0.5, smoothstep(0.35, 0.95, footprint));
}

float bell(float x) {
    return exp(-x * x);
}

float fbm2(vec2 p) {
    float v = 0.0;
    v += 0.62 * valueNoise(p);
    v += 0.38 * valueNoise(p * 2.13 + vec2(17.1, -9.4));
    return v;
}

/** Malha celular orgânica com vazios internos para a renda da espuma. */
float cellularFoamPattern(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            float h1 = hash21(i + g);
            float h2 = hash21((i + g) * 1.73 + vec2(13.7, 29.1));
            vec2 o = vec2(h1, h2) * 0.78 + 0.11;
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    // Borda entre células = filamento de espuma; interior da célula = vazio interno de água
    float edge = sqrt(d2) - sqrt(d1);
    return 1.0 - smoothstep(0.04, 0.24, edge);
}

float coastlineOffset(float z) {
    return uIntensity * (
        0.34 * sin(z * 0.11 + 0.4)
        + 0.19 * cos(z * 0.23 - 1.1)
        + 0.09 * sin(z * 0.47 + 2.0)
    );
}

float wavePhaseAtZ(float z, float t) {
    float along = z * uDirection.y * uScale;
    float lobe = 0.55 * sin(z * 0.14 - 0.7) + 0.25 * cos(z * 0.31 + 1.2);
    return t * uSpeed + along + lobe;
}

float waveSwashFrontX(float z, float t) {
    float phase = wavePhaseAtZ(z, t);
    float asym = sin(phase) + 0.28 * sin(2.0 * phase - 0.65);
    float coast = coastlineOffset(z);
    float baseFront = uWaterlineX - 0.35 + coast;
    return baseFront - uSwashAmplitude * uIntensity * asym;
}

float seabedHeightAt(float x, float z) {
    if (x <= uSlopeStartX) return 0.0;
    if (x <= uWaterlineX) {
        float t = smoothstep(uSlopeStartX, uWaterlineX, x);
        return -uWaterlineDepth * t;
    }
    float pierChannel = (1.0 - smoothstep(uShallowMinZ - 1.4, uShallowMinZ + 0.8, z));
    float effShallow = uShallowLimitX - pierChannel * 2.6;
    if (x <= effShallow) {
        float span = max(0.4, effShallow - uWaterlineX);
        float u = clamp((x - uWaterlineX) / span, 0.0, 1.0);
        float ease = u * (0.65 + 0.35 * u);
        return -(uWaterlineDepth + (uMaxShallowDepth - uWaterlineDepth) * ease);
    }
    float deepT = smoothstep(effShallow, effShallow + uDeepTransitionSpan, x);
    return -(uMaxShallowDepth + (uMaxDeepDepth - uMaxShallowDepth) * deepT);
}

float sandWetnessAt(float x, float z, float t) {
    float coast = coastlineOffset(z);
    float currentFront = waveSwashFrontX(z, t);
    float damp = smoothstep(uSwashMinX - 2.5 + coast, uWaterlineX + coast, x);
    float wash = smoothstep(currentFront - 0.74, currentFront + 0.60, x);
    // Limites conservadores: fora da zona de espraiamento o histórico não muda o resultado.
    if (wash >= 1.0) return 1.0;
    float lowestFront = uWaterlineX - 0.35 + coast - uSwashAmplitude * uIntensity * 1.28;
    if (x <= lowestFront - 0.74) return 0.42 * damp;
    float recentReach = 0.0;
    float period = 6.2831853 / max(0.2, uSpeed);
    for (int i = 1; i <= 6; i++) {
        float past = (float(i) / 6.0) * period * 0.85;
        float pastFront = waveSwashFrontX(z, t - past);
        float coverage = smoothstep(pastFront - 0.65, pastFront + 0.38, x);
        recentReach = max(recentReach, coverage * exp(-uWetDecayRate * past));
    }
    float recent = max(0.60 * recentReach, 0.42 * damp);
    return mix(recent, 1.0, wash);
}
`;

function createUniformsFromConfig(config: RioWaterConfig, rippleBuffer: Float32Array) {
    const rippleVec4s = Array.from({ length: WATER_CONTACT.shaderRippleSlots }, (_, i) => {
        const b = i * 4;
        return new Vector4(rippleBuffer[b], rippleBuffer[b + 1], rippleBuffer[b + 2], rippleBuffer[b + 3]);
    });
    return {
        uTime: { value: 0 },
        uLandingOrigin: { value: new Vector2(RIO_ARES_POSITION.x, RIO_ARES_POSITION.z) },
        uWaterlineX: { value: config.waterlineX },
        uSwashMinX: { value: config.swashMinX },
        uSlopeStartX: { value: config.slopeStartX },
        uShallowLimitX: { value: config.shallowLimitX },
        uShallowMinZ: { value: config.shallowMinZ },
        uWaterlineDepth: { value: config.waterlineDepth },
        uMaxShallowDepth: { value: config.maxShallowDepth },
        uMaxDeepDepth: { value: config.maxDeepDepth },
        uDeepTransitionSpan: { value: config.deepTransitionSpan },
        uAmplitude: { value: config.amplitude },
        uSwashAmplitude: { value: config.swashAmplitude },
        uDirection: { value: new Vector2(config.direction.x, config.direction.z) },
        uSpeed: { value: config.speed },
        uScale: { value: config.scale },
        uIntensity: { value: config.intensity },
        uWetDecayRate: { value: config.wetDecayRate },
        uSunDirection: { value: new Vector3(-28, 37, 40).normalize() },
        uSunColor: { value: new Color('#ffd3a0') },
        uSkyHorizonColor: { value: new Color('#f3dfc7') },
        uSkyZenithColor: { value: new Color('#8ea4b2') },
        uFogColor: { value: new Color('#e6c4a2') },
        uFogNear: { value: 85.0 },
        uFogFar: { value: 180.0 },
        uRipples: { value: rippleVec4s },
    };
}

/**
 * Material contínuo de praia e fundo submerso:
 * (1) areia seca -> (2) areia úmida -> (3) areia molhada com histerese e brilho especular ->
 * (4) fundo submerso raso com ondulações de areia -> (5) fundo profundo.
 */
export function createRioBeachSeabedMaterial(uniforms: ReturnType<typeof createUniformsFromConfig>) {
    return new ShaderMaterial({
        uniforms: { ...UniformsUtils.clone(UniformsLib.lights), ...uniforms },
        lights: true,
        vertexShader: /* glsl */ `
            #include <common>
            #include <shadowmap_pars_vertex>
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPosition.xyz;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                vec3 transformedNormal = normalize(normalMatrix * normal);
                #include <shadowmap_vertex>
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: /* glsl */ `
            #include <common>
            #include <packing>
            #include <shadowmap_pars_fragment>
            uniform bool receiveShadow;
            #include <shadowmask_pars_fragment>
            ${SHARED_COASTAL_GLSL}
            uniform vec2 uLandingOrigin;
            uniform vec3 uSunDirection;
            uniform vec3 uSunColor;
            uniform vec3 uSkyHorizonColor;
            uniform vec3 uSkyZenithColor;
            uniform vec3 uFogColor;
            uniform float uFogNear;
            uniform float uFogFar;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;

            void main() {
                float x = vWorldPos.x;
                float z = vWorldPos.z;

                // Manchas maiores, ondulação de vento e grão fino em coordenadas do mundo.
                vec2 sand = vWorldPos.xz;
                float footprint = max(length(dFdx(sand)), length(dFdy(sand)));
                float macroPatch = fbm2(sand * vec2(0.20, 0.12));
                float grain = grainBand(sand * 4.0, footprint * 4.0);
                float fineGrain = grainBand(sand * 16.0, footprint * 16.0);
                float windWarp = fbm2(sand * 0.46);
                float ripple = sin(x * 13.0 + z * 4.3 + windWarp * 6.4);
                ripple *= (1.0 - smoothstep(0.18, 0.85, footprint * 2.4)) * windWarp;

                vec3 drySand = mix(vec3(0.40, 0.27, 0.15), vec3(0.69, 0.51, 0.30), macroPatch);
                float depth = max(0.0, -vWorldPos.y);
                float wetness = sandWetnessAt(x + (windWarp - 0.5) * 0.30, z, uTime);
                // Umidade escurece a mesma areia. O grão permanece sob a lâmina rasa.
                vec3 sandColor = drySand * mix(vec3(1.0), vec3(0.55, 0.59, 0.66), wetness);
                float microRelief = (grain - 0.5) * 0.17 + (fineGrain - 0.5) * 0.095 + ripple * 0.036;
                sandColor *= 1.0 + microRelief;
                // Compactação das quatro sapatas e areia varrida sob os propulsores.
                vec2 landing = sand - uLandingOrigin;
                float padDistance = length(vec2(min(abs(landing.x + 1.82), abs(landing.x - 2.43)) / 0.49,
                                                (abs(landing.y) - 1.60) / 0.53));
                float pressure = 1.0 - smoothstep(0.44, 1.0, padDistance + (grain - 0.5) * 0.22);
                vec2 exhaust = vec2((landing.x - 0.8) / 2.6, (abs(landing.y) - 2.1) / 1.28);
                float sweep = (1.0 - smoothstep(0.24, 1.0, length(exhaust))) * (0.57 + windWarp * 0.43);
                sandColor *= 1.0 - pressure * 0.19 - sweep * 0.14;
                vec3 baseColor = mix(sandColor, vec3(0.145, 0.255, 0.298), smoothstep(0.26, 1.15, depth));

                vec3 N = normalize(vWorldNormal + vec3((grain - 0.5) * 0.09 + ripple * 0.025, 0.0, (fineGrain - 0.5) * 0.045));
                float sunlight = max(0.0, dot(N, uSunDirection)) * getShadowMask();
                vec3 litColor = baseColor * (vec3(0.54, 0.57, 0.62) + uSunColor * sunlight * 0.83);

                float currentFront = waveSwashFrontX(z, uTime);
                float exposedWetSand = wetness * (1.0 - smoothstep(currentFront - 0.20, currentFront + 0.65, x));
                vec3 V = isOrthographic ? vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z)
                                        : normalize(cameraPosition - vWorldPos);
                vec3 H = normalize(uSunDirection + V);
                float specular = pow(max(0.0, dot(N, H)), mix(14.0, 29.0, wetness));
                litColor += uSunColor * (exposedWetSand * sunlight * specular * 0.095);

                float fogDist = length(cameraPosition - vWorldPos);
                float fogFactor = smoothstep(uFogNear, uFogFar, fogDist);
                litColor = mix(litColor, uFogColor, fogFactor);

                gl_FragColor = vec4(litColor, 1.0);
                #include <colorspace_fragment>
            }
        `,
    });
}

/**
 * Material da superfície costeira da água:
 * ondas calmas rumo à praia (-X), lâmina rasa (swash), espuma orgânica rendada com vazios internos,
 * atenuação contínua do fundo por profundidade e reflexo de fim de tarde.
 */
export function createRioWaterSurfaceMaterial(uniforms: ReturnType<typeof createUniformsFromConfig>) {
    return new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms,
        vertexShader: /* glsl */ `
            ${SHARED_COASTAL_GLSL}
            uniform vec4 uRipples[${WATER_CONTACT.shaderRippleSlots}];
            varying vec3 vWorldPos;
            varying float vWaveHeight;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                float x = worldPosition.x;
                float z = worldPosition.z;

                float seabed = seabedHeightAt(x, z);
                float depth = max(0.0, -seabed);
                float waveEnvelope = smoothstep(0.01, 0.14, depth);

                float phase1 = (x * uDirection.x + z * uDirection.y) * uScale + uTime * uSpeed + 0.45 * sin(z * 0.14);
                float phase2 = (x * -0.94 - z * 0.22) * (uScale * 1.55) + uTime * (uSpeed * 1.24) + 0.35 * cos(z * 0.27);
                float w1 = sin(phase1) + 0.22 * cos(2.0 * phase1);
                float w2 = 0.52 * sin(phase2);

                float rippleDisp = 0.0;
                for (int i = 0; i < ${WATER_CONTACT.shaderRippleSlots}; i++) {
                    vec4 rp = uRipples[i];
                    if (rp.w > 0.001) {
                        float d = length(vec2(x - rp.x, z - rp.y));
                        float ring = bell((d - rp.z) / 0.18) * sin((d - rp.z) * 22.0);
                        rippleDisp += ring * rp.w * 0.014;
                    }
                }

                float disp = (w1 * 0.68 + w2 * 0.32) * uAmplitude * uIntensity * waveEnvelope + rippleDisp;
                // Mantém a lâmina rasa ligeiramente acima da rampa de areia para evitar cintilação coplanar
                float minClearance = max(seabed + 0.014, 0.008);
                worldPosition.y = max(minClearance, 0.012 + disp);
                vWorldPos = worldPosition.xyz;
                vWaveHeight = disp;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: /* glsl */ `
            ${SHARED_COASTAL_GLSL}
            uniform vec3 uSunDirection;
            uniform vec3 uSunColor;
            uniform vec3 uSkyHorizonColor;
            uniform vec3 uSkyZenithColor;
            uniform vec3 uFogColor;
            uniform float uFogNear;
            uniform float uFogFar;
            uniform vec4 uRipples[${WATER_CONTACT.shaderRippleSlots}];
            varying vec3 vWorldPos;
            varying float vWaveHeight;

            void main() {
                float x = vWorldPos.x;
                float z = vWorldPos.z;

                float swashFront = waveSwashFrontX(z, uTime);
                if (x < swashFront - 0.48) discard;

                float seabed = seabedHeightAt(x, z);
                float depth = max(0.0, vWorldPos.y - seabed);
                float distFromFront = x - swashFront;

                // Borda suave de entrada da lâmina de swash sobre a areia molhada
                float swashEdgeAlpha = smoothstep(-0.48, 0.86, distFromFront);

                // Ondulações multiescala para perturbação de normal (limitadas em frequência para não cintilar)
                float phase1 = (x * uDirection.x + z * uDirection.y) * uScale + uTime * uSpeed + 0.45 * sin(z * 0.14);
                float phase2 = (x * -0.94 - z * 0.22) * (uScale * 1.55) + uTime * (uSpeed * 1.24) + 0.35 * cos(z * 0.27);
                float cap1 = valueNoise(vec2(x * 0.85 + uTime * 0.42, z * 0.65 - uTime * 0.18));
                float cap2 = valueNoise(vec2(x * 1.65 - uTime * 0.31, z * 1.35 + uTime * 0.24));

                float dHx = cos(phase1) * uDirection.x * uScale * 0.032
                          - 0.94 * cos(phase2) * (uScale * 1.55) * 0.016
                          + (cap1 - 0.5) * 0.045 + (cap2 - 0.5) * 0.028;
                float dHz = cos(phase1) * uDirection.y * uScale * 0.032
                          - 0.22 * cos(phase2) * (uScale * 1.55) * 0.016
                          + (cap1 - 0.5) * 0.035 - (cap2 - 0.5) * 0.025;

                // Contribuição das ondulações locais dos pés do personagem
                float contactFoam = 0.0;
                for (int i = 0; i < ${WATER_CONTACT.shaderRippleSlots}; i++) {
                    vec4 rp = uRipples[i];
                    if (rp.w > 0.001) {
                        vec2 dVec = vec2(x - rp.x, z - rp.y);
                        float d = length(dVec);
                        float ringEnv = bell((d - rp.z) / 0.15);
                        vec2 dir = d > 1e-4 ? dVec / d : vec2(1.0, 0.0);
                        dHx += dir.x * ringEnv * rp.w * 0.08;
                        dHz += dir.y * ringEnv * rp.w * 0.08;
                        contactFoam += ringEnv * rp.w * 0.42;
                    }
                }

                vec3 N = normalize(vec3(-dHx, 1.0, -dHz));

                // Cor da água e transparência por profundidade (Beer-Lambert costeiro)
                // Faixa de swash e mar raso caminhável (0..30 cm): oliva-âmbar translúcido -> verde-água acinzentado
                // Mar profundo (> 30 cm, X > 39.2 e canal do píer): azul-esverdeado ardósia dessaturado
                float absorption = 1.0 - exp(-depth * 3.6);
                float deepZone = smoothstep(0.24, 0.68, depth);
                vec3 shallowTint = vec3(0.435, 0.518, 0.478); // #6f847a
                vec3 midCoastalTint = vec3(0.278, 0.447, 0.478); // #47727a
                vec3 deepSlateTint = vec3(0.165, 0.306, 0.357); // #2a4e5b

                vec3 waterBodyColor = mix(shallowTint, midCoastalTint, smoothstep(0.04, 0.28, depth));
                waterBodyColor = mix(waterBodyColor, deepSlateTint, deepZone);
                // Variação suave em escala de metros
                float patchMod = fbm2(vec2(x * 0.09 - uTime * 0.03, z * 0.07));
                waterBodyColor += (patchMod - 0.5) * 0.038;

                // Iluminação difusa costeira da coluna d'água
                float ndl = max(0.0, dot(N, uSunDirection));
                vec3 waterLit = waterBodyColor * (0.68 + 0.34 * ndl);

                // Espuma orgânica de arrebentação (crista + malha rendada com vazios internos + ondas externas)
                float alongVar = fbm2(vec2(z * 0.18, uTime * 0.12));
                float breakStrength = 0.65 + 0.35 * sin(wavePhaseAtZ(z, uTime) + 0.5);

                // 1) Borda principal da arrebentação (com interrupções naturais ao longo de Z)
                float foamDrift = uTime * 0.20;
                float crestWarp = fbm2(vec2(z * 0.36, x * 0.41 + foamDrift));
                float leadingWidth = 0.32 + 0.48 * alongVar;
                float leadingBand = bell((distFromFront - 0.28 - 0.37 * crestWarp) / leadingWidth);
                float leadingGaps = smoothstep(0.30, 0.78, fbm2(vec2(z * 0.56 + 1.7, x * 0.56 - foamDrift)));
                float leadingFoam = leadingBand * leadingGaps * (0.38 + 0.35 * breakStrength);

                // 2) Renda traseira (foam lace) com vazios internos celulares (0.2 m a 3.1 m atrás da frente)
                float laceZone = smoothstep(0.05, 0.45, distFromFront) * (1.0 - smoothstep(1.2, 3.2 + alongVar * 1.1, distFromFront));
                vec2 laceUV = vec2(x * 1.43 + foamDrift, z * 0.87);
                laceUV += vec2(crestWarp, fbm2(vec2(z * 0.46, x * 0.42 - foamDrift))) * 1.65;
                float cellWeb = cellularFoamPattern(laceUV);
                float pockets = smoothstep(0.26, 0.69, fbm2(laceUV * 0.52));
                float laceFoam = laceZone * smoothstep(0.22, 0.8, cellWeb) * pockets * 0.55;

                // 3) Cristas secundárias quebrando na borda do banco de areia raso (X ~ 37.8..44.0)
                float crestWave = sin(phase1 - 0.55) * 0.7 + sin(phase2) * 0.3;
                float offshoreZone = smoothstep(37.0, 38.4, x) * (1.0 - smoothstep(42.5, 48.0, x));
                float offshoreBreak = smoothstep(0.58, 0.92, crestWave + (alongVar - 0.5) * 0.35);
                float offshoreLace = smoothstep(0.30, 0.75, cellularFoamPattern(laceUV * 0.84));
                float offshoreFoam = offshoreZone * offshoreBreak * offshoreLace * pockets * 0.45;

                float foamMask = clamp((max(leadingFoam, max(laceFoam, offshoreFoam)) + contactFoam) * uIntensity, 0.0, 1.0);
                foamMask *= smoothstep(-0.08, 0.18, distFromFront);

                // Cor da espuma: branco-quente/creme iluminado pelo fim de tarde, sem emissão
                vec3 foamBase = vec3(0.937, 0.910, 0.855); // #efe8da
                vec3 foamShadow = vec3(0.765, 0.757, 0.725);
                vec3 foamColor = mix(foamShadow, foamBase, 0.55 + 0.45 * ndl);

                // Reflexos suaves e fragmentados (Fresnel + ondulações + sol de fim de tarde)
                vec3 V = isOrthographic ? vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z)
                                        : normalize(cameraPosition - vWorldPos);
                float ndv = max(0.05, dot(N, V));
                float fresnel = 0.03 + 0.42 * pow(1.0 - ndv, 4.0);
                vec3 R = reflect(-V, N);
                float skyGrad = clamp(R.y * 0.85 + 0.25, 0.0, 1.0);
                vec3 envReflection = mix(uSkyHorizonColor, uSkyZenithColor, skyGrad);

                vec3 H = normalize(uSunDirection + V);
                float sunGlint = pow(max(0.0, dot(N, H)), 72.0) * 0.55 + pow(max(0.0, dot(N, H)), 18.0) * 0.14;
                vec3 reflectionColor = envReflection * fresnel + uSunColor * sunGlint * (0.45 + 0.55 * fresnel);

                // A espuma reduz o reflexo especular direto sobre ela
                vec3 surfaceColor = mix(waterLit + reflectionColor * (1.0 - 0.65 * foamMask), foamColor, foamMask * 0.88);

                // Opacidade contínua: transparente na lâmina rasa, progressivamente opaca na água profunda e na espuma
                float baseOpacity = mix(0.07, 0.74, absorption);
                baseOpacity = mix(baseOpacity, 0.94, deepZone);
                float finalAlpha = min(0.96, mix(baseOpacity, 0.92, foamMask) * swashEdgeAlpha);

                float fogDist = length(cameraPosition - vWorldPos);
                float fogFactor = smoothstep(uFogNear, uFogFar, fogDist);
                surfaceColor = mix(surfaceColor, uFogColor, fogFactor);

                gl_FragColor = vec4(surfaceColor, finalAlpha);
                #include <colorspace_fragment>
            }
        `,
    });
}

export interface RioCoastalWaterRuntime {
    beachMesh: Mesh;
    waterMesh: Mesh;
    contactPool: RioWaterContactPool;
    contactVisual: ReturnType<typeof createRioWaterContactVisual>;
    uniforms: ReturnType<typeof createUniformsFromConfig>;
    getSimulationTime: () => number;
    update: (playerPosition: Vector3, dt: number) => void;
}

/**
 * Constrói e conecta o conjunto costeiro contínuo do Rio (praia + areia molhada + fundo submerso +
 * superfície animada do mar + espuma orgânica + efeitos de contato nos pés).
 */
export function buildRioCoastalWater(group: Group, config: RioWaterConfig = RIO_WATER_CONFIG): RioCoastalWaterRuntime {
    const contactPool = new RioWaterContactPool(config);
    const uniforms = createUniformsFromConfig(config, contactPool.shaderUniformData);

    // 1. Malha contínua da praia (X = 15..36) e do fundo submerso (X = 36..201)
    const beachXStops = buildStops([
        { from: 15, to: 32.5, steps: 5 },
        { from: 32.5, to: 41.5, steps: 32 },
        { from: 41.5, to: 52, steps: 10 },
        { from: 52, to: 201, steps: 4 },
    ]);
    const coastalZStops = buildStops([
        { from: -219, to: -56, steps: 4 },
        { from: -56, to: 56, steps: 112 },
        { from: 56, to: 219, steps: 4 },
    ]);
    const beachGeo = buildCoastalGridGeometry(beachXStops, coastalZStops, (x, z) => rioSeabedHeight(x, z, config));
    const beachMat = createRioBeachSeabedMaterial(uniforms);
    const beachMesh = new Mesh(beachGeo, beachMat);
    beachMesh.name = 'areia';
    beachMesh.receiveShadow = true;
    beachMesh.renderOrder = 1;
    group.add(beachMesh);

    // 2. Malha da superfície costeira da água (X = 31.5..201), com subdivisão concentrada na arrebentação e faixa rasa
    const waterXStops = buildStops([
        { from: 31.5, to: 42.5, steps: 40 },
        { from: 42.5, to: 54, steps: 12 },
        { from: 54, to: 201, steps: 5 },
    ]);
    const waterGeo = buildCoastalGridGeometry(waterXStops, coastalZStops, () => config.waterSurfaceY + 0.012);
    const waterMat = createRioWaterSurfaceMaterial(uniforms);
    const waterMesh = new Mesh(waterGeo, waterMat);
    waterMesh.name = 'mar';
    waterMesh.receiveShadow = true;
    waterMesh.renderOrder = 2;
    waterMesh.raycast = noRaycast;
    group.add(waterMesh);

    // 3. Efeitos discretos de contato nos pés (ondulações + respingos)
    const contactVisual = createRioWaterContactVisual(contactPool);
    group.add(contactVisual.root);

    let simulationTime = 0;

    function update(playerPosition: Vector3, dt: number) {
        if (dt > 0) {
            const stepDt = Math.min(dt, 0.1);
            simulationTime += stepDt;
            uniforms.uTime.value = simulationTime;
            contactPool.step(playerPosition.x, playerPosition.z, stepDt);
            const vec4s = uniforms.uRipples.value;
            const buf = contactPool.shaderUniformData;
            for (let i = 0; i < WATER_CONTACT.shaderRippleSlots; i++) {
                const b = i * 4;
                vec4s[i].set(buf[b], buf[b + 1], buf[b + 2], buf[b + 3]);
            }
            contactVisual.syncVisual();
        }
    }

    return {
        beachMesh,
        waterMesh,
        contactPool,
        contactVisual,
        uniforms,
        getSimulationTime: () => simulationTime,
        update,
    };
}
