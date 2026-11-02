# Colônia expansível — Setores, níveis de detalhe, residentes e Sandwind

Data: 26/10/2026. Pedido do autor: mapear o crescimento da colônia pelo Builder e por NPCs; reduzir o trabalho distante e usar vento/areia para esconder a transição de visibilidade. O autor escolheu **plano + protótipo visual no jogo**.

Base histórica da prévia original: `bb5014d379c30d581eadbe39e763aba5918ea5dd`, ponta consolidada de `rochatales/horda-survivor` resolvida conforme `docs/SPRINT_STATUS.md`. Branch de trabalho: `rochatales/s6.19c-colony-sandwind`. Não inclui alterações locais não commitadas da integração, nem as prévias separadas de masterplan v007, estufa e hangar.

Este documento detalha **S6.19c**, **S7.8** e **S7.10**, usando a instrumentação da **S2.9**. Não cria outra numeração de sprint, não marca itens como concluídos e não antecipa a implementação completa do Builder ou dos colonos do backlog, item 14.9. Aprovação visual e de jogabilidade é do autor.


## Porte v007 — decisão do autor, 26/10/2026

Base atual desta entrega: `5f1ee7fbdb0a09d735c5e7159b8a042b18f81f15`, branch `rochatales/s6.19c-sandwind-v007`. Os arquivos de 6a85445 foram portados por conteúdo e adaptados. **Não houve merge da branch antiga.** O mapa utilizado agora é o v007 com Hangar v002, estufa, DeckProps e ARES.

O autor aprovou o conceito de névoa delimitando a visibilidade em Marte e a cor quente **#b4927a**, igual à cor do horizonte. Shanghai continua sem efeito e terá entrega própria. Builder, setores, LODs, streaming e residentes deste plano continuam fora do porte.

### Uma autoridade para cada propriedade

**Escolha: pais exclusivos de descarte.** A prévia cria `SandwindDistance_<id>` com transform identidade. Cada módulo recebe um pai completo; Hangar, estufa, DeckProps e conjunto deck/nave ARES têm pais próprios. Os runtimes continuam escrevendo `visible`, opacidade, transparência, emissivo, luzes e animação nos seus filhos. Somente Sandwind escreve `visible` nos seus pais. O resultado visual é a composição das duas hierarquias, sem alternância de escritores por quadro.

- Masterplan: agrupar por `ambiente` e apoio do manifesto, incluindo paredes, teto, portas, mobiliário e equipamentos associados. IDs estáveis `id_estavel`, sem depender de nomes saneados pelo loader. Pisos globais e passarelas caminháveis permanecem fora dos gates.
- Hangar: envolver a cena inteira, incluindo teto, folhas, casco, contorno preto, guindaste e ponte do piso. A caixa inclui as áreas de acesso/ponte do manifesto e um envelope conservador de 1 m para peças móveis.
- Estufa: a caixa considera todas as peças, inclusive as inicialmente ocultas do estado ONLINE. Alternar estado ou fade não muda o grupo nem reinicia o descarte.
- DeckProps: Console Oeste, Console Leste, rack, tanques e carros permanecem num grupo completo. O colisor do Console Oeste continua no mundo físico, sem consulta à névoa.
- ARES: deck e nave compõem um grupo; boarding, disembark, pontos de interação e colisores são preservados. O grupo é sempre mantido próximo ao jogador, pela distância à borda da caixa inteira.

O cálculo continua radial em XZ, pela borda mais próxima da caixa mundial completa, com as margens e perfis anteriores. O centro usa a posição do jogador, independente da distância artificial da câmera ortográfica. Não se altera `CameraRig`, controles, física nem navegação.

### Materiais finais e cache

Instalar o efeito em `useEffect`, após todos os layout effects dos runtimes. Percorrer somente o escopo visual de Marte: v007, Hangar, estufa, DeckProps e ARES. Jogador e EDEN ficam fora desse escopo e preservam sua leitura.

Para reconhecer os materiais ainda compartilhados, consultar **as mesmas chaves `useGLTF` de seus componentes**: chamadas individuais para colônia, Hangar, estufa e v006/DeckProps; o par `[shipUrl, deckUrl]` para AresLanding. Uma chamada única com seis URLs criaria outra chave de cache e não serviria para comparar identidade.

