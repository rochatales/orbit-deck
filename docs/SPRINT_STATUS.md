# Quadro de execução — Horda Survivor

> Quem está fazendo o quê, em qual base e branch. O status oficial de cada
> item (checkbox) continua em
> [HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md](./HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md).
>
> **Quem edita:** só o autor, ou um agente a pedido do autor, na branch de
> integração. Agentes não editam este quadro nas branches de tarefa; o
> resultado vai no handoff da tarefa (`docs/handoffs/<tarefa>.md`).
>
> Atualizado em 07/10/2026.

## Situação dos sprints

| Sprint | Situação | Pendências |
|---|---|---|
| 0 · Preservação e baseline | ◐ Preparação concluída | S0.4 parcial: movimento contínuo, diálogo de EDEN e medição de frames sem validação manual |
| 1 · Base local e viagem Marte–Shanghai | ✅ Implementado (S1.1–S1.10) | — |
| 2 · Movimento, tiro e sobrevivência | ◐ Núcleo implementado (S2.1–S2.8) | Validação visual do autor ([roteiro](./sprint-2/VALIDACAO_MANUAL.md)); S2.9 integrada, medições do autor pendentes; S2.10 integrada e aceita pelo autor; S2.12 A em implementação; S2.11 |
| 3 · Ondas, categorias e dispositivos | 🔲 Não iniciado | Depende da validação do Sprint 2 |
| 4 · Loot, orientação e retorno | 🔲 Não iniciado | — |
| 5 · Construção da máquina | 🔲 Não iniciado | — |
| 6 · Estética dos elementos | 🔲 Não iniciado | UI planejada: S6.6 e S6.14–S6.18; implementação depende do ciclo funcional/playtest do Sprint 5 |
| 7 · Texturas, materiais e entrega | 🔲 Não iniciado | Acabamento de UI planejado em S7.11 |

Testes automatizados: **36** (`npm test`) na branch de integração após o merge da S2.10 (20 do relatório do Sprint 2 + 11 da instrumentação S2.9 + 5 da posição transitória S2.10).

Legenda: 🔲 não iniciado · ◐ em andamento/parcial · ✅ implementado ·
⛔ bloqueado · ⏸ estacionado. "Implementado" não significa aprovado pelo autor.

## Base consolidada

| Campo | Valor |
|---|---|
| Branch de integração | `rochatales/horda-survivor` |
| Commit de consolidação do piloto | `a40dac41e4637156140e304454f6b4f3afdc2ba0` |
| Situação | ✅ Piloto e documentos de colaboração consolidados localmente; sem push ou merge |
| Próxima ação | Atribuir uma tarefa, fixando o SHA da ponta da branch de integração; essa ponta inclui o piloto e o registro posterior deste quadro |
| Commit-base do conteúdo do piloto | `a40dac41e4637156140e304454f6b4f3afdc2ba0` |
| Referência para nova tarefa | `rochatales/horda-survivor`; resolver `git rev-parse rochatales/horda-survivor` e registrar o SHA imutável na linha da tarefa antes de criar a worktree |

## Tarefas

Preencha uma linha por tarefa antes de iniciar. "Base" é o commit/branch do
qual a worktree parte e contra o qual a revisão compara.

