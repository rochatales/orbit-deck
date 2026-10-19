# Consolidação S0–S2 — Fase 1 / Parada 1

Data: 19/10/2026. Implementação: Codex, a pedido do autor. Fase 0 conferida pelo
autor antes desta execução. Nenhum aceite de jogabilidade foi marcado.

## Branches e commits

| Etapa | Branch | Commit |
|---|---|---|
| Base inicial | `rochatales/horda-survivor` | `a8c7813886a3387fe239e51c74ed384867b17097` |
| 1.1 · B1 documental | `rochatales/horda-survivor` | `1637449be4880ac2c7021b5ebe931c6b55e36a43` |
| 1.2 · S6.13 | `rochatales/s6.13-caixa-suprimentos` | `239d59f22b35fa85d79283516d99b8bb958a99fa` |
| 1.3 · Hordas | `rochatales/integracao-2026-10-19-s0-s2` | merge `83e93de`, origem `020415816c90ed71ffedc6432a47e4bce7ef825c` |
| 1.3 · Caixas | `rochatales/integracao-2026-10-19-s0-s2` | merge `5adee8a` |
| 1.4 · Costas cegas | `rochatales/integracao-2026-10-19-s0-s2` | `c1a4be0235958ca4e0de0ad90aef98768274ace8` |

Worktree nova, criada pela ferramenta gerenciada explicitamente sobre B1:
`/Users/rochatales/.codex/worktrees/integracao-2026-10-19-s0-s2/game-workplace`.
O commit que contém este registro e as evidências sucede o ajuste das costas;
resolver `git rev-parse rochatales/integracao-2026-10-19-s0-s2` para a ponta entregue.
A integração principal permanece em B1. O avanço `--ff-only` pertence ao autor,
na Fase 4.

## Conteúdo e resolução

1. Docs locais da S6.19, revisão da S2.10, referências de atmosfera/UI e plano de
   consolidação registrados no checkout principal. O plano foi copiado byte a
   byte. Apenas espaços ao fim das linhas de prompts em
   `docs/sprint-6/referencias-ui/conceitos-originais.md` foram removidos para
   passar em `git diff --cached --check`; o snapshot preserva a versão anterior.
2. S6.13 commitada na própria worktree, com fonte final, runtime, testes, prévia
   e novo [handoff](../s6.13-caixa-suprimentos.md). `renders/`, `*.blend1` e o
   link local de dependências dessa worktree foram preservados fora do commit.
3. Dois `git merge --no-ff` executados somente na branch da tarefa, conforme
   autorização explícita da Fase 1.3. Hordas sem conflito; caixas com os quatro
   conflitos previstos: `CombatHud.tsx`, `CombatScene.tsx`, `simulation.ts` e
   `useCombatStore.ts`. Resolução reproduzida da worktree `munition-box-update`:
   `encounter` no construtor, `nearCrate: false` no início/restart com
   `encounterTotal`, mensagens de reabastecimento por horda e de caixas no caso final.
4. Antes do ajuste de percepção, **114 arquivos de `src/` e `tests/` idênticos
   por SHA-256** à referência `0204158` + patch preservado + arquivos novos da
   S6.13. [Manifesto de paridade](paridade-pre-ajuste.json). O patch de referência
   foi reconferido byte a byte contra o snapshot da Fase 0.
5. Commit separado restringe a percepção de 3 m a 135° de cada lado do rumo:
   frente/laterais perceptíveis, 90° de ponto cego traseiro. Cone frontal de
   120° até 10 m e alerta por tiro recebido de qualquer direção preservados.
   Teste existente atualizado e um teste de fronteiras acrescentado; decisão
   registrada no [handoff das hordas](../s2.4-hordas-crescentes.md).

## Comandos e resultados

- Preparação: `git status`, `git rev-parse`, `git ls-tree`, `git diff`, conferência
  SHA-256 contra o snapshot e `git add -- <caminhos explícitos>`.
- B1: `git diff --cached --check` passou após a normalização descrita acima.
- S6.13, na própria worktree: `npm test` **94/94**, `npm run build` e
  `git diff --check`/`git diff --cached --check` passaram.
- Nova worktree: `git switch -c rochatales/integracao-2026-10-19-s0-s2`, os dois
  merges previstos e commit separado de correção da percepção.
- Dependências: `pnpm install --frozen-lockfile`; lockfile e stack preservados.
- Integração: `npm test` **104/104**, zero falhas/skips; `npm run build` passou.
  [Saída dos testes](testes.txt), [saída do build](build.txt) e
  [dados da verificação](verificacao.json).
- `git diff --check`, `git diff 1637449...HEAD --check` e
  `git diff --cached --check` passaram, incluindo as evidências antes do commit.
- A porta 5178 já estava ocupada; nenhum servidor existente foi encerrado.
  Dev da tarefa iniciado com `npm run dev -- --host 127.0.0.1 --port 5198 --strictPort`.
- Navegador: `node docs/handoffs/integracao-2026-10-19/qa-fase1.cjs http://127.0.0.1:5198/`.
  Chromium headless/ANGLE Metal, 1440 × 1000, DPR 1. Resultado **passou**:
  [JSON](navegador.json), script reproduzível e 13 capturas neste diretório.

## Navegador e limites da evidência

App real: perfil → Marte → nave → Shanghai fase 01; hordas selecionadas por
padrão, faixa de chegada e linha da HUD, primeira horda com 10 vivos e total
100. Seletor exercitado pela UI para 1/3/5/32/hordas e rodadas reiniciadas.
Duas caixas verificadas, abertura por E/botão, clarão azul, reserva 96 → 144 →
192 sem alterar pente, pausa congelando abertura, E repetido sem recompensa
adicional e retry fechando ambas/restaurando 96. Uma nova abertura após retry
volta a conceder +48. Rotação real por C exercitada.

Posições preparadas por store/spawn para deslocamentos longos; derrota e um
abate foram preparados para exercitar seletores e isolar caixas. Na percepção,
uma rota reta foi preparada para manter o rumo da patrulha: W real aproximou
o jogador por trás de **3,68 m a 2,66 m, sem alerta**; reposição na lateral a
2,5 m provocou alerta no loop real. Além disso, `canSeePlayer` e um passo da
simulação do App, com render pausado, conferiram 120° perceptível e 160° cego.
Nenhuma dessas preparações altera arquivos de runtime ou o save do autor.

Zero erros de execução, console ou respostas HTTP ≥ 400. Permanece um aviso
de diagnóstico `[GLB Debug]` de malha única, já presente em B1. Build mantém
o aviso de chunk > 500 kB. Capturas inspecionadas tecnicamente; não equivalem
ao aceite visual/jogabilidade nem à medição de desempenho em equipamento real.

## Roteiro e pendências

1. Abrir o dev da worktree, viajar a Shanghai e conferir hordas padrão, HUD,
   caixas, animação, +48 por caixa, repetição e reinício.
2. Selecionar 1 robô para testar costas a menos de 3 m, lateral, parede entre
   ambos e alerta por tiro pelas costas. Seguir também os dois handoffs citados.
3. Avaliar pressão das hordas, +24% ao avistar e leitura dos assets na câmera
   real. Aceite e medições da S2.9 continuam com o autor.

Fases 2–6 não executadas; fontes da colônia, documentação oficial/quadro e
revisão cruzada/avanço do autor seguem nas fases previstas. Sem push, remoção
de worktrees, exclusão/movimentação de artes ou checkboxes de aceite marcados.
