/**
 * S2.9 — núcleo da instrumentação de desenvolvimento (`?perf`).
 * Funções puras e controladores com dependências injetadas: nada aqui acessa
 * DOM, WebGL ou stores diretamente, então tudo é testável em Node.
 * Valores ausentes são `null` e aparecem como "indisponível", nunca como zero.
 */

export const PERF_REPORT_VERSION = 2;
export const RAF_LONG_INTERVAL_MS = 50;
export const RAF_SLOW_INTERVAL_MS = 1000 / 30;
export const UNAVAILABLE = 'indisponível';
export const DEFAULT_SAMPLE_MS = 10_000;
export const MAX_SAMPLE_MS = 60_000;
export const COUNTER_SAMPLE_EVERY_MS = 100;
/** Capacidade de intervalos por amostra: cobre a duração pedida até 500 Hz. */
export const MAX_SUPPORTED_RAF_HZ = 500;
export const LIVE_WINDOW = 240;
export const MAX_SCENE_EVENTS = 40;
export const MAX_SAMPLES = 10;

export const PERF_LIMITATIONS = [
  'Intervalos medidos entre callbacks de requestAnimationFrame: incluem CPU, espera de vsync e agendamento do navegador. Não são tempo de GPU.',
  'A cadência mínima é limitada pela taxa de atualização da tela; 8,3 ms em 120 Hz não indica folga de GPU.',
  'Intervalos de rAF acima de 33,3 ms e de 50 ms são contagens próprias, distintas dos eventos da API Long Animation Frames.',
  'Draw calls e triângulos vêm de renderer.info e refletem o render imediatamente anterior à leitura. Na three 0.165 o reset automático ocorre depois do shadow map, então os passes de sombra não entram nessas contagens.',
  'Geometrias e texturas são contagens de objetos vivos no renderer, não memória em bytes.',
  'Memória de heap JS vem de performance.memory, API não padronizada e quantizada (Chromium); ausente nos demais navegadores.',
  'Medições no servidor de desenvolvimento não são benchmark; prefira o build de produção (npm run preview).',
  'Aba oculta durante uma amostra a invalida; pausa do jogo durante a amostra é registrada como aviso.',
  '"map-data-ready" indica dados do mapa disponíveis (store da expedição), não cena renderizada. A cena renderizada é "scene-first-draw" e, com os personagens GLB, "scene-assets-ready".',
  'Na entrada inicial, "map-data-ready" é inferido na montagem do canvas (marcado como inferido); os tempos da entrada inicial contam a partir do início da navegação.'
] as const;

// ---------------------------------------------------------------------------
// Estatística e formatação

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

/** Anexa mantendo apenas os últimos `limit` itens (armazenamento limitado). */
export function pushBounded<T>(list: T[], item: T, limit: number): void {
  list.push(item);
  if (list.length > limit) list.splice(0, list.length - limit);
}

// ---------------------------------------------------------------------------
// Carregamento da página (documento e recursos), separado da prontidão da cena

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
  startTime?: number;
  duration: number;
  responseEnd?: number;
  transferSize?: number;
  encodedBodySize?: number;
}

export interface ResourceSummary {
  count: number;
  /** Bytes pela rede; `null` quando o navegador não informa. 0 real indica cache. */
  transferBytes: number | null;
  encodedBytes: number | null;
  models: Array<{ file: string; startMs: number | null; responseEndMs: number | null; durationMs: number; transferBytes: number | null; encodedBytes: number | null }>;
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
        startMs: positiveOrNull(entry.startTime),
        responseEndMs: positiveOrNull(entry.responseEnd),
        durationMs: entry.duration,
        transferBytes: typeof entry.transferSize === 'number' ? entry.transferSize : null,
        encodedBytes: typeof entry.encodedBodySize === 'number' ? entry.encodedBodySize : null
      });
    }
  }
  return { count: entries.length, transferBytes: transfer, encodedBytes: encoded, models };
}

// ---------------------------------------------------------------------------
// Contadores do renderer

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

// ---------------------------------------------------------------------------
// Amostras

/** Eventos da API Long Animation Frames — fonte separada dos intervalos de rAF. */
export interface LongAnimationFrameSummary {
  supported: boolean;
  count: number | null;
  maxDurationMs: number | null;
}

export interface SampleCoverage {
  intervalsCollected: number;
  intervalsCapacity: number;
  intervalsSaturated: boolean;
  countersCollected: number;
  countersCapacity: number;
  countersSaturated: boolean;
}

