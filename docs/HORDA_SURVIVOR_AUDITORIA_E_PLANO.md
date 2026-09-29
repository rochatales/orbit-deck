# Orbit Deck — Auditoria, direção narrativa e plano de refatoração

Atualizado em: 28/09/2026. Base auditada: `main`, commit `99ab0d7`, três commits no histórico.

Esta revisão substitui, para o planejamento da nova fase, o documento em texto “Orbit Deck — Auditoria do Projeto & Plano de Refatoração”. Consolida a auditoria do código e a premissa informada pelo autor. As fases abaixo são trabalho proposto, não implementação concluída. Documentos anteriores do produto MCP devem ser tratados como contexto histórico quando conflitarem com esta direção.

Plano de execução do primeiro marco: [Sprints do protótipo Shanghai](HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md). O recorte atual termina na construção da primeira máquina: jogabilidade primeiro, estética dos elementos depois, texturas por último. Produção de diamante, estufa e adaptação das revisitas permanecem na visão de evolução abaixo, mas ficam após esse marco.

## Atualização de planejamento — 29/09/2026

A revisão técnica do antigo MCP Office foi filtrada para o novo jogo em [Melhorias de gameplay, visual e mecânicas](GAMEPLAY_REVIEW_HORDA_SURVIVOR.md), com tarefas incorporadas ao plano de sprints. Inclui fluidez, feedback, orientação, otimização de assets, animações de combate e evolução gradual dos cenários. Não altera o piloto em execução nem incorpora agentes/reuniões do produto anterior. Testes visuais continuam com o autor.

## 1. Direção confirmada pelo autor

- O mundo acabou e o que restou da humanidade vive em Marte.
- O mapa atual representa o hub da sociedade humana em Marte. Ele receberá um deck de lançamento físico, conectado por uma rota caminhável, com aeronave na qual o explorador pode entrar e sair. A partida para a Terra ocorre a bordo; ao retornar, a nave pousa nesse deck e o jogador desembarca para seguir ao laboratório.
- O personagem do jogador é um explorador.
- EDEN é uma superinteligência criada pelos humanos para ajudar na sobrevivência da humanidade e atua como guia.
- Cada missão acontece em um novo mapa, separado do hub.
- As missões envolvem vencer hordas e coletar loot.
- Os recursos recuperados servem para evoluir a sociedade em Marte e o hub.

### Direção adicional definida no brainstorm

- A automação tomou conta das operações humanas, logística, segurança e relacionamentos. Uma guerra mundial escalou até o conflito nuclear e destruiu a Terra como lar humano. Todos os mapas terrestres terão ambientação pós-apocalíptica.
- As primeiras expedições exploram cidades da Terra, com chegada e retorno por nave. Shanghai em ruínas será a missão de introdução. Lua e luas de Marte são expansões posteriores; outros planetas dependem do sucesso de uma versão futura.
- Inimigos iniciais: robôs humanoides e animais alterados pela radiação, com categorias, sequências e volumes próprios por mapa. Para Shanghai haverá animais de pequeno e grande porte; espécies e visuais ainda precisam ser escolhidos.
- Combate híbrido: tiros manuais, com referência de ritmo em Metal Slug, e defesas implantáveis automáticas. As primeiras são minas e barreiras de proteção neon azul.
- Armas, armadura, itens e capacidade da bolsa evoluem. Munição e dispositivos têm espaços separados da carga de materiais.
- EDEN é a única IA que continua controlada pelos humanos e quer sua sobrevivência. Fala pelo rádio do traje, ensina comandos, orienta navegação e indica itens importantes da missão.
- Derrota elimina todo o loot da expedição e exige recomeçar a missão. Resgate/save entre hordas fica para mapas maiores no futuro.
- A introdução exige concluir as hordas e recuperar as placas de alumínio antes da extração. Depois da primeira conclusão, Shanghai pode ser revisitada com volume de inimigos adaptado ao nível do personagem.
- A primeira volta bem-sucedida permite instalar uma grande máquina no laboratório, com impacto visual no hub. Ela transforma carbono em diamante. Diamante e outros componentes permitirão construir a máquina de construção espacial; esta e matéria orgânica permitirão erguer unidades produtivas. A primeira unidade produtiva será uma estufa.

