# Revisão das sprints após a atualização de game design · 07/11/2026

## Base, branch e papel

- Pedido do autor: revisar o plano oficial e propor a atualização das sprints
  conforme o prompt `PROMPT_CLAUDE_CODE_REVISAO_SPRINTS_2026-11-07.md` (no checkout
  principal, fora do Git). Sem implementação de gameplay.
- Base: `rochatales/s3.2-primeira-expedicao` em **`d128817`** (06/11), conferida
  após `git fetch --all`. Contém `origin/rochatales/horda-survivor` (`90e7734`),
  S3.1, S5.1, as branches S3.10/S3.11 e o fechamento S2. Fica fora:
  `rochatales/s6.15-pausa-menu` (2 commits sobre base anterior).
- Branch: `claude/revisao-sprints-game-design-2026-11-07`, na worktree
  `.claude/worktrees/exoden-design-sprints-397366`. Revisor: Claude. Decisão: autor.
- Plano oficial e quadro **não editados**. A proposta está nos dois patches abaixo.
  Sem push, merge ou rebase.

| Arquivo | Conteúdo |
|---|---|
| `revisao-sprints-2026-11-07-plano.patch` | Plano oficial: posicionamento, ciclo de risco, S3/S4/S5 ajustadas, S5.12–S5.14 novas, S6.10/S6.16 ajustadas, Sprints 8 e 9, matriz e backlog |
| `revisao-sprints-2026-11-07-quadro.patch` | `SPRINT_STATUS.md`: situação real por sprint, linhas S8/S9 e nota da revisão. **Inclui o `s2-fechamento-2026-11-05-quadro.patch`**, ainda não aplicado; aplicar só este |

Convenção do texto: **Fato** é o que o repositório mostra em `d128817`.
**Proposta** é recomendação do agente, a aprovar.

## 1. Situação conferida contra os handoffs (fato)

Contagem do plano em `d128817`: **29 de 93 checkboxes**, igual ao prompt.
A coluna de entregas sem checkbox do prompt precisava de quatro correções.

| Sprint | Checkbox | Entregue sem checkbox | Parcial | Correção em relação ao prompt |
|---|---|---|---|---|
| S0 | 5/5 | — | — | — |
| S1 | 12/12 | — | — | — |
| S2 | 12/12 | — | — | Quadro ainda diz "◐" e "S2.9 permanece": o patch de fechamento de 05/11 não foi aplicado. O patch novo o inclui |
| S3 | 0/12 | S3.3, S3.4 | S3.1, S3.2, S3.8, S3.9, S3.10, S3.11 | **S3.1 e S3.2 são parciais, não entregues.** Existem estado/save da campanha e o encontro de 4 Patrol (`campaign-copper`); a visita com mutantes 4/6 não existe: etapas sem encontro próprio caem nas quatro hordas (`campaignEncounter.ts`). S3.8 e S3.9 já têm reabastecimento e "área neutralizada" |
| S4 | 0/11 | S4.2 | S4.1, S4.4, S4.5, S4.7, S4.8, S4.9 | **S4.1 é parcial**: o item inclui dispositivos, que não existem. **S4.2 diverge do texto**: o Mutante Shangai Pesado solta 3 orgânicas (`simulation.ts:574`), não 2, e o Patrol Pesado solta titânio, que o texto não cita. S4.4 (objetivo provisório no HUD) e S4.9 (perda da tentativa na campanha, S3.2) também são parciais |
| S5 | 0/11 | — | S5.1, S5.4 | **A entrega do facão não está implementada.** Os eventos `pick-up-sword`, `activate-eden` e `activate-synthesizer` existem em `campaign.ts`, mas o único `dispatch` ligado no runtime é `finish-engineer-briefing` (`useExpeditionStore.ts:130`). A wiki diz "S5.1 pronto … entrega do facão", o que não confere |
| S6 | 0/19 | S6.1, S6.3, S6.8, S6.10 (como no prompt, não reconferidos item a item) | S6.2, S6.4, S6.6, S6.12, S6.13, S6.15, S6.16, S6.19 | **A pausa da S6.15 já está na linha `s3.2`** (`043b382`, `8633608`, 626/626). A branch `s6.15-pausa-menu`, de base anterior, provavelmente foi superada. S6.10 pede o clipe "deslocar lateralmente", que contradiz a S2.12 (A/D não deslocam) |
| S7 | 0/11 | — | — | — |

