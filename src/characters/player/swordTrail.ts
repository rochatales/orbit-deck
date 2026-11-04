import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, ShaderMaterial } from 'three';
import { MACHETE } from '../../combat/melee';
import arcs from './swordArcs.json';

/**
 * Rastro do corte: crescente com cauda fina, miolo amarelo quente e pontas desfiadas (referência do
 * autor). O arco vem da trajetória medida da lâmina em cada corte; a fita copia só o desenho limpo.
 */
export const SWORD_TRAIL = {
  columns: 56, fade: .2, inner: .58, floor: .04, reach: 1.3,
  /** A frente da crescente chega perto do limite do dano, para o efeito mostrar o alcance real. */
  front: MACHETE.range - .2,
  colors: { core: new Color('#fff17a'), hot: new Color('#ffd400'), mid: new Color('#ff8a00'), rim: new Color('#c92a06') }
} as const;

const VERTEX = `attribute float along; attribute float across; varying float vAlong; varying float vAcross;
  void main(){ vAlong = along; vAcross = across; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAGMENT = `uniform vec3 core, hot, mid, rim; uniform float head, tail; varying float vAlong; varying float vAcross;
  void main(){
    float span = max(head - tail, .001), u = (vAlong - tail) / span, v = vAcross;
    if (u < 0. || u > 1.) discard;
    // Corpo: fio fino na cauda, engrossa até a frente, colado na borda externa do arco.
    float thick = mix(.035, .62, pow(smoothstep(0., .92, u), 1.5));
    float d = abs(v - thick * .5 - .02) / (thick * .5 + .02);
    // Dedos: a frente termina em pontas de comprimentos diferentes.
    float streak = .5 + .5 * sin(v * 38. + 1.1) * sin(v * 15.);
    float front = 1. - smoothstep(.8 + streak * .17, .86 + streak * .14, u);
    float body = (1. - smoothstep(.62, 1., d)) * front * smoothstep(0., .05, u);
    if (body <= .003) discard;
    float heat = body * (1. - d * d * .8) * (.5 + .5 * smoothstep(.1, .75, u));
    vec3 c = mix(rim, mid, smoothstep(.03, .22, heat));
    c = mix(c, hot, smoothstep(.16, .4, heat));
    c = mix(c, core, smoothstep(.72, .98, heat));
    gl_FragColor = vec4(c, smoothstep(0., .34, heat) * .96);
    #include <colorspace_fragment>
  }`;

interface SwordArc { center: number[]; u: number[]; v: number[]; radius: number; from: number; to: number }

/** Malha do arco no corpo do jogador (+Z à frente, pés na origem); nunca entra no chão. */
export function arcGeometry(arc: SwordArc) {
  const n = SWORD_TRAIL.columns, positions = new Float32Array(n * 6), along = new Float32Array(n * 2), across = new Float32Array(n * 2), index = new Uint16Array((n - 1) * 6);
  const outer = arc.radius * SWORD_TRAIL.reach, inner = arc.radius * SWORD_TRAIL.inner;
  // O dano sai na direção da mira (+Z), não para onde o quadril do clipe aponta no instante:
  // gira o arco para o meio dele cair à frente e o leva até o alcance do corte.
  const mid = (arc.from + arc.to) / 2, midX = arc.center[0] + (arc.u[0] * Math.cos(mid) + arc.v[0] * Math.sin(mid)) * outer, midZ = arc.center[2] + (arc.u[2] * Math.cos(mid) + arc.v[2] * Math.sin(mid)) * outer;
  const yaw = Math.atan2(midX, midZ), sinYaw = Math.sin(-yaw), cosYaw = Math.cos(-yaw), push = SWORD_TRAIL.front - Math.hypot(midX, midZ);
  for (let c = 0; c < n; c++) {
    const t = c / (n - 1), angle = arc.from + (arc.to - arc.from) * t, cos = Math.cos(angle), sin = Math.sin(angle);
    [outer, inner].forEach((radius, row) => {
      for (let axis = 0; axis < 3; axis++) positions[(c * 2 + row) * 3 + axis] = arc.center[axis] + (arc.u[axis] * cos + arc.v[axis] * sin) * radius;
      const at = (c * 2 + row) * 3, x = positions[at], z = positions[at + 2];
      positions[at] = x * cosYaw + z * sinYaw;
      positions[at + 2] = -x * sinYaw + z * cosYaw + push;
      positions[at + 1] = Math.max(SWORD_TRAIL.floor, positions[at + 1]);
      along[c * 2 + row] = t; across[c * 2 + row] = row;
    });
    if (c < n - 1) index.set([c * 2, c * 2 + 1, c * 2 + 2, c * 2 + 2, c * 2 + 1, c * 2 + 3], c * 6);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3)); geometry.setAttribute('along', new BufferAttribute(along, 1)); geometry.setAttribute('across', new BufferAttribute(across, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

/** Sem alocação no quadro: três malhas prontas, e só a frente e a cauda mudam no shader. */
export class SwordTrail {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly geometries = (arcs as SwordArc[]).map(arcGeometry);
  private readonly head = { value: 0 };
  private readonly tail = { value: 0 };
  private fading = 0;
  constructor() {
    const { core, hot, mid, rim } = SWORD_TRAIL.colors;
    const material = new ShaderMaterial({ uniforms: { core: { value: core }, hot: { value: hot }, mid: { value: mid }, rim: { value: rim }, head: this.head, tail: this.tail }, vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false });
    this.mesh = new Mesh(this.geometries[0], material);
    this.mesh.name = 'EspadaRastro'; this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; this.mesh.visible = false; this.mesh.castShadow = false;
  }
  /**
   * `progress`: 0 a 1 enquanto a lâmina corre, negativo fora do trecho. A fita acompanha o jogador
   * durante o corte e depois fica no mundo, apagando da cauda para a frente. `delta` zero congela.
   */
  update(delta: number, stage: number, progress: number, x: number, y: number, z: number, facing: number) {
    if (delta <= 0) return;
    if (progress >= 0) {
      this.mesh.geometry = this.geometries[stage] ?? this.geometries[0];
      this.mesh.position.set(x, y, z); this.mesh.rotation.y = facing;
      this.head.value = Math.min(1, progress); this.tail.value = 0; this.fading = SWORD_TRAIL.fade; this.mesh.visible = true;
      return;
    }
    if (!this.mesh.visible) return;
    this.fading -= delta;
    if (this.fading <= 0) { this.clear(); return; }
    this.head.value = 1;
    this.tail.value = 1 - this.fading / SWORD_TRAIL.fade;
  }
  /** Volta ao vazio (reinício, Dash ou troca de arma). */
  clear() { this.fading = 0; this.mesh.visible = false; }
  dispose() { this.mesh.removeFromParent(); for (const geometry of this.geometries) geometry.dispose(); this.mesh.material.dispose(); }
}