- Clonar apenas materiais que ainda são os mesmos objetos dos caches fonte; as texturas/geometrias continuam compartilhadas.
- Materiais já privados dos runtimes recebem o callback diretamente, preservando suas referências de fade, ONLINE/OFFLINE e AlertPulse.
- Encadear o `onBeforeCompile` anterior e a chave anterior de programa. Um conjunto de uniforms compartilhado por controlador; nenhuma reconstrução por quadro.
- Não alterar opacidade, emissivo, transparência, depthWrite ou cor-base para produzir a areia. O shader mistura a cor final com o horizonte, depois do gerenciamento de cor do three r165.
- Ao desmontar: remover os pais próprios, restaurar pais/ordem, referências e callbacks, e liberar somente clones criados pelo Sandwind. Os runtimes continuam donos dos seus materiais privados. A restauração suporta também o cleanup de layout dos runtimes antes do efeito passivo.

### Flag e verificação

Sem `?sandwindPreview`, a árvore visual original é retornada e o módulo Sandwind não é carregado. Com a flag, o painel aparece apenas quando a sessão e o mundo são Marte. Na viagem, desmontar o controlador; em Shanghai não instalar shader, pais ou painel.

O porte acrescenta testes com os GLBs e runtimes reais para agrupamento, continuidade de fade, materiais finais, callback preexistente, caixa completa, pisos/passarelas e três ciclos de montagem/desmontagem sem acumular clones/patches. São complementados por três viagens reais no build de produção, capturas praça/deck nos três perfis e amostras `?perf`: sem flag, areia sem descarte, areia com descarte. O relatório corrente é o [handoff v007](../handoffs/s6.19c-sandwind-v007.md). Não equivalem à aprovação manual de jogabilidade.

## Decisão arquitetônica

Manter fontes por asset e uma montagem mestre da colônia. O runtime deve evoluir para composição modular por dados, com o mesmo modelo reutilizado em várias construções. Uma nova construção não exige reexportar o mundo inteiro.

Separar quatro problemas:

| Camada | Redução buscada | Mecanismo |
|---|---|---|
| Geometria e desenho | Triângulos, chamadas e pixels processados | Frustum culling, LODs autorados, interiores inativos, grupos por setor/material |
| Recursos residentes | Memória e carregamento | Assets compartilhados, carregamento antecipado, cache limitado, descarte com controle de propriedade |
| Simulação | CPU de NPCs, física e navegação | Agendamento por região, decisões escalonadas e simulação agregada distante |
| Apresentação | Transições discretas e atmosfera | Sandwind radial, cor do horizonte, movimento de poeira moderado e histerese |

**Areia não substitui culling.** Misturar a cor de um fragmento com a areia não elimina o envio da malha nem a execução do shader. **Ocultar uma malha não descarrega seu GLB.** **Instanciar não elimina os triângulos de cada cópia.** As quatro camadas precisam de contadores distintos.

## Estado observado na prévia v006 (histórico)

| Arquivo | Comportamento relevante | Consequência para a evolução |
|---|---|---|
| `src/scene/marsColony/MarsColony.tsx` | Carrega `colony-v006.glb`, clona a cena, aplica layout e controla corte | Preservar identidade das peças; migrar gradualmente, sem substituir fontes |
| `src/scene/marsColony/visibility.ts` | Corte por grupos de parede/portal/teto; materiais privados e seguidores | O descarte distante não pode quebrar sincronização, opacidade e referências das folhas |
| `src/scene/OfficeScene.tsx` | Névoa nativa de Marte entre profundidades 130 e 270 | Já existe atmosfera; a prévia substitui sua aplicação apenas enquanto a areia radial está ligada |
| `src/scene/CameraRig.tsx` | Câmera ortográfica, zoom, rotação Q/C e recuo ×3 em Marte | Distância da câmera não representa importância visual; usar posição no chão, tamanho projetado e enquadramento |
| `src/scene/cameraFraming.ts` | Enquadramento do hub depende de seus limites | Expansão física não deve afastar automaticamente toda a câmera; prever enquadramento jogável desacoplado |
| `src/game/marsWorld.ts` e mundo compartilhado | Colisores simples e áreas caminháveis independentes do GLB | Ocultar visual não altera imediatamente colisão, portas, interação ou rotas |
| `src/dev/perf/` | `?perf`, chamadas, triângulos, contagens de recursos e intervalos rAF | Instrumentação existente serve de baseline; rAF não é tempo de GPU e contagens não são bytes de VRAM |
| Plano oficial, seção 14 | Construção livre e residentes dinâmicos pertencem à evolução posterior | Nesta entrega: contratos e etapas; sem produção/população fictícias na UI do jogo |

