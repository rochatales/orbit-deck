# Handoff · Level 02 Rio · Estudo e Refinamento dos Morros Divisórios (`v004` / `rio-limites-v002.glb`)

- **Data:** 15/11/2026
- **Autor / Autoridade de aceite:** Tales Rocha (revisão visual e de jogabilidade pendente do autor)
- **Papel da execução:** Artista técnico de ambiente no Blender `5.1.1 (hash b70da489d7f4)`
- **Worktree isolada da tarefa:** `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace`
- **Branch:** `rochatales/level02-rio-morros` (derivada de `6e814a31e1617030d624bf248864fe081b416334`)
- **Escopo cumprido:** Estudo visual pré-modelagem (`notas/estudo-morros-v004.md`), módulo determinístico dedicado (`scripts/morros.py`), materiais e texturas exclusivas dos morros (`pedra_morro`, `pedra_umida`, `mata_escura`, `mata_media`, `mata_clara`), nova cena editável `blend/rio_fase01_v004.blend`, novo GLB `export/rio-limites-v002.glb`, pacote completo de renders de revisão em `renders/v004/`, auditoria geométrica, testes de regressão e verificação de reimportação glTF.
- **Fora do escopo (preservados intactos):** `layout.py`, `export/layout.json`, `export/rio-fase01.glb` (idêntico bit a bit), `export/rio-limites-v001.glb`, `blend/rio_fase01_v001.blend`, `blend/rio_fase01_v002.blend`, `blend/rio_fase01_v003.blend`, `Pier_Morro` (rampa, tablado caminhável e ponta caída), prédios, quiosques, calçadão, avenida, praia, mar, escombros sul, runtime (`src/`), `docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md` e `docs/SPRINT_STATUS.md`.

---

## 1. Identificação da cena-fonte e nota sobre o conector Blender MCP

### 1.1 Identificação de worktrees e versões antes da edição

Antes de iniciar qualquer edição, foram inspecionadas todas as worktrees do repositório para identificar a fonte efetivamente mais recente sem misturar estados distintos:

| Worktree | Branch / Commit HEAD | `.blend` mais recente | Planta (`export/layout.json`) | Observação |
|---|---|---|---|---|
| `/Users/rochatales/.codex/worktrees/level02-rio-pier/game-workplace` | `rochatales/level02-rio-pier` (`3efbf0a`) | `rio_fase01_v001.blend` (`88504431...`) | `planta-v1` (WIP local não comitado) | Mantida 100% intocada conforme instrução. |
| `/Users/rochatales/Automations/game-workplace/.claude/worktrees/exoden-design-sprints-397366` | `claude/level02-rio-pier` (`6e814a3`) | `rio_fase01_v003.blend` (`4e7dd038...`) | `rio-fase01-planta-v2` (`5fa80411...`) | **Fonte comitada efetivamente mais recente**, já contendo `v001`, `v002` (píer completo) e `v003` (passe de destruição + píer). |
| `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace` | `rochatales/level02-rio-morros` (base `6e814a3`) | `rio_fase01_v004.blend` (`1c57381c...`) | `rio-fase01-planta-v2` (`5fa80411...`) | Worktree isolada criada a partir de `6e814a3` para este refinamento. |

### 1.2 Limitação do conector Blender MCP

- Nesta sessão, não há servidor/ferramenta MCP do Blender conectado ao ambiente (`list_mcp_servers` / ferramentas MCP indisponíveis, e o add-on `bl_ext.lab_blender_org.mcp` não estava ativo).
- Conforme determinado na seção 1 do prompt, essa limitação é registrada de forma transparente: toda a inspeção da cena real (`rio_fase01_v003.blend` e `rio_fase01_v004.blend`), reconstrução determinística, auditoria, reimportação de GLB e renderização Cycles foi executada diretamente no binário oficial `/Applications/Blender.app/Contents/MacOS/Blender` (`Blender 5.1.1`, hash `b70da489d7f4`) via scripts Python reprodutíveis, sem descrever chamadas de linha de comando como ações do MCP.
- Cena confirmada no Blender 5.1.1: unidades `METRIC` (`scale_length = 1.0`), convenção `Blender X = x, Y = -z, Z = altura` (exportada em glTF como `X = x, Y = altura, Z = z`), coleções `00_REFERENCIA_PLANTA`, `01_KIT_LAYOUT_EDITAVEL`, `02_EXPORT_MAPA`, `03_EXPORT_LIMITES`, `04_COLISAO_RESERVAS`, `05_CAMERAS_LUZ` e 15 câmeras ortográficas configuradas com gerenciamento de cor `AgX`.