Contagem conservadora corrigida: **29 checkboxes + 3 entregues (S3.3, S3.4, S4.2)
= 32 de 93 (34%)**, ou 36 de 93 se as quatro antecipações da S6 forem aceitas como
entregues. O prompt dizia 40 porque contava S3.1, S3.2, S4.1 e S5.1 como entregues.
Depois do patch, o plano passa a ter **114 checkboxes** (S5 +3, S8 10, S9 8).

## 2. Decisões propostas por ponto do prompt (proposta)

1. **Extração por aniquilação. Entra no protótipo (S3.9, S4.7).** "Mapa limpo"
   significa fila do encontro configurado vazia e nenhum inimigo vivo desse
   encontro. A regra R6 já define isso para a onda. A R4 da wiki ("hordas e carga
   obrigatória completas") é substituída pela R10: **o mapa limpo libera a
   decolagem, e a quota só decide se a campanha avança**. Na introdução as duas
   coisas coincidem: 4 Patrol soltam 4 cobres, e 4 + 6 mutantes soltam 10
   orgânicas. Isso mantém a lógica de entrega parcial da S3.2 (cobre deixado no
   chão → nova visita). O desenvolvimento mantém o retorno livre.
   Conflito com a base: hoje a cabine deixa voltar com qualquer carga (S3.2),
   e o fluxo de viagem diz que a nave não espera as hordas. O patch reescreve os
   passos 5 e 6.
2. **Derrota volta para antes da decolagem. Entra no protótipo (S4.9, S3.1).**
   A derrota perde a mochila e o saldo do porão da tentativa, como já acontece
   na S3.2. A carga de visitas anteriores e o progresso do hub ficam preservados.
   Em vez de **Tentar novamente** em Shanghai, o jogador volta a Marte no deck,
   em estado anterior à decolagem. O custo de suprimentos é cobrado uma vez por
   tentativa (S5.12). O desenvolvimento mantém o retry atual.
3. **Colapso e Game Over. Corte mínimo no protótipo (S5.12–S5.14).** Um estoque
   vital agregado ("suprimentos") no save da campanha:
   - consumo por decolagem e custo extra por falha;
   - aviso por limiar no rádio de EDEN, ou do Engenheiro antes de EDEN ligar;
   - colapso ao zerar, ou ao atingir o limite de falhas;
   - campanha marcada como encerrada, sem apagar o save, e saves dev intactos;
   - tela funcional de Game Over.

   A versão estilizada fica na S6.16, junto de resultado, derrota e retry. Sem
   esse corte, o ciclo de risco não seria testado no playtest S5.8.
4. **Cadeia v0.3. Sistema completo na Sprint 8.** O corte mínimo do protótipo é o
   estoque agregado do ponto 3, e não "um secundário e um terciário". Motivo: o
   circuito de 05/11 decidiu "sem consumo nas ativações", e uma receita parcial
   obrigaria a inventar quantidades. Se o autor preferir ver o Sintetizador
   produzir já no protótipo, a alternativa é antecipar só a S8.2 com o Composto
   nutritivo (orgânica + cobre) na ativação do sintetizador.
5. **Oficina e evolução de armas. S9.1 e S9.2.** A evolução parte do
   `MACHETE_COMBO` de três cortes (650/500/800 ms) e é paga com ferro e titânio.
   Depende da S8, porque o dilema do ferro só existe com as Células de energia.
6. **Escolha de mapa. S9.4.** Entrega a seleção e o contrato de dados; novos mapas
   continuam no backlog 5, já que hoje só existe Shanghai.
7. **Data Center. S9.3.** Habilidades e passivas do Salvager, que só funcionam
   com o Data Center ligado.
8. **Circuito inicial. Vale o de 05/11** (Engenheiro, 4 Patrol, 4 cobres,
   10 orgânicas). Motivos:
   - é decisão expressa do autor, registrada em `CIRCUITO_INICIAL.md`;
   - já está implementado em parte, com `CAMPAIGN_QUOTAS`, `campaign-copper` e 625+ testes;
   - a v0.2 da wiki (EDEN primeiro, 8 Patrol, 12/12, árvore de 13 prédios, diamantes) é anterior a ele.

   As tarefas S3.1, S3.2, S4.4 e S5.x mantêm as quantidades e mudam só nomes e
   condição de retorno. **A wiki precisa ser atualizada** nos blocos
   `economy.tutorial` e `levels.shanghai-missao-1/2`, e na nota de S5 de `sprints`.
   Ela está fora do Git; quem atualiza é o autor.
9. **Nomes.** O patch usa Patrol Shangai, Patrol Shangai Pesado, Mutante Shangai,
   Mutante Shangai Pesado, facão de plasma, rifle laser e Salvager nos textos que
   alterou. Restam **21 ocorrências de "espada" no plano**, em textos que não foram
   alterados e em registros históricos. Também não foi feita a troca em código,
   assets e saves, que está fora do escopo. "Última colônia": nenhuma ocorrência
   no repositório nem na wiki.
10. **Escopo do protótipo.** Para não inflar a S5, a proposta cria a **Sprint 8 ·
    Economia e sobrevivência da colônia** e a **Sprint 9 · Progressão de combate e
    expansão**. A numeração vem depois da 7, para preservar a atual, mas a
    execução depende só da S5.8 e pode correr em paralelo à arte. **Sai do
    protótipo:** as seis placas de alumínio da S4.3, que não existem na v0.3 e vão
    para o backlog 1. **Entra:** S5.12–S5.14 e as regras novas de S3.9, S4.7 e S4.9.

## 3. Tabelas por sprint (proposta)

Impacto no protótipo: ↑ aumenta escopo até a S5 · = neutro · ↓ reduz.

**S0–S2:** manter tudo. Já estão encerradas.

### Sprint 3

| Tarefa atual | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S3.1 progressão por expedições | Ajustar | Mapa limpo como condição de retorno; save guarda estoque vital e fim de campanha | S5.12–S5.14 | ↑ pequeno |
| S3.2 4 Patrol / mutantes 4 e 6 | Ajustar (nomes) | Nomes atuais; ondas de mutantes ainda faltam | S5.1 (facão entregue) | = |
| S3.3 criaturas e investida | Manter | Entregue | — | = |
| S3.4 spawn seguro | Manter | Entregue | — | = |
| S3.5–S3.7 minas, barreiras, implantação | Manter | Sem relação com a revisão | — | = |
| S3.8 munição | Manter | — | — | = |
| S3.9 SHANGHAI CLEAR | Ajustar | Define "mapa limpo" e mostra inimigos restantes | S3.1 | ↑ pequeno |
| S3.10–S3.12 | Manter | — | — | = |

### Sprint 4

| Tarefa atual | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S4.1 inventário | Manter | Parcial: faltam dispositivos | S3.5–S3.7 | = |
| S4.2 drops | Ajustar | Alinhar ao runtime (Pesado → titânio, Mutante Pesado → 3) | — | = |
| S4.3 depósitos e placas | Ajustar (placas → backlog) | Placas não existem na v0.3 | — | ↓ |
| S4.4–S4.6 | Manter | Quotas de 05/11 continuam | — | = |
| S4.7 sinalizar nave / liberar retorno | Ajustar | Extração por aniquilação | S3.9 | ↑ pequeno |
| S4.8 depósito único | Manter | Confirmar a proposta de entrega por visita da S3.2 | — | = |
| S4.9 derrota/abandono | Ajustar | Volta antes da decolagem e custo de falha | S5.12 | ↑ |
| S4.10–S4.11 | Manter | — | — | = |

### Sprint 5

| Tarefa atual | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S5.1 Engenheiro / facão / ativações | Ajustar (nome) | Facão de plasma; entrega e ativações ainda a ligar | S3.1 | = |
| S5.2–S5.11 | Manter | — | — | = |
| — | **Nova S5.12** estoque vital e custo por falha | Peso real das falhas no protótipo | S3.1, S4.9 | ↑ |
| — | **Nova S5.13** aviso de risco por EDEN/Engenheiro | Pressão legível antes do colapso | S5.12, S4.11 | ↑ pequeno |
| — | **Nova S5.14** colapso e Game Over no save | Fim definitivo da campanha sem apagar o dev | S5.12 | ↑ |

### Sprint 6

| Tarefa atual | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S6.10 catálogo de clipes | Ajustar | Remover "deslocar lateralmente" (contrato S2.12) | — | = |
| S6.15 entrada, pausa e configurações | Manter | Pausa já está na linha `s3.2`; autor decide o destino da branch `s6.15-pausa-menu` | — | = |
| S6.16 telas de missão | Ajustar | Incluir derrota → hangar e Game Over da colônia | S5.14 | = |
| S6.17 depósito/laboratório | Manter | Painel da economia completo vai para a S8.7 | S8 | = |
| Demais | Manter | — | — | = |

**S7:** manter tudo.

### Sprint 8 · Economia e sobrevivência da colônia (nova)

| Tarefa | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S8.1 modelo de dados e save da economia | Nova | Base da cadeia v0.3; migra o estoque da S5.12 | S5.12 | fora |
| S8.2 Sintetizador com três receitas | Nova | Secundários | S8.1, valores do autor | fora |
| S8.3 Estufa com dois terciários | Nova | Rações e estimulantes | S8.2 | fora |
| S8.4 consumo das unidades | Nova | Control Room, Data Center, Cafeteria, Meeting Room, Estufa, Quarters | S8.2–S8.3 | fora |
| S8.5 efeitos da falta / colapso por recurso | Nova | Substitui o agregado da S5.14 | S8.4 | fora |
| S8.6 Ligas reforçadas e reparos | Nova | Hangar e Control Room após falhas | S8.2 | fora |
| S8.7 painel da colônia | Nova | Mars Colony Clean | S6.17 | fora |
| S8.8 rádio de risco e decisões | Nova | Meeting Room | S4.11 | fora |
| S8.9 balanço do dilema do ferro | Nova | Ferro disputado entre Oficina e células | S8.4, S9.1 | fora |
| S8.10 playtest | Nova | — | S8.1–S8.9 | fora |

### Sprint 9 · Progressão de combate e expansão (nova)

| Tarefa | Mudança | Motivo | Dependências | Impacto |
|---|---|---|---|---|
| S9.1 golpes novos do facão de plasma | Nova (vem do backlog 2) | Evoluir arma é necessidade | S8.1, `MACHETE_COMBO` | fora |
| S9.2 melhorias do rifle laser | Nova (backlog 2) | — | S8.1 | fora |
| S9.3 Data Center: habilidades e passivas | Nova | Sem tarefa até hoje | S8.4 | fora |
| S9.4 Control Room: escolha de mapa | Nova | Libera mapas; hoje só existe Shanghai | S8.4, backlog 5 | fora |
| S9.5 Quarters | Nova | Recuperação e população | S8.4 | fora |
| S9.6 Hangar: loadout | Nova | — | S8.1 | fora |
| S9.7 dificuldade das revisitas | Movida (backlog 3) | Equilíbrio com a evolução | S9.1–S9.3 | fora |
| S9.8 playtest | Nova | — | S9.1–S9.7 | fora |

**Backlog:** item 2 (armas) e item 3 (dificuldade adaptativa) passam para a S9;
a Estufa do item 4 passa para a S8.3. O item 6 (resgate/checkpoints) deve ser
reavaliado diante da morte definitiva da base.

## 4. Perguntas ao autor

1. Quantas falhas seguidas, ou qual estoque mínimo, levam ao colapso? E qual é o
   estoque inicial da campanha?
2. Ao colapsar, a campanha acaba de vez ou existe um checkpoint de emergência?
   O patch assume fim definitivo, com o save marcado como encerrado e não apagado.
3. O custo de cada falha é fixo por decolagem ou proporcional ao tempo perdido?
   O que conta como falha: só a morte, ou também abandono e reload?
4. A moral (Meeting Room) entra no protótipo ou fica para depois? A proposta deixa
   a moral na S8, com só o estoque agregado na S5.
5. Quais golpes novos o facão de plasma ganha primeiro, e quanto custam?
6. Quanto de cada primário rende cada receita secundária, e em quanto tempo?
7. Confirma que "mapa limpo" libera a decolagem e que a quota decide só o avanço
   da etapa? A alternativa é exigir as duas coisas para decolar.
8. Confirma que as placas de alumínio saem do protótipo?
9. Corte mínimo: o estoque agregado (proposta) ou já um secundário e um terciário
   reais (Composto nutritivo e Rações)?
10. A branch `rochatales/s6.15-pausa-menu` foi superada pelo complemento de pausa
    na linha `s3.2`?
11. Os retornos com mapa limpo repõem suprimentos? Se não, todo estoque só desce
    até a S8.

### Respostas do autor · 07/11/2026

Respondidas na sessão, antes de aplicar os patches. Os patches foram regerados com elas.

| # | Decisão |
|---|---|
| 1 | Valores iniciais do corte mínimo: estoque **10**, decolagem **−1**, falha **−2**, retorno com mapa limpo **+3**, colapso em **0**. Ficam centralizados em configuração e são ajustáveis no playtest. Limiares de aviso 5 e 2 são proposta do agente |
| 2 | **Fim definitivo.** A campanha fica marcada como encerrada no save, sem checkpoint de emergência |
| 3 | Custo **fixo** por tentativa. Morte, abandono e reload durante a missão contam como falha, cobrada uma vez |
| 4 | Moral (Meeting Room) na **Sprint 8** |
| 5 | Golpes do facão de plasma: **[A DEFINIR]**, a decidir perto da S9 |
| 6 | Rendimento e tempo das receitas: **[A DEFINIR]**, antes da S8.2 |
| 7 | **Só mapa limpo** libera a decolagem. A quota decide apenas o avanço da etapa |
| 8 | Placas de alumínio vão **ao backlog** |
| 9 | Corte mínimo por **estoque agregado** |
| 10 | Branch `rochatales/s6.15-pausa-menu` **superada** pela pausa da linha `s3.2` |
| 11 | **Sim**: cada retorno com mapa limpo repõe suprimentos |

## 5. Verificação

- Mudanças só de documentação: este handoff e dois patches. Nenhum arquivo de
  runtime, plano ou quadro foi alterado nesta branch.
- `git apply --check` dos dois patches sobre `d128817`: **aplicam limpo**.
- O patch do quadro já contém o patch S2 de 05/11. Aplicar o S2 depois dele gera
  conflito, por isso **aplique só o patch novo**.
- Nenhum teste lê o texto do plano (busca em `tests/*.mjs`), então `npm test`
  não foi executado: não há dependência de texto.
- Tudo foi lido no repositório em `d128817`: drops (`simulation.ts`), combo
  (`melee.ts`), eventos ligados (`dispatch`) e quotas (`campaign.ts`).
- A wiki (`docs/wiki/index.html`, fora do Git) foi lida no checkout principal só
  para comparação, e não foi alterada.
- `git diff --check` verde no commit desta branch; linhas de contexto vazias dos patches sem espaço final, como no patch S2.
- Não foram verificados um a um os aceites das antecipações S6.1, S6.3, S6.8 e
  S6.10. Elas seguem a tabela do prompt.

## 6. Como aplicar depois da aprovação

Na branch de integração, a pedido do autor:

```bash
git apply docs/handoffs/revisao-sprints-2026-11-07-plano.patch
git apply docs/handoffs/revisao-sprints-2026-11-07-quadro.patch
```

O registro das decisões em `HORDA_SURVIVOR_AUDITORIA_E_PLANO.md` (§7.4, §7.5 e
uma seção nova de economia v0.3) fica para quando o autor pedir.

## 7. Aplicação aprovada pelo autor · 07/11/2026

O autor aprovou a aplicação. Os patches não aplicam na integração, nem em
`b54162c` nem em `90e7734`, porque dependem da linha `s3.2-primeira-expedicao`,
ainda não consolidada. Por decisão do autor, foram aplicados **nesta branch**,
que parte de `d128817`, como exceção explícita à regra de não editar o plano e o
quadro em branch de tarefa. Eles entram na integração junto com a consolidação
dessa linha. Sem merge e sem push.
