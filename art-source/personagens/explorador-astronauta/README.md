# Explorador astronauta

**Pipeline/runtime ativo v008 (01/11/2026):** `--colony-idle-backward` acrescenta Breathing_Idle / Walking_Backwards somente para Marte; v001–v007 e todas as ações anteriores preservados. Ver [handoff](../../../docs/handoffs/s6.8-idle-recuo-colonia.md). Os avisos de versões anteriores abaixo são históricos.

**Atualização 01/11/2026: pipeline/runtime ativos v007.** `--final-run` gera Run de
`Rifle _Run_final.fbx`, preservando as outras onze ações v006 e exports históricos.
Reprodução: `Blender -b --factory-startup -P art-source/personagens/explorador-astronauta/scripts/preparar_f1.py -- --final-run`.
Notas `notas/f1-v007.json`; fonte intacta e hashes em `mixamo/fontes-sha256.json`.
Detalhes e roteiro no [handoff da corrida final](../../../docs/handoffs/s6.8-rifle-run-final.md).
Os registros de Parada A/versões antigas abaixo são históricos.

**Pipeline ativo: F1 v003 (Fall/Death com apoio corrigido), ainda na Parada A sem runtime.**
O registro da v001 abaixo é histórico; ela permanece intacta.

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

## F1 v002 — Dash Jump Over / aterrissagem (01/11/2026)

Sobre `8257cdb`: Dash agora usa **`dash_Jump_Over.fbx`**, 39 quadros/1,2667 s.
Fonte intacta e SHA-256 completo no manifesto de `mixamo/` (14 arquivos);
`Running Dive Roll.fbx` permanece como histórico. O comando de reprodução acima
agora gera `export/explorador-astronauta-rig-v002.glb` e `notas/f1-v002.json`.
Para reproduzir a v001, usar o script do commit `8257cdb` num checkout separado.

Só o Hips vertical do Dash é corrigido: falta abaixo de −1 cm, máximo ±1 e média
±1 quadro. **q26: −34,07 cm → ~0**; mínimo global **−2,29 mm**; maior altura de
aterrissagem antes negativa **10,98 cm**. **q15 mantém o salto natural +87,72 cm**.
As outras nove ações, inclusive Fall/Death, continuam idênticas ao GLB v001.

- GLB v002: **2.703.108 bytes**, 1,5 m no Idle; v001 preservado.
- Perfil completo antes/depois, máximos, curvas protegidas e SHA-256 no JSON v002.
- `renders/f1-v002/`: 30 PNGs, frente/lado em q15 e q20–32, mais q26 antes.
- `--render` regenera imagens/inventário; sem essa flag, o inventário é preservado.
  Após renderizar, ambos os modos devem produzir o mesmo JSON e o mesmo GLB.
- Fall/Death e os cinco clipes faltantes seguem aguardando o autor; não integrar
  ainda. Ver [handoff](../../../docs/handoffs/s6.8-explorador-astronauta.md).

## F1 v003 — Fall sem borda e Death apoiado (01/11/2026)

Sobre `983da4a`, sem runtime. `preparar_f1.py` agora gera
`export/explorador-astronauta-rig-v003.glb` (**2.703.108 bytes**) e
`notas/f1-v003.json`, preservando v001/v002. Usa as mesmas fontes intactas.

- **Fall:** remove toda a translação do Hips para o anchor do Idle e aplica
  falta abaixo de −1 cm → máximo ±1 quadro → média ±1. Piso mínimo **−3,11 mm**,
  flexão natural até **22,28 cm**, flutuação induzida até **6,11 cm**.
- **Death:** mantém queda natural + mesma elevação suave. Piso mínimo **−8,09 mm**,
  flutuação induzida até **4,29 cm**, 66 quadros elevados.
- As outras **oito ações**, incluindo Dash, são idênticas ao v002. Rotações de
  Fall/Death preservadas; JSON guarda perfis, Hips original/base e curvas protegidas.
- `renders/f1-v003/`: **24 PNGs antes/depois**, Fall q1/q7/q46/q80 e Death
  q87/q104, frente/lado. Sem `--render`, JSON e inventário são preservados.

Os registros acima de afundamento de Fall/Death são históricos das versões
anteriores. Esta correção técnica não constitui aceite visual ou liberação de
runtime. Ver [handoff](../../../docs/handoffs/s6.8-explorador-astronauta.md).


## PBR v003 corrigido (01/11/2026)

