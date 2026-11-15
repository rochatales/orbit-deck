# Estudo Visual e Proposta Técnica — Água, Arrebentação, Areia Molhada e Mar Raso (`v005`)

**Projeto:** EXODEN · Level 02 Rio (`rio-fase01`)\
**Autor e autoridade de aceite:** Tales Rocha\
**Data:** 15/11/2026\
**Referência principal:** `/Users/rochatales/Game Development/Horda Survivor/Mapas/Designing_post-apocalyptic_beach…_d64757f4.jpg`

---

## 1. Identificação da Base e Preservação do Trabalho Existente

- **Worktree e branch ativa:** `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace` (`rochatales/level02-rio-morros`, derivada de `6e814a3` / `rio-fase01-planta-v2`).
- **Trabalhos preservados na base:**
  1. **Píer quebrado e destruição (`v002`/`v003`, commit `6e814a3`):** `Pier_Morro` (`X = 28..46, Z = -53..-47`), `Pier_Ponta_Caida` (`X = 46..51, Z = -53..-47`), carros destruídos, crateras, destroços e suprimentos.
  2. **Morros divisórios refinados (`v004`):** `art-source/rio-fase01/blend/rio_fase01_v004.blend` e `art-source/rio-fase01/export/rio-limites-v002.glb` (`Limite_Oeste_Morro` e `Limite_Norte_Morro_Escombros` com granito costeiro estratificado e mata atlântica em 3 escalas).
- **Versionamento desta entrega:**
  - Nova cena Blender salva em `art-source/rio-fase01/blend/rio_fase01_v005.blend` (preservando integralmente `rio_fase01_v001.blend` a `rio_fase01_v004.blend`).
  - Novos assets exportados preservando versões anteriores e mantendo `art-source/rio-fase01/export/layout.json` e `src/assets/rio-fase01/layout.json` idênticos byte a byte.

---

## 2. Estudo Detalhado da Referência Principal

A análise abaixo separa rigorosamente o que está **visível na imagem estática** (`/Users/rochatales/Game Development/Horda Survivor/Mapas/Designing_post-apocalyptic_beach…_d64757f4.jpg`) das **propostas de comportamento temporal e físico** inferidas para o tempo real.

### 2.1. Cor, profundidade e transparência

- **Observado na imagem estática:**
  - O mar apresenta paleta costeira dessaturada em tons de **azul-esverdeado acinzentado (`slate-teal`)**, variando entre `#4f6f73` na zona intermediária e `#2b4c57` nas águas mais fundas a leste (`+X`), longe de qualquer azul ciano ou turquesa saturado uniforme.
  - Junto à praia, a lâmina de água rasa é translúcida e assume tom **oliva-âmbar quente (`#7d7b5e` a `#5e6e64`)**, deixando transparecer a cor e a granulação da areia submersa (`#8d7250`).
  - A transição entre o fundo visível e a água profunda ocorre por atenuação gradual de luz com a profundidade, sem degrau cromático nem linha dura separando o raso do fundo.
- **Proposta para o tempo real e Blender (`v005`):**
  - Modelar a absorção óptica em função da profundidade real `depth = max(0, waterSurfaceY - seabedY)` usando atenuação exponencial suave (`1 - exp(-depth * absorptionRate)`).
  - Na faixa rasa caminhável (`0 a 30 cm`), preservar `45%–90%` da leitura dos detalhes do fundo arenoso submerso; além do limite caminhável (`X > 39.2`, onde o fundo desce de `-0.30 m` até `-1.25 m`), reduzir progressivamente a visibilidade do fundo e aprofundar o tom para azul-petróleo acinzentado.

### 2.2. Ondas e espuma

- **Observado na imagem estática:**
  - A linha de arrebentação junto à areia descreve **arcos costeiros orgânicos (línguas de swash)** na escala de `8–18 m` ao longo da praia, nunca uma reta paralela ao calçadão.
  - A espuma principal tem borda frontal irregular mais densa e, imediatamente atrás dela, forma uma **malha rendada (`foam lace`) com vazios internos** — aberturas ovais e irregulares por onde a água escura aparece.
  - Há interrupções naturais, pequenas ramificações diagonais e variação contínua de largura e opacidade.
  - Mais ao largo (`+X`), surgem cristas secundárias descontínuas e suaves, acompanhando a orientação costeira.
  - O tom da espuma é **branco-quente/marfim (`#efe9dc` a `#dfd7c8`)**, integrado à luz de fim de tarde, sem brilho emissivo artificial.
- **Proposta de movimento temporal (inferida para o runtime):**
  - Como o mar do Rio fica em `+X` (`WATERLINE = 36.0`), o trem principal de ondas propaga-se no sentido `-X` (com leve obliquidade costeira de `~7°` e defasagem senoidal lenta ao longo de `Z` para evitar chegada simultânea em toda a orla).
  - Ciclo de avanço e recuo assimétrico (`swash`): a onda avança de forma coesa sobre a rampa da praia (`X ≈ 34.3..36.6`), espalha uma lâmina fina e recua mais lentamente em direção a `+X`.
  - A espuma nasce e ganha densidade onde a frente da onda se comprime na zona rasa, abre vazios celulares (`vazios internos`) durante a desaceleração/recuo e se dissolve gradualmente antes da onda seguinte, sem deslizar lateralmente como textura rígida.