Coerência narrativa a finalizar: o autor descreveu a destruição de toda a vida terrestre e também animais sobreviventes alterados. A redação proposta é “destruição da civilização humana e da habitabilidade da Terra para humanos”, preservando a existência dos animais. Essa explicação, a origem exata do carbono e a crise imediata da colônia ainda devem ser fechadas. A hipótese anterior de simulação de treinamento não foi adotada.

**Ciclo de jogo proposto a partir dessa direção:** preparar expedição no hub → receber orientação de EDEN → viajar ao mapa da missão → enfrentar hordas e coletar recursos → concluir missão/retornar → investir na colônia → desbloquear novas possibilidades.

Retorno por nave, perda de loot na derrota e a estufa como primeira unidade produtiva estão definidos. Custos além da primeira máquina e detalhes de desbloqueio ainda precisam de balanceamento. A ficção de EDEN como IA não exige um serviço de IA real: sua implementação inicial será por scripts locais, conforme a direção de desacoplamento do projeto.

## 2. Estado técnico e limites da auditoria

| Item | Evidência da auditoria de 28/09/2026 |
| --- | --- |
| Frontend | `npm run build` passou, incluindo TypeScript e Vite |
| Backend | `npm run typecheck` em `server/` passou |
| Avisos do build | Bundle grande e diretivas `use client` do Framer Motion ignoradas |
| Testes | Não foram encontrados testes automatizados na inspeção |
| GLBs emitidos | Aproximadamente 149 MB; player + EDEN somam cerca de 51 MB |
| JavaScript principal | Aproximadamente 3,61 MB minificado, 1,22 MB gzip |
| Arquivos não rastreados | 94 entradas no momento da auditoria |
| Arte na raiz | `.blend`, `.blend1` e `.png` somavam aproximadamente 147 MiB |

Stack declarada: React 18, Three.js 0.165, React Three Fiber 8, Rapier 1.5, Zustand 5, Framer Motion 11, Vite 4 e TypeScript 5; backend Fastify 5. São versões declaradas no projeto, não uma recomendação de atualização.

Foi feita inspeção de código e compilação. Não houve sessão de gameplay, medição de FPS, perfil de GPU ou validação visual completa. Tamanho dos arquivos não equivale a memória de GPU nem comprova queda de FPS.

## 3. Correções essenciais ao plano original

### 3.1 Refatorar o fluxo que realmente executa

`index.html` carrega `src/main.tsx`, que monta `App`, `GameCanvas` e `OfficeScene`. Os NPCs ativos são montados por `OfficeScene` usando `MCPCharacter` e `MCP_NPCS`.

`src/npcs/NPCManager.ts` pertence ao fluxo legado de `src/main.ts` e `InteractionManagerLegacy.ts`. Refatorá-lo isoladamente não altera a aplicação atual. Inventariar referências antes de arquivar o legado; não fazer sua modernização como primeira etapa.

### 3.2 Substituir consumidores antes de excluir módulos