## Catálogo e save do Builder

Modelo de dados proposto; ainda não implementado:

- **Definição de prédio:** identificador estável, revisão, referências de exterior/interior/LODs, materiais, limites locais, pontos de encaixe, volumes simples de colisão, acessos e custo estimado.
- **Instância construída:** identificador único, tipo, posição, rotação, nível e estado funcional. Não duplicar bytes do GLB nem salvar objetos Three.js no save.
- **Registro espacial:** setores atravessados pelo volume do prédio e setor proprietário. Um prédio na borda não pode desaparecer pela distância ao centro de um único setor.
- **Estado persistente:** construção, inventário e atividade independentes de a malha estar montada. Nenhuma recompensa, produção ou despesa é repetida ao carregar um setor.
- **Transação de construção:** validar terreno, reserva de passagem e colisores; preparar recursos; confirmar custo e construção uma única vez. Enquanto recursos visuais chegam, usar representação provisória coerente e impedir entrada em chão não preparado.
- **Versionamento:** integrar à evolução do save existente, com migração explícita. Nunca apagar progresso para aceitar um novo catálogo.

## Contrato dos assets

Produção modular com materiais compartilháveis; nenhuma obrigação de juntar o prédio inteiro numa malha. Agrupar somente peças com mesmo material e comportamento de visibilidade, animação e sombra.

| Grupo | Regra |
|---|---|
| Piso e estrutura fixa | Grupos estáticos por prédio/setor; chão próximo continua disponível |
| Paredes | Separar por direção; base, topo e tampa de seção conforme S6.19 |
| Teto e equipamentos presos | Mesmo grupo lógico de corte; identidade preservada no manifesto |
| Portais e folhas | Preservar contrato de corte/animação; a mudança visual da S6.19a deve ser coordenada, sem reescrever esse contrato nesta prévia |
| Interior | Conjunto independente, ativável somente quando efetivamente necessário à câmera ou à interação |
| Máquinas-chave | Asset independente, com estado e identidade; alvo até 3.000 triângulos após triangulação |
| Vidro e efeitos | Materiais separados e uso comedido de transparência; não depender de milhares de partículas |
| Props repetidos | Instâncias por modelo/material e região; grupos gigantes atravessando o mapa prejudicam o descarte espacial |

Orçamentos iniciais sugeridos para os sete prédios completos (exterior + interior + móveis): Control Room e Laboratório 10–12 mil triângulos cada; Alojamento, Data Center e War Room 8–10 mil cada; Arsenal 6–8 mil; Food Storage 5–7 mil. Máquina de síntese separada, até 3 mil. Não são orçamento de toda a cena, nem garantia de 60 FPS.

Para cada prédio, autorar representações coerentes com a câmera real:

- **Completa:** interior relevante, exterior e peças funcionais. Não somar interiores invisíveis por padrão.
- **Exterior simplificado:** preservar porta, telhado, grandes equipamentos e silhueta; remover decoração pequena. Começar com alvo de 30–50% da geometria da versão completa, medindo a qualidade.
- **Silhueta distante:** volumes principais e poucos materiais, alvo inicial de 5–15% da geometria completa; ajustar para marcos visuais.
- **Oculta:** zero desenho desse prédio; dados persistem. Isso só autoriza liberar memória quando nenhuma outra instância usa os mesmos recursos.

Essas proporções são pontos de partida para arte, não redução automática por distância. Na câmera ortográfica, um objeto distante pode ocupar tantos pixels quanto um próximo; o LOD deve considerar tamanho projetado, zoom e legibilidade.

## Setores e estados de atividade

Começar a avaliação com células de **20 × 20 m**, parametrizáveis. A dimensão não é um limite de construção. O registro armazena AABBs e relações dos objetos que atravessam fronteiras; atualiza somente ao construir, mover, destruir ou trocar um asset.

Separar os eixos de estado:

