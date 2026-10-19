# Plano de ação — consolidação de 19/10/2026 e fechamento das Sprints 0 e 2

Pedido do autor em 19/10/2026: consolidar num único ambiente as últimas atualizações (mapa
novo, itens, inimigos e modos de combate) e, depois, fechar as Sprints 0 e 2. O inventário do
que estava fora da integração foi levantado pelo Claude e validado pelo autor, com um ajuste:
**a percepção curta de 3 m do robô não vale para as costas** (item 1.4).

| Campo | Valor |
|---|---|
| Base | `rochatales/horda-survivor` em `a8c7813886a3387fe239e51c74ed384867b17097` |
| Implementa | Codex |
| Revisa | Claude (`claude -p`, ver `docs/AI_WORKFLOW.md` §4) |
| Valida e avança a integração | Autor |
| Regras | `AGENTS.md`. Sem push, sem commit na `main`, sem apagar ou mover arte, backups ou não rastreados do autor. `git add` sempre com caminhos explícitos |

## Prompt para o Codex

```text
Execute o plano /Users/rochatales/Automations/game-workplace/.claude/worktrees/consolidar-sprints-0-2-79d4b8/docs/consolidacao/PLANO_SPRINTS_0_2.md
(depois da etapa 1.1 ele também fica em docs/consolidacao/ na integração) seguindo AGENTS.md, uma fase por vez.
Base rochatales/horda-survivor em a8c7813. Pare ao fim de cada fase marcada com "Parada" e
me entregue o resumo (comandos, resultados, pendências). Não faça push. Não remova worktrees.
```

## Visão geral

| Fase | Conteúdo | Quem | Depende de |
|---|---|---|---|
| 0 | Snapshot externo com manifesto SHA-256 de tudo que não está versionado | Codex | — |
| 1 | Docs do checkout principal e S6.13 commitadas; branch de integração com hordas, caixas e ajuste das costas | Codex | 0 |
| 2 | Fontes finais de arte no Git (colônia B3); fontes grandes só no snapshot, com manifesto | Codex | 0, 1 |
| 3 | Quadro, plano oficial e roteiro manual do Sprint 2 atualizados | Codex | 1, 2 |
| 4 | Revisão cruzada e avanço da integração (`--ff-only`) | Claude, autor | 1–3 |
| 5 | Fechamento da Sprint 0 (S0.4) | Codex prepara, autor joga | 4 |
| 6 | Fechamento da Sprint 2 (S2.12 A, S2.9, S2.12 B, S2.11, validação manual) | Codex, autor | 4 |

---

## Fase 0 — Preservação antes de qualquer commit

Precedente: S0.2 e `docs/consolidacao/RELATORIO.md`. O backup anterior não cobre nada criado
depois dele.

0.1 Conferir espaço livre (≥ 5 GB; havia 154 GB em 19/10) e criar
`/Users/rochatales/Automations/game-workplace-backups/consolidacao-s0-s2-<AAAAMMDD-HHMMSS>/`.

0.2 Copiar, preservando a árvore de cada origem:

| Origem | O que copiar |
|---|---|
| Checkout principal `/Users/rochatales/Automations/game-workplace` | `git diff` (patch da edição local do plano, S6.19) e todos os não rastreados de `git ls-files --others --exclude-standard`, **excluindo `.claude/`** (contém as worktrees do Claude). Inclui `art-source/patrol-unit/`, `art-source/astro-explorer/`, os `MainPlayer*.blend`, imagens soltas da raiz e os docs não rastreados |
| `~/.codex/worktrees/s6-13-caixa-suprimentos/game-workplace` | `git diff` (patch) e não rastreados, exceto `node_modules` |
| `.claude/worktrees/munition-box-update-ee94b6` | `git diff` (patch): é a resolução de referência hordas × caixas (item 1.3) |
| `.claude/worktrees/arte-plataforma-lancamento` | `art-source/mars-colony-plataforma/` inteiro (1,2 GB) e `docs/handoffs/arte-plataforma-lancamento.md` |
| `.claude/worktrees/mars-colony-base-map-9ce462` | `art-source/mars-colony/` (estudos v001–v003, 1,0 GB) |
| `~/.codex/worktrees/s6-12-colonia-v006/game-workplace` | não rastreados, exceto `node_modules` e `__pycache__` |
| `.claude/worktrees/project-review-gameplay-improvements-1a5676` | não rastreados (`AGENTS.md`, `CLAUDE.md`, `docs/*.md`) |

