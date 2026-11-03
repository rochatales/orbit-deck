import { CanvasTexture, SRGBColorSpace } from 'three';
import { crateRandom } from './crateImpact';

/** Desenho único da cratera em canvas (0 bytes de asset): fuligem/compressão no centro,
 * anel de fratura, trincas radiais com ramificações e borda clara, lascas e poeira
 * espirrada. A borda externa dissolve em alfa para casar com calçada e asfalto. */
export function createImpactTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, rand = crateRandom('impacto-cabine'), C = size / 2, R = size / 2;
  const polar = (a: number, r: number): [number, number] => [C + Math.cos(a) * r, C + Math.sin(a) * r];

  // Piso comprimido e chamuscado pelo choque.
  const soot = g.createRadialGradient(C, C, 0, C, C, R * .64);
  soot.addColorStop(0, 'rgba(14,13,12,.95)');
  soot.addColorStop(.36, 'rgba(26,24,22,.78)');
  soot.addColorStop(.7, 'rgba(40,37,33,.32)');
  soot.addColorStop(1, 'rgba(52,48,43,0)');
  g.fillStyle = soot;
  g.fillRect(0, 0, size, size);

  // Poeira espirrada para fora.
  g.lineCap = 'round';
  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2, r0 = R * (.28 + rand() * .15), r1 = r0 + R * (.2 + rand() * .5);
    g.strokeStyle = `rgba(150,141,126,${.04 + rand() * .08})`;
    g.lineWidth = 2 + rand() * 9;
    g.beginPath(); g.moveTo(...polar(a, r0)); g.lineTo(...polar(a + (rand() - .5) * .12, r1)); g.stroke();
  }

  const stroke = (points: [number, number][], width: number) => {
    // Borda clara deslocada = quina lascada pegando luz; traço escuro = fenda.
    for (const [color, w, off] of [['rgba(176,168,152,.38)', width + 1.6, 1.2], ['rgba(6,6,6,.92)', width, 0]] as const) {
      g.strokeStyle = color; g.lineWidth = w;
      g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x + off, y + off) : g.moveTo(x + off, y + off)); g.stroke();
    }
  };

  // Anel de fratura onde a placa afundou.
  for (const ring of [.33, .42]) {
    const pts: [number, number][] = [];
    for (let i = 0, start = rand() * Math.PI * 2; i <= 40; i++) pts.push(polar(start + i / 40 * Math.PI * (ring < .4 ? 2 : 1.3), R * ring * (.92 + rand() * .16)));
    stroke(pts, ring < .4 ? 3.2 : 2);
  }

  // Trincas radiais com galhos, afinando para fora.
  const crack = (a: number, r: number, width: number, reach: number, depth: number) => {
    const pts: [number, number][] = [polar(a, r)];
    let x = pts[0][0], y = pts[0][1], heading = a;
    while (Math.hypot(x - C, y - C) < reach && width > .4) {
      heading += (rand() - .5) * .7 + (a - heading) * .25;
      const step = 9 + rand() * 9;
      x += Math.cos(heading) * step; y += Math.sin(heading) * step;
      pts.push([x, y]);
      if (depth < 2 && rand() < .16) crack(heading + (rand() < .5 ? -1 : 1) * (.45 + rand() * .5), Math.hypot(x - C, y - C), width * .6, reach * (.75 + rand() * .2), depth + 1);
      width *= .93;
    }
    stroke(pts, width);
  };
  const cracks = 11 + Math.floor(rand() * 4);
  for (let i = 0; i < cracks; i++) crack((i + rand() * .7) / cracks * Math.PI * 2, R * (.16 + rand() * .08), 3.4 + rand() * 1.8, R * (.62 + rand() * .32), 0);

  // Lascas soltas (claras) e buracos de lascamento (escuros).
  for (let i = 0; i < 46; i++) {
    const [x, y] = polar(rand() * Math.PI * 2, R * (.22 + rand() * .5)), s = 3 + rand() * 9, dark = rand() < .4;
    g.fillStyle = dark ? 'rgba(8,8,8,.7)' : `rgba(${118 + rand() * 30 | 0},${112 + rand() * 26 | 0},${100 + rand() * 22 | 0},.7)`;
    g.beginPath();
    for (let k = 0; k < 5; k++) { const t = k / 5 * Math.PI * 2 + rand() * .6; g.lineTo(x + Math.cos(t) * s * (.6 + rand() * .5), y + Math.sin(t) * s * (.6 + rand() * .5)); }
    g.closePath(); g.fill();
  }

  // Dissolve a borda: nada de disco recortado sobre o piso.
  const fade = g.createRadialGradient(C, C, R * .5, C, C, R * .98);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'source-over';

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
