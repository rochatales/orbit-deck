/**
 * S2.9 — funções puras da instrumentação de desenvolvimento (`?perf`).
 * Sem efeitos colaterais e sem acesso a DOM/WebGL: testáveis em Node.
 * Valores ausentes são `null` e aparecem como "indisponível", nunca como zero.
 */

export const PERF_REPORT_VERSION = 1;
export const RAF_LONG_INTERVAL_MS = 50;
export const RAF_SLOW_INTERVAL_MS = 1000 / 30;
export const UNAVAILABLE = 'indisponível';

export const PERF_LIMITATIONS = [
  'Intervalos medidos entre callbacks de requestAnimationFrame: incluem CPU, espera de vsync e agendamento do navegador. Não são tempo de GPU.',
  'A cadência mínima é limitada pela taxa de atualização da tela; 8,3 ms em 120 Hz não indica folga de GPU.',
  'Intervalos de rAF acima de 33,3 ms e de 50 ms são contagens próprias, distintas dos eventos da API Long Animation Frames.',
  'Draw calls e triângulos vêm de renderer.info e refletem o render imediatamente anterior à leitura, incluindo passes de sombra.',
  'Geometrias e texturas são contagens de objetos vivos no renderer, não memória em bytes.',
  'Memória de heap JS vem de performance.memory, API não padronizada e quantizada (Chromium); ausente nos demais navegadores.',
  'Medições no servidor de desenvolvimento não são benchmark; prefira o build de produção (npm run preview).',
  'Aba oculta durante uma amostra a invalida; pausa do jogo durante a amostra é registrada como aviso.'
] as const;

export interface IntervalSummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
  /** Intervalos de rAF acima de 33,3 ms. */
  rafOver33: number;
  /** Intervalos de rAF acima de 50 ms. */
  rafOver50: number;
}

/** Percentil por posição mais próxima sobre uma lista já ordenada. */
export function percentile(sorted: ArrayLike<number>, p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((Math.min(Math.max(p, 0), 100) / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank - 1, 0), sorted.length - 1)];
}

