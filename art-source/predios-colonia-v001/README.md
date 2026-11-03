# Três prédios da colônia · S6.12

Fontes copiadas sem alterar de `orbit_deck_buildings2` do autor. Os seis hashes
completos estão em `notas/fontes.json`. Na implantação inicial (`783eb44`), os GLBs runtime eram cópias byte a byte.
O ajuste de 03/11 gera variantes v002 em `export/` pelo script `padronizar.py`,
usando somente as cópias GLB e a Control Room ativa como referência. Os `.blend`
foram abertos só para leitura no Blender 5.1.1. Objetos COL são empties; o tamanho de desenho 0,2 não representa
a caixa de colisão. A escala codifica a meia extensão, coerente com paredes e
móveis; o runtime usa cuboides orientados, jamais malha.

Na raiz da worktree:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/revisar-fontes.py
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/padronizar.py
node art-source/predios-colonia-v001/scripts/manifesto.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/piso-compartilhado.py
node art-source/predios-colonia-v001/scripts/planta.mjs
node scripts/arte/gerar-balizas-marte.mjs
node --test tests/colony-buildings.test.mjs
```

O manifesto usa GLTFLoader em Node para a geometria, animações e transformações;
as texturas só são ignoradas na leitura técnica do teste, não nos assets.
As variantes v002 trocam os pivôs por folhas deslizantes copiadas do kit
visual da Control Room, com COL filhos acompanhando a translação. Mantêm vão
de 1,70 m; folhas/portal têm o desenho, vidro grafite, faixa e balizas da
referência, adaptados à largura dos vãos. Teto separado e piso na cota zero. O runtime amostra os clipes Open para frente e para trás,
com o mesmo curso exponencial/áudio das portas normais atuais.

A planta e o roteiro de teste estão em `docs/handoffs/s6.12-predios-colonia.md`.
Aceite visual exclusivamente do autor no servidor.

Padronização v002: atlas real da Control Room nos pisos (tile 12), juntas
geométricas de 30 mm (tile 13), grade de mundo 1,25 × 1,50 m; letreiros com
placa creme/latão, texto grafite em BFont e nome próprio. Partes do portal
antigo são retiradas por componentes conexos; casca, COL estáticos, móveis e
fontes originais ficam preservados. Os novos hashes e a referência utilizada
estão em `notas/padronizacao-v002.json`. Só os três prédios novos foram alterados,
conforme resposta explícita do autor. A Cafeteria gira −90° no centro (11,5; 11,7).

## Correção do pavimento · 03/11/2026

O pedido do autor substitui o piso/pad v002 como solução de runtime: os nós
`Building_Floor` e `Building_Pad` (incluindo juntas filhas) são retirados da
cópia montada dos três prédios. Eles permanecem apenas nos arquivos-fonte
e variantes históricas preservados. Não há base ou plataforma particular ativa.

`piso-compartilhado.py` produz um único pavimento da colônia com duas malhas
(exterior/interior), na cota zero e sem espessura. Repete o tile real
`ARQ_Lab_Piso_Patio` do corredor com o utilitário oficial
`scripts/colony_floor_geometry.py`, mantendo a fase mundial, juntas/chanfros e
cores externas. Por dentro, só as cores de areia/desgaste são substituídas pela
placa limpa; a geometria é igual. União disjunta das regiões, sem sobreposição
de pisos nem recortes pela antiga pegada dos pads. Hashes, células e regiões
em `notas/piso-compartilhado-v001.json` e no manifesto do asset.

A circulação do Quartel e o v007 recebem recorte exato apenas nas regiões
repostas pelo pavimento compartilhado, que fica fora dos pais dos prédios,
dos tetos e dos gates de descarte. Apoios anteriores de Hangar/Quartel/Lab
permanecem; não existe override de altura pela área de pad.

## Vibração das juntas internas · 03/11/2026

O tile original é um sólido fechado. Para o interior, o gerador agora filtra
a referência para manter apenas topo/chanfros com normais para cima, evitando
projetar o fundo no mesmo plano. Área projetada 359,30 → 179,65 m²; teste exige
cobertura única por ponto e área total correta. O exterior permanece idêntico
à composição aprovada em `36036c8`. Medições em
`notas/vibracao-interiores-03-11.json`. Não houve ajuste de offset para esconder
a sobreposição; a camada inferior foi removida na geração da malha limpa.

## Mesmo ajuste no entorno · 03/11/2026

Após aceite dos interiores `29b30aa`, o autor pediu corrigir os corredores
ao redor. A referência somente com topo agora atende também ao exterior
compartilhado: área projetada 134,53 → 67,26 m². A areia é mantida com os
valores COLOR_0 da fonte em FLOAT_COLOR, evitando quantização do importador
Blender. Testes verificam área, camada única e fase/cores do topo do tile.
Interiores aprovados idênticos por comparação de posições/normais/cores/índices.
Os corredores originais v007 já têm área/camada corretas e não foram alterados.
Dados em `notas/corredores-camada-unica-03-11.json`.

## Pátio completo · 03/11/2026

Pedido de Sandwind/piso sobre `ccae1fa`: união ampliada na faixa Cafeteria–Quartel
(X 6,4125…17,5875 / Z 4,8375…8,5) e pátio da estufa (X 5,7…21,5 / Z 16,6…29).
Mantidos tile original, areia e superfície única. As faixas também são
caminháveis, respeitando colisores existentes. Balizas regeradas pelo script
`gerar-balizas-marte.mjs`. Handoff `docs/handoffs/s6.19c-areia-pavimento.md`.

## Ligação Cafeteria–Hangar e retorno ao deck · 03/11/2026

Sobre `375f6ea`: faixa lateral X 4,79…8,5 / Z 10,5…21,5; ligação ao deck
X 0…8,5 / Z 25…30. Recorte por diferença convexa com o contorno superior
real de MARTE_DECK_05 (GLB só lido) e a faixa do acesso ARES existente.
`surfaceCells` guarda os polígonos efetivamente renderizados e `surfaceAreaM2`
a área depois dos recortes; `areas` continua sendo a união lógica caminhável
com o deck. `cells` registra a partição retangular anterior ao recorte.
Nenhuma malha nova sobreposta ao deck, nenhum colisor de malha. Teste Rapier
da volta completa, nos dois sentidos, e cobertura por raios na junção.
