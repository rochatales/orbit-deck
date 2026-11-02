# Quartel / alojamento — S6.12, Parada A

**Estudo para revisão; sem runtime.** Base da tarefa: `6184b7c9f4cebb994b566319cba748e062e3f1db` (porte Sandwind v007 consolidado sobre `5f1ee7f`). Branch `rochatales/s6.12-quartel-colonia`. A decisão de posição/escala permanece com Claude e autor.

A v002 continua com raiz em (0,0,0), rotação identidade e escala **1×**. A planta contém propostas, não transforms exportados. Ground do diorama não integra a v002; piso e rampa do prédio permanecem.

- [Relatório completo, medidas e opções](notas/PARADA_A.md).
- [Planta do encaixe](renders/planta-encaixe-v002.png) · [SVG editável](renders/planta-encaixe-v002.svg).
- [Frente](renders/v002-frente.png) · [3/4](renders/v002-tres-quartos.png) · [Superior sem teto](renders/v002-superior-sem-teto.png).
- [Planta Wall / COL](renders/planta-colliders-v002.png).
- [Blender v002](blend/barracks-v002.blend) · [GLB v002](export/barracks-v002.glb).
- [Proveniência e SHA-256 dos doze arquivos copiados](notas/origem-sha256.json).

## Reprodução

Use somente o wrapper v002, que importa as receitas originais sem chamar seus `main`. Os scripts copiados em seus nomes originais mantêm os caminhos históricos para preservar seus hashes.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v002.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v002.blend -P art-source/quartel/scripts/measure_barracks.py -- art-source/quartel/notas/medidas-v002.json
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v002.blend -P art-source/quartel/scripts/validate_barracks.py
python3 art-source/quartel/scripts/planta_encaixe.py  # requer Pillow
node --test tests/quartel-parada-a.test.mjs
```

Renders produzidos no Blender 5.1.1 / Cycles, 32 amostras, sem edição de raster. O estúdio só é criado depois do save/export; não entra no asset. A raiz, o teto e o interior continuam separados. Nenhum arquivo em `src/` foi alterado por esta tarefa.