A geração atual restaura no Principled BSDF os parâmetros da fonte: Metallic 0,
Roughness 1, Specular IOR Level 0,5 e Tint branco. Corrige o metal puro introduzido
pelo FBX do Mixamo, sem alterar malha, skin, animações ou texturas.
GLB atual: **2.702.968 bytes**, SHA-256
`4777b703632b7761f55bea4f3fc0cfba45d5b006128b248a6852ab25b66d9ba9`.
Os valores/tamanhos anteriores acima são históricos; v001/v002 e fontes intactos.
A seção `material_pbr` do JSON registra antes/depois. Os renders de pose continuam
históricos; capturas do runtime atualizadas no handoff da F2.


## v004 — corrida armada (01/11/2026)

`preparar_f1.py --combat` adiciona `Run_Rifle` de `Rifle_Run_00.fbx` (21 quadros,
0,6667 s, loop in-place), sem mudar as dez ações da v003. Referência da passada
2,770613 m/s; reprodução **1,515910×** a 4,2 m/s. Originais preservados e 15 hashes
no manifesto. Exporta `explorador-astronauta-rig-v004.glb`, **2.751.716 bytes**, SHA-256
`714cc97b621fd860abac539af9997c1a462bdc467b6038f0366ca968502400be`.
Sem a flag, o gerador continua reproduzindo v003. Runtime usa v004; Marte mantém
Run e Shanghai usa Run_Rifle. Ver notas `f1-v004.json` e handoff para a mira animada.


## Receita atual — v003 consolidado (01/11/2026)

O pipeline padrão substitui Run por Rifle_Run_00 e Backward por
Backwards_Rifle_Run, ambos in-place, mantendo as outras oito ações do v004.
São 16 fontes intactas no manifesto; referências 2,7706 / 1,4012 m/s,
taxas 1,52× / 0,86× a 4,2 / 1,2 m/s. PBR 0 metal / 1 roughness.

Geração: `preparar_f1.py -- --ingest '/Users/rochatales/Game Development/Horda Survivor/Personagens/3D'`
via Blender, conforme comando completo no handoff da consolidação.
A opção `--combat` não integra a receita atual; a seção v004 acima é histórica.
Exporta v003, 2.699.200 bytes, SHA-256
`477ef7b591ad7a1e02d9e2ad79cfa8bdd934c1b3aa2f33e9019da0a679a4dd4d`.
v001/v002/v004 permanecem intactos; notas e trajetórias atuais em f1-v003.

[Handoff da consolidação](../../../docs/handoffs/s6.8-consolidacao-lab-dash-atmosfera.md).


## v005 — Run_Backward para Shanghai (01/11/2026)

`preparar_f1.py -- --shanghai --ingest <pasta do autor>` gera v005 com
17 fontes e adiciona Backward_Rifle (Run_Backward.fbx) às dez ações do v003,
sem alterar essas ações ou os GLBs anteriores. Recuo: 16 quadros, 0,5 s,
referência de apoio 2,8689273214 m/s; 0,418274799× a 1,2 m/s.
Firing_Rifle/Reloading continuam como Aim_Rifle/Reload_Rifle; runtime separa
tronco/pernas uma vez no carregamento. GLB 2.745.732 bytes, SHA-256
`fce21089d0d0e66ae07111282d271a1db9f5416c04293625b02c941b0bfa4bb7`.
Sem a flag, a receita v003 permanece disponível.

[Handoff e roteiro](../../../docs/handoffs/s6.8-animacoes-shanghai.md).


## v006 — colônia separada do combate (01/11/2026)

`preparar_f1.py -- --colonia --ingest <pasta do autor>` gera v006 com
Run_Colony ← Standard_Run (23 quadros, 0,733333 s), mantendo as onze ações
do v005 idênticas e todos os GLBs anteriores. Run_Backward é reutilizado
no recuo dos dois mapas; a colônia toca o corpo inteiro, sem camadas de arma.
Standard_Run: referência 2,7678143978 m/s; 1,517442789× a 4,2 m/s.
GLB 2.802.396 bytes, SHA-256
`746afcc364c04de71e7d05c754c4c1db7dd1be0b602304182527827d472328c9`.
Rifle no Hips em Marte, sem Dash. Transform e medição em
`notas/holster-colonia-v001.json`.

[Handoff e roteiro](../../../docs/handoffs/s6.8-animacoes-colonia.md).
