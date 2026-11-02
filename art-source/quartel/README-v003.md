# Quartel v003 — opção 2 escolhida

Decisão do autor em 26/10/2026: aplicar escala uniforme **0,75×**, no centro (10,5; 0) da colônia, com entrada principal voltada ao Laboratório. Isso corresponde à opção C da planta v002 e à segunda opção apresentada no resumo.

A v003 incorpora a redução às malhas, anchors, referências COL e animações; a raiz exportada continua em escala **1×**, sem posição ou rotação de implantação. Para o encaixe, usar futuramente `(10,5; 0)` e rotação Y=−90°, **sem aplicar 0,75 novamente**. Origem e pacote v002 permanecem byte a byte intactos, inclusive renders e manifesto.

[Planta da opção escolhida](renders/planta-encaixe-v003.png) · [SVG](renders/planta-encaixe-v003.svg) · [Frente](renders/v003-frente.png) · [3/4](renders/v003-tres-quartos.png) · [Topo sem teto](renders/v003-superior-sem-teto.png) · [Blender](blend/barracks-v003.blend) · [GLB](export/barracks-v003.glb).

| Medida final | Valor |
|---|---:|
| Paredes no mapa, orientação Y=−90° | 7,50 × 9,00 m |
| Envelope com rampas, sem Ground | 9,346 × 10,846 m |
| Altura total | 3,51375 m |
| Piso nominal / topo da referência COL_Floor | 0,2625 m |
| Face visual principal do piso | 0,26625 m (offset decorativo de 3,75 mm) |
| Vão livre acima da soleira | 0,975 × 1,665 m |
| Rampas: largura / corrida / subida | 1,425 / 1,20 / 0,2625 m |
| Deslocamento de cada folha | 1,0875 m |
| Folga em projeção à Oficina | 0,8025 m |
| Distância do envelope à zona A | ≥0,9125 m |
| Triângulos / material / malhas | 8.278 / 1 / 13 |
| Referências COL, sem geometria | 33 |

Sem sobreposição dos AABBs individuais de componentes com Lab, Oficina, praça ou zona A. O conector oeste proposto fica com trecho plano de **1,2415 m**, de X=4 até X=5,2415. O conector do Lab fica com **1,9915 m**, de Z=−8 até Z=−6,0085; as rampas assumem os trechos até as soleiras. A planta mantém a sala antiga tracejada e as duas rotas obrigatórias. Nenhum desses pisos foi alterado no jogo.

O teste geométrico da rota interna usa o jogador em tamanho inalterado: raio de referência 0,38 m e topo 1,25 m acima do piso, 72 raios sem bloqueio estático. As caixas COL acompanham a escala; AABBs das duas folhas conferidos, ações `Door_Open` e `Door_S_Open` com o deslocamento reduzido. Teto/interior e atlas continuam separados como na v002. Isso não é ensaio do controller/Rapier nem aceite de jogabilidade.

Reprodução:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v003.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v003.blend -P art-source/quartel/scripts/measure_barracks.py -- art-source/quartel/notas/medidas-v003.json
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v003.blend -P art-source/quartel/scripts/validate_barracks_v003.py
python3 art-source/quartel/scripts/planta_v003.py  # Pillow
```

[Validação vinculada ao SHA do Blender](notas/validacao-v003.json) · [Medidas](notas/medidas-v003.json) · [Encaixe](notas/encaixe-v003.json) · [SHA-256 da variante](notas/arte-v003-sha256.json).

A escolha de escala está registrada; revisão técnica Claude e integração/runtime permanecem pendentes da Parada A. Não houve alteração em `src/`, mapa ou checkout principal, nem push/merge. Armário e caixa S6.13 preservados.