### 2.3. Areia molhada

- **Observado na imagem estática:**
  - Entre a areia seca clara (`#d5b783`) e a lâmina d'água existe uma **faixa escura de areia molhada (`#765c3f` a `#634c33`)**, de largura variável (`~1.5 m a 3.8 m`), acompanhando os arcos da linha de arrebentação.
  - A transição entre areia seca, areia úmida (alcançada ocasionalmente) e areia saturada junto à água ocorre por gradiente suave de albedo e rugosidade, sem contorno recortado.
- **Proposta de memória temporal de umidade (inferida para o runtime):**
  - A umidade da areia (`wetness`) usa a mesma coordenada espacial da linha costeira e do avanço do `swash`, porém com **histerese temporal (atraso no recuo)**:
    1. Quando a lâmina de água cobre um ponto da praia, a umidade sobe imediatamente (`wetness -> 1.0`).
    2. Quando a água recua para `+X`, o envelope de memória retém o escurecimento e o brilho especular na faixa recém-descoberta, decaindo lentamente (`wetDecay`) nas bordas externas enquanto a faixa frequentemente alcançada permanece molhada.
    3. Toda área atualmente coberta pela água tem `wetness = 1.0` garantido, impedindo que a areia pareça clara ou seca debaixo d'água.

### 2.4. Reflexos e sombras

- **Observado na imagem estática:**
  - A superfície do mar apresenta reflexos moderados, quebrados pelas pequenas ondulações das ondas, refletindo a luz dourada/pêssego do fim de tarde sem aspecto de espelho cromado plano.
  - A areia molhada ganha brilho especular discreto e alongado na direção da luz solar/céu quando exposta, mantendo a microtextura granular da areia.
- **Proposta técnica compatível com a câmera ortográfica:**
  - Na câmera ortográfica do jogo (`MAP_CAMERA_ANGLE.rio = π/4`, `distanceScale = 3`), o vetor de visão tem inclinação constante; por isso, um reflexo dependente apenas do vetor de câmera ficaria uniforme se a normal fosse plana.
  - Combinamos **normais analíticas multiescala** (inclinação da crista costeira + duas oitavas de ondulação capilar suave sem alta frequência que cintile) com **termo Fresnel Schlick** e reflexão analítica do ambiente de fim de tarde (`RIO_SKY = #e6c4a2`, zênite `#8fa6b5`, horizonte quente `#f3dfc7` e brilho solar direcional `#ffd3a0` vindo de `[-28, 37, 40]`).
  - Documentação explícita: trata-se de **reflexão analítica do céu/horizonte e luz direcional do Rio**, sem passe extra de reflexão planar e sem reflexão dinâmica de objetos 3D da cena.
  - Na areia molhada, o termo especular é modulado estritamente pela máscara `wetness * (1 - submergence)`, evitando qualquer vazamento de reflexo para a areia seca.

---

## 3. Diagnóstico da Versão Atual (`v004` / Runtime Atual)

1. **Runtime (`src/game/rio/visual.ts` e `src/game/rio/layout.ts`):**
   - `areia` (`X = 15..36`) e `mar` (`X = 36..216`) são atualmente duas malhas `PlaneGeometry` planas de 1 único segmento em `Y = 0`, com `MeshStandardMaterial` estático (`#d5b783` e `#347b99`, `roughness = 1.0`).
   - Não há inclinação do fundo, transparência por profundidade, movimento de ondas, espuma orgânica, faixa de areia molhada nem efeitos de contato nos pés.
   - `createRioTerrain()` retorna `surfaceHeight: () => 0` e `supportHeight: () => 0`, e `COL_Limite_Mar` bloqueia o jogador exatamente em `X = 36.0`.
2. **Blender (`art-source/rio-fase01/scripts/build_blender.py`):**
   - `Areia` é um bloco plano em `Y = 0` até `X = 36`, `Mar` é uma caixa plana rebaixada em `Y = -0.18`, e a espuma (`Espuma_mar_000..269`) é formada por 270 plaquinhas retangulares brancas idênticas alinhadas em `X = 36.0`.

---

## 4. Arquitetura da Solução Visual, Física e Técnica

### 4.1. Perfil Costeiro, Apoio Físico (`supportHeight` / `surfaceHeight`) e Faixa Rasa

Separamos explicitamente as quatro grandezas físicas e espaciais em `src/game/rio/seabed.ts` e `art-source/rio-fase01/scripts/layout.py`:

