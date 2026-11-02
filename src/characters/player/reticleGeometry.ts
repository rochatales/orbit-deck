import { Shape, ShapeGeometry } from 'three';
import { RETICLE } from './reticle';

/** Move só os quatro chevrons: ponto central e espessura dos traços ficam constantes. */
export class ReticleGeometry {
  readonly geometry: ShapeGeometry;
  private readonly base: Float32Array;
  private readonly directions: Float32Array;
  private spread: number = RETICLE.normalSpread;

  constructor() {
    const shapes: Shape[] = [];
    const points = [[-5, -2], [-3, -4], [0, -1], [3, -4], [5, -2], [0, 3]];
    for (let i = 0; i < 4; i++) {
      const angle = -i * Math.PI / 2, sin = Math.sin(angle), cos = Math.cos(angle), shape = new Shape();
      points.forEach(([x, y], index) => {
        const py = y + RETICLE.normalSpread, px = x * cos - py * sin, ry = x * sin + py * cos;
        if (index === 0) shape.moveTo(px, ry); else shape.lineTo(px, ry);
      });
      shape.closePath(); shapes.push(shape);
    }
    const dot = new Shape(); dot.absarc(0, 0, 2, 0, Math.PI * 2, false); shapes.push(dot);
    this.geometry = new ShapeGeometry(shapes, 12);
    this.base = new Float32Array(this.geometry.attributes.position.array);
    this.directions = new Float32Array(this.base.length);
    for (let i = 0; i < this.base.length; i += 3) {
      const x = this.base[i], y = this.base[i + 1];
      if (Math.max(Math.abs(x), Math.abs(y)) < 5) continue; // ponto central
      if (Math.abs(x) > Math.abs(y)) this.directions[i] = Math.sign(x);
      else this.directions[i + 1] = Math.sign(y);
    }
    // A captura só contrai: o envelope aberto continua válido sem recalcular por quadro.
    this.geometry.computeBoundingBox(); this.geometry.computeBoundingSphere();
  }

  setSpread(spread: number) {
    if (Math.abs(spread - this.spread) < 1e-5) return;
    this.spread = spread;
    const attribute = this.geometry.attributes.position, values = attribute.array;
    const offset = spread - RETICLE.normalSpread;
    for (let i = 0; i < values.length; i++) values[i] = this.base[i] + this.directions[i] * offset;
    attribute.needsUpdate = true;
  }
}
