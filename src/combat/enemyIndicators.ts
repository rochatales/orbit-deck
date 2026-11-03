import { Camera, Color, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, Quaternion, ShaderMaterial, Shape, ShapeGeometry, Vector3 } from 'three';
import { robotConfig, type RobotKind } from './config';
import type { Robot } from './simulation';
import { reticlePixelScale as worldPerPixel } from '../characters/player/reticle';

export const ENEMY_INDICATORS = {
  width: 56, height: 8, innerWidth: 52, innerHeight: 5, aboveHead: .28,
  border: '#101419', track: '#4b222a', fill: '#ff6b69', hit: '#ff4141',
  hitDuration: .28, hitOffset: 17, hitRise: 6, alertOffset: -38
} as const;

export function enemyIndicatorHeight(robot: { kind: RobotKind }) {
  return robotConfig(robot).hitHeight.maxY + ENEMY_INDICATORS.aboveHead;
}

/** Um histórico por slot do pool; renascimento não herda acertos da vida anterior. */
export class EnemyIndicatorState {
  private readonly generation: Int32Array;
  private readonly hp: Float32Array;
  private readonly hitLeft: Float32Array;
  ratio = 0;
  hitProgress = 0;
  hitAlpha = 0;
  showBar = false;
  showHit = false;

  constructor(capacity: number) {
    this.generation = new Int32Array(capacity).fill(-1);
    this.hp = new Float32Array(capacity);
    this.hitLeft = new Float32Array(capacity);
  }

  update(slot: number, robot: Pick<Robot, 'kind' | 'hp' | 'spawned' | 'generation' | 'flash'>, delta: number) {
    if (!robot.spawned) {
      this.generation[slot] = -1; this.hp[slot] = this.hitLeft[slot] = 0;
    } else if (this.generation[slot] !== robot.generation) {
      this.generation[slot] = robot.generation; this.hp[slot] = robot.hp;
      this.hitLeft[slot] = robot.flash > 0 ? ENEMY_INDICATORS.hitDuration : 0;
    } else {
      this.hitLeft[slot] = Math.max(0, this.hitLeft[slot] - delta);
      if (robot.hp < this.hp[slot]) this.hitLeft[slot] = ENEMY_INDICATORS.hitDuration;
      this.hp[slot] = robot.hp;
    }
    this.showBar = robot.spawned && robot.hp > 0;
    this.ratio = this.showBar ? Math.max(0, Math.min(1, robot.hp / robotConfig(robot).hp)) : 0;
    this.showHit = robot.spawned && this.hitLeft[slot] > 0;
    this.hitAlpha = this.showHit ? this.hitLeft[slot] / ENEMY_INDICATORS.hitDuration : 0;
    this.hitProgress = this.showHit ? 1 - this.hitAlpha : 0;
  }
}