---

## 2. O que muda na naturalidade das montanhas, na transição com a vegetação e na leitura das sombras

### 2.1 Naturalidade e hierarquia dos volumes de granito costeiro (`Limite_Oeste_Morro` e `Limite_Norte_Morro_Escombros`)

- **Substituição dos 15 troncos de cone (`Rocha_morro`) por uma cadeia contínua e assimétrica:** Na `v003`, os morros tinham apenas `1.020` triângulos de rocha (`7,5%` do orçamento dos morros), formados por 15 troncos de cone de 9 lados com topo horizontal plano e espaçamento regular (`16 m` no oeste, `12 m` no norte), deixando frestas físicas de `1,5 m a 3,1 m` entre os morros e as bordas do mapa (`X = -51 m` e `Z = -54 m`).
- **Embasamento contínuo e eliminação de 100% das frestas:** Foram criados quatro embasamentos contínuos (`Granito_Embasamento_Oeste`, `Granito_Saia_Umida_Oeste`, `Granito_Embasamento_Norte`/`Granito_Embasamento_Pier` e `Granito_Saia_Umida_Norte`/`Granito_Saia_Umida_Pier`) cravados exatamente em `X = -51,02 m` (oeste), `Z = -54,02 m` (norte) e em rampa suave até `Z = -53,02 m` junto ao píer (`X = 21,5..45,8 m`), vedando qualquer fresta entre o terreno e os morros.
- **Hierarquia de picos, ombros, selas e promontório costeiro:**
  - **Cadeia Oeste (`Limite_Oeste_Morro`):** 7 maciços articulados com alturas, larguras e inclinações distintas — desde o pico dominante central (`Granito_Pico_Oeste_Dominante`, `37,3 m`), o pico médio norte (`34,6 m`), o maciço sul (`33,0 m`) e o maciço do canto noroeste (`31,8 m`) até os ombros e contrafortes mais baixos (`22,4 m a 24,8 m`) alinhados com os corredores visuais das travessas (`Z = 34`, `Z = 0`, `Z = -34`), complementados por 15 placas secundárias de esfoliação (`Placa_Oeste_0..14`) inclinadas para dentro do corpo rochoso em ambas as faces (`+X` e `-X`).
  - **Cadeia Norte e Ponta do Píer (`Limite_Norte_Morro_Escombros`):** 6 maciços costeiros principais (`18,8 m a 30,5 m`) que descem em escala até 3 promontórios rochosos (`Granito_Promontorio_Pier_Oeste` com `11,4 m`, `Granito_Promontorio_Pier_Leste` com `9,4 m` e `Granito_Ponta_Mar_Pier` com `5,0 m`) e 11 placas/matacões costeiros (`Placa_Norte_0..10`), abraçando a rampa, o tablado e a ponta caída do `Pier_Morro` sobre o mar sem invadir a área caminhável.
- **Coroamentos convexos e diedros esculpidos:** Todos os topos planos foram substituídos por perfis parabólico-convexos de domo/crista com ápice baricêntrico, nervuras dorsais salientes (`spurs`) e caneluras verticais côncavas (`flutes`), mantendo áreas amplas calmas para contraste estilizado.

### 2.2 Transição orgânica entre rocha e vegetação em 3 escalas

- **Fim dos 525 cones truncados repetidos (`Copa_morro`) e da faixa verde horizontal:** Na `v003`, `92,5%` dos triângulos dos morros (`12.600` triângulos) estavam em 525 cones truncados idênticos de 7 lados colados em grade uniforme. Na `v004`, a vegetação usa módulos multi-lobados em **3 escalas** e **3 materiais tonais** (`mata_escura`, `mata_media`, `mata_clara`), projetados por raycast (`BVHTree`) diretamente sobre a malha real dos maciços com embutimento proporcional à inclinação:
  1. **Escala 1 — Grandes massas florestais (`Mata_massa_a`, `Mata_massa_b`, 3 lobos coalescidos):** Assentadas nas bases, gargantas e selas onde o solo se acumula, subindo até `24–30 m` nos vales entre picos.
  2. **Escala 2 — Agrupamentos médios de copas (`Mata_grupo_a`, `Mata_grupo_b`, `Mata_grupo_c`, 1–2 lobos assimétricos):** Distribuídos nos ombros intermediários e patamares de meia-encosta (`8–22 m`).
  3. **Escala 3 — Pequenos bolsões de fenda e borda (`Mata_moita_a`, `Mata_moita_b`):** Posicionados nas quebras de inclinação entre a mata e o granito exposto e nos ombros costeiros acima do píer, quebrando qualquer linha contínua de transição.
