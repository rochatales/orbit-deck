# Sessão final do autor — Sprint 2 · 05/11/2026

Sessão atualizada para a colônia mais recente `00ab557`, solicitada pelo autor nesta conversa: Quartel/Laboratório novos, Oficina e correções estruturais/telhados. A publicação `90e7734` não contém esses ajustes. **S2.9 e aceite geral
6.5 pendentes.** Esta preparação não encerra a sprint nem presume aprovação.
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

Autor: preencher passou/falhou/pendente, observado e evidência. Aceites individuais
anteriores são preservados; o que resta é a avaliação expressa do ciclo completo
na versão publicada atual. Se houver falha, registrar passos para reprodução.

| ID | Ação e esperado | Resultado / evidência |
|---|---|---|
| C1 · controle | W segue cursor, S recua de frente para cursor, W+S para; A/D não deslocam, Q/C só câmera. Corrida/recuo e apoio nos pisos legíveis; sem regressão de mira próxima | pendente |
| C2 · combate | Rifle laser (1), R, facão (2), combo/giro e Dash (Espaço) operam; colisores simples bloqueiam disparos/contato nas paredes e quinas; sem acertar o próprio jogador | pendente |
| C3 · inimigos | Patrulhas por tipo/quantidade e hordas funcionam; percepção frontal/costas/parede, perseguição, cerco e investida da aranha; sem atravessar prédios ou ficar preso indefinidamente | pendente |
| C4 · recursos e cura | Drops por tipo, mochila/peso e quatro espaços coerentes; quatro kits médicos recolhidos por contato e guardados, sem cura automática; tecla 3 usa até +50 HP, sem consumir com vida cheia | pendente |
| C5 · suprimentos | Sete caixas/armários de munição: proximidade/frente e E, abertura e +48 reserva uma vez por tentativa, sem encher pente; não repetir recompensa nem interagir através da parede/pausa/morte | pendente |
| C6 · apresentação | HUD/radar/mira e sinais de tiro/acerto/dano/alerta legíveis; efeitos e áudio coerentes; volume/mudo e feedback visual funcionam | pendente |
| C7 · pausa e retry | Esc/perda de foco suspendem simulação; retorno sem tecla presa/dano acumulado. Morte/retry limpam inimigos, recursos, kits, caixas e efeitos da tentativa | pendente |
| C8 · ciclo e dificuldade | Completar 13→26→32→44, total 115, transição só após zerar a horda; avaliar duração, pressão e munição, sem bloqueio de conclusão | pendente; duração: — |
| C9 · nave e retorno | Embarcar/desembarcar e cabine funcionam; voltar a Marte sem combate/efeitos herdados. Carga temporária da nave coerente; não equivale à extração obrigatória/persistência da S4 | pendente |

**Aceite expresso da etapa 6.5 pelo autor:** pendente.
**Falhas e ajustes necessários:** aguardando sessão.

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
| P0 | Sem `?perf`, painel e API ausentes | pendente (painel ausente conferido) |
| P1/P2/C1-API | Com `?perf`, painel sem bloquear HUD; clique/rolagem não causam tiro/giro/zoom; API funciona e context.build = production | pendente |
| A | Entrada em Marte até cena pronta; tempos/cache | `A-entrada-marte.json` — pendente |
| M1 | Marte parado a pé, 30 s | `M1-marte-parado-30s.json` — pendente |
| M2 | Marte em movimento contínuo por rota livre, 30 s | `M2-marte-movimento-30s.json` — pendente |
| B | Viagem com patrulha de cinco comuns; eventos até Shanghai pronta | `B-viagem-shanghai.json` — pendente |
| S2 | Shanghai com cinco comuns no início, andar/atirar por 10 s; registrar ativos início/fim | `S2-shanghai-5-robos-10s.json` — pendente |
| S1 | Após eliminar os cinco, andar em Shanghai sem inimigos por 10 s | `S1-shanghai-sem-inimigos-10s.json` — pendente |
| S44 | Quarta horda: 30 comuns + 10 Patrol grandes + 4 aranhas; todos os 44 vivos durante 10 s completos; andar/desviar sem matar | `S44-shanghai-pico-44-10s.json` — pendente |

S44 substitui S40. Menos de 44 vivos, janela parcial, morte, pausa, menu/cabine,
aba oculta, troca de mapa ou mudança de composição invalidam o caso, mesmo se
a API disser `valid`. Preservar a tentativa com seu motivo e repetir.

Conferir status/invalidReason, requestedMs, elapsedMs, map, warnings e coverage
sem saturação. Registrar p50/p95/máximo rAF, >33/>50 ms, LoAF quando disponível,
draw calls/triângulos mín./máx./média e memória. Não há limite universal de FPS
aprovado: o autor decide com base nos resultados e na sensação de jogo.
rAF não mede tempo de GPU; draw calls excluem sombras. Indisponível/null não é zero.

**Ambiente:** `evidencias/2026-11-05/sessao.json`; tela usada aguardando autor.
**Aceite expresso S2.9 pelo autor:** pendente.

## Registro e fechamento

Após receber resultados e decisões expressas de S2.9 e 6.5, registrar no handoff,
relatório, plano e quadro; corrigir falhas e revalidar se necessário. Preservar
aceites anteriores. A limpeza de documentação e assets é uma etapa posterior.
Nenhuma remoção de fonte, backup, arquivo não rastreado ou worktree nesta sessão;
sem merge, push ou aceite presumido.
