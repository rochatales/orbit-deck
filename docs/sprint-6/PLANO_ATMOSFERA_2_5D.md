# Plano de ação — Atmosfera 2,5D de Diorama Ilustrado e Estilo Metal Slug (S6.19)

Planejado em 18/10/2026, a pedido do autor. Base consultada:
`ec845e7` (`rochatales/horda-survivor`) e rascunho inicial `47f3eff`
(`claude/plano-s6.19-atmosfera`). Este documento detalha a tarefa **S6.19** do
[plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md); não altera o
status de implementação dos sprints funcionais nem substitui a aprovação visual
do autor.

---

## 1. Objetivo, referências e sala-piloto

Transformar a apresentação do mapa — hoje percebida como blocos 3D de iluminação
uniforme — em uma **estética 2,5D de diorama isométrico ilustrado com densidade
industrial estilo *Metal Slug***, mantendo a navegação 3D, a câmera ortográfica
com rotação `Q/C`, o movimento pela mira (`W/S`) e a leitura limpa de combate.

Referências fornecidas pelo autor em 18/10/2026, preservadas em
`docs/sprint-6/referencias-atmosfera/`:

- [Corte isométrico da Sala da EDEN](referencias-atmosfera/sala-eden-corte-isometrico.webp) —
  demonstra o corte de seção das paredes frontais com remate escuro (*poché*),
  paredes de fundo em altura total com janelas para Marte e tubulações, anéis
  duplos ciano de `2.7m`, holograma diegético e densidade técnica periférica.
- [Laboratório e Máquina de Síntese de Diamante](referencias-atmosfera/laboratorio-maquina-colonos.webp) —
  demonstra o contraste entre o piso/paredes em cinza-ardósia industrial, as
  faixas zebradas de segurança, o contorno de tinta (*ink lineart*) e o brilho
  quente/ciano da máquina central.

**Decisão do autor para o protótipo visual (*Vertical Slice*):**

1. **Sala-piloto inicial (`S6.19a`):** **Sala da EDEN (Ala Norte)** — valida o
   corte direcional 2,5D, as janelas inclinadas com vista para Marte, o piso
   modular chanfrado com faixas zebradas, os racks/tubos de parede, o contorno
   ilustrado e o anel duplo ciano `2.7m` + holograma da EDEN.
2. **Segunda etapa (`S6.19b`):** **Laboratório** — aplica o kit validado ao
   palco da Máquina de Síntese de Diamante (em coordenação com S5.3 e S6.5).
3. **Terceira etapa (`S6.19c`):** **Demais módulos e exterior de Marte** —
   expande para o hub, corredores, deck e terreno marciano após aceite do autor.
4. **Quarta etapa (`S6.19d`, integrada a S6.3/S6.12):** **Ruínas de Shanghai em
   2,5D** — leva a mesma linguagem de corte de maquete, contorno de tinta e
   detalhe industrial *Metal Slug* para as fachadas destruídas, depósitos e
   esconderijos de Shanghai.

---

## 2. Os 10 pilares técnicos e artísticos da S6.19

### 2.1. Corte assimétrico direcional de maquete (Front-Cut vs. Back-Full)

Na implementação atual da S6.12 (`src/scene/marsColony/visibility.ts`), paredes
e tetos inteiros caem para `FADED = 0.08` (8% de opacidade). Isso deixa um véu
esbranquiçado sobre o interior e, se aplicado a todas as paredes em corte baixo,
eliminaria as paredes de fundo onde vivem as janelas, tubulações altas e racks.

Regras do novo corte 2,5D:

- **Fim do véu translúcido (`FADED = 0.08` → `0.0`):** quando o jogador entra na
  sala (ou quando o teto intercepta a câmera), o teto (`TET_*`) desce até
  `opacity = 0` e desliga `mesh.visible` abaixo de `0.01`, eliminando custo de
  *fill-rate* e lavagem de cor.
- **Paredes frontais à câmera cortam em `~1,0–1,15 m`:** cada parede é dividida
  em **base fixa (`*_Base`, até `~1,10 m`)** e **topo cortável (`*_Top`, acima
  de `1,10 m`)**. Apenas as paredes cujo vetor normal aponta para o hemisfério
  frontal da câmera (`dot(wallNormal, cameraToRoom) > 0`) recolhem a parte
  `*_Top`.