- **Preservação das grandes faces de granito exposto:** O teto de vegetação varia organicamente em função das selas e escarpas (`west_veg_ceiling` e `north_veg_ceiling`), deixando os domos superiores e os paredões íngremes de granito limpos e legíveis na câmera do jogo.

### 2.3 Leitura das sombras: separação entre melhorias de modelagem e sugestões de iluminação

- **O que vem da modelagem, das normais e dos materiais (aplicado na cena principal `v004` sem alterar a luz do jogo):**
  - As nervuras dorsais (`spurs`), as placas de esfoliação (`Placa_Oeste_*`, `Placa_Norte_*`) e os sulcos verticais côncavos (`flutes`) criam alternância geométrica real entre planos iluminados e diedros sombreados mesmo sob a iluminação padrão da `v003` (`Sol_fim_de_tarde`, rotação `(0.45, -0.5, -0.7)`).
  - As normais usam suavização deliberada com arestas vivas seletivas nas cristas verticais de fratura (`sharp_deg = 8,5°` para arestas verticais e `32°` para transições horizontais na rocha; suavização contínua nas copas orgânicas), preservando os planos estilizados de EXODEN sem anéis horizontais facetados.
  - A diferenciação de rugosidade (`pedra_umida = 0,74`, `pedra_morro = 0,84`, `mata_clara = 0,80`, `mata_media = 0,86`, `mata_escura = 0,92`) e as estrias verticais suaves de escorrimento mineral reforçam a leitura de profundidade até mesmo sob iluminação branca neutra (`luz_neutra_geral.png` e `luz_neutra_oeste.png`).
- **O que é sugestão opcional de iluminação de revisão (não altera o `.blend` salvo nem o runtime):**
  - Foi gerada separadamente a imagem `renders/v004/proposta_luz_revisao_lateral.png` com incidência solar mais lateral (`rotation_euler = (0.58, -0.62, -0.42)`), mantendo a cor e a energia quentes de fim de tarde. Essa incidência mais rasante acentua as sombras projetadas pelos contrafortes sobre os diedros de granito e fica registrada apenas como referência visual caso o autor deseje futuramente ajustar o sol do mapa. Na cena `rio_fase01_v004.blend`, o `Sol_fim_de_tarde` permanece com os parâmetros originais exatos da `v003`.

---

## 3. Arquivos gerados, preservados e hashes SHA-256

| Arquivo | Papel | Tamanho (bytes) | SHA-256 | Status |
|---|---|---:|---|---|
| [rio_fase01_v001.blend](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/blend/rio_fase01_v001.blend) | Cena Blender base `v001` | `3.521.721` | `885044315450f073679570aa5c9b845f2ba451a4b212b986a3f4460c5dbb2169` | Preservado intacto |
| [rio_fase01_v002.blend](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/blend/rio_fase01_v002.blend) | Cena Blender `v002` (píer) | `3.907.359` | `fee90d6cf9433482fa4d5162d51cacef2ecc7f19a1aab8e6c50eee46ebdf7efb` | Preservado intacto |
| [rio_fase01_v003.blend](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/blend/rio_fase01_v003.blend) | Cena Blender `v003` (fonte imediata) | `4.235.579` | `4e7dd03834bd43d7ec1e9b2c7366074fbcfbe35cd087c77b76cb91a395513086` | Preservado intacto |
| [rio_fase01_v004.blend](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/blend/rio_fase01_v004.blend) | **Nova cena Blender editável `v004`** | `4.334.188` | `1c57381c712c1382cfa1b0e983218d5cd22176d852545de0ae99d52a43b51c42` | **Novo (`v004`)** |
| [layout.json](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/export/layout.json) | Planta `rio-fase01-planta-v2` | `25.114` | `5fa804116491046a8b589beb0ede78f6c6118ca09d282e17cc6e4e3e3c90e2b7` | Preservado bit a bit |
| [rio-fase01.glb](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/export/rio-fase01.glb) | GLB do mapa jogável (`v003`/`v004`) | `5.598.136` | `354e2ae5965d12e90abc36d1c6ddb2f2f1c44688c6ec92a8c43443382eb0fdee` | Preservado bit a bit |
| [rio-limites-v001.glb](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/export/rio-limites-v001.glb) | GLB anterior dos limites (`v003`) | `1.397.192` | `f8e1c620e76eb497fb68a60c79af5a6f4cd32b9e657828ea16ebd802a9a08c3a` | Preservado intacto |
| [rio-limites-v002.glb](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/export/rio-limites-v002.glb) | **Novo GLB dos limites (`v004`)** | `1.373.304` | `27f18e814d766a39865fe872a9cbd13d7ec9420aaf9380860cf730d057ab17fd` | **Novo (`v002`)** |
| [estudo-morros-v004.md](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/notas/estudo-morros-v004.md) | Estudo visual obrigatório pré-modelagem | `14.872` | `363803f744f3f29350d9cbc4ae113f2160405e1d1b96caceae6a41582b786ae9` | Novo |
| [morros.py](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/scripts/morros.py) | Módulo determinístico dos morros (`v004`) | `46.518` | — | Novo |
| [rio-fase01-v004.json](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/notas/rio-fase01-v004.json) | Relatório da auditoria geométrica `v004` | `31.839` | `fe55736da86b9d91d330303ee172053ab4ac3be1c7967f4eef6fea2d76259d2d` | Novo |
| [testes-auditoria-v004.json](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/notas/testes-auditoria-v004.json) | Relatório dos 7 testes de regressão | `692` | `61e3067e85dcc17263a38cbd7c557e97684c671f49afcc149bb785c7c9597f9f` | Novo |
| [verificacao-glb-limites-v002.json](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/notas/verificacao-glb-limites-v002.json) | Verificação de reimportação e comparativo GLB | `6.142` | `52d1d9d5303ad8dab95c3c3300dd83d41f59e308a3d92bd50d8c3e0ae16903a9` | Novo |

