import { CanvasTexture, SRGBColorSpace } from 'three';
import { crateRandom } from '../props/crateImpact';

type G = CanvasRenderingContext2D;
type P = [number, number];
const CELL = 256;

/** Fenda escura com quina lascada clara (mesma linguagem da cratera dos baús). */
function stroke(g: G, points: P[], width: number, dark = 'rgba(6,6,6,.95)', light = 'rgba(150,144,132,.16)') {
  g.lineCap = g.lineJoin = 'round';
  for (const [color, w, off] of [['rgba(10,10,10,.22)', width * 2.6 + 2, 0], [light, width + 1.2, 1.1], [dark, width * 1.35, 0]] as const) {
    g.strokeStyle = color; g.lineWidth = w; g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(x + off, y + off) : g.moveTo(x + off, y + off));
    g.stroke();
  }
}
function crack(g: G, rand: () => number, x: number, y: number, heading: number, steps: number, width: number, branch = .14, depth = 0) {
  const pts: P[] = [[x, y]];
  for (let i = 0; i < steps; i++) {
    heading += (rand() - .5) * .6;
    x += Math.cos(heading) * (7 + rand() * 7); y += Math.sin(heading) * (7 + rand() * 7);
    pts.push([x, y]);
    if (depth < 2 && rand() < branch) crack(g, rand, x, y, heading + (rand() < .5 ? -1 : 1) * (.5 + rand() * .6), Math.floor(steps * .5), width * .6, branch, depth + 1);
    width = Math.max(.7, width * .96);
  }
  stroke(g, pts, width);
}
function blob(g: G, rand: () => number, x: number, y: number, r: number, color: string, jag = .35, n = 14) {
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 - jag / 2 + rand() * jag); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function grime(g: G, rand: () => number, cx: number, cy: number, r: number, rgb: string, alpha: number, count: number) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = rand() * r, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, s = 8 + rand() * r * .35;
    const grad = g.createRadialGradient(x, y, 0, x, y, s);
    grad.addColorStop(0, `rgba(${rgb},${alpha * (.5 + rand() * .5)})`); grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(x - s, y - s, s * 2, s * 2);
  }
}
function chips(g: G, rand: () => number, cx: number, cy: number, r: number, count: number, light: string, dark = 'rgba(10,9,8,.7)') {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = rand() * r, s = 2 + rand() * 6;
    blob(g, rand, cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, rand() < .45 ? dark : light, .6, 5);
  }
}