- **Paredes de fundo permanecem em 100% da altura:** as paredes traseiras em
  relação à câmera mantêm `*_Top` visível e opaco, emoldurando a cena como um
  palco 2,5D com janelas para Marte, dutos superiores e equipamentos altos.
- **Permutação suave com `Q/C`:** ao girar a câmera em `CameraRig.tsx`, o
  produto escalar atualiza quais paredes são frontais (recolhendo `*_Top`) e
  quais passaram a ser paredes de fundo (restaurando `*_Top`), mantendo os
  grupos sincronizados da S6.12.

### 2.2. Tampa de seção opaca (*Poché Cap*) e preservação dos portais circulares

- **Remate escuro de maquete (*Poché Cap*):** toda parede baixa `*_Base` possui
  uma face superior de seção (`*_Cap`) em tom grafite-escuro opaco (`#1B1F27` /
  `#252A34`) com leve chanfro, visível quando `*_Top` está recolhida. Nenhuma
  parede cortada pode exibir geometria oca ou topo da mesma cor bege/clara da
  alvenaria.
- **Portais/anteparas circulares permanentes (*Bulkhead Doors*):** conforme a
  referência da Sala da EDEN, os aros estruturais das portas (`ARQ_*_Portal_*`)
  não são decepados ao meio pelo corte da parede baixa; eles permanecem
  inteiros como arcos esculturais que sinalizam imediatamente todas as saídas.

### 2.3. Estética 2D ilustrada sobre 3D: *Ink Lineart* em 2 níveis + *Stepped Shading*

Para alcançar a leitura de arte 2D desenhada à mão dentro do mundo 3D:

- **Nível 1 — Contorno de silhueta (`1.5–2 px` em `#18141E`):** aplicado a
  personagens (Astro Explorer, EDEN, robôs, mutantes), máquinas principais e
  bordas externas de seção via casco invertido (*Inverted Hull*) ou detecção de
  borda de profundidade/normal.
- **Nível 2 — Vincos e juntas internas (`0.75–1 px`):** linhas finas marcando
  as placas do piso modular, dobras de tubulações, caixas e painéis técnicos,
  geradas por geometria de arestas (`EdgesGeometry` / crease no exportador) ou
  passe de normais, sem depender de texturas borradas.
- **Shading em degraus (*Stepped Toon/Lit Ramp*):** substituir o sombreamento
  difuso lavado (`hemisphereLight` alto) por rampa de 2 a 3 faixas via
  `onBeforeCompile` (luz principal, meio-tom e sombra colorida fria `#23263A`
  nos interiores / terracota `#6E352C` no exterior) combinada com gradiente
  vertical sutil nas paredes (base mais escura junto ao piso, topo mais claro).

### 2.4. Paleta *Chiaroscuro 2,5D*: interior ardósia frio × exterior marciano quente

Substituir o interior bege uniforme das salas técnicas por uma paleta de
contraste controlada que faça o jogador, os inimigos e os elementos emissivos
saltarem à vista:

| Token | Valor de referência | Aplicação |
|---|---|---|
| `--hull-slate-dark` | `#262A32` | Vigas estruturais, colunas, *poché cap* e molduras pesadas |
| `--hull-slate-mid` | `#3B4049` | Painéis internos de parede e bancadas periféricas |
| `--floor-plate` | `#4A525D` | Placas modulares do piso interno (neutro médio para leitura de combate) |
| `--floor-seam` | `#1E2229` | Juntas profundas, grelhas e rebites do piso |
| `--hazard-yellow` | `#E5A93C` | Faixas zebradas de segurança no rodapé, portas e áreas de máquina |
| `--mars-sun-warm` | `#E87A3E` | Luz direcional quente de Marte entrando pelas janelas e solo externo |
| `--holo-cyan` | `#00FFFF` / `#4DD9C0` | Anéis `2.7m`, terminal da EDEN, painéis holográficos e visor do Explorer |
| `--diamond-warm` | `#FF8A5B` / `#FFD166` | Núcleo energético da Máquina de Síntese de Diamante |