| Grandeza | Função / Constante | Definição e Valores no Rio (`v005`) |
| --- | --- | --- |
| **Linha costeira base** | `WATERLINE_X = 36.0` | Início nominal da lâmina d'água permanente; `swash` avança até `X ≈ 34.3 m`. |
| **Limite da faixa rasa acessível** | `SHALLOW_WATER_MAX_X = 39.2` | Faixa caminhável de **3,2 m** de largura (`X = 36.0 .. 39.2`) ao sul do canal do píer (`Z = -45.0 .. 54.0`). |
| **Altura da superfície visual da água** | `rioWaterSurfaceHeight(x, z)` | Cota de repouso `Y = 0.00 m` (com deslocamento visual suave de ondas de `±0.025 m` apenas no shader da água). |
| **Altura do fundo físico de apoio** | `rioSeabedHeight(x, z)` (`supportHeight` e `surfaceHeight`) | `Y = 0.00 m` em `X <= 34.0` (cidade/areia seca e deck do píer `X = 28..46, Z = -53..-47`); descida suave `C¹` até `Y = -0.04 m` em `X = 36.0`; descida contínua até **`Y = -0.30 m`** (`30 cm` de profundidade) em `X = 39.2`; aprofundamento progressivo até `Y = -1.25 m` para `X > 39.2` (água profunda inacessível). |
| **Profundidade líquida resultante** | `rioWaterDepth(x, z)` | `max(0, rioWaterSurfaceHeight(x, z) - rioSeabedHeight(x, z))` (`0.04 m` na borda até `0.30 m` no limite caminhável `X = 39.2`). |

- **Estabilidade do apoio físico:** `supportHeight` e `surfaceHeight` consultam exclusivamente o perfil estático do fundo arenoso (`rioSeabedHeight`), **sem aplicar a oscilação temporal das ondas**, garantindo que o personagem e os inimigos caminhem apoiados no fundo submerso sem oscilar verticalmente com a superfície líquida e sem degraus ao entrar ou sair.

### 4.2. Relação com o Píer Quebrado (`Pier_Morro` e `Pier_Ponta_Caida`)

- O píer quebrado ocupa `Z = -53.0 .. -47.0`, com rampa/deck caminhável até `X = 46.0` e ponta desabada inacessível (`Pier_Ponta_Caida`) em `X = 46.0 .. 51.0`.
- Para preservar integralmente o papel tático e espacial do píer:
  1. A área caminhável da faixa rasa (`X = 36.0 .. 39.2`) termina em **`Z = -45.0`** (`2,0 m` ao sul da borda sul do píer em `Z = -47.0`).
  2. O colisor `COL_Limite_Mar_Pier_Sul` (`X = 36.0 .. 54.0, Z = -47.0 .. -45.0`) e o aprofundamento do fundo submarino (`seabed` descendo mais rápido para `Z < -45.0`) formam um canal mais fundo e escuro junto aos pilares do píer.
  3. Assim, o jogador e os inimigos **não podem entrar ou sair do píer pela lateral na água**, **não podem alcançar nem contornar a ponta caída (`X = 46..51`)** e só acessam o píer pela sua entrada costeira em `X = 28..36, Z = -53..-47`.

### 4.3. Navegação dos 4 Tipos de Inimigo

- Com a inclusão da faixa rasa (`X = 36.0 .. 39.2, Z = -45.0 .. 54.0`) em `walkableAreas` e o recuo de `COL_Limite_Mar` para `minX = 39.2` nesse trecho, a grade de navegação (`COMBAT.grid = 0.5 m`) conecta continuamente a praia (`X <= 36.0`) e a faixa rasa (`X = 36.0 .. 39.2`) para todos os 4 tipos de inimigo (`patrol`, `largePatrol`, `smallMutant`, `largeMutant`, com raios de `0.50 m` a `1.66 m`).
- Nenhum inimigo ou spawn novo é criado no mar (`encounterLayout('rio').perimeter` permanece restrito à área terrestre principal).

### 4.4. Efeitos de Contato (Respingos e Ondulações nos Pés) e Combate

- **Pool pré-alocado sem alocação por frame (`src/game/rio/waterContact.ts`):**
  - Ondulações circulares locais (`ripples`) que nascem nos pés quando o personagem se move dentro da água (`rioWaterDepth(x, z) > 0.03`), expandem-se no plano `Y = 0.012` e desaparecem suavemente.
  - Pequenos respingos (`splashes`) discretos junto aos pés com intensidade e cadência proporcionais à velocidade planar (`planarSpeed`), cessando imediatamente quando o personagem para (`planarSpeed < stopSpeed`), quando o jogo está pausado (`simulationBlocked()`) ou quando o personagem está na areia seca ou sobre o deck do píer.
- **Combate e Mira:**
  - `PlayerAim` e `PlayerReticle` já utilizam `weaponShotHeight(playerPosition.y, RIFLE_POSE.height)`, acompanhando automaticamente a descida de `playerPosition.y` (`-0.04 m` a `-0.30 m`) na água rasa.
  - `traceShot` compara a altura do disparo com `terrain.surfaceHeight(candidate.x, candidate.z)`, de modo que tiros entre praia e água rasa acertam normalmente todos os inimigos.
  - As malhas da água e dos efeitos de contato têm `raycast` desativado e não entram em `terrain.obstacles`, nunca bloqueando tiros.
