# EXODEN — Sprints do protótipo Shanghai

Criado em 28/09/2026; atualizado em 19/10/2026. Status: Sprint 1 implementado; núcleo do Sprint 2, S2.12 A, hordas e caixas consolidados tecnicamente, sem aceite de jogabilidade. S2.9 (medições) e validação geral do autor pendentes; S2.11 investigada e não adotada após comparação do autor em 144 Hz (26/10/2026). Sprint 0 mantém a pendência de baseline S0.4.

Referência: [Auditoria e decisões de design](HORDA_SURVIVOR_AUDITORIA_E_PLANO.md). Este plano recorta a primeira entrega: sair do hub em Marte, concluir Shanghai, recuperar recursos, retornar e construir a primeira grande máquina no laboratório.

Revisão técnica incorporada: [Melhorias selecionadas para Horda Survivor](GAMEPLAY_REVIEW_HORDA_SURVIVOR.md). A numeração deste plano é a referência do novo projeto; a revisão do MCP Office não substitui estes sprints.

Planejamento de UI incorporado em 30/09/2026: [Plano de ação e referências visuais](sprint-6/PLANO_UI.md). Define EDEN Holographic para menus/expedição e Mars Colony Clean para recursos/laboratório, detalha S6.6, acrescenta S6.14–S6.18 e S7.11. Implementação e aprovação visual pendentes; preserva a sequência funcional até o Sprint 5.

Planejamento de atmosfera 2,5D e estilo *Metal Slug* incorporado em 18/10/2026: [Plano de ação da atmosfera 2,5D](sprint-6/PLANO_ATMOSFERA_2_5D.md). Define a evolução da S6.19 com os 10 pilares técnicos e artísticos e elege a **Sala da EDEN (Ala Norte)** como primeiro *Vertical Slice* (`S6.19a`).

Consolidação de 19/10/2026: [plano por fases](consolidacao/PLANO_SPRINTS_0_2.md), [quadro](SPRINT_STATUS.md) e [handoff](handoffs/integracao-2026-10-19-s0-s2.md). Colônia B3 (S6.12), Explorador r7 (S2.12 A), patrulhas de 32 (S2.4), Patrol Unit (S6.1) e Shanghai fase 01 (S6.3) já integradas em 18/10; hordas crescentes e caixas (S6.13) reunidas na Fase 1. Autor e Claude conferiram a Parada 1 conforme relato do autor; **aceite de jogabilidade continua na etapa 6.5**, sem encerramento dos itens completos ou novos checkboxes de aceite. Fases 2–3 organizam fontes e documentação; avanço da integração principal segue na Fase 4.

## 1. Resultado esperado e ordem de prioridade

**Marco funcional:** o jogador completa o percurso hub → briefing de EDEN → deck de lançamento → embarque/decolagem → desembarque em Shanghai → três ondas → coleta → embarque/extração → pouso e desembarque no deck de Marte → laboratório → máquina instalada e persistida. Também consegue perder e recomeçar sem conservar o loot da tentativa.

Prioridade definida pelo autor:

1. Validar jogabilidade usando geometria simples, cores sólidas e os assets existentes que forem úteis.
2. Depois, trabalhar estética dos elementos: silhueta, forma, escala, composição, animação e legibilidade.
3. Por último, aplicar texturas e materiais finais, preservando desempenho e leitura de combate.

Feedback mínimo de tiro, dano, mira, inimigos, minas e barreiras faz parte da jogabilidade e entra desde cedo. Não esperar a fase estética para informar ao jogador o que está acontecendo.

Esta atualização documental registra o estado consolidado. As Fases 2–3 preservam o runtime, saves e dependências da Fase 1; fontes são copiadas e documentadas. Testes visuais e aprovação da jogabilidade são realizados pelo autor; o agente executa verificações técnicas e entrega roteiros.

Sprints são pacotes de entrega, sem duração de calendário presumida. Cada um termina com uma versão demonstrável, verificações registradas e pendências explícitas. O próximo sprint depende da aprovação técnica dos critérios de saída; a passagem para estética também depende do playtest com o autor. O trabalho de planejamento não inicia a refatoração.

## 2. Escopo e premissas de implementação

### Incluído

- Hub existente adaptado ao fluxo local; EDEN com scripts e rádio em texto, sem dependência de serviço de IA.
- Deck de lançamento físico conectado ao hub marciano, aeronave acessível e ações de entrar, sair e partir; retorno pousa no mesmo deck.
- Um distrito compacto de Shanghai feito à mão, com área de chegada, obstáculos, pontos de spawn, dois depósitos e seis esconderijos de alumínio.
- Uma arma de tiro manual, HP, munição, morte, reinício e pausa.
- Três categorias: robô humanoide, criatura pequena e criatura grande.
- Três ondas de 8, 10 e 12 inimigos; total de 20 robôs, 8 criaturas pequenas e 2 grandes; até 8 inimigos simultâneos inicialmente.
- Três minas e duas barreiras neon azul por tentativa introdutória, com regras ajustáveis.
- Materiais, munição e dispositivos em compartimentos separados.
- Coleta do mapa e inimigos, objetivo obrigatório, extração e depósito persistente no hub.
- Fabricação e instalação visível da máquina de síntese de diamante por 20 ferro + 20 cobre + 4 placas de alumínio.
- Save do progresso consolidado no hub e tratamento dos dados antigos do produto MCP.

### Defaults propostos para começar, sem bloquear o protótipo

- Single-player em navegador desktop, teclado e mouse; manter a câmera de base e a mira projetada no plano de altura do rifle. A referência Metal Slug orienta ritmo/tiro, sem presumir mudança para câmera lateral.
- Movimento pela mira (contrato atualizado pelo autor em 07/10/2026, implementação na S2.12; antes: W avança, S recua, A/D laterais): W/↑ corre na direção do cursor, S/↓ recua mantendo o personagem voltado ao cursor, A/D não deslocam e W + S neutralizam; mouse orienta em Marte e Shanghai, Q/C gira somente a câmera; botão esquerdo para atirar, R para recarregar, E para interagir, 1/2 para selecionar defesa, clique para posicionar e Escape para cancelar posicionamento/pausar conforme o contexto. Disparo e implantação são modos mutuamente exclusivos.
- Rifle simples com dano instantâneo por raycast, bloqueado por paredes; traçador visual. Dano, cadência, carregador e reserva em configuração, calibrados no sprint 2.
- Materiais de inimigos coletados por proximidade; depósitos, placas, nave e laboratório por interação. Pilhas de material até 30, quatro espaços iniciais.
- Sem cura ativa no primeiro teste: HP e dano ajustados para uma missão curta; reavaliar após playtest. Sem stamina.
- Ao perder, reiniciar com kit inicial e HP restaurado. Equipamentos e progresso já consolidados no hub não são perdidos.
- Fechar/abandonar uma missão descarta seu loot temporário; ao reabrir, retornar ao hub. Sem retomada de onda.
- Máquina em posição predefinida. Sem construção livre ou catálogo genérico de receitas.