| Área | Trabalho necessário |
| --- | --- |
| `src/app/App.tsx` | Remover inicialização e montagem de workflows, clientes, wizard e Smart Lab; montar o novo fluxo local |
| `characterAssetConfig.ts`, `mcpData.ts`, `mcpActions.ts` | Separar identidade/visual do NPC, interação local e antigas ações de negócio |
| `OfficeScene.tsx`, `PhysicsWorld.tsx`, `colliders.tsx`, `createOfficeMap.ts` | Substituir dependências de configuração/tipos MCP; preservar mapa e colisões |
| `MCPCharacter.tsx` e `MCPNpcModel.tsx` | Preservar renderização útil; retirar status, cadastro e eventos de workflow |
| `InteractionManager.tsx`, `DialogueModal.tsx`, HUD e notificações | Substituir ativação de decks e ações MCP por interação, missão e mensagens do jogo |
| `BrandBrainInteractionScene.tsx` | Reaproveitar a apresentação pixel art, substituindo painel e fluxo de cadastro |
| `characters/player/PlayerController.tsx` | Remover vínculo com `useWorkflowStore` e configuração MCP; o documento original citava incorretamente `useClientSessionStore` |
| Reunião/beacon e `useMeetingStore` | Decidir retirada ou novo uso; preservar a sala não implica preservar o sistema de reunião |
| `domain/decks.ts` e `journey/` | Retirar conexões de ferramentas e seleção/ativação de decks do percurso de entrada |

Depois de migrar os consumidores, remover os módulos de API, domínios de clientes/editorial/Smart Lab, wizard, cadastro, `SmartLabOverlay`, `WorkflowStatusLog` e `TaskPanel` que não tiverem função na nova experiência.

### 3.3 Stores e persistência

- Remover `useAgentStatus`, `useClientSessionStore`, `useClientSetupStore` e `useWorkflowStore` após substituir seus consumidores.
- Aproveitar `useGameStore`, revisando a separação entre estado de interface e simulação.
- Reformular `useDialogueStore`: seus modos atuais ainda incluem ativação de decks e tela de cadastro.
- Extrair identidade e preferências de `usePlayerJourneyStore`; não preservar integralmente suas conexões, decks e onboarding.
- Definir o destino de `useMeetingStore`.
- Versionar o novo save. Definir migração ou descarte explícito dos campos antigos, preservando nome/cor quando aplicável. Testar tanto sessão nova quanto navegador com dados antigos.
- Separar progresso persistente da colônia de dados temporários de uma expedição. Confirmar loot apenas na extração bem-sucedida; descartar o inventário da expedição na derrota. Proposta: preservar equipamentos permanentes e progresso já consolidado no hub; ao reiniciar, repor o kit de tutorial para evitar bloqueio por falta de munição.

### 3.4 Backend

O backend mistura ações simuladas, leitura de arquivos locais e chamada HTTP de modelo no Smart Lab. O desacoplamento envolve regras do produto anterior, não apenas rede.

Arquivar `server/` após eliminar seus consumidores e ajustar scripts/documentação. Preservar uma versão recuperável. Um futuro servidor de mapas não é requisito do primeiro protótipo e não deve condicionar sua arquitetura.

## 4. Mapa e assets

Preservar a estrutura de salas e corredores de `src/world/mapConfig.ts`, o player, EDEN, câmera, física e a arte de interação aproveitável. O escritório passa a representar a colônia marciana; nomes, funções e ambientação das salas serão adaptados à narrativa.

Retirar os outros NPCs ativos e os pontos de interação de Smart Lab/Orbit Garden conforme a direção original, sem confundir isso com demolir as salas ou áreas do mapa. Preservar os assets retirados para reutilização futura.

O hub tem corredores, portas, móveis e obstáculos. Não assumir que ele funciona como arena de horda. O primeiro mapa de missão deve ser pequeno e próprio para combate, conectado ao hub pelo fluxo de expedição. Navegação de inimigos precisa considerar obstáculos, limites e pontos válidos de spawn.

### Organização proposta

- `src/assets/`: exportações usadas pelo jogo, com uma única referência canônica por asset ativo.
- `public/art/`: arte servida diretamente; retirar desse local arquivos arquivados que não devam acompanhar a distribuição.
- `assets-library/`: fontes de produção, iterações, referências e assets inativos, fora do carregamento do jogo.
- Categorias da biblioteca: personagens, inimigos, armas, itens, mapas, ambiente e interface; criar conforme houver conteúdo.
- Registrar origem/licença, versão, escala, orientação, animações e caminho da exportação dos assets utilizados.

