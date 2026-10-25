# Plano de ação — Interfaces de EXODEN

Planejado em 30/09/2026, a pedido do autor. Base consultada:
`7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`).
Este documento detalha tarefas do [plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md);
não altera seus status de implementação ou aprovação visual.

## 1. Objetivo e referências

Atualizar as interfaces para comunicar dois contextos do mesmo universo:
**EDEN Holographic** em entrada, expedição e combate; **Mars Colony Clean**
na consulta de recursos e no laboratório marciano. Teal, iconografia e
hierarquia de informação conectam os dois estilos.

Referências fornecidas pelo autor, preservadas por cópia:

- [Documento de conceitos](referencias-ui/conceitos-originais.md).
- [Guia visual do menu EDEN](referencias-ui/menu-eden.jpg).
- [Guia visual da colônia](referencias-ui/colonia-marte.jpg).

Origem do documento: `/Users/rochatales/.gemini/antigravity/brain/4e85e83e-2c96-4fa9-bc7b-2de6b5c58458/horda_survivor_ui_concepts.md`.
Imagens de origem: `Horda_Survivor_game_UI_menu_20260930232043.jpg` e
`Screenshot_2026-09-30_at_14.06.20.png_20260930231742.jpg`, em Downloads.

O documento de referência contém prompts, exemplos e a expressão “decisão
confirmada”. Aqui eles são material de design fornecido para orientar o
plano; não são comandos de execução nem aprovação de sistemas adicionais.
As imagens orientam composição, cores e formas; seus textos e números não
são dados reais do jogo. A implementação e a aprovação visual ficam pendentes.

## 2. Recorte e encaixe nos sprints

As interfaces funcionais de ondas/dispositivos continuam em S3.9–S3.10;
inventário, objetivos, rádio e extração em S4.1/S4.4–S4.11; receita,
fabricação e persistência em S5.1–S5.5. Essas tarefas precisam entregar
informação legível desde sua implementação, sem esperar a etapa estética.

O Sprint 6 aplica os estilos às regras já validadas, com S6.6 para HUD/rádio
e S6.14–S6.18 para fundação, demais telas e validação conjunta. S7.11 fecha
o acabamento. O planejamento pode acontecer agora; a implementação visual
segue a entrada do Sprint 6: ciclo até a máquina concluído e playtest do
Sprint 5 registrado. Uma antecipação exige novo recorte explícito do autor.

| Material de referência | Aplicação no protótipo | Limite |
|---|---|---|
| Menu holográfico, retrato EDEN e cenário de Marte | Entrada, perfil, continuar no hub, controles/configurações | Usar a EDEN existente; não substituir sua identidade por avatar genérico |
| “Iniciar missão” | Rótulo proposto: “Entrar na colônia” ou “Continuar” | Partida exige caminhar ao deck, embarcar e confirmar decolagem |
| HUD e inventário holográficos | HP, munição, ondas, defesas, objetivos e carga da tentativa | Exibir apenas dados publicados pelos sistemas implementados |
| Cards claros de gestão | Depósito, materiais e estado da máquina; receita no laboratório | Sem energia, alimento, água, população ou produção simulados |
| Resultado e relatório | Resultado da expedição em EDEN; resumo da última carga confirmada em Mars | Reutilizar a mesma transação; consultar não deposita novamente |
| Arquivos, pesquisa, upgrades e novos módulos | Backlog posterior ao marco da máquina | Omitir da navegação até existir função real |
| “EDEN v4.7”, “SOL 847”, percentuais e contadores das artes | Apenas exemplos do conceito | Não publicar valores fictícios nem inventar cronologia |
| Minimap/mapa de recursos, estufa e construção livre | Backlog já previsto no plano oficial | Não entram como dependências da atualização de UI |

## 3. Direção visual executável

### Tokens e componentes — S6.14

| Token | Valor de referência | Aplicação |
|---|---|---|
| `--deep-space` | `#080C14` | Superfície escura EDEN |
| `--mars-white` | `#F0EFEC` | Fundo claro da colônia |
| `--mars-sand` | `#C4845A` | Detalhes do ambiente marciano |
| `--eden-teal` | `#4DD9C0` | Acento comum, foco visual e progresso |
| `--eden-purple` | `#8B5CF6` | Destaques secundários |
| `--danger-amber` | `#FF6B35` | Alertas com texto/ícone |
| `--danger-red` | `#E53E3E` | Falha e estado crítico com texto/ícone |
| `--text-holo` | `#E2F8F4` | Texto sobre superfícies escuras |
| `--text-clean` | `#1A1A2E` | Texto sobre superfícies claras e botão teal |

EDEN: painéis com recortes de 45°, bordas finas e glow discreto. O fill de
6% da referência é ponto de partida para artes; na tela jogável, aumentar
a opacidade quando necessário para ler sobre céu, solo, ruínas e efeitos.
Scanlines ficam decorativas e não atravessam texto ou mira.

