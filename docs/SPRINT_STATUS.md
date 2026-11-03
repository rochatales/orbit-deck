# Quadro de execução — EXODEN

> **Consolidação aprovada pelo autor em 02/11/2026:** código `f8655f1`, reunido com `b54162c` em worktree isolada, com merge e push expressamente solicitados. O aceite se refere à versão jogada neste bate-bola. Os registros anteriores abaixo são históricos; não encerram automaticamente os escopos futuros dos sprints.

> Quem está fazendo o quê, em qual base e branch. O status oficial de cada
> item (checkbox) continua em
> [HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md](./HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md).
>
> **Quem edita:** só o autor, ou um agente a pedido do autor, na branch de
> integração. Agentes não editam este quadro nas branches de tarefa; o
> resultado vai no handoff da tarefa (`docs/handoffs/<tarefa>.md`).
> Exceções explícitas do autor em 25–26/10: registros de recursos e encerramento
> da S2.12/investigação S2.11 nesta worktree `rochatales/s2.12-b`.
>
> Atualizado em 26/10/2026 na `rochatales/s2.12-b`, por pedido explícito do autor: S2.12 A/B concluída e aprovada; S2.11 investigada, comparada em 144 Hz pelo autor e concluída sem adoção; `?interp=1` permanece só para comparação. Revisão Claude sem defeitos, 208/208, build verde. Autor dispõe de tela de 144 Hz.

## Situação dos sprints

| Sprint | Situação | Pendências |
|---|---|---|
| 0 · Preservação e baseline | ✅ Encerrado em 25/10/2026 | — (S0.4 aprovada pelo autor; medições no equipamento do autor seguem na S2.9) |
| 1 · Base local e viagem Marte–Shanghai | ✅ Implementado (S1.1–S1.10) | — |
| 2 · Movimento, tiro e sobrevivência | ◐ Núcleo e S2.12 concluídos/aprovados | A1–A13 (25/10), B em três etapas e apoio no piso (26/10). S2.11 concluída: comparada em 144 Hz pelo autor, não adotada (`?interp=1` só comparação); S2.9 e aceite geral da etapa 6.5 permanecem |
| 3 · Ondas, categorias e dispositivos | ◐ Entregas antecipadas aprovadas | Versão atual: hordas 13/26/32/44 (115), quatro tipos de inimigo, investida, recursos, áudio, efeitos e vida/acerto individuais. Demais dispositivos/critério completo S3 seguem pendentes |
| 4 · Loot, orientação e retorno | 🔲 Não iniciado | — |
| 5 · Construção da máquina | 🔲 Não iniciado | — |
| 6 · Estética dos elementos | ◐ Versão atual aprovada pelo autor em 02/11 | Astronauta v009/rifle, mochila, colônia v007/estufa/Hangar/Quartel/Laboratório/Control Room, projeção EDEN, Sandwind e iluminação presentes. Não encerra os itens completos/fases futuras do plano; S6.5 e demais pendências conservam seu escopo |
| 7 · Texturas, materiais e entrega | 🔲 Não iniciado | Acabamento de UI planejado em S7.11 |

Testes na versão aprovada `f8655f1`: **396/396**, build e diff-check verdes. A consolidação repete os checks na worktree isolada e preserva a árvore de código aprovada. [Registro atual](./handoffs/consolidacao-validada-2026-11-02.md). O histórico de 104 testes das fases de 19/10 permanece nos relatórios correspondentes.

Legenda: 🔲 não iniciado · ◐ em andamento/parcial · ✅ implementado ·
⛔ bloqueado · ⏸ estacionado. "Implementado" não significa aprovado pelo autor.

## Tarefa após a consolidação · 02/11/2026

- **S3.10 parcial — ambiência de Shanghai:** pedido do autor; Codex implementa em `rochatales/s3.10-ambiencia-shanghai`, worktree própria, base fixa `5bc240fd09d3e4e6af10534f8e6ed2a1dae5ebf4`. Arquivos: áudio fornecido, motor/runtime de áudio, testes e `docs/handoffs/s3.10-ambiencia-shanghai.md`. Shanghai entregue em `1ed98fb`; continuação solicitada pelo autor: Marte com vento externo, ambiência interna nas dez salas e efeito mecânico no início da abertura das portas. Crossfade e volume/mudo/pausa existentes; mesma branch/worktree da tarefa de áudio. Handoffs `s3.10-ambiencia-shanghai.md` e `s3.10-ambiencia-marte.md`. Aceite auditivo do autor pendente; sem push ou merge até nova consolidação.

## Base consolidada

| Campo | Valor |
|---|---|
| Branch de integração remota | `origin/rochatales/horda-survivor` |
| Branch local desta consolidação | `rochatales/consolidacao-validada-2026-11-02` |
| Base local de integração preservada | `b54162c359ad539db34e25f6bc61c6184a87e58a` |
| Código validado pelo autor | `f8655f10a968e0a2f2988d7241a2bab2a0b40860` |
| Worktree da consolidação | `/Users/rochatales/.codex/worktrees/consolidacao-validada-2026-11-02/game-workplace` |
| Referência para nova tarefa após a publicação | `git fetch origin` e `git rev-parse origin/rochatales/horda-survivor`; fixar o SHA resultante |

O checkout principal permanece em `b54162c`, com alterações locais e artes sem
rastreio do autor preservadas. A ref local `rochatales/horda-survivor` **não é a
base atual para novas tarefas** enquanto esse checkout não for reconciliado.
A consolidação conserva ambos os históricos, sem rebase/cherry-pick e sem editar
código em relação ao preview aprovado. [Escopo e publicação](./handoffs/consolidacao-validada-2026-11-02.md).

## Poeira de passos · S3.11 parcial · 02/11/2026

Pedido do autor: poeira avermelhada em Marte e cinza em Shanghai nos passos do explorador. Codex implementa em `rochatales/s3.11-poeira-passos`, worktree própria. Base de continuidade da prévia local: **`a8ae4e8de4e71d6119278473248d71f35c9f4762`**, linha commitada com áudio e portas sincronizadas; a base remota publicada permanece `5bc240f`. Preservar o áudio ao testar o efeito na mesma prévia. Arquivos: novo pool/renderer de poeira, sinal de passos do jogador, composição de cena, testes e handoff. Aceite visual do autor pendente. Sem push ou merge nesta rodada; data center ainda aguarda GLB acessível no Mac.

## Música e gatilho vazio · S3.10 parcial · 02/11/2026

Pedido do autor: Strung Out em Marte, Dov em Shanghai, mecanismo ao tentar atirar sem munição e volume menor só do Patrol comum recebendo tiro (confirmado pelo autor). Codex em `rochatales/s3.10-musicas-gatilho-vazio`, worktree própria. Base de continuidade da prévia local: `68f2714` (poeira corrigida e linha anterior de áudio); integração publicada permanece `5bc240f`. Arquivos: áudio/runtime/simulação, fontes copiadas sem alterar originais, testes e handoff. Sem push ou merge; validação auditiva do autor pendente.

## Balões de interação · S1.3 / S6.13 · 02/11/2026

Pedido do autor: padronizar as interações E pela Sintetizadora, com balão flutuante de proximidade para nave, EDEN, caixas e NPCs futuros. Codex em `rochatales/s1.3-baloes-interacao`, worktree própria, base de continuidade da prévia local `dec9d11` (músicas, arma vazia e poeira incluídas). Base remota continua `5bc240f`. Arquivos: componente/roteamento compartilhados, composição, laboratório/App e testes/handoff. Sem novos NPCs nem alteração de recompensas; sem push/merge, aceite visual do autor pendente.

## Luz do explorador por mapa · S6.8 · 02/11/2026

**Entregue localmente em `eb3fdcc`**: 429/429, build e diff-check verdes; preview de produção na porta 4186. Handoff: `docs/handoffs/s6.8-luz-visor-colonia.md`. Validação visual pendente do autor; sem sessão de jogo pelo agente.

Pedido do autor: em Marte, faixa azul abaixo do capacete e foco frontal suave; mochila totalmente sem emissão/luz. Shanghai conserva exatamente o estado atual. Codex em `rochatales/s6.8-luz-visor-colonia`, worktree própria, base da prévia local `715b70e` (balões, áudio e poeira). Código do acessório/visor, configuração de iluminação, testes e handoff; GLBs/fontes e física intactos. Base remota segue `5bc240f`. Sem push ou merge; aceite visual pendente.

## HUD beta · S6.6 / parte de S4.1 · 02/11/2026

**Entregue localmente em `6884730`**, branch `rochatales/s6.6-hud-beta`, worktree
`s1-3-hud-beta`, base local `eb3fdcc`. Vida vermelha, energia azul, quatro slots de
equipamento, mochila por B/clique com peso real, ícones ilustrados e retirada dos
painéis marcados; rádio e comparação/teste no menu. Decisão explícita do autor:
30 kg (ferro 0,5; cobre 0,3; titânio 0,4; orgânica 0,2 kg/un.); **duas cargas de
Dash**, regeneração total em **5 s**, exclusiva de Shanghai. Recursos excedentes
ficam no chão. Código frequente mutável, HUD com publicação limitada a 10 Hz.
434/434, build e diff-check verdes; preview 4186. Handoff:
`docs/handoffs/s6.6-hud-beta.md`, com prompt/hash da arte e roteiro. Aceite visual
pendente do autor; sem QA de jogo pelo agente. Não encerra os escopos completos de
S4.1/S6.6/S6.14–S6.18. Remoto segue `5bc240f`; sem push ou merge.

## Mira próxima ao jogador · S2.12 · 02/11/2026