### 2.5. DNA *Metal Slug*: densidade industrial (*Greebling*) e micro-animações em *Step-Time* (8 FPS)

- **Kit modular instanciado por camada:**
  - *Alto da parede de fundo:* tubulações grossas com curvas de 90° e flanges,
    dutos de ventilação e luminárias industriais lineares;
  - *Meia-altura / Perímetro:* racks de servidores com fileiras de LEDs,
    consoles inclinados com monitores CRT/holográficos, janelas chanfradas com
    vista para o exterior marciano, quadros de ferramentas;
  - *Piso e rodapé:* caixas metálicas com chanfro, canteiros hidropônicos
    compactos sob as janelas, cabos grossos serpenteando junto às paredes,
    escotilhas no piso, grelhas e **faixas zebradas amarelo/preto**.
- **Micro-animações mecânicas a 8 FPS (zero alocação em `useFrame`):**
  atualizar um único uniforme compartilhado `uStepTime = Math.floor(t * 8) / 8`
  para animar em *step-frames* (estilo sprite 2D clássico) os LEDs dos racks,
  os gráficos nas telas dos consoles e a pulsação dos hologramas.

### 2.6. UI diegética 2,5D no cenário (anéis duplos `2.7m` e hologramas isométricos)

- Substituir o `ringGeometry` amarelo provisório da EDEN em
  `src/scene/OfficeScene.tsx` por um **anel duplo ciano neon (`#00FFFF`) com
  gradiente radial interno**, posicionado a `+15 mm` do piso (`depthWrite:
  false`, sem coplanaridade), com marcações técnicas de raio (`2.7m`) e anel de
  resposta sob o Astro Explorer quando dentro do alcance.
- Adicionar suporte a painel holográfico diegético em plano isométrico (ex.:
  moldura chanfrada ciano com status da estação da EDEN), respeitando a opção
  de efeitos reduzidos da S6.14.

### 2.7. Colisão de "perímetro limpo" (*Wall Apron* de `0,40 m`) e centro livre

Para que a riqueza visual estilo *Metal Slug* nunca prejudique a movimentação
(`W/S` pela mira) nem o pathfinding em grade de `0,5 m`:

- **Colisor único de rodapé técnico (*Wall Apron*):** racks, consoles, vasos
  hidropônicos e caixas laterais ficam contidos numa faixa periférica de até
  `0,40 m` junto às paredes e são protegidos por **um único `CuboidCollider`
  contínuo por trecho de parede**, sem quinas denteadas onde a cápsula do
  jogador possa prender.
- **Piso 100% navegável:** cabos no chão, tampas de inspeção, grelhas, juntas e
  faixas zebradas têm relevo máximo de `3 mm` (ou trim sheet) e **nenhum
  colisor físico**. A malha do GLB nunca é usada como colisor (regra 3 do
  `AGENTS.md`).

### 2.8. Pipeline reproduzível no Blender e auditoria anti-*z-fighting*

- Evoluir os scripts de exportação (`scripts/export-colony-v006.py` e módulos
  auxiliares) para gerar ou validar os grupos `*_Base`, `*_Cap` e `*_Top` sem
  salvar nem alterar o `.blend` original do autor (verificação por SHA-256).
- Todo decalque, faixa zebrada, cabo de piso ou anel holográfico mantém offset
  explícito ($\ge 2\text{ mm}$ em arquitetura estática; $+15\text{ mm}$ com
  `depthWrite: false` em hologramas de piso).
- Estender a suíte `tests/colony-props.test.mjs` para auditar coplanaridade nas
  novas famílias (`CAP_`, `DECAL_`, `PROP_`).

### 2.9. Extensão da direção 2,5D *Metal Slug* para Shanghai (`S6.3` / `S6.12`)

A mesma receita visual será aplicada ao distrito de Shanghai (`34 × 36 m`):

- Fachadas em ruínas com **corte de maquete em 1–2 pavimentos**, exibindo vigas
  metálicas retorcidas, paredes internas seccionadas com *poché* escuro e
  tubulações quebradas, sem ocultar inimigos nem coletáveis da câmera;
