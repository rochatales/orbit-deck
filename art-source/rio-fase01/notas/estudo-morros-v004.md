# Estudo Visual e Plano de Adaptação — Morros Divisórios (Rio · Level 02 · v004)

Data: 15/11/2026  
Autor do pedido: Tales Rocha  
Escopo: Estudo visual pré-modelagem e projeto de refinamento das formações de granito costeiro e mata atlântica nos limites oeste (`Limite_Oeste_Morro`) e norte (`Limite_Norte_Morro_Escombros`) do mapa Rio de Janeiro.

---

## 1. Identificação da cena-fonte e estado do repositório

Antes de qualquer edição, foram inspecionadas as worktrees e o histórico Git do repositório:

1. **Worktree `rochatales/level02-rio-pier`** (`/Users/rochatales/.codex/worktrees/level02-rio-pier/game-workplace`):
   - Commit base (`HEAD`): `3efbf0a` (`docs: prompt do deck quebrado junto ao morro no Rio`, 13/11/2026).
   - Possui alterações locais não commitadas em andamento para a `planta-v1` e o blockout do píer (`scripts/layout.py`, `export/layout.json`, `src/game/rio/*`), porém o único arquivo Blender salvo nessa worktree é `art-source/rio-fase01/blend/rio_fase01_v001.blend` (SHA-256: `885044315450f073679570aa5c9b845f2ba451a4b212b986a3f4460c5dbb2169`), correspondente à `planta-v0` (commit `3d8c0f2`), ainda sem o píer modelado no `.blend`.
   - Essa worktree foi preservada integralmente sem alterações para não misturar uma planta em andamento com a cena `v001`.

2. **Fonte efetivamente mais recente pelo histórico e pelo conteúdo (`claude/level02-rio-pier`)**:
   - Worktree de origem: `/Users/rochatales/Automations/game-workplace/.claude/worktrees/exoden-design-sprints-397366`
   - Branch de origem: `claude/level02-rio-pier`
   - Commit de origem (`HEAD`): `6e814a31e1617030d624bf248864fe081b416334` (`6e814a3` — `feat: ampliar a destruição do Rio com ruínas, desabamentos e mais carcaças`, 14/11/2026 02:43:09 -0300), que sucede `8699edb` (`feat: píer quebrado e passe pós-apocalíptico no Rio`).
   - Arquivo `.blend` mais recente: `art-source/rio-fase01/blend/rio_fase01_v003.blend`  
     - Tamanho: `4.235.579` bytes  
     - SHA-256: `4e7dd03834bd43d7ec1e9b2c7366074fbcfbe35cd087c77b76cb91a395513086`
   - Arquivos `.blend` anteriores preservados na mesma pasta:
     - `rio_fase01_v001.blend` (`3.521.721` bytes, SHA-256: `885044315450f073679570aa5c9b845f2ba451a4b212b986a3f4460c5dbb2169`)
     - `rio_fase01_v002.blend` (`3.907.359` bytes, SHA-256: `fee90d6cf9433482fa4d5162d51cacef2ecc7f19a1aab8e6c50eee46ebdf7efb`)
   - Planta correspondente: `art-source/rio-fase01/export/layout.json` (`rio-fase01-planta-v2`, SHA-256: `5fa804116491046a8b589beb0ede78f6c6118ca09d282e17cc6e4e3e3c90e2b7`), que já contém o píer completo (`Pier_Morro`: rampa `X = 28..36`, tablado caminhável `X = 36..46`, ponta desabada não caminhável `X = 46..51`, `Z = -53..-47`).
   - GLBs exportados na base `6e814a3`:
     - `export/rio-fase01.glb`: `57.137` triângulos, `96` malhas, `14` materiais, `5.598.136` bytes (SHA-256: `354e2ae5965d12e90abc36d1c6ddb2f2f1c44688c6ec92a8c43443382eb0fdee`).
     - `export/rio-limites-v001.glb` (em `6e814a3`): `16.424` triângulos, `25` malhas, `9` materiais, `1.397.192` bytes (SHA-256: `f8e1c620e76eb497fb68a60c79af5a6f4cd32b9e657828ea16ebd802a9a08c3a`). Na versão inicial `3d8c0f2` (`v001`), `export/rio-limites-v001.glb` tinha `14.608` triângulos, `25` malhas, `9` materiais e `1.273.244` bytes (SHA-256: `02d02b4cdd1a7fde4738d0892f230cb4367a9ec452c45e7e18bed6c4cf4d7c43`).