Não duplicar player e EDEN entre biblioteca e runtime sem distinguir fonte e exportação. Mover GLBs apenas junto da atualização de seus imports. Proteger arquivos não rastreados antes da organização: uma nova branch não os salva.

### Desempenho

A posição do jogador é escrita no Zustand a cada frame e consumida por componentes React, incluindo NPCs e interações. Revisar esse caminho antes de multiplicar entidades; manter simulação frequente em estruturas apropriadas e publicar na interface apenas o necessário.

Medir carregamento, tempo por frame, draw calls e comportamento com quantidades crescentes de inimigos. Definir dispositivo-alvo e orçamento de inimigos simultâneos. Otimizar modelos/texturas e carregamento por mapa com base nessas medições. Não prometer capacidade de horda antes desse teste.

## 5. Plano revisado e critérios de conclusão

| Fase | Entrega | Critério de conclusão |
| --- | --- | --- |
| 0 — Preservação | Snapshot recuperável da base e cópia dos assets não rastreados; branch de implementação | Código e arte recuperáveis, inventário registrado; sugestão de branch: `rochatales/horda-survivor` |
| 1 — Base local | Entrada no hub, player, EDEN com diálogo local; retirada progressiva de MCPs e legado | Build passa; entrar, caminhar e conversar funciona sem backend e sem chamadas à antiga API |
| 2 — Preparação de conteúdo | Assets organizados, tipos locais de NPC/mapa/missão, save definido e primeiro mapa simples | Imports íntegros; hub e missão carregam separadamente; estado antigo não bloqueia entrada |
| 3 — Primeiro ciclo completo | Briefing, Shanghai, robôs e dois portes de criatura, uma arma, HP, três ondas, minas, barreiras, loot, retorno e máquina do laboratório | Jogador conclui a missão, recebe recompensa uma única vez e vê uma mudança no hub; derrota/reinício seguem regra definida |
| 4 — Validação | Navegação, pausa, colisão, dano, spawn, carregamento e save verificados | Inimigos chegam a alvos válidos; pausa congela combate/ondas; reiniciar não duplica entidades; progresso sobrevive ao reload |
| 5 — Expansão | Novas missões/mapas, inimigos, armas, narrativa e melhorias da sociedade | Expansão guiada pelo ciclo validado e pelo orçamento de desempenho |

As quantidades da fase 3 e a receita inicial estão especificadas na seção 7 como balanceamento proposto, sujeito a playtest. Implementar primeiro um inimigo para validar o combate e depois completar as categorias da missão. Trabalhar otimização desde a preparação de assets e repetir medições quando houver combate real.

Stamina, ranking, crafting complexo, construção livre, múltiplos personagens e sistemas amplos de gestão ficam para depois, salvo necessidade explícita do ciclo inicial. Single-player local é uma proposta de escopo, ainda a confirmar.

Testes prioritários quando esses sistemas existirem: transição de missão/ondas, dano e derrota, recompensa aplicada uma única vez, custo/desbloqueio da melhoria e persistência. Complementar com verificação manual de movimento, câmera, diálogo e colisões.

## 6. Decisões consolidadas e pendências

### Definido pelo autor

- [x] Terra pós-apocalíptica, colônia em Marte e expedições de nave.
- [x] Shanghai como introdução; outros destinos em expansões.
- [x] Robôs humanoides e animais alterados de pequeno e grande porte.
- [x] Tiros manuais, minas e barreiras neon azul implantáveis.
- [x] Recursos de robôs: ferro e cobre; de animais: matéria orgânica; placas de alumínio escondidas no cenário.
- [x] Derrota perde todo o loot da missão e reinicia; resgate intermediário é futuro.
- [x] Munição, dispositivos e materiais separados no inventário.
- [x] Alumínio obrigatório na introdução e nave sinalizada após as hordas.
- [x] Armas, armadura, itens e bolsa como eixos de evolução.
- [x] EDEN pelo rádio, orientando controles, navegação e coleta.
- [x] Máquina grande e visível no laboratório após a primeira missão; primeira unidade produtiva será a estufa.
- [x] Revisitas com adaptação do volume da horda ao nível do personagem.