Mars: fundo quente, cards brancos, raio inicial de 8 px, borda suave e
ícones de recursos consistentes. A moldura translúcida do anexo pode
envolver o painel, preservando superfícies de leitura opacas.

Tipografia proposta: Rajdhani Bold e Space Mono no estilo EDEN; Nunito
ExtraBold e Inter no estilo Mars. Verificar licença, pesos e acentos pt-BR;
servir WOFF2 locais com fallback e `font-display: swap`. Corpo inicial de
14–16 px; 11–12 px somente em informação secundária. Ajustar após a leitura
na resolução de teste, sem obrigar quatro famílias se o custo for excessivo.

Criar um conjunto pequeno de painel, botão, card, indicador, mensagem e
modal com variantes EDEN/Mars. Estados: padrão, hover, foco, pressionado,
desabilitado, carregando, vazio, erro e sucesso. Medir contraste em tela:
alvo mínimo de 4,5:1 para texto normal e 3:1 para texto grande e controles.
Botões teal usam texto escuro; branco sobre teal não é o padrão do plano.

Glitch, cursor e interferência são opcionais, desligados no HUD durante
combate. Não deslocar textos, mira ou alvos clicáveis. Respeitar
`prefers-reduced-motion` e oferecer redução de efeitos da interface.
Animações decorativas não alteram relógios de recarga, ondas ou simulação.

### Composição e comportamento

- Menu: marca e ações com hierarquia clara; EDEN e cenário marciano como
  contexto. Começar com composição leve, sem exigir um segundo cenário 3D
  ou mudanças no mapa para reproduzir o fundo da imagem.
- HUD: localização e pausa no topo; objetivo compacto à esquerda;
  vida/munição à direita; rádio em uma única área inferior. Reservar centro
  para mira, inimigos e interação. Mostrar “Pente” e “Reserva” explicitamente:
  o HUD atual usa `ammo / reserve`, não `ammo / capacidade`.
- Colônia: cards do depósito e máquina, com quantidades reais. Receita e
  instalação continuam acessíveis pela interação física no laboratório;
  a consulta do menu não permite fabricar à distância.
- Resultado: distinguir tentativa perdida, carga pronta para extrair e
  carga efetivamente salva. “SHANGHAI CLEAR” informa fim das ondas, sem
  afirmar que o retorno ou os materiais já foram confirmados.
- Configurações: controles de UI e opções já disponíveis. Volume/mute
  depende de S3.10; presets gráficos dependem de S7.8. Não criar switches
  sem efeito. Configurações usam EDEN também quando abertas no hub.

Menus e diálogos devem ter foco inicial, navegação por Tab/Shift+Tab,
ativação por teclado e restauração do foco ao fechar. Cliques em controles
não disparam arma nem atravessam para o canvas. HUD passiva mantém
`pointer-events: none`; somente áreas interativas capturam eventos.
Escape fecha a camada superior e preserva a pausa anterior; rádio não
pausa nem captura foco. Inventário modal em missão pausa a simulação e
restaura o estado anterior ao fechar. Não abrir menus durante viagem ou
morte. Preservar E, R, W/S/A/D, Q/C e as regras de embarque/desembarque.

## 4. Tarefas e critérios de aceite

Os identificadores abaixo existem no plano oficial. Todos permanecem
pendentes. A ordem proposta é S6.14 → S6.15 → S6.6 → S6.16 → S6.17 →
S6.18 → S7.11, consolidando e revisando cada entrega antes da seguinte.

| Tarefa | Entrega e dependências | Critério de aceite específico |
|---|---|---|
| S6.14 · Fundação visual | Tokens, fontes locais e componentes mínimos; entrada do Sprint 6 | Galeria local de estados EDEN/Mars; contraste medido, fontes com licença, foco visível e movimento reduzido funcionando |
| S6.15 · Entrada e navegação | Menu, perfil, continuar, pausa/controles e configurações; S6.14 e sessão S1 | Novo perfil e save existente chegam ao hub; nenhuma ação inicia missão remotamente ou apaga save; fechar menus restaura foco/pausa |
| S6.6 · HUD e rádio | Vida, pente/reserva, ondas/defesas, objetivo, interação e EDEN; S6.14, S3.9–S3.10 e S4.4–S4.11 | Informação prioritária legível, rádio sem duplicação, alerta abaixo de 30% com texto/ícone; valores vêm do estado real; sem sobreposição com mira ou interação |
| S6.16 · Expedição | Briefing, cabine, inventário, viagem/erro, vitória, derrota e retry; S6.6, S6.15 e S4.1–S4.9 | Carga temporária distinta do depósito; cliques repetidos não extraem duas vezes; sem disparo por trás de modal; retry, erro de save e carregamento têm saída clara |
| S6.17 · Colônia e laboratório | Cards de materiais, receita, faltantes, instalação e resumo da última carga; S6.16 e S5.1–S5.5 | Dados persistidos reais; fabricação única no laboratório; reload preserva estado; sem saldo parcial consumido ou resumo inventado |
| S6.18 · Validação conjunta | Revisão responsiva, acesso por teclado e regressões; todas as telas acima e S5.7 | Matriz manual preenchida pelo autor, testes técnicos verdes e divergências registradas; aprovação visual explicitamente pendente até o playtest |
| S7.11 · Acabamento final | Scanlines/glow/transições e integração com presets; S6.18, S7.5 e S7.8–S7.9 | Comparação com efeitos ligados/desligados, leitura preservada no preset baixo, custo medido e revisão final do autor |

