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

## F1 / Parada A — rig e dez ações (01/11/2026)

Em `rochatales/s6.8-explorador-astronauta`, base **96d8ea5**. Fontes Mixamo usadas
em `mixamo/` (13 FBX intactos e manifesto SHA-256); cinco clipes fora de escopo
apenas listados. Corpo final: **10.000 triângulos, 57 ossos `mixamorig:*`**, sem
mochila, altura **1,5 m no Idle posado**, piso na origem, frente +Z no glTF.

- `scripts/preparar_f1.py`: pipeline Blender 5.1.1, fontes verificadas, correção
  horizontal do Hips preservando altura, redução/recarga das texturas e export.
- `export/explorador-astronauta-rig-v001.glb`: malha + skin + dez ações; **2.703.144
  bytes**, texturas **1024²** (cor JPEG 90 / normal PNG); não é asset de runtime.
- `notas/f1-v001.json`: hashes completos, comparações, passada/taxas, envelopes e
  limitações; `trajetoria-*.json` guarda movimentos originais na escala final.
- `renders/f1-v001/`: 12 vistas de frente/lado de Idle, Run, Backward, Aim_Rifle,
  Fall e Dash. Renders salvos em disco, sem anexação ao chat.

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P art-source/personagens/explorador-astronauta/scripts/preparar_f1.py -- --render
```

Run usa `Running` (1,37316× para 4,2 m/s); Backward usa `Sprint Backward`
(0,27054× para 1,2 m/s), taxas medidas nos apoios dos pés, ainda propostas.
Talk/Hit e Idle/corrida/recuo armados em loop faltam. A rolada e as poses de
queda/morte têm penetração no piso do corpo chibi com a curva vertical original;
precisam de decisão/correção antes da integração. Detalhes e tabela no
[handoff F1](../../../docs/handoffs/s6.8-explorador-astronauta.md).
Aceite visual do autor pendente; **sem mudanças em src/**.
