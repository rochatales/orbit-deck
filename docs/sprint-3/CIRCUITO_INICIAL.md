# Primeiro circuito de EXODEN — decisão do autor · 05/11/2026

Regra vigente da introdução, informada pelo autor nesta sessão. Substitui a
proposta antiga de três ondas, carga de 20 cobres/placas e máquina de diamantes
na primeira volta. É especificação: o circuito completo ainda não foi implementado.
Numeração e checkboxes continuam no [plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md).

Atualização local · 06/11/2026: o autor forneceu o astronauta branco e seis
animações para o Engenheiro. O [recorte de presença e rotina](../handoffs/s5.1-engenheiro-colonia.md)
o inclui entre Oficina e Data Center, com caminhada, trabalho agachado, assento,
reação ao esbarrão e conversa. Usa Yelling antes de EDEN e Acknowledging depois,
conforme `edenActive` da campanha. A entrega da espada, os briefings funcionais,
as ativações e os encontros continuam pendentes; as referências abaixo ao NPC
ausente descrevem a especificação e o recorte anterior de 05/11. Sem aceite visual
ou encerramento de checkbox nesta atualização.

## Sequência do jogador

| Etapa | Objetivo e orientação | Mudança ao concluir |
|---|---|---|
| Chegada a Marte | Colônia escura/desativada; único NPC humano inicial é o **Engenheiro**, ainda a incluir no mapa. Ele explica a necessidade de cobre e encaminha a primeira expedição à Terra. EDEN começa desligada. | Libera a primeira ida a Shanghai; EDEN ainda não guia. |
| Primeira expedição | **4 Patrol comuns no total**, um em cada esquina próxima ao quarteirão do jogador. Já em Shanghai, o **Engenheiro** transmite a quota: **4 cobres**. | Ao ter cobre suficiente, orientar o retorno a Marte. Nenhum requisito de placas, matéria orgânica ou quatro hordas nessa primeira visita. |
| Primeiro retorno | Voltar a Marte e ligar **EDEN** com o objetivo de cobre cumprido. | Acendem **Sala de Controle, Data Center e Meeting Room**. EDEN assume o papel de guia, que continua pelo jogo. |
| Preparação da segunda expedição | Interagir com EDEN; a história intermediária ainda será escrita. Ela explica os princípios radioativos da matéria orgânica dos mutantes e sua importância para o **sintetizador orgânico**. Orienta passar na **Oficina**, onde pediu ao Engenheiro uma arma especial. | Receber a espada/facão para enfrentar os mutantes e seguir à Terra. O modelo atual pode servir ao protótipo; arte final do Engenheiro e da entrega ainda não existe. |
| Segunda expedição | Pequenos mutantes em duas ondas: **4**, depois **6**. Cada um fornece uma matéria orgânica; recolher as **10**. | EDEN confirma a quota pelo rádio e pede retorno à base. |
| Segundo retorno | Voltar e ligar o **sintetizador orgânico**. | Acendem **Laboratório, Estufa e Food Storage**. Encerra o primeiro circuito e começa a progressão principal. |
| Expedições posteriores | Gameplay atual de quatro hordas **13/26/32/44**, total **115**. | Adaptação futura conforme evolução do personagem; algoritmo/limiares ainda não definidos. |

“Espada” é a arma atualmente chamada **facão** no runtime/HUD. Não inferir uma
segunda arma nova nem alterar os atalhos 1/2/3 do desenvolvimento por essa nomenclatura.
Na introdução, a entrega na Oficina antecede a expedição de mutantes; detalhes da
concessão/interação serão implementados como etapa própria, sem liberar a espada
por completar um encontro de teste.

## Transmissões fornecidas pelo autor

Já na primeira expedição, pelo Engenheiro:

> Conferi aqui, você vai precisar de 04 unidades de cobre.

Após coletar dez matérias orgânicas, por EDEN:

> Excelente, já temos o suficiente. Volte a base e vamos ligar o sintetizador.

Usar eventos de chegada/coleta e disparar uma vez por etapa/tentativa; não repetir
por frame, não anunciar quota cumprida com recurso ainda no chão e não trocar o remetente
para EDEN antes de ela ser ativada. As demais falas são conteúdo provisório,
com a história intermediária explicitamente pendente do autor.

## Combate, carga e progressão são eventos diferentes

- Derrotar um Patrol não é coletar cobre; derrotar o décimo mutante não é ter
  dez matérias orgânicas na carga. O aviso de quota deve consultar a coleta real.
- O retorno de cada visita usa seu próprio objetivo: **4 cobre**, depois **10
  orgânica**. Não exigir placas ou a receita antiga da máquina de diamantes.
- Embarcar não confirma extração. Consolidar recursos/progresso no retorno correto,
  uma vez por expedição; não concluir etapas por reinício, morte, reload ou duplo clique.