0.3 Gravar `manifest.json` (caminho de origem, caminho no snapshot, tamanho, SHA-256),
reconferir cada hash após a cópia e escrever `RESTORE.md` ("recuperar sempre em pasta nova").
O snapshot é local: registrar que não protege contra perda do disco.

**Parada 0:** caminho do snapshot, total de arquivos e bytes, hashes reconferidos.

---

## Fase 1 — Código num único ambiente

### 1.1 Docs que só existem no checkout principal

No checkout principal, na `rochatales/horda-survivor`. Esses arquivos ficam lá, e o avanço
`--ff-only` da Fase 4 falharia se a branch de integração os trouxesse enquanto continuam
modificados ou não rastreados no checkout.

- `docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md` (edição local da S6.19)
- `docs/sprint-6/PLANO_ATMOSFERA_2_5D.md`, `docs/handoffs/s6.19-planejamento.md`,
  `docs/sprint-6/referencias-atmosfera/`
- `docs/reviews/s2.10.md`
- `docs/sprint-6/referencias-ui/` (citado pelo plano, nunca versionado)
- este plano, copiado de
  `.claude/worktrees/consolidar-sprints-0-2-79d4b8/docs/consolidacao/PLANO_SPRINTS_0_2.md`

Commit: `docs: registra S6.19, revisão da S2.10 e plano de consolidação`. O SHA resultante é a
**base B1** das etapas seguintes. A branch `claude/plano-s6.19-atmosfera` tem versão mais antiga
da S6.19 e **não** entra.

### 1.2 S6.13 — caixas de munição, ainda sem commit

Na worktree do Codex `~/.codex/worktrees/s6-13-caixa-suprimentos/game-workplace`, branch
`rochatales/s6.13-caixa-suprimentos` (base `0c6c3f6`):

- Runtime: `src/app/App.tsx`, `src/combat/{CombatHud,CombatScene}.tsx`,
  `src/combat/simulation.ts`, `src/game/shanghai/layout.ts`, `src/state/useCombatStore.ts`,
  `src/game/props/`, `src/assets/props/caixa-suprimentos/` (GLB e manifesto).
- Testes: `tests/supply-crate.test.mjs`, `tests/caixa-suprimentos.{html,ts}`.
- Fonte final, no padrão da S6.3: `art-source/caixa-suprimentos/` **sem** `renders/` e sem
  `*.blend1` (estes ficam no snapshot).
- Handoff novo, que não existe: `docs/handoffs/s6.13-caixa-suprimentos.md`. Registrar escopo
  aprovado (duas caixas em Shanghai, +48 de reserva por caixa, uma vez por tentativa, E para
  abrir, revelação azul), testes, roteiro e pendências (S4.3 e persistência fora).

`npm test`, `npm run build` e `git diff --check` na própria worktree antes do commit.

### 1.3 Branch de integração da tarefa

Nova worktree a partir de **B1**, branch `rochatales/integracao-2026-10-19-s0-s2`. Nada de
merge direto na `rochatales/horda-survivor`; o autor avança na Fase 4.

1. `git merge --no-ff claude/robot-patrol-queue-hordes-797d36` (`0204158`). Hordas
   10→20→30→40 como modo padrão, correção da fila, aceleração ao avistar e reconhecimento por
   tiro e proximidade. Sem conflito com a integração (conferido com `git merge-tree`).
2. `git merge --no-ff rochatales/s6.13-caixa-suprimentos`. Conflito esperado em
   `src/combat/CombatHud.tsx`, `src/combat/CombatScene.tsx`, `src/combat/simulation.ts` e
   `src/state/useCombatStore.ts` (as hordas trocaram `encounterSize`/`count` por
   `encounter: EncounterChoice`). Reproduzir a resolução já feita em
   `.claude/worktrees/munition-box-update-ee94b6` (patch no snapshot):
   - construtor `CombatSimulation(terrain, encounter, layout, crates)`;
   - `nearCrate: false` no estado inicial e no `restart` com `encounterTotal(s.encounter)`;
   - mensagem de munição: a das hordas para "próxima horda chega com reabastecimento" e a da
     caixa ("Procure as caixas de munição com luz azul e use E…") no caso final.
   Conferência: em `src/` e `tests/`, a árvore resultante deve ser idêntica à cópia de
   referência (`0204158` + patch de referência + arquivos novos da S6.13); diferenças só em
   `docs/` e `art-source/`. Essa cópia foi testada isolada em 19/10:
   **103/103 testes e build verdes**.