export interface SampleResult {
  status: 'valid' | 'invalid';
  invalidReason: string | null;
  warnings: string[];
  startedAtMs: number;
  requestedMs: number;
  elapsedMs: number;
  map: string | null;
  coverage: SampleCoverage;
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
  coverage: SampleCoverage;
  hiddenDuringSample: boolean;
  pausedDuringSample: boolean;
  interruptedReason?: string | null;
  loafSupported: boolean;
  loafCount: number;
  loafMaxMs: number | null;
  counters: RendererCounters[];
}

export function sampleCapacities(requestedMs: number) {
  return {
    intervals: Math.ceil((requestedMs / 1000) * MAX_SUPPORTED_RAF_HZ) + 16,
    counters: Math.ceil(requestedMs / COUNTER_SAMPLE_EVERY_MS) + 16
  };
}

export function buildSampleResult(input: SampleInput): SampleResult {
  const warnings: string[] = [];
  if (input.pausedDuringSample) warnings.push('O jogo esteve pausado durante a amostra (perda de foco ou pausa manual).');
  const saturated = input.coverage.intervalsSaturated || input.coverage.countersSaturated;
  const invalidReason = input.hiddenDuringSample
    ? 'A aba ficou oculta durante a amostra; o navegador reduz ou suspende requestAnimationFrame.'
    : input.interruptedReason
      ? input.interruptedReason
      : saturated
        ? 'Capacidade da amostra saturada; parte da janela pedida não foi registrada.'
        : null;
  const valid = invalidReason === null;
  return {
    status: valid ? 'valid' : 'invalid',
    invalidReason,
    warnings,
    startedAtMs: input.startedAtMs,
    requestedMs: input.requestedMs,
    elapsedMs: input.elapsedMs,
    map: input.map,
    coverage: { ...input.coverage },
    rafIntervals: valid ? summarizeIntervals(input.intervals) : null,
    // Suporte é propriedade do navegador; numa amostra inválida as contagens ficam ausentes.
    longAnimationFrames: valid && input.loafSupported
      ? { supported: true, count: input.loafCount, maxDurationMs: input.loafMaxMs }
      : { supported: input.loafSupported, count: null, maxDurationMs: null },
    renderer: valid ? summarizeCounters(input.counters) : null
  };
}

// ---------------------------------------------------------------------------
// Memória e contexto

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
  interpolation?: ReturnType<typeof import('../../physics/interpolationTelemetry').interpolationSnapshot>;
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

// ---------------------------------------------------------------------------
// Prontidão do mapa e da cena

/**
 * - `map-loading`: store da expedição deixou de estar pronta (viagem iniciada);
 * - `map-data-ready`: dados do mapa disponíveis na store (não é cena renderizada);
 * - `canvas-mounted` / `canvas-first-frame`: primeiro frame do canvas, que pode estar vazio;
 * - `scene-first-draw`: primeiro render com draw calls (geometria do mapa);
 * - `scene-assets-ready`: primeiro render com todos os personagens GLB esperados no lugar
 *   dos substitutos. É o sinal que o futuro corte da animação de viagem deve aguardar.
 */
export type SceneEventKind =
  | 'map-loading' | 'map-data-ready' | 'canvas-mounted' | 'canvas-first-frame' | 'scene-first-draw' | 'scene-assets-ready';

