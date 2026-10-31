# Control Room — Central de Comando EDEN v001

Candidato isolado de modelagem/exportação para S6.12. Base **f1756c4**, a ponta consolidada em commit da colônia/Quartel v006, preservada; branch `rochatales/s6.12-control-room`. Registro prévio no quadro da integração: `0580785`, em 31/10/2026. Nenhum arquivo de runtime foi alterado. Avaliação visual e jogabilidade continuam com o autor.

## Resultado e implantação

**8.212 triângulos**, 26 objetos semânticos, dois materiais compartilhados, atlas PBR 2048². A contagem inclui arquitetura, interior, console e projeção. Nenhum mesh antigo ou personagem foi reutilizado no GLB. A sala anterior só é importada para os renders de comparação. O Explorador r7 foi importado separadamente no estudo `14_escala_explorador.png`, com a escala real 0,857: altura avaliada em Idle **1,48985 m**. Seu mesh não integra o GLB da sala; referência e hash estão em `notas/escala_explorador.json`.

Dimensão nominal 7 × 6,5 m, centro mundial do jogo **(0; −10,5)**, vãos nominais de 2,2 m ao sul e a leste (os batentes deixam ~2,14 m de passagem geométrica e ~2,20 m de altura). Mantida a segunda entrada funcional, embora a referência ilustre principalmente a fachada sul. Corpo/pedestal respeitam a implantação; caixilhos, conduítes e portal têm pequenas saliências além do casco, documentadas nos bounds do manifesto. Altura da cobertura ~3,04 m, antena ~4,13 m. Piso estrutural em Y=0, com linhas decorativas até 5 mm acima; pedestal enterrado de −0,15 a 0 m. Todos os móveis e folhas de porta assentam no nível 0, permitindo omitir `PIS_Control` ao reutilizar o piso original sem deixar a sala suspensa.

Blender em metros: X = jogo X, Y = −jogo Z, Z = jogo Y. O GLB sai Y-up, nas coordenadas mundiais do jogo. Não reaplicar translação (0; −10,5) ao integrá-lo.

A arquitetura usa casco creme, faixa salmão, rodapé grafite e vidros petróleo; um piso modular de estudo mantém a leitura de placas industriais da colônia. **Não é cópia exata da textura/material dos tiles v006**. O piso compartilhado do mapa não foi tocado. Na integração, a preservação exata dos tiles atuais pode ser feita reutilizando o piso existente e omitindo `PIS_Control`.

O modelo foi criado pelo Blender 5.1.1 instalado, via Python headless: não havia MCP Blender exposto nesta sessão. Scripts, imagens e atlas são locais. A referência JPG foi copiada sem modificar o original.

## EDEN, console e menus

Console de escala compatível com o Explorador: superfície inclinada a ~1,1 m, pedestal central, emissor separado e anéis/core ciano. O estudo representa EDEN abstratamente conforme o conceito; não substitui o NPC ativo e não altera o estudo independente `art-source/eden/`.

Na base examinada, `src/scene/OfficeScene.tsx` instancia EDEN por `EDEN_CHARACTER_ASSET` (`src/characters/characterAssetConfig.ts`), ainda usando `brand-brain.glb`. O Explorador tem altura visual de 1,5 m; cápsula de altura 1,25 m e raio 0,32 m em `playerConfig.ts`.

O menu disponível no local é o painel de briefing, `openEden()` em `useExpeditionStore.ts`, exibido no `App.tsx`. O painel de nave concentra destino/viagem e seleção de encontro; pausa/áudio também são interfaces separadas. Não existe nesta base um hub de menus já operável pelo console central. O manifesto prepara `INTERACT_Control_EDEN` para reutilizar `openEden`; não antecipa menus ou funcionalidades novas.

Ponto proposto: jogo (0; 0; −8,9), a 1,6 m do centro atual de EDEN, dentro do raio existente de 2,7 m. A raiz do jogador não deve ser colocada dentro do pedestal. Não há `[E]` pintado: o indicador pertence à UI do jogo.

## Estados e visibilidade

- Repouso: console, emissor e projeção visíveis; `PROP_Control_Interacao` inicialmente oculto.
- Interação: o runtime pode mostrar os dois indicadores adicionais. Essa mudança usa metadados, não uma animação glTF de intensidade luminosa.
- As quatro folhas das portas são objetos separados, inicialmente fechados e sem sobreposição na verga. **São folhas estáticas para edição, não portas prontas para deslizar**: não há bolso lateral nem mecanismo projetado. A integração deve definir um mecanismo que não atravesse janelas/batentes antes de movimentá-las. Não há clipes ou código de abertura nesta entrega.
- Teto `TET_Control`; antena, ventilação e letreiros em `PROP_Control_Telhado`; luminárias em `TET_Control_Luminarias`. Os dois últimos dependem explicitamente do teto.
- O fechamento de suporte esconde os três IDs do conjunto, mantendo todas as paredes visíveis. Não foi alterado o contrato de ocultação do runtime.
- A maquete `07_maquete_interior.png` remove paredes sul/oeste para explicar o interior. É exclusivamente uma vista de estudo; `06_interior_sem_teto.png` mostra a condição com paredes preservadas.

