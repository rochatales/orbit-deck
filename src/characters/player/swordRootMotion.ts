import { MACHETE_COMBO } from '../../combat/melee';
import { comboRootPosition } from './swordClips';

/** Consome cada trecho do passo uma vez, mesmo com vários passos físicos no mesmo quadro.
 * Durante o corte, o corpo mantém a direção inicial; o próximo corte pode seguir uma nova mira. */
export class SwordRootMotion {
  private id = -1;
  private stage = 0;
  private left = 0;
  private readonly from = { x: 0, z: 0 };
  private readonly to = { x: 0, z: 0 };
  x = 0;
  z = 0;
  angle = 0;

  update(id: number, stage: number, left: number, angle: number): boolean {
    this.x = this.z = 0;
    const active = left > 0 || this.left > 0;
    if (id === this.id) {
      if (this.left > 0) this.add(this.stage, this.left, left, this.angle);
    } else if (left > 0) {
      if (this.left > 0) this.add(this.stage, this.left, 0, this.angle);
      this.angle = angle;
      // Após pausa/Dash/troca, a primeira amostra só estabelece a fase; não repete o caminho passado.
      if (this.id !== -1) this.add(stage, MACHETE_COMBO[stage].interval, left, angle);
    }
    this.id = id; this.stage = stage; this.left = left;
    return active;
  }

  private add(stage: number, from: number, to: number, angle: number) {
    comboRootPosition(stage, from, this.from); comboRootPosition(stage, to, this.to);
    const side = this.to.x - this.from.x, forward = this.to.z - this.from.z;
    const sin = Math.sin(angle), cos = Math.cos(angle);
    this.x += side * cos + forward * sin;
    this.z += -side * sin + forward * cos;
  }

  reset() { this.id = -1; this.left = this.x = this.z = 0; }
}