function capsule(width: number, height: number) {
  const radius = height / 2, edge = width / 2 - radius, shape = new Shape();
  shape.moveTo(-edge, -radius); shape.lineTo(edge, -radius);
  shape.absarc(edge, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-edge, radius); shape.absarc(-edge, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath(); return new ShapeGeometry(shape, 8);
}
function hitGeometry() {
  const shapes: Shape[] = [];
  for (let i = 0; i < 4; i++) {
    const shape = new Shape(), angle = i * Math.PI / 2, cos = Math.cos(angle), sin = Math.sin(angle);
    [[2, 4], [4, 2], [8, 6], [6, 8]].forEach(([x, y], index) => {
      if (index === 0) shape.moveTo(x * cos - y * sin, x * sin + y * cos);
      else shape.lineTo(x * cos - y * sin, x * sin + y * cos);
    });
    shape.closePath(); shapes.push(shape);
  }
  return new ShapeGeometry(shapes);
}

/** Quatro draws para todo o encontro: borda, fundo, vida e acerto vermelho. */
export class EnemyIndicators {
  readonly root = new Group();
  readonly state: EnemyIndicatorState;
  readonly border: InstancedMesh;
  readonly track: InstancedMesh;
  readonly fill: InstancedMesh;
  readonly hit: InstancedMesh;
  private readonly dummy = new Object3D();
  private readonly point = new Vector3();
  private readonly cameraPoint = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private readonly alertPoint = new Vector3();
  private readonly inverse = new Quaternion();
  private readonly alpha: InstancedBufferAttribute;

  constructor(capacity: number) {
    this.root.name = 'EnemyIndicators'; this.state = new EnemyIndicatorState(capacity);
    const border = capsule(ENEMY_INDICATORS.width, ENEMY_INDICATORS.height);
    const inner = capsule(ENEMY_INDICATORS.innerWidth, ENEMY_INDICATORS.innerHeight), impact = hitGeometry();
    const material = (color: string) => new MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false, fog: false });
    this.border = new InstancedMesh(border, material(ENEMY_INDICATORS.border), capacity);
    this.track = new InstancedMesh(inner, material(ENEMY_INDICATORS.track), capacity);
    this.fill = new InstancedMesh(inner, material(ENEMY_INDICATORS.fill), capacity);
    this.alpha = new InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(DynamicDrawUsage);
    impact.setAttribute('hitAlpha', this.alpha);
    this.hit = new InstancedMesh(impact, new ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { color: { value: new Color(ENEMY_INDICATORS.hit) } },
      vertexShader: `attribute float hitAlpha;varying float alpha;void main(){alpha=hitAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec3 color;varying float alpha;void main(){gl_FragColor=vec4(color,alpha);\n#include <colorspace_fragment>\n}`
    }), capacity);
    for (const [i, mesh] of [this.border, this.track, this.fill, this.hit].entries()) {
      mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 200 + i;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage); this.root.add(mesh);
    }
  }

  /** Chamado depois de atualizar os visuais: mesmo apoio no piso e tranco do inimigo. */
  update(robots: readonly Robot[], visuals: readonly (Group | null)[], camera: Camera, screenHeight: number, delta: number, alerts?: readonly (Group | null)[]) {
    this.right.setFromMatrixColumn(camera.matrixWorld, 0); this.up.setFromMatrixColumn(camera.matrixWorld, 1);
    this.dummy.quaternion.copy(camera.quaternion);
    let bars = 0, hits = 0;
    for (let i = 0; i < robots.length; i++) {
      const robot = robots[i], visual = visuals[i];
      this.state.update(i, robot, delta);
      if (!visual || (!this.state.showBar && !this.state.showHit)) continue;
      this.point.copy(visual.position); this.point.y += enemyIndicatorHeight(robot);
      this.cameraPoint.copy(this.point).applyMatrix4(camera.matrixWorldInverse);
      const pixel = worldPerPixel(camera.projectionMatrix.elements[5], screenHeight, this.cameraPoint.z, 'isOrthographicCamera' in camera);
      const alert = alerts?.[i];
      if (alert) {
        // O aviso de percepção fica ao lado, sem cobrir a barra ou o acerto acima.
        this.alertPoint.copy(this.point).addScaledVector(this.right, ENEMY_INDICATORS.alertOffset * pixel).sub(visual.position);
        alert.position.copy(this.alertPoint.applyQuaternion(this.inverse.copy(visual.quaternion).invert()));
      }
      if (this.state.showBar) {
        this.dummy.position.copy(this.point); this.dummy.scale.setScalar(pixel); this.dummy.updateMatrix();
        this.border.setMatrixAt(bars, this.dummy.matrix); this.track.setMatrixAt(bars, this.dummy.matrix);
        this.dummy.position.addScaledVector(this.right, -(1 - this.state.ratio) * ENEMY_INDICATORS.innerWidth * pixel / 2);
        this.dummy.scale.x = pixel * this.state.ratio; this.dummy.updateMatrix();
        this.fill.setMatrixAt(bars++, this.dummy.matrix);
      }
      if (this.state.showHit) {
        this.dummy.position.copy(this.point).addScaledVector(this.up, pixel * (ENEMY_INDICATORS.hitOffset + ENEMY_INDICATORS.hitRise * this.state.hitProgress));
        this.dummy.scale.setScalar(pixel * (.75 + this.state.hitProgress * .5)); this.dummy.updateMatrix();
        this.hit.setMatrixAt(hits, this.dummy.matrix); this.alpha.setX(hits++, this.state.hitAlpha);
      }
    }
    this.border.count = this.track.count = this.fill.count = bars; this.hit.count = hits;
    this.border.instanceMatrix.needsUpdate = this.track.instanceMatrix.needsUpdate = this.fill.instanceMatrix.needsUpdate = this.hit.instanceMatrix.needsUpdate = true;
    this.alpha.needsUpdate = true;
  }

  dispose() {
    this.border.geometry.dispose(); this.track.geometry.dispose(); this.hit.geometry.dispose();
    for (const mesh of [this.border, this.track, this.fill, this.hit]) {
      (mesh.material as MeshBasicMaterial | ShaderMaterial).dispose(); mesh.dispose();
    }
  }
}