| Eixo | Estados propostos | Observação |
|---|---|---|
| Visual | Completo / exterior / silhueta / oculto | Decide pelo conjunto câmera + jogador + margens + disponibilidade do asset |
| Recursos | Não solicitado / carregando / pronto / cache / liberável | Invisível pode continuar residente para evitar recarregamento repetido |
| Simulação | Detalhada / reduzida / agregada | Não depende somente de estar ou não na tela |
| Física | Próxima preparada / distante sem dinâmica | Colisores do caminho precisam existir antes de o jogador chegar |

Primeira implantação: indexação e avaliações baratas em 5 Hz, com buffers pré-alocados. Interpolar parâmetros visuais sem reconstruir arrays/objetos por quadro. Estado frequente fora de renders React; publicar na UI apenas mudanças relevantes ou resumos com baixa frequência.

Não usar um único booleano para todos esses eixos. Um NPC fora da tela pode estar perto do jogador e continuar fisicamente relevante. Um prédio oculto pela areia pode continuar produzindo e sendo usado por NPCs agregados.

## Distâncias, areia e segurança das transições

Para o protótipo, medir **distância horizontal à borda mais próxima da caixa do objeto**, em relação ao jogador. A posição central acompanha o jogador continuamente, mesmo quando o descarte é avaliado em 5 Hz. A câmera gira livremente sem arrastar uma parede de poeira pelo centro da ação.

| Perfil experimental | Sem areia até | Cor totalmente coberta a partir de | Ocultar além de | Revelar novamente até |
|---|---:|---:|---:|---:|
| Compacto | 12 m | 28 m | 34 m | 30 m |
| Equilibrado | 22 m | 42 m | 48 m | 44 m |
| Amplo | 36 m | 62 m | 68 m | 64 m |

Histerese: aproximando-se de um objeto oculto, restaurá-lo antes de ele sair da cobertura opaca; afastando-se, mantê-lo por uma margem depois da opacidade completa. A diferença reduz oscilações e protege contra o intervalo entre avaliações. Os valores exigem comparação em movimento na câmera real; a futura política deve calcular margem de antecipação usando velocidade máxima, latência de carregamento, extensão do objeto e zoom.

**Limites de segurança:** não alterar colisão nem alcance de interação ao trocar visibilidade; preservar jogador, acesso atual, portal de passagem, objeto interagido, embarque/desembarque e chão caminhável. Objetos obrigatórios devem continuar sinalizados. Se um asset essencial não estiver pronto, manter o estado anterior ou um substituto seguro, sem revelar um buraco no chão.

Para zoom panorâmico: não habilitar todos os interiores. Usar exteriores/silhuetas e ajustar o alcance para mostrar a área de gestão definida pelo autor. Um overview de Builder pode ter política própria e sempre deve mostrar ocupação, encaixes e áreas de construção. A névoa estética não equivale a fog of war nem a área não explorada.

## Direção visual do Sandwind

- Horizonte na mesma cor da areia opaca, com tons quentes e dessaturados, sem lavar os interiores próximos.
- Faixa clara preserva personagem, portas e interfaces diegéticas; densidade aumenta suavemente no plano da colônia.
- Movimento amplo de rajadas, lento, com direção consistente; evitar cortina sólida acompanhando cada giro Q/C.
- Primeira versão usa matemática no shader dos materiais existentes. Não adiciona partículas nem passe de pós-processamento. Há custo adicional por fragmento mesmo assim.
- Evolução possível: poucas faixas de poeira próximas ao solo ou um conjunto limitado de partículas, somente após medir overdraw e qualidade no preset baixo.
- Pausa congela o tempo do vento; redução de movimento desliga sua animação por padrão. A cobertura estática necessária para esconder o corte permanece disponível.
- Configurações de qualidade devem mudar em conjunto alcance/culling/cobertura. Nunca desligar somente a areia e deixar objetos sumindo em área transparente.
- Escopo inicial: Marte. Shanghai mantém seus próprios contratos de combate, tiros, loot e orientação; não aplicar globalmente sem uma entrega própria vinculada aos itens existentes.

## NPCs e atividade distante — contrato futuro

Não usar instancing estático comum como solução automática para humanoides com esqueletos e animações independentes. Compartilhar malhas/texturas/rigs compatíveis ajuda na memória; animação, navegação e decisões continuam tendo custo.

