import data from '../../assets/rio-fase01/layout.json';

export interface RioWaterConfig {
    /** Linha d'água nominal na planta (m). */
    waterlineX: number;
    /** Início da transição de areia úmida/swash na praia (m). */
    swashMinX: number;
    /** Início da descida suave para o fundo raso (m). */
    slopeStartX: number;
    /** Limite leste da faixa rasa caminhável (m). */
    shallowLimitX: number;
    /** Limite norte da faixa rasa caminhável, ao sul do canal do píer (m). */
    shallowMinZ: number;
    /** Limite sul da faixa rasa caminhável (m). */
    shallowMaxZ: number;
    /** Altura de repouso da superfície visual da água (m). */
    waterSurfaceY: number;
    /** Profundidade na linha d'água nominal X = 36 (m). */
    waterlineDepth: number;
    /** Profundidade máxima na borda da faixa rasa caminhável X = 39.2 (m). */
    maxShallowDepth: number;
    /** Profundidade máxima no mar profundo (m). */
    maxDeepDepth: number;
    /** Distância de transição para a profundidade máxima no mar aberto (m). */
    deepTransitionSpan: number;
    /** Amplitude vertical das ondulações costeiras na superfície visual (m). */
    amplitude: number;
    /** Alcance horizontal do avanço da lâmina rasa (swash) sobre a areia (m). */
    swashAmplitude: number;
    /** Direção predominante de propagação das ondas no plano XZ (rumo à praia -X). */
    direction: { x: number; z: number };
    /** Velocidade angular/temporal do ciclo principal de ondas (rad/s). */
    speed: number;
    /** Escala espacial das ondas costeiras (rad/m). */
    scale: number;
    /** Intensidade global de espuma, reflexo e modulação costeira (0..1.5). */
    intensity: number;
    /** Taxa de secagem (decaimento exponencial) da areia molhada após o recuo (1/s). */
    wetDecayRate: number;
    /** Profundidade mínima nos pés para ativar respingos e ondulações de contato (m). */
    contactMinDepth: number;
}

const shallow = data.shallowWater ?? {
    minX: 36,
    maxX: 39.2,
    minZ: -45.2,
    maxZ: 54,
    swashMinX: 34,
    maxDepth: 0.3,
};

export const RIO_WATER_CONFIG: RioWaterConfig = {
    waterlineX: shallow.minX,
    swashMinX: shallow.swashMinX,
    slopeStartX: 34.0,
    shallowLimitX: shallow.maxX,
    shallowMinZ: shallow.minZ,
    shallowMaxZ: shallow.maxZ,
    waterSurfaceY: 0.0,
    waterlineDepth: 0.045,
    maxShallowDepth: shallow.maxDepth,
    maxDeepDepth: 1.25,
    deepTransitionSpan: 9.0,
    amplitude: 0.024,
    swashAmplitude: 0.95,
    direction: { x: -0.992, z: 0.126 },
    speed: 1.35,
    scale: 0.72,
    intensity: 1.0,
    wetDecayRate: 0.32,
    contactMinDepth: 0.025,
};

function clamp01(v: number) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number) {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
}

/** Verifica se o ponto (x, z) está sobre o tablado/rampa caminhável do píer quebrado (Y = 0). */
export function isOnRioPierDeck(x: number, z: number) {
    return x >= 28 && x <= 46 && z >= -53 && z <= -47;
}

/** Verifica se o ponto (x, z) está dentro da faixa rasa caminhável do mar. */
export function isRioShallowWalkable(x: number, z: number, config: RioWaterConfig = RIO_WATER_CONFIG) {
    return x >= config.waterlineX && x <= config.shallowLimitX && z >= config.shallowMinZ && z <= config.shallowMaxZ;
}

/**
 * Contorno orgânico da linha costeira ao longo de Z (em metros).
 * Combina três comprimentos de onda na escala de metros para evitar uma linha reta rígida.
 */
export function rioCoastlineOffset(z: number, config: RioWaterConfig = RIO_WATER_CONFIG) {
    const k = config.intensity;
    return k * (
        0.34 * Math.sin(z * 0.11 + 0.4)
        + 0.19 * Math.cos(z * 0.23 - 1.1)
        + 0.09 * Math.sin(z * 0.47 + 2.0)
    );
}

/**
 * Altura física do fundo (areia seca -> areia molhada -> fundo submerso raso -> fundo profundo).
 * Não depende do tempo das ondas: garante apoio físico contínuo e estável para o personagem e inimigos.
 */
