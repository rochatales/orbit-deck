# Relatório Técnico — Laboratório com Máquina Sintetizadora de Diamantes

## 1. Visão Geral do Ativo
- **Nome Oficial:** Laboratório com Máquina Sintetizadora de Diamantes // Setor Técnico (`v001`)
- **Categoria:** Cenário Modular / Instalação Científica de Produção com Maquinário Central (Fase 01)
- **Diretório Isolado:** [`art-source/laboratorio-sintetizador/`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador)
- **Referências Visuais:**
  - Estudo de Produto da Máquina: [`referencia/maquina_estudo.jpg`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/referencia/maquina_estudo.jpg)
  - Render Detalhado da Máquina: [`referencia/maquina_render.jpg`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/referencia/maquina_render.jpg)
  - Estudo Arquitetural do Laboratório: [`referencia/laboratorio_estudo.jpg`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/referencia/laboratorio_estudo.jpg)
- **Arquivos Gerados:**
  - Blender: [`blend/laboratorio_sintetizador_v001.blend`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/blend/laboratorio_sintetizador_v001.blend)
  - Runtime glTF: [`export/laboratorio_sintetizador_v001.glb`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/export/laboratorio_sintetizador_v001.glb)

---

## 2. Métricas de Geometria e Orçamento Low-Poly

| Métrica | Valor Obtido | Meta / Limite | Status |
|---|---|---|---|
| **Triângulos Totais** | **7.382** | `<= 15.000` | Aprovado (`49,2%` do orçamento) |
| **Polígonos (Faces)** | **3.527** | — | Malha limpa 100% manifold |
| **Vértices** | **4.453** | — | — |
| **Objetos de Malha** | **1 (`LaboratorySynthesizerMesh`)** | `1` (Draw Call único) | Aprovado |
| **Dimensões do Conjunto (`X × Y × Z`)** | `15,5 m × 11,8 m × 4,0 m` | Planta 14x10m com baia central 6x5m | Aprovado |
| **Dimensões da Máquina (`X × Y × Z`)** | `3,3 m × 2,5 m × 2,4 m` | Conforme cota do estudo de produto | Aprovado |
| **Ossos na Armature** | **9 ossos (`LaboratorySynthesizerArmature`)** | Rig funcional de maquinário e portas | Aprovado |
| **Animações NLA** | **4 clips (`Idle_Ready`, `Synthesizing`, `Drawer_Dispense`, `Standby_PowerDown`)** | Embutidos no `.glb` | Aprovado |

---

## 3. Anatomia Visual e Fidelidade às Referências

1. **Máquina Sintetizadora de Diamantes (Centro da Instalação):**
   - **Corpo Principal Marfim e Aço Escuro:** Carcaça modular bege-marfim chanfrada com blocos estruturais laterais, câmara central aberta, cabeçotes de extremidade reforçados, espinha superior corrugada e calhas de ventilação.
   - **4 Bancos de Bobinas de Cobre Maciço:** Enrolamentos toroidais em cobre avermelhado de alto brilho metálico (`metallic: 0.92, roughness: 0.20`), berços de sustentação e barramentos coletores de alta tensão.
   - **Câmara de Síntese Cilíndrica e Visor com Abertura e Anel Ciano:** Colar flangeado frontal (`add_pipe_ring`) com parafusos sextavados perimetrais, anel emissivo ciano interno e visor aberto que permite visão direta e desobstruída do interior.
   - **Núcleo Interno Energético:** Diamante lapidado flutuante centralizado (`radius: 0.32m, height: 0.48m`), 4 pinças/garras de eletrodos em aço escuro com pontas de cobre orientadas para as faces do cristal e planos de descarga de arco elétrico/plasma ciano com emissão vibrante.
   - **Montagem de Pistões e Hastes:** Hastes hidráulicas estabilizadoras longitudinais cromadas e atuador vertical superior de prensagem.
   - **Console Frontal e Gaveta de Coleta:** Painel de comando com tela digital ciano, manômetros analógicos com marcadores e gaveta deslizante inferior para recolhimento do diamante sintetizado.
   - **Plinto com Faixa Hazard:** Base industrial chanfrada com faixas zebradas amarela e preta, suportes de ancoragem e dutos radiais de cabos partindo em direção ao piso.

