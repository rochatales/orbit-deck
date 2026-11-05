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

## Escopo confrontado com o runtime

| Item oficial | Evidência nesta base / próximo trabalho |
|---|---|
| S3.1 / S3.2 | Sequenciador antecipado de quatro hordas 13/26/32/44, total 115, até 44 ativos, 4 s iniciais e 6 s de intervalo. O plano ainda cita três ondas e teto oito; reconciliação encaminhada ao autor. Esta entrega acrescenta espera por spawn seguro, sem mudar contagens ou intervalos. |
| S3.3 | Quatro categorias e investida sinalizada já presentes; comportamento fez parte do combate aprovado na S2. Conferir legibilidade junto aos dispositivos antes do fechamento completo. |
| S3.4 | Primeira entrega desta rodada: distância de spawn, separação entre aliados e espera quando não há ponto seguro. Recuperação de movimento existente preservada; morte/drop idempotentes. Roteiro manual pendente. |
| S3.5 | Três minas ainda por implementar. |
| S3.6 | Duas barreiras azuis destrutíveis/temporárias ainda por implementar. |
| S3.7 | Preview e implantação, proteção do desembarque e invalidação da grade ainda por implementar com os dispositivos. |
| S3.8 | Reabastecimento por horda com margem de 50% e caixas alcançáveis já presentes. Reavaliar margem após os dispositivos. |
| S3.9 | Horda atual e área neutralizada já presentes; texto SHANGHAI CLEAR e critério final dependem da reconciliação do contrato. A fila agora impede conclusão antecipada. |
| S3.10 | Armas, acertos/dano, investida, ambiência, volume/mudo/pausa presentes. Faltam explosão da mina e quebra da barreira. |
| S3.11 | Traçadores e partículas limitados e reutilizados; verificar novos efeitos de dispositivos e seu descarte no reinício. |
| S3.12 | Categorias/nav testadas antecipadamente; falta playtest com dispositivos, reação e legibilidade. Manter grade, sem migração para navmesh. |

Esta tabela não aprova nem encerra os itens completos. O [plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md)
continua sendo a fonte de numeração e checkboxes. O contrato publicado nesta
tarefa conserva as quatro hordas testadas pelo autor até decisão expressa
sobre a divergência do texto antigo; não se aplica silenciosamente teto de oito.

## Ordem de execução

1. S3.4 e parte de S3.1: spawn seguro e fila, revisão e validação do autor.
2. S3.5–S3.7: minas, barreiras e implantação com navegação segura.
3. S3.8–S3.12: ajustar suprimentos/feedback e validar o ciclo completo.

Próximo recorte: minas e preview, mantendo os atalhos atuais de rifle/facão/kit.
As escolhas de interação dos dispositivos precisam ficar documentadas antes do playtest.
Vídeos de transição no loading da navegação da aeronave continuam com o autor,
S6.16, fora desta rodada.

## Verificação da primeira entrega

Ver [handoff](../handoffs/s3.4-spawn-seguro.md) e [roteiro](VALIDACAO_MANUAL.md).
O teste novo reproduziu a regressão de distância nas quatro bordas antes da
correção; depois, desembarque e quatro bordas permitem as quatro hordas completas
sem sobreposição no nascimento. Pausa, espera, baixa única e reinício têm
cobertura adicional. Resultado de suíte/build e revisão registrado no handoff.
