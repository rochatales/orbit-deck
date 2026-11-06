# Revisão S3.1/S3.2: `add20f2` contra a base `6005d3f`

**Nenhum defeito P0/P1 de persistência, entrega ou bloqueio.** São seis achados de menor gravidade (quatro P2, dois P3), todos em rádio ou texto. Nenhum perde save ou conta entrega indevida.

**Como confirmei:** só por rastreio de código. O script de reprodução e o `tsc` precisavam de aprovação neste modo, então nenhum dos seis foi executado. Não contornei o bloqueio.

## P2

**1. O rádio de quota dispara com cobre antigo, sem coleta nova**
- **Onde:** `src/state/useExpeditionStore.ts:179`
- **Causa:** a soma usa `sim.copper + attemptCargo.copper`. Cobre retirado do porão entra em `sim.copper`, e cobre redepositado entra em `attemptCargo`.
- **Efeito:** só ocorre com cobre nunca contado, como o de um save S3.1. Em save novo, o cobre do porão já foi entregue, e a soma coincide com o total real.
- **Reprodução:**
  1. Use um save S3.1 com 4 cobres no porão e fale com o Engenheiro.
  2. Viaje a Shanghai, desembarque e retire os 4 cobres sem matar nenhum Patrol.
  3. O rádio diz "Já temos cobre suficiente. Guarde na aeronave e volte a Marte."
  4. Guarde e volte: o objetivo continua em `0 / 4`, porque `attemptDelivery` fica zerado.
- **Variante:** com 2 antigos e 2 novos, o rádio também dispara, mas a entrega fica em `2 / 4`.

**2. "Nova tentativa" aparece como transmissão do Engenheiro**
- **Onde:** `src/state/useExpeditionStore.ts:173`, exibido em `src/app/App.tsx:154`
- **Causa:** `restartMission` troca `radio` direto e não atualiza `radioSender`, que continua `'Engenheiro'`.
- **Reprodução:**
  1. Em `expedition-copper`, chegue a Shanghai, morra e clique em Tentar novamente.
  2. Abra ESC: aparece "Última transmissão · Engenheiro" com "Nova tentativa. Mova-se, mire com o mouse…".
- **Variante:** se a mensagem de chegada ainda estiver na tela, o toast troca de texto e mantém o remetente.

**3. O rádio de Shanghai pode aparecer em Marte**
- **Onde:** `src/ui/RadioToast.tsx:6-8`, `src/app/App.tsx:138`
- **Causa:** o serial criado na chegada fica pendente até `active` ser verdadeiro, sem vínculo com o mapa. A campanha não emite outro rádio ao pousar em Marte (`App.tsx:63`).
- **Reprodução:**
  1. Decole para Shanghai.
  2. Na cabine, sem desembarcar, clique em "Retornar a Marte".
  3. Desembarque em Marte: surge "Conferi aqui, você vai precisar de 04 unidades de cobre.", remetido pelo Engenheiro.

**4. A cabine contradiz a decisão de perda por tentativa**
- **Onde:** `src/ui/ShipCockpit.tsx:82`, texto anterior a este commit, mas agora falso na campanha
- **Efeito:** em Shanghai a cabine diz "A carga da nave permanece salva", embora embarcar e decolar não consolidem. O painel de carga foi corrigido (`ShipCargoPanel.tsx`), mas a cabine não.
- **Reprodução:**
  1. Guarde cobre e embarque em Shanghai: leia o aviso.
  2. Recarregue a página e retome: a carga sumiu, como a regra manda.

## P3

**5. EDEN desligada transmite na campanha**
- **Onde:** `src/state/useExpeditionStore.ts:108`
- **Reprodução:** comece uma campanha e abra ESC. Aparece "Última transmissão · EDEN" com "Encontre-a para receber o briefing", enquanto o objetivo é o Engenheiro e EDEN está bloqueada.
- **Relacionado:** a cabine mostra "EDEN · CONECTADA" (`ShipCockpit.tsx:65`).

**6. Hordas são anunciadas como patrulha**
- **Onde:** `src/combat/CombatHud.tsx:50`
- **Causa:** o texto depende só de `campaign`, mas `eden-activation` usa hordas (`campaignEncounter.ts:5`).
- **Reprodução:** complete a quota, volte a Shanghai e limpe as hordas: o título é "Patrulha neutralizada".
- **Sem munição:** o texto também perde o aviso de reabastecimento na horda seguinte.

## Critérios rastreados sem defeito

| Critério | Resultado do rastreio |
|---|---|
| Carga em risco | Morte, reinício, reload e tela inicial descartam o saldo; só a chegada a Marte consolida |
| Saves | S3.1 carrega sem reescrita; os invariantes de `attemptCargo` e `attemptDelivery` se mantêm e não invalidam o save; o código de campanha não grava nas chaves dev |
| Entrega | Só porão, sem consumo, ID novo por visita, 2+2 conclui; não encontrei caminho de crédito duplo com `withdrawnCargo` |
| Briefing | Seleção central cobre `ship`, `npc` e `synthesizer`; F, evento, botão, aba e transferência estão guardados; EDEN segue bloqueada depois |
| Balão distante | Sem botão nem ativação; estado React só muda quando a exibição muda |
| Encontro | 4 Patrol, mínimo de 14 m, sem hordas ou seletor; `routeIndex = -1` usa o mesmo caminho de marcha das hordas |
| Rifle | Espada bloqueada em tecla, inventário e `equip`; arma dev restaurada |
| Câmera e faixa | Posição inicial coerente com `useFrame`; visor por instância, sem luz, com descarte; pontos padrão do jogador preservados |

## Verificações
- **`node --test tests/*.test.mjs`:** 620/620 verdes.
- **`git diff --check`:** limpo.
- **Não executados:**
  - `npm run build`, `tsc` e navegador.
  - Encontro em `?shanghaiAtual`, sem teste. A leitura dos obstáculos não indica bloqueio, mas `simulation.ts:228` lança erro se uma esquina for inválida.
- **Script colado:** não rodei o `claude -p`, então `/tmp/s3-2-review-stream.jsonl` não foi gerado.
- **Repositório:** nada foi editado, commitado ou enviado.

## Para o autor decidir (não concedido)
1. **Carga antiga retirada:** ela se perde com morte ou reload se estiver na mochila, porque o porão é gravado na retirada. Retirada e redepositada, também fica em risco. O teste fixa a perda na morte (`tests/first-expedition.test.mjs:38-41`) e o handoff assume o risco do redepósito, mas `CIRCUITO_INICIAL.md` diz que a carga de visitas anteriores "permanece a salvo". Vale confirmar qual regra fica.
2. **Faixa do Engenheiro:** ela já está no runtime (`src/npcs/engineerRig.ts:33`), mas os renders não são aceite. A regra registrada para acessórios exige encaixe aprovado antes de entrar no jogo, então trate a aprovação como condição para o merge.
3. **Quota parcial:** com 2 já entregues, o rádio só avisa ao somar 4, não ao cobrir os 2 restantes. Isso segue o handoff, mas o autor pode preferir outro comportamento.
4. **Aceite visual e de jogabilidade:** continua pendente, incluindo as propostas de entrega automática e de faixa sem SpotLight.