- Asfalto com placas rachadas, faixas urbanas desgastadas, cabos e crateras
  rasas sem colisor;
- Os **2 depósitos** (ferro/cobre) e os **6 esconderijos de placas de alumínio**
  modelados como containers/lockers industriais de alto contraste com contorno
  de tinta e sinalização ciano/âmbar inconfundível.

### 2.10. Orçamento de desempenho e integração com presets (`S2.9` / `S7.8`)

- Medir draw calls, triângulos, memória e `rAF p50/p95` (via instrumentação da
  S2.9) na Sala da EDEN antes e depois da prova de estilo.
- Instanciar props repetidos (`InstancedMesh` ou merge por material/grupo de
  fade quando estático) para não escalar draw calls linearmente com o número de
  rebites, caixas ou tubos.
- Contorno em pós-processo, scanlines de hologramas e partículas de poeira
  externa devem respeitar `prefers-reduced-motion` e desligar no preset gráfico
  baixo (S7.8).

---

## 3. Sequência de execução e critérios de aceite

| Subtarefa | Escopo | Critério de aceite técnico e de preparação para o autor |
|---|---|---|
| **S6.19a · Prova de estilo na Sala da EDEN (Ala Norte)** | Corte direcional (`*_Base` + `*_Cap` + `*_Top` com `Q/C`), teto a `0%`, paleta ardósia + janelas quentes de Marte, kit periférico (racks, tubos, consoles, canteiros, faixas zebradas), contorno 2,5D e anel duplo ciano `2.7m` da EDEN | Zero pares coplanares no teste automatizado; colisão periférica contínua sem prender o player; rotação `Q/C` alterna paredes frontais/traseiras sem piscar; `npm test`, `npm run build` e `git diff --check` verdes; capturas comparativas em 4 ângulos de câmera para aceite do autor |
| **S6.19b · Laboratório 2,5D e palco da Máquina de Síntese** | Aplicação do padrão aprovado na S6.19a ao Laboratório, integrando bancadas técnicas, escotilhas, iluminação de contraste para o núcleo de diamante e rota limpa | Preserva a interação da S5.1–S5.3, corredores livres e zero regressão de desempenho |
| **S6.19c · Expansão para o Hub e Exterior de Marte** | Aplicação aos demais módulos da colônia, passarelas, deck de lançamento e terreno marciano (rochas instanciadas, trilhas de rover, domos distantes no horizonte) | Todas as portas e rotas do hub preservadas; orçamento de draw calls e tempo de quadro dentro da meta |
| **S6.19d · Direção 2,5D *Metal Slug* em Shanghai (com S6.3/S6.12)** | Corte de maquete nas ruínas urbanas, detalhes industriais de rua, depósitos e esconderijos com leitura de combate preservada | 8 inimigos simultâneos, minas, barreiras neon azul e drops 100% visíveis em qualquer ângulo `Q/C` |

---

## 4. Roteiro de verificação manual para o autor (na entrega de cada etapa)

1. **Entrada e leitura imediata:** caminhar até a Sala da EDEN; confirmar que o
   teto some completamente (sem véu esbranquiçado) e que as paredes da frente
   ficam baixas com topo escuro enquanto as paredes de fundo mostram janelas,
   tubos e servidores.
2. **Giro de câmera (`Q` e `C`):** girar a câmera em 360° dentro da sala e na
   porta; verificar se as paredes que passam para a frente baixam suavemente e
   as que vão para o fundo sobem sem piscar batentes ou props.
3. **Sensação 2,5D e *Metal Slug*:** avaliar o traço de contorno, as juntas do
   piso, as faixas zebradas, os LEDs/telas pulsando e o contraste do Astro
   Explorer e do anel ciano `2.7m` sobre o piso escuro.
4. **Movimento pela mira (`W/S`):** correr e recuar rente às paredes da sala
   para confirmar que nenhum rack, cabo ou caixa prende o personagem.
5. **Desempenho (`?perf`):** comparar a amostra de 10 s antes/depois na mesma
   resolução e DPR.