Esses defaults são decisões de implementação propostas, não novos fatos da narrativa. Ajustá-los conforme o teste sem mudar o objetivo da entrega.

### Limite desta entrega

A entrega obrigatória termina na máquina construída. Produzir o primeiro diamante é uma extensão opcional, após confirmar a origem do carbono; não bloqueia a construção. A carga de referência inclui 10 matérias orgânicas, mas elas não são consumidas na instalação da máquina e permanecem no depósito nesta entrega.

Estufa, máquina de construção espacial, upgrades completos, novos mapas, resgate/save entre hordas, ranking, multiplayer e dificuldade adaptativa de revisitas ficam no backlog posterior. O recorte adia a adaptação de hordas descrita na auditoria; não a cancela. Manter configuração de ondas reutilizável e permitir nova tentativa com ondas fixas para testar o ciclo, sem fingir que já existe progressão de nível.

### Fluxo físico de viagem — requisito do autor

O deck de lançamento integra o mapa de Marte, conectado por uma rota caminhável ao restante do hub. EDEN apresenta a missão e orienta o caminho; conversar com EDEN não teletransporta o jogador para a Terra.

1. O jogador caminha até o deck e se aproxima da entrada da aeronave.
2. Usa a interação para embarcar. Enquanto estacionada em Marte, pode desembarcar e voltar ao hub sem iniciar ou consumir uma tentativa.
3. A bordo, seleciona Shanghai e aciona **Decolar**. Embarcar e partir são ações distintas; a interação de saída continua disponível até iniciar a viagem.
4. Uma transição curta representa a viagem e o pouso na Terra. O jogador desembarca em uma área segura; o briefing inicial antecede o começo da primeira onda.
5. Proposta para manter a regra de extração: após o desembarque, a aeronave deixa o local de combate e retorna ao ponto de extração quando todas as hordas terminarem. Nesse momento seu marcador aparece no mapa.
6. O jogador pode embarcar na aeronave retornada e desembarcar para continuar procurando loot. **Retornar a Marte** só fica disponível após as hordas e a carga obrigatória da introdução estarem completas. Embarcar não deposita recursos nem encerra a missão.
7. Ao confirmar retorno, executar a extração uma única vez, carregar Marte e representar o pouso no deck. O jogador desembarca num ponto seguro e segue a pé para o laboratório.

Proposta de implementação inicial: cabine compacta com ponto de embarque, posição a bordo e ponto de saída, usando geometria simples. Não requer interior detalhado, controle de voo ou simulação espacial. A troca de cena acontece somente ao confirmar partida/retorno; usar estados explícitos para estacionada, embarcado, viajando e pousada. Bloquear comandos repetidos e restaurar câmera/controles ao desembarcar. Falha ao carregar o destino deve permitir tentar novamente sem perder recursos ou duplicar a extração.

A localização exata do deck será definida no blockout do sprint 1, preservando salas existentes e uma rota clara desde EDEN. Atualizar `mapConfig`, geração do mapa, áreas transitáveis, limites, colisores e enquadramento da câmera conjuntamente. Não colocar o deck apenas como decoração fora da área caminhável. Reservar os pontos de pouso e desembarque contra spawn de inimigos e implantação de dispositivos.

## 3. Mapa dos sprints

| Sprint | Foco | Entrega demonstrável | Dependência |
| --- | --- | --- | --- |
| 0 | Preservação e referência | Base recuperável e roteiro de teste | Nenhuma |
| 1 | Desacoplamento e missão local | Deck de Marte, embarque e viagem de ida/volta, sem backend | 0 |
| 2 | Fundamentos de combate e qualidade | Combate, controles relativos ao olhar e verificação de fluidez | 1 |
| 3 | Hordas e defesas | Três ondas completas, minas e barreiras | 2 |
| 4 | Loot, EDEN e extração | Completar carga e retornar com recursos | 3 |
| 5 | Máquina e validação do ciclo | Construir, salvar, recarregar e continuar | 4 |
| 6 | Estética dos elementos | Formas e animações legíveis em cenário coerente | 5 + playtest |
| 7 | Texturas e entrega visual | Protótipo texturizado, medido e revisado | 6 |

**Protótipo funcional entregue ao fim do sprint 5.** Os sprints 6 e 7 refinam sua apresentação, sem acrescentar sistemas de gameplay.

## 4. Sprint 0 — Preservação, inventário e referência

Execução registrada em [Relatório do Sprint 0](sprint-0/RELATORIO.md). **Encerrado em 25/10/2026**: S0.4 aprovada pelo autor na sessão de fechamento; medições no equipamento do autor seguem na S2.9. Nenhuma alteração de gameplay.

Objetivo: preparar uma base recuperável sem perder código ou arte.

- [x] S0.1 Registrar commit/estado atual e criar a branch de implementação `rochatales/horda-survivor`, se ainda não existir.
- [x] S0.2 Inventariar e preservar separadamente os arquivos não rastreados; verificar a cópia. Não usar a criação de branch como backup desses arquivos.
- [x] S0.3 Registrar assets ativos, fontes e exportações. Adiar movimentos em massa até atualizar imports; não criar duplicatas de GLBs ativos.
- [x] S0.4 Reexecutar build e registrar uma sessão manual: entrada, movimento, câmera e EDEN. Registrar o dispositivo, navegador, resolução e medidas de carregamento/desempenho disponíveis.
- [x] S0.5 Confirmar o roteiro de playtest e documentar os defaults usados no protótipo.

Saída: referência recuperável, inventário e baseline registrados. Sem alteração de gameplay neste sprint.

## 5. Sprint 1 — Base local e estrutura de expedição

Implementado e validado em 29/09/2026. Ver [relatório e limites de validação](sprint-1/RELATORIO.md). Retorno livre temporário no protótipo, sem recompensas; a extração condicionada será implementada no sprint 4.

Objetivo: retirar o produto MCP do caminho do jogo e separar hub de missão.

