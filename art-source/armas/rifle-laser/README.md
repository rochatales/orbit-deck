# Rifle laser v001

Fonte do autor (31/10/2026): `Futuristic Laser Rifle` (GLB e FBX), copiada sem alteração para `fontes/`;
referências de conceito em `referencias/`. Uma malha, 5.110 triângulos, 1 material.

## Convenção das armas

Toda arma do jogo sai com o mesmo contrato, para trocar de arma sem mexer em código:

| Item | Regra |
|---|---|
| Escala | Real, em metros |
| Eixos (glTF/three) | Cano para **+Z**, topo para **+Y** (no Blender: cano para −Y, topo +Z) |
| Origem | Centro do punho = `Grip_R` |
| `Grip_R` | Empunhadura da mão direita; futuro ponto de encaixe no osso `RightHand` |
| `Grip_L` | Apoio da mão esquerda (guarda-mão); vazio, sem uso até o rig de mira |
| `Muzzle` | Boca do cano; só visual (clarão e começo do traçador) |
| Texturas | 1024² na exportação; a fonte 2048² fica em `fontes/` |

## v001

- Comprimento **0,75 m** (o explorador tem 1,5 m e proporção *chibi*; ver `renders/comparacao-tamanho-*.png`
  com 0,65 / 0,75 / 0,85 m). Altura 0,45 m, largura 0,13 m.
- Vazios em metros, relativos ao punho: `Grip_L` (0; 0,064; 0,401), `Muzzle` (0,004; 0,171; 0,535).
- GLB 3,0 MB. Medidas e SHA-256 em `notas/medidas-v001.json`.
- **Fora do jogo** por decisão do autor: entra só depois de encaixado na mão do novo explorador e aprovado nos renders.

## Reprodução

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/armas/rifle-laser/scripts/build_rifle_laser.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/armas/rifle-laser/scripts/comparar_tamanho.py -- "<explorador>.glb"
```

`--comprimento 0.8` muda o tamanho; o teste `tests/rifle-laser.test.mjs` lê `notas/medidas-v001.json`.
