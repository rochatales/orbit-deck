import { BoxGeometry, Mesh, MeshBasicMaterial, Color } from 'three';
import type { Pickup, SupplyCrate } from '../../combat/simulation';
export const SUPPLY_LIGHTING = {
  medkitColor: '#ff8578', lockerColor: '#70ddff', maxLights: 3, activationDistance: 16,
  reach: 3.2, intensity: 1.1, kitEmission: .28,
  lockerOffset: { x: .0470205738, y: 1.8932197394, z: .2145279018 }
} as const;
/** Barra luminosa, sem anel nem sombra. Recurso próprio descartado com a instância. */
export function createSupplyBeacon(kind: 'kit' | 'locker') {
  const geometry = new BoxGeometry(kind === 'kit' ? .18 : .28, .025, .025);
  const material = new MeshBasicMaterial({ color: kind === 'kit' ? SUPPLY_LIGHTING.medkitColor : SUPPLY_LIGHTING.lockerColor, toneMapped: false });
  const mesh = new Mesh(geometry, material);
  mesh.name = kind === 'kit' ? 'MedkitBeacon' : 'LockerBeacon';
  mesh.position.set(0, kind === 'kit' ? .32 : 1.72, kind === 'kit' ? .17 : .335);
  return { mesh, dispose() { geometry.dispose(); material.dispose(); } };
}
interface Source { x: number; y: number; z: number; color: Color; pickup?: Pickup }
/** Todos têm emissão visível. Até três focos próximos iluminam o piso/entorno,
 * sem acrescentar uma luz dinâmica por prop nem alocar no quadro. */
export class SupplyLightPool {
  readonly sources: Source[];
  readonly selected = new Int32Array(SUPPLY_LIGHTING.maxLights).fill(-1);
  private distances = new Float64Array(SUPPLY_LIGHTING.maxLights);
  constructor(kits: Pickup[], crates: SupplyCrate[], height: (x: number, z: number) => number) {
    this.sources = [
      ...kits.map(p => ({ x: p.x, y: height(p.x, p.z) + .32, z: p.z + .17, color: new Color(SUPPLY_LIGHTING.medkitColor), pickup: p })),
      ...crates.map(p => { const c = Math.cos(p.angle ?? 0), s = Math.sin(p.angle ?? 0), o = SUPPLY_LIGHTING.lockerOffset; return { x: p.x + c * o.x + s * o.z, y: height(p.x, p.z) + o.y, z: p.z - s * o.x + c * o.z, color: new Color(SUPPLY_LIGHTING.lockerColor) }; })
    ];
  }
  update(player: { x: number; z: number }) {
    this.selected.fill(-1); this.distances.fill(Infinity);
    for (let i = 0; i < this.sources.length; i++) {
      const p = this.sources[i]; if (p.pickup && !p.pickup.active) continue;
      const distance = (p.x - player.x) ** 2 + (p.z - player.z) ** 2;
      if (distance > SUPPLY_LIGHTING.activationDistance ** 2) continue;
      for (let slot = 0; slot < this.selected.length; slot++) if (distance < this.distances[slot]) {
        for (let n = this.selected.length - 1; n > slot; n--) { this.selected[n] = this.selected[n - 1]; this.distances[n] = this.distances[n - 1]; }
        this.selected[slot] = i; this.distances[slot] = distance; break;
      }
    }
  }
}