- [x] S1.1 Trabalhar no fluxo ativo `main.tsx → App → GameCanvas → OfficeScene`; inventariar e arquivar o fluxo legado em vez de refatorar `NPCManager` isoladamente.
- [x] S1.2 Criar configurações locais mínimas de NPC, mapa e missão, separadas de ações MCP e de arquivos de arte.
- [x] S1.3 Substituir consumidores em App, personagens, controller do player, física, interações e HUD antes de remover stores/tipos antigos.
- [x] S1.4 Manter EDEN e retirar outros NPCs/pontos de interação antigos. Preservar a geometria do hub e decidir o destino do beacon de reunião neste recorte: desativado como interação antiga.
- [x] S1.5 Remover onboarding de clientes, conexão/ativação de decks, Smart Lab, painéis e workflow. Preservar nome/cor do jogador quando possível.
- [x] S1.6 Implementar diálogo local simples com EDEN para apresentar Shanghai e orientar até o deck; a missão parte da aeronave. Usar legenda de rádio; voz gravada/sintética não é requisito.
- [x] S1.7 Criar o mapa de Shanghai com volumes simples, colisões e pontos de interesse, sem texturas finais.
- [x] S1.8 Implementar estados de sessão e troca de cena, descarregando entidades/recursos exclusivos da missão na saída. Retorno livre existe apenas como ferramenta de desenvolvimento até a extração real.
- [x] S1.8a Construir deck caminhável no hub, aeronave provisória e cabine compacta. Implementar embarcar/desembarcar sem iniciar viagem, ação separada de decolar e pouso/desembarque em Shanghai.
- [x] S1.8b Implementar retorno ao mesmo deck de Marte, com ponto seguro de saída, câmera restaurada e acesso a pé ao laboratório. Validar limites, áreas transitáveis e colisões do hub expandido.
- [x] S1.9 Definir save versionado do hub e tratamento das chaves antigas. Não persistir loot/ondas em andamento.
- [x] S1.10 Arquivar backend e módulos antigos após remover referências; ajustar scripts e instruções de execução. Evitar atualizar toda a stack no mesmo trabalho.

Saída: abrir o jogo, entrar no hub, falar com EDEN, caminhar ao deck, entrar/sair da nave, decolar e desembarcar em Shanghai sem chamadas à API antiga; build passa; sessão nova e navegador com dados antigos funcionam.

## 6. Sprint 2 — Movimento, tiro e sobrevivência

**Núcleo S2.1–S2.8 implementado em 29/09/2026, ampliado nas integrações de 18–19/10. S2.12 A/B concluídas e aprovadas pelo autor em 25–26/10/2026; S2.9 com medições pendentes; S2.10 já aceita. S2.11 concluída: investigada, comparada em 144 Hz pelo autor, não adotada (26/10/2026). Validação geral de jogabilidade da etapa 6.5 pendente.**

[Relatório](sprint-2/RELATORIO.md) · [Checklist de teste manual](sprint-2/VALIDACAO_MANUAL.md). Os checks abaixo registram implementação e verificação técnica; o balanceamento é inicial.

Objetivo: validar a sensação básica de combate antes de criar a horda completa.

- [x] S2.1 Orientar pelo mouse em Marte e Shanghai. Movimento relativo ao olhar: W avança, S recua, A/D deslocam lateralmente; deslocamento não gira o personagem automaticamente. Câmera não redefine a frente. *Contrato de movimento substituído pela S2.12 (autor, 07/10/2026): A/D deixam de deslocar; ver regra 4 do `AGENTS.md`.*
- [x] S2.2 Implementar rifle, recarga, munição finita e acerto em inimigos/obstáculos. Definir máscaras de colisão para evitar tiros atravessando cenário ou acertando o próprio jogador.
- [x] S2.3 Implementar HP, dano, intervalo mínimo entre danos de contato, morte e reinício.
- [x] S2.4 Criar robô simples com perseguição e ataque. Para o mapa pequeno, usar navegação sobre área transitável e obstáculos; não apenas vetor direto até o player. *Ampliações integradas em 18–19/10, sem aceite: patrulhas de 32 e hordas 10→20→30→40 (padrão), com reabastecimento, antecipam parte da S3.1 a pedido do autor, sem marcar S3.1/S3.4/S3.8. Cone frontal de 120° até 10 m; até 3 m percebe frente/laterais até 135° de cada lado, com ponto cego traseiro de 90°; paredes bloqueiam ambos e tiro recebido alerta de qualquer direção. [Handoff](handoffs/s2.4-hordas-crescentes.md).*
- [x] S2.5 Adicionar HUD mínima de HP/munição, mira, feedback de disparo/acerto e aviso de dano.
- [x] S2.6 Unificar pausa de física, IA, temporizadores e input. Limpar teclas ao perder foco para evitar movimento preso.
- [x] S2.7 Manter posições frequentes da simulação fora de renderizações React por inimigo; publicar apenas estado relevante à interface.
- [x] S2.8 Calibrar dano, velocidade, cadência e munição com encontros de um a cinco inimigos. Registrar valores na configuração, junto da versão testada.

### Complemento de qualidade — incluído após revisão técnica

Executar mudanças pequenas após receber o teste do autor, preservando a configuração funcional atual como referência. Estes itens não significam que o piloto já recebeu otimizações.