### 1.4 Ajuste do autor — costas fora da percepção curta (S2.4)

Decisão de 19/10/2026: a faixa de 3 m (`COMBAT.robot.nearSense`) cobre frente e laterais, não
as costas. Commit próprio na branch de integração.

- `src/combat/config.ts`: novo `COMBAT.robot.nearSenseCos = Math.cos(3 * Math.PI / 4)`. Dentro
  de 3 m o robô percebe o jogador até 135° do rumo, com ponto cego traseiro de 90°. Atualizar o
  comentário de `nearSense` ("laterais e costas" → "frente e laterais; costas cegas").
- `src/combat/simulation.ts`, `canSeePlayer`: com `distance <= nearSense`, exigir
  `cos ≥ nearSenseCos`; fora disso, o cone de 120° até 10 m continua. Parede bloqueia os dois.
  Atualizar o comentário da função.
- **Tiro recebido continua alertando de qualquer direção** (`alertRobot` no acerto). Não muda.
- `tests/combat.test.mjs` (teste "rente pela lateral ou pelas costas…"): o caso `costas`
  passa a esperar `false`; acrescentar 120° → `true` e 160° → `false` dentro de 3 m; manter
  lateral, outra lateral, parede e distância. O teste do primeiro tiro pelas costas fica igual.
- Complementar `docs/handoffs/s2.4-hordas-crescentes.md` com a decisão.

Commit: `fix: S2.4 percepção curta do robô não cobre as costas`.

### 1.5 Verificação da Fase 1

- `npm test` (≥ 103 + novos), `npm run build`, `git diff --check`.
- Navegador (dev): Marte → nave → Shanghai fase 01; hordas por padrão com faixa e linha da HUD;
  duas caixas com luz azul; E abre e soma +48 uma vez; reinício restaura as caixas; seletor
  1/3/5/32/hordas; aproximação por trás a < 3 m sem alerta e pela lateral com alerta. Console
  sem erros. Evidências em disco, em `docs/handoffs/integracao-2026-10-19/`.

**Parada 1:** SHAs de B1, da S6.13 e da ponta da branch de integração; resultados.

---

## Fase 2 — Fontes de arte

Regra: segue o precedente da S6.3 (`art-source/shanghai-fase01`, 14,7 MB versionados). No Git
entram só fontes finais de assets usados no jogo (`.blend` final, scripts, notas, texturas,
exportação); renders, `*.blend1` e estudos ficam no snapshot. Fontes grandes aguardam a decisão
de LFS da S7.10, como já registrado na integração de 18/10.

2.1 **Colônia v006 B3** (fonte do mapa de Marte, hoje só numa worktree sem rastreio). Copiar
para `art-source/mars-colony-plataforma/`: `blend/mars_colony_estudo_v006_plataforma_B3.blend`,
`NOTAS_ESTUDO_v006_B3.md`, `notas/`, `scripts/` (sem `__pycache__`) e `export/previa_v006_B3/`.
Conferir o SHA-256 do `.blend` contra o registrado na S6.12:
`a17aa3c4b557a7e323997429ec7083d1bca5d990c55dcb552c460352f2728dc4` (conferido em 19/10).

2.2 **Só no snapshot, com registro.** Criar `docs/consolidacao/fontes-arte-2026-10-19.json`
com caminho no snapshot, tamanho, SHA-256 e asset de runtime derivado:
- Patrol Unit: `art-source/patrol-unit/` (`.blend` de 36 MB) → `src/assets/enemies/`;
- Explorador r7: branch `claude/horda-survivor-main-player-optimized-fc390c` (`4c0ecfd`,
  `.blend` de 32 MB por rodada; 1,6 GB no total) → `src/assets/characters/player/`. A branch
  continua como está, sem merge;
- Astro Explorer v001 (`art-source/astro-explorer/`): candidato não usado no jogo;
- estudos da colônia v001–v005, renders e `MainPlayer*.blend` da raiz.