3. **Isolamento e inspeção no Blender 5.1.1**:
   - Foi criada a worktree dedicada `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace` na branch `rochatales/level02-rio-morros` a partir de `6e814a3`.
   - **Nota sobre o conector Blender MCP:** O conector Blender MCP não estava disponível/conectado nesta sessão (e o processo GUI do Blender com socket ativo não estava em execução). Todas as inspeções da cena real, reconstruções, auditorias e renderizações foram executadas diretamente pelo binário oficial **Blender 5.1.1** (`build hash: b70da489d7f4`) via linha de comando (`--background --python`), sem descrever execuções de CLI como ações do MCP.
   - Verificação da cena aberta (`rio_fase01_v003.blend`):
     - Unidades: `METRIC`, `scale_length = 1.0`.
     - Coleções: `00_MODULOS_REUTILIZAVEIS` (23 subcoleções), `01_KIT_LAYOUT_EDITAVEL` (6.142 objetos), `02_EXPORT_MAPA` (96 malhas), `03_EXPORT_LIMITES` (25 malhas), `04_COLISORES_MARCADORES` (58 empties), `05_CAMERAS_LUZ_REVISAO` (15 câmeras + 1 sol).
     - Câmeras verificadas: `CAM_Jogo` (ortográfica, `ortho_scale = 194,43`, azimute $\pi/4 = 0,785\text{ rad}$, inclinação `0,955 rad`, equivalendo à elevação isométrica de $35,264^\circ$), `CAM_Geral` (`ortho_scale = 210,0`), `CAM_Topo` (`ortho_scale = 260,0`), `CAM_Morro` (`ortho_scale = 48,0`), `CAM_Pier` (`ortho_scale = 28,0`), `CAM_Pier_ponta` (`ortho_scale = 15,0`), entre outras.

---

## 2. Análise dos quatro painéis da referência principal

Referência principal examinada: `/Users/rochatales/Game Development/Horda Survivor/Mapas/Designing_post-apocalyptic_beach…_2291afd0.jpg` (em conjunto com `ref-01-orla-quiosques.jpg` e `ref-02-orla-avenida.jpg`). As legendas e números gráficos da prancha são tratados apenas como ilustração.

### 2.1 Painel superior esquerdo — Aparência com materiais (*Textured Beauty Pass*)

- **O que a imagem mostra:**
  - Um conjunto costeiro de granito intemperizado (*weathered granite*) articulado em **volumes hierárquicos**: um cume principal mais alto e largo à esquerda/centro, um segundo morro/domo granítico mais íngreme e desnudo ao fundo à direita (típico pão-de-açúcar costeiro), ombros rochosos intermediários e contrafortes frontais que descem até o nível do solo.
  - **Assimetria franca:** A face frontal-direita do pico dominante é uma escarpa íngreme de rocha nua sulcada por fendas e diedros verticais; já o flanco esquerdo e a sela entre os dois morros têm declividade menor e recebem uma cobertura densa e contínua de mata tropical que sobe até próximo da crista.
  - **Leitura mineral da rocha:** O granito não tem cor única nem ruído isotrópico. Apresenta faces amplas em tom mineral cálido (bege-acinzentado/ocre claro) onde recebe sol, estrias verticais escuras de escorrimento d'água e intemperismo ao longo das fraturas e diedros, e escurecimento úmido na base e junto às bordas de vegetação.
  - **Integração da mata:** A vegetação contorna as faces íngremes, preenche a sela entre os picos, acumula-se na saia basal e sobe pelas ravinas e ombros menos inclinados.
- **O que propomos adaptar para EXODEN:**
  - Reproduzir a **composição assimétrica de picos, domos costeiros, selas e contrafortes** e o **contraste entre paredões de granito exposto e encostas/selas vegetadas**, mantendo porém a linguagem estilizada e facetada-suavizada do jogo (sem microdetalhe fotorrealista).

### 2.2 Painel superior direito — Clay / AO (*Clay / AO Pass*)

