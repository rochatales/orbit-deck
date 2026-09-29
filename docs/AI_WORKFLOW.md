# Fluxo de trabalho: Claude Code + Codex — Horda Survivor

> Como os dois agentes trabalham no mesmo repositório sem se atropelar, e
> como o autor acompanha e aprova.
> Versões verificadas: Claude Code 2.1.283 · codex-cli 0.157.1.

---

## 1. Princípios

1. **Papéis por tarefa.** Em cada tarefa, um agente implementa e o outro
   revisa. Não há papel fixo por agente.
2. **O autor decide.** Testes visuais, sensação de jogo, aprovação e merge
   são do autor. Nenhum agente faz merge.
3. **Base explícita.** Toda tarefa declara a base (commit ou branch) de onde
   parte. A revisão compara com essa base, não com `main`.
4. **Sem edição simultânea.** Duas tarefas em paralelo não tocam os mesmos
   arquivos; o quadro de status só é editado na branch de integração.
5. **Preservar antes de mudar.** Nenhuma worktree nova antes de o trabalho
   corrente estar consolidado num commit.

---

## 2. Peças

| Peça | Função |
|---|---|
| `AGENTS.md` | Convenções do projeto (Codex lê direto) |
| `CLAUDE.md` | Importa `AGENTS.md` + regras específicas do Claude |
| Plano oficial | `docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md`: tarefas e checkboxes |
| `docs/SPRINT_STATUS.md` | Quadro: base, branch, arquivos, implementador, revisor |
| `docs/handoffs/<tarefa>.md` | Resultado de cada tarefa, escrito na branch da tarefa |
| Worktrees + branches por tarefa | Isolamento |
| `gh` + GitHub (`rochatales/orbit-deck`) | PRs, quando o autor decidir publicar |

---

## 3. Pré-requisito: consolidar a base

Na preparação deste fluxo, os Sprints 1–2 estavam sem commit e uma worktree
criada a partir de `99ab0d7` não incluiria o piloto. Consulte a base atual
em `docs/SPRINT_STATUS.md`; não use o commit antigo como base de tarefa.

Antes da primeira tarefa em paralelo, o autor ou o agente autorizado para consolidar:

1. Seleciona explicitamente os arquivos do commit (`git add <caminhos>`,
   nunca `git add .`). Arquivos de arte soltos na raiz (`*.blend`, `*.png`,
   `.zip`) não entram por engano e não são apagados nem movidos.
2. Não trata o backup do Sprint 0 como suficiente para nada criado ou
   alterado depois dele: antes de qualquer limpeza, confere cada arquivo
   contra `untracked-manifest.json` do backup (SHA-256).
3. Faz o commit na branch de integração e anota o hash no quadro, em
   "Base consolidada". Só então começam novas worktrees.

Os documentos de colaboração (`AGENTS.md`, `CLAUDE.md`, este arquivo e
`docs/SPRINT_STATUS.md`) entram por cópia dos arquivos revisados, sem merge
da branch `claude/project-review-gameplay-improvements-1a5676`.

---

## 4. Ciclo de uma tarefa

**1. Planejar (autor, na branch de integração).** Preencher a linha da tarefa
no quadro: base, branch, arquivos principais, quem implementa, quem revisa.

**2. Implementar (agente A) numa worktree que parte da base.**

```bash
git worktree add ../hs-s2.10 -b claude/s2.10-player-transient <commit-base>
```

Na sessão: "Execute o item S2.10 do plano oficial. Base `<base>`. Arquivos:
…". Ao terminar, o agente escreve `docs/handoffs/s2.10.md` com: o que mudou,
testes adicionados, resultado de `npm test`/`npm run build`/`git diff --check`,
roteiro de verificação manual e pendências.

No Codex Desktop, prefira a ferramenta de worktree gerenciada, usando
explicitamente o commit-base. Para branches criadas pelo Codex, use o prefixo
`rochatales/` (por exemplo, `rochatales/s2.10-player-transient`). O exemplo
acima é do CLI do Claude; não crie duas worktrees para a mesma tarefa.

Se o implementador for o Codex CLI numa worktree já criada:

```bash
codex exec -C ../hs-s2.10 -s workspace-write -o /tmp/s2.10-codex.md \
  "Execute o item S2.10 do plano oficial seguindo AGENTS.md. Base <base>. Escreva docs/handoffs/s2.10.md."
```

**3. Revisar (agente B) contra a mesma base.**

Antes da revisão por branch, o implementador faz commit apenas dos arquivos
da tarefa. Confirme que não há mudanças da tarefa fora do commit; um diff
`<base>...HEAD` não inclui arquivos não commitados. Execute a revisão no
diretório da worktree da tarefa. O commit da tarefa inclui o handoff.

```bash
codex review --base <base> "Revise contra AGENTS.md e o item S2.10 do plano oficial."
```

ou, se o revisor for o Claude:

```bash
claude -p "Revise git diff <base>...HEAD contra AGENTS.md e o item S2.10 do plano oficial. Liste só problemas reais, com arquivo e linha."
```

O implementador corrige e o revisor confirma. Nenhum dos dois faz merge.

**4. Validar (autor).** Seguir o roteiro do handoff, jogar e decidir.

**5. Integrar (autor).** Merge na branch de integração, marcar o checkbox no
plano oficial e atualizar o quadro e o relatório do sprint.

---

## 5. Paralelismo

- Só em tarefas que não compartilham arquivos principais (ver quadro).
- Exemplo seguro: S2.9 (instrumentação, arquivos novos) em paralelo com a
  preparação de testes do Sprint 3.
- Exemplo proibido: S2.10 e S2.11 juntos (ambos mexem em câmera, controller
  e física).

---

## 6. Acompanhamento

- **Onde está cada tarefa:** `docs/SPRINT_STATUS.md` e `git worktree list`.
- **O que uma tarefa entregou:** `docs/handoffs/<tarefa>.md` na branch dela.
- **Resumo sob demanda:**
  `claude -p "Leia docs/SPRINT_STATUS.md, os handoffs e o git log recente e resuma andamento e bloqueios em 5 linhas."`

Fica para depois, após o autor revisar este fluxo: issues por tarefa, GitHub
Projects, publicação de PRs e automações (`@claude`/`@codex` em PR).

---

## 7. Um agente chamando o outro

Pela linha de comando, como no §4: o Claude roda `codex review`/`codex exec`;
o Codex roda `claude -p`. `claude mcp serve` expõe só as ferramentas do Claude
Code (não o raciocínio), então não é o caminho para pedir revisão.