export interface SceneEvent {
  kind: SceneEventKind;
  map: string | null;
  /** `performance.now()`: ms desde o início da navegação. */
  atMs: number;
  /** ms desde o último `map-loading` do mesmo mapa; `null` na entrada inicial. */
  sinceMapLoadingMs: number | null;
  /** Verdadeiro quando o evento não foi observado e sim deduzido. */
  inferred: boolean;
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

interface ActiveSample {
  startedAtMs: number;
  requestedMs: number;
  map: string | null;
  intervals: Float64Array;
  intervalCount: number;
  intervalsSaturated: boolean;
  counters: RendererCounters[];
  countersCapacity: number;
  countersSaturated: boolean;
  lastCounterAtMs: number;
  /** Primeiro frame da amostra; `null` até ele ocorrer. Referência própria, independente do laço ao vivo. */
  lastFrameAtMs: number | null;
  loafCount: number;
  loafMaxMs: number | null;
  hidden: boolean;
  paused: boolean;
  finish: (interruptedReason?: string) => void;
}

/** Estado compartilhado entre sonda e painel, mantido entre remontagens do canvas. */
export interface PerfShared {
  sceneEvents: SceneEvent[];
  samples: SampleResult[];
  lastMapLoading: { map: string | null; atMs: number } | null;
  active: ActiveSample | null;
  latest: RendererCounters | null;
}

export function createPerfShared(): PerfShared {
  return { sceneEvents: [], samples: [], lastMapLoading: null, active: null, latest: null };
}

function recordScene(shared: PerfShared, kind: SceneEventKind, map: string | null, atMs: number, inferred = false) {
  const loading = shared.lastMapLoading;
  const since = loading && loading.map === map && atMs >= loading.atMs ? atMs - loading.atMs : null;
  pushBounded(shared.sceneEvents, { kind, map, atMs, sinceMapLoadingMs: since, inferred }, MAX_SCENE_EVENTS);
}

/** Transições da store da expedição (`ready`). */
export function onExpeditionReadyChange(shared: PerfShared, prevReady: boolean, ready: boolean, loadingMap: string | null, currentMap: string | null, now: number) {
  if (prevReady && !ready) {
    shared.lastMapLoading = { map: loadingMap, atMs: now };
    recordScene(shared, 'map-loading', loadingMap, now);
  } else if (!prevReady && ready) {
    recordScene(shared, 'map-data-ready', currentMap, now);
  }
}

/** Uma instância por montagem do canvas. `onFrame` recebe as contagens do render anterior. */
export function createSceneTracker(shared: PerfShared, map: string, now: number, dataReadyAtMount: boolean) {
  recordScene(shared, 'canvas-mounted', map, now);
  // Entrada inicial: a store ficou pronta antes de a sonda existir. Deduz na montagem.
  const lastDataReady = [...shared.sceneEvents].reverse().find(e => e.kind === 'map-data-ready' || e.kind === 'map-loading');
  if (dataReadyAtMount && !(lastDataReady && lastDataReady.kind === 'map-data-ready' && lastDataReady.map === map)) {
    recordScene(shared, 'map-data-ready', map, now, true);
  }
  let firstFrame = false, firstDraw = false, assetsReady = false, assetsSeenAt: number | null = null;
  return {
    get done() { return firstFrame && firstDraw && assetsReady; },
    onFrame(frameNow: number, previousDrawCalls: number, expectedAssetsPresent: boolean) {
      if (!firstFrame) { firstFrame = true; recordScene(shared, 'canvas-first-frame', map, frameNow); }
      if (!firstDraw && previousDrawCalls > 0) { firstDraw = true; recordScene(shared, 'scene-first-draw', map, frameNow); }
      // Os personagens precisam aparecer num frame e ser renderizados antes do registro.
      if (!assetsReady) {
        if (assetsSeenAt === null && expectedAssetsPresent) assetsSeenAt = frameNow;
        else if (assetsSeenAt !== null && previousDrawCalls > 0) { assetsReady = true; recordScene(shared, 'scene-assets-ready', map, frameNow); }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Sessão do painel: laço de rAF, amostras e ciclo de vida

export interface PerfSessionDeps {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(id: number): void;
  isHidden(): boolean;
  onVisibilityChange(listener: () => void): () => void;
  /** `null` quando a API Long Animation Frames não existe. */
  observeLongFrames(listener: (entries: Array<{ startTime: number; duration: number }>) => void): (() => void) | null;
  isPaused(): boolean;
  onPausedChange(listener: (paused: boolean) => void): () => void;
  onReadyChange(listener: (prevReady: boolean, ready: boolean, loadingMap: string | null, currentMap: string | null) => void): () => void;
  /** Instala a API global; `clearGlobalApi` só remove se ainda for a mesma instância. */
  setGlobalApi(api: PerfSessionApi): void;
  clearGlobalApi(api: PerfSessionApi): void;
}

export interface PerfSessionApi {
  sample(ms?: number): Promise<SampleResult>;
}

export interface PerfSession extends PerfSessionApi {
  readonly loafSupported: boolean;
  isSampling(): boolean;
  liveIntervals(): Float64Array;
  dispose(reason?: string): void;
}

/** Chamado pela sonda a cada frame: guarda a última leitura e alimenta a amostra ativa. */
export function offerCounters(shared: PerfShared, counters: RendererCounters): void {
  shared.latest = counters;
  const active = shared.active;
  if (!active || counters.sampledAtMs - active.lastCounterAtMs < COUNTER_SAMPLE_EVERY_MS) return;
  active.lastCounterAtMs = counters.sampledAtMs;
  if (active.counters.length < active.countersCapacity) active.counters.push(counters);
  else active.countersSaturated = true;
}

export function createPerfSession(shared: PerfShared, deps: PerfSessionDeps, map: string): PerfSession {
  const live = new Float64Array(LIVE_WINDOW);
  let liveCount = 0, liveIndex = 0, previous = deps.now(), frame = 0, disposed = false;

  const tick = (time: number) => {
    if (disposed) return;
    const interval = time - previous;
    previous = time;
    live[liveIndex] = interval;
    liveIndex = (liveIndex + 1) % LIVE_WINDOW;
    liveCount = Math.min(liveCount + 1, LIVE_WINDOW);
    const active = shared.active;
    if (active) {
      // Só intervalos completos entre dois frames da própria amostra. O intervalo que atravessa
      // o início (desde o frame anterior ao clique) é descartado: pode conter espera anterior.
      if (active.lastFrameAtMs !== null) {
        const sampleInterval = time - active.lastFrameAtMs;
        if (active.intervalCount < active.intervals.length) active.intervals[active.intervalCount++] = sampleInterval;
        else active.intervalsSaturated = true;
      }
      active.lastFrameAtMs = time;
      if (time - active.startedAtMs >= active.requestedMs) active.finish();
    }
    if (!disposed) frame = deps.requestFrame(tick);
  };
  frame = deps.requestFrame(tick);

  const stopLongFrames = deps.observeLongFrames(entries => {
    const active = shared.active;
    if (!active) return;
    for (const entry of entries) {
      if (entry.startTime < active.startedAtMs) continue;
      active.loafCount++;
      active.loafMaxMs = Math.max(active.loafMaxMs ?? 0, entry.duration);
    }
  });
  const loafSupported = stopLongFrames !== null;

  const stopVisibility = deps.onVisibilityChange(() => {
    if (deps.isHidden() && shared.active) { shared.active.hidden = true; shared.active.finish(); }
  });
  const stopPaused = deps.onPausedChange(paused => { if (paused && shared.active) shared.active.paused = true; });
  const stopReady = deps.onReadyChange((prevReady, ready, loadingMap, currentMap) =>
    onExpeditionReadyChange(shared, prevReady, ready, loadingMap, currentMap, deps.now()));

  const sample = (ms = DEFAULT_SAMPLE_MS) => new Promise<SampleResult>(resolve => {
    if (disposed) {
      resolve(buildSampleResult({
        startedAtMs: deps.now(), requestedMs: 0, elapsedMs: 0, map, intervals: [], hiddenDuringSample: false, pausedDuringSample: false,
        interruptedReason: 'Sessão de medição encerrada.', loafSupported, loafCount: 0, loafMaxMs: null, counters: [],
        coverage: { intervalsCollected: 0, intervalsCapacity: 0, intervalsSaturated: false, countersCollected: 0, countersCapacity: 0, countersSaturated: false }
      }));
      return;
    }
    shared.active?.finish('Substituída por uma nova amostra.');
    const requestedMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, MAX_SAMPLE_MS) : DEFAULT_SAMPLE_MS;
    const capacity = sampleCapacities(requestedMs);
    const startedAtMs = deps.now();
    const active: ActiveSample = {
      startedAtMs, requestedMs, map,
      intervals: new Float64Array(capacity.intervals), intervalCount: 0, intervalsSaturated: false,
      counters: [], countersCapacity: capacity.counters, countersSaturated: false, lastCounterAtMs: -Infinity, lastFrameAtMs: null,
      loafCount: 0, loafMaxMs: null,
      hidden: deps.isHidden(), paused: deps.isPaused(),
      finish: (interruptedReason?: string) => {
        if (shared.active !== active) return;
        shared.active = null;
        const result = buildSampleResult({
          startedAtMs, requestedMs, elapsedMs: deps.now() - startedAtMs, map,
          intervals: active.intervals.subarray(0, active.intervalCount),
          coverage: {
            intervalsCollected: active.intervalCount, intervalsCapacity: active.intervals.length, intervalsSaturated: active.intervalsSaturated,
            countersCollected: active.counters.length, countersCapacity: active.countersCapacity, countersSaturated: active.countersSaturated
          },
          hiddenDuringSample: active.hidden, pausedDuringSample: active.paused,
          interruptedReason: interruptedReason ?? null,
          loafSupported, loafCount: active.loafCount, loafMaxMs: active.loafMaxMs, counters: active.counters
        });
        pushBounded(shared.samples, result, MAX_SAMPLES);
        resolve(result);
      }
    };
    shared.active = active;
    if (active.hidden) active.finish();
  });

  const session: PerfSession = {
    loafSupported,
    sample,
    isSampling: () => shared.active !== null,
    liveIntervals: () => live.slice(0, liveCount),
    dispose(reason = 'Interrompida: o canvas foi desmontado (troca de mapa ou saída).') {
      if (disposed) return;
      disposed = true;
      deps.cancelFrame(frame);
      stopLongFrames?.();
      stopVisibility();
      stopPaused();
      stopReady();
      shared.active?.finish(reason);
      deps.clearGlobalApi(api);
    }
  };
  const api: PerfSessionApi = { sample };
  deps.setGlobalApi(api);
  return session;
}
