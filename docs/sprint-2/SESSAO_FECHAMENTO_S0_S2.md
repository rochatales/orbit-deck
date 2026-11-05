# Sessão final do autor — Sprint 2 · 05/11/2026

Sessão atualizada para a colônia mais recente `00ab557`, solicitada pelo autor nesta conversa: Quartel/Laboratório novos, Oficina e correções estruturais/telhados. A publicação `90e7734` não contém esses ajustes. **Sprint 2 encerrada pelo autor em 05/11/2026:** S2.9 e etapa 6.5 aprovadas expressamente, com 115/115 e retorno a Marte sem bloqueios. Decisões preservadas em [aceites-autor.json](evidencias/2026-11-05/aceites-autor.json).
S0.4/Sprint 0 encerradas em 25/10. S2.10 e S2.12 A/B já aceitas. S2.11 concluída;
a decisão de 26/10 foi revista em 04/11: interpolação agora é padrão,
`?interp=0` serve apenas para comparação. As instruções antigas do kit (r7,
duas caixas/corações, tiro fixo a 0,85 m, endereço da S2.12 B) estão substituídas
por esta sessão. Registros históricos permanecem no Git e nos handoffs.

## Versão e preparação

| Campo | Valor |
|---|---|
| Base imutável dos mapas/regras | `00ab557a545b7ac1af6630cca118c03efed9ba42` |
| Código da instrumentação medida | `18fe0d6` (mapas/regras de `00ab557`) |
| Branch da sessão | `rochatales/s2-fechamento-2026-11-05` |
| Worktree | `/Users/rochatales/.codex/worktrees/s2-fechamento-2026-11-05/game-workplace` |
| Build de produção | `http://127.0.0.1:5194/` |
| Medição | `http://127.0.0.1:5194/?perf` |
| Evidências desta rodada | `docs/sprint-2/evidencias/2026-11-05/` |
| Verificação técnica de 05/11 | 564/564 testes; build verde (aviso preexistente de chunk grande); diff-check limpo |

Assets, dependências e regras/configuração de jogo preservados. Instrumentação
`?perf` ajustada para botão de 30 s, download direto do JSON e prontidão dos
personagens atuais; detalhes e testes no handoff desta sessão.
Dependências existentes reutilizadas por link local; hash do lockfile idêntico
à instalação. Checkout principal antigo e fontes soltas preservados. Ajustes
ainda não publicados da Oficina/colônia entram por solicitação explícita do autor;
base `00ab557` da tarefa estrutural, sem merge ou alteração nessa tarefa.

Usar Chrome em primeiro plano, build normal, sem fixture/cheat/ganchos de QA;
interpolação padrão, sem flags de comparação. O autor informa a tela efetivamente
usada, carga concorrente e qualquer alteração de zoom/resolução. Registrar DPR,
viewport, buffer, navegador e GPU dos JSONs. A cena deve estar visualmente pronta.
Não trocar de janela durante uma amostra: perda de foco pausa o jogo.

## Etapa 6.5 — aceite do ciclo de combate

O autor aprovou expressamente o conjunto abaixo, sem falhas impeditivas. Este
registro é do aceite humano; não representa testes visuais feitos pelo agente.
Aceites anteriores permanecem preservados. Versão da sessão: mapas/regras
`00ab557` e instrumentação `18fe0d6`, ainda sem publicação desta branch.

| ID | Ação e esperado | Resultado / evidência |
|---|---|---|
| C1 · controle | W segue cursor, S recua de frente para cursor, W+S para; A/D não deslocam, Q/C só câmera. Corrida/recuo e apoio nos pisos legíveis; sem regressão de mira próxima | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C2 · combate | Rifle laser (1), R, facão (2), combo/giro e Dash (Espaço) operam; colisores simples bloqueiam disparos/contato nas paredes e quinas; sem acertar o próprio jogador | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C3 · inimigos | Patrulhas por tipo/quantidade e hordas funcionam; percepção frontal/costas/parede, perseguição, cerco e investida da aranha; sem atravessar prédios ou ficar preso indefinidamente | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C4 · recursos e cura | Drops por tipo, mochila/peso e quatro espaços coerentes; quatro kits médicos recolhidos por contato e guardados, sem cura automática; tecla 3 usa até +50 HP, sem consumir com vida cheia | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C5 · suprimentos | Sete caixas/armários de munição: proximidade/frente e E, abertura e +48 reserva uma vez por tentativa, sem encher pente; não repetir recompensa nem interagir através da parede/pausa/morte | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C6 · apresentação | HUD/radar/mira e sinais de tiro/acerto/dano/alerta legíveis; efeitos e áudio coerentes; volume/mudo e feedback visual funcionam | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C7 · pausa e retry | Esc/perda de foco suspendem simulação; retorno sem tecla presa/dano acumulado. Morte/retry limpam inimigos, recursos, kits, caixas e efeitos da tentativa | Aceite do conjunto pelo autor em 05/11; ver declaração 6.5 |
| C8 · ciclo e dificuldade | Completar 13→26→32→44, total 115, transição só após zerar a horda; avaliar duração, pressão e munição, sem bloqueio de conclusão | Autor confirmou 115/115 sem bloqueios; duração total não informada |
| C9 · nave e retorno | Embarcar/desembarcar e cabine funcionam; voltar a Marte sem combate/efeitos herdados. Carga temporária da nave coerente; não equivale à extração obrigatória/persistência da S4 | Autor confirmou retorno a Marte e desembarque sem bloqueios |