- [ ] S2.9 Instrumentar medição opcional de desenvolvimento: tempo de frame p50/p95, frames longos, draw calls, triângulos, carregamento e memória disponível. Registrar dispositivo, resolução, DPR, navegador e limite da medição; requestAnimationFrame não é tempo de GPU. Iniciar com os dados nativos do renderer e browser, sem exigir biblioteca nova.
- [x] S2.10 Concluir a separação da posição frequente do player em estado mutável; migrar consumidores ativos (câmera, mapa, combate e proximidade) e publicar na UI apenas mudanças relevantes. Medir renders com profiler e verificar embarque, interação, mira, morte e retry. Não reintroduzir módulos MCP arquivados. *Integrada em `110922a` (09/10/2026) e aceita pelo autor: R1–R8 e comparação `?perf` R10.*
- [x] S2.11 Investigar jitter com passo fixo: comparar interpolação visual do Rapier com a configuração atual, mantendo o passo da simulação. Câmera acompanha a posição visual interpolada; tiros e colisões mantêm referência coerente. Adotar só após teste do autor em telas disponíveis; não trocar para timestep variável como correção automática. *Experimento entregue em 26/10/2026, base `0f8d485`: opção `?interp=1`, padrão preservado; [handoff](handoffs/s2.11.md). Concluída em 26/10/2026: investigada, comparada em 144 Hz pelo autor, não adotada. O autor não viu serrilhado nem tremor em nenhuma opção. Padrão mantido; `?interp=1` permanece apenas para comparação (implementação `2d9b45f`).*
- [x] S2.12 Registrar e corrigir problemas de controle apontados pelo autor (escopo ampliado pelo autor em 07/10/2026; S2.12 não se restringe à arma):
  - **A · Movimento pela mira e Explorador da S6.8** (versão validada pelo autor: r7, `4c0ecfd`, com os cinco clipes). Novo contrato: W corre na direção do cursor; S recua mantendo o personagem voltado ao cursor, sem girar 180°; A/D não deslocam; W + S neutralizam; sem W/S, parado e orientado pelo cursor. A mesma direção horizontal de mira orienta corpo e deslocamento; cursor muito perto mantém a última direção válida. Velocidades de corrida e recuo separadas e ajustáveis, recuo mais lento. Q/C, R, E e Escape preservados; bloqueios de menus, diálogos e transições conferidos; instruções e HUD atualizadas. Integrar o candidato da S6.8 (Explorador r7 com Idle, Run, Talk, Fall e Backward, preservando as correções posteriores à r6) como asset separado, com opção de desenvolvimento para comparar com o personagem atual no mesmo ponto, câmera e luz, sem duplicar personagem ou colisores; prévia de teste começa com a r7. Estados Idle, Run e Backward com transições curtas; reprodução ajustada à velocidade efetiva (0,80 m/s é a referência do Backward, não a velocidade final), contato dos pés conferido contra o deslocamento real no jogo e locomoção parada contra parede. Materiais por asset em `GLBCharacter`, sem `flatShading` indiscriminado; escala, colisores e mapas inalterados. A pose de mira do candidato segue experimental. *Parte A integrada em 18/10 (`cf1bc63`, origem `82e3229`), sem aceite. A revisão específica contra `110922a`, A1–A13 e a decisão sobre corrida/deslizamento do Run permanecem na etapa 6.1; o aceite de jogabilidade segue na etapa 6.5. Fontes r7 preservadas fora do Git da integração, com manifesto da Fase 2.*
  - **B · Coerência entre arma, traçador e colisão.** Três etapas revisáveis decididas em 30/09/2026 ([handoff da S2.9](handoffs/s2.9.md)): origem, mira e traçador; colisão com altura; caixas sólidas e navegação. Depois da parte A.
  - **Concluída e aprovada pelo autor (26/10/2026):** A1–A13 aprovados em 25/10 (`029f9e7`), corrida/recuo 4,2/1,2 m/s mantidos. B: etapa 1 `f3a93ff`, etapa 2 `aa74335`, etapa 3 `191976c`, apoio no piso `7397c42`. Revisão Claude sem defeitos, 208/208 e build verde; blockout `?shanghaiAtual` conferido em 1/32/hordas. Registros anteriores de pendência são históricos. [Handoff B](handoffs/s2.12-b.md).
  - **Entregas antecipadas nesta linha:** recursos e Patrol grande, animal mutante, colônia v007 com estufa e Hangar, áudio de combate (parcela da S3.10). Não encerram os itens completos dos sprints futuros; seus checkboxes permanecem pendentes.
  - Não misturar com animações finais de combate. Qualidade visual e jogabilidade são aprovadas só pelo autor.

Aceite do complemento: testes e build passam, nenhum comando/colisão regride e medições comparáveis ficam registradas. A ausência de tela 120/144 Hz é uma limitação explícita, não motivo para declarar essa validação concluída. Instrumentação pode entrar sem mudar gameplay; correções de fluidez dependem da evidência coletada.

Saída: jogador consegue mirar, atirar, recarregar e sobreviver usando movimento; tiros respeitam paredes; inimigos contornam obstáculos; morrer reinicia sem resíduos. Playtest curto obrigatório antes de aumentar volume.

## 7. Sprint 3 — Ondas, categorias e dispositivos

Objetivo: validar a primeira missão de combate completa.

- [ ] S3.1 Implementar sequenciador das três ondas e fila de spawn com teto de oito entidades ativas; concluir onda somente quando fila estiver vazia e todos os inimigos estiverem derrotados.
- [ ] S3.2 Configurar contagens: 6/2/0, 7/2/1 e 7/4/1 para robô/pequeno/grande. Intervalo inicial de 15 segundos entre ondas.
- [ ] S3.3 Implementar criatura pequena e investida sinalizada da grande usando formas/cores diferentes. Espécie e modelo final não bloqueiam o teste.
- [ ] S3.4 Validar spawn em áreas alcançáveis, fora da posição do jogador e de obstáculos; prever recuperação de inimigo preso sem multiplicar drops.
- [ ] S3.5 Implementar três minas com detecção e dano em área, consumidas uma vez na implantação.
- [ ] S3.6 Implementar duas barreiras azuis, destrutíveis e temporárias; inimigos podem atacá-las e tiros do jogador atravessam conforme regra proposta.
- [ ] S3.7 Adicionar preview/validação de implantação e impedir bloqueio da nave ou aprisionamento. Atualizar navegação ao colocar/remover barreira.
- [ ] S3.8 Ajustar suprimento de munição e criar reposições alcançáveis no cenário para a missão ser vencível com margem de erro. Munição permanece separada da bolsa de materiais.
- [ ] S3.9 Exibir onda atual e SHANGHAI CLEAR; encerrar spawns após a terceira onda e manter exploração livre.

- [ ] S3.10 Adicionar feedback mínimo por evento: disparo vazio/recarga, acerto, dano, aviso de investida, explosão de mina e quebra de barreira. Sons provisórios locais/licenciados e volume/mute; sinais visuais continuam suficientes com áudio desligado. Sons só iniciam após gesto do usuário e respeitam pausa/retorno.
- [ ] S3.11 Limitar duração e quantidade de traçadores/partículas e reutilizar recursos onde a medição justificar; reinício remove todos os efeitos. Não adicionar hit-stop ou tremor obrigatório ao combate inicial.
- [ ] S3.12 Validar legibilidade de ameaças, distância de spawn e reação de cada categoria. Manter a grade atual com invalidação para barreiras; só avaliar navmesh se houver falha de navegação demonstrada que a solução atual não resolva.

Saída: três ondas concluíveis; minas/barreiras têm utilidade percebida; pausa e reinício limpam timers/dispositivos; nenhum spawn ou bloqueio impede finalizar. Medir desempenho no pico de oito inimigos.