### Pendências que afetam implementação ou conteúdo

- [ ] Arma inicial, recarga, cura e controles/dispositivo-alvo. Proposta de escopo: single-player local.
- [ ] Espécies/visuais dos dois animais e comportamento de ataque de cada categoria.
- [ ] Personalidade de EDEN, causa específica do conflito entre máquinas e tempo desde o colapso.
- [ ] Confirmar a redação sobre vida sobrevivente na Terra e a necessidade imediata de Marte. Proposta: falta de capacidade industrial para manter e expandir a colônia.
- [ ] Origem do carbono. Proposta: processar matéria orgânica no laboratório; não tratar a conversão como ciência validada ou receita industrial real.
- [ ] Benefício funcional da estufa e receitas posteriores à primeira máquina.
- [ ] Regras definitivas de coleta, empilhamento, descarte, abandono e fechamento do jogo durante missão. Proposta: sair sem extrair descarta o loot temporário, sem checkpoint de horda no protótipo.
- [ ] Construção em pontos predefinidos ou livre. Proposta para protótipo: posições predefinidas e estados visuais persistentes.

Essas pendências não exigem reabrir as decisões já tomadas. As regras abaixo dão uma base numérica para iniciar o plano técnico e testar o primeiro ciclo.

## 7. Contrato de Shanghai — balanceamento inicial proposto

Os números desta seção foram definidos como proposta de design a pedido do autor. Ainda não foram testados e devem permanecer em configuração editável.

### 7.1 Três ondas, 30 inimigos no total

| Onda | Robôs humanoides | Animais pequenos | Animais grandes | Total |
| --- | ---: | ---: | ---: | ---: |
| 1 — Contato | 6 | 2 | 0 | 8 |
| 2 — Pressão | 7 | 2 | 1 | 10 |
| 3 — Confronto final | 7 | 4 | 1 | 12 |
| Total | 20 | 8 | 2 | 30 |

Duração-alvo: 6–10 minutos de combate e exploração, a validar. Iniciar a próxima onda apenas após eliminar a atual, com intervalo de preparação sugerido de 15 segundos. Limite inicial de oito inimigos ativos simultaneamente, com reposição a partir da fila da onda. Volume da onda não significa todos presentes ao mesmo tempo.

Primeiro protótipo de comportamento: humanoide persegue e ataca a curta distância; criatura pequena pressiona em grupo; criatura grande faz uma investida sinalizada. São propostas, não decisões visuais/narrativas já aprovadas.

### 7.2 Drops garantidos e margem de segurança

| Fonte | Drop inicial | Total disponível |
| --- | --- | --- |
| Cada um dos 20 robôs | 1 ferro + 1 cobre | 20 ferro + 20 cobre |
| Cada um dos 8 animais pequenos | 1 matéria orgânica | 8 matéria orgânica |
| Cada um dos 2 animais grandes | 2 matérias orgânicas | 4 matérias orgânicas |
| Dois depósitos exploráveis | 2 ferro + 2 cobre por depósito | 4 ferro + 4 cobre extras |
| Seis esconderijos válidos no mapa | 1 placa de alumínio por esconderijo | 6 placas; 4 obrigatórias |

Disponibilidade total: 24 ferro, 24 cobre, 12 matérias orgânicas e 6 placas. A receita não depende de sorte: os drops do tutorial são determinísticos, persistem no chão até coleta/encerramento e aparecem em posições alcançáveis. Coletar tudo não é obrigatório, mas atingir o objetivo é. As placas podem ser encontradas antes da última onda.

