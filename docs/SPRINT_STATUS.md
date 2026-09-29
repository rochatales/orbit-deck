# Quadro de execução — Horda Survivor

> Quem está fazendo o quê, em qual base e branch. O status oficial de cada
> item (checkbox) continua em
> [HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md](./HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md).
>
> **Quem edita:** só o autor, ou um agente a pedido do autor, na branch de
> integração. Agentes não editam este quadro nas branches de tarefa; o
> resultado vai no handoff da tarefa (`docs/handoffs/<tarefa>.md`).
>
> Atualizado em 29/09/2026.

## Situação dos sprints

| Sprint | Situação | Pendências |
|---|---|---|
| 0 · Preservação e baseline | ◐ Preparação concluída | S0.4 parcial: movimento contínuo, diálogo de EDEN e medição de frames sem validação manual |
| 1 · Base local e viagem Marte–Shanghai | ✅ Implementado (S1.1–S1.10) | — |
| 2 · Movimento, tiro e sobrevivência | ◐ Núcleo implementado (S2.1–S2.8) | Validação visual do autor ([roteiro](./sprint-2/VALIDACAO_MANUAL.md)); S2.9–S2.12 |
| 3 · Ondas, categorias e dispositivos | 🔲 Não iniciado | Depende da validação do Sprint 2 |
| 4 · Loot, orientação e retorno | 🔲 Não iniciado | — |
| 5 · Construção da máquina | 🔲 Não iniciado | — |
| 6 · Estética dos elementos | 🔲 Não iniciado | — |
| 7 · Texturas, materiais e entrega | 🔲 Não iniciado | — |

Testes automatizados: **20** (`npm test`), registrados no relatório do Sprint 2.

Legenda: 🔲 não iniciado · ◐ em andamento/parcial · ✅ implementado ·
⛔ bloqueado. "Implementado" não significa aprovado pelo autor.

## Base consolidada

| Campo | Valor |
|---|---|
| Branch de integração | `rochatales/horda-survivor` |
| Último commit | `99ab0d7` (referência do Sprint 0) |
| Situação | ⛔ Trabalho dos Sprints 1–2 ainda **não commitado** na branch |
| Ação necessária | Consolidar esse trabalho num commit na branch de integração, com seleção explícita de arquivos (sem `git add .`), sem apagar nem mover artes soltas. Registrar aqui o hash. Só depois se criam worktrees de tarefa a partir desse commit |
| Commit-base | _a registrar após a consolidação_ |

## Tarefas

Preencha uma linha por tarefa antes de iniciar. "Base" é o commit/branch do
qual a worktree parte e contra o qual a revisão compara.

| Tarefa | Base | Branch | Arquivos principais | Implementa | Revisa | Estado |
|---|---|---|---|---|---|---|
| S2.9 Instrumentação de medição | a definir após consolidação | — | — | — | — | 🔲 |
| S2.10 Posição transitória do player | a definir | — | — | — | — | 🔲 |
| S2.11 Interpolação com passo fixo | a definir | — | — | — | — | 🔲 |
| S2.12 Ajustes de controle do autor | a definir | — | — | — | — | 🔲 Aguarda feedback do autor |

Regra de conflito: duas tarefas simultâneas não podem listar os mesmos
arquivos principais. S2.10 e S2.11 tocam câmera, controller e física, então
rodam em sequência, não em paralelo.

## Log

- 29/09/2026 · claude · documentos de colaboração alinhados ao Horda
  Survivor (`AGENTS.md`, `CLAUDE.md`, `docs/AI_WORKFLOW.md`, este quadro).
  Nenhum código alterado.