- **O que a imagem mostra:**
  - Sem qualquer textura de cor ou diferença entre verde e pedra, a montanha permanece **100% reconhecível apenas pela silhueta e pelos planos primários e secundários**.
  - O cume principal tem coroamento convexo-assimétrico em crista (nunca um topo cortado horizontalmente), flanqueado por nervuras e contrafortes que avançam para a frente com ângulos distintos.
  - O domo secundário à direita possui perfil mais cilíndrico-parabólico, típico de monolito esfoliado do litoral carioca, criando contraste de forma com o pico principal mais esgalhado.
  - Sulcos verticais profundos (diedros e caneluras de drenagem) separam as placas de rocha e concentram oclusão de ambiente (AO) e sombras próprias, dando leitura imediata de profundidade.
- **O que propomos adaptar para EXODEN:**
  - Construir a cadeia de morros primeiro em **clay** (sem vegetação), garantindo que cada pico dominante, ombro, sela e contraforte tenha leitura própria de volume, inclinação e sombra projetada antes de adicionar uma única copa.

### 2.3 Painel inferior esquerdo — Malha (*Wireframe / Mesh*)

- **O que a imagem mostra:**
  - Uma malha contínua de alta densidade em que as arestas fluem ao longo das cristas, diedros e linhas de drenagem, com maior adensamento nas quebras de perfil e nas massas de copa esculpidas sobre a superfície.
- **O que propomos adaptar para EXODEN:**
  - **Não** adotar a densidade de polígonos da referência (que consumiria dezenas de milhares de triângulos em um único morro).
  - Em vez disso, concentrar o orçamento geométrico nos **maciços rochosos** (subindo de 1.020 triângulos totais para cerca de 5.500–7.500 triângulos na rocha) com anéis verticais adaptativos, nervuras/contrafortes geométricos reais e sulcos orientados nas faces visíveis pela câmera do jogo, enquanto reduzimos e otimizamos os agrupamentos de folhagem para que o pacote total `rio-limites-v002.glb` permaneça bem abaixo do limite de Shanghai (28.838 triângulos e 1,5 MB).

### 2.4 Painel inferior direito — Elevação e topografia (*Elevation & Topography*)

- **O que a imagem mostra:**
  - As curvas de nível formam uma **base única contínua e orgânica**, sem ilhas circulares isoladas.
  - Os dois cumes aparecem como núcleos excêntricos dentro da mesma massa basal: as curvas de nível são muito comprimidas nas escarpas frontais (alta declividade) e espaçadas nos ombros e na sela central (baixa declividade).
  - Os gráficos de perfil mostram uma linha de cume contínua que alterna cota alta, sela intermediária e segundo pico, além do perfil transversal assimétrico (*cuesta*/escarpa costeira).
- **O que propomos adaptar para EXODEN:**
  - Unificar visualmente a cadeia oeste e a cadeia norte por meio de **saias basais contínuas, contrafortes que avançam até o limite exato do terreno (`X = -51` no oeste e `Z = -54` no norte) e selas rochosas/vegetadas** entre os picos, eliminando tanto as bases circulares isoladas quanto as frestas entre os morros e o mapa.

---

## 3. Estudo temático e comparação com a cena atual (`v003`)

### 3.1 Forma e silhueta

- **Diagnóstico da cena atual (`renders/v003/geral.png`, `morro.png`, `topo.png`, `pier.png`):**
  1. **Troncos de cone repetidos (`n = 9`):** Em `build_blender.py` (`rock()`), todos os 15 morros usam exatamente 4 níveis horizontais (`0`, `0,30h`, `0,78h`, `1,00h`), 9 vértices por nível e a mesma função radial `0,88 + 0,12 * sin(i*2,7 + level)`.
  2. **Topos cortados planos:** O anel superior (`sc = 0,29`, `yy = h`) fecha com uma face horizontal plana de 9 lados. Em `geral.png` e `morro.png`, todos os cumes parecem vulcões ou cones truncados.
  3. **Alinhamento e espaçamento mecânicos:** Na vista `topo.png`, os 7 morros oeste (`X ≈ -63`, passo fixo de `16 m` em Z, `w = 22, d = 25`) e os 6 morros norte (`Z ≈ -66`, passo fixo de `15 m` em X, `w = 25, d = 22`) formam duas fileiras rígidas de peças quase idênticas.
  4. **Frestas físicas com o terreno e canto noroeste aberto:**
     - A medição exata dos envelopes em `rio_fase01_v003.blend` mostra que a rocha (`Granito`) no limite oeste termina em `maxX = -52,51 m` a `-54,12 m`, deixando uma **fresta de 1,51 m a 3,12 m** até a borda do mapa (`X = -51,0 m`).
     - No limite norte, os morros principais terminam em `maxZ = -55,50 m` a `-57,00 m`, deixando uma **fresta de 1,50 m a 3,00 m** até `Z = -54,0 m`.
     - Mesmo as duas rochas menores junto ao píer (`Granito.013` e `Granito.014`) têm `maxZ = -54,63 m` e `-55,63 m`, não encostando na lateral norte do píer (`Z = -53,0 m`).
     - No canto noroeste (`X < -51, Z < -54`), há um vazio entre o último cone oeste (`minZ = -56,79 m`) e o primeiro cone norte (`minX = -54,47 m`, altura de apenas `13,96 m`).
