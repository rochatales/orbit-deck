# Mochila do explorador — S6.8

Fonte `player_backpack.blend` copiada intacta da pasta Armamentos do autor.
O script `scripts/exportar_mochila.py` abre a cópia e exporta só o grupo Backpack,
preservando fonte, materiais e escala. Cube, câmera e luz não são exportados.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P art-source/player-backpack/scripts/exportar_mochila.py
cp art-source/player-backpack/export/backpack-v001.glb src/assets/characters/player/backpack.glb
```

Hashes e dimensões em `notas/export-v001.json`; encaixe do Spine2 em
`notas/encaixe-v001.json`. O encaixe é aplicado em runtime, sem alterar o export.
Ver [handoff e roteiro](../../docs/handoffs/s6.8-mochila.md).
