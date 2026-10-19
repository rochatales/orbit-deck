# Sprint 2 — Validação manual do estado consolidado

Atualizado em 19/10/2026. **Aceite de jogabilidade pendente, na etapa 6.5 do [plano de consolidação](../consolidacao/PLANO_SPRINTS_0_2.md).** O autor informou que o Claude conferiu merges, ajuste das costas e 104/104 testes da Parada 1 e que ele conferiu no jogo viagem, hordas, caixas e costas. Essa conferência funcional não encerra esta validação.

Usar a página normal do jogo, não `/tests/browser-smoke.html` nem outra fixture. Na worktree `rochatales/integracao-2026-10-19-s0-s2`, executar `npm run dev -- --host 127.0.0.1 --port 5178`; se ocupada, usar outra porta explícita (a Fase 1 usou 5198). Para medir `?perf`, usar build e ambiente comparáveis conforme S2.9; dev/fixture não aprovam desempenho.

## Preparação

- [ ] Em Marte (colônia v006 B3), caminhar ao deck ao sul e embarcar com **E**.
- [ ] Conferir **Hordas · 10 → 20 → 30 → 40** como padrão. Para os testes básicos abaixo, escolher **1 robô** na cabine e decolar para Shanghai.
- [ ] Desembarcar na **Shanghai fase 01** (102 × 108 m), mapa padrão; `?shanghaiAtual` é somente a comparação com o blockout anterior. Combate e contagem começam a pé, não na cabine.
- [ ] Conferir Explorador r7 e **Patrol Unit de 2,67 m**. O raio de combate ainda é 0,42 m, menor que a largura visual de aproximadamente 1,78 m: decisão E1/S2.12 B pendente, sem ajuste nesta consolidação.
- [ ] Para testar aquisição, reiniciar entre casos: robô já alertado mantém perseguição ao perder a visão.

## Testes básicos — 1 robô, depois 3/5/32

| Teste | Ação | Resultado esperado |
| --- | --- | --- |
| Movimento pela mira | Mirar e usar W, S, W + S e A/D; mudar o cursor durante o movimento e girar Q/C | W corre ao cursor; S recua mantendo o corpo para o cursor; W + S parado; A/D sem deslocamento; Shift desnecessário; câmera não redefine a direção |
| Visão frontal | Aproximar um robô não alertado pela frente, primeiro além de 10 m e depois dentro | Cone frontal de 120° (60° de cada lado), alcance de 10 m e linha livre; fora do alcance não detecta |
| Proximidade e costas | Em tentativas novas, passar a menos de 3 m pela lateral, a 120°, a 160° e diretamente por trás; repetir com parede entre ambos | Até 3 m, frente/laterais até 135° de cada lado detectam; 160°/costas ficam cegas (90° traseiros). Parede bloqueia. Avaliar o giro da patrulha antes de atribuir detecção às costas |
| Alerta por tiro | Acertar uma vez pelas costas e fora do cone; em outra tentativa errar sem entrar no campo de visão | Primeiro acerto não letal alerta de qualquer direção; tiro errado não alerta. Visor vermelho e exclamação por 1,5 s; perseguição permanece após perder a visão |
| Aceleração | Comparar patrulha e perseguição | Passo de 1,65 para 2,05 m/s (cerca de +24%) ao avistar, de forma gradual; autor avalia ritmo |
| Rifle | Clicar e depois segurar o botão esquerdo sobre o robô | Disparos manuais, consumo de munição e feedback de acerto; 3 acertos de 25 eliminam o robô de 75 HP |
| Recarga | Disparar e apertar R; tentar atirar durante a recarga | Cerca de 1,5 s, disparos bloqueados, pente até 24 descontando da reserva |
| Munição finita | Esvaziar o pente sem recarregar | Sem tiro com pente vazio; usar R. Reserva só aumenta por regras explícitas: caixas e reabastecimento das hordas |
| Cobertura da fase 01 | Atrair o robô para trás de um prédio/parede com colisor exportado e disparar | Colisor simples bloqueia tiro/dano. Não presumir colisão em todo entulho ou letreiro visual. Os 2 depósitos e 6 esconderijos são pontos de loot sem colisor; as 2 caixas de munição têm colisor próprio e hoje bloqueiam tiros independentemente da altura (S2.12 B pendente) |
| Navegação e patrulha | Contornar prédios; ficar junto a paredes; depois testar 32 patrulhas nos cruzamentos | Robôs contornam sem atravessar colisores nem travar indefinidamente em fila. Avaliar quinas/sobreposição visual considerando a pendência E1 do raio |
| Peças e corações | Abater e aproximar-se do drop; tomar dano e alcançar os corações em (−17,5; 9,5) e (17,5; 9,5) | +1 ferro/+1 cobre por abate coletado, temporários da tentativa; cada coração cura até +50, limitado a 100 HP, e não é consumido com vida cheia. Sem coleta através de parede, em pausa ou após morte |
| Dano e morte | Deixar robô encostar até zerar HP | 15 de dano, intervalo global de aproximadamente 0,8 s, feedback vermelho e derrota |
| Reinício | Na derrota, escolher o modo e clicar Tentar novamente | Desembarque com 100 HP, 24/96 balas, contadores e tiros limpos, robôs do modo escolhido e duas caixas fechadas; sem conservar peças da tentativa |
| Pausa | Esc durante perseguição, recarga, abertura e intervalo de horda; aguardar e retomar | Movimento, IA, temporizadores, abertura e recompensa congelam; sem dano/tempo acumulado ao retomar |
| Troca de janela | Segurar movimento/tiro e trocar de janela; voltar | Pausa automática; ao retomar nenhuma tecla/gatilho fica preso |
| Seletor | Na cabine, vitória ou derrota, exercitar 1/3/5/32/hordas e reiniciar | 1/3/5/32 iniciam patrulhas fixas; hordas usa 10/20/30/40 com slots reaproveitados, até 40 simultâneos |
| Viagem preservada | Voltar à nave, retornar a Marte e desembarcar | Colônia, deck, EDEN e acesso ao laboratório preservados; sem combate em Marte |

