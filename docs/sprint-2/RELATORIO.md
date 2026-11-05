# Sprint 2 — Movimento, tiro e sobrevivência

## Encerramento pelo autor · 05/11/2026

**Sprint 2 encerrada:** autor aprovou expressamente S2.9 e etapa 6.5 e confirmou
“115/115 e retorno a Marte concluídos sem bloqueios”. Aceite do conjunto de
controles, combate, navegação, recursos, HUD/áudio, pausa/foco e morte/reinício
sem falhas impeditivas. O agente registrou as decisões humanas, sem aprovar
jogabilidade por automação. [Declarações](evidencias/2026-11-05/aceites-autor.json).

Mapas/regras `00ab557` (Quartel/Laboratório e telhados atualizados), instrumentação
`18fe0d6`; branch `rochatales/s2-fechamento-2026-11-05`. Interpolação padrão desde
04/11, opção `?interp=0` para comparação. S0.4 encerrada em 25/10, S2.10 e
S2.12 A/B já aceitas; S2.11 concluída. Nenhum asset, regra de jogo ou dependência
alterado nesta sessão: mudanças de código limitadas à instrumentação opcional.

S2.9: M1/M2 de 30 s, S2 de 30 s (maior que os 10 s pedidos), S1/S44 de 10 s.
Cinco relatórios íntegros, válidos, sem warnings/saturação. p95 M1/M2/S2/S1/S44:
14,5 / 7,7 / 7,7 / 7,7 / 13,9 ms; S2 com 2 intervalos >33 ms, 1 >50 ms e um
LoAF de 66 ms; demais amostras sem frames longos. Pico S44: 44 vivos por toda a
janela confirmado pelo autor. rAF não mede tempo de GPU; contexto/heap lidos na
exportação. Odyssey G5 144 Hz, Apple M2 Pro, Chrome 156, viewport/buffer
1363×1035, DPR 1/1. [Resultados e limites](evidencias/2026-11-05/README.md).

Verificação do código medido: **564/564**, build e diff-check verdes; revisão
Claude sem defeitos de código. Corrigida prontidão do astronauta/EDEN atuais e
adicionados botões 30 s/download JSON. [Handoff](../handoffs/s2-fechamento-2026-11-05.md).

Sem merge/push. Quadro da integração tem atualização preparada em patch no
handoff, seguindo a regra de não editá-lo na branch de tarefa. Sprints 3–7 não
são encerradas por este aceite. Pendência posterior do autor na S6.16: vídeos de
transição nos intervalos de loading do menu de navegação da aeronave. Organização
de documentação/assets é a próxima etapa, preservando fontes/backups/não rastreados.

## Registro histórico da implementação · 29/09/2026

Os números, controles e pendências abaixo representam as entregas de suas datas;
o estado atual é o encerramento acima. Não repetir o roteiro antigo como sessão atual.

Data: 29/09/2026. Branch: `rochatales/horda-survivor`. Sem commit/push automático.

**Implementação técnica concluída. Aprovação visual, sensação dos controles e balanceamento final pendentes com o responsável pelo projeto**, conforme combinado. Roteiro: [VALIDACAO_MANUAL.md](VALIDACAO_MANUAL.md).

## Entrega

- Mira pelo ponteiro projetado no plano do rifle; orientação do jogador independente do deslocamento relativo à câmera.
- Rifle manual com disparo contínuo enquanto o botão esquerdo está pressionado, captura de cliques curtos, munição finita e recarga com R.
- Hitscan considera o primeiro obstáculo/inimigo. Máscara de tiro inclui mundo e inimigos e exclui jogador; usa as mesmas áreas de colisão da movimentação. Caixas baixas de recursos continuam como marcadores do Sprint 1.
- Robô simples com perseguição em grade de 0,5 m, obstáculos expandidos pelo raio, caminhos sem corte de quinas e separação entre robôs. Jogador encostado na parede continua sendo perseguido, apesar dos raios diferentes.
- Vida, dano de contato com intervalo global (evita multiplicar instantaneamente o dano por quantidade de robôs), morte e reinício limpo na rampa de Shanghai.
- HUD de vida, pente/reserva, recarga, eliminações, mira, traçadores, indicação de acerto e vinheta de dano.
- Pausa compartilhada por física, IA, cadência, recarga e animações dos GLBs; perda de foco pausa e solta teclas/gatilho. Embarque, diálogo e carregamento também bloqueiam a simulação.
- Posições de robôs, caminhos e disparos ficam na simulação mutável, fora de estado React por frame. HUD só recebe valores quando mudam; proximidade do jogador não força a renderização de toda a interface a cada frame.
- Seleção de 1, 3 ou 5 robôs na cabine antes da partida e após vitória/derrota. Repetição do encontro sem recompensas. Não são ondas.