**Aceite expresso da etapa 6.5 pelo autor (05/11/2026):** “Aprovo a etapa 6.5, sem falhas impeditivas”.
**Resultado do ciclo pelo autor:** “115/115 e retorno a Marte concluídos sem bloqueios”. Nenhuma falha impeditiva relatada. Duração total da missão não informada.

## S2.9 — medições no equipamento do autor

Mesmo ambiente entre amostras. Pode usar o botão **Amostra 10 s** para S1/S2/S44;
M1/M2 usam o novo botão **Amostra 30 s**. Antes de cada amostra, jogo carregado, a pé,
sem menus/pausa, Chrome em foco. Não abrir DevTools durante a janela medida.
Não é necessário abrir console. O autor faz o movimento/combate.

Após cada caso, **Baixar JSON** salva o relatório completo em arquivo
`exoden-perf-<mapa>-<data/hora>.json`; o agente copia o arquivo para esta sessão
e identifica o caso, sem sobrescrever tentativas. Exportar antes de recarregar
ou voltar de mapa; o histórico suporta até dez amostras. A opção Copiar JSON
continua disponível como alternativa, mas não é necessária nesta sessão.
Não interpretar o painel ao vivo como substituto das estatísticas da amostra.

| ID | Condição | Arquivo / resultado |
|---|---|---|
| P0 | Sem `?perf`, painel e API ausentes | Painel ausente conferido na preparação; ativação e ciclo da API cobertos nos testes. Não foi executada inspeção manual da API pelo console. |
| P1/P2/C1-API | Com `?perf`, painel sem bloquear HUD; clique/rolagem não causam tiro/giro/zoom; API funciona e context.build = production | Painel aprovado pelo autor no aceite S2.9; production e amostras conferidos nos JSONs. API/lifecycle cobertos nos testes; console manual não exercitado |
| A | Entrada em Marte até cena pronta; tempos/cache | Eventos da entrada preservados em `S2-shanghai-5-robos-30s.json`; preparação anterior em `A-entrada-marte-preliminar.json`, com contexto distinto documentado |
| M1 | Marte parado a pé, 30 s | `M1-marte-parado-30s.json` — válida, 30,008 s; p50 13,1 / p95 14,5 / máx. 14,8 ms; >33/>50 ms 0, sem avisos/saturação |
| M2 | Marte em movimento contínuo por rota livre, 30 s | `M2-marte-movimento-30s.json` — válida, 30,001 s; p50 6,9 / p95 7,7 / máx. 7,9 ms; sem avisos/saturação |
| B | Viagem com patrulha de cinco comuns; eventos até Shanghai pronta | Eventos preservados em `S2-shanghai-5-robos-30s.json`; personagens prontos +5.051,1 ms após loading |
| S2 | Shanghai com cinco comuns no início, andar/atirar por 10 s; registrar ativos início/fim | `S2-shanghai-5-robos-30s.json` — válida, 30,0045 s; cinco vivos, sem abates (autor); p95 7,7 ms, >33 ms 2 / >50 ms 1 |
| S1 | Após eliminar os cinco, andar em Shanghai sem inimigos por 10 s | `S1-shanghai-sem-inimigos-10s.json` — válida, 10,003 s, zero inimigos confirmado; p95 7,7 / máx. 7,9 ms; sem avisos/saturação |
| S44 | Quarta horda: 30 comuns + 10 Patrol grandes + 4 aranhas; todos os 44 vivos durante 10 s completos; andar/desviar sem matar | `S44-shanghai-pico-44-10s.json` — válida, 10,0012 s; 44 vivos durante toda a janela confirmados pelo autor; p95 13,9 / máx. 14,8 ms; sem avisos/saturação |

S44 substitui S40. Menos de 44 vivos, janela parcial, morte, pausa, menu/cabine,
aba oculta, troca de mapa ou mudança de composição invalidam o caso, mesmo se
a API disser `valid`. Preservar a tentativa com seu motivo e repetir.

Conferir status/invalidReason, requestedMs, elapsedMs, map, warnings e coverage
sem saturação. Registrar p50/p95/máximo rAF, >33/>50 ms, LoAF quando disponível,
draw calls/triângulos mín./máx./média e memória. Não há limite universal de FPS
aprovado: o autor decide com base nos resultados e na sensação de jogo.
rAF não mede tempo de GPU; draw calls excluem sombras. Indisponível/null não é zero.

**Ambiente:** `evidencias/2026-11-05/sessao.json`; Odyssey G5 144 Hz confirmada pelo autor; contexto dos JSONs em 2560×1440, viewport/buffer 1363×1035, DPR 1/1.
**Aceite expresso S2.9 pelo autor (05/11/2026):** “Aprovo a S2.9 com os resultados e limites registrados”.

## Registro e fechamento

Sprint 2 encerrada por decisão expressa do autor, registrada em 05/11/2026.
Plano e relatório atualizados nesta branch; quadro da integração recebe patch
preparado no handoff, respeitando a regra de não o editar em branch de tarefa.
564/564 testes, build e diff-check verdes; revisão Claude do código sem defeitos.
Sem merge/push. A organização de documentação/assets é a próxima etapa,
preservando fontes, backups e arquivos não rastreados do autor.

Pendência posterior do autor: **S6.16 — vídeos de transição nos intervalos de
carregamento do menu de navegação da aeronave**. Não bloqueia esta Sprint 2.