---

## 4. Relatório comparativo antes e depois (geometria, materiais e arquivos)

| Métrica | `rio-limites-v001.glb` (`v001`, commit `3d8c0f2`) | `rio-limites-v001.glb` (`v003`, commit `6e814a3`) | `rio-limites-v002.glb` (`v004`, novo) | Teto de referência (Shanghai) |
|---|---:|---:|---:|---:|
| **Triângulos totais (`03_EXPORT_LIMITES`)** | `14.608` | `16.424` | **`26.398`** | `28.838` (`-2.440` de margem) |
| — *Rocha dos morros (`pedra_morro` + `pedra_umida`)* | `952` (`6,5%`) | `1.020` (`6,2%`) | **`7.592` (`28,8%`)** | — |
| — *Vegetação dos morros (`mata_escura/media/clara`)* | `10.852` (`74,3%`) | `12.600` (`76,7%`) | **`16.002` (`60,6%`)** | — |
| — *Mar + espuma (`Limite_Leste_Mar`)* | `1.092` (`7,5%`) | `1.092` (`6,6%`) | **`1.092` (inalterado)** | — |
| — *Escombros + veículos sul (`Limite_Sul_Escombros`)* | `1.712` (`11,7%`) | `1.712` (`10,4%`) | **`1.712` (inalterado)** | — |
| **Vértices exportados no glTF** | `27.148` | `30.484` | **`23.853` (`-21,8%` vs. `v003`)** | — |
| **Malhas / Primitivas / Nodes no GLB** | `25 / 25 / 25` | `25 / 25 / 25` | **`44 / 44 / 44`** | — |
| **Materiais no GLB dos limites** | `9` | `9` | **`13`** (5 exclusivos dos morros + 8 dos limites sul/leste) | — |
| **Imagens PNG embutidas (sem links externos)** | `7` (`256×256`) | `7` (`256×256`) | **`11` (`256×256`, 100% embutidas)** | — |
| **Tamanho do arquivo GLB (bytes)** | `1.273.244 B` | `1.397.192 B` | **`1.373.304 B` (`-23.888 B` vs. `v003`)** | `1.500.000 B` (`-126.696 B` de margem) |
| **Desvio máximo de exportação (`max_desvio_exportacao_m`)** | `0,0 m` | `0,0 m` | **`0,0 m`** | `< 0,0001 m` |

---

## 5. Verificações executadas

1. **Reconstrução determinística completa no Blender 5.1.1:**
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/build_blender.py
   ```
   - `rio-fase01.glb` permaneceu idêntico bit a bit (`57.137` triângulos, `5.598.136` bytes, SHA-256 `354e2ae5965d12e90abc36d1c6ddb2f2f1c44688c6ec92a8c43443382eb0fdee`).
   - A sequência pseudoaleatória `R = random.Random(13112026)` foi avançada pelo número exato de chamadas do loop antigo dos morros (`1.076` chamadas), preservando na mesma posição todas as peças subsequentes (`Limite_Sul_Escombros` e `Limite_Leste_Mar`).
2. **Auditoria geométrica contra a planta (`audit_view.py`):**
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/audit_view.py
   ```
   - Resultado: `erros: []`, `deck_livre: true`, `terra_dentro_x36: true`, `vias_livres: true`, `destrocos_no_colisor: true`, `pier_na_planta: true`, `emissao_exterior: 0`.