## 8. Sprint 4 — Loot, orientação e retorno

Objetivo: ligar combate e exploração à recuperação de recursos.

- [ ] S4.1 Implementar inventário temporário com materiais, munição e dispositivos separados; quantidade empilhada e capacidade visíveis.
- [ ] S4.2 Garantir drops: cada robô entrega 1 ferro + 1 cobre; pequenos entregam 1 matéria orgânica; grandes entregam 2. Evitar drop duplicado por morte/dano simultâneo.
- [ ] S4.3 Implementar dois depósitos com 2 ferro + 2 cobre cada e seis placas escondidas em pontos alcançáveis. Persistir loot no mapa até coleta/fim da tentativa.
- [ ] S4.4 Mostrar objetivo da introdução: 20 ferro, 20 cobre, 4 placas, 10 matérias orgânicas. Garantir capacidade para a carga completa; evitar descarte irreversível de itens obrigatórios no tutorial.
- [ ] S4.5 Implementar EDEN por eventos: chegada, primeiros controles, ondas concluídas, placas encontradas e carga pronta; falas não repetem a cada frame nem anunciam objetivo ainda incompleto.
- [ ] S4.6 Reconhecer placas coletadas antecipadamente; indicar materiais restantes e oferecer orientação caso a busca se prolongue.
- [ ] S4.7 Fazer a nave retornar e sinalizá-la após a última onda. Permitir embarcar/desembarcar para continuar explorando após SHANGHAI CLEAR; liberar a ação separada de retornar a Marte somente com carga obrigatória.
- [ ] S4.8 Transferir loot ao depósito do hub uma única vez, usando identificador de expedição e atualização persistente coerente. Tela de resultado informa carga recuperada. Pousar no deck de Marte e permitir desembarque e caminhada ao laboratório; entrar na cabine por si só não confirma loot.
- [ ] S4.9 Derrota/abandono descarta inventário temporário e recomeça sem loot anterior. Reload durante missão retorna ao hub sem conceder recompensa.

- [ ] S4.10 Tornar objetivos legíveis: destaque de interação, ícone/rótulo de recurso e marcador direcional da aeronave quando liberada. Diferenciar alumínio obrigatório de decoração; usar forma/texto além de cor. Sem minimapa completo nesta entrega.
- [ ] S4.11 Usar rádio de EDEN por prioridade e fila curta, sem sobrepor instruções nem bloquear movimento com coreografias. Interação responde ao comando imediatamente; falas e efeitos não duplicam coleta ou extração.

Saída: uma coleta completa oferece 24 ferro, 24 cobre, 12 matérias orgânicas e 6 placas; a missão aceita o mínimo configurado. Extração deposita uma vez; morrer ou fechar antes dela não deposita nada. Validar placas coletadas antes e depois da última onda.

## 9. Sprint 5 — Construção da máquina e validação funcional

Objetivo: concluir o ciclo de jogo e decidir se a jogabilidade está pronta para receber arte.

- [ ] S5.1 Criar interação no laboratório com receita visível: 20 ferro + 20 cobre + 4 placas. Mostrar faltantes sem consumir parcialmente recursos.
- [ ] S5.2 Executar fabricação como uma única transição de estado: validar saldo, debitar materiais e marcar máquina instalada. Repetir interação não cobra nem duplica a máquina.
- [ ] S5.3 Instalar máquina volumosa provisória, com ativação simples e mudança evidente no laboratório. Preservar corredores e enquadramento.
- [ ] S5.4 Salvar inventário restante, conclusão da introdução e máquina instalada. Reconstruir o estado visual corretamente após reload.
- [ ] S5.5 Encerrar tutorial com EDEN explicando a conquista e o futuro uso dos diamantes, sem exigir implementação de produção/estufa.
- [ ] S5.6 Permitir nova expedição de teste com ondas fixas e kit definido, sem repetir a exigência introdutória de materiais ou recompensas únicas. Reset completo só em ferramenta de desenvolvimento explícita.
- [ ] S5.7 Executar a matriz de testes abaixo e corrigir bloqueios de combate, navegação, inventário e save.
- [ ] S5.8 Fazer playtest com o autor e registrar: compreensão dos controles, sensação do tiro, pressão das ondas, utilidade das defesas, clareza da extração e impacto da construção.

- [ ] S5.9 Adicionar verificação automatizada do projeto com os testes existentes e build; configurar CI no provedor do repositório e lint incremental do runtime ativo, sem migrar o test runner nem reformatar o arquivo histórico em massa. Publicação/deploy não faz parte desse trabalho.
- [ ] S5.10 Medir três ciclos de missão/retry/retorno e liberar recursos exclusivos de cena/áudio/efeitos. Comparar carregamento, frames longos e memória com S2.9, sem tratar contagem de callbacks como FPS de GPU.
- [ ] S5.11 Validar instalação da máquina com efeito visual e sonoro simples, preservando o caminho do laboratório e o save. Essa apresentação usa formas provisórias até a etapa de arte.

Saída técnica: percurso completo funcional em build de produção, save correto e nenhum bloqueio conhecido para concluir Shanghai e instalar a máquina. Com coleta total, após construir: 4 ferro, 4 cobre, 12 matérias orgânicas e 2 placas; a matéria orgânica ainda não foi processada.

Saída de design: o jogador entende o que fazer sem intervenção constante e considera o combate suficientemente satisfatório para investir em arte. Se esse critério falhar, repetir ajustes neste sprint; não mascarar problemas de gameplay com texturas.

## 10. Sprint 6 — Estética dos elementos

Objetivo: transformar volumes provisórios em elementos reconhecíveis sem alterar as regras validadas.

- [ ] S6.1 Definir silhuetas e espécies das criaturas; modelar robô e dois portes com linguagem visual coerente.
- [ ] S6.2 Trabalhar arma, mina, barreira, nave, deck de lançamento, cabine/entrada, itens e máquina com escala, pivôs e orientação padronizados. Tornar o acesso à aeronave visualmente evidente.
- [ ] S6.3 Compor Shanghai em ruínas com elementos urbanos reconhecíveis e rotas claras; evitar coberturas que ocultem inimigos/coletáveis da câmera.
- [ ] S6.4 Ajustar animações de movimento, disparo, dano, morte e investida. Manter antecipação de ataques e diferenciação de categorias.
- [ ] S6.5 Adaptar a apresentação do laboratório marciano e tornar a instalação da máquina um momento visual destacado.
- [ ] S6.6 Refinar HUD e mensagens de rádio no estilo EDEN Holographic, após S6.14 e as interfaces funcionais dos Sprints 3–4: vida, pente/reserva explícitos, ondas, defesas, objetivo e interação. Manter centro de combate livre, rádio único por prioridade, sinais além de cor e alerta abaixo de 30% de vida. Valores reais, contraste e efeitos reduzidos conforme o [plano de UI](sprint-6/PLANO_UI.md).
- [ ] S6.7 Organizar fontes/exportações e otimizar geometria antes da texturização. Colisores continuam simples e separados da arte.