Receita proposta para concluir a máquina de síntese de diamante: **20 ferro + 20 cobre + 4 placas de alumínio**. Para demonstrar a primeira produção, reservar **10 matérias orgânicas**, propostas como insumo processado em carbono para gerar **1 diamante sintético**. Essa conversão é uma regra fictícia de jogo, ainda dependente de aprovação narrativa da origem do carbono.

Objetivo de carga da introdução: 20 ferro, 20 cobre, 4 placas e 10 matérias orgânicas. Após craft e primeira produção, uma coleta completa deixaria 4 ferro, 4 cobre, 2 matérias orgânicas e 2 placas de sobra. Não consumir o mesmo recurso novamente ao instalar o objeto visual.

Proposta de bolsa inicial: 4 espaços para materiais, cada um com pilha de até 30 unidades de um tipo. Isso comporta toda a carga prevista. Munição tem reserva própria e minas/barreiras ficam no compartimento de dispositivos. A expansão da bolsa fará sentido com a introdução de novos materiais e expedições maiores.

### 7.3 Kit defensivo do tutorial

- 3 minas: ativam por proximidade de inimigos e causam dano em área. Proposta inicial: sem dano ao jogador no tutorial.
- 2 barreiras neon azul: bloqueiam inimigos, permitem tiros do jogador e duram até 20 segundos ou até perderem sua integridade. Vida, dano e alcance serão calibrados com a arma/inimigos.
- Preview de posicionamento; impedir instalação sobre entidades, saída da nave ou de forma a bloquear todas as rotas de acesso. Barreiras devem poder ser atacadas pelos inimigos, evitando bloqueio permanente da onda.
- Recomeçar a introdução repõe esse kit de teste. Não permitir converter gratuitamente o kit reabastecido em recursos persistentes.

### 7.4 Vitória, comunicação e extração

Estados propostos: briefing → combate → área limpa/coleta → extração → retorno ao hub → instalação no laboratório.

Após eliminar a terceira onda, exibir **SHANGHAI CLEAR — Hordas eliminadas.** Sinalizar a aeronave no mapa. Vitória de combate não confirma o loot: só a extração bem-sucedida o transfere ao hub, uma única vez por expedição.

Se faltarem placas, EDEN diz: “Parece que todos os inimigos da região foram eliminados. Não esqueça de buscar as placas de alumínio. Precisamos de quatro para terminar o equipamento do laboratório.”

Ao atingir quatro placas: “Essas mesmo. Temos o alumínio necessário.” Se a carga inteira estiver completa, acrescenta: “Leve os materiais até a nave.” Se faltarem outros recursos, informar exatamente quais, sem anunciar conclusão prematura.

Se as placas já tiverem sido coletadas antes do fim das hordas, usar fala que reconhece isso. Acompanhar quantidades na HUD. Na introdução, exigir a carga objetivo para decolar; a nave pode ser localizada/interagida antes, mas mostra os materiais faltantes. Não gerar novas hordas durante essa busca final. Em revisitas, não repetir a exigência/tutorial da máquina.

Derrota: eliminar loot temporário, drops, inimigos, dispositivos colocados e progresso das ondas; reiniciar a expedição do começo. Preservar progresso já consolidado no hub. Sem save no meio das hordas nesta versão. Resgate intermediário fica no roadmap de missões maiores.

### 7.5 Retorno e transformação de Marte

1. Depositar a carga e concluir o objetivo da primeira expedição.
2. No laboratório, consumir a receita uma única vez e instalar a grande máquina de síntese de diamante. Proposta visual: novo volume central, iluminação própria, conexões de energia e animação de funcionamento, mantendo corredores navegáveis.
3. Demonstrar a primeira produção de diamante, conforme a regra de carbono escolhida.
4. Mais adiante, diamante e componentes ainda a definir permitem fabricar a máquina de construção espacial.
5. Essa máquina e recursos, incluindo matéria orgânica, permitem construir a **estufa**, primeira unidade produtiva da sociedade.

