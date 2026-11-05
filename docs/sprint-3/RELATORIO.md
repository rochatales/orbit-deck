# Sprint 3 — Ondas, categorias e dispositivos

## Abertura · 05/11/2026

Pedido do autor: seguir com a Sprint 03 após o fechamento aprovado da Sprint 2
e a organização documental. Base desta tarefa:
`dba89401230aa2766065de40a45b5bf5b8d56fe8`, que conserva o mapa correto `00ab557`,
os aceites S2 e a documentação organizada. Não partir da publicação antiga
nem do checkout principal com trabalhos do autor.

Branch `rochatales/s3-ondas-dispositivos`; implementador Codex, revisor Claude.
O quadro de execução permanece reservado à integração; esta é a fonte do
andamento local da tarefa, sem marcar checkboxes oficiais.

## Decisão do autor · primeiro circuito

[Contrato completo da introdução](CIRCUITO_INICIAL.md), informado nesta sessão:

1. Marte escuro/desativado, único NPC inicial **Engenheiro**, EDEN desligada.
2. Primeira visita a Shanghai: **4 Patrol comuns**, um por esquina próxima ao
   quarteirão; Engenheiro informa pelo rádio a quota de **4 cobres**, já no mapa.
3. Retorno: ligar EDEN acende Sala de Controle, Data Center e Meeting Room.
4. EDEN assume a orientação, explica a matéria orgânica dos mutantes e envia à
   Oficina para receber do Engenheiro a espada/facão antes de voltar à Terra.
5. Pequenos mutantes em ondas **4 e 6**, para coletar **10 matérias orgânicas**.
   EDEN avisa que há o suficiente e pede retorno.
6. Ligar o sintetizador orgânico acende Laboratório, Estufa e Food Storage.
   Então começa a gameplay posterior de quatro hordas **13/26/32/44**.

As quatro hordas e outras frentes permanecem no save de desenvolvimento. Evolução
adaptativa é futura. História intermediária de EDEN, arte/apresentação do Engenheiro
e detalhes de interação/consumo continuam pendentes; as quotas e ativações estão
definidas. A decisão atualiza o plano e design sem encerrar checkboxes. O runtime
desta entrega ainda não implementa a introdução separada nem apaga Marte no save dev.

## Escopo confrontado com o runtime

| Item oficial | Evidência nesta base / próximo trabalho |
|---|---|
| S3.1 / S3.2 | Sequenciador antecipado de quatro hordas 13/26/32/44, total 115, até 44 ativos, 4 s iniciais e 6 s de intervalo. Plano atualizado pela decisão acima: introdução por expedições, com quatro hordas posteriores e no modo de teste. Esta entrega acrescenta espera por spawn seguro ao encontro existente; não implementa ainda a introdução. |
| S3.3 | Quatro categorias e investida sinalizada já presentes; comportamento fez parte do combate aprovado na S2. Conferir legibilidade junto aos dispositivos antes do fechamento completo. |
| S3.4 | Primeira entrega desta rodada: distância de spawn, separação entre aliados e espera quando não há ponto seguro. Recuperação de movimento existente preservada; morte/drop idempotentes. Roteiro manual pendente. |
| S3.5 | Três minas ainda por implementar. |
| S3.6 | Duas barreiras azuis destrutíveis/temporárias ainda por implementar. |
| S3.7 | Preview e implantação, proteção do desembarque e invalidação da grade ainda por implementar com os dispositivos. |
| S3.8 | Reabastecimento por horda com margem de 50% e caixas alcançáveis já presentes. Reavaliar margem após os dispositivos. |
| S3.9 | Horda atual e área neutralizada já presentes; texto SHANGHAI CLEAR, rádio por cobre e avanço por retorno/circuito no hub precisam acompanhar a nova introdução. A fila agora impede conclusão antecipada. |
| S3.10 | Armas, acertos/dano, investida, ambiência, volume/mudo/pausa presentes. Faltam explosão da mina e quebra da barreira. |
| S3.11 | Traçadores e partículas limitados e reutilizados; verificar novos efeitos de dispositivos e seu descarte no reinício. |
| S3.12 | Categorias/nav testadas antecipadamente; falta playtest com dispositivos, reação e legibilidade. Manter grade, sem migração para navmesh. |

Esta tabela não aprova nem encerra os itens completos. O [plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md)
continua sendo a fonte de numeração e checkboxes. Nesta entrega o código conserva
as quatro hordas do desenvolvimento; a introdução separada seguirá a decisão
acima, sem aplicar o antigo teto de oito ou sobrescrever o save de desenvolvimento.

## Ordem de execução

1. S3.4 e parte de S3.1: spawn seguro e fila, revisão e validação do autor.
2. S3.1/S3.2/S3.9 e ligação com S4.4/S4.5/S4.7: introdução separada do modo de teste,
   quatro Patrol por esquinas, orientação por cobre, retorno e nova visita com a espada.
   Conectar os objetivos definidos de quatro cobres/dez matérias orgânicas às ativações do hub (S5.1–S5.5), sem inventar custos adicionais ou alterar o save dev.
3. S3.5–S3.7: minas, barreiras e implantação com navegação segura.
4. S3.8–S3.12: ajustar suprimentos/feedback e validar o ciclo completo.

Atalhos atuais de rifle/facão/kit preservados. As escolhas de interação dos
dispositivos precisam ficar documentadas antes do playtest.
Vídeos de transição no loading da navegação da aeronave continuam com o autor,
S6.16, fora desta rodada.

O Engenheiro/estado inicial e as ativações do hub são trabalho ligado a S4/S5/S6,
com geometria provisória possível e arte final pendente; não declarar esses sistemas
implementados só por fechar a parte de combate da S3.

## Verificação da primeira entrega

Ver [handoff](../handoffs/s3.4-spawn-seguro.md) e [roteiro](VALIDACAO_MANUAL.md).
O teste novo reproduziu a regressão de distância nas quatro bordas antes da
correção; depois, desembarque e quatro bordas permitem as quatro hordas completas
sem sobreposição no nascimento. Pausa, espera, baixa única e reinício têm
cobertura adicional. O teste de restart cobre o store/HUD e o incremento de `run`;
a recriação/descarte pela cena foi conferida por leitura, com validação manual pendente. Resultado de suíte/build e revisão registrado no handoff.