| Tarefa | Base | Branch | Arquivos principais | Implementa | Revisa | Estado |
|---|---|---|---|---|---|---|
| S6.3 Shanghai fase 01 — mapa ampliado e primeira passada de texturas | `ec845e7f44763e7684589c1e50b1a544f3120e58` | `rochatales/s6.3-shanghai-fase01` | `art-source/shanghai-fase01/`, `src/assets/shanghai-fase01/`, `src/game/shanghai*`, `src/game/config.ts`, `src/combat/navigation.ts`, testes de mundo/navegação, `docs/sprint-6/referencias-shanghai/`, `docs/handoffs/s6.3-shanghai-fase01.md`; câmera só após S6.12/autorização; consumidores de spawns só após S2.4 | Codex | Autor | ◐ Atribuída em 18/10/2026. Autor antecipa fase 01 (102 × 108 m) e texturas iniciais antes de S5.8; não substitui Sprint 7. S6.12 e S2.4 não integradas: respeitar arquivos reservados; pontos de spawn/patrulha em módulo novo. Sem merge/push |
| S2.4 / S2.8 Ajuste de horda e patrulha solicitado em 17/10/2026 | `dfd5894e4fb55a3bd2e27a36bf3037278b7f2a59` | `rochatales/s2.4-horda-patrulha` | `src/combat/{config.ts,simulation.ts,CombatHud.tsx}`, `src/state/useCombatStore.ts`, `tests/combat.test.mjs`, `docs/handoffs/s2.4-horda-patrulha.md` | Codex | Autor | ◐ Implementada em `f0c35c5`, worktree gerenciada `s2-4-horda-patrulha/game-workplace`; prévia na porta 5179. 38 testes/build/diff-check verdes. 32 robôs em patrulha, aquisição por visão. Duração de ~30 s, desempenho e jogabilidade pendentes de playtest; sem merge |
| S2.9 Instrumentação de medição | `2bb1f2bab525776b97f8e76126ebe3adffd65aa7` | `claude/s2.9-instrumentacao` | `src/dev/perf/*`, `src/app/GameCanvas.tsx`, `tests/perf-metrics.test.mjs`, `docs/handoffs/s2.9.md` | Claude | Codex | ◐ **Integrada** em `ab9afc4` (merge `--no-ff` de `claude/s2.9-instrumentacao`, autor, 07/10/2026). R4 entregue em `0495d3f` e confirmada pelo Codex; 31 testes, build e diff-check verdes. Validação manual parcial: medições e JSON A/B do autor pendentes ([handoff](./handoffs/s2.9.md)) |
| S2.10 Posição transitória do player | `ab9afc43c4a7fb38375d45c86b305646c1f2f8ae` (`rochatales/horda-survivor`, merge da S2.9) | `claude/s2.10-posicao-transitoria` | `src/state/useGameStore.ts`, novo `src/state/playerTransient.ts`, `src/state/useExpeditionStore.ts`, `src/characters/player/PlayerController.tsx`, `src/characters/player/PlayerAim.tsx`, `src/scene/CameraRig.tsx`, `src/world/OfficeMap.tsx`, `src/combat/CombatScene.tsx`, `src/app/App.tsx`, testes, `docs/handoffs/s2.10.md` | Claude | Codex | ✅ **Integrada** em `110922a` (merge `--no-ff` de `claude/s2.10-posicao-transitoria`, executado pelo Codex com autorização do autor, 09/10/2026). Aceite do autor: R1–R8 e comparação `?perf` R10 ([handoff](./handoffs/s2.10.md)). 36 testes |
| S2.11 Interpolação com passo fixo | a definir | — | — | — | — | 🔲 |
| S2.12 Ajustes de controle do autor (A: movimento pela mira e Explorador da S6.8; B: arma, traçador e colisão) | `110922afac0a981eaf32a9ba45905f4a1e5198e2` (`rochatales/horda-survivor`, merge da S2.10) | `claude/s2.12-movimento-mira-explorador` | Parte A: `src/characters/player/{PlayerController,PlayerAim,LocomotionController,PlayerModel,playerConfig,relativeMovement}.ts(x)`, `src/characters/{GLBCharacter.tsx,characterAssetConfig.ts}`, `src/controls/keyboardControls.ts`, `src/app/App.tsx`, novo `src/assets/characters/player/` (GLB r7 com os cinco clipes, asset separado), `tests/`, `docs/sprint-2/VALIDACAO_MANUAL.md`, `docs/handoffs/s2.12.md`. Parte B: arquivos do handoff da S2.9, confirmados na atribuição dela | Claude | Codex | ◐ Parte A em implementação. Asset: Explorador **r7** (`4c0ecfd`, `export/explorador_v2_candidato_r7.glb`, `143a14d0…`), última versão validada, com Idle, Run, Talk, Fall e Backward; preserva as correções posteriores à r6 |
| S6.12 Colônia de Marte v006 B3 no jogo | `b1594714b00e7ead84e14b6a9c7bc9b7e89dd436` | `rochatales/s6.12-colonia-v006` | `src/game/marsWorld.ts`, `src/scene/OfficeScene.tsx`, `src/scene/CameraRig.tsx`, novo `src/scene/marsColony/`, `src/assets/colony-v006*`, scripts de exportação, testes e handoff | Codex | Autor | ◐ Atribuída em 17/10/2026; fonte v006 B3 escolhida pelo autor; fontes Blender preservadas; sem merge. S2.12 e S6.5 sem edição nesta tarefa |
| S6.5 Prévia isolada do laboratório v003 | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) | `rochatales/s6.5-lab-preview` | `src/app/App.tsx`, `src/app/GameCanvas.tsx`, `src/scene/`, `src/world/createOfficeMap.ts`, `src/assets/colony-preview-lab-v003.*`, `tests/lab-preview.test.mjs`, `docs/handoffs/s6.5-lab-preview.md` | Codex | Autor | ⏸ Estacionada por decisão do autor (07/10/2026): branch e worktree preservadas em `ee2213e`, sem integração nem descarte; fora da base da S2.10. Ao retomar, migrar seu leitor de posição (`LabPreview.tsx`) para a fonte da S2.10 e coordenar `App.tsx`/`GameCanvas.tsx`/`src/scene/` |
| S6.8 Explorador v2 otimizado (só explorador; asset e clipe Backward) | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) | `claude/horda-survivor-main-player-optimized-fc390c` | `art-source/explorador-v2/**`, `docs/handoffs/s6.8-explorador-v2.md` | Claude | Autor | ◐ r6 (`3911d16`), r6b com Backward (`144b1f4`) e **r7** (`4c0ecfd`: proporções, mãos, capacete, junções; cinco clipes) entregues; r7 validada pelo autor como base da integração; GLB ativo intacto; integração no jogo pela S2.12; sem merge |