export function summarizeIntervals(intervals: ArrayLike<number>): IntervalSummary | null {
  const values: number[] = [];
  for (let i = 0; i < intervals.length; i++) {
    const value = intervals[i];
    if (Number.isFinite(value) && value >= 0) values.push(value);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  let sum = 0, over33 = 0, over50 = 0;
  for (const value of values) {
    sum += value;
    if (value > RAF_SLOW_INTERVAL_MS) over33++;
    if (value > RAF_LONG_INTERVAL_MS) over50++;
  }
  return {
    count: values.length,
    p50: percentile(values, 50) as number,
    p95: percentile(values, 95) as number,
    max: values[values.length - 1],
    mean: sum / values.length,
    rafOver33: over33,
    rafOver50: over50
  };
}

/** `?perf` liga a instrumentação; sem o parâmetro ela não é carregada. */
export function isPerfEnabled(search: string): boolean {
  return new URLSearchParams(search).has('perf');
}

export function formatValue(value: number | null | undefined, unit = '', digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNAVAILABLE;
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`;
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return UNAVAILABLE;
  return `${(value / 1e6).toFixed(2)} MB`;
}

/** Timings de navegação usam 0 para "ainda não ocorreu": tratar como ausente. */
function positiveOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export interface NavigationLike {
  responseEnd?: number;
  domContentLoadedEventEnd?: number;
  loadEventEnd?: number;
  transferSize?: number;
}

/** Carregamento da página (documento e recursos iniciais), separado da prontidão da cena. */
export interface PageLoadSummary {
  responseEndMs: number | null;
  domContentLoadedMs: number | null;
  loadEventEndMs: number | null;
  documentTransferBytes: number | null;
}

export function summarizeNavigation(entry: NavigationLike | undefined): PageLoadSummary {
  return {
    responseEndMs: positiveOrNull(entry?.responseEnd),
    domContentLoadedMs: positiveOrNull(entry?.domContentLoadedEventEnd),
    loadEventEndMs: positiveOrNull(entry?.loadEventEnd),
    documentTransferBytes: positiveOrNull(entry?.transferSize)
  };
}

export interface ResourceLike {
  name: string;
  duration: number;
  transferSize?: number;
  encodedBodySize?: number;
}

export interface ResourceSummary {
  count: number;
  /** Bytes pela rede; `null` quando o navegador não informa. 0 real indica cache. */
  transferBytes: number | null;
  encodedBytes: number | null;
  models: Array<{ file: string; durationMs: number; transferBytes: number | null; encodedBytes: number | null }>;
}

const MAX_LISTED_MODELS = 20;

export function summarizeResources(entries: ResourceLike[]): ResourceSummary {
  let transfer: number | null = null, encoded: number | null = null;
  const models: ResourceSummary['models'] = [];
  for (const entry of entries) {
    if (typeof entry.transferSize === 'number') transfer = (transfer ?? 0) + entry.transferSize;
    if (typeof entry.encodedBodySize === 'number') encoded = (encoded ?? 0) + entry.encodedBodySize;
    if (/\.(glb|gltf)(\?|$)/i.test(entry.name) && models.length < MAX_LISTED_MODELS) {
      models.push({
        file: entry.name.split('?')[0].split('/').pop() || entry.name,
        durationMs: entry.duration,
        transferBytes: typeof entry.transferSize === 'number' ? entry.transferSize : null,
        encodedBytes: typeof entry.encodedBodySize === 'number' ? entry.encodedBodySize : null
      });
    }
  }
  return { count: entries.length, transferBytes: transfer, encodedBytes: encoded, models };
}

export interface RendererCounters {
  /** `performance.now()` do momento em que renderer.info foi lido. */
  sampledAtMs: number;
  drawCalls: number;
  triangles: number;
  /** Contagem de geometrias vivas, não bytes. */
  geometries: number;
  /** Contagem de texturas vivas, não bytes. */
  textures: number;
  programs: number | null;
}

export interface CounterRange {
  samples: number;
  firstSampledAtMs: number;
  lastSampledAtMs: number;
  drawCalls: { min: number; max: number; mean: number };
  triangles: { min: number; max: number; mean: number };
}

export function summarizeCounters(samples: RendererCounters[]): CounterRange | null {
  if (samples.length === 0) return null;
  const range = (pick: (s: RendererCounters) => number) => {
    let min = Infinity, max = -Infinity, sum = 0;
    for (const sample of samples) { const v = pick(sample); min = Math.min(min, v); max = Math.max(max, v); sum += v; }
    return { min, max, mean: sum / samples.length };
  };
  return {
    samples: samples.length,
    firstSampledAtMs: samples[0].sampledAtMs,
    lastSampledAtMs: samples[samples.length - 1].sampledAtMs,
    drawCalls: range(s => s.drawCalls),
    triangles: range(s => s.triangles)
  };
}

/** Eventos da API Long Animation Frames — fonte separada dos intervalos de rAF. */
export interface LongAnimationFrameSummary {
  supported: boolean;
  count: number | null;
  maxDurationMs: number | null;
}

export function summarizeLongAnimationFrames(supported: boolean, durations: number[]): LongAnimationFrameSummary {
  if (!supported) return { supported: false, count: null, maxDurationMs: null };
  return { supported: true, count: durations.length, maxDurationMs: durations.length ? Math.max(...durations) : null };
}

export interface SampleResult {
  status: 'valid' | 'invalid';
  invalidReason: string | null;
  warnings: string[];
  startedAtMs: number;
  requestedMs: number;
  elapsedMs: number;
  map: string | null;
  rafIntervals: IntervalSummary | null;
  longAnimationFrames: LongAnimationFrameSummary;
  renderer: CounterRange | null;
}

export interface SampleInput {
  startedAtMs: number;
  requestedMs: number;
  elapsedMs: number;
  map: string | null;
  intervals: ArrayLike<number>;
  hiddenDuringSample: boolean;
  pausedDuringSample: boolean;
  interruptedReason?: string | null;
  loafSupported: boolean;
  loafDurations: number[];
  counters: RendererCounters[];
}

export function buildSampleResult(input: SampleInput): SampleResult {
  const warnings: string[] = [];
  if (input.pausedDuringSample) warnings.push('O jogo esteve pausado durante a amostra (perda de foco ou pausa manual).');
  const invalidReason = input.hiddenDuringSample
    ? 'A aba ficou oculta durante a amostra; o navegador reduz ou suspende requestAnimationFrame.'
    : input.interruptedReason ?? null;
  const valid = invalidReason === null;
  return {
    status: valid ? 'valid' : 'invalid',
    invalidReason,
    warnings,
    startedAtMs: input.startedAtMs,
    requestedMs: input.requestedMs,
    elapsedMs: input.elapsedMs,
    map: input.map,
    rafIntervals: valid ? summarizeIntervals(input.intervals) : null,
    // Suporte é propriedade do navegador; numa amostra inválida as contagens ficam ausentes.
    longAnimationFrames: valid
      ? summarizeLongAnimationFrames(input.loafSupported, input.loafDurations)
      : { supported: input.loafSupported, count: null, maxDurationMs: null },
    renderer: valid ? summarizeCounters(input.counters) : null
  };
}

export interface HeapMemory {
  usedBytes: number;
  totalBytes: number;
  limitBytes: number;
}

export function readHeapMemory(memory: Partial<{ usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }> | undefined): HeapMemory | null {
  if (!memory || typeof memory.usedJSHeapSize !== 'number' || typeof memory.totalJSHeapSize !== 'number' || typeof memory.jsHeapSizeLimit !== 'number') return null;
  return { usedBytes: memory.usedJSHeapSize, totalBytes: memory.totalJSHeapSize, limitBytes: memory.jsHeapSizeLimit };
}

export interface Size2D { width: number; height: number }

export interface MeasurementContext {
  capturedAt: string;
  build: 'development' | 'production';
  userAgent: string | null;
  browserBrands: string | null;
  gpuRenderer: string | null;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  screen: Size2D | null;
  viewport: Size2D | null;
  canvasCss: Size2D | null;
  canvasBuffer: Size2D | null;
  devicePixelRatio: number | null;
  rendererPixelRatio: number | null;
}

/**
 * Prontidão da cena, separada do carregamento da página:
 * - `map-loading`/`scene-ready`: store da expedição (duração = espera até o mapa ficar pronto);
 * - `canvas-mounted`/`first-frame`: montagem do Canvas e primeiro frame renderizado dele.
 */
export interface SceneEvent {
  kind: 'map-loading' | 'scene-ready' | 'canvas-mounted' | 'first-frame';
  map: string | null;
  atMs: number;
  durationMs: number | null;
}

export interface PerfReport {
  version: number;
  context: MeasurementContext;
  pageLoad: PageLoadSummary;
  resources: ResourceSummary;
  sceneEvents: SceneEvent[];
  latestCounters: RendererCounters | null;
  heap: HeapMemory | null;
  samples: SampleResult[];
  limitations: readonly string[];
}

export function buildReport(parts: Omit<PerfReport, 'version' | 'limitations'>): PerfReport {
  return { version: PERF_REPORT_VERSION, ...parts, limitations: PERF_LIMITATIONS };
}

/** Anexa mantendo apenas os últimos `limit` itens (armazenamento limitado). */
export function pushBounded<T>(list: T[], item: T, limit: number): void {
  list.push(item);
  if (list.length > limit) list.splice(0, list.length - limit);
}
