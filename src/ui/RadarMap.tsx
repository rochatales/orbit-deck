import { useEffect, useRef } from 'react';
import { MAPS } from '../game/config';
import type { MapId } from '../game/session';
import { cameraView, playerPosition } from '../state/playerTransient';
import { combatRuntime } from '../state/useCombatStore';
import { RADAR, collectBlips, radarProject, type RadarBlip } from './radar';

/** Coração de vida (rosado, para não confundir com o vermelho dos inimigos). */
function heart(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  g.moveTo(x, y + r * .95);
  g.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .9, y - r * 1.25, x, y - r * .45);
  g.bezierCurveTo(x + r * .9, y - r * 1.25, x + r * 1.5, y - r * .1, x, y + r * .95);
  g.fill();
}

/** Miniatura do astronauta de frente: ombros laranja, gola escura, capacete creme, viseira
 * azul-marinho com a borda ciano da referência. Desenhada em vetor, nítida em qualquer DPR. */
function portrait(g: CanvasRenderingContext2D, c: number, s: number) {
  g.save();
  g.beginPath(); g.arc(c, c, s, 0, Math.PI * 2); g.closePath();
  g.fillStyle = '#0a1c22'; g.fill();
  g.clip();
  g.fillStyle = '#d97a5a'; // traje
  g.beginPath(); g.ellipse(c, c + s * 1.05, s * .95, s * .62, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6b4636'; g.fillRect(c - s * .55, c + s * .55, s * .16, s * .6); g.fillRect(c + s * .39, c + s * .55, s * .16, s * .6); // alças
  g.fillStyle = '#2b2a2d'; g.beginPath(); g.ellipse(c, c + s * .52, s * .44, s * .16, 0, 0, Math.PI * 2); g.fill(); // gola
  g.fillStyle = '#e9e1cd'; // capacete
  g.beginPath(); g.arc(c, c - s * .05, s * .58, 0, Math.PI * 2); g.fill();
  g.fillRect(c - s * .66, c - s * .2, s * .14, s * .3); g.fillRect(c + s * .52, c - s * .2, s * .14, s * .3); // orelhas
  g.fillStyle = '#1b2350'; // viseira
  g.beginPath(); g.ellipse(c, c + s * .02, s * .42, s * .3, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#4ff0ff'; g.lineWidth = Math.max(1, s * .08); // borda ciano inferior
  g.beginPath(); g.ellipse(c, c + s * .02, s * .4, s * .28, 0, Math.PI * .1, Math.PI * .9); g.stroke();
  g.fillStyle = '#ffffff40'; g.beginPath(); g.ellipse(c - s * .16, c - s * .1, s * .1, s * .05, -.5, 0, Math.PI * 2); g.fill(); // reflexo
  g.restore();
  g.strokeStyle = '#83e5d7'; g.lineWidth = 1.2; g.beginPath(); g.arc(c, c, s, 0, Math.PI * 2); g.stroke();
}

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Radar ciano acima da vida: anéis, varredura e pulso. Vermelho = inimigos vivos, coração
 * rosado = kits de vida, amarelo = loot (recursos no chão e cabines fechadas), ciano = aeronave
 * (presa na borda quando longe). No centro, miniatura do explorador de frente. Canvas próprio
 * a 30 fps, lendo dados mutáveis sem render do React.
 */
export function RadarMap({ map }: { map: MapId }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current, g = el?.getContext('2d');
    if (!el || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), size = RADAR.sizePx;
    el.width = el.height = Math.round(size * dpr);
    const blips: RadarBlip[] = [], aircraft = MAPS[map].exit, c = size / 2, R = size / 2 - 3;
    let frame = 0, last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 1000 / RADAR.fps) return;
      last = now;
      const t = reducedMotion ? 0 : now / 1000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, size, size);
      // Disco e grade.
      const bg = g.createRadialGradient(c, c, 0, c, c, R);
      bg.addColorStop(0, '#0f3a42d9'); bg.addColorStop(1, '#06161ce6');
      g.fillStyle = bg; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = RADAR.colors.grid; g.lineWidth = 1;
      for (const [r, a] of [[1, .7], [.66, .28], [.33, .28]] as const) { g.globalAlpha = a; g.beginPath(); g.arc(c, c, R * r, 0, Math.PI * 2); g.stroke(); }
      g.globalAlpha = .18; g.beginPath(); g.moveTo(c - R, c); g.lineTo(c + R, c); g.moveTo(c, c - R); g.lineTo(c, c + R); g.stroke();
      // Varredura (cone com rastro) e pulso expansivo.
      if (!reducedMotion) {
        const sweep = (t / RADAR.sweepSeconds) * Math.PI * 2 - Math.PI / 2;
        for (let i = 0; i < 14; i++) {
          g.globalAlpha = .2 * (1 - i / 14);
          g.fillStyle = RADAR.colors.grid; g.beginPath(); g.moveTo(c, c);
          g.arc(c, c, R, sweep - (i + 1) * .045, sweep - i * .045); g.closePath(); g.fill();
        }
        const pulse = (t % RADAR.pulseSeconds) / RADAR.pulseSeconds;
        g.globalAlpha = .55 * (1 - pulse); g.lineWidth = 1.5;
        g.beginPath(); g.arc(c, c, R * pulse, 0, Math.PI * 2); g.stroke();
      }
      // Pontos.
      collectBlips(blips, combatRuntime.simulation, aircraft);
      const beat = reducedMotion ? 1 : .75 + .25 * Math.sin(t * 5);
      for (const b of blips) {
        const p = radarProject(b.x - playerPosition.x, b.z - playerPosition.z, cameraView.angle);
        if (p.clamped && b.kind !== 'aircraft') continue;
        const x = c + p.x * (R - 5), y = c - p.y * (R - 5), color = RADAR.colors[b.kind];
        g.fillStyle = color;
        if (b.kind === 'life') {
          g.globalAlpha = .3 * beat; heart(g, x, y, 5.6);
          g.globalAlpha = 1; heart(g, x, y, 3.4);
          continue;
        }
        const r = b.kind === 'aircraft' ? 4 : b.kind === 'enemy' ? 2.4 : 2.6;
        g.globalAlpha = (b.kind === 'enemy' ? .45 : .35) * beat; g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; g.beginPath();
        if (b.kind === 'aircraft') { g.moveTo(x, y - r * 1.3); g.lineTo(x + r, y + r); g.lineTo(x - r, y + r); g.closePath(); }
        else g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      // Explorador no centro: miniatura do perfil, por cima dos pontos.
      g.globalAlpha = 1; portrait(g, c, 12);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [map]);
  return <figure className="beta-radar" aria-label="Radar: vermelho são inimigos, corações rosados são kits de vida, amarelo é loot e ciano é a aeronave">
    <canvas ref={canvas} style={{ width: RADAR.sizePx, height: RADAR.sizePx }}/>
    <figcaption><span className="is-enemy">INIMIGO</span><span className="is-life">VIDA</span><span className="is-loot">LOOT</span><span className="is-ship">AERONAVE</span></figcaption>
  </figure>;
}