2.3 Evidências de portas da S6.12 (worktree do Codex): versionar `jogo-e-preview.json`,
`geometria/` e `scripts/qa-colony-doors{,-run}.mjs`; imagens e vídeos (43 MB) e `tmp-*.mjs`
ficam no snapshot.

2.4 Docs da sessão `project-review-…`: `AGENTS.md`, `CLAUDE.md` e `AI_WORKFLOW.md` já entraram
por cópia revisada; `GAMEPLAY_REVIEW_SPRINTS.md` descreve o MCP Office (`AGENTS.md` veta a
adoção); os dois prompts WorldLabs ficam no snapshot até o autor pedir.

Commit: `chore: versiona fonte da colônia B3 e registra fontes de arte da consolidação`.

---

## Fase 3 — Documentação

3.1 `docs/SPRINT_STATUS.md` (permitido na branch de integração, a pedido do autor):
- registrar como **integradas, sem aceite**: S6.12, S2.12 A, S2.4 (32), S6.1 e S6.3 (18/10) e,
  nesta integração, S2.4 hordas crescentes e S6.13;
- nova linha "Arte · Estudo da plataforma de lançamento v004" (texto proposto no handoff dela);
- "Base consolidada" com o novo SHA, contagem de testes atualizada e entradas no log;
- S6.5 continua estacionada; S6.8 continua com fontes fora do Git.

3.2 Plano oficial: atualizar data e status do cabeçalho; nota na S2.4 (hordas crescentes
antecipam parte da S3.1 a pedido do autor, sem marcar S3.1/S3.4/S3.8); nota de integração na
S2.12 A e na S6.13. **Nenhum checkbox de aceite marcado pelo agente.**

3.3 `docs/sprint-2/VALIDACAO_MANUAL.md` para o estado consolidado: hordas como padrão (com a
opção de 1 robô para os testes básicos), Shanghai fase 01, percepção (cone de 120° a 10 m,
3 m sem costas, tiro alerta), caixas de munição, Patrol Unit de 2,67 m. A linha "Cobertura"
cita as caixas baixas do blockout antigo: trocar pelos objetos da fase 01. Manter os itens
A1–A13 da S2.12 A.

3.4 Handoff `docs/handoffs/integracao-2026-10-19-s0-s2.md`: branches, conflitos e resolução,
ajuste das costas, fontes versionadas e só no snapshot, verificações e pendências do autor.

**Parada 3:** diff dos docs para leitura do autor.

---

## Fase 4 — Revisão e avanço da integração

4.1 Revisão do Claude contra B1, na worktree da integração:
`claude -p "Revise git diff <B1>...HEAD contra AGENTS.md e docs/consolidacao/PLANO_SPRINTS_0_2.md. Liste só problemas reais, com arquivo e linha."`
O Codex corrige; o Claude confirma.

4.2 **Autor**, no checkout principal: `git merge --ff-only rochatales/integracao-2026-10-19-s0-s2`.

4.3 **Autor**, depois de conferir o snapshot: decidir a remoção das worktrees que ficaram
obsoletas. O agente só lista; não remove (regra 6 do `AGENTS.md`).
- Obsoletas: `integracao-shanghai-fase01`, `preview-colonia-r7`, `munition-box-update-ee94b6`,
  `robot-patrol-queue-hordes-797d36`, `s2.10-…`, `claude-s2.9-…`, `s2.12-…`, `s6.1-…`,
  `plano-s6.19-atmosfera`, `instrumentation-setup-…`, `project-review-…`,
  `mars-colony-base-map-…`, `consolidar-sprints-0-2-…`; do Codex, `s2-4-…`, `s6-3-…`,
  `s6-12-…` e `s6-13-…`.
- Mantidas: S6.5 (estacionada), S6.8 (fontes do Explorador) e `arte-plataforma-lancamento`
  (aguarda avaliação do autor).

---

## Fase 5 — Fechamento da Sprint 0 (S0.4)

Pendente desde 28/09: movimento contínuo, diálogo de EDEN e medição de frames.

5.1 **Codex:** atualizar o roteiro de `docs/sprint-0/RELATORIO.md` para o jogo atual (entrada
→ hub de Marte → EDEN → deck; Q/C, E, Esc), com a medição `?perf` da S2.9 (30 s parado e 30 s
em movimento, p50/p95, carregamento, dispositivo, navegador, resolução e DPR). Gerar no
build consolidado a evidência técnica automatizada de carregamento e um JSON `?perf` como
referência. Isso não substitui a sessão manual.