| Região | Representação e atividade propostas |
|---|---|
| Próxima e relevante | Modelo e animação completos, movimento local, interação e física necessária |
| Próxima fora da tela | Suspender desenho/animação visual quando possível; manter movimento/colisão relevantes |
| Intermediária | Decisões e trajetos em frequência reduzida, horários e destino persistentes |
| Distante | Agregar trabalho/consumo por intervalos do relógio de jogo; sem esqueleto, corpo dinâmico ou busca de caminho por quadro |

Definir orçamento de NPCs detalhados por perfil após medir. Moradores persistentes não precisam ter todos uma representação detalhada simultânea, mas a seleção deve ser estável: não fazer um NPC sumir na frente do jogador ao entrar outro no limite. Ao voltar à região, reconstruir uma posição válida consistente com atividade, relógio e navegação. Pausa e mapas descarregados não podem gerar produção em dobro. Progresso offline real não está implicitamente autorizado por este plano.

## Streaming, cache e compactação de arquivos

Descarte visual, redução de detalhe e compressão de bytes são mecanismos diferentes. A evolução proposta:

- Catálogo por tipo de asset, referências compartilhadas e contagem de usuários. Várias instâncias não duplicam o download do mesmo GLB por construção.
- Antecipar os setores vizinhos antes de serem necessários; priorizar chão, colisores e passagem, depois exterior e por último decoração.
- Cancelar ou ignorar conclusões antigas ao trocar de mapa, sem anexar peças de outra sessão.
- Limitar cache por estimativas de recursos residentes e recência; manter uma margem para retorno ao setor anterior.
- Liberar geometrias, materiais, texturas e esqueletos somente quando forem propriedade exclusiva ou não tiverem usuários. Remover da cena não chama `dispose()` automaticamente.
- Avaliar compressão de geometria/texturas prevista na etapa de assets, na stack atual, com loader/decoder testados. Não introduzir dependência ou upgrade apenas por este documento.
- Registrar bytes transferidos, tempo de decode/upload e contagens de recursos separadamente. GLB pequeno em disco não prova uso pequeno de VRAM.

## Mapa de implementação no plano oficial

| Item existente | Entrega proposta | Dependência e limite |
|---|---|---|
| **S2.9** | Baseline e contadores complementares de peças/setores ativos e trabalho de simulação | Medição separada de aprovação de gameplay; sem fingir tempo de GPU |
| **S6.19c** | Esta prévia radial de Sandwind + descarte distante na arquitetura atual | Prova antecipada e isolada; não conclui a atmosfera nem substitui a S6.19a/b |
| **S6.12 / S6.19c** | Catálogo de exterior/interior e manifesto espacial dos módulos | Coordenar com masterplan v007, estufa e hangar antes de portar; fontes preservadas |
| **S7.8** | Presets, sombras locais, alcance coerente, redução de movimento e LODs autorados | Só ampliar o volume após comparação na câmera real |
| **S7.10** | Orçamentos medidos por asset/cena e carregamento sob demanda | Cache/streaming com testes de ciclo de vida e memória |
| **Backlog, seção 14** | Builder persistente, residentes e agendamento por atividade | Fora da implementação deste protótipo; numeração nova somente no plano oficial pelo autor |

Ordem recomendada: medir colônia atual → revisar a prévia → validar contrato de um módulo piloto → migrar composição para catálogo/setores → implantar streaming/cache → integrar Builder → testar residentes progressivos. Cada etapa mantém uma comparação com a anterior; não trocar todos os modelos e a política de renderização numa única entrega.

## Prévia original v006 (histórico de 6a85445)

Ativação explícita por `?sandwindPreview`, somente em Marte. Módulo de efeito e painel carregados sob demanda. Sem a flag, o jogo conserva o caminho anterior. Para um baseline de desempenho, abrir sem a flag: desligar o checkbox restaura a aparência, mas mantém os callbacks de shader instalados com intensidade zero até desmontar a prévia.

- Shader de areia radial aplicado aos materiais da arquitetura e às malhas geradas do mundo, com cor de horizonte e movimento procedural de rajadas.
- Culling real (`visible=false`) das peças estáticas do GLB além da cobertura opaca, distância pela AABB mundial e histerese. Peças previamente retiradas do layout não são reativadas. O terreno principal permanece desenhado.
- Painel para comparar areia, descarte e movimento, com três perfis e contagem das peças/triângulos retirados. Essa contagem não é a leitura de triângulos efetivamente desenhados; usar `?perf` para observar o renderer.
- Preservação dos materiais privados do corte e das folhas animadas. Materiais não privados do GLTF são clonados, sem editar o cache ou o GLB fonte. Desmontagem restaura visibilidade, callbacks e referências e libera somente os clones do efeito.
- Avaliação do culling em 5 Hz; posição de centro por uniform compartilhado sem reconstrução por quadro.