- **Decisões de projeto para Forma e Silhueta:**
  - Substituir a fileira de cones truncados por uma **cadeia contínua e hierarquizada** com três famílias morfológicas inspiradas no granito carioca e nas referências (`ref-01`, `ref-02` e estudo principal):
    1. **Picos dominantes em crista assimétrica** (3 no oeste, 2 no norte, mais o maciço de articulação noroeste), com alturas variadas dentro do envelope (`28 m` a `38 m`), cume convexo/crista inclinada e face leste/sul escarpada voltada para o mapa;
    2. **Domos/monolitos costeiros (tipo pão-de-açúcar)** (ex.: pico secundário íngreme e promontório do canto nordeste junto à praia/mar), com encostas subverticais de granito exposto e topo abaulado assimétrico;
    3. **Ombros, selas intermediárias e contrafortes frontais** (*spurs* e saia contínua de talus/embasamento) que conectam os picos entre si (nunca descendo a zero entre dois morros) e avançam até encostar firmemente em `X = -51,0 m` (oeste), `Z = -54,0 m` (norte) e na borda norte do píer/rampa (`Z = -53,0 m` em `X = 28..47`), eliminando 100% das frestas sem invadir a área caminhável nem os prédios.

### 3.2 Rocha exposta

- **Análise e decisão (geometria vs. material/textura):**
  - **Em geometria (para afetar silhueta e sombra própria na câmera isométrica):**
    - Grandes planos de fratura e escarpas inclinadas ($60^\circ$ a $80^\circ$) voltadas para a cidade e para a praia (+X no oeste, +Z no norte).
    - **Cristas e contrafortes salientes** (nervuras que descem do cume/ombro em direção à base) alternados com **caneluras/diedros verticais côncavos** (reentrâncias que capturam sombra lateral).
    - **Placas de esfoliação e degraus rochosos** (*ledges*) na meia-encosta e na base, onde a vegetação se apoia fisicamente.
    - Controle deliberado de normais: manter os grandes planos de clivagem e as cristas dos contrafortes com quebras nítidas (*sharp edges* por ângulo/diedro) para preservar a linguagem estilizada de EXODEN, suavizando as transições horizontais entre anéis para eliminar a aparência de "fatias empilhadas".
  - **Em textura e material (sem ruído de alta frequência uniforme):**
    - Criar variantes exclusivas de material para os morros (`pedra_morro` para o granito exposto principal e `pedra_umida` para falésias basais, diedros sombreados e zonas de contato solo/rocha), mantendo o material original `pedra` intacto para os elementos do mapa e escombros sul.
    - Na textura procedural `pedra_morro` (256 × 256 px, repetível), substituir a senoide diagonal simples por bandas de esfoliação mineral e estrias verticais suaves de escorrimento/intemperismo, mapeadas com projeção contínua coerente em escala com os módulos do mapa (eliminando o padrão listrado diagonal visível em `v003/morro.png`).

### 3.3 Vegetação e transição com a pedra

- **Diagnóstico da cena atual:**
  - Os 35 objetos `Copa_morro` por rocha são todos troncos de cone de 7 lados (`r = 2,1..3,6 m`, `h = 3,5 m`, `top = 0,8 m`) distribuídos numa faixa fixa de altura, formando um colar verde horizontal ao redor de cada cone e enterrando as rochas menores do píer (`v003/pier.png`).