3. **Testes de regressão por falhas injetadas em memória (`test_audit.py`):**
   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/test_audit.py
   ```
   - Resultado: `REGRESSAO_AUDITORIA 7 casos passaram` (relatório salvo em `art-source/rio-fase01/notas/testes-auditoria-v004.json`).
4. **Verificação do GLB reimportado em cena limpa (`verificacao-glb-limites-v002.json`):**
   - `44` objetos de malha reimportados, `26.398` triângulos verificados, `0` normais inválidas/invertidas, `0` erros de cálculo de tangentes (`calc_tangents()`), `0` malhas sem UV, `11` texturas `256×256` embutidas (`packed: true`) e `0` links externos quebrados.
5. **Testes e build do repositório:**
   - `npm test`: todos os testes automatizados passaram (`exit code 0`).
   - `npm run build`: build Vite concluído com sucesso (`✓ built in 8.25s`).
   - `git diff --check`: zero erros de formatação ou espaço em branco.

---

## 6. Guia de inspeção dos renders de revisão em disco

Todos os renders solicitados na seção 6 foram gerados em `1361 × 851 px` (Cycles, `AgX`) e salvos em `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/`:

### Pacote principal de revisão (8 itens exigidos)

1. **Antes e depois na câmera do jogo (`CAM_Jogo`) com os mesmos parâmetros (câmera, exposição, luz e AgX):**
   - Antes (`v003`): [antes_jogo_v003.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/antes_jogo_v003.png)
   - Depois (`v004`): [depois_jogo_v004.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/depois_jogo_v004.png) (idêntico a [jogo.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/jogo.png))
2. **Vista geral do mapa com os volumes completos (`CAM_Geral`):**
   - [geral.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/geral.png)
3. **Vista superior ortográfica dos limites oeste e norte (`CAM_Topo`):**
   - [topo.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/topo.png)
4. **Detalhe aproximado do encontro rocha/vegetação no oeste:**
   - Vista interna pelo ângulo do mapa: [detalhe_oeste_rocha_mata.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/detalhe_oeste_rocha_mata.png)
   - Vista externa oeste (`CAM_Morro`): [morro.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/morro.png)
5. **Detalhe aproximado da ponta norte com praia, mar e píer:**
   - Enquadramento completo do píer e promontório (`CAM_Pier`): [detalhe_norte_pier_mar.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/detalhe_norte_pier_mar.png) (e [pier.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/pier.png))
   - Close na ponta caída e rocha costeira (`CAM_Pier_ponta`): [pier_ponta.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/pier_ponta.png)
6. **Clay pass do refinamento (com AO moderado, sem influência de cor de material):**
   - Vista geral em clay: [clay_geral.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/clay_geral.png)
   - Close oeste interno em clay: [clay_oeste.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/clay_oeste.png)
   - Close oeste externo em clay: [clay_morro.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/clay_morro.png)
7. **Malha / Wireframe mostrando a distribuição de geometria:**
   - Vista geral da malha: [malha_geral.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/malha_geral.png)
   - Close oeste interno da malha: [malha_oeste.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/malha_oeste.png)
   - Close oeste externo da malha: [malha_morro.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/malha_morro.png)
8. **Comparação em luz neutra e proposta opcional de luz lateral de revisão:**
   - Luz neutra (vista geral): [luz_neutra_geral.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/luz_neutra_geral.png)
   - Luz neutra (close oeste): [luz_neutra_oeste.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/luz_neutra_oeste.png)
   - Proposta opcional de luz lateral de revisão: [proposta_luz_revisao_lateral.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/proposta_luz_revisao_lateral.png)

### Demais câmeras de auditoria da cena (`v004`)

- [avenida.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/avenida.png)
- [rua_fundo.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/rua_fundo.png)
- [calcadao.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/calcadao.png)
- [predio.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/predio.png)
- [quiosque.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/quiosque.png)
- [praca.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/praca.png)
- [deck.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/deck.png)
- [escombros.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/escombros.png)
- [linha_dagua.png](file:///Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace/art-source/rio-fase01/renders/v004/linha_dagua.png)

---

## 7. Status e solicitação de revisão

- Nenhum merge ou push foi realizado, o runtime (`src/`) não foi alterado e os documentos de plano/status (`docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md` e `docs/SPRINT_STATUS.md`) não foram tocados.
- Os entregáveis aguardam **revisão visual e aceite exclusivo do autor (Tales Rocha)** antes de qualquer integração do `rio-limites-v002.glb` ao jogo.
