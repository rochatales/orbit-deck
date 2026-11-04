import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

const { SwordRootMotion } = loadSource('src/characters/player/swordRootMotion.ts');
const { MACHETE_COMBO } = loadSource('src/combat/melee.ts');
const { SWORD_CLIPS } = loadSource('src/characters/player/swordClips.ts');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('Espada: três passos completos seguem a translação da fonte; W/S não acrescentam velocidade de corrida', () => {
  for (const rate of [30, 60, 144]) {
    const motion = new SwordRootMotion(); let x = 0, z = 0;
    for (let stage = 0; stage < 3; stage++) {
      const interval = MACHETE_COMBO[stage].interval;
      assert.equal(motion.update(stage + 1, stage, interval, 0), true);
      x += motion.x; z += motion.z;
      for (let frame = 1; frame <= Math.ceil(interval * rate); frame++) {
        const left = Math.max(0, interval - frame / rate);
        assert.equal(motion.update(stage + 1, stage, left, Math.PI), true, 'mantém o apoio na direção inicial');
        x += motion.x; z += motion.z;
        assert.equal(motion.angle, 0);
        // Passos físicos repetidos com o mesmo tempo da simulação não duplicam o avanço.
        motion.update(stage + 1, stage, left, 2); close(motion.x, 0); close(motion.z, 0);
      }
    }
    close(x, SWORD_CLIPS.rootSide.at(-1)); close(z, SWORD_CLIPS.rootForward.at(-1));
    assert.ok(z < 2 && z > 1.9, `combo avança ${z} m, em vez de 8,19 m da corrida`);
    assert.equal(motion.update(3, 2, 0, 0), false, 'terminou: libera corrida/recuo');
  }
});

test('Espada: mudança de corte conclui o passo anterior; mira só redireciona o próximo apoio', () => {
  const motion = new SwordRootMotion(), first = SWORD_CLIPS.cuts[0], end = Math.round(first.end * SWORD_CLIPS.fps);
  motion.update(1, 0, MACHETE_COMBO[0].interval, 0);
  motion.update(1, 0, .01, 1); const beforeX = motion.x, beforeZ = motion.z;
  motion.update(2, 1, MACHETE_COMBO[1].interval, Math.PI / 2);
  close(beforeX + motion.x, SWORD_CLIPS.rootSide[end]); close(beforeZ + motion.z, SWORD_CLIPS.rootForward[end]);
  assert.equal(motion.angle, Math.PI / 2);
  motion.update(2, 1, 0, 0);
  const secondEnd = Math.round(SWORD_CLIPS.cuts[1].end * SWORD_CLIPS.fps);
  close(motion.x, SWORD_CLIPS.rootForward[secondEnd] - SWORD_CLIPS.rootForward[end]);
  close(motion.z, -(SWORD_CLIPS.rootSide[secondEnd] - SWORD_CLIPS.rootSide[end]));
});

test('Espada: Dash, troca, pausa e reinício descartam deslocamento pendente, sem impulso ao retomar', () => {
  const motion = new SwordRootMotion();
  motion.update(1, 0, .65, 0); motion.update(1, 0, .3, 0); motion.reset();
  close(motion.x, 0); close(motion.z, 0);
  assert.equal(motion.update(1, 0, 0, 0), false);
  motion.update(2, 0, .65, 0); close(motion.x, 0); close(motion.z, 0);
  motion.update(2, 0, .4, 0);
  motion.update(2, 0, .3, 0); const x = motion.x, z = motion.z;
  motion.reset(); motion.update(2, 0, .4, 0);
  close(motion.x, 0); close(motion.z, 0);
  motion.update(2, 0, .3, 0);
  close(motion.x, x); close(motion.z, z);
});