## Calibração inicial — sprint-2.1

Fonte: `src/combat/config.ts`; movimento existente em `src/characters/player/playerConfig.ts`.

| Parâmetro | Valor |
| --- | ---: |
| Vida do jogador | 100 |
| Movimento / corrida | 3,2 / 5,6 m/s |
| Pente / reserva inicial | 24 / 96 |
| Dano do rifle | 25 |
| Intervalo entre disparos | 0,18 s |
| Recarga | 1,5 s |
| Alcance | 32 m |
| Vida do robô | 75 (3 acertos) |
| Velocidade do robô | 1,65 m/s |
| Dano de contato | 15 |
| Intervalo mínimo global entre danos | 0,8 s |
| Replanejamento de caminho | 0,5 s |
| Passo fixo de combate | 1/60 s |

Esses valores permitem aprendizado e margem de erro com poucos inimigos. Resultado de mira assistida não comprova dificuldade adequada para uma pessoa; a validação manual definirá ajustes antes das hordas.

## Verificação

- `npm test`: 18 testes, incluindo os 9 anteriores e cobertura nova de tiro, paredes, alvo mais próximo, recarga parcial/finita, pausa completa, múltiplos contatos, morte/reinício, navegação real de Shanghai, jogador junto à parede e encontros de 1/3/5 robôs.
- `npm run build`: compilação TypeScript e build de produção. Aviso de bundle JS grande permanece; a otimização de assets não pertence a esta entrega.
- `git diff --check`: sem erros de whitespace.

Antes da solicitação de deixar os testes visuais com o responsável, foi executado teste de integração no navegador usando a fixture de desenvolvimento em origem isolada. A fixture usa eventos de teclado/ponteiro e mira assistida; não altera HP nem concede eliminações:

| Encontro assistido | Eliminações | HP final | Pente/reserva | Tempo de disparos |
| --- | ---: | ---: | ---: | ---: |
| 1 robô | 1/1 | 100 | 21/96 | 0,4 s |
| 3 robôs | 3/3 | 100 | 15/96 | 1,5 s |
| 5 robôs | 5/5 | 100 | 2/96 | 3,9 s |

Também verificados: recarga pausada sem avanço da simulação e posterior conclusão (24/94); morte natural por contato e botão de reinício restaurando 100 HP e 24/96; movimento simultâneo à mira de 2,69 m em cerca de um segundo, perda de foco congelando a simulação e retorno sem input preso. Nenhum erro de console foi capturado nessa rodada.

O último ajuste de navegação junto à parede foi verificado por teste automatizado; nenhuma aprovação visual humana é inferida desses resultados. O checklist manual permanece aberto.

## Próxima etapa

Após validar controles, colisão, feedback e dificuldade: Sprint 3, com ondas, categorias de inimigos e defesas automáticas. Não foram iniciados loot, fabricação, texturas finais ou novas animações de combate.

## Ajuste após feedback — movimento relativo ao personagem

W/↑ avança na direção do olhar, S/↓ recua e A/D deslocam lateralmente. O mouse orienta o personagem tanto no hub quanto em Shanghai; sem nova mira, a orientação é preservada. O deslocamento não passa a definir a orientação, evitando giro contínuo ao recuar ou andar de lado. Este ajuste substitui o movimento relativo à câmera descrito no registro inicial acima. As medições anteriores de movimento não representam aprovação desta nova configuração. Validação visual a cargo do responsável.

Verificação após o ajuste: **20 testes passaram**, incluindo direções relativas em ângulos cardinais/intermediários, recuo, laterais e limite da velocidade diagonal. Build de produção e `git diff --check` passaram. Localhost respondeu HTTP 200. Não foram executados novos testes visuais.


## Complemento planejado após revisão técnica

O núcleo entregue e os resultados acima permanecem como registro da implementação. Foram adicionados ao plano principal **S2.9–S2.12**, ainda pendentes: instrumentação, posição transitória do player, investigação de interpolação e ajustes decorrentes do teste do autor. A atualização de planejamento não executa essas alterações nem reinicia a implementação do combate. Ver [seleção das melhorias](../GAMEPLAY_REVIEW_HORDA_SURVIVOR.md).