export function rioSeabedHeight(x: number, z: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    if (isOnRioPierDeck(x, z)) return 0;
    if (x <= config.slopeStartX) return 0;

    // Transição suave na rampa de swash (X = 34.0 .. 36.0): 0.00 m -> -0.045 m
    if (x <= config.waterlineX) {
        const t = smoothstep(config.slopeStartX, config.waterlineX, x);
        return -config.waterlineDepth * t;
    }

    // No canal ao sul e ao redor dos pilares do píer (Z < -45.2), o fundo aprofunda mais cedo
    // para reforçar visualmente o bloqueio lateral ao píer e à ponta caída.
    const pierChannelFactor = smoothstep(config.shallowMinZ + 0.8, config.shallowMinZ - 1.4, z);
    const effectiveShallowLimit = config.shallowLimitX - pierChannelFactor * 2.6;

    if (x <= effectiveShallowLimit) {
        const span = Math.max(0.4, effectiveShallowLimit - config.waterlineX);
        const u = clamp01((x - config.waterlineX) / span);
        // Curva C1 suave entre a linha d'água (-0.045 m) e o limite raso (-0.30 m)
        const ease = u * (0.65 + 0.35 * u);
        return -(config.waterlineDepth + (config.maxShallowDepth - config.waterlineDepth) * ease);
    }

    // Fora da faixa caminhável (X > 39.2 ou canal do píer), o fundo desce até -1.25 m
    const deepT = smoothstep(effectiveShallowLimit, effectiveShallowLimit + config.deepTransitionSpan, x);
    return -(config.maxShallowDepth + (config.maxDeepDepth - config.maxShallowDepth) * deepT);
}

/** Altura de repouso da superfície visual da água (independente do fundo físico). */
export function rioWaterSurfaceHeight(_x: number, _z: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    return config.waterSurfaceY;
}

/** Profundidade líquida resultante acima do fundo submerso (0 em terra firme ou sobre o píer). */
export function rioWaterDepth(x: number, z: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    if (isOnRioPierDeck(x, z)) return 0;
    const seabed = rioSeabedHeight(x, z, config);
    return Math.max(0, config.waterSurfaceY - seabed);
}

/** Fase local da onda costeira ao longo de Z, evitando chegada simultânea em toda a praia. */
export function rioWavePhaseAtZ(z: number, time: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    const along = z * config.direction.z * config.scale;
    const lobe = 0.55 * Math.sin(z * 0.14 - 0.7) + 0.25 * Math.cos(z * 0.31 + 1.2);
    return time * config.speed + along + lobe;
}

/**
 * Posição instantânea X da borda frontal da lâmina de arrebentação (swash) sobre a areia.
 * Usa perfil assimétrico: avanço rápido em direção à praia (-X) e recuo mais gradual (+X).
 */
export function rioWaveSwashFrontX(z: number, time: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    const phase = rioWavePhaseAtZ(z, time, config);
    const primary = Math.sin(phase);
    const AsymmetricSwash = primary + 0.28 * Math.sin(2 * phase - 0.65);
    const coast = rioCoastlineOffset(z, config);
    const baseFront = config.waterlineX - 0.35 + coast;
    return baseFront - config.swashAmplitude * config.intensity * AsymmetricSwash;
}

/**
 * Memória de umidade da areia (0 = areia seca, 1 = areia saturada).
 * Quando a onda avança (-X), a areia molha imediatamente; quando recua (+X),
 * a areia permanece escura e recupera o aspecto seco gradualmente.
 */
export function rioSandWetness(x: number, z: number, time: number, config: RioWaterConfig = RIO_WATER_CONFIG): number {
    if (isOnRioPierDeck(x, z)) return 0;
    const coast = rioCoastlineOffset(z, config);
    if (x <= config.swashMinX - 1.4 + coast) return 0;

    const currentFront = rioWaveSwashFrontX(z, time, config);
    // Debaixo da lâmina d'água atual a areia está sempre 100% saturada
    if (x >= currentFront) return 1;

    // Amostra o histórico recente do ciclo para capturar o alcance máximo recente do swash com decaimento lento
    const period = (Math.PI * 2) / Math.max(0.2, config.speed);
    let retained = 0;
    const samples = 8;
    for (let i = 1; i <= samples; i++) {
        const dtBack = (i / samples) * period * 0.85;
        const pastFront = rioWaveSwashFrontX(z, time - dtBack, config);
        const coverage = smoothstep(pastFront - 0.45, pastFront + 0.12, x);
        const decay = Math.exp(-config.wetDecayRate * dtBack);
        retained = Math.max(retained, coverage * decay);
    }

    // Umidade basal da zona frequentemente alcançada pelas ondas + faixa úmida externa
    const minReachX = config.waterlineX - 0.35 + coast - config.swashAmplitude * config.intensity * 1.22;
    const frequentBand = smoothstep(minReachX - 0.9, config.waterlineX + 0.1 + coast, x) * 0.72;
    const currentEdge = smoothstep(currentFront - 0.55, currentFront, x);
    return clamp01(Math.max(currentEdge, retained, frequentBand));
}
