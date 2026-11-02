# Handoff — fechamento das Sprints 0 e 2

Preparação e kit: 24/10/2026. **Parada 1 — kit ARES-I pronto, após decisão do autor sobre alcance de contato; sessão e aceites pendentes.**

| Campo | Valor |
|---|---|
| Itens oficiais | S0.4, S2.9, S2.12 A/B e S2.11, conforme Fases 5 e 6 do plano de consolidação |
| Base imutável | `720527d4b06d8325ec97b90214b75fc314fbef65`, confirmada com `git rev-parse rochatales/horda-survivor` |
| Branch | `rochatales/fechamento-s0-s2` |
| Worktree | `/Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace` |
| Implementa / revisa / valida e integra | Codex / Claude / autor |
| Kit da sessão | [SESSAO_FECHAMENTO_S0_S2.md](../sprint-2/SESSAO_FECHAMENTO_S0_S2.md) |
| Referência | [Plano de consolidação, Fases 5–6](../consolidacao/PLANO_SPRINTS_0_2.md) e pedido do autor de 24/10/2026 |

## Ajuste dos consoles e rack de Marte — 24/10/2026

A pedido do autor durante a sessão com build `0c56448`, consoles e rack reposicionados
em `applyColonyLayout`, sem editar GLB/.blend/manifesto. Base desta alteração:
`0c56448055a65cef3813171f48035ae02259eb69`, na mesma worktree/branch de fechamento.

- **Oeste:** centro X/Z **(−3; 25,9)**, tela para −Z; pegada 0,94 × 0,723003 m.
  Um colisor simples novo em Marte, preservando a passarela de 4 m; folga real
  para o deck 0,658498 m, para a lateral da passarela 0,530000 m e para embarque
  4,109595 m. Y=0 no piso da praça.
- **Leste:** centro **(6,85; 31,8)**, orientação preservada, sem colisor novo.
  Borda/para-choques medidos em X=6,08; folga 0,408498 m.
- **Rack:** centro **(−6,75; 31,6)**, rotação Y=0, pegada 1,20 × 0,52 m e folga
  **0,07 m** ao deck. Tubo fundido à estrutura dos tanques grandes: preservado,
  com sua ponta original (−7,25; 0,15; 31,6) terminando dentro do primeiro cilindro.
  Tanques grandes imóveis, rack fora da área caminhável e sem novo colisor.
- **113/113 testes**, build e diff-check verdes. Rapier bloqueia Oeste nos quatro
  lados; caminho completo colônia → deck → E revalidado, com embarque/desembarque
  pela UI e W contra o console no navegador, zero erros de página.
- [Handoff detalhado e capturas antes/depois](fechamento-s0-s2/consoles-marte/README.md).
  Câmera real, duas vistas do autor (sudoeste e noroeste), mesmo enquadramento por par.
  Complemento incorporado por solicitação expressa ao mesmo commit dos consoles,
  substituindo o SHA local anterior `350b584`.
  Medidas contra os triângulos do deck, somente para QA; física usa retângulo simples.
- Kit atualizado em **S0.4 · deck ARES-I**, com resultado ainda pendente do autor.
  Nenhum aceite, item de Sprint 6 ou implementação S2.12 B foi marcado/iniciado.

A sessão segue na worktree de fechamento, porta 4173. Reconstruir o build antes de
retomar. Checkout principal preservado; sem push, merge na integração ou remoção
de worktrees. O servidor DEV de QA da porta 5184 foi usado apenas nesta conferência.

## Retomada com ARES-I e contato — Parada 1 vigente

Base desta atualização: `c92ed79bc4df4c8902b8eadff30f42b73ce4e229`; runtime segue
exatamente o merge `fcdb34e`. O autor decidiu, com conferência do Claude, manter
raio 0,80 m, demais decisões de `222bc5b`, desembarque e colisores ARES-I. A
parada anterior era causada pelo critério de destino exato do ensaio, não por
um defeito do jogo. O critério aprovado passa a ser **alcance de contato**:
origem e término livres no raio do robô, todos os segmentos válidos em
`clearSegment`, término a **≤ contactRange = 1,20 m** do desembarque.

| Ensaio no terreno ARES-I | Raio 0,42 m | Raio 0,80 m |
|---|---:|---:|
| Nós livres | 36.546 | 33.929 |
| Spawns com caminho válido até contato | 32/32 | 32/32 |
| Candidatos de horda validados até contato | 272/272 | 272/272 |
| Maior distância final à saída | 0 m | 0,50 m |
| Vielas / acessos humanos / caixas | 9/9 / 10/10 / 2/2 | 9/9 / 10/10 / 2/2 |

A 0,80 m, os caminhos chegam a **(0; 9,0)**, dentro do contato de 1,20 m do
jogador em **(0; 9,5)**. Os quatro cenários antes/depois passaram no script;
o diagnóstico anterior do ponto exato e o JSON antigo permanecem preservados
como histórico, sem mudança de raio, colisores ou chegada.

