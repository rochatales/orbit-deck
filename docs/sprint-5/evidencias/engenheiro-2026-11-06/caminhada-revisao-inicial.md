**Revisão de `97f1994`: encontrei 1 defeito novo, de baixa frequência, e sugiro corrigir antes do fechamento.** Ele vem de leitura do código, sem reprodução em execução, porque você limitou a execução a `tests/engineer.test.mjs`. Esse arquivo passou 20/20, mas não cobre o caso. Não editei nada nem fiz commit.

## Defeito: novo esbarrão durante o blend congela a reação
**Local:** `src/npcs/engineerRig.ts:61`

Um novo esbarrão nos 0,35 s de saída de `ShovedReaction` não reinicia o clipe. O Engenheiro fica parado na pose final por cerca de 4,27 s (`bumpDuration`), em vez de reagir de novo. O código anterior usava `next.reset()` e, sem `clipTime`, reiniciava em 0.

**Como acontece:**
1. `ShovedReaction` é o único one-shot sem `clipTime`, que a rotina zera em `engineerRoutine.ts:83` e não define no ramo das linhas 114-117.
2. O clipe termina em `time = duration`, e a rotina passa para Idle ou Walk. O peso dele ainda é maior que 0 durante o blend.
3. O jogador que já saiu de 1,4 m (rearme na linha 98) volta para menos de 0,78 m dentro da janela, e `bumpLeft` recomeça (linhas 111-112).
4. `next.reset()` zera o tempo, mas `next.time = state.clipTime ?? (previousWeight > 0 ? previousTime : 0)` o devolve a `duration`.
5. No `mixer.update(delta)` seguinte, o `LoopOnce` vê `time >= duration` e, com `clampWhenFinished`, pausa a ação (`three/src/animation/AnimationAction.js:510-526`).

**Alcance:** a janela é estreita, mas a 4,2 m/s o jogador cobre esses 0,62 m em cerca de 0,15 s. Rondar o NPC já pode provocar o caso. Não há efeito em dano ou campanha.

**Correção sugerida:** preservar o tempo anterior só em clipes que repetem.
```ts
next.time = state.clipTime ?? (previousWeight > 0 && !ONE_SHOT.has(state.animation) ? previousTime : 0);
```
Reiniciar em 0 com peso residual pode dar um salto curto, proporcional a esse peso. Ainda assim, é bem melhor que 4,27 s congelado.

**Regressão a incluir em `tests/engineer.test.mjs`:** `ShovedReaction` até o fim, Idle por 0,1 s e `ShovedReaction` de novo. O teste verifica que `time` fica abaixo de `duration` e continua avançando. O teste atual de retomada não pega isso, porque só interrompe Walk, que tem `clipTime`.

## Hipótese não reproduzida
**Deslize horizontal dos pés no Walk corrigido** (`src/npcs/engineerWalk.ts:15-24`): a correção é distribuída por todos os ossos, inclusive as pernas, e pode criar um pequeno deslize durante o apoio. Os testes novos medem a emenda e a penetração no piso, não o deslize. O teste de deriva (`tests/engineer.test.mjs:76`) usa o clipe original, não o preparado. Sem medida não há defeito a apontar, mas vale olhar o contato dos pés no roteiro do autor.

## Conferido, sem defeito
- **Continuidade:** quaternion e posição fecham nas pontas, com caminho curto no slerp e valores idênticos após o float32. A emenda do quadril também fecha depois da reamostragem.
- **Tempo:** `clipTime` além da duração de Walk dá a volta certa quando `delta > 0`. Transições só ocorrem com `dt > 0`, então a pausa não expõe esse tempo sem wrap.
- **Pesos:** a soma permanece 1 em blends interrompidos, porque cada transição recomeça dos pesos reais. A pose que sai fica congelada e `reset()` a libera na volta. Nos casos com o ator em movimento, só `StartWalking→Walk` congela um clipe, e ele já está no fim.
- **Pausa:** com `dt = 0`, `blendTime`, pesos e tempos não mudam, e a rotina não avança.
- **Imutabilidade:**
  - O clipe é copiado antes de qualquer alteração, e os ossos voltam ao estado original quando o mixer temporário para.
  - `computeBoundingBox` grava só na malha da instância, nunca na geometria compartilhada. A caixa que sobra em cada malha não afeta o culling, que usa a esfera.
- **Descarte:** `uncacheRoot` libera as ações e o clipe preparado, que pertence só à instância. O mixer temporário é limpo em `finally`.
- **Alocação:** não há alocações novas no passo de `update`. A preparação cara roda só na construção do rig.