- [ ] S6.8 Preparar pipeline de assets apenas para o elenco ativo: explorador, EDEN quando sua apresentação exigir e três categorias de inimigos. Otimizar topologia preservando silhueta, UV, rig e clipes; validar articulações antes de trocar os arquivos ativos. Modelos originais permanecem preservados.
- [ ] S6.9 Separar materiais ou máscara de traje/accent/visor e confirmar visualmente a cor escolhida no perfil. Conferir o resultado na câmera real; não presumir que ler a cor do save muda uma textura baked.
- [ ] S6.10 Criar catálogo mínimo de clipes: idle, andar/correr, recuar, deslocar lateralmente, disparar, recarregar, dano e morte do player; locomoção/ataque/dano/morte por inimigo e investida da criatura grande. Blend por velocidade e direção, sem foot sliding aparente; manter fallback quando um clipe não existir.
- [ ] S6.11 Compartilhar clipes somente entre rigs compatíveis; humanoides e animais podem exigir esqueletos diferentes. Separar locomoção e ação de tronco quando necessário para andar atirando; reação visual não interrompe entrada/dano sem regra de gameplay explícita. Eventos de passos/arma acionam efeitos uma vez e respeitam pausa.
- [ ] S6.12 Provar kit modular e exportação de um trecho pequeno de Shanghai ou do deck, com convenções de colisão, spawn e interação (`COL_*`, `SPAWN_*`, `INTERACT_*`). Comparar rotas com o cenário atual antes de substituir áreas. Layout funcional é a referência; não reescrever todo o mapa nem eliminar `walkableAreas` sem colisores equivalentes.
- [ ] S6.13 Construir narrativa ambiental do novo universo: ruínas urbanas, exploração e vestígios da guerra na Terra; sobrevivência, laboratório e infraestrutura em Marte. Props não alteram cobertura ou ocultam alvos por acidente. Usar marcos visuais para nave, laboratório e rotas. *Parte antecipada integrada na consolidação de 19/10, sem aceite: duas caixas de munição em Shanghai fase 01, abertura por E/botão e revelação azul; +48 de reserva por caixa uma vez por tentativa, restauradas no reinício. Não conclui toda a narrativa ambiental nem S4.3/persistência. [Handoff](handoffs/s6.13-caixa-suprimentos.md).*
- [ ] S6.19 Criar a atmosfera 2,5D de diorama isométrico ilustrado e densidade industrial estilo *Metal Slug* nos interiores/exteriores de Marte e nas ruínas de Shanghai, conforme o [plano de ação da atmosfera 2,5D](sprint-6/PLANO_ATMOSFERA_2_5D.md) e as referências do autor (`sprint-6/referencias-atmosfera/`). Começar pela prova de estilo (*Vertical Slice* `S6.19a`) na **Sala da EDEN (Ala Norte)**, avançar ao **Laboratório** (`S6.19b`), expandir ao restante do hub/exterior de Marte (`S6.19c`) e aplicar a mesma direção às ruínas de Shanghai (`S6.19d`, junto a S6.3/S6.12), sempre após comparação na câmera real e aceite do autor:
  - **1 · Corte assimétrico direcional de maquete (Front-Cut vs. Back-Full).** Eliminar o véu fantasma de 8% (`FADED = 0.08` → `opacity = 0` e `visible = false` abaixo de `0.01`) no teto da sala ativa. Dividir cada parede em base fixa (`*_Base`, `~1,0–1,15 m`), tampa de seção (`*_Cap`) e topo (`*_Top`): apenas as **paredes frontais à câmera (`dot(wallNormal, cameraToRoom) > 0`)** recolhem `*_Top`, enquanto as **paredes de fundo permanecem em 100% da altura** exibindo janelas inclinadas para Marte, tubulações superiores e racks altos. Ao girar a câmera com `Q/C`, permutar suavemente quais paredes cortam e quais sobem, preservando os grupos sincronizados da S6.12.
  - **2 · Tampa de seção opaca (*Poché Cap*) e portais circulares permanentes.** Fechar o topo da parede baixa `*_Base` com face superior escura chanfrada (`#1B1F27` / `#252A34`), nunca oca ou da cor clara do painel. Manter os aros circulares das portas de antepara (`ARQ_*_Portal_*` / *Bulkhead Doors*) inteiros sobre o corte da parede baixa para leitura imediata das saídas.
  - **3 · Estética 2D ilustrada sobre 3D (*Ink Lineart* em 2 níveis + *Stepped Shading*).** Aplicar contorno externo escuro quente (`1.5–2 px`, `#18141E`) nas silhuetas de personagens, máquinas, portais e cortes, e linhas finas (`0.75–1 px`) nas juntas de placas do piso, tubulações e painéis (`EdgesGeometry`/crease ou passe normal/depth desligável no preset baixo). Substituir a iluminação difusa lavada por *Stepped Toon/Lit Shading* de 2–3 faixas via `onBeforeCompile` com gradiente vertical sutil nas paredes.
  - **4 · Paleta *Chiaroscuro 2,5D* (Interior Ardósia Frio × Exterior Marciano Quente).** Trocar o interior bege claro das salas técnicas por cinza-ardósia industrial (`#262A32` / `#3B4049`) e piso modular neutro (`#4A525D` com juntas `#1E2229`), contrastando com a luz solar laranja quente de Marte (`#E87A3E`) entrando pelas janelas, o ciano neon (`#00FFFF` / `#4DD9C0`) da EDEN, o traje pêssego do Astro Explorer e o núcleo quente do Diamante.
  - **5 · DNA *Metal Slug*: densidade modular (*Greebling*) e micro-animações em *Step-Time* (8 FPS).** Compor paredes de fundo e rodapés com tubulações grossas flangeadas, racks de servidores, consoles inclinados, caixas chanfradas, canteiros hidropônicos sob as janelas, quadros de ferramentas, grelhas e **faixas zebradas amarelo/preto** de segurança. Animar LEDs, telas de ondas e pulsos de energia via um único uniforme global discretizado (`uStepTime = floor(t * 8) / 8`, zero alocação em `useFrame`).
  - **6 · UI diegética 2,5D no cenário.** Substituir o `ringGeometry` amarelo provisório da EDEN por anel duplo ciano neon (`2.7m`) com gradiente radial interno (`depthWrite: false`, `+15 mm` do piso), anel de resposta sob o Astro Explorer e painel holográfico isométrico diegético.
  - **7 · Colisão de "perímetro limpo" (*Wall Apron* de `0,40 m`) e piso livre.** Conter racks, consoles e caixas periféricas numa faixa de `0,40 m` coberta por um único `CuboidCollider` contínuo por parede, sem dentes onde o jogador enganche. Cabos de piso, grelhas, escotilhas e faixas zebradas têm relevo $\le 3\text{ mm}$ e zero colisor; a malha do GLB nunca é colisor.
  - **8 · Pipeline automatizado no Blender e auditoria anti-*z-fighting*.** Gerar/validar `*_Base`, `*_Cap` e `*_Top` nos scripts de exportação sem alterar o `.blend` fonte (SHA-256 preservado) e estender a auditoria automatizada de coplanaridade (`tests/colony-props.test.mjs`) para tampas de corte, decalques e faixas zebradas.
  - **9 · Extensão para Shanghai em ruínas (`S6.19d` com S6.3/S6.12).** Aplicar o corte de maquete em 1–2 pavimentos, contorno de tinta, vigas expostas, cabos e sinalização de alto contraste às fachadas destruídas, aos 2 depósitos e aos 6 esconderijos de placas de alumínio em Shanghai.
  - **10 · Orçamento e presets (`S2.9` / `S7.8`).** Medir draw calls, triângulos e `rAF p50/p95` antes e depois na Sala da EDEN; instanciar props repetidos e permitir desligar contorno de pós-processo, scanlines e partículas no preset baixo. Colonos animados no laboratório continuam no backlog (item 14.9).