**Entregue localmente em `a2be57f`**: cursor livre sobre/atrás do corpo, zona de orientação reduzida a 3,5 cm, sem reter o ponto antigo no centro. Consulta de alvo/tiro mantém proteção centro→cano. 438/438, build e diff-check verdes; preview 4186. Handoff `docs/handoffs/s2.12-mira-proxima.md`. Sem QA de jogo pelo agente, aceite visual pendente do autor.

Codex em `rochatales/s2.12-mira-proxima`, worktree própria, base local `6884730`
(HUD beta). Pedido do autor: cursor cruza livremente o personagem e permite mirar
em alvos próximos/virar atirando. Inspeção: retícula era deslocada para a frente do
cano na zona próxima; orientação tinha zona morta de 0,9 m e projeção retinha o
ponto anterior abaixo de 0,1 m. Escopo: cursor/projeção/orientação e regressões,
sem alterar cápsula, rifle/colisores, física ou conteúdo da UI. Sem push ou merge;
preview 4186, aceite visual pelo autor.

## Facão e animações de duas mãos · S6.2 / S6.8 · 02/11/2026

**Entregue localmente em `ad95ff4`**, branch `rochatales/s6.2-facao`, worktree
`s6-2-facao`, base `a2be57f`. Decisão do autor: **só golpes, bloqueio adiado**.
Troca 1/2 ou slots: rifle/facão; corte no botão esquerdo, 50 de dano, arco 120°,
alcance 2 m até a superfície, ciclo 0,65 s (valores iniciais ajustáveis). Sem gasto
de munição/energia. Golpe respeita sólidos, usa morte/drop compartilhados e pode
atingir vários alvos. Idle/Run/Backward/Slash complementares, bind de 57 ossos,
root in-place, pega dupla e IK esquerda; avatar aprovado intacto. Sete fontes
originais conferidas por SHA-256, script reproduzível e ícone do próprio asset.
446/446, build e diff-check verdes; preview 4186. Handoff `docs/handoffs/s6.2-facao.md`,
com ensaio/limites de pega e roteiro. Sem QA de jogo pelo agente, aceite visual
pendente do autor. Não encerra escopos completos dos sprints. Sem push/merge.

## Shanghai: carros, cabines e kits de vida · S6.12 / S6.13 · 02/11/2026

**Entregue localmente em `c731ce7`, ponta `13a91a0`** (correção de formatação),
branch `rochatales/s6.13-shanghai-props`, worktree própria `s6-13-shanghai-props`,
base `ad95ff4`. Nove carros destruídos, sete cabines nas marcações e medkit 3D
substituindo coração (+50 HP). Cabines por E/+48, uma vez por tentativa; sete
concedem até +336 na reserva. Três GLBs fonte/runtime íntegros por SHA-256.
GLB/layout originais intactos: só 432 triângulos dos carros antigos retirados em
runtime, com colisores equivalentes trocados; 52 volumes no terreno novo.
32/32 spawns por tipo, candidatos comum/pequeno 272 e grandes/aranha 266, todos
válidos pelo critério de contato; nove vielas e sete acessos humanos livres.
452/452, build e diff-check do intervalo verdes; preview 4186. Handoff
`docs/handoffs/s6.13-shanghai-props.md`, com planta, números e justificativa dos
testes atualizados (inclui contato dos grandes medido durante a janela após
limpar a primeira linha, preservando 90 s e zero invasão de sólidos).
Aceite visual/jogabilidade pendente do autor; sem QA de jogo pelo agente.
Sem push ou merge; os itens completos dos sprints não foram marcados.

## Kits médicos guardados e luz dos suprimentos · S6.13 / S4.1 · 02/11/2026

**Entregue localmente em `80d6e02`**: quatro kits no solo, sem anel/bob, E guarda no terceiro espaço e 3/clique usa +50 HP (sem gasto com vida cheia). Não reaparecem entre as quatro hordas; nova tentativa restaura os quatro e zera itens. Balizas/emissão permanentes em kits/cabines, com pool de até três focos próximos sem sombras. 458/458, build e diff-check verdes; preview 4186. Handoff `docs/handoffs/s6.13-kits-interativos.md`. Aceite visual pendente do autor; sem QA de jogo pelo agente, push ou merge.

Pedido do autor: quatro kits no solo, sem anel/flutuação, coletados por E para os
itens e usados depois para curar; não renascem entre as quatro hordas. Kits e
cabines com luz própria identificável no escuro. Codex em
`rochatales/s6.13-kits-interativos`, worktree própria, base local `13a91a0`.
Sem push/merge; preview 4186 e aceite visual pelo autor.

## Tarefas

Preencha uma linha por tarefa antes de iniciar. "Base" é o commit/branch do
qual a worktree parte e contra o qual a revisão compara.

