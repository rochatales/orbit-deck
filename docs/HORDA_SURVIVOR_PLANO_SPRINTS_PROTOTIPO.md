# Horda Survivor — Sprints do protótipo Shanghai

Criado em 28/09/2026; atualizado em 30/09/2026. Status: Sprint 1 implementado; núcleo do Sprint 2 implementado, com validação do autor e complemento de qualidade pendentes. Sprint 0 mantém a pendência de baseline registrada em seu relatório.

Referência: [Auditoria e decisões de design](HORDA_SURVIVOR_AUDITORIA_E_PLANO.md). Este plano recorta a primeira entrega: sair do hub em Marte, concluir Shanghai, recuperar recursos, retornar e construir a primeira grande máquina no laboratório.

Revisão técnica incorporada: [Melhorias selecionadas para Horda Survivor](GAMEPLAY_REVIEW_HORDA_SURVIVOR.md). A numeração deste plano é a referência do novo projeto; a revisão do MCP Office não substitui estes sprints.

Planejamento de UI incorporado em 30/09/2026: [Plano de ação e referências visuais](sprint-6/PLANO_UI.md). Define EDEN Holographic para menus/expedição e Mars Colony Clean para recursos/laboratório, detalha S6.6, acrescenta S6.14–S6.18 e S7.11. Implementação e aprovação visual pendentes; preserva a sequência funcional até o Sprint 5.

## 1. Resultado esperado e ordem de prioridade

**Marco funcional:** o jogador completa o percurso hub → briefing de EDEN → deck de lançamento → embarque/decolagem → desembarque em Shanghai → três ondas → coleta → embarque/extração → pouso e desembarque no deck de Marte → laboratório → máquina instalada e persistida. Também consegue perder e recomeçar sem conservar o loot da tentativa.

Prioridade definida pelo autor:

1. Validar jogabilidade usando geometria simples, cores sólidas e os assets existentes que forem úteis.
2. Depois, trabalhar estética dos elementos: silhueta, forma, escala, composição, animação e legibilidade.
3. Por último, aplicar texturas e materiais finais, preservando desempenho e leitura de combate.

Feedback mínimo de tiro, dano, mira, inimigos, minas e barreiras faz parte da jogabilidade e entra desde cedo. Não esperar a fase estética para informar ao jogador o que está acontecendo.

Nesta atualização, somente o planejamento foi alterado. O piloto em execução, saves, dependências e assets permanecem como estão. Testes visuais e aprovação da jogabilidade são realizados pelo autor; o agente executa verificações técnicas e entrega roteiros.

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
- W/↑ avança na direção do olhar, S/↓ recua, A/D ou ←/→ deslocam para os lados do personagem; mouse orienta em Marte e Shanghai, Q/C gira somente a câmera; botão esquerdo para atirar, R para recarregar, E para interagir, 1/2 para selecionar defesa, clique para posicionar e Escape para cancelar posicionamento/pausar conforme o contexto. Disparo e implantação são modos mutuamente exclusivos.
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

Execução registrada em [Relatório do Sprint 0](sprint-0/RELATORIO.md). Preparação concluída; S0.4 parcial, com limites explícitos no relatório. Nenhuma alteração de gameplay.

Objetivo: preparar uma base recuperável sem perder código ou arte.

- [x] S0.1 Registrar commit/estado atual e criar a branch de implementação `rochatales/horda-survivor`, se ainda não existir.
- [x] S0.2 Inventariar e preservar separadamente os arquivos não rastreados; verificar a cópia. Não usar a criação de branch como backup desses arquivos.
- [x] S0.3 Registrar assets ativos, fontes e exportações. Adiar movimentos em massa até atualizar imports; não criar duplicatas de GLBs ativos.
- [ ] S0.4 Reexecutar build e registrar uma sessão manual: entrada, movimento, câmera e EDEN. Registrar o dispositivo, navegador, resolução e medidas de carregamento/desempenho disponíveis.
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

**Núcleo S2.1–S2.8 implementado em 29/09/2026. Validação visual do autor e novos itens S2.9–S2.12 pendentes.**

[Relatório](sprint-2/RELATORIO.md) · [Checklist de teste manual](sprint-2/VALIDACAO_MANUAL.md). Os checks abaixo registram implementação e verificação técnica; o balanceamento é inicial.

Objetivo: validar a sensação básica de combate antes de criar a horda completa.

- [x] S2.1 Orientar pelo mouse em Marte e Shanghai. Movimento relativo ao olhar: W avança, S recua, A/D deslocam lateralmente; deslocamento não gira o personagem automaticamente. Câmera não redefine a frente.
- [x] S2.2 Implementar rifle, recarga, munição finita e acerto em inimigos/obstáculos. Definir máscaras de colisão para evitar tiros atravessando cenário ou acertando o próprio jogador.
- [x] S2.3 Implementar HP, dano, intervalo mínimo entre danos de contato, morte e reinício.
- [x] S2.4 Criar robô simples com perseguição e ataque. Para o mapa pequeno, usar navegação sobre área transitável e obstáculos; não apenas vetor direto até o player.
- [x] S2.5 Adicionar HUD mínima de HP/munição, mira, feedback de disparo/acerto e aviso de dano.
- [x] S2.6 Unificar pausa de física, IA, temporizadores e input. Limpar teclas ao perder foco para evitar movimento preso.
- [x] S2.7 Manter posições frequentes da simulação fora de renderizações React por inimigo; publicar apenas estado relevante à interface.
- [x] S2.8 Calibrar dano, velocidade, cadência e munição com encontros de um a cinco inimigos. Registrar valores na configuração, junto da versão testada.

### Complemento de qualidade — incluído após revisão técnica

Executar mudanças pequenas após receber o teste do autor, preservando a configuração funcional atual como referência. Estes itens não significam que o piloto já recebeu otimizações.

- [ ] S2.9 Instrumentar medição opcional de desenvolvimento: tempo de frame p50/p95, frames longos, draw calls, triângulos, carregamento e memória disponível. Registrar dispositivo, resolução, DPR, navegador e limite da medição; requestAnimationFrame não é tempo de GPU. Iniciar com os dados nativos do renderer e browser, sem exigir biblioteca nova.
- [ ] S2.10 Concluir a separação da posição frequente do player em estado mutável; migrar consumidores ativos (câmera, mapa, combate e proximidade) e publicar na UI apenas mudanças relevantes. Medir renders com profiler e verificar embarque, interação, mira, morte e retry. Não reintroduzir módulos MCP arquivados.
- [ ] S2.11 Investigar jitter com passo fixo: comparar interpolação visual do Rapier com a configuração atual, mantendo o passo da simulação. Câmera acompanha a posição visual interpolada; tiros e colisões mantêm referência coerente. Adotar só após teste do autor em telas disponíveis; não trocar para timestep variável como correção automática.
- [ ] S2.12 Registrar e corrigir problemas de controle apontados pelo autor: mira, avanço/recuo/laterais, diagonais, aceleração/parada e câmera. Preservar o contrato de movimento relativo ao olhar e não misturar esta entrega com animações finais.

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
- [ ] S6.13 Construir narrativa ambiental do novo universo: ruínas urbanas, exploração e vestígios da guerra na Terra; sobrevivência, laboratório e infraestrutura em Marte. Props não alteram cobertura ou ocultam alvos por acidente. Usar marcos visuais para nave, laboratório e rotas.

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
| Movimento relativo ao olhar | W/S/A/D e diagonais em vários ângulos; Q/C não redefine o olhar; sem giro involuntário | 2 |
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