5.2 **Autor:** sessão manual com tecla sustentada, diálogo de EDEN e medição. Fazer na mesma
sessão da medição da S2.9 (6.2).

5.3 **Codex:** registrar os resultados do autor e marcar S0.4 só com o relato dele.

---

## Fase 6 — Fechamento da Sprint 2

Ordem por dependência concreta: a S2.11 move a posição visual do player (câmera, controller e
física; ver quadro) e a S2.12 B fixa a origem do disparo contra essa posição, com
`src/characters/player/PlayerController.tsx` possível nas duas (handoff da S2.9, "Interação com
a S2.11"). Por isso correm em sequência, nunca em paralelo. A S2.12 B vem antes porque corrige
defeitos conhecidos; a S2.11 é investigação e só é adotada após teste do autor.

6.1 **S2.12 A — revisão pendente desde 09/10.** Codex revisa `110922a...82e3229` contra o
item S2.12 A e o `AGENTS.md`; correções numa branch própria a partir da integração atualizada.
Autor valida A1–A13 (`docs/handoffs/s2.12.md`) e decide corrida/deslizamento do Run.

6.2 **S2.9 — medições do autor.** `?perf` A/B em equipamento real: Marte parado e Shanghai fase
01 no pico de 40 robôs (hordas). Codex registra no `docs/handoffs/s2.9.md`.

6.3 **S2.12 B — arma, traçador e colisão** (três etapas, commits separados, decisões de 30/09
no `docs/handoffs/s2.9.md`). Antes de codar, o Codex reconfirma o escopo para a fase 01, porque
as decisões de 30/09 foram feitas no blockout antigo:
- as caixas marrons de `shanghaiWorld.ts` não estão no mapa padrão. Na fase 01, o `layout.json`
  já exporta `minY/maxY` nos 36 obstáculos e traz 8 pontos de `loot` (depósitos e esconderijos)
  sem colisor;
- as caixas de munição da S6.13 entram em `obstacles` e hoje bloqueiam o tiro em altura
  infinita: na etapa 2 recebem `maxY` da altura do modelo;
- a faixa vertical decidida (0–1,575 m) era do robô provisório; o Patrol Unit tem 2,67 m;
- o raio de combate de 0,42 m contra 1,78 m de largura visual (pendência E1).

**Parada 6.3:** proposta de escopo com números (faixa vertical, raio, `maxY` das caixas e
depósitos sólidos ou não) para o autor aprovar. Depois: etapa 1 (origem, mira e traçador),
etapa 2 (colisão com altura), etapa 3 (sólidos e navegação), cada uma com testes, revisão do
Claude e roteiro.

6.4 **S2.11 — interpolação com passo fixo**, depois da S2.12 B. Investigação comparativa; adoção
só após teste do autor nas telas disponíveis. Ausência de 120/144 Hz é limitação registrada.

6.5 **Validação manual do Sprint 2 (autor)** com o roteiro da 3.3, incluindo o roteiro das hordas
(`docs/handoffs/s2.4-hordas-crescentes.md`) e as caixas da S6.13.

6.6 **Codex:** atualizar `docs/sprint-2/RELATORIO.md`, quadro e checkboxes S2.9, S2.11 e S2.12
**somente com o aceite registrado pelo autor**.

---

## Decisões do autor que funcionam como portão

| Decisão | Bloqueia | Origem |
|---|---|---|
| E1 · Raio do robô (0,42 m; proposta ≈ 0,8 m, conferir vielas ≥ 2,5 m) | S2.12 B etapa 2 | Integração de 18/10 |
| Faixa vertical do Patrol Unit (2,67 m) | S2.12 B etapa 2 | Handoff S2.9 |
| Aceite de +24% ao avistar e 3 m sem costas | Aceite da S2.4 | Handoff das hordas |
| LFS ou Git comum para fontes grandes | Fontes da Fase 2.2 | S7.10 |
| E3 · Ocultação, licença da fonte e densidade da S6.3 | Não bloqueia S0/S2 | Handoff S6.3 |
| E4 · Escadas do foguete | Não bloqueia S0/S2 | Handoff S6.12 |

## Fora deste plano

S6.5 (estacionada), S6.19 (só o planejamento entra na 1.1), a avaliação do estudo da plataforma
de lançamento e os Sprints 3 a 7.