- [Decisão e números completos](s2.12-b-proposta.md#decisão-de-contato-após-ares-i--24102026-vigente).
- [JSON do reensaio por contato](fechamento-s0-s2/ares-navegacao-contato.json).
- [Script atualizado](fechamento-s0-s2/ares-navegacao.mjs): `node docs/handoffs/fechamento-s0-s2/ares-navegacao.mjs` termina com **exit 0**.

O escopo da **etapa 3 futura** agora exige o mesmo critério em
`tests/hordes.test.mjs` e `tests/integration-shanghai.test.mjs`, e impede
`hordeEdgeSpawns` de aceitar candidatos cujo caminho não passe pela validação.
Não basta `path.length > 0`. Nenhuma dessas mudanças foi implementada no runtime
ou nos testes do projeto. A1–A13 e liberação explícita continuam precedendo B.

O kit foi concluído para esta branch: Marte com deck octogonal centrado em
(0; 33), ARES-I visual em (0,72; 0,012; 33,52), E/desembarque em (0; 29,5);
Shanghai com nave em (0,72; 0,012; 13,52), asfalto/impacto sem deck e E/desembarque
em (0; 9,5). Itens novos para ligação do deck, embarque/desembarque nos dois
mapas, contorno/oclusão e retorno. Comandos de build/preview e medições apontam
para a **worktree de fechamento**, porta **4173**; o checkout principal não é
usado. A1–A13, campos de resultado, decisões de Run e JSONs/ambiente preservados.

Verificações nesta worktree: reensaio **4/4 cenários**, `npm test` **109/109**,
`npm run build` e `git diff --check` verdes (aviso conhecido de chunk >500 kB).
Logs: `/tmp/horda-fechamento-ares-contato.log`,
`/tmp/horda-fechamento-contato-testes.log`, `/tmp/horda-fechamento-contato-build.log`.
Sem execução de sessão visual, nova medição de frames ou checkbox de aceite.
Checkout principal conferido por SHA-256 de status/diff/índice, preservado.
Sem push, merge ou remoção de worktrees nesta atualização. **Parada 1: aguarda
relato do autor.** Os registros anteriores abaixo são históricos.

## Entrega inicial — Parada 1 (antes da ARES-I)

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

## Verificação técnica da entrega inicial

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

## Integração ARES-I — histórico da parada em 24/10/2026

**Portão resolvido pela decisão de contato acima.** O script e o exit 1 descritos
nesta seção são a versão histórica de `c92ed79`, não o ensaio vigente.

Autorização expressa do autor substitui a exclusão anterior da ARES-I: integrar a
entrega aprovada em 22/10 antes da sessão, somente nesta worktree de fechamento.

| Campo | Resultado |
|---|---|
| Ponta anterior do fechamento | `aa8765062fd84429ba8e0c34f60621580f50a4d8` |
| Branch/ponta de origem | `rochatales/s6.3-shanghai-ares-runtime`, `a12294fa73e0f710807c612cf535adeeef14d9a8` |
| Merge `--no-ff`, sem conflito | **`fcdb34e23b0127fd749bce1939c46eeae57b9a41`** |
| `npm test` após merge | **109/109**, zero falhas |
| `npm run build` / `git diff --check` | Passaram; aviso conhecido de chunk >500 kB |
| Ensaio de navegação | **Reprovado a 0,80 m no destino exato junto à escada**; a 0,42 m, 32/32 spawns e 272/272 pontos válidos |
| Fonte dos resultados | [Proposta atualizada e interpretação](s2.12-b-proposta.md#reensaio-após-ares-i--24102026-parada-na-etapa-2), [JSON](fechamento-s0-s2/ares-navegacao.json), [script](fechamento-s0-s2/ares-navegacao.mjs) |

No terreno com ARES-I, as nove vielas, os 16 segmentos das patrulhas e os dez
acessos humanos (duas caixas incluídas, jogador de raio 0,36 m) continuam válidos.
Nós livres: 36.674→36.546 a 0,42 m e 34.104→33.929 a 0,80 m.

A face da escada de Shanghai começa em Z=10,02 m, a 0,52 m do desembarque
(0; 9,5). O robô de raio 0,80 m não cabe nesse ponto. O retorno bruto de
`Navigation.path` continua não vazio para os 32 spawns, mas termina num nó
aproximado (exemplo: 0; 9,0). Os 272 candidatos de horda também permanecem;
a validação estrita de origem/destino livres resulta em 0/32 e 0/272 por causa
do destino inválido. Isso não prova isolamento dos spawns nem defeito de combate;
a dinâmica de perseguição/contato junto à escada não foi certificada a 0,80 m.

O script registra o JSON antes de reprovar a asserção de continuidade com exit 1.
Nenhum teste foi afrouxado e nenhum ajuste de raio, colisor, chegada, patrulha ou
arte foi aplicado. A premissa 32/32 até desembarque livre da proposta aprovada
precisa de decisão do autor. **Parada na etapa 2, conforme o portão solicitado.**

A etapa 3 (atualização completa do kit para deck/embarque/desembarque ARES-I e
build desta branch na porta 4173) não foi executada após esse achado. O kit recebeu
somente aviso de suspensão e de não usar o checkout principal; as instruções
anteriores estão preservadas como versão histórica. Não iniciar a sessão ainda.
Quadro e proposta registram o merge e o bloqueio. Logs locais desta atualização:
`/tmp/horda-fechamento-ares-{testes,build,navegacao}.log`.

Sem push, merge na integração ou remoção de worktrees. Checkout principal
preservado; sem alteração adicional em código, arte, dependências, r8 ou Astro
Explorer. O merge traz os assets/fontes já aprovados da branch ARES-I.
Nenhum checkbox ou novo aceite foi marcado. Integração principal continua em
`720527d4b06d8325ec97b90214b75fc314fbef65`.

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

A ARES-I entrou pelo merge autorizado acima; r8, Astro Explorer, demais itens da
Sprint 6 e arquivos não rastreados do autor permanecem fora desta tarefa. O checkout principal mantém suas alterações locais de
arquivamento do MCP Office, AGENTS.md, README.md e .gitignore, sem stash ou commit.