Planejamento de UI solicitado pelo autor em 30/09/2026, registrado na
branch de integração: [plano de ação](./sprint-6/PLANO_UI.md) e
[handoff do planejamento S6.6](./handoffs/s6.6-ui-planejamento.md).
S6.14–S6.18 e S7.11 estão no plano oficial, sem atribuição ou branch de
implementação iniciada. Registrar uma linha por tarefa e resolver o SHA
consolidado antes de executá-las. Coordenar `src/app/App.tsx` com a prévia
S6.5 e executar tarefas de UI que compartilhem App/CSS em sequência.

Regra de conflito: duas tarefas simultâneas não podem listar os mesmos
arquivos principais. S2.10 e S2.11 tocam câmera, controller e física, então
rodam em sequência, não em paralelo.

## Log

- 18/10/2026 · codex · S6.3 registrada por solicitação do autor, base `ec845e7`. Decisão explícita: antecipar Shanghai fase 01 e texturas iniciais; manter acabamento S7 e aprovação pendentes. Edição local do plano oficial preservada fora deste commit.

- 09/10/2026 · claude · a pedido do autor: S2.10 registrada como integrada em `110922a` (merge executado pelo Codex com autorização do autor) e aceita pelo autor (R1–R8 e R10); checkbox marcado no plano. S2.12 parte A atribuída com base `110922a`, branch `claude/s2.12-movimento-mira-explorador`; asset da integração passa a ser o Explorador r7 (`4c0ecfd`), com os cinco clipes. Sem merge ou push.

- 07/10/2026 · claude · a pedido do autor: S2.12 registrada com escopo ampliado (A: movimento pela mira e integração do Explorador r6 com Backward; B: arma, traçador e colisão). Contrato de movimento atualizado na regra 4 do `AGENTS.md`, no plano (S2.1, S2.12, defaults e matriz de regressão) e na revisão técnica. S2.12 aguarda o merge da S2.10 por dependência concreta (ver linha). Linha da S6.8 registrada; arte e Backward seguem na S6.8. Sem código, merge ou push.

- 07/10/2026 · claude · a pedido do autor: S2.9 registrada como integrada em `ab9afc4` (merge feito pelo autor), com validação manual parcial. S2.10 atribuída com base `ab9afc43c4a7`, branch `claude/s2.10-posicao-transitoria`; Claude implementa, Codex revisa. S6.5 segue estacionada. Sem push.

- 07/10/2026 · claude · a pedido do autor, consolidação documental na integração: quadro e plano (planejamento de UI), revisão R4 da S2.9, handoff S6.6 e plano de UI. S2.9 com R4 entregue e verificada, validação manual parcial e merge pendente; S2.10 registrada e bloqueada até o merge; S6.5 estacionada e fora da base da S2.10. Imagens de referência de UI e demais artes não rastreadas preservadas fora do commit. Sem merge, push ou código.

- 30/09/2026 · codex · planejamento das interfaces a pedido do autor: dois estilos visuais, S6.6 detalhada, S6.14–S6.18 e S7.11 adicionadas como pendentes. Referências preservadas em `docs/sprint-6/referencias-ui/`; runtime e atribuições existentes preservados. Sem aprovação visual ou merge.

- 29/09/2026 · claude · documentos de colaboração alinhados ao Horda
  Survivor (`AGENTS.md`, `CLAUDE.md`, `docs/AI_WORKFLOW.md`, este quadro).
  Nenhum código alterado.

- 29/09/2026 · codex · consolidação local `a40dac41e463`: 20 testes e build passaram; 116 arquivos arquivados verificados; 93 artes soltas preservadas e excluídas. Quatro documentos do Claude incorporados por cópia revisada. Sem push, PR, merge ou tarefas iniciadas. Relatório: [consolidação](./consolidacao/RELATORIO.md).

- 29/09/2026 · codex · revisão S2.9 (`2d25d42`): 26 testes/build/diff-check passaram; três correções de precisão das medições solicitadas. [Revisão detalhada](./reviews/s2.9.md). O piloto integrado permanece com 20 testes; os 26 pertencem à branch da tarefa.
- 29/09/2026 · codex · segunda revisão S2.9 (`0461134`): 30 testes/build/diff-check passaram; prontidão, cobertura, sombras e troca de mapa foram corrigidas. R4 pendente: primeiro intervalo da amostra inclui tempo anterior ao início. [Revisão R4](./reviews/s2.9-r4.md).