A máquina do laboratório é a primeira grande mudança visual ao retornar. A estufa é a primeira construção produtiva subsequente; não assumir que ambas devem ser concluídas com o loot da mesma missão. Custos e número de expedições até a estufa ainda serão definidos. O benefício sugerido para ela é produzir insumos biológicos para a colônia, sujeito à escolha do autor.

Persistir máquina instalada, receitas consumidas e construções concluídas. Recarregar a página ou repetir a missão não pode duplicar máquinas, recompensas ou cobrar novamente a instalação já feita.

## 8. Revisitas e dificuldade adaptativa

Requisito do autor: o volume da horda acompanha a percepção do nível do personagem, mantendo desafio também em mapas iniciais. Cada mapa preserva suas categorias e sequência própria de inimigos.

Proposta técnica para o primeiro algoritmo:

- A primeira conclusão usa as três ondas fixas da seção 7, para ensinar e calibrar.
- Nas revisitas, estimar força por nível/progressão de combate e melhorias permanentes de arma/armadura. Bolsa maior ou expansão decorativa não elevam sozinhas a dificuldade.
- Fixar a avaliação na partida; não aumentar inimigos silenciosamente no meio da missão porque o jogador está indo bem.
- Para o protótipo, três faixas de volume: base (30), intermediária (36) e avançada (45 inimigos). Limiar de cada faixa depende dos atributos que ainda serão definidos. Distribuir acréscimos por onda/categoria em configuração do mapa, sem alterar o papel de cada inimigo.
- Manter o limite simultâneo inicial de oito; volume extra entra em lotes. Elevar esse teto somente após medição de desempenho e playtest.
- Evitar compensar toda melhoria com inimigos equivalentes: manter HP/dano base inicialmente para o jogador sentir suas armas mais fortes. O aumento proposto incide no volume, dentro de limites.
- Informar a faixa de ameaça no briefing; preservar recompensa coerente com inimigos adicionais. Rebalancear economia quando existirem custos posteriores.

“Competitiva” aqui expressa o desafio solicitado. Não implica multiplayer, ranking ou competição online já autorizados para o protótipo.

## 9. Próximo marco e critérios específicos de validação

Detalhar tarefas para: base local → estados de expedição → combate e ondas → inventários separados → minas/barreiras → extração → máquina visível no laboratório → revisitas adaptativas. A estufa integra a progressão seguinte, com receita e benefício a fechar.

- [ ] Tutorial sempre fornece recursos suficientes sem depender de RNG.
- [ ] Placas e depósitos são alcançáveis; loot não desaparece antes da extração.
- [ ] Coletar placas antecipadamente atualiza corretamente objetivos e falas.
- [ ] Hordas eliminadas sinalizam nave, mas não permitem ignorar a carga obrigatória da introdução.
- [ ] Derrota não deposita loot; retry restaura a missão sem entidades residuais.
- [ ] Munição e dispositivos não disputam espaço com os materiais.
- [ ] Minas e barreiras funcionam sem bloquear permanentemente navegação ou conclusão de ondas.
- [ ] Extração e fabricação são aplicadas uma única vez e persistem após reload.
- [ ] Máquina instalada altera o hub visualmente e preserva circulação/câmera.
- [ ] Revisita usa faixa de ameaça calculada na partida e não repete a obrigação da introdução.
- [ ] Tempo por frame e navegação permanecem aceitáveis no teto de inimigos escolhido; registrar dispositivo-alvo e medições antes de aumentar escala.

## Registro de implementação — 29/09/2026

Sprint 1 implementado: ver [relatório](sprint-1/RELATORIO.md). As referências de arquivos da auditoria acima descrevem o estado anterior; fontes MCP removidos do runtime estão preservados em `archive/mcp-office/`. O jogo atual possui EDEN local, deck físico e viagem de ida/volta a Shanghai, sem backend. Combate, loot e máquina ainda pertencem aos próximos sprints.
