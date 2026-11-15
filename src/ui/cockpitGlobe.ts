/** Globo holográfico da cabine: geometria pura, desenhada em SVG (sem canvas nem laço do jogo). */
export type GlobeBody = 'earth' | 'mars';
export interface GlobeTarget { body: GlobeBody; lat: number; lon: number; label: string; coords: string }
export interface GlobeView { lon: number; lat: number }

export const GLOBE_TARGETS = {
    shanghai: { body: 'earth', lat: 31.2, lon: 121.5, label: 'SHANGHAI', coords: '31,2° N · 121,5° L' },
    rio: { body: 'earth', lat: -22.9, lon: -43.2, label: 'RIO DE JANEIRO', coords: '22,9° S · 43,2° O' },
    mars: { body: 'mars', lat: 18, lon: -40, label: 'COLÔNIA HUMANA', coords: 'MARTE · DECK DE LANÇAMENTO' }
} as const satisfies Record<string, GlobeTarget>;

/** Contornos grosseiros [lon, lat]; bastam para a leitura dos continentes num holograma de pontos. */
const LAND: readonly (readonly (readonly [number, number])[])[] = [
    [[-168, 66], [-156, 71], [-120, 70], [-95, 72], [-82, 73], [-78, 62], [-65, 60], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 26], [-83, 29], [-90, 30], [-97, 26], [-97, 20], [-90, 21], [-87, 16], [-83, 10], [-78, 8], [-82, 8], [-92, 15], [-105, 20], [-110, 24], [-117, 33], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-160, 56], [-165, 62]],
    [[-55, 60], [-43, 60], [-22, 70], [-20, 80], [-45, 83], [-68, 79], [-58, 70]],
    [[-78, 8], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-36, -6], [-35, -10], [-39, -18], [-42, -23], [-48, -27], [-54, -34], [-58, -38], [-65, -43], [-68, -52], [-72, -53], [-75, -48], [-72, -38], [-70, -20], [-76, -14], [-81, -5], [-80, 1]],
    [[-17, 15], [-16, 22], [-10, 29], [-6, 35], [10, 37], [11, 33], [20, 32], [25, 31], [32, 31], [35, 24], [38, 18], [43, 12], [51, 12], [48, 5], [40, -3], [40, -15], [35, -23], [32, -28], [27, -34], [19, -35], [15, -28], [12, -17], [13, -8], [9, 0], [9, 4], [-4, 5], [-8, 4], [-13, 8]],
    [[-9, 37], [-9, 43], [-1, 44], [-4, 48], [2, 51], [8, 54], [9, 57], [5, 59], [6, 62], [14, 68], [25, 71], [40, 67], [60, 69], [60, 55], [50, 46], [40, 47], [38, 41], [28, 41], [26, 36], [22, 37], [19, 40], [15, 38], [16, 41], [12, 44], [8, 44], [3, 43], [0, 39], [-5, 36]],
    [[60, 55], [60, 69], [70, 73], [100, 77], [112, 74], [140, 73], [170, 70], [180, 66], [178, 62], [163, 60], [156, 51], [143, 54], [135, 44], [128, 40], [126, 35], [122, 39], [118, 38], [121, 31], [119, 25], [110, 21], [106, 17], [109, 12], [105, 9], [100, 13], [99, 8], [103, 2], [98, 8], [94, 16], [90, 22], [86, 21], [80, 15], [77, 8], [73, 17], [70, 21], [66, 25], [57, 25], [56, 27], [50, 30], [48, 30], [51, 25], [56, 24], [59, 22], [55, 17], [45, 13], [43, 13], [39, 21], [35, 28], [36, 36], [28, 37], [28, 41], [38, 41], [40, 47], [50, 46]],
    [[114, -22], [122, -18], [130, -12], [136, -12], [137, -16], [142, -11], [146, -19], [153, -27], [150, -37], [144, -38], [138, -35], [131, -32], [124, -33], [115, -34]],
    [[130, 32], [136, 34], [141, 36], [142, 43], [145, 44], [141, 45], [139, 38], [133, 35]],
    [[-5, 50], [1, 51], [0, 54], [-3, 58], [-6, 57], [-3, 54]],
    [[44, -16], [50, -15], [47, -25], [44, -23]],
    [[95, 5], [104, -2], [106, -6], [101, -3]],
    [[109, 1], [117, 7], [118, 1], [115, -4], [110, -2]],
    [[131, -1], [141, -3], [150, -10], [141, -9], [135, -4]]
];
const RAD = Math.PI / 180;

