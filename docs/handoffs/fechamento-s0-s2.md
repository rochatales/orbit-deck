# Handoff — fechamento das Sprints 0 e 2

Preparação e kit: 24/10/2026. **Parada 1; aguardando resultados do autor.**

| Campo | Valor |
|---|---|
| Itens oficiais | S0.4, S2.9, S2.12 A/B e S2.11, conforme Fases 5 e 6 do plano de consolidação |
| Base imutável | `720527d4b06d8325ec97b90214b75fc314fbef65`, confirmada com `git rev-parse rochatales/horda-survivor` |
| Branch | `rochatales/fechamento-s0-s2` |
| Worktree | `/Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace` |
| Implementa / revisa / valida e integra | Codex / Claude / autor |
| Kit da sessão | [SESSAO_FECHAMENTO_S0_S2.md](../sprint-2/SESSAO_FECHAMENTO_S0_S2.md) |
| Referência | [Plano de consolidação, Fases 5–6](../consolidacao/PLANO_SPRINTS_0_2.md) e pedido do autor de 24/10/2026 |

## Entrega desta parada

- Registro da base, branch/worktree, tarefa e portões no quadro desta branch,
  por autorização expressa do autor. A futura S2.12 B partirá da ponta do
  fechamento, conforme o pedido atual, substituindo a indicação antiga de base
  na integração presente na proposta histórica.
- Kit em ordem: S0.4; A1–A13 e decisões de corrida/recuo/Run; etapa 6.5 com
  percepção, +24%, Patrol Unit, caixas e hordas; S2.9 no build de produção do
  checkout principal. Campos de resultado/observação em cada item, sem aceite.
- Comandos exatos de build/preview na porta 4173 com `--strictPort`, identificação
  da origem, ambiente, JSONs A/B, M1/M2 de 30 s e pico de 40 robôs por 10 s.
  Referências S1/S2 do handoff S2.9 preservadas. API de 30 s conferida no código;
  o botão do painel mede somente 10 s.
- Pasta de evidências do autor na worktree de fechamento, com nome de sessão
  novo e sem substituir os registros técnicos anteriores.

O registro de preparação (quadro e este handoff) tem commit separado. O commit
seguinte contém **somente o kit**, conforme a Etapa 1. Código, arte, testes,
dependências, lockfile, plano oficial e relatórios/aceites não foram alterados.
Nenhum checkbox foi marcado, nem iniciadas B ou S2.11.

## Verificação técnica desta entrega

Executada exclusivamente na worktree de fechamento:

| Verificação | Resultado |
|---|---|
| Dependências | `pnpm install --frozen-lockfile --offline`; 100 pacotes reutilizados, lockfile preservado |
| `npm test` | **104/104**, zero falhas |
| `npm run build` | Passou; aviso conhecido de chunk > 500 kB |
| `git diff --check` | Passou |
| Kit | A1–A13 confrontados com o roteiro oficial; links locais e campos de resultado conferidos |
| Isolamento | Status, diff e índice do checkout principal comparados por SHA-256 antes/depois, sem alteração |

Node v26.11.1; pnpm 11.0.8. Logs locais: `/tmp/horda-fechamento-s0-s2-testes.log`
e `/tmp/horda-fechamento-s0-s2-build.log`. Não foram criados testes novos para a
mudança documental. Não houve execução do roteiro de jogo, nova medição de frames
ou aprovação visual pelo agente; nenhum servidor foi iniciado nesta entrega.
Sem push, merge ou remoção de worktrees.

## Continuação condicionada ao autor

Na Etapa 2, registrar os resultados recebidos no kit, no relatório da Sprint 0,
nos handoffs S2.9/S2.12 e no quadro desta branch. S0.4 e Sprint 0 só fecham após
aceite expresso dos seus itens; S2.9 exige medições registradas e aceite. Se houver
falha em A1–A13, propor correções e parar, sem corrigir até liberação. **Parada 2.**

S2.12 B só começa após A1–A13 e liberação explícita, em branch/worktree própria
sobre a ponta então vigente do fechamento. Preservar o escopo decidido em
`222bc5b`: raio 0,80 m; spacing/separation/contactRange 1,60/1,90/1,20 m; robô
0–2,75 m; corpo das caixas com maxY fixo 1,195 m e tampa visual; tiro/cano/mira
0,65 m; depósitos excluídos até S4.3. Três etapas sequenciais, um commit por etapa,
parada com testes/build/diff-check/roteiro e revisão do Claude contra a base.

S2.11 vem depois de B, como investigação comparativa, sem adoção antes do teste
do autor; registrar ausência de 120/144 Hz como limitação. A sessão curta final
será acrescentada ao kit somente para essas mudanças. Sem aceite, não marcar
S2.11/S2.12 nem encerrar a Sprint 2. Reunir entregas na branch de fechamento para
revisão do Claude; avanço da integração por `--ff-only` é do autor.

ARES-I, r8, Astro Explorer, itens da Sprint 6 e arquivos não rastreados do autor
ficam fora desta tarefa. O checkout principal mantém suas alterações locais de
arquivamento do MCP Office, AGENTS.md, README.md e .gitignore, sem stash ou commit.