2. **Arquitetura do Laboratório em Corte 90° (Corner Cutaway Interior View):**
   - **Paredes de Fundo (Norte e Leste) em Altura Plena (3,6 m):** Revestimento modular cinza-claro (`#D6D4CC`), rodapé escuro, janela/painel de observação com iluminação âmbar acolhedora, dutos aéreos de energia e caixa de força industrial com sinalização.
   - **Paredes Frontais (Sul e Oeste) em Meia-Altura (0,85 m):** Peitoril rebaixado com acabamento arredondado que garante visibilidade desobstruída para a câmera isométrica do jogo sem ocluir os personagens e a máquina.
   - **Portais de Acesso:** Portal da câmara de descompressão (West Airlock) a oeste e portal de serviço para carga/descarga com rampa externa (South Service Door) ao sul.
   - **Piso Modular com Faixa Técnica (6 × 5 m):** Placas de ardósia cinza com perímetro em faixas zebradas amarela e preta delimitando a baia da máquina e margem de circulação de 1,5 m ao redor.

3. **Mobiliário Científico e Adereços da Instalação:**
   - **Bancada de Análise (Parede Norte):** Mesa metálica longa equipada com computador de monitor duplo, teclado, espectrômetro/scanner óptico e organizadores de amostras.
   - **Bancada de Recepção / Triagem (Parede Oeste):** Mesa de trabalho lateral com terminal de monitoramento e caixa de ferramentas.
   - **Caixas de Suprimentos:** Três caixotes industriais de madeira/aço empilhados junto à bancada de recepção e dois adicionais junto à parede norte.
   - **Armários de Amostras (Parede Leste):** Bateria de 3 armários verticais altos (lockers) com fendas de ventilação e puxadores de aço escovado.
   - **Console de Operação / Ativação (Parede Leste):** Estação de comando angulada com monitores âmbar duplos posicionada na área de aproximação frontal da máquina.

---

## 4. Texturas PBR 2K e Animações

- **Atlas PBR Unificado (`2048 × 2048`):**
  - [`texturas/laboratorio_basecolor.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/texturas/laboratorio_basecolor.png)
  - [`texturas/laboratorio_orm.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/texturas/laboratorio_orm.png)
  - [`texturas/laboratorio_normal.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/texturas/laboratorio_normal.png)
  - [`texturas/laboratorio_emission.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/texturas/laboratorio_emission.png)
- **Trilhas NLA Exportadas:**
  - `Idle_Ready` (levitação suave com rotação lenta do diamante + pulsação sutil dos arcos de plasma + respiração operacional da máquina)
  - `Synthesizing` (alta rotação do cristal, compressão dos pistões hidráulicos e surto elétrico de plasma ciano na câmara)
  - `Drawer_Dispense` (abertura e avanço da gaveta frontal para entrega do diamante gerado, seguido de retração)
  - `Standby_PowerDown` (fechamento de portas, repouso do diamante e transição para modo de baixo consumo em espera âmbar)

---

## 5. Folhas de Renderização e Pranchas de Validação

| Prancha de Validação | Arquivo | Conteúdo |
|---|---|---|
| **Comparação Referência vs 3D** | [`renders/folha_comparacao_referencia_x_3d.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/renders/folha_comparacao_referencia_x_3d.png) | Estudo conceitual 2D lado a lado com o render 3D em corte isométrico |
| **Turnaround 2x2 Vistas** | [`renders/folha_turnaround_2x2_vistas.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/renders/folha_turnaround_2x2_vistas.png) | Vistas Frontal, Lateral Oeste, Posterior Elevada e Isométrica 3/4 |
| **Wireframe 4 Vistas** | [`renders/folha_wireframe_4_vistas.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/renders/folha_wireframe_4_vistas.png) | Topologia otimizada e densidade poligonal nas 4 vistas |
| **4 Animações 3D** | [`renders/folha_4_animacoes_3d.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/renders/folha_4_animacoes_3d.png) | Quadros-chave dos 4 modos (`Idle_Ready`, `Synthesizing`, `Drawer_Dispense`, `Standby_PowerDown`) |
| **Zoom Máximo de Jogo** | [`renders/jogo_zoom_maximo.png`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/renders/jogo_zoom_maximo.png) | Ângulo de câmera em perspectiva do gameplay real do Horda Survivor |
