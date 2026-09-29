/**
 * S2.9 — instrumentação opcional de desenvolvimento. Só é carregada com `?perf`
 * (ver GameCanvas). Mede sem alterar gameplay, câmera, física ou o renderer:
 * - PerfProbe (dentro do Canvas) lê renderer.info e acompanha a prontidão da cena;
 * - PerfPanel (fora do Canvas) liga a sessão de medição às APIs do navegador,
 *   mostra o painel e expõe window.__hordaPerf.
 * A lógica fica em perfMetrics.ts (testada em Node); aqui só há a ligação com o runtime.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Object3D, WebGLRenderer } from 'three';
import { EDEN_CHARACTER_ASSET, PLAYER_CHARACTER_ASSET } from '../../characters/characterAssetConfig';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { useGameStore } from '../../state/useGameStore';
import {
  COUNTER_SAMPLE_EVERY_MS, LIVE_WINDOW, buildReport, createPerfSession, createPerfShared, createSceneTracker,
  formatBytes, formatValue, offerCounters, readHeapMemory, summarizeIntervals, summarizeNavigation, summarizeResources,
  type MeasurementContext, type PerfReport, type PerfSession, type PerfSessionApi, type RendererCounters, type SampleResult
} from './perfMetrics';

const PANEL_REFRESH_MS = 500;

/** Estado limitado, compartilhado entre sonda e painel e mantido entre trocas de mapa. */
const shared = createPerfShared();
let activeGl: WebGLRenderer | null = null;

/** Personagens GLB cujo conteúdo carregado (grupo nomeado) indica cena completa, por mapa. */
function expectedCharacterNames(map: string): string[] {
  return map === 'mars' ? [PLAYER_CHARACTER_ASSET.name, EDEN_CHARACTER_ASSET.name] : [PLAYER_CHARACTER_ASSET.name];
}

function allPresent(scene: Object3D, names: string[]) {
  return names.every(name => scene.getObjectByName(name) !== undefined);
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
  const scene = useThree(state => state.scene);
  const trackerRef = useRef<ReturnType<typeof createSceneTracker> | null>(null);
  const lastAssetCheckRef = useRef(-Infinity);
  const assetsPresentRef = useRef(false);

  useEffect(() => {
    activeGl = gl;
    assetsPresentRef.current = false;
    lastAssetCheckRef.current = -Infinity;
    trackerRef.current = createSceneTracker(shared, map, performance.now(), useExpeditionStore.getState().ready);
    return () => {
      trackerRef.current = null;
      if (activeGl === gl) { activeGl = null; shared.latest = null; }
    };
  }, [gl, map]);

  // Prioridade padrão: não assume o laço de renderização do R3F.
  useFrame(() => {
    const now = performance.now();
    // renderer.info reflete o render do frame anterior (o reset automático ocorre em cada render).
    const counters = readCounters(gl, now);
    offerCounters(shared, counters);
    const tracker = trackerRef.current;
    if (!tracker || tracker.done) return;
    if (!assetsPresentRef.current && now - lastAssetCheckRef.current >= COUNTER_SAMPLE_EVERY_MS) {
      lastAssetCheckRef.current = now;
      assetsPresentRef.current = allPresent(scene, expectedCharacterNames(map));
    }
    tracker.onFrame(now, counters.drawCalls, assetsPresentRef.current);
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
  const gl = activeGl;
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

interface HordaPerfApi extends PerfSessionApi {
  report: () => PerfReport;
}

declare global {
  interface Window { __hordaPerf?: HordaPerfApi }
}

function browserDeps() {
  return {
    now: () => performance.now(),
    requestFrame: (callback: (time: number) => void) => requestAnimationFrame(callback),
    cancelFrame: (id: number) => cancelAnimationFrame(id),
    isHidden: () => document.hidden,
    onVisibilityChange(listener: () => void) {
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
    observeLongFrames(listener: (entries: Array<{ startTime: number; duration: number }>) => void) {
      const supported = typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes ?? []).includes('long-animation-frame');
      if (!supported) return null;
      const observer = new PerformanceObserver(list => listener(list.getEntries()));
      observer.observe({ type: 'long-animation-frame', buffered: false });
      return () => observer.disconnect();
    },
    isPaused: () => useGameStore.getState().isPaused,
    onPausedChange: (listener: (paused: boolean) => void) =>
      useGameStore.subscribe((state, prev) => { if (state.isPaused !== prev.isPaused) listener(state.isPaused); }),
    onReadyChange: (listener: (prevReady: boolean, ready: boolean, loadingMap: string | null, currentMap: string | null) => void) =>
      useExpeditionStore.subscribe((state, prev) => {
        if (state.ready !== prev.ready) listener(prev.ready, state.ready, state.session.destination ?? state.session.map, state.session.map);
      }),
    setGlobalApi: (api: PerfSessionApi) => { window.__hordaPerf = { ...api, report: buildFullReport }; },
    clearGlobalApi: (api: PerfSessionApi) => { if (window.__hordaPerf?.sample === api.sample) delete window.__hordaPerf; }
  };
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
  const sessionRef = useRef<PerfSession | null>(null);

  useEffect(() => {
    const session = createPerfSession(shared, browserDeps(), map);
    sessionRef.current = session;

    const refresh = () => {
      const summary = summarizeIntervals(session.liveIntervals());
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
        dpr: `${formatValue(window.devicePixelRatio, '', 2)} / renderer ${formatValue(activeGl?.getPixelRatio(), '', 2)}`,
        sampling: session.isSampling(),
        lastSample: shared.samples[shared.samples.length - 1] ?? null
      });
    };
    refresh();
    const timer = window.setInterval(refresh, PANEL_REFRESH_MS);

    return () => {
      window.clearInterval(timer);
      session.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [map]);

  const runSample = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    const session = sessionRef.current;
    if (!session) return;
    setMessage('Amostrando 10 s… mantenha a aba visível.');
    const result = await session.sample();
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