- Ligar EDEN e ligar o sintetizador são ações no hub distintas da viagem e da
  coleta. Persistir ativações para não cobrar/conceder a mesma coisa duas vezes.
- O autor definiu quotas, destinos e ativações. Consumo dos recursos, ponto exato
  de interação e apresentação das ativações ainda precisam de implementação e
  validação; não registrar uma receita adicional como se já tivesse sido aprovada.
- Acender salas/estufa/food storage é estado de ativação visual e funcional desse
  circuito; não implica implementar sistemas completos de energia, comida,
  população ou produção de diamantes.

## Save de desenvolvimento

As quatro hordas e as outras frentes continuam disponíveis em **Encontro de teste**.
O save de desenvolvimento mantém a experiência atual para testes; não é convertido
silenciosamente para Marte apagado nem perde armas, carga ou progresso.
Uma introdução nova precisa de estado/modo separado e reset explícito. Completar
um encontro de teste não libera EDEN, espada ou sintetizador na campanha.

## Recortes pelo plano oficial

- **S3.1/S3.2/S3.4/S3.9:** encontros e spawns da introdução, ondas de pequenos
  mutantes e quatro hordas posteriores/de teste; vitória e exploração livre.
- **S4.4/S4.5/S4.7/S4.8/S4.11:** objetivos 4 cobre/10 orgânica, remetente do rádio,
  viagens, carga confirmada e orientação por eventos sem duplicação.
- **S5.1–S5.5:** Engenheiro funcional, briefing/entrega da espada na Oficina, interações/ativações de EDEN e sintetizador, estado do hub e save. Esses complementos podem ser antecipados para viabilizar o playtest do primeiro circuito, sem esperar arte final.
- **S6.8/S6.12/S6.13:** Engenheiro e apresentação das salas/Oficina; manter os
  prédios, telhados e fontes atuais, com aceites visuais pelo autor.

A primeira entrega técnica desta branch é [S3.4 — spawn seguro](../handoffs/s3.4-spawn-seguro.md).
Ela não implementa automaticamente este circuito. Minas, barreiras e implantação
S3.5–S3.7 continuam no escopo de combate; definir sua entrega ao jogador sem
inventar um kit obrigatório na primeira expedição.


## S3.1 — Estado e save separados · recorte de 05/11/2026

Decisões adicionais do autor, sem encerrar checkbox:

1. Cada Patrol continua soltando ferro e cobre. Os quatro ferros da primeira
   visita não são exigidos nem usados nesse trecho.
2. Na campanha, a espada fica bloqueada até a entrega na Oficina. Neste recorte
   existe apenas `swordReceived`; o bloqueio efetivo entra com a primeira expedição.
   No desenvolvimento, armas e atalhos continuam como estão.
3. Morte na expedição perde a carga da tentativa e recomeça a expedição; a quota
   deve continuar alcançável. O estado da campanha não avança por morte/restart.
4. **Início** abre campanha; **Continuar** e **Encontro de teste** entram no
   desenvolvimento. A campanha usa a chave própria `exoden:campaign:v1`, sem
   modificar `exoden:hub:v1` ou a carga `exoden-carga-aeronave-v1` do desenvolvimento.

Detalhe proposto pelo coordenador, implementado para revisão e **a confirmar com
o autor no roteiro**: se houver campanha salva, Início oferece **Retomar campanha**
ou **Recomeçar**; recomeçar exige confirmação explícita antes de substituir o save e conserva
nome/cor da campanha, sem herdar a identidade dev do formulário. A segunda batida
de um duplo clique em Recomeçar não conta como confirmação.
Reload retorna à entrada, sem escolher modo automaticamente. O modo fica fixo até
**Voltar à tela inicial** no menu de pausa.

A máquina de estados separa depósito e conclusão: `depositExpedition` registra
cobre/orgânica por ID; confirmar a expedição e ativar EDEN/sintetizador são eventos
explícitos posteriores. Retém IDs anteriores, além do último, para impedir também
a duplicação A → B → A após reload. Não há consumo ou receita neste recorte.

O save guarda perfil/briefing locais, estado da campanha e sua carga; o porão em
campanha não consulta nem grava a carga dev. Morte/restart não avançam a campanha nem depositam recursos. Ainda não há ligação
automática das viagens com `depositExpedition`: extração efetiva é outro recorte.
A mochila segue o retry atual; o porão da campanha permanece persistido, como
no desenvolvimento, até existir o limite de cada expedição. O descarte do porão
por tentativa da decisão 3 será ligado nesse recorte, sem apagar carga de visitas
anteriores. Não há novo tratamento de viagem ou extração aqui.

O HUD mostra o objetivo provisório da etapa. Engenheiro, encontros 4/4+6,
iluminação desativada, rádio e ativações em cena ainda não estão implementados;
a campanha continua jogando com os mapas/combate atuais. [Entrega e roteiro](../handoffs/s3.1-campanha-estado.md).
