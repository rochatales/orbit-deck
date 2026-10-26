# Sprint 2 — Validação manual do estado consolidado

Atualizado em 19/10/2026. **Aceite de jogabilidade pendente, na etapa 6.5 do [plano de consolidação](../consolidacao/PLANO_SPRINTS_0_2.md).** O autor informou que o Claude conferiu merges, ajuste das costas e 104/104 testes da Parada 1 e que ele conferiu no jogo viagem, hordas, caixas e costas. Essa conferência funcional não encerra esta validação.

Após o avanço `--ff-only` da Fase 4.2, rodar o jogo a partir do checkout principal `/Users/rochatales/Automations/game-workplace`, na branch `rochatales/horda-survivor`. Nesse checkout, executar `npm run dev -- --host 127.0.0.1 --port 5178`; se ocupada, usar outra porta explícita e conferir que o servidor pertence a esse checkout. Abrir a página normal desse servidor, não `/tests/browser-smoke.html` nem outra fixture. Para medir `?perf`, usar o build do checkout principal e ambiente comparável conforme S2.9; dev/fixture não aprovam desempenho.

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

## S2.12 B — etapa 1, Parada 1 (25/10/2026)

Autor liberou B após A1–A13, com A12 confirmado: corrida 4,2 m/s, recuo 1,2 m/s.
Nesta etapa, tiro/cano/plano a 0,85 m e retícula a 0,86 m. Raio, altura de
colisores e navegação aguardam etapas 2 e 3; depósitos excluídos até S4.3.
As referências anteriores à proposta pendente são históricas; o escopo vigente
está no [handoff da etapa 1](../handoffs/s2.12-b.md) e na
[proposta decidida](../handoffs/s2.12-b-proposta.md).

Testar o **build da worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace`**,
branch `rochatales/s2.12-b`, base `2b1c91beeb6a59d3ef8815cdf3f3f1ab66689b28`.
Comandos: `npm run build` e `npm run preview -- --host 127.0.0.1 --port 4192 --strictPort`.
A porta 4173 permanece com o fechamento; não trocar sua instância pela tarefa.
Registrar o SHA real testado. **Todos os itens abaixo aguardam o autor.**

| Caso | Conferir | Resultado |
|---|---|---|
| B1.1 · regressão A | Marte: W/S, Q/C, E/EDEN/Esc e velocidades 4,2/1,2 m/s mantidos | pendente |
| B1.2 · giro/origem | Shanghai, 1 robô, parado/correndo/recuando: girar o cursor; o traçador nasce na ponta da arma suavizada, a 0,85 m | pendente |
| B1.3 · parede/quina | Encostar e apontar para além: checagem centro→cano impede dano do outro lado; traçador ocluído termina na face | pendente |
| B1.4 · perto/longe | Na mesma direção do cano, aproximar/afastar o cursor; bala continua além da retícula até colisão/32 m, sem distância do cursor limitar o alcance | pendente |
| B1.5 · mira próxima | Cursor sobre o corpo, no cano ou atrás dele: tiro horizontal segue o rumo do corpo, sem inversão | pendente |
| B1.6 · impacto | Robô à frente e parede atrás, depois robô protegido por parede: primeiro contato define fim do traçador e dano | pendente |
| B1.7 · bloqueios | Atirar/recarregar, pausar, abrir interação, embarcar: sem tiro ou avanço de combate em estado bloqueado | pendente |
| B1.8 · reset | Viajar/desembarcar e retry após morte: origem/rumo no novo spawn, sem traçador antigo ou gatilho preso | pendente |

Casos geométricos e alcance exato: testes automatizados da etapa 1. A evidência
em fixture dev é verificação técnica, sem substituir este playtest no build.
Claude revisa contra a base antes da próxima etapa. **Parar após a etapa 1**;
sem liberar etapas 2/3, marcar checkbox ou declarar aceite pelo agente.


## Animal mutante pequeno / matéria orgânica — roteiro incremental (25/10/2026)

Build da worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace`,
branch `rochatales/s2.12-b`. Base do animal: `f786255` (registro documental após
`daaff88`). Registrar SHA testado. O autor já aprovou mapa v007/deck, estufa e
anel na calçada; revisão Claude dos commits anteriores sem defeitos, conforme
relato do autor. **Casos do animal abaixo aguardam o autor**, sem novo aceite.