**Não implementado:** LODs autorados, proxy de cada prédio, descarte por setor completo, liberação do GLB distante, Builder, população e simulação agregada. Os personagens ativos atuais e seus materiais não recebem o shader de arquitetura nesta prévia; a cobertura de personagens/efeitos precisa integrar a entrega de residentes. O sistema de corte continua calculando seus grupos mesmo quando peças estão visualmente distantes; agendamento desse custo pertence à próxima etapa. A economia demonstrada aqui é de desenho de peças estáticas, não de toda a simulação.

## Validação e critérios de avanço

Automatizado nesta entrega: flag, distâncias pela borda, histerese, fronteiras sob cobertura, descarte/revelação, retorno A/B, respeito a peças já ocultas, terreno preservado, cache GLTF, referências dos materiais de corte, restauração/dispose e pausa do vento. Executar `npm test`, `npm run build` e `git diff --check`.

Roteiro manual do autor:

1. Abrir a prévia e comparar os três perfis parado no mesmo local. A região próxima deve continuar legível; escolher alcance adequado à arte.
2. Com areia ligada, alternar descarte e comparar a imagem. Nada perceptível deve aparecer/desaparecer fora da cobertura. Conferir separadamente as contagens em `?perf`.
3. Desligar areia: a prévia deve desativar descarte, restaurar arquitetura e retornar à névoa anterior.
4. Caminhar da região da EDEN ao deck e retornar, girando Q/C em vários pontos. Verificar portas, mira, colisão, embarque, telhados, fachadas e sinais obrigatórios.
5. Aproximar/afastar o zoom; procurar transições em torres, objetos altos e grandes módulos que atravessam limites.
6. Pausar/despausar; ligar/desligar vento; repetir com redução de movimento. Cobertura estática continua coerente.
7. Viajar para Shanghai e retornar pelo menos três vezes, conferindo que o efeito existe só em Marte e que não cresce a contagem de programas/recursos sem estabilização. Verificar erros de shader no navegador.
8. Avaliar a arte do vento: as rajadas são um estudo procedural, não o acabamento final de poeira volumétrica.

Para a etapa de escala, preparar cenários sintéticos reproduzíveis de **10, 25 e 50 prédios**, combinados a **0, 10, 25 e 50 NPCs ativos**, mais população agregada independente. São cargas de teste, não promessas de capacidade. Acrescentar medição de montagem/desmontagem ao construir repetidamente, reload do save, chegada rápida a um setor e troca de mapa durante carregamento.

Registrar equipamento, navegador, resolução/DPR, build, câmera, trajetória, período e seed. Comparar: baseline; areia sem descarte; areia com descarte; etapas futuras de LOD/streaming/NPC. Repetir amostras após aquecer shaders; comparar contagens e intervalos p50/p95 sem inferir GPU a partir de rAF. Meta oficial provisória continua 60 FPS no equipamento de referência, sem certificação nesta entrega. Preset baixo precisa preservar leitura e jogabilidade.

## Referências técnicas

- [Three.js — otimização de muitos objetos](https://threejs.org/manual/pages/optimize-lots-of-objects.html): desenho e agrupamento de geometria.
- [Three.js — névoa](https://threejs.org/manual/pages/fog.html): apresentação da névoa.
- [Shader de névoa do three r165](https://github.com/mrdoob/three.js/blob/r165/src/renderers/shaders/ShaderChunk/fog_fragment.glsl.js): mistura de cor por fragmento; o descarte é responsabilidade separada.
- [Three.js — liberação de recursos](https://threejs.org/manual/pages/how-to-dispose-of-objects.html): remover um objeto não libera automaticamente geometria/material/textura.

As páginas atuais podem incluir APIs posteriores; a implementação desta prévia usa a stack instalada do projeto e o contrato de shaders r165. Não depende de WebGPU, névoa volumétrica recente ou upgrade de stack.