export function isLand(lon: number, lat: number) {
    for (const shape of LAND) {
        let inside = false;
        for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
            const [xi, yi] = shape[i], [xj, yj] = shape[j];
            if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) return true;
    }
    return false;
}

/** Pontos como [lon, sen(lat), cos(lat)], gerados uma vez ao carregar o módulo. */
function dots(keep: (lon: number, lat: number, index: number) => boolean) {
    const out: number[] = [];
    let index = 0;
    for (let lat = -76; lat <= 80; lat += 4) {
        const step = 4 / Math.max(.2, Math.cos(lat * RAD));
        for (let lon = -180 + step / 2; lon < 180; lon += step)
            if (keep(lon, lat, index++)) out.push(lon * RAD, Math.sin(lat * RAD), Math.cos(lat * RAD));
    }
    return new Float32Array(out);
}
export const EARTH_DOTS = dots(isLand);
/** Marte não tem continentes: um salpicado fixo sugere o relevo sem inventar um mapa. */
export const MARS_DOTS = dots((_lon, _lat, index) => (index * 2654435761 >>> 0) % 100 < 22);

/** Projeção ortográfica centrada em `view`; `visible` indica o hemisfério de frente. */
export function globePoint(lon: number, lat: number, view: GlobeView, radius: number) {
    const d = (lon - view.lon) * RAD, s = Math.sin(lat * RAD), c = Math.cos(lat * RAD);
    const s0 = Math.sin(view.lat * RAD), c0 = Math.cos(view.lat * RAD);
    return { x: radius * c * Math.sin(d), y: -radius * (c0 * s - s0 * c * Math.cos(d)), visible: s0 * s + c0 * c * Math.cos(d) > 0 };
}

const fixed = (value: number) => value.toFixed(1);

/** Um único caminho SVG com todos os pontos visíveis (traço de ponta redonda). */
export function globeDotsPath(points: Float32Array, view: GlobeView, radius: number) {
    const lon0 = view.lon * RAD, s0 = Math.sin(view.lat * RAD), c0 = Math.cos(view.lat * RAD);
    let path = '';
    for (let i = 0; i < points.length; i += 3) {
        const d = points[i] - lon0, s = points[i + 1], c = points[i + 2], cd = Math.cos(d);
        if (s0 * s + c0 * c * cd <= .04) continue;
        path += `M${fixed(radius * c * Math.sin(d))} ${fixed(-radius * (c0 * s - s0 * c * cd))}h.01`;
    }
    return path;
}

/** Meridianos e paralelos a cada 30°, só no hemisfério visível. */
export function globeGridPath(view: GlobeView, radius: number) {
    let path = '';
    const line = (at: (t: number) => readonly [number, number], from: number, to: number) => {
        let drawing = false;
        for (let t = from; t <= to; t += 6) {
            const [lon, lat] = at(t), p = globePoint(lon, lat, view, radius);
            if (!p.visible) { drawing = false; continue; }
            path += `${drawing ? 'L' : 'M'}${fixed(p.x)} ${fixed(p.y)}`;
            drawing = true;
        }
    };
    for (let lon = -180; lon < 180; lon += 30) line(t => [lon, t], -90, 90);
    for (let lat = -60; lat <= 60; lat += 30) line(t => [t, lat], -180, 180);
    return path;
}

/** Centro da vista para um alvo: a cidade fica de frente, com o globo pouco inclinado. */
export function globeViewFor(target: GlobeTarget): GlobeView { return { lon: target.lon, lat: target.lat * .6 }; }

/** Interpola pelo caminho mais curto em longitude. */
export function globeTween(from: GlobeView, to: GlobeView, t: number): GlobeView {
    const k = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const turn = ((to.lon - from.lon + 540) % 360) - 180;
    return { lon: from.lon + turn * k, lat: from.lat + (to.lat - from.lat) * k };
}