| Caso | Conferir | Resultado |
|---|---|---|
| Animal 1 · composição | Horda 1: 10 comuns + 3 animais = 13; horda 2: 20 + 6 = 26; horda 3: 25 comuns + 5 grandes = 30; horda 4: 30 + 10 = 40, sem animais nas duas últimas. HUD/resultado total 109 | pendente |
| Animal 2 · velocidade e pressão | Animal marcha/corre, alcança o explorador em perseguição (4,6 > 4,2 m/s) e tenta abrir em setores diferentes a menos de 6 m antes do contato; testar campo aberto, parede e quina | pendente |
| Animal 3 · ataque e tiro | Dois tiros de rifle matam o animal; cano/traçador a 0,85 m; tiro alerta. Dano de 8 com proteção global: vários animais juntos não somam dano no mesmo intervalo | pendente |
| Animal 4 · animações | Idle ao nascer; PatrolWalk, ChaseRun, bote e morte conforme estado. Horda 2 reutiliza os rigs sem pose morta/velocidade antiga; ShockAttack não é usado | pendente |
| Animal 5 · orgânica | Animal morto deixa 1 matéria orgânica, anel verde sobre rua/calçada/canteiro, pulso e flutuação sem giro Y; coletar uma vez, contador ORGÂNICA instantâneo e coleta visual rápida | pendente |
| Animal 6 · munição/reset | Reposição considera 2 acertos por animal, sem reduzir munição existente; pausa congela combate/efeitos. Retry/viagem zeram orgânica e restauram a primeira horda, sem drop/pose anterior | pendente |

Raio circular 0,50 m não engloba toda a frente/cauda de 2,07 m: observar a
limitação visual nas paredes, sem colisor de malha. Faixa de tiro vertical do
animal ainda não implementada; envelope do bote chega a 1,180 m, proposta
0–1,20 m para a etapa 2. Este roteiro não libera a etapa 2.
Capturas e método assistido em `docs/handoffs/s6.1-mutante-pequeno/`;
QA técnico não substitui o playtest. **Parar para revisão Claude antes do avanço.**


## S2.12 B · etapa 2 — colisão de tiro com altura (25/10/2026)

**Etapa 2 liberada pelo autor e entregue na Parada 2.** Base de revisão
`48e0882`; build da worktree `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace`,
branch `rochatales/s2.12-b`. Registrar SHA testado. A linha contém áudio S3.10
antecipado e Hangar S6.12 com contorno preto; Hangar aprovado pelo autor,
revisão Claude de `bdd4abe` sem defeitos (190/190/build), conforme relato.
O aceite do Hangar não constitui aceite da etapa 2 B.

| Caso | Conferir | Resultado |
|---|---|---|
| B2.1 · mundo e centro→cano | Em Shanghai fase 01, atirar contra prédio/carro/monte/ARES-I; repetir encostado em parede e quina. Cano/traçador seguem a 0,85 m e não atingem alvo atrás do bloqueio | pendente |
| B2.2 · caixas | Nas duas caixas, tiro contra o corpo bloqueia fechado/abrindo/aberto. Tampa visual não amplia a faixa fixa 0–1,195 m; movimento continua bloqueado pelo corpo | pendente |
| B2.3 · três inimigos | Comum, grande e animal recebem dano na marcha e no bote; mais próximo protege o de trás, parede à frente protege ambos. Faixas simples estáveis: 0–2,31 / 0–3,28 / 0–1,20 m | pendente |
| B2.4 · regressão | Conferir movimento/visão/navegação 2D, mesmos raios e escala; viajar a Marte e observar Hangar/contorno preto/áudio preservados | pendente |

Extremos abaixo/no limite/acima, ausência de metadados e preservação das 36
alturas são ensaiados automaticamente; rifle do jogo permanece horizontal a
0,85 m. Sem ferramenta de mira vertical nova. Medições dos GLBs a 120 Hz e
limitações em `docs/handoffs/s2.12-b/alturas-etapa-2.json` e handoff B.
199/199 testes/build/diff-check verdes. Não houve novo QA de navegador nesta
etapa; playtest e aceite são do autor. **Parada 2 para revisão Claude contra
`48e0882`; não iniciar etapa 3.** As restrições anteriores sobre liberação da
etapa 2 nas seções históricas ficam substituídas por esta liberação expressa.