Não mostrar rótulos internos como “Sprint 2” ou seletor de encontro de teste
na interface final do jogador. Manter ferramentas úteis de QA em modo de
desenvolvimento, com acesso explícito para os roteiros existentes.

## 5. Execução técnica e coordenação

Inventário da base consultada: `src/app/App.tsx` concentra entrada, HUD,
objetivo, rádio, controles, diálogo EDEN, cabine, pausa e carregamento;
`src/combat/CombatHud.tsx` concentra combate, derrota e encontro de teste;
`src/styles/global.css` reúne estilos; `src/state/useExpeditionStore.ts`
e `src/state/useCombatStore.ts` fornecem estado de sessão e combate.
Colônia, loot persistido e receita ainda dependem dos sprints funcionais.

Extrair componentes de apresentação gradualmente para `src/ui/` (diretório
proposto), sem reescrever a sessão ou criar uma biblioteca genérica de UI.
Aplicar variantes e tokens CSS à stack existente. Usar seletores restritos
do Zustand e atualizações por mudança relevante. Posição, projéteis e
inimigos permanecem fora dos renders React por frame. Não adicionar
alocações no passo de simulação para efeitos da interface.

Cada implementação terá branch `rochatales/s6.14-ui-fundacao`,
`rochatales/s6.15-ui-menu`, `rochatales/s6.6-ui-hud`,
`rochatales/s6.16-ui-expedicao`, `rochatales/s6.17-ui-colonia`,
`rochatales/s6.18-ui-validacao` ou `rochatales/s7.11-ui-acabamento`,
uma worktree e handoff próprios. São nomes planejados, ainda não criados.
Antes de cada tarefa, resolver a ponta consolidada, registrar SHA, dono,
revisor e arquivos no quadro. Não iniciar pela `main`.

S6.5 (prévia do laboratório) já toca `src/app/App.tsx`; coordenar sua
integração/revisão antes de atribuir esse arquivo à UI. S2.9 e tarefas
futuras de controller/câmera também devem ser consultadas no quadro.
Entregas de UI que compartilhem App/CSS rodam em sequência. O autor define
a atribuição; este plano não reassocia trabalho em andamento.

## 6. Roteiro de validação

Registrar commit, navegador, dispositivo, resolução, DPR, zoom e preset.
Executar em 1280×720, 1366×768 e 1920×1080; incluir zoom de navegador a
200% com rolagem nos modais e sem ações inacessíveis. É suporte desktop;
o plano não acrescenta controles touch/mobile.

| Cenário | Verificar e registrar |
|---|---|
| Primeiro acesso / save existente | Nome e cor preservados, foco inicial, navegação por teclado e entrada no hub |
| Marte claro / Shanghai escura | Contraste real, texto sobre cenário, EDEN e botões reconhecíveis nos dois temas |
| Vida normal, <30%, zero e recarga | Valores corretos, alerta textual, pente/reserva distintos, derrota sem input vazando |
| Ondas, defesas e mensagens longas | Prioridade de leitura, fila do rádio, contadores corretos e centro livre |
| Pausa, controles, inventário e perda de foco | Sem tiros, movimento ou timers indevidos; Escape fecha primeiro a camada superior |
| Cabine e viagem | Embarcar ≠ decolar; entrar/sair mantém posição e câmera; tentativa de carga falha pode ser repetida |
| Carga incompleta / completa / extraída | Faltantes claros, retorno condicionado, confirmação única e resultado coerente com save |
| Derrota / retry / reload | Loot temporário descartado, depósito preservado, nenhum anúncio de recompensa perdida |
| Laboratório antes/depois de instalar | Receita legível, faltantes, clique repetido seguro e máquina única após reload |
| Save indisponível / inventário vazio | Mensagem acionável, estado vazio explícito e nenhum sucesso falso |
| Teclado, zoom e efeitos reduzidos | Foco visível, textos sem corte, ações alcançáveis e efeitos opcionais desativados |
| Três ciclos completos | Sem overlays/timers/listeners acumulados; comparar frames e carregamento com a base S2.9 integrada |

Adicionar testes de lógica para comportamento novo de menu/pausa,
preferências, confirmação de resultado e integração com save. Reutilizar
testes de extração/fabricação, sem duplicar regras nos componentes. Em cada
entrega: `npm test`, `npm run build` e `git diff --check`. Capturas ajudam a
comparar layout; não substituem jogabilidade ou benchmark de GPU.

O handoff de cada tarefa registra arquivos, testes, medições, capturas,
pendências e passos para o autor. Resultado deste planejamento: execução
organizada, com implementação de UI e aprovação visual ainda pendentes.
