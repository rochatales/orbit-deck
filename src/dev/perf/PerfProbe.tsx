/**
 * S2.9 — instrumentação opcional de desenvolvimento. Só é carregada com `?perf`
 * (ver GameCanvas). Mede sem alterar gameplay, câmera, física ou o renderer:
 * - PerfProbe (dentro do Canvas) lê renderer.info e registra o primeiro frame;
 * - PerfPanel (fora do Canvas) coleta intervalos de rAF num laço próprio,
 *   observa Long Animation Frames, mostra o painel e expõe window.__hordaPerf.
 * Todos os coletores, listeners e a API global são removidos ao desmontar.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { WebGLRenderer } from 'three';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import {
  buildReport, buildSampleResult, formatBytes, formatValue, pushBounded, readHeapMemory,
  summarizeIntervals, summarizeNavigation, summarizeResources,
  type MeasurementContext, type PerfReport, type RendererCounters, type SampleResult, type SceneEvent
} from './perfMetrics';

const LIVE_WINDOW = 240;
const MAX_SAMPLE_INTERVALS = 4000;
const MAX_SAMPLE_COUNTERS = 200;
const MAX_LOAF_ENTRIES = 200;
const MAX_SCENE_EVENTS = 30;
const MAX_SAMPLES = 10;
const COUNTER_SAMPLE_EVERY_MS = 100;
const PANEL_REFRESH_MS = 500;
const DEFAULT_SAMPLE_MS = 10_000;

interface ActiveSample {
  startedAtMs: number;
  requestedMs: number;
  map: string | null;
  intervals: number[];
  counters: RendererCounters[];
  loafDurations: number[];
  hidden: boolean;
  paused: boolean;
  lastCounterAtMs: number;
  finish: (interruptedReason?: string) => void;
}

/** Estado limitado, compartilhado entre sonda e painel e mantido entre trocas de mapa. */
const shared = {
  gl: null as WebGLRenderer | null,
  latest: null as RendererCounters | null,
  sceneEvents: [] as SceneEvent[],
  samples: [] as SampleResult[],
  mapLoadingStartedAtMs: null as number | null,
  active: null as ActiveSample | null
};

function recordSceneEvent(event: SceneEvent) {
  pushBounded(shared.sceneEvents, event, MAX_SCENE_EVENTS);
}

function readCounters(gl: WebGLRenderer, now: number): RendererCounters {
  // Somente leitura: autoReset e demais opções do renderer não são tocados.
  const info = gl.info;
  return {
    sampledAtMs: now,
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    programs: Array.isArray(info.programs) ? info.programs.length : null
  };
}

export function PerfProbe({ map }: { map: string }) {
  const gl = useThree(state => state.gl);
  const mountedAtRef = useRef(0);
  const firstFrameRef = useRef(false);

  useEffect(() => {
    mountedAtRef.current = performance.now();
    firstFrameRef.current = false;
    shared.gl = gl;
    recordSceneEvent({ kind: 'canvas-mounted', map, atMs: mountedAtRef.current, durationMs: null });
    return () => {
      if (shared.gl === gl) { shared.gl = null; shared.latest = null; }
    };
  }, [gl, map]);

  // Prioridade padrão: não assume o laço de renderização do R3F.
  useFrame(() => {
    const now = performance.now();
    // renderer.info reflete o render do frame anterior (reset automático no início de cada render).
    const counters = readCounters(gl, now);
    shared.latest = counters;
    if (!firstFrameRef.current) {
      firstFrameRef.current = true;
      recordSceneEvent({ kind: 'first-frame', map, atMs: now, durationMs: now - mountedAtRef.current });
    }
    const active = shared.active;
    if (active && now - active.lastCounterAtMs >= COUNTER_SAMPLE_EVERY_MS && active.counters.length < MAX_SAMPLE_COUNTERS) {
      active.lastCounterAtMs = now;
      active.counters.push(counters);
    }
  });

  return null;
}

function size(width: number | undefined, height: number | undefined) {
  return typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0 ? { width, height } : null;
}

function readGpuRenderer(gl: WebGLRenderer | null): string | null {
  if (!gl) return null;
  try {
    const context = gl.getContext();
    if (context.getSupportedExtensions()?.includes('WEBGL_debug_renderer_info')) {
      const ext = context.getExtension('WEBGL_debug_renderer_info');
      if (ext) return String(context.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    }
    return String(context.getParameter(context.RENDERER));
  } catch {
    return null;
  }
}

function readContext(): MeasurementContext {
  const gl = shared.gl;
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { brands?: Array<{ brand: string; version: string }> } };
  const canvas = gl?.domElement;
  return {
    capturedAt: new Date().toISOString(),
    build: import.meta.env.DEV ? 'development' : 'production',
    userAgent: nav.userAgent || null,
    browserBrands: nav.userAgentData?.brands?.map(b => `${b.brand} ${b.version}`).join(', ') || null,
    gpuRenderer: readGpuRenderer(gl),
    hardwareConcurrency: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    screen: size(window.screen?.width, window.screen?.height),
    viewport: size(window.innerWidth, window.innerHeight),
    canvasCss: size(canvas?.clientWidth, canvas?.clientHeight),
    canvasBuffer: size(canvas?.width, canvas?.height),
    devicePixelRatio: Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null,
    rendererPixelRatio: gl ? gl.getPixelRatio() : null
  };
}

