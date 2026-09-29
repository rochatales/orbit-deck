# AGENTS.md — Horda Survivor

Instruções compartilhadas para agentes de código. O Codex lê este arquivo; o
Claude Code lê via `CLAUDE.md`, que importa este. É a fonte única de
convenções para os dois agentes.

## Projeto

Protótipo local de exploração e combate. A humanidade vive em Marte (hub) e
envia um explorador às ruínas da Terra; Shanghai é a primeira missão. EDEN é
a guia, pelo rádio. Não há backend: o produto anterior (MCP Office, com
agentes, reuniões, decks e servidor) foi arquivado em `archive/mcp-office/` e
não integra o runtime.

Stack: React 18 + Vite 4 + TypeScript + three 0.165 + `@react-three/fiber` 8 +
drei 9 + `@react-three/rapier` 1.5 + zustand 5. Upgrades de stack não fazem
parte do piloto.

## Fontes oficiais

| Assunto | Documento |
|---|---|
| Plano, numeração de tarefas e status oficial | `docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md` |
| Melhorias técnicas selecionadas e limites | `docs/GAMEPLAY_REVIEW_HORDA_SURVIVOR.md` |
| Decisões de design | `docs/HORDA_SURVIVOR_AUDITORIA_E_PLANO.md` |
| Relatórios e validação manual por sprint | `docs/sprint-N/` |
| Tarefas em andamento (quem, onde, base) | `docs/SPRINT_STATUS.md` |
| Fluxo Claude + Codex | `docs/AI_WORKFLOW.md` |

Use apenas a numeração do plano oficial (S0.x, S1.x, S2.9 etc.). A sequência
antiga de sprints 0–8 de `docs/GAMEPLAY_REVIEW_SPRINTS.md` descreve o MCP
Office e **não** deve ser adotada. Os docs do MCP Office (`ROADMAP.md`,
`CHARACTERS.md` etc.) são históricos.

## Comandos

Dependências pelo lockfile do projeto (pnpm). Execução via npm scripts:

```bash
npm run dev -- --host 127.0.0.1 --port 5178
npm test          # node --test tests/*.test.mjs
npm run build     # tsc + vite build
git diff --check
```

`tests/browser-smoke.html` é fixture de QA de desenvolvimento; não é
aprovação de jogabilidade nem benchmark de GPU.

## Onde está cada coisa

- `src/game/` regras, configuração, sessão e geração dos mapas (Marte, Shanghai)
- `src/combat/` simulação de combate, navegação por grade, rifle, robôs, HUD
- `src/characters/player/` controller, mira, movimento relativo ao olhar
- `src/physics/`, `src/scene/`, `src/world/` física, câmera e geometria
- `src/state/useExpeditionStore.ts` sessão e save versionado · `useCombatStore.ts`
- `src/npcs/scripts/eden.ts` falas de EDEN
- `tests/` testes automatizados (`*.test.mjs`) e fixture de navegador
- `archive/` material preservado: não editar, não reativar

## Regras de implementação

1. Estado frequente (posição, disparos, inimigos) fica na simulação mutável,
   fora de renders React. A UI recebe só mudanças relevantes.
2. Não alocar objetos dentro de `useFrame`/passo de simulação.
3. Colisão e tiro usam colisores simples; a malha dos GLBs nunca é colisor.
4. Preservar os contratos aprovados: movimento relativo ao olhar
   (W avança, S recua, A/D laterais), Q/C gira a câmera, R recarrega, E
   interage, Escape fecha/pausa.
5. Não reintroduzir módulos, stores ou dependências do MCP Office.
6. Não apagar nem mover assets-fonte, backups ou arquivos não rastreados
   do autor. Nada de limpeza destrutiva ou reescrita de histórico.
7. Siga o estilo do arquivo editado. Textos de jogo e docs em pt-BR.

## Critério de conclusão de uma tarefa

- Testes relevantes adicionados ou atualizados, e `npm test` verde.
- `npm run build` e `git diff --check` verdes.
- Resultado registrado no handoff da tarefa (ver `docs/AI_WORKFLOW.md`),
  com o que foi verificado e o que ficou pendente.
- Testes visuais e aprovação da jogabilidade são do autor. O agente entrega
  roteiro de verificação e nunca marca esses itens como aprovados.

## Git

- Nunca commitar na `main` nem fazer merge. Nenhum merge automático.
- Uma tarefa = uma branch = uma worktree, criada a partir da **base
  consolidada** indicada no quadro, nunca de `main` por padrão.
- Branch do Claude: `claude/<tarefa>-<tema>`. Branch do Codex: `rochatales/<tarefa>-<tema>`, conforme convenção do ambiente.
- Não editar código de uma tarefa atribuída ao outro agente.
- Commits pequenos: `tipo: descrição` (feat, fix, perf, refactor, test, docs, chore).