| Tarefa | Base | Branch | Arquivos principais | Implementa | Revisa | Estado |
|---|---|---|---|---|---|---|
| Consolidação das entregas aprovadas · S6.8/S6.2, colônia e feedback de combate | `b54162c` + `f8655f1` | `rochatales/consolidacao-validada-2026-11-02` → `origin/rochatales/horda-survivor` | Linha integral aprovada, handoffs e quadro; código preservado | Codex | Autor: aceite da versão `f8655f1` | ✅ Aprovada pelo autor em 02/11/2026; merge/publicação pedidos. Preserva checkout principal e worktrees. Escopos completos de sprints e S2.9 não encerrados automaticamente. [Handoff](./handoffs/consolidacao-validada-2026-11-02.md) |
| S6.12 Control Room — candidato EDEN | `f1756c4` (colônia com Quartel v006 consolidada em commit; sem merge) | `rochatales/s6.12-control-room` | `art-source/control-room/**`, testes do asset e `docs/handoffs/s6.12-control-room.md` | Codex | Claude / Autor | ✅ Composição runtime final com projeção do pedestal aprovada em `f8655f1` (02/11); asset/implantação/acabamento na linha consolidada. O candidato histórico `a57d7ea` foi corrigido em `cf8916a` e integrado por `9ed6817`; não encerra o plano completo da EDEN. |
| S6.12 Hangar — asset modular animado | `4f821fe` (Greenhouse consolidada, sem merge) | `rochatales/s6.12-hangar-mars` | `art-source/hangar/**`, testes do asset e `docs/handoffs/s6.12-hangar-mars.md` | Codex | Claude / Autor | ✅ Hangar v002 implantado, portas/contorno e acabamento aprovados na composição `f8655f1` (02/11). Estudo original preservado; runtime da linha consolidada, sem substituir Refeitório. |
| S6.12 Greenhouse — módulos OFFLINE/ONLINE | `a865046` (masterplan v007 aberto, prévia sem merge) | `rochatales/s6.12-greenhouse-estados` | `art-source/greenhouse-v001/`, `src/assets/greenhouse/`, `src/scene/marsColony/Greenhouse*`, composição Marte, colisores/áreas da estufa, testes e handoff | Codex | Claude / Autor | ✅ Estados OFFLINE/ONLINE e implantação aprovados pelo autor, preservados na versão `f8655f1` e nesta consolidação. Progressão/construção futura permanece fora desta entrega. |
| S6.12 Masterplan v007 — layout da colônia | `a12294fa73e0f710807c612cf535adeeef14d9a8` (prévia ARES-I aprovada; sem merge) | `rochatales/s6.12-mars-masterplan-v007` | `src/world/mapConfig.ts`, `src/game/marsWorld.ts`, configuração EDEN, novos dados/GLB/manifesto v007 e leitor em `src/scene/marsColony/`, fonte Blender em `art-source/mars-masterplan-v007/`, testes e handoff | Codex | Claude / Autor | ✅ Colônia aberta v007 com deck completo e prédios finais aprovada pelo autor e presente em `f8655f1`; fontes e versões históricas preservadas. Não encerra S6.12 inteira. |
| S0.4 · Ajuste do autor nos consoles e rack do deck de Marte | `0c56448055a65cef3813171f48035ae02259eb69` | `rochatales/fechamento-s0-s2` | `src/scene/marsColony/layout.ts`, `src/game/marsLanding.ts`, testes, kit e evidências no handoff | Codex | Autor / Claude | ◐ Implementado: Oeste (−3; 25,9), tela para −Z e um colisor; Leste (6,85; 31,8), sem colisor. Folgas dos consoles 0,658 m / 0,408 m. Rack (−6,75; 31,6), fileira X, folga 0,07 m, ligado à ponta original do tubo fundido; tanques grandes imóveis e sem colisor novo. Passarela e embarque preservados. 113/113 testes, build/diff-check verdes; duas vistas antes/depois e QA no navegador. Complemento no mesmo commit, substituindo o SHA local 350b584. Aceite do autor pendente. [Handoff](./handoffs/fechamento-s0-s2/consoles-marte/README.md) |
| S0.4 / S2.9 / S2.11 / S2.12 · Fechamento das Sprints 0 e 2 | `720527d4b06d8325ec97b90214b75fc314fbef65` | `rochatales/fechamento-s0-s2` | `docs/sprint-2/SESSAO_FECHAMENTO_S0_S2.md`, `docs/handoffs/fechamento-s0-s2.md` e este quadro; relatórios, handoffs S2.9/S2.12 e plano somente após resultados do autor | Codex | Claude / Autor | ◐ **Parada 1: kit ARES-I pronto**, build/preview nesta worktree, porta 4173. Autor resolveu o critério após `c92ed79`: término livre com segmentos válidos a ≤1,20 m da saída. Reensaio a 0,42/0,80 m: 32/32 spawns, 272/272 candidatos, 9/9 vielas e 2/2 caixas humanas. ARES-I permanece em `fcdb34e`; 109/109 testes, build e diff-check verdes. Resultados e medições do autor pendentes; nenhum aceite ou checkbox alterado. S2.12 B em branch própria a partir da ponta do fechamento, somente após A1–A13 e liberação; três etapas com paradas. S2.11 posterior, comparativa e sem adoção automática. Checkout principal preservado; sem push, merge ou remoção de worktrees. [Handoff](./handoffs/fechamento-s0-s2.md) |
| S6.8 Astro Explorer — modelagem e cinco ações | `10e5ca741c1cf47204e6065198ee837c8c7dc3e4` | `rochatales/s6.8-astro-explorer-model-rig` | Novo `art-source/astro-explorer-rig/` (scripts, Blender, GLB candidato, evidências, validação) e `docs/handoffs/s6.8-astro-explorer-model-rig.md`; fontes soltas e runtime preservados | Codex | Claude / Autor | ◐ Em execução: modelagem a partir do estudo `414daae`; rig e ações Idle, Run, Backward, Reload e Aim. Orçamento total inferior a 10 mil triângulos. Sem integração ou merge. |
| S6.8 Astro Explorer — estudo ortográfico e rig | `07fc98c` | `rochatales/s6.8-astro-explorer-study` | Novo `art-source/astro-explorer-study/` (referência, folha conceitual, prompt e notas); nenhum runtime/rig/asset ativo | Codex | Autor | ◐ Entregue em `414daae`: folha raster v002 com oito vistas, pegadas/holster e loops, mais guia Blender e prompts. Meta proposta total 9.800 triângulos; nenhuma malha/rig novo implementado ou medida geométrica validada. Referência preservada, 104/104 testes, build/diff-check verdes. Avaliação do estudo pelo autor pendente; sem merge/push. |
| S6.2 ARES-I — modelagem do deck de Marte | `222bc5b462df9f48eed5ae6e472f02af70d862b4` | `rochatales/s6.2-ares-mars-modelagem` | Novo `art-source/ares-lander/` (scripts, cena Blender editável, renders, GLBs de estudo, medidas), `docs/handoffs/s6.2-ares-mars-modelagem.md`; nenhum arquivo de runtime | Codex | Autor | ◐ Estudo v001 entregue em `63634bd`: nave, deck de 12 m, infraestrutura, canyon, três renders e GLBs separados. Reimportação da nave conferida, 104/104 testes, build e diff-check verdes. Visual do estudo aprovado pelo autor em 22/10; revisão técnica, jogabilidade e integração pendentes. Fontes B3 e GLBs ativos preservados; sem merge/push ou alteração de embarque. |
| S6.3 ARES-I — pouso urbano em Shanghai | `4d2fb24cd582f6f5e589f8a007ddbbc0f7cdd39d` | `rochatales/s6.3-shanghai-ares-estudo` | Novo `art-source/ares-shanghai/` (fonte Blender, scripts, renders, exportação de estudo, verificações), `docs/handoffs/s6.3-shanghai-ares-estudo.md`; nenhum runtime | Codex | Autor | ◐ Estudo v001 entregue em `e31162a`: mesma nave aprovada, rua rachada com queimaduras, ruínas e vegetação; sem deck. Cena Blender, três renders e GLBs completo/impacto. 310 peças da nave preservadas, reimportação conferida; 104/104 testes, build e diff-check verdes. Visual aprovado pelo autor em 22/10; implementação pedida no ponto marcado, registrada abaixo. Desempenho/jogabilidade pendentes; não conclui a S6.3 inteira. |
| S6.2/S6.3 ARES-I — implementação em Marte e Shanghai | `be2581e80d9dc083bcc43417c21e2c884be043b0` | `rochatales/s6.3-shanghai-ares-runtime` | `src/game/Spacecraft.tsx`, `src/game/shanghai/{visual,layout}.ts`, `src/game/marsWorld.ts`, `src/scene/marsColony/{MarsColony,layout}.ts(x)`, contratos/assets ARES e deck, exportadores isolados, testes e `docs/handoffs/s6.3-shanghai-ares-runtime.md`; nenhum controller, combate ou fonte original | Codex | Claude / Autor | ◐ Implementada em `40bf942`; ponta da tarefa `a12294f` **integrada somente em `rochatales/fechamento-s0-s2` pelo merge `fcdb34e` (24/10)**, sem avanço da integração principal. ARES-I no ponto marcado de Shanghai, no asfalto com impacto; mesma nave + deck octogonal aprovado em Marte. Embarque/viagem preservados, seis volumes simples, 126 obstáculos da colônia intactos. 109/109 testes, build e diff-check verdes; duas idas a Shanghai com retorno a Marte e oito vistas por mapa, sem erro de página. Prévia de produção `http://127.0.0.1:4180/`. Oclusão do jogador pelo casco em algumas vistas documentada. Claude revisou `40bf942` sem achados; autor aprovou esta prévia em 22/10. Fontes preservadas. |
| S6.13 Caixa de suprimentos com abertura e revelação azul | `0c6c3f659cfabdb622f525c532f0b0825267d148` | `rochatales/s6.13-caixa-suprimentos` | `art-source/caixa-suprimentos/`, novo GLB/manifesto em `src/assets/props/caixa-suprimentos/`, prévia isolada, `src/combat/{CombatScene,CombatHud,simulation}.ts(x)`, `src/game/shanghai/layout.ts`, `src/state/useCombatStore.ts`, `src/app/App.tsx`, testes e handoff | Codex | Autor | ◐ **Integrada nesta consolidação, sem aceite de jogabilidade**: `239d59f` → merge `5adee8a`. Duas caixas na fase 01, E/botão, +48 de reserva cada, uma vez por tentativa, revelação azul. Autor conferiu o funcionamento na Parada 1; aceite segue na etapa 6.5. Sem S4.3/persistência. [Handoff](./handoffs/s6.13-caixa-suprimentos.md) |
| S6.3 Shanghai fase 01 — mapa ampliado e primeira passada de texturas | `ec845e7f44763e7684589c1e50b1a544f3120e58` | `rochatales/s6.3-shanghai-fase01` | `art-source/shanghai-fase01/`, `src/assets/shanghai-fase01/`, `src/game/shanghai*`, `src/game/config.ts`, `src/combat/navigation.ts`, testes de mundo/navegação, `docs/sprint-6/referencias-shanghai/`, `docs/handoffs/s6.3-shanghai-fase01.md`; câmera só após S6.12/autorização; consumidores de spawns só após S2.4 | Codex | Autor | ◐ **Integrada em 18/10, sem aceite**: merge `9944c11` e ajuste `7062b81`; fase 01 padrão (102 × 108 m), foguete e primeira passada de texturas. Decisões E3 (ocultação, licença da fonte e densidade) pendentes. [Handoff](./handoffs/s6.3-shanghai-fase01.md) |
| S2.4 / S2.8 Ajuste de horda e patrulha solicitado em 17/10/2026 | `dfd5894e4fb55a3bd2e27a36bf3037278b7f2a59` | `rochatales/s2.4-horda-patrulha` | `src/combat/{config.ts,simulation.ts,CombatHud.tsx}`, `src/state/useCombatStore.ts`, `tests/combat.test.mjs`, `docs/handoffs/s2.4-horda-patrulha.md` | Codex | Autor | ◐ **Integrada em 18/10, sem aceite**: merge `6e5c0c2` da ponta `cd5ac19`; 32 patrulhas, metais temporários, corações e HUD. Opção 32 preservada; hordas passaram a padrão em 19/10. Duração e desempenho pendentes. [Handoff](./handoffs/s2.4-horda-patrulha.md) |
| S2.9 Instrumentação de medição | `2bb1f2bab525776b97f8e76126ebe3adffd65aa7` | `claude/s2.9-instrumentacao` | `src/dev/perf/*`, `src/app/GameCanvas.tsx`, `tests/perf-metrics.test.mjs`, `docs/handoffs/s2.9.md` | Claude | Codex | ◐ **Integrada** em `ab9afc4` (merge `--no-ff` de `claude/s2.9-instrumentacao`, autor, 07/10/2026). R4 entregue em `0495d3f` e confirmada pelo Codex; 31 testes, build e diff-check verdes. Validação manual parcial: medições e JSON A/B do autor pendentes ([handoff](./handoffs/s2.9.md)) |
| S2.10 Posição transitória do player | `ab9afc43c4a7fb38375d45c86b305646c1f2f8ae` (`rochatales/horda-survivor`, merge da S2.9) | `claude/s2.10-posicao-transitoria` | `src/state/useGameStore.ts`, novo `src/state/playerTransient.ts`, `src/state/useExpeditionStore.ts`, `src/characters/player/PlayerController.tsx`, `src/characters/player/PlayerAim.tsx`, `src/scene/CameraRig.tsx`, `src/world/OfficeMap.tsx`, `src/combat/CombatScene.tsx`, `src/app/App.tsx`, testes, `docs/handoffs/s2.10.md` | Claude | Codex | ✅ **Integrada** em `110922a` (merge `--no-ff` de `claude/s2.10-posicao-transitoria`, executado pelo Codex com autorização do autor, 09/10/2026). Aceite do autor: R1–R8 e comparação `?perf` R10 ([handoff](./handoffs/s2.10.md)). 36 testes |
| S2.11 Interpolação com passo fixo | `0f8d485` (encerramento documental da S2.12 após `7397c42`) | `rochatales/s2.12-b`, mesma worktree por autorização do autor | Física/controller/câmera, posição visual, sonda `?perf`, testes e handoff | Codex | Claude / Autor (144 Hz) | ✓ Investigada (`2d9b45f`), comparada em 144 Hz pelo autor em 26/10: sem serrilhado ou tremor nas duas opções. NÃO ADOTADA; padrão mantido e `?interp=1` só para comparação. 212/212/build/diff-check verdes na entrega |
| S2.12 Ajustes de controle do autor (A: movimento pela mira e Explorador da S6.8; B: arma, traçador e colisão) | `110922afac0a981eaf32a9ba45905f4a1e5198e2` (`rochatales/horda-survivor`, merge da S2.10) | `claude/s2.12-movimento-mira-explorador` | Parte A: `src/characters/player/{PlayerController,PlayerAim,LocomotionController,PlayerModel,playerConfig,relativeMovement}.ts(x)`, `src/characters/{GLBCharacter.tsx,characterAssetConfig.ts}`, `src/controls/keyboardControls.ts`, `src/app/App.tsx`, novo `src/assets/characters/player/` (GLB r7 com os cinco clipes, asset separado), `tests/`, `docs/sprint-2/VALIDACAO_MANUAL.md`, `docs/handoffs/s2.12.md`. Parte B: arquivos do handoff da S2.9, confirmados na atribuição dela | Claude | Codex | ✅ **S2.12 A/B concluída e aprovada pelo autor em 25–26/10.** A1–A13 e velocidades 4,2/1,2 mantidas; B1 `f3a93ff`, B2 `aa74335`, B3 `191976c`, piso `7397c42`. Claude sem defeitos, 208/208/build verde. Aceite geral da etapa 6.5 continua separado. [Handoff](./handoffs/s2.12-b.md) |
| S6.1 / S6.2 · Animal mutante pequeno e matéria orgânica | `daaff88` → registro `f786255`; revisão do código **`f786255...HEAD`** | `rochatales/s2.12-b`, worktree existente | GLBs animal/orgânica, config/simulação/rig/pools/HUD/recursos, testes e docs | Codex | Claude / Autor | ◐ Entregue para revisão: 3/6 animais adicionais nas hordas 1/2, totais 13/26/30/40 e 109; HP50, 2,2/4,6 m/s, dano8 global, raio0,50/contato0,90, cerco por slot. Drop orgânico verde; oito testes novos, 176/176/build/diff-check verdes, QA/capturas. Faixa futura animal 0–1,20 m medida; etapa 2 parada. [Handoff](./handoffs/s6.1-patrol-grande-recursos.md). |
| S6.12 · Masterplan v007 na linha de teste | `5cb749d` + `4f821fe` → merge `42ac773` | `rochatales/s2.12-b` | Masterplan, estufa e props v006 do deck; relatórios/capturas | Codex | Claude / Autor | ◐ **Masterplan e deck completo aprovados pelo autor** em 25/10 (`daaff88`); revisão Claude sem defeitos relatada pelo autor. Entorno recomposto sem mudar posições, zero conflitos de módulo/parede/rota; passarela/embarque livres. 168/168, build/diff-check verdes; Novo aceite/revisão encerram essa pendência específica; animal revisado à parte. Sem integração. |
| S6.12 · Estufa modular OFFLINE/ONLINE na linha de teste | `4f821fe` → merge local `42ac773` | `rochatales/s2.12-b` | Asset/manifesto/runtime da estufa aprovados, QA de composição | Codex | Claude / Autor | ◐ **Estufa aprovada pelo autor em 25/10**, estados OFFLINE/ONLINE. Integrada só nesta linha de teste, preservada nos ajustes do deck. Testes e QA técnico de entrada, estados, cobertura, giros, viagem/retorno e pausa. Não conclui S6.12 inteira. |
| S6.1 / S6.2 · Recursos e Patrol grande — ajustes de 25/10 | Recursos: `a15af91` → `b66bbfb`; ajustes: **`26fcb0f`** | `rochatales/s2.12-b`, worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace` | `src/combat/{ResourceDrops,resourceRig,resourceVisual,patrolUnit}.ts(x)`, GLB titânio, testes, handoffs/proposta/quadro e QA | Codex | Claude / Autor | ◐ **Ajustes `5cb749d` aprovados pelo autor no jogo, exceto anel na calçada.** Anel corrigido em `e0eef58`: apoio por item cacheado, topo +6 mm e mesma base de flutuação. 168/168 na linha v007/estufa; build/diff-check verdes e capturas. Anel corrigido aprovado pelo autor; revisão Claude anterior sem defeitos. Raio/contato comum novos continuam somente para etapa 3. Sem push/merge na integração. |
| S2.12 B · Arma, traçador e colisão — decisões da Parada 6.3 | Proposta: `81275c5`; decisões registradas em `222bc5b`. Conforme pedido de fechamento de 24/10: base de implementação/revisão fixada em `2b1c91beeb6a59d3ef8815cdf3f3f1ab66689b28`, nova ponta documental de `rochatales/fechamento-s0-s2` após liberação | `rochatales/s2.12-b`, worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace` | Etapa 1: arma/controller/pose/mira/traçador; etapa 2: volumes de tiro, `shanghai/layout.ts`, `supplyCrate.ts`; etapa 3: configuração/simulação/navegação, testes e handoff. Lista completa no [escopo](./handoffs/s2.12-b-proposta.md). Excluídos depósitos, waypoints, `layout.json`, script/fonte de arte e `colliders.tsx` | Codex | Claude / Autor | ✅ **Concluída e aprovada em 26/10/2026.** A1–A13 aprovados; B1 `f3a93ff`, B2 `aa74335`, B3 `191976c`, apoio `7397c42`. Claude sem defeitos, 208/208 e build verde; blockout 1/32/hordas conferido. |
| S6.12 Colônia de Marte v006 B3 no jogo | `b1594714b00e7ead84e14b6a9c7bc9b7e89dd436` | `rochatales/s6.12-colonia-v006` | `src/game/marsWorld.ts`, `src/scene/OfficeScene.tsx`, `src/scene/CameraRig.tsx`, novo `src/scene/marsColony/`, `src/assets/colony-v006*`, scripts de exportação, testes e handoff | Codex | Autor | ◐ **Integrada em 18/10, sem aceite**: merge `0b13dd1` da ponta `5afd225`. Fonte final B3 e dados das portas versionados em `989b81f`; SHA-256 da fonte confirmado. Escadas E4 pendentes. [Handoff](./handoffs/s6.12-colonia-v006.md) |
| S6.5 Prévia isolada do laboratório v003 | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) | `rochatales/s6.5-lab-preview` | `src/app/App.tsx`, `src/app/GameCanvas.tsx`, `src/scene/`, `src/world/createOfficeMap.ts`, `src/assets/colony-preview-lab-v003.*`, `tests/lab-preview.test.mjs`, `docs/handoffs/s6.5-lab-preview.md` | Codex | Autor | ⏸ Estacionada por decisão do autor (07/10/2026): branch e worktree preservadas em `ee2213e`, sem integração nem descarte; fora da base da S2.10. Ao retomar, migrar seu leitor de posição (`LabPreview.tsx`) para a fonte da S2.10 e coordenar `App.tsx`/`GameCanvas.tsx`/`src/scene/` |
| S6.8 Explorador v2 otimizado (só explorador; asset e clipe Backward) | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) | `claude/horda-survivor-main-player-optimized-fc390c` | `art-source/explorador-v2/**`, `docs/handoffs/s6.8-explorador-v2.md` | Claude | Autor | ◐ r7 (`4c0ecfd`, cinco clipes) validada pelo autor como base de asset e usada no runtime pela S2.12 A. **Fontes fora do Git da integração**, preservadas na branch de arte e em snapshot complementar da Fase 2 (2.398 arquivos; 3.874.118.420 bytes). Sem merge da branch de fontes; LFS/fontes grandes aguardam S7.10. Aceite completo pendente |
| S2.4 Hordas crescentes e ajuste das costas | `0c6c3f6` (hordas); B1 `1637449` (consolidação) | `claude/robot-patrol-queue-hordes-797d36`; integração `rochatales/integracao-2026-10-19-s0-s2` | `src/combat/{config,simulation,navigation,patrolUnit,CombatHud,CombatScene}.ts(x)`, store, testes e handoff | Claude (hordas); Codex (integração e costas) | Claude / Autor | ◐ **Integrada nesta consolidação, sem aceite**: `0204158` → merge `83e93de`; costas cegas em `c1a4be0`. Padrão 10→20→30→40, +24% ao avistar, percepção de 3 m sem costas e alerta por tiro. Parada 1 conferida pelo Claude e autor conforme relato do autor; 104/104 testes. Aceite na etapa 6.5. [Handoff](./handoffs/s2.4-hordas-crescentes.md) |
| S6.1 Patrol Unit no jogo | `cd5ac19` | `claude/s6.1-robo-patrulha` | `src/combat/{patrolUnit,CombatScene}.ts(x)`, `src/assets/enemies/`, testes e handoff | Claude | Autor | ◐ **Integrada em 18/10, sem aceite**: merge `b410f2e` da ponta `5eecb7a`. Na integração, visual histórico de 2,67 m. Ajuste na S2.12 B: comum visual 2,24 m, raio atual 0,42 m preservado até etapa 3 (decisão futura 0,67 m). Fontes no snapshot, sem nova exportação. [Handoff](./handoffs/s6.1-robo-patrulha.md) |
| Arte · Estudo da plataforma de lançamento v004 (ref. S6.12/S6.13) | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` | `claude/arte-plataforma-lancamento` | `art-source/mars-colony-plataforma/**`, `docs/handoffs/arte-plataforma-lancamento.md` | Claude | Autor | ◐ Estudo entregue; aguarda avaliação; sem integração da v004/v005. A fonte B3 escolhida foi integrada pela S6.12; estudo original preservado no snapshot e na worktree. [Handoff histórico](./handoffs/arte-plataforma-lancamento.md) |
| S0/S2 · Consolidação de 19/10/2026 | B1 `1637449be4880ac2c7021b5ebe931c6b55e36a43` | `rochatales/integracao-2026-10-19-s0-s2` | Fontes B3, manifesto, evidências de portas, quadro, plano e roteiro manual; código integrado na Fase 1 | Codex | Claude / Autor | ◐ Fases 0–3 conferidas; Fase 4.1 revisada pelo Claude e avanço 4.2 confirmado pelo autor em `796ae3a`. S0.4 (5.1) preparada e S2.12 A (6.1) revisada, sem correções; sessões manuais e aceite de jogabilidade na etapa 6.5 pendentes. [Handoff](./handoffs/integracao-2026-10-19-s0-s2.md) |
| S0.4 · Preparação do baseline atual (Fase 5.1) | `796ae3a6776a623fb2c839310f04eb58925efc93` | `rochatales/horda-survivor` (roteiro/evidências no checkout principal; sem runtime) | `docs/sprint-0/RELATORIO.md`, evidências técnicas de carregamento e `?perf`, handoff | Codex | Autor | ◐ Fase 5.1 entregue no checkout principal: roteiro atualizado, carregamento e duas referências `?perf` de 30 s no build; 104 testes/build verdes. M2 automatizada não certifica rota livre. Sessão manual e aceite S0.4 continuam com o autor ([relatório](./sprint-0/RELATORIO.md)) |
| S2.12 A · Revisão específica (Fase 6.1) | Execução/correções: `796ae3a6776a623fb2c839310f04eb58925efc93`; diff de revisão: `110922a...82e3229` | Relatório em `rochatales/horda-survivor`; nenhuma branch/worktree de correção necessária | Arquivos da parte A, testes e handoff; sem S2.12 B/S2.11 | Codex | Autor; Claude para eventuais correções | ◐ Revisão de código concluída sem achados acionáveis; 45/45 na parte A, 104/104 na integração, build/diff-check verdes. Sem correções. A1–A13 aprovados e A12 confirmado pelo autor em 25/10: corrida 4,2 e recuo 1,2 m/s, referência Run/Backward do Toy ([revisão](./reviews/s2.12-a.md)) |

Planejamento de UI solicitado pelo autor em 30/09/2026, registrado na
branch de integração: [plano de ação](./sprint-6/PLANO_UI.md) e
[handoff do planejamento S6.6](./handoffs/s6.6-ui-planejamento.md).
S6.14–S6.18 e S7.11 estão no plano oficial, sem atribuição ou branch de
implementação iniciada. Registrar uma linha por tarefa e resolver o SHA
consolidado antes de executá-las. Coordenar `src/app/App.tsx` com a prévia
S6.5 e executar tarefas de UI que compartilhem App/CSS em sequência.

Regra de conflito: duas tarefas simultâneas não podem listar os mesmos
arquivos principais. S2.12 B e S2.11 têm dependência de posição visual/física e
podem tocar o controller; executar primeiro S2.12 B e depois S2.11, conforme
Fase 6. A revisão/validação da parte A vem antes de ambas.

## Log

- 02/11/2026 · autor/codex · Autor aprovou a composição final `f8655f1` e pediu consolidar todos os ajustes validados, com merge e push conforme combinado. Integração isolada sobre `b54162c`; conflito apenas documental no quadro, preservando os registros dos dois lados. Sem alteração de runtime ou adoção automática de interpolação. O preview validado usa `?interp=1`; a opção continua disponível, padrão preservado. Checkout principal com alterações locais preservado.

- 24/10/2026 · autor/codex · Masterplan v007 autorizado pelo anexo técnico. Base consolidada específica `a12294f`, pois a prévia ARES-I aprovada ainda não foi integrada. A tarefa anterior Astro Explorer permanece preservada em sua worktree, sem alterações nesta rodada. Alterações do autor no checkout principal ficam fora do registro. Sem merge.
- 25/10/2026 · codex · Animal pequeno e matéria orgânica entregues em um commit após `f786255`: assets exatos com SHA-256 completo no handoff, escala1, hordas 13/26/30/40 (109), navegação própria e distribuição por setores, cerco, dois tiros, dano global e munição por tipo. Pool de seis rigs; orgânica com anel verde apoiado e contador temporário. Envelope vivo do animal até 1,180196 m: proposta 0–1,20 para etapa 2; grande medido até 3,254069, proposta 0–3,28; comum preservado. 176/176 testes, build/diff-check verdes, QA e capturas. Autor valida o novo conteúdo e Claude revisa antes da etapa 2. Sem push, merge ou edição do principal/art-source.

- 25/10/2026 · autor/codex · **Aprovados no jogo pelo autor:** mapa v007/deck completo `daaff88`, estufa OFFLINE/ONLINE e anel na calçada `e0eef58`. Autor relata revisão Claude de `42ac773`/`e0eef58`/`daaff88` e código v007/estufa sem defeitos, 168/168 testes e build verde. Pedido do animal mutante pequeno autorizado nesta worktree, base `daaff889cc25d2fee57a5a52ac4ac68b8c6c81da`, com registro documental separado e depois um commit de implementação. Etapa 2 ainda não iniciada; revisão Claude antes do avanço. Sem push/merge na integração.

- 25/10/2026 · autor/codex · Item 3 na S2.12 B, base `e0eef58`: props exatos do GLB v006 recompostos no v007 nas posições de `3e04ac8`; fonte, Blender e GLBs intactos. Zero conflito com módulo/parede/rota; Oeste na zona B, fora da estrada de 4 m, com colisor; demais props sem novo colisor. Folgas 0,53 m console/passarela e 0,07 m rack/deck; 16/16 destinos alcançáveis. Teste dos consoles refeito pelos manifestos v007+estufa, 134 colisores; 168/168 testes, build/diff-check verdes. Capturas sudoeste/noroeste antes/depois e QA funcional no handoff S2.12 B. Validação do entorno/anel corrigidos e revisão Claude pendentes. Sem etapa 2, animal mutante, push ou merge na integração.

- 25/10/2026 · codex · Item 1 após merge `42ac773`: apoio do drop cacheado ao nascer por item, por 277 superfícies do layout exportado, sem GLB/consulta por quadro. Anel a superfície +6 mm, mesma base de flutuação. Rua/calçada/canteiro medidos no navegador em 0,006/0,126/0,154 m; três testes novos verdes, 165/166 na suíte (única falha: contagem histórica dos consoles v006, a revisar no item 3), build/diff-check verdes. Correção do anel aguarda aceite do autor; demais recursos de `5cb749d` aprovados.

- 25/10/2026 · autor/codex · Autor aprovou no jogo os ajustes de recursos `5cb749d`, exceto o anel sob a calçada; aprovou o masterplan v007, exceto o entorno do deck; aprovou a estufa modular OFFLINE/ONLINE. Merge local expressamente autorizado de `rochatales/s6.12-greenhouse-estados` (`4f821fe`) sobre `5cb749d`, sem conflito. Teste histórico dos consoles v006 falha só na contagem 133→134; reescrita para v007 fica no commit dos props. Build/diff-check verdes. Próximos commits: altura dos anéis pelos dados, depois props v006 nas posições aprovadas, com portão de colisão antes de reposicionar qualquer coisa. Etapa 2 e animal mutante não iniciados.

- 25/10/2026 · autor/codex · Ajustes após jogar os recursos, nesta worktree por pedido expresso: merge local autorizado `26fcb0f` preserva etapa 1 e recursos; 140/140 testes/build/diff-check antes dos ajustes. Anéis dourado/laranja/prata, flutuação 0,35 ±0,06 m sem giro Idle/PulseGlow, titânio GLB `1bf1c02491b3…`, coleta visual 37,5% menor e comum 2,24 m. Novas decisões futuras 0,67/1,34/1,60/1,07 m e faixa 0–2,31 m; somente visual aplicado. Reensaio: 32/32 spawns e 272/272 candidatos, fim a 0,50 m. 145/145 testes, build/diff-check, QA com capturas; handoff dos recursos atualizado. Revisão Claude e aceite do autor pendentes; etapas 2/3 paradas. Sem push, merge na integração ou alteração do principal/art-source.

- 25/10/2026 · codex · Criada branch `rochatales/s2.12-b` na worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace`, base/revisão `2b1c91beeb6a59d3ef8815cdf3f3f1ab66689b28` (commit documental de liberação/A12). Etapa 1 somente, com Parada 1 e revisão Claude antes do avanço. Quadro atualizado exclusivamente nesta branch de fechamento; checkout principal preservado. Sem push/merge.

- 25/10/2026 · autor/codex · **S2.12 B liberada expressamente** após A1–A13 (`029f9e7`). Confirmada ponta `029f9e7b37b3728f45ac4dd2f50602a2a7c1a90e` da branch de fechamento, incluindo `a42ff52`, `f864497` e `168d911`. A12 confirmado: corrida 4,2 m/s e recuo 1,2 m/s ficam; Toy usa esses valores para autorar Run/Backward. Registro só de docs em kit/handoffs/quadro antes da criação de `rochatales/s2.12-b`. Implementar etapa 1 e parar; etapas 2 e 3 após revisão do Claude e liberação. Sem arte, push, merge ou alteração do checkout principal.

- 25/10/2026 · claude · a pedido do autor: **S2.12 A — A1–A13 aprovados** ("A1–A13 ok"), velocidades 4,2/1,2 m/s mantidas no piloto e deslizamento do Run aceito com o r7 (correção definitiva no Explorador Toy). Kit e handoff da S2.12 atualizados. Liberação da S2.12 B, etapa 6.5 e medições da S2.9 seguem pendentes; S2.12 continua desmarcada até a parte B. Só docs.
- 25/10/2026 · claude · a pedido do autor: S2.12 B passa o tiro, o cano e o plano da mira de 0,65 m para **0,85 m** (retícula 0,86 m), substituindo o item correspondente de `222bc5b`. Conferido: 36/36 obstáculos da fase 01, colisores ARES-I e caixas (maxY 1,195 m) continuam bloqueando. [Handoff](./handoffs/s2.12-b-proposta.md). Só docs.
- 25/10/2026 · claude · a pedido do autor: nome oficial **EXODEN** ("O mundo acabou. A humanidade, não."). Mudam título da página, tela de entrada, README, AGENTS.md, títulos do plano/quadro/fluxo/UI e `package.json` (`exoden`). Save passa a `exoden:hub:v1`, lendo `horda-survivor:hub:v1` para migrar sem apagá-la (4 testes novos). Mantidos por compatibilidade: arquivos `HORDA_SURVIVOR_*`, branch `rochatales/horda-survivor`, ganchos `window.__horda*` (usados pelo kit da sessão) e o modo de combate "Hordas". Sem push ou merge.
- 25/10/2026 · claude · a pedido do autor: S0.4 aprovada (relato "pelos meus testes está tudo ok", build `3e04ac8` na porta 4173, MacBook M2 Pro) com as medidas técnicas disponíveis de `796ae3a`; Sprint 0 encerrado no relatório, no plano (checkbox S0.4) e neste quadro. Nada da Sprint 2 marcado. Sem push ou merge.

- 24/10/2026 · autor/codex · Complemento da mesma tarefa/commit dos consoles: rack levado a (−6,75; 31,6), fileira em X, a 7 cm da borda real. Tubo fundido em PROP_Tanques_2 permaneceu intacto; ponta original recebe o primeiro cilindro, tanques grandes imóveis. Sem novo colisor ou mudança de área caminhável/embarque. 113/113 testes, build/diff-check verdes; capturas sudoeste atualizadas e novo par noroeste, kit/handoff atualizados. Autor solicitou incorporar ao mesmo commit local dos consoles (350b584 substituído), sem push ou merge na integração.

- 24/10/2026 · autor/codex · Ajuste solicitado durante a sessão em `0c56448`: consoles do deck reposicionados somente em código, Oeste (−3; 25,9) e Leste (6,85; 31,8). Oeste orientado à colônia, com pegada rotacionada e único colisor novo; Leste sem colisor. GLB/.blend/manifestos preservados. Folgas mínimas conferidas no deck real; passarela, caminho completo, embarque/desembarque e bloqueio do controller verificados. 112/112 testes, build/diff-check verdes; kit e [handoff/capturas](./handoffs/fechamento-s0-s2/consoles-marte/README.md) atualizados. Sem aceite S0.4, push ou merge na integração.

- 24/10/2026 · autor/codex · Autor resolveu o portão de `c92ed79`, com conferência do Claude: o robô deve alcançar contato ≤1,20 m, não ocupar o desembarque. Mantidos raio 0,80 m, demais decisões `222bc5b`, chegada e colisores ARES-I. Reensaio passou a 0,42/0,80 m: 32/32 spawns e 272/272 candidatos de horda com segmentos válidos; a 0,80 m, término (0; 9,0), distância 0,50 m. Vielas 9/9, acessos humanos 10/10 e caixas 2/2 preservados. Escopo futuro da etapa 3 atualizado para aplicar a validação em `hordeEdgeSpawns` e nos testes de spawn/horda, sem implementar B. Kit retomado com posições ARES-I/deck/embarque/desembarque nos dois mapas e comandos de build/preview da worktree de fechamento (4173). Parada 1, sessão e aceites pendentes. [Decisão/evidências](./handoffs/s2.12-b-proposta.md#decisão-de-contato-após-ares-i--24102026-vigente). 109/109 testes, build/diff-check verdes; sem push, merge na integração ou remoção de worktrees.

- 24/10/2026 · autor/codex · Por pedido expresso do autor, merge `--no-ff` da ARES-I aprovada em 22/10 (`a12294f`) na worktree de fechamento: `aa87650` → `fcdb34e23b0127fd749bce1939c46eeae57b9a41`, sem conflito. 109/109 testes, build e diff-check verdes. Reensaio comparativo: a 0,42 m, 32/32 spawns e 272/272 pontos de horda mantidos; a 0,80 m, desembarque (0; 9,5) fica a 0,52 m da escada e não cabe no raio, invalidando os destinos estritos. Vielas 9/9 e caixas 2/2 para jogador a 0,36 m preservadas. [Evidência/causa](./handoffs/s2.12-b-proposta.md#reensaio-após-ares-i--24102026-parada-na-etapa-2). Nenhuma decisão de `222bc5b` ou runtime alterado após o merge. Sessão suspensa, atualização completa do kit pendente; parada técnica na etapa 2 do pedido atual. Checkout principal, r8 e Astro Explorer preservados; sem push/merge na integração/remoção de worktrees.

- 24/10/2026 · autor/codex · Fechamento S0.4/S2.9/S2.11/S2.12 atribuído em worktree própria sobre a ponta confirmada `720527d4b06d8325ec97b90214b75fc314fbef65`, branch `rochatales/fechamento-s0-s2`. Autor autorizou quadro, plano e docs exclusivamente nesta branch, sem consolidar as alterações locais do checkout principal. Etapa atual: kit da sessão única e Parada 1; resultados, medições e aceites continuam pendentes. S2.12 B segue as decisões de `222bc5b` e só começa após A1–A13/liberação, antes da S2.11.

- 22/10/2026 · autor/codex · Autor pediu também a implementação em Marte e confirmou nave + deck octogonal. Ampliação da integração ARES-I na mesma worktree/base, com contrato compartilhado da nave e alterações locais de piso/colisão do deck; nenhuma alteração de controller ou combate. Fontes dos estudos preservadas.
- 22/10/2026 · autor/codex · Autor aprovou o estudo Shanghai e autorizou sua implementação na área marcada da fase 01, junto ao quarteirão central. Base `be2581e80d9dc083bcc43417c21e2c884be043b0`; worktree própria para runtime, estudo `e31162a` preservado. S2.12 B ainda não iniciada; alterações locais do pouso sequenciadas antes dela, sem tocar combate/controller.
- 22/10/2026 · codex · S6.3 ARES-I entregue em `e31162a`, worktree `~/.codex/worktrees/s6-3-shanghai-ares/game-workplace`. Vinheta urbana de 27 × 25 m sem deck, reutilizando apenas a nave de `63634bd`. Sete fontes monitoradas intactas por SHA-256; cena completa 222.725 triângulos/9,78 MB, impacto separado 0,75 MB. Blender aberto para revisão; nenhum runtime alterado, merge ou push. Roteiro e limites em `docs/handoffs/s6.3-shanghai-ares-estudo.md` na branch da tarefa.
- 22/10/2026 · autor/codex · Autor aprovou o visual do launchpad de Marte e solicitou o estudo de pouso urbano de Shanghai. S6.3 ARES-I registrada antes da worktree, base `4d2fb24`; nave aprovada `63634bd` reutilizada como fonte, sem alterar geometria ou importar o deck. Sem integração ou merge nesta etapa.

- 21/10/2026 · codex · S6.2 atribuída por pedido do autor: iniciar no Blender o cenário ARES-I/deck de Marte, a partir da folha visual criada em 21/10. Base imutável 222bc5b462df9f48eed5ae6e472f02af70d862b4; novo diretório de arte, worktree própria, sem substituição do mapa ou nave ativos.
- 21/10/2026 · codex · S6.2 ARES-I: estudo Blender entregue em `63634bd`, worktree `~/.codex/worktrees/s6-2-ares-mars/game-workplace`. Fonte, renders e GLBs registrados por SHA-256; seis fontes existentes intactas. 310 IDs e 98.202 triângulos da nave conferidos por reimportação, desvio dos limites menor que 0,001 mm. Aprovação do autor e integração futura; o estudo não conclui a S6.2 inteira.

- 20/10/2026 · autor/codex · Decisões da proposta S2.12 B `a6fb951`, revisada pelo Claude conforme relato do autor, registradas no [handoff](./handoffs/s2.12-b-proposta.md): raio 0,80 m; spacing/separation/contactRange 1,60/1,90/1,20 como ponto de partida; faixa 0–2,75 m; corpo das caixas com `maxY = 1,195 m` fixo, tampa só visual; tiro/cano/plano a 0,85 m, retícula 0,86 m. Depósitos excluídos até S4.3, sem cubos, waypoints, layout, script/fonte de arte ou `colliders.tsx`. Implementação não iniciada: aguarda A1–A13 e liberação explícita. Depois, fixar base na ponta da integração, criar branch/worktree própria e parar ao fim de cada uma das três etapas. Registro documental verificado: 104/104 testes, build e diff-check verdes; nenhum código alterado. Sem push.

- 19/10/2026 · codex · Itens 5.1 e 6.1 entregues sobre runtime `796ae3a`, base registrada antes de branches em `3c85237`. Build do checkout principal com carregamento e JSON `?perf` de referência; S0.4 manual pendente. Revisão S2.12 A sem achados acionáveis; 45/45 originais e 104/104 integrados, build/diff-check verdes. Nenhuma correção/branch criada, push ou avanço das etapas seguintes. A1–A13/Run e aceite na 6.5 permanecem com o autor.

- 19/10/2026 · autor/codex · Autor confirmou avanço de `rochatales/horda-survivor` para `796ae3a`. Base imutável registrada antes de branches para preparar S0.4 (5.1) e revisar S2.12 A (6.1). Sem aceite manual, push ou início da parte B/S2.11.

- 19/10/2026 · codex · Fases 2 e 3 na branch de consolidação, autorizadas após a Parada 1. Fonte B3 e dados técnicos das portas em `989b81f`; manifesto por arquivo e snapshot complementar do Explorador. Quadro, plano e roteiro alinhados a 104 testes, Shanghai fase 01, hordas, caixas e percepção sem costas. Nenhum checkbox de aceite alterado; revisão/avanço na Fase 4 e jogabilidade na etapa 6.5.

- 19/10/2026 · autor · Parada 1 conferida: relatou revisão do Claude dos merges, ajuste das costas e 104/104 testes; conferiu no jogo viagem, hordas, caixas e costas. Isso não concede o aceite de jogabilidade da etapa 6.5 nem dispensa a revisão do conjunto da Fase 4.

- 18/10/2026 · integração anterior · S6.12 (`0b13dd1`), S2.12 A (`cf1bc63`), S2.4/32 (`6e5c0c2`), S6.1 (`b410f2e`) e S6.3 (`9944c11`, ajuste `7062b81`) já presentes em `0c6c3f6`; registro regularizado nesta consolidação, sem aceite dos itens completos. [Relatório](./handoffs/integracao-2026-10-18-shanghai-fase01.md).

- 30/09/2026 · claude · estudo de arte da plataforma v004, variantes A central e B deslocada, entregue em worktree sobre `7f2e60b`; registro no quadro regularizado em 19/10. Estudo preservado, sem integrar suas variantes. [Handoff histórico](./handoffs/arte-plataforma-lancamento.md).

- 18/10/2026 · codex · S6.13: caixa de suprimentos atribuída por pedido direto, base `0c6c3f6`. A S6.3 está consolidada e integrada por trabalho posterior; a caixa será isolada em worktree própria. Alteração local do plano preservada.

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

- 18/10/2026 · codex · S6.13: autor aprovou a caixa e pediu duas instâncias no mapa com munição. Mesma worktree/base de runtime; escopo ampliado para interação, colisores simples, animação, +48 de reserva uma vez por tentativa e testes.

- 22/10/2026 · codex · autor solicitou iniciar modelagem e rig do novo Astro Explorer com cinco ações. Base imutável `10e5ca7`, branch/worktree própria; estudo `414daae` como referência. As fontes soltas `art-source/astro-explorer/`, versões Explorador e GLBs ativos permanecem preservados.

- 25/10/2026 · autor/codex · Masterplan v007: revisão de circulação aberta autorizada na mesma branch/worktree; preservar estudo fechado e recuperar tiles da fonte v006. Sem merge.

- 25/10/2026 · autor/codex · Greenhouse autorizada como refinamento S6.12, a partir da prévia aberta consolidada `a865046`; nova branch/worktree, sem merge. Estados são preparação do asset, sem antecipar progressão/sistema de construção.

- 25/10/2026 · codex · Greenhouse S6.12 entregue na branch `rochatales/s6.12-greenhouse-estados`, base `a865046`, ponta `4f821fe`. Entrada oeste autorizada, circulação externa preservada e percurso leste/sul ampliado após revisão Claude. 127/127, build, diff-check, QA de estados/W/S/giros/viagem/pausa e 16 destinos alcançáveis. Handoff `docs/handoffs/s6.12-greenhouse-estados.md` na worktree da tarefa; prévia 4183, anterior 4182 preservada. Sem merge, sem aceite artístico/jogabilidade.

- 25/10/2026 · Codex · Hangar registrado a pedido do autor, base 4f821fe, branch própria; entrega isolada e preservação dos assets existentes.

- 25/10/2026 · Codex · Hangar S6.12 entregue em `rochatales/s6.12-hangar-mars`, ponta `755f32f`, base `4f821fe`. Fonte/GLB e 30 imagens, 8.596 triângulos, rig mecânico e quatro clipes. Claude confirmou seis correções; testes 131/131, build/diff-check e hashes conferidos. Pasta solicitada recebeu cópia completa verificada; sem merge/push ou alteração de runtime.

- 31/10/2026 · Codex · Control Room autorizada pelo anexo e referência; base específica `f1756c4`, preservando implantação mais recente da colônia. Tarefa isolada de modelagem/exportação, sem merge.

- 31/10/2026 · Codex · Control Room S6.12 entregue em `rochatales/s6.12-control-room`, base `f1756c4`, ponta `a57d7ea`. 8.212 triângulos, 26 objetos, dois materiais, teto modular, console/EDEN separados. Piso nivelado, suportes/envelopes corrigidos após revisão Claude. 295/295, build/diff-check e hashes verdes; 19 imagens incluindo comparação real com r7 de 1,48985 m. GLB/fonte/texturas/manifesto copiados para pasta de arte; runtime preservado, sem merge.
26/10/2026 — **S2.12 concluída**, aceite explícito do autor na branch S2.12 B:
A1–A13 aprovados em 25/10 (`029f9e7`), velocidades 4,2/1,2 mantidas; B1 `f3a93ff`,
B2 `aa74335`, B3 `191976c`, apoio `7397c42`. Claude sem defeitos, 208/208/build
verde; blockout `?shanghaiAtual` funciona em 1/32/hordas. Recursos e Patrol grande,
animal, mapa v007/estufa/Hangar e áudio (S3.10 antecipado) registrados nesta linha,
sem encerrar os itens dos sprints futuros. **S2.11 liberada**, mesma branch/worktree,
base será a ponta deste commit documental. Autor confirmou tela de **144 Hz**.
Padrão atual preservado; comparar `?interp=1`, passo fixo, medições produção.

26/10/2026 — S2.11 em experimento sobre **`0f8d485`**: `?interp=1`, padrão sem
interpolação preservado, Rapier/combate a 1/60 s. Câmera lê pose visual após
Rapier; tiro e centro→cano leem pose física. Diferença medida até 7,6 cm em
piso elevado; horizontal até 7 cm. Produção: comparação Marte e Shanghai horda 1
(13 ativos), JSONs e ciclo morte/retry/retorno em `docs/handoffs/s2.11/`.
212/212, build/diff-check verdes. Autor confirmou tela 144 Hz; comparação nela,
revisão Claude e decisão de adoção pendentes. S2.11 não marcada como aceita;
padrão mantido. Encerramento da S2.12 já documentado em `0f8d485`.

26/10/2026 — S2.11 já commitada em `2d9b45f`. Autor autorizou duas entregas
sequenciais na mesma worktree: efeitos visuais (S3.10/S3.11 parciais), depois
mutante grande (S3.3 parcial), sem encerrar esses itens futuros. Primeira entrega:
pool instanciado de 128, clarão no cano 50 ms, impactos metal/orgânico/poeira e
tranco visual 120 ms. Base `2d9b45f`; 216/216, build/diff-check verdes, capturas
e roteiro no handoff `s3.10-efeitos.md`. Aceite visual e revisão Claude pendentes.

26/10/2026 — Entrega 1 commitada em **`53b358d`** (efeitos visuais). Entrega 2
sobre essa base: mutante grande, GLB escala 1, SHA-256
`70470d2d125da7d6356f020538b582feb4133214567f0e21765339c970edae8a`.
Raio medido 1,336176 → **1,34 m**, altura de tiro **0–1,18 m**. Hordas
**13/26/32/44**, total **115**; 200 HP, oito tiros, três orgânicas independentes.
Aviso vermelho de 0,8 s, investida 9 m/s/6 m, recarga 3 s, dano 30 com intervalo
global e contato 15. Três sons grandes ativados; lacunas de aviso/morte própria
registradas no handoff `s3.3-mutante-grande.md`. 227/227/build/diff-check verdes,
272 candidatos e 32 spawns válidos no raio próprio; quatro hordas concluídas no
ensaio em 345,85 s, zero posições inválidas. QA horda 3 com 32 ativos e faixa
visível, captura em disco. Revisão Claude/aceite pendentes; sprints futuros não
marcados como concluídos. Sem push/merge; principal e fontes preservados.

26/10/2026 — Decisão final do autor para **S2.11** após jogar `2a3370d`: comparou padrão e `?interp=1` em **144 Hz**, sem serrilhado nem tremor em ambos. Investigação concluída e checkbox do plano marcado por este aceite explícito; **não adotar interpolação**, manter flag apenas para comparação. Este registro substitui as pendências históricas acima. Próximos ajustes autorizados, mesma branch/worktree sobre `2a3370d`: tamanho/investida da aranha, efeitos visuais e áudio, com commits separados e parada caso alguma rota necessária falhe no raio medido.

26/10/2026 — Ajustes pós-`2a3370d`, item 3: traçador 3×/0,12 s com núcleo branco e halo amarelo; clarão 2×; impactos 24 partículas/1,8× e flash de contato. Pool 128 mantido (pico técnico 42 na cadência real; sem necessidade de 256). 228/228, build e diff-check verdes; capturas em `docs/handoffs/s3.10-efeitos/ajustes-26-10/`. Aceite visual do autor pendente. Itens da aranha/áudio seguem nesta linha; decisão sobre vielas consultada ao autor após medição do corpo.

26/10/2026 — Ajustes pós-`2a3370d`, item 4: passos pesados com duas vozes reservadas/25 m/volume 0,8 para Patrol grande e aranha; quatro passos comuns preservados. 14 variações da aranha normalizadas a −6,4…−5,5 dBFS por fatiador reproduzível, fontes intactas. Aviso provisório grave/baixo na antecipação; morte grave provisória registrada. Horda 3 assistida: 11 passos + impacto/aviso/golpe/morte (1 cada), todos reproduzidos pelo Web Audio. 231/231, build/diff-check verdes; roteiro auditivo no handoff S3.10. Autor decidiu manter raio 1,66 m e permitir as vielas para a aranha ×2,5; tamanho/investida seguem em entrega própria.

26/10/2026 — **PARADA nos ajustes 1+2 da aranha**, conforme condição do autor. Medida ×2,5: meia-largura corporal 1,558902 m → raio 1,66; hitHeight proposto 0–2,92. Autor decidiu permitir as vielas. Caminhos estáticos válidos em 271/271 bordas, 32/32 spawns e ruas; porém horda 4 fica em 109/115 com seis presos ao norte mesmo após 600 s. Candidato 232/234 (duas falhas de navegação), build/diff-check verdes; nenhum raio reduzido e nenhum critério relaxado. Patch completo e capturas em `docs/handoffs/s3.3-mutante-grande/ajustes-26-10/`; código pendente retirado do runtime, que conserva a aranha anterior sobre `1ade722`. Efeitos (`ee3ddcb`) e áudio (`1ade722`) concluídos tecnicamente. Próximo trabalho: recuperação/desvio do grupo misto mantendo 1,66; itens 1+2 não concluídos. Sem push/merge ou alteração de arte/checkout principal.

Estado final desta parada: runtime restaurado sobre `1ade722`, **231/231 testes**, build e diff-check verdes; patch pendente aplicável (`git apply --check` verde). Candidato ampliado não entregue como código validado: **232/234**, duas falhas registradas. Captura do grupo bloqueado e comparação com Patrol grande salvas em disco.

26/10/2026 — Autor revisou/liberou retomada da aranha sobre `c7f8bad`, mantendo raio 1,66 e vielas. **Commit intermediário A** reaplica escala/investida do patch; 15/15 focados, 233/235 gerais com as duas falhas conhecidas de navegação preservadas, build/diff-check verdes. Segundo commit autorizado: progresso real e recuperação em três degraus, sem mudar raio/contato/spawns/obstáculos; repetir os ensaios e somente então entregar. Em corredor estreito é permitido atravessar aliados que não puderem sair da faixa, mantendo sólidos e HP.


26/10/2026 — **Retomada da aranha concluída tecnicamente**, base `c7f8bad`, commit A **`d1ac5c6`** (escala ×2,5 e investida), seguido pelo commit B de recuperação. Progresso real de 0,30 m; A 1,5 s repath/lado oposto → B 3 s recuo do menor (1 m/≤1,5 s) → C 4 s passagem só entre aliados; mapa/jogador sólidos. Valores aprovados preservados (raio 1,66, contato 2,06 etc.). Hordas 115/115: desembarque **224,08 s**, rua norte **247,20 s**, parede **225,35 s**; falta de progresso máxima **4,833 s**, zero invasões. Contadores A/B pedidos/cessões/C: **13/6/4/5**, **19/5/3/5**, **7/2/1/2**. Patrulha 32/90 s e teste misto ARES-I/90 s passam com critérios antigos. **245/245**, build/diff-check verdes; capturas, ensaios por horda e roteiro no handoff S3.3, `retomada-26-10/`. Substitui a pendência da parada anterior: código ampliado agora ativo. Revisão Claude e aceite visual/jogabilidade desta retomada pendentes; S3.3 futura não encerrada. Sem push/merge ou alteração de fontes/checkout principal.

26/10/2026 — Complemento 5–7 da aranha sobre `72b5b00`: traçador 0,056/0,095, estilhaços metal/orgânico 40/4–7 m/s/0,35–0,5 s com ricochete no piso O(1), pool 256 (pico técnico 119), poeira/clarão preservados. Aranha **280 HP / 12 tiros**, munição de horda 3/4 **194/297**. **247/247**, build/diff-check verdes. `?perf` produção antes/depois no pico 40 robôs+4 aranhas: p95 16,7/16,7 → 16,8/16,7 ms; draw máximo 172 igual, triângulos +1.424 (~0,24%), sem rAF>33 ms. Limites e JSONs no handoff de efeitos. Item 8 de caminhada reproduzido, segue em commit próprio sem reescrever `72b5b00`.

26/10/2026 — Complemento 5–7 commitado em **`5ee7aa7`**. Item 8 concluído
tecnicamente sobre essa base, mesma branch/worktree: aranha entre nove robôs
passa de 13 para 1 troca de clipe em 12 s; giro visual máximo 8,594°→2,292° por
quadro a 60 Hz. Mesmo defeito nos outros tipos, filtro compartilhado. Rumo e
velocidade visuais suavizados, locomoção com intervalo ≥1 s, lado de desvio
mantido por 0,25 s na marcha em grupo; mapa/jogador continuam sólidos e ataques
imediatos. Critérios antigos preservados: 115/115 nas três posições em
**226,00/249,32/225,35 s**, maior falta de progresso **5,917 s**, zero invasões;
A/B pedidos/recuos/C **13/4/3/4**, **23/8/4/6**, **8/3/2/3**. Patrulha 32/90 s
e ARES-I/90 s passam. **251/251**, build/diff-check verdes. Handoff, CSVs por
quadro, JSONs, captura da marcha e traçador em
`docs/handoffs/s3.3-mutante-grande/complemento-26-10/`. Recuperação histórica
`72b5b00` mantida; sem push/merge nem alterações no principal/art-source.
Parada para revisão Claude e aceite visual do autor; sprints futuros não encerrados.

Repetição `?perf` do build final com item 8: pico **120/256**, p95 **16,7/16,8 ms**,
zero rAF>33 ms, draw máximo 172 e +1.500 triângulos sobre o baseline (~0,25%).
JSON `complemento-26-10/perf-final.json`; sem testes/build concorrentes na medição.

02/11/2026 — S6.12 · Data Center, Meeting Room e Cafeteria: pedido do autor; base local de prévia `80d6e02` (kits interativos, linha de trabalho atual), branch `rochatales/s6.12-predios-colonia`, worktree própria. Fontes `orbit_deck_buildings2` somente leitura/cópia; implantação, portas, teto e colisores simples, sem push/merge ou edição do checkout principal. Codex implementa; autor valida no servidor. Esta base local não substitui a integração remota `5bc240f`.

02/11/2026 — S6.12 três prédios entregues localmente em **`783eb44`**, base `80d6e02`, branch/worktree `rochatales/s6.12-predios-colonia`. Data Center (−12,5; 0), Meeting Room (0; 0), duas portas oeste/sul; Cafeteria (11,5; 10,7) substitui Oficina + Refeitório. GLBs/Blends fonte copiados com hashes e preservados; portas/cuboides articulados, teto, pisos, ambiência e Sandwind implantados. 463/463, build e diff-check `80d6e02..783eb44` verdes; cápsula Rapier atravessa as quatro portas em ambos os sentidos. Início (0; 6), antes dentro da mesa nova. Preview 4186 serve este build; índice e três assets conferidos via HTTP. Handoff `docs/handoffs/s6.12-predios-colonia.md` e planta na branch da tarefa. Aceite visual exclusivamente do autor; sem QA de jogo, push ou merge.

03/11/2026 — Ajuste do autor sobre `783eb44`, mesma tarefa/branch `rochatales/s6.12-predios-colonia`: padronizar pisos, portas automáticas e letreiros pela Control Room EDEN; Cafeteria com entrada voltada ao Hangar. Fontes preservadas, sem push/merge; escopo das demais salas consultado ao autor.

03/11/2026 — Padronização dos três prédios entregue em **`d0c1c30`**, sobre `783eb44`, mesma branch/worktree `rochatales/s6.12-predios-colonia`. Autor confirmou escopo restrito aos três novos. Pisos/pads com atlas da Control Room, ladrilhos 1,25 × 1,50 m/junta 30 mm alinhados no mundo; quatro portas deslizantes com kit visual da Control Room, letreiros creme/latão com nome próprio. Cafeteria (11,5; 11,7), giro −90°, entrada oeste (7,15; 11,7) para Hangar. Variantes v002 por script reprodutível, fontes GLB/Blend e demais prédios preservados. 464/464, build e diff-check `783eb44..d0c1c30` verdes; Rapier passa as quatro portas em ambos os sentidos desde fechadas; grade de juntas testada após rotação. Preview 4186/HTTP conferido, handoff atualizado. Aceite visual do autor pendente; sem QA no navegador, push ou merge.

03/11/2026 — Correção do autor sobre `d0c1c30`: bases/pisos particulares dos três prédios não atendem ao padrão e causam recortes nos corredores. Mesma branch/worktree, sem push/merge: remover Floor/Pad no runtime, restaurar pavimento contínuo usando o tile exato dos corredores, limpo apenas no interior. Preservar portas/letreiros e entrada oeste da Cafeteria.

03/11/2026 — Correção do pavimento entregue em **`36036c8`**, base `d0c1c30`, mesma branch `rochatales/s6.12-predios-colonia`: Floor/Pad e juntas filhas removidos da cópia runtime dos três prédios. Pavimento comum plano, sem plataforma, com tile real dos corredores (`ARQ_Lab_Piso_Patio`), mesma fase de juntas; interior limpo sem areia, exterior com cores originais. Recortes agora correspondem exatamente à união reposta, sem pegadas de pad; alturas anteriores de Hangar/Quartel/Lab preservadas. 466/466, build/diff-check verdes; cobertura de células e três percursos sem buracos/sobreposição, cor/fase externa comparada à fonte. Preview 4186/HTTP atualizado; roteiro e planta no handoff. Aceite visual do autor pendente; sem jogo no navegador pelo agente, push ou merge.

03/11/2026 — Autor aprovou a composição do piso de `36036c8` e relatou vibração das juntas dos três interiores ao andar. Mesma tarefa/worktree: investigação encontrou dupla área projetada no pavimento limpo (topo e face inferior do tile achatados em Y=0). Corrigir somente a camada interior coplanar, preservar pavimento contínuo, portas e implantação; teste visual pelo autor.