function readHeap() {
  return readHeapMemory((performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory);
}

function buildFullReport(): PerfReport {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return buildReport({
    context: readContext(),
    pageLoad: summarizeNavigation(navigation),
    resources: summarizeResources(resources),
    sceneEvents: shared.sceneEvents.slice(),
    latestCounters: shared.latest ? { ...shared.latest } : null,
    heap: readHeap(),
    samples: shared.samples.slice()
  });
}

interface HordaPerfApi {
  sample: (ms?: number) => Promise<SampleResult>;
  report: () => PerfReport;
}

declare global {
  interface Window { __hordaPerf?: HordaPerfApi }
}

interface LiveView {
  p50: string;
  p95: string;
  over50: number | null;
  drawCalls: string;
  triangles: string;
  geometries: string;
  textures: string;
  counterAge: string;
  heap: string;
  dpr: string;
  sampling: boolean;
  lastSample: SampleResult | null;
}

export function PerfPanel({ map }: { map: string }) {
  const [view, setView] = useState<LiveView | null>(null);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const startSampleRef = useRef<(ms?: number) => Promise<SampleResult>>();

  useEffect(() => {
    const live = new Float64Array(LIVE_WINDOW);
    let liveCount = 0, liveIndex = 0, previous = performance.now(), frame = 0, stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      const interval = now - previous;
      previous = now;
      live[liveIndex] = interval;
      liveIndex = (liveIndex + 1) % LIVE_WINDOW;
      liveCount = Math.min(liveCount + 1, LIVE_WINDOW);
      const active = shared.active;
      if (active) {
        if (active.intervals.length < MAX_SAMPLE_INTERVALS) active.intervals.push(interval);
        if (now - active.startedAtMs >= active.requestedMs) active.finish();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const loafSupported = typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes ?? []).includes('long-animation-frame');
    let observer: PerformanceObserver | null = null;
    if (loafSupported) {
      observer = new PerformanceObserver(list => {
        const active = shared.active;
        if (!active) return;
        for (const entry of list.getEntries()) {
          if (entry.startTime >= active.startedAtMs && active.loafDurations.length < MAX_LOAF_ENTRIES) active.loafDurations.push(entry.duration);
        }
      });
      observer.observe({ type: 'long-animation-frame', buffered: false });
    }

    const onVisibility = () => {
      if (document.hidden && shared.active) { shared.active.hidden = true; shared.active.finish(); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const unsubscribeGame = useGameStore.subscribe(state => {
      if (state.isPaused && shared.active) shared.active.paused = true;
    });
    const unsubscribeExpedition = useExpeditionStore.subscribe((state, prev) => {
      const now = performance.now();
      if (prev.ready && !state.ready) {
        shared.mapLoadingStartedAtMs = now;
        recordSceneEvent({ kind: 'map-loading', map: state.session.destination ?? state.session.map, atMs: now, durationMs: null });
      } else if (!prev.ready && state.ready) {
        const started = shared.mapLoadingStartedAtMs;
        shared.mapLoadingStartedAtMs = null;
        recordSceneEvent({ kind: 'scene-ready', map: state.session.map, atMs: now, durationMs: started === null ? null : now - started });
      }
    });

    const startSample = (ms = DEFAULT_SAMPLE_MS) => new Promise<SampleResult>(resolve => {
      if (shared.active) shared.active.finish('Substituída por uma nova amostra.');
      const requestedMs = Number.isFinite(ms) && ms > 0 ? Math.min(ms, 60_000) : DEFAULT_SAMPLE_MS;
      const startedAtMs = performance.now();
      const active: ActiveSample = {
        startedAtMs, requestedMs, map, intervals: [], counters: [], loafDurations: [],
        hidden: document.hidden, paused: useGameStore.getState().isPaused, lastCounterAtMs: 0,
        finish: (interruptedReason?: string) => {
          if (shared.active !== active) return;
          shared.active = null;
          const result = buildSampleResult({
            startedAtMs, requestedMs, elapsedMs: performance.now() - startedAtMs, map,
            intervals: active.intervals, hiddenDuringSample: active.hidden, pausedDuringSample: active.paused,
            interruptedReason: interruptedReason ?? null,
            loafSupported, loafDurations: active.loafDurations, counters: active.counters
          });
          pushBounded(shared.samples, result, MAX_SAMPLES);
          resolve(result);
        }
      };
      shared.active = active;
      if (active.hidden) active.finish();
    });
    startSampleRef.current = startSample;

    window.__hordaPerf = { sample: startSample, report: buildFullReport };

    const refresh = () => {
      const intervals = Array.from(live.subarray(0, liveCount));
      const summary = summarizeIntervals(intervals);
      const latest = shared.latest;
      const heap = readHeap();
      setView({
        p50: formatValue(summary?.p50, 'ms'),
        p95: formatValue(summary?.p95, 'ms'),
        over50: summary ? summary.rafOver50 : null,
        drawCalls: latest ? String(latest.drawCalls) : 'indisponível',
        triangles: latest ? latest.triangles.toLocaleString('pt-BR') : 'indisponível',
        geometries: latest ? String(latest.geometries) : 'indisponível',
        textures: latest ? String(latest.textures) : 'indisponível',
        counterAge: latest ? formatValue(performance.now() - latest.sampledAtMs, 'ms', 0) : 'indisponível',
        heap: heap ? formatBytes(heap.usedBytes) : 'indisponível',
        dpr: `${formatValue(window.devicePixelRatio, '', 2)} / renderer ${formatValue(shared.gl?.getPixelRatio(), '', 2)}`,
        sampling: shared.active !== null,
        lastSample: shared.samples[shared.samples.length - 1] ?? null
      });
    };
    refresh();
    const timer = window.setInterval(refresh, PANEL_REFRESH_MS);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeGame();
      unsubscribeExpedition();
      shared.active?.finish('Interrompida: o canvas foi desmontado (troca de mapa ou saída).');
      if (window.__hordaPerf?.sample === startSample) delete window.__hordaPerf;
      startSampleRef.current = undefined;
    };
  }, [map]);

  const runSample = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    setMessage('Amostrando 10 s… mantenha a aba visível.');
    const result = await startSampleRef.current?.();
    if (!result) return;
    setMessage(result.status === 'valid' ? 'Amostra concluída.' : `Amostra inválida: ${result.invalidReason}`);
  };

  const copyReport = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    const json = JSON.stringify(buildFullReport(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setMessage('Relatório JSON copiado.');
    } catch {
      console.info('[perf] relatório S2.9', json);
      setMessage('Área de transferência indisponível; relatório impresso no console.');
    }
  };

  const last = view?.lastSample ?? null;
  return (
    <aside
      aria-label="Medição de desempenho (desenvolvimento)"
      onWheel={event => event.stopPropagation()}
      style={{
        position: 'fixed', right: 12, top: 72, zIndex: 40, width: open ? 260 : 'auto',
        padding: '8px 10px', borderRadius: 10, background: 'rgba(8, 14, 22, 0.86)', color: '#d8e6f2',
        font: '11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace', boxShadow: '0 6px 18px rgba(0,0,0,.3)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>PERF · {map}</strong>
        <button type="button" onClick={event => { event.currentTarget.blur(); setOpen(value => !value); }} style={buttonStyle}>{open ? '–' : '+'}</button>
      </div>
      {open && view && (
        <>
          <div>rAF p50 / p95: {view.p50} / {view.p95}</div>
          <div>rAF &gt; 50 ms (últimos {LIVE_WINDOW}): {view.over50 ?? 'indisponível'}</div>
          <div>draw calls: {view.drawCalls} · triângulos: {view.triangles}</div>
          <div>geometrias: {view.geometries} · texturas: {view.textures} (contagens)</div>
          <div>renderer.info lido há {view.counterAge}</div>
          <div>heap JS: {view.heap}</div>
          <div>DPR: {view.dpr}</div>
          {last && (
            <div style={{ marginTop: 6 }}>
              Última amostra ({last.status === 'valid' ? 'válida' : 'inválida'}):{' '}
              {last.rafIntervals
                ? `p50 ${formatValue(last.rafIntervals.p50, 'ms')} · p95 ${formatValue(last.rafIntervals.p95, 'ms')} · >33 ms ${last.rafIntervals.rafOver33} · >50 ms ${last.rafIntervals.rafOver50} · LoAF ${last.longAnimationFrames.supported ? last.longAnimationFrames.count : 'indisponível'}`
                : last.invalidReason}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="button" disabled={view.sampling} onClick={runSample} style={buttonStyle}>Amostra 10 s</button>
            <button type="button" onClick={copyReport} style={buttonStyle}>Copiar JSON</button>
          </div>
          {message && <div style={{ marginTop: 4, opacity: 0.85 }}>{message}</div>}
          <div style={{ marginTop: 4, opacity: 0.6 }}>Intervalos de rAF, não tempo de GPU.</div>
        </>
      )}
    </aside>
  );
}

const buttonStyle: React.CSSProperties = {
  font: 'inherit', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(216,230,242,.35)',
  background: 'transparent', color: 'inherit', cursor: 'pointer'
};