## Caixas de munição — S6.13

1. Procurar as duas caixas com luz azul, a oeste da chegada `(-10; 12)` e a nordeste `(36; −22)`. Pela frente, aproximar-se do marcador de interação (raio de 1,8 m), usar **E** na primeira e o botão na segunda.
2. Conferir abertura de 2,4 s, clarão azul e **+48 na reserva por caixa a partir de 0,733 s**, sem encher o pente. Sem tiros/recarga/reabastecimento entre as duas, reserva inicial 96 → 144 → 192. Em hordas, comparar o incremento de cada caixa, pois o total pode mudar no início de uma horda.
3. Repetir E/botão: não concede de novo, tampa permanece aberta. Testar fora de alcance, por trás da caixa, através de parede, em pausa e após morrer: não abre.
4. Pausar durante a abertura, retomar e recarregar com R. Tentar caminhar contra a caixa e girar Q/C: colisor simples continua válido, sem prender no acesso; julgar a luz/animação na câmera real.
5. Reiniciar: duas caixas fechadas, recompensa disponível uma vez em cada na nova tentativa. Inventário/persistência da S4.3 não entram nesta entrega.

Detalhes: [handoff da S6.13](../handoffs/s6.13-caixa-suprimentos.md).

## Hordas crescentes — padrão, depois dos testes básicos

1. Selecionar **Hordas** e reiniciar. Conferir HUD com total de 100 ameaças, linha da horda e faixa **CONTATO IMINENTE**; primeira horda após 4 s de simulação a pé.
2. Conferir **10 → 20 → 30 → 40** robôs surgindo por setores da borda, em locais alcançáveis e afastados do jogador. A próxima começa 6 s após todos os vivos da anterior zerarem; observar faixa/contagem e reutilização dos rigs sem pose de morte.
3. Observar marcha, aquisição individual, +24% de velocidade, cerco e cruzamentos sem fila permanente. Esta antecipação não declara S3.1/S3.4/S3.8 concluídas nem aplica o teto de 8 do plano dessas tarefas.
4. Conferir reposição dos dois corações no início de cada horda. Se necessário, o jogo aumenta a reserva até assegurar munição total de pelo menos 1,5 × os acertos exigidos pela horda (45/90/135/180); não reduz munição existente nem enche o pente. Caixas abertas não reiniciam a cada horda: somente numa nova tentativa.
5. Pausar no intervalo; retomar sem avanço acumulado. Zerar as quatro hordas e conferir **Hordas neutralizadas**, sem novos spawns, retorno livre ou reinício.
6. Cronometrar a duração real, avaliar pressão, margem de erro/munição e medir `?perf` no pico de 40 robôs. A medição em equipamento real da etapa 6.2/S2.9 e o aceite da etapa 6.5 continuam pendentes.