/** Uma célula por tipo de dano; 0–7 asfalto, 8–15 calçada de ladrilho. */
const CELLS: ((g: G, rand: () => number, c: number) => void)[] = [
  // 0–1 rede de trincas
  (g, r, c) => { grime(g, r, c, c, 90, '20,19,18', .25, 10); for (let i = 0; i < 5; i++) crack(g, r, c + (r() - .5) * 60, c + (r() - .5) * 60, r() * 7, 14, 2.6, .2); },
  (g, r, c) => { grime(g, r, c, c, 80, '20,19,18', .2, 8); for (let i = 0; i < 4; i++) crack(g, r, c, c, i * 1.6 + r(), 16, 3, .22); chips(g, r, c, c, 40, 18, 'rgba(98,96,92,.6)'); },
  // 2 estrela de impacto: trincas que partem de um ponto e se abrem (sem malha em grade)
  (g, r, c) => { grime(g, r, c, c, 60, '14,13,12', .35, 8); blob(g, r, c, c, 10, 'rgba(10,9,8,.85)', .6, 8); for (let i = 0, n = 6 + Math.floor(r() * 3); i < n; i++) crack(g, r, c, c, i / n * Math.PI * 2 + r() * .6, 11 + Math.floor(r() * 5), 2.6, .12); },
  // 3 trinca longa atravessando a faixa
  (g, r, c) => { crack(g, r, 20, c + (r() - .5) * 40, (r() - .5) * .3, 26, 3.6, .18); crack(g, r, c, 30, Math.PI / 2 + (r() - .5) * .4, 14, 2, .1); },
  // 4–5 buraco: fundo escuro, cascalho, borda quebrada e trincas saindo
  ...[0, 1].map(() => (g: G, r: () => number, c: number) => {
    for (let i = 0; i < 7; i++) crack(g, r, c, c, i / 7 * Math.PI * 2 + r() * .5, 9, 2.4, .1);
    blob(g, r, c, c, 74, 'rgba(70,68,64,.85)', .4, 18);
    blob(g, r, c, c, 62, 'rgba(18,16,14,.97)', .45, 18);
    blob(g, r, c + 6, c + 8, 40, 'rgba(32,28,24,.9)', .5, 12);
    chips(g, r, c, c, 52, 40, 'rgba(96,92,86,.85)', 'rgba(5,5,5,.8)');
  }),
  // 6 queimado/óleo
  (g, r, c) => { grime(g, r, c, c, 70, '8,8,8', .55, 18); grime(g, r, c, c, 100, '30,24,18', .25, 10); },
  // 7 capa de asfalto descascada mostrando a base clara
  (g, r, c) => { blob(g, r, c, c, 72, 'rgba(92,90,84,.75)', .55, 16); chips(g, r, c, c, 70, 50, 'rgba(120,116,108,.8)'); stroke(g, Array.from({ length: 19 }, (_, i): P => { const a = i / 18 * Math.PI * 2; return [c + Math.cos(a) * (74 + r() * 10), c + Math.sin(a) * (74 + r() * 10)]; }), 2); },
  // 8–9 ladrilho rachado: trincas retas que quebram nas juntas, quinas lascadas, sujeira nas juntas
  ...[0, 1].map(() => (g: G, r: () => number, c: number) => {
    grime(g, r, c, c, 90, '34,32,26', .25, 10);
    for (let i = 0; i < 4; i++) { let x = 40 + r() * 176, y = 40 + r() * 176; const pts: P[] = [[x, y]]; for (let k = 0; k < 6; k++) { if (k % 2) x += (r() - .5) * 70; else y += (r() - .5) * 70; pts.push([x, y]); } stroke(g, pts, 2.2); }
    for (let i = 0; i < 10; i++) { const x = 32 + Math.floor(r() * 6) * 32, y = 32 + Math.floor(r() * 6) * 32, s = 6 + r() * 10; g.fillStyle = 'rgba(14,12,10,.8)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x, y + s * (r() < .5 ? 1 : -1)); g.fill(); }
  }),
  // 10–11 ladrilhos faltando: terra escura, borda quebrada e brotos
  ...[0, 1].map(() => (g: G, r: () => number, c: number) => {
    const t = 60;
    for (let i = 0; i < 5; i++) {
      const x = c - t + Math.floor(r() * 3) * t * .66, y = c - t + Math.floor(r() * 3) * t * .66;
      g.fillStyle = 'rgba(22,18,13,.96)'; g.fillRect(x, y, t, t);
      grime(g, r, x + t / 2, y + t / 2, t * .4, '58,52,30', .6, 4);
      chips(g, r, x + t / 2, y + t / 2, t * .55, 8, 'rgba(150,142,124,.85)');
      stroke(g, [[x, y], [x + t, y], [x + t, y + t], [x, y + t], [x, y]], 1.4, 'rgba(10,9,8,.85)', 'rgba(190,182,164,.4)');
    }
    grime(g, r, c, c, 70, '62,74,36', .35, 8);
    crack(g, r, c, c, r() * 7, 10, 1.8, .2);
  }),
  // 12–13 lodo verde e sujeira de calçada largada
  ...[0, 1].map(() => (g: G, r: () => number, c: number) => { grime(g, r, c, c, 90, '48,62,30', .45, 22); grime(g, r, c, c, 70, '26,26,20', .35, 12); grime(g, r, c, c, 40, '78,92,40', .3, 6); }),
  // 14 mancha de água/barro
  (g, r, c) => { grime(g, r, c, c, 80, '50,40,28', .45, 16); blob(g, r, c, c, 46, 'rgba(36,30,22,.35)', .6, 16); },
  // 15 pó e cacos
  (g, r, c) => { grime(g, r, c, c, 90, '120,112,98', .25, 12); chips(g, r, c, c, 90, 60, 'rgba(150,142,126,.75)'); }
];

/** Atlas 1024² (16 células de 256), cada célula com borda dissolvida em alfa. */
export function createDecayAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CELL * 4;
  const g = canvas.getContext('2d')!;
  CELLS.forEach((draw, i) => {
    const x0 = (i % 4) * CELL, y0 = Math.floor(i / 4) * CELL, rand = crateRandom(`decay-cell-${i}`);
    g.save();
    g.beginPath(); g.rect(x0, y0, CELL, CELL); g.clip();
    g.translate(x0, y0);
    draw(g, rand, CELL / 2);
    const fade = g.createRadialGradient(CELL / 2, CELL / 2, CELL * .26, CELL / 2, CELL / 2, CELL * .48);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = fade; g.fillRect(0, 0, CELL, CELL);
    g.restore();
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Tufo de mato: lâminas curvas afinando, mais escuras na base. */
export function createWeedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!, rand = crateRandom('mato-tufo');
  for (let i = 0; i < 34; i++) {
    const x = 128 + (rand() - .5) * 110, lean = (rand() - .5) * 120, top = 30 + rand() * 150, w = 4 + rand() * 6;
    const grad = g.createLinearGradient(0, 256, 0, top);
    // Neutro claro: a cor de cada tufo vem da instância (verde, oliva, seco).
    const light = 200 + rand() * 55;
    grad.addColorStop(0, 'rgb(70,72,64)'); grad.addColorStop(1, `rgb(${light * .92 | 0},${light | 0},${light * .86 | 0})`);
    g.fillStyle = grad; g.beginPath();
    g.moveTo(x - w, 256);
    g.quadraticCurveTo(x + lean * .3 - w * .5, (256 + top) / 2, x + lean, top);
    g.quadraticCurveTo(x + lean * .3 + w * .5, (256 + top) / 2, x + w, 256);
    g.closePath(); g.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