- [ ] S6.14 Definir tokens, fontes locais licenciadas e componentes mínimos com variantes EDEN Holographic e Mars Colony Clean. Cobrir estados de interação, foco, carregamento, vazio, erro e sucesso; medir contraste e oferecer efeitos reduzidos. Usar os dois guias visuais preservados no [plano de UI](sprint-6/PLANO_UI.md).
- [ ] S6.15 Atualizar entrada, perfil, continuar, pausa/controles e configurações com o estilo EDEN, após S6.14. Entrada leva ao hub; partida permanece na nave. Preservar save e acesso por teclado, restaurar foco/pausa e exibir somente configurações funcionais.
- [ ] S6.16 Atualizar briefing, cabine, inventário temporário, carregamento/erro, resultado e derrota/retry no estilo EDEN, após S6.6, S6.15 e Sprint 4. Distinguir ondas concluídas, carga pronta e carga salva; bloquear input do canvas sob modais e preservar extração única.
- [ ] S6.17 Aplicar Mars Colony Clean ao depósito, resumo da última carga confirmada e laboratório, após S6.16 e S5.1–S5.5. Mostrar materiais, receita, faltantes e máquina instalada reais; fabricação continua na interação física do laboratório. Energia, população, pesquisa, estufa e construção livre permanecem no backlog.
- [ ] S6.18 Validar as telas de S6.6/S6.14–S6.17 em desktop, teclado, zoom de 200% e efeitos reduzidos; testar foco, pausa, input, save e três ciclos de missão/retorno. Remover informações internas de sprint da UI final e manter QA em modo de desenvolvimento. Registrar roteiro e revisão visual do autor sem substituir playtest por screenshots.

Sequência de UI: S6.14 → S6.15 → S6.6 → S6.16 → S6.17 → S6.18. A numeração existente é preservada. A implementação segue a entrada do Sprint 6 após S5.8; o detalhamento antecipado não aprova a jogabilidade nem inicia a atualização de telas.

Saída: elementos reconhecíveis com materiais simples, combate legível, interfaces EDEN/Mars coerentes e percurso sem regressão. Comparar câmera, colisões e desempenho ao sprint 5. Revisão visual com o autor define a base da texturização.

## 11. Sprint 7 — Texturas, materiais e entrega

Objetivo: finalizar a apresentação do protótipo sem prejudicar resposta e carregamento.

- [ ] S7.1 Definir paleta e materiais de Marte/Shanghai, inimigos, equipamento e loot; manter neon azul como assinatura das defesas.
- [ ] S7.2 Preparar UVs/texturas e estabelecer orçamento por asset conforme o dispositivo-alvo. Evitar texturas grandes sem benefício visível na câmera real.
- [ ] S7.3 Aplicar desgaste/ruínas e materiais da máquina; não esconder objetos interativos na textura do cenário.
- [ ] S7.4 Refinar iluminação e efeitos com contenção; efeitos não podem encobrir mira, inimigos ou drops.
- [ ] S7.5 Medir tamanho de assets, carregamento e tempo por frame; corrigir regressões e garantir que assets arquivados não acompanhem a distribuição.
- [ ] S7.6 Reexecutar o percurso completo em build de produção, com save novo e existente; registrar bugs restantes, versão e instruções para testar.

- [ ] S7.7 Automatizar exportação/otimização dos GLBs e texturas com saída separada da fonte; comparar tamanho, rig, materiais e animações antes/depois. Avaliar meshopt e formatos de textura compatíveis com os loaders adotados; não instalar codecs sem ganho medido.
- [ ] S7.8 Avaliar AO/iluminação baked da geometria estática e reduzir luzes/sombras caras com comparação visual do autor. Criar presets baixo/padrão/alto e limitar DPR; configuração padrão deve manter leitura de combate. Bloom/AO em pós-processamento somente opcionais e com custo medido.
- [ ] S7.9 Refinar áudio e efeitos do combate/ambiente, com limites de vozes/partículas, volume/mute e opção de reduzir efeitos/tremor. Qualquer shake é discreto e desligável; hit-stop só entra após teste específico de timers e resposta, sem alterar o relógio de recarga/ondas por acidente.
- [ ] S7.10 Registrar orçamento real por asset e cena a partir das medições. Referências iniciais, não garantias: 8–20 mil triângulos por humanoide principal, texturas até 1024² quando suficientes e menos de 20 MB no carregamento inicial. Ajustar exceções pela qualidade na câmera e pelo dispositivo; carregar destinos sob demanda. Avaliar LFS para fontes grandes novas, sem reescrever histórico existente.

