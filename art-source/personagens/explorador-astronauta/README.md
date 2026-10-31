# Explorador astronauta

Fonte do autor (31/10/2026): `Orange Lowpoly Astronaut` (GLB e FBX), copiada sem alteração para `fontes/`.
Uma malha de 10.000 triângulos, feita de 201 peças soltas, sem rig.

## Sem mochila (v001), para o Mixamo

A mochila deformava no auto-rig do Mixamo. Como ela é formada por peças inteiras atrás do tronco, o
script tira só essas peças: o corpo não é cortado nem refeito.

| Arquivo | Conteúdo |
|---|---|
| `export/explorador-sem-mochila.fbx` | Corpo para o Mixamo: 1,5 m, pés na origem, texturas embutidas. Cópia em `~/Game Development/Horda Survivor/Personagens/3D/Orange Lowpoly Astronaut-sem-mochila.fbx` |
| `export/explorador-sem-mochila.glb` | O mesmo corpo em GLB |
| `export/mochila.glb` | A mochila sozinha, na mesma escala e posição, para voltar depois como peça rígida presa ao osso `Spine2` |
| `renders/` | Costas, lado e frente sem mochila; a mochila sozinha |
| `notas/mochila-v001.json` | Triângulos (corpo 7.986, mochila 2.014), dimensões e SHA-256 |

Reprodução:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/personagens/explorador-astronauta/scripts/separar_mochila.py -- --render
```

Nada disto está no jogo. O explorador só entra depois do rig, dos clipes e do aceite do autor.