Detalhes: [handoff das hordas](../handoffs/s2.4-hordas-crescentes.md).

## S2.12 A — preservar A1–A13

Itens do [handoff da S2.12](../handoffs/s2.12.md), sem alterar numeração/expectativas nem marcar aceite. Revisão específica e decisão sobre corrida/deslizamento na etapa 6.1. Para comparação em produção, abrir `?comparar`; a variante anterior não possui Backward.

| Item | Ação | Esperado |
|---|---|---|
| A1 | Correr com W em várias direções, girando o cursor | Corre para onde o cursor aponta; o corpo e o deslocamento giram juntos |
| A2 | S em várias direções | Recua sem girar o corpo; passos curtos para trás |
| A3 | W + S, A, D, Shift | Parado com W + S; A/D/Shift sem efeito no movimento |
| A4 | Alternar W/S rapidamente | Transições curtas entre Run e Backward, sem salto de pose |
| A5 | Cursor sobre o personagem, parado e recuando | Orientação estável |
| A6 | Q/C durante o movimento | A direção segue a mira |
| A7 | Encostar numa parede com W e com S | Personagem para de animar a locomoção; retoma ao sair |
| A8 | Portas, embarque e desembarque, EDEN (E), Esc | Comportamento como antes; bloqueios em menus e diálogos |
| A9 | Shanghai: mirar, atirar e recarregar correndo e recuando | Tiro e recarga como antes |
| A10 | "Comparar com o personagem atual" no selo | Mesmo ponto, câmera e luz; só o visual muda |
| A11 | Materiais da r7 no zoom máximo | Sombreamento suave, visor azul sem escurecimento duplo |
| A12 | Velocidades (4,2 / 1,2 m/s) e deslizamento do Run | Decidir os valores |
| A13 | Parado, girar o cursor devagar em volta do personagem, passando pelo norte do mapa (mundo −Z) | O corpo acompanha o cursor sem dar a volta inteira no próprio eixo |

## O que avaliar e registrar

- [ ] Mira, rifle e alvo coerentes em movimento e com Q/C; limitações de origem/traçador/altura permanecem para a S2.12 B.
- [ ] Jogador, Patrol Units, prédios, drops e caixas distinguíveis em todos os giros e zooms.
- [ ] Feedback de disparo, acerto, dano, detecção, horda e abertura perceptível; HUD/rádio/botões legíveis sem ocultar a área principal.
- [ ] Câmera acompanha sem atrapalhar mira e movimento; Run/Backward e transições avaliados, inclusive deslizamento do Run.
- [ ] Rotas e performance com 5/32 robôs e no pico de 40; registrar equipamento, navegador, resolução, DPR e limitações (inclusive ausência de 120/144 Hz).

Para cada caso: modo/horda, ação, observado × esperado, resultado, ambiente e evidência. Registrar sensação de controle, ritmo, dano, dificuldade e duração real; valores atuais não são balanceamento final. Nenhum item acima está aprovado por esta atualização.

## Fora do escopo e pendências

Minas, barreiras, duas categorias de criaturas, loot persistente, extração obrigatória e construção da máquina permanecem pendentes. Hordas, peças temporárias, corações e caixas já existem neste estado; não equivalem aos Sprints 3–5 completos. Retorno a Marte continua livre; recarregar a página retorna ao hub e não salva a tentativa em Shanghai.

S2.12 B (origem/mira/traçador, colisão com altura e sólidos/navegação) exige proposta da etapa 6.3 para fase 01: altura do Patrol Unit, raio E1, altura das caixas e colisão dos depósitos. S2.11 vem depois, sem adoção automática. Revisão completa e avanço da integração seguem na Fase 4; aceite de jogabilidade somente na etapa 6.5.