Cada objeto traz `id_estavel`, `papel`, `ambiente`, `estado_inicial`, `estado_operacao`, `apoiado_em`, `apoiado_em_todos`. As relações nos extras do GLB são JSON em string (para preservar listas vazias no Blender); o manifesto externo contém arrays nativos. O integrador deve decodificar as strings antes de resolver IDs, ou usar o manifesto. `estado_inicial` deve ser aplicado explicitamente: glTF não conserva visibilidade oculta.

## Física e circulação propostas

As caixas em `colliders_proposed` são apenas metadados, não entram como meshes no GLB. Paredes, piso, console e móveis principais têm envelopes simples. Antes de integrar, completar caixas dos batentes e das folhas móveis, sincronizar suas posições reais e revisar encaixes na física do jogo. Não usar os triângulos visuais como física.

`validate_circulation.py`: grid 5 cm, círculos contra AABBs, portas abertas, sem atalhos pelo lado externo. Quatro destinos alcançados com raios 0,32 e 0,36 m: console, entrada leste, frente do rack e consoles norte. Não é simulação Rapier nem aprovação de jogabilidade. Caminhos e distância da interação em `notas/circulacao.json` e `renders/planta_circulacao.png`.

## Exportação e verificação

`validate_control_room.py` reimporta o GLB numa cena limpa e confere IDs únicos, conjunto completo de objetos, suportes, estados, escala 1, contagens e comparação bidirecional de posições. Compara também as normais por canto na mesma posição mundial, respeitando as descontinuidades das arestas. Resíduos microscópicos de chanfro foram dissolvidos antes de exportar; sem faces de área zero. Erros medidos, fechamento do teto e hashes em `notas/roundtrip.json`.

`tests/control-room-asset.test.mjs` lê o GLB real, os PNGs embutidos 2K, contagem ≤10k, dois materiais, vidro alpha BLEND, metadados, quatro folhas de porta, suportes e vínculos SHA-256 dos artefatos. Os testes de circulação verificam os dados gerados pelo script de análise; executar o script é necessário após mudar os envelopes.

Renders em Cycles com iluminação de estúdio. `10_camera_jogo_estudo.png` reproduz direção de câmera ortográfica e escala máxima a partir de `CameraRig.tsx`/`cameraFraming.ts`, para 1000 × 900, limites de Marte 44 × 54 m. **É um render do Blender, não screenshot do jogo**, e a diferença de iluminação/tone mapping ainda exige comparação no navegador.

A comparação anterior extrai arquitetura e props com `ambiente=brand-brain` do GLB v007. Não inclui personagem ou toda a malha compartilhada do terreno/pisos da colônia. As câmeras são as mesmas para cada par.

## Reprodução

1. Python com Pillow/numpy: `scripts/make_atlas.py`.
2. Blender headless: `--factory-startup --python scripts/build_control_room.py`.
3. Blender headless: `--factory-startup --python scripts/validate_control_room.py`.
4. Python: `scripts/validate_circulation.py`.
5. Blender headless: `--factory-startup --python scripts/render_control_room.py`.
6. Python com Pillow: `scripts/compose_sheets.py`.
7. Blender headless: `--factory-startup --python scripts/render_scale.py`, para a conferência adicional com o personagem padrão.

Scripts resolvem diretórios pelo próprio arquivo. A comparação anterior depende de `src/assets/colony-v007.glb`/manifesto da base indicada; o atlas usa a referência no caminho original apenas para copiá-la. Renderizar e validar não salva sobre a fonte. Reconstrução é determinística, mas substitui os arquivos gerados: preserve qualquer revisão manual em uma nova versão antes de executá-la.

## Revisão técnica

Revisão Claude do commit inicial `31e8b29`: letreiro EDEN, nível do piso, descrição das portas, estado inicial na fonte, envelopes dos tampos, cache Python e verificações de implantação. Letreiro recebeu suporte visível; fonte abre em repouso; piso/móveis foram alinhados ao nível 0; portas fechadas tiveram largura/altura ajustadas para evitar sobreposição. Abertura fica explicitamente fora da preparação deste candidato estático. Envelopes dos tampos foram ampliados; teste passou a ler bounds reais. Cache gerado localmente foi retirado do Git e ignorado, sem apagar arquivo.

Confirmação intermediária revisou as primeiras correções e encontrou um gabinete 3 cm suspenso e o envelope do rack 3 cm curto. O gabinete foi assentado e ganhou suportes de monitores; os envelopes agora cobrem os limites reais de console, rack e consoles norte em três eixos. Novo teste verifica base dos móveis, volumes e afastamento entre folhas. Letras receberam altura/assentamento ajustados, luminárias de status foram embutidas no suporte e o estado oculto passou a valer também em render F12 da fonte.

A revisão final confirmou os pontos principais e observou a bandeja de teclado apoiada só pela aresta. Foram adicionadas três chapas sob os teclados, com 4 cm de engaste no gabinete, e ampliado o envelope correspondente. Contagem final: 8.212 triângulos.