- [ ] S7.11 Finalizar acabamento de UI após S6.18, S7.5 e S7.8–S7.9: glow, scanlines decorativas e transições opcionais, sem deslocar texto/mira ou prejudicar contraste. Comparar custo com efeitos ligados/desligados, respeitar redução de movimento e preset baixo; registrar revisão visual final do autor.

Saída: protótipo visualmente revisado e funcional até a máquina construída. A entrega é local/testável; publicação externa não faz parte deste plano.

## 12. Organização técnica mínima

Adaptar à estrutura existente, evitando criar uma engine genérica antes de validar o jogo:

- Configurações: Shanghai, inimigos, arma, ondas, drops, dispositivos e receita, com valores centralizados.
- Simulação: movimento/combate/spawn/navegação; atualizações frequentes independentes da renderização React.
- Estado de expedição: fase, fila de ondas, entidades, inventário temporário e resultado.
- Estado persistente do hub: perfil, depósito, introdução concluída, máquina instalada e versão do save.
- Apresentação: HUD, rádio de EDEN, modelos e efeitos consomem eventos/estado do jogo.
- Persistência: extração e fabricação atualizam inventário e flags em conjunto. Proteger contra execução repetida e falha de escrita; não anunciar sucesso se o save falhar.

## 13. Matriz de validação

| Cenário | Resultado esperado | Primeiro sprint |
| --- | --- | --- |
| Backend desligado e dados antigos no navegador | Entrada local funciona, sem chamadas MCP | 1 |
| Entrar e sair da nave estacionada em Marte | Permanece no hub, sem iniciar tentativa ou consumir kit | 1 |
| Decolar e desembarcar em Shanghai | Cena correta, posição segura e câmera/controles restaurados | 1 |
| Embarcar na Terra com carga incompleta | Pode desembarcar; retorno bloqueado e faltantes informados | 4 |
| Retornar a Marte e sair da nave | Pouso no deck, loot confirmado uma vez e laboratório acessível a pé | 4–5 |
| Comando repetido ou falha de carregamento na viagem | Sem viagens/depósitos duplicados e com recuperação segura | 1, 4 |
| Tiro em parede e alvo atrás dela | Parede bloqueia dano | 2 |
| Pausa/perda de foco | Sem dano, avanço de onda ou teclas presas | 2–3 |
| Último inimigo morto com fila de spawn pendente | Onda continua até consumir a fila | 3 |
| Mina atinge vários inimigos | Cada morte/drop contado uma vez | 3–4 |
| Barreira expira ou é destruída | Navegação e colisões liberadas | 3 |
| Placas coletadas antes do CLEAR | EDEN reconhece objetivo já atendido | 4 |
| CLEAR sem quatro placas | Nave sinalizada, decolagem bloqueada com orientação | 4 |
| Derrota/retry ou fechamento no combate | Loot da tentativa descartado, progresso do hub preservado | 4 |
| Cliques repetidos na extração/construção | Transferência/custo aplicados uma única vez | 4–5 |
| Reload após extração, antes e depois de construir | Inventário e máquina consistentes | 5 |
| Partida repetida após construir | Máquina permanece única; tutorial não bloqueia extração | 5 |
| Substituição de modelos/texturas | Colisões e leitura de combate preservadas | 6–7 |

Automatizar testes de transição de onda, drops, inventário, extração, derrota e fabricação/persistência; testar câmera, controles, navegação e leitura visual também manualmente. Build obrigatório a cada entrega. Não usar screenshots ou compilação como substituto do playtest.

Meta provisória de desempenho: 60 FPS no equipamento de referência registrado no sprint 0. Medir tempo por frame e registrar quedas sustentadas; fechar o orçamento real depois da primeira medição. Testar ao menos três ciclos consecutivos de missão/retry para detectar crescimento indevido de entidades e recursos. Falha de desempenho bloqueia aumento de volume e avanço de complexidade visual.

### Regressões obrigatórias das melhorias incorporadas

| Alteração | Verificação | Sprint |
| --- | --- | --- |
| Posição mutável/interpolação | Proximidade, mira, nave e câmera coerentes; nenhum render da árvore por posição de frame | 2 |
| Movimento pela mira | W corre e S recua na direção do cursor, em vários ângulos; A/D não deslocam; W + S neutralizam; cursor perto do personagem sem tremor; Q/C não redefine a mira; sem giro involuntário | 2 |
| Áudio e efeitos | Mute, pausa, retry e troca de mapa sem sons/efeitos persistentes ou eventos duplicados | 3–7 |
| Novo modelo/otimização | Rig e clipes preservados, cor funciona, pivô/escala/mira e colisão coerentes | 6–7 |
| Trecho de mapa autorado | Mesmas rotas acessíveis, spawns válidos e cobertura coerente com o visual | 6 |
| Preset visual | Nenhum inimigo, loot ou sinal obrigatório fica invisível na qualidade baixa | 7 |

## 14. Backlog após este marco

1. Confirmar carbono e implementar produção de diamante.
2. Desenvolver upgrades de armas, armadura, dispositivos e bolsa.
3. Implementar dificuldade adaptativa das revisitas com progressão real, preservando ganho perceptível de poder.
4. Definir receita da máquina de construção espacial e primeiro ciclo produtivo da estufa.
5. Expandir Shanghai e criar outras cidades; depois Lua/luas de Marte.
6. Adicionar resgate/checkpoints para expedições maiores.

7. Avaliar suporte a gamepad e remapeamento de controles após consolidar teclado/mouse; touch/mobile requer um recorte próprio de interface e desempenho.
8. Avaliar minimapa se marcadores e marcos visuais não resolverem orientação; não introduzir click-to-move em paralelo ao controle de combate validado.
9. Dar vida ao hub com drones/colonos e rotinas leves quando isso representar evolução da sociedade; EDEN permanece guia. Não restaurar reuniões e agentes do produto MCP.
10. Avaliar navegação por navmesh em mapas maiores, movimentação contextual e biblioteca ampliada de animações conforme uma necessidade de gameplay demonstrada.
11. Atualizações maiores de React/R3F/Rapier/Vite em trabalho isolado com verificação de compatibilidade e benefício concreto. Não são pré-requisito do piloto.

Próxima ação de execução: receber a validação do autor sobre o Sprint 2, corrigir o que for apontado e executar S2.9–S2.12 de forma incremental. Depois seguir ao Sprint 3. Não iniciar novos mapas, estufa ou texturas finais antes de validar o ciclo até a máquina do laboratório.