- **Decisões de projeto (três escalas e máscaras naturais):**
  - **Onde a vegetação entra e onde a rocha fica nua:**
    - Paredões íngremes (inclinação $> 58^\circ$) e faces de esfoliação convexas permanecem como **grandes panos de granito exposto**.
    - A mata concentra-se nas **selas entre picos**, nos **ombros de menor inclinação**, nas **gargantas/diedros** (onde há acúmulo de solo e umidade) e nas **saias basais** que fazem a transição com a cidade e com a praia. A altura máxima da mata varia organicamente de pico para pico: alguns ombros e cumes secundários têm mata até o topo (como na referência `ref-02` e no pico esquerdo do estudo), enquanto domos mais íngremes têm o cume de pedra nua.
  - **Três escalas de volumes vegetais (substituindo os cones truncados):**
    1. **Escala 1 — Grandes massas florestais (`Mata_massa`):** Volumes orgânicos largos e abaulados, assentados sobre as selas, bacias de encosta e saias basais, acompanhando a inclinação da superfície sem flutuar.
    2. **Escala 2 — Grupos médios de copas (`Copa_grupo`):** Agrupamentos assimétricos de domos facetados-suavizados (3 variedades de módulo no kit com proporções, rotações e escalas distintas) alojados em patamares, ombros e encostas médias.
    3. **Escala 3 — Pequenos bolsões de transição (`Moita_fenda` / `Bolso_solo`):** Pequenos tufos vegetais e manchas de solo/rocha escurecida (`pedra_umida`) nas bordas das massas verdes, nas fendas verticais e no contato com o píer e a areia.
  - **Paleta controlada (sem faixa contínua artificial):**
    - Três materiais vegetais dedicados aos morros (preservando `folha` original para o mapa):
      - `mata_escura`: verde-floresta profundo e menos saturado para as grandes massas basais e selas sombreadas;
      - `mata_media`: verde-oliva atlântico médio para os grupos principais de encosta;
      - `mata_clara`: verde-folha mais claro e quente para copas emergentes expostas ao sol no topo dos agrupamentos e bordas iluminadas.

### 3.4 Luz e sombras

- **Direção da luz e leitura na referência vs. cena atual:**
  - Na referência principal, a luz incide lateralmente (cerca de $45^\circ$ a $60^\circ$ em relação à normal média da cadeia), de modo que cada contraforte e crista tem uma face iluminada clara e uma face oposta em sombra própria, além de projetar sombra sobre a reentrância vizinha.
  - Na cena atual (`v003`), o achatamento decorre principalmente da **geometria em tronco de cone sem contrafortes nem diedros** (80% do problema) e da **falta de contraste tonal/rugosidade entre rocha exposta, reentrâncias úmidas e camadas de mata** (15%), agravados pelo ângulo do sol `Sol_fim_de_tarde` (`rotation_euler = (0.45, -0.5, -0.7)`), que ilumina a cena quase frontalmente em relação à câmera `CAM_Jogo`.
- **Decisão para iluminação e verificação:**
  1. **Preservar exatamente a câmera, exposição (`AgX`), mundo (`Fim_de_tarde`) e sol (`Sol_fim_de_tarde`) da `v003`** na cena principal e na primeira comparação antes/depois, provando que o ganho de volume e profundidade vem da modelagem, das normais e dos materiais.
  2. **Verificar o modelo em Clay e sob Luz Neutra** (sem cor de sol quente e com iluminação neutra de estúdio/revisão) para comprovar que a leitura dos volumes e da transição rocha/mata não depende de truques de cor ou ângulo solar.
  3. **Incluir uma proposta opcional e identificada separadamente de luz de revisão (`luz_alternativa`)** com incidência mais lateral de fim de tarde para avaliação do autor, sem alterar a luz padrão salva na cena.

---

## 4. Adaptação ao jogo e orçamento preliminar

### 4.1 Prioridades para a câmera do jogo (`CAM_Jogo` — ortográfica, azimute $\pi/4$, elevação $35,264^\circ$)

Na câmera ortográfica do jogo, o observador olha de sudeste/leste (`+X, +Z`) para noroeste/oeste (`-X, -Z`):
- Os **morros oeste** são vistos de frente-perfil ao fundo dos prédios das quadras traseiras (`Predio_T0` a `Predio_T3`) e através dos três corredores das ruas transversais (`travessa_0`, `travessa_1`, `travessa_2`). Por isso, as **cristas superiores (acima de 18–33 m)** e os **contrafortes alinhados com os vãos das travessas** são as áreas de maior impacto visual.
- Os **morros norte** são vistos em escorço lateral ao longo de toda a borda superior direita do quadro, descendo desde os prédios do norte até a avenida, o calçadão, a praia e o **píer quebrado (`Pier_Morro`)**, avançando em promontório costeiro sobre o mar (`X = 36..49`). Essa transição norte -> praia -> píer -> mar é totalmente desimpedida de prédios e recebe atenção prioritária de composição.

