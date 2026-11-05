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

- Primeiro combate com **4 Patrol comuns no total**, um por esquina próxima ao
  quarteirão do jogador. Confirmação expressa: “4 no total, um por esquina”.
- EDEN avisa no rádio que já há cobre suficiente; o jogador retorna a Marte.
- Em Marte, cumpre um circuito de gameplay que o orienta a retornar com a espada.
  Ações do circuito, concessão/disponibilidade da espada e quantidade de cobre ainda
  não estão definidas nesta entrega; a quota e as ações foram solicitadas ao autor.
  Quatro Patrol atualmente entregam quatro cobres. A arma referida como espada
  corresponde ao facão já existente; nenhuma nova arma/arte foi criada.
- Nova visita: pequenos mutantes em ondas de **4 e 6**. Só depois entram as
  quatro hordas atuais. A adaptação à evolução futura ainda não tem regra implementada.
- As quatro hordas permanecem no save/modo de desenvolvimento, em encontros de
  teste, sem representar a primeira expedição de uma introdução nova.

A decisão foi incorporada ao plano oficial e ao documento de design, com
checkboxes pendentes. O runtime desta primeira entrega ainda conserva os encontros
existentes; o circuito introdutório não está implementado nem aprovado por este relatório.

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
   Fechar primeiro as ações do circuito no hub e sua quota; não inventar progressão.
3. S3.5–S3.7: minas, barreiras e implantação com navegação segura.
4. S3.8–S3.12: ajustar suprimentos/feedback e validar o ciclo completo.

Atalhos atuais de rifle/facão/kit preservados. As escolhas de interação dos
dispositivos precisam ficar documentadas antes do playtest.
Vídeos de transição no loading da navegação da aeronave continuam com o autor,
S6.16, fora desta rodada.

## Verificação da primeira entrega

Ver [handoff](../handoffs/s3.4-spawn-seguro.md) e [roteiro](VALIDACAO_MANUAL.md).
O teste novo reproduziu a regressão de distância nas quatro bordas antes da
correção; depois, desembarque e quatro bordas permitem as quatro hordas completas
sem sobreposição no nascimento. Pausa, espera, baixa única e reinício têm
cobertura adicional. O teste de restart cobre o store/HUD e o incremento de `run`;
a recriação/descarte pela cena foi conferida por leitura, com validação manual pendente. Resultado de suíte/build e revisão registrado no handoff.