### 4.2 Lista curta de alterações prioritárias

1. **Substituir os 15 cones truncados por uma cadeia contínua de maciços, domos, selas e contrafortes**, eliminando todos os topos planos, o espaçamento constante e as frestas com `X = -51` (oeste), `Z = -54` (norte), o canto noroeste e o píer (`Z = -53`).
2. **Esculpir geometricamente grandes planos de granito, nervuras salientes e sulcos/diedros verticais** nas faces voltadas para a câmera (+X e +Z), com normais mistas deliberadas (arestas vivas nas cristas de fratura, suavização longitudinal nos cumes e selas).
3. **Rebalancear drasticamente o orçamento entre rocha e vegetação**, trocando os 525 cones `Copa_morro` por módulos de 3 escalas (grandes massas florestais nas selas/bases, grupos médios de copas orgânicas nos ombros e pequenos bolsões nas fendas/transições), guiados por inclinação, altura variável e orientação.
4. **Criar materiais exclusivos para os morros** (`pedra_morro`, `pedra_umida`, `mata_escura`, `mata_media`, `mata_clara`) com rugosidades diferenciadas (`0,78` a `0,92`) e texturas sem repetição diagonal aparente, preservando intactos os materiais do restante do mapa.
5. **Garantir compatibilidade integral com glTF/GLB (`rio-limites-v002.glb`)**, geometria avaliada sem modificadores pendentes, UVs contínuas para evitar duplicação desnecessária de vértices no binário e preservação de 100% do mapa (`rio-fase01.glb`), do píer, do mar e dos escombros sul.

### 4.3 Distribuição preliminar e realizada do orçamento (`rio-limites-v002.glb`)

| Componente em `03_EXPORT_LIMITES` | Base `v001` (`3d8c0f2`) | Base `v003` (`6e814a3`) | Meta preliminar | Realizado `v004` (`rio-limites-v002.glb`) | Referência Shanghai |
|---|---:|---:|---:|---:|---:|
| **Rocha dos morros (granito + saias/contrafortes)** | 952 tri | 1.020 tri | 5.500 – 7.800 tri | **7.592 tri** (29,6%) | — |
| **Vegetação dos morros (3 escalas)** | 10.852 tri | 12.600 tri | 12.000 – 16.500 tri | **16.002 tri** (60,6%) | — |
| **Mar + espuma (`Limite_Leste_Mar`)** | 1.092 tri | 1.092 tri | 1.092 tri | **1.092 tri** (inalterado) | — |
| **Escombros e veículos sul (`Limite_Sul_Escombros`)** | 1.712 tri | 1.712 tri | 1.712 tri | **1.712 tri** (inalterado) | — |
| **Total de triângulos (`rio-limites`)** | **14.608 tri** | **16.424 tri** | **18.500 – 26.800 tri** | **26.398 tri** (`-2.440` abaixo do teto) | **28.838 tri** |
| **Vértices exportados no glTF** | 27.148 vértices | 30.484 vértices | < 26.000 vértices | **23.853 vértices** (`-21,8%` vs. `v003`) | — |
| **Tamanho do arquivo GLB** | **1.273.244 B** | **1.397.192 B** | **< 1.400.000 B** | **1.373.304 B** (`-23.888 B` menor que `v003`) | **1.500.000 B** |

> **Observação técnica sobre o orçamento em bytes:** Na `v003`, os 16.424 triângulos geravam 30.484 vértices exportados no GLB (`1,397 MB`, a apenas 102 KB do teto de `1,5 MB`) porque todas as faces das 525 copas tinham mapeamento UV por face (`box projection`) com costuras em quase todas as arestas. Ao projetar UVs contínuas por vértice nas massas vegetais e nos panos de rocha e aplicar suavização/arestas vivas seletivas, aumentamos em **7,4× o detalhamento geométrico real da rocha** (`1.020 -> 7.592` triângulos) e expandimos a cobertura vegetal em 3 escalas (`12.600 -> 16.002` triângulos) enquanto **reduzimos** o total de vértices glTF (`30.484 -> 23.853`) e o tamanho em bytes do arquivo `rio-limites-v002.glb` (`1.397.192 B -> 1.373.304 B`) em relação à `v003`.
