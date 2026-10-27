# Quartel v004 — acessos ampliados e runtime

Decisão do autor em 26/10/2026; continuação de `72a4fda8e975cde3ec0c93a7a705120e5e12f459`, na mesma branch `rochatales/s6.12-quartel-colonia`. Origem remota da arte: `7c6b2cab394b279eee1ccd392f975e94d9802960`. Origem, v002 e v003 preservadas integralmente e conferidas pelos inventários anteriores.

A v004 abre as duas portas para 1,40 m sem alterar a escala física da v003: geometria já reduzida a 0,75×, raiz 1×. Paredes, piso, janelas, altura, teto e interior mantêm suas medidas. Implantação do runtime: (10,5; 0), rotação Y=−90°. Não aplicar outra escala.

| Medida | v003 | v004 |
|---|---:|---:|
| Paredes no mapa X × Z | 7,50 × 9,00 m | 7,50 × 9,00 m |
| Envelope visual no mapa X × Z | 9,34596 × 10,84596 m | igual |
| Altura total | 3,51375 m | igual |
| Piso nominal / face decorativa | 0,2625 / 0,26625 m | igual |
| Soleira / verga do vão | 0,285 / 1,950 m | igual |
| Vão útil de cada porta | 0,975 × 1,665 m | **1,400 × 1,665 m** |
| Largura de cada rampa | 1,425 m | **1,600 m** |
| Corrida / subida das rampas | 1,200 / 0,2625 m | igual (12,34°) |
| Triângulos | 8.278 | **9.054** (+776) |
| Materiais / malhas | 1 / 13 | **1 / 20** |
| Referências COL sem geometria | 33 | **65** |

As rampas só aumentam no sentido transversal. O envelope externo total não aumenta. [Planta atualizada](renders/planta-encaixe-v004.png): nenhuma sobreposição dos componentes com praça, Lab, Oficina ou zona A. Folga ao envelope da Oficina 0,80250 m; à zona A ≥0,91250 m. Os conectores encostam apenas no pé das rampas, contato intencional de piso: oeste de X=4 até 5,241536; norte de Z=−8 até −6,008464. Ambos mantêm 2,60 m de largura.

## Portas e atlas

Uma folha única alargada atravessaria a marquise da janela sul. Cada portal agora possui quatro folhas telescópicas, duas por lado, em dois planos de profundidade. Recolhem 0,40 e 0,75 m; no fim, o painel mais próximo fica a 0,735 m do centro, liberando o vão ±0,70 m. O bolsão termina em |u|=1,115 m, antes da janela em |u|=1,1775 m (folga 0,0625 m). Batentes, folhas e marquises novos usam o mesmo atlas de paleta/PBR/emissivo; sem novo material.

`EntranceDoor` e `EntranceDoor_S` são grupos; as folhas `Door_W_*` e `Door_S_*` recebem seus próprios COL. Os clipes continuam **Door_Open / Door_S_Open**, cada um com quatro trilhas, duração 0,666667 s. Runtime amostra as ações por proximidade suavizada; caixas cinemáticas usam a mesma pose. `Building_Roof` e `Building_Interior` continuam nós próprios e irmãos.

## Colisão e pedestal

65 referências: 28 caixas de paredes, 26 caixas de borda, oito caixas de folhas, um piso arredondado e duas rampas analíticas. O exportador lê posição, quaternion e meia extensão diretamente dos nós COL do GLB colocado no mapa. O runtime monta 54 cuboides estáticos e oito cinemáticos. Piso/rampas usam apoio analítico; nenhuma malha visual vira colisor.

A borda usa caixas não visuais com topo em **0,75 m**, interrompidas só nos acessos de 1,60 m. A altura evita o autostep mesmo quando o controller solicita antes da colisão o apoio de 0,2625 m. Não basta confiar nos 2,5 mm acima do autostep de 0,26 m. O teste Rapier usa a cápsula real (raio 0,32 m), o mesmo offset e o apoio desejado, e bloqueia aproximações pelas quatro laterais. Nenhum parâmetro do controller foi alterado. Os COL extras não mudam a arte.

## Reprodução

Na raiz da worktree, com Blender 5.1.1:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v004.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v004.blend -P art-source/quartel/scripts/validate_barracks_v004.py
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v004.blend -P art-source/quartel/scripts/measure_barracks.py -- art-source/quartel/notas/medidas-v004.json
node art-source/quartel/scripts/export_runtime_v004.mjs
python3 art-source/quartel/scripts/planta_v004.py
```

A planta requer Pillow. O estúdio Cycles fica fora do .blend/GLB salvos. Atlas e texturas do GLB são embutidos.

[Frente](renders/v004-frente.png) · [3/4](renders/v004-tres-quartos.png) · [Topo sem teto](renders/v004-superior-sem-teto.png) · [Medidas Blender](notas/medidas-v004.json) · [Validação e SHA do .blend](notas/validacao-v004.json) · [Caixas e implantação](notas/runtime-v004.json) · [Inventário SHA-256](notas/arte-v004-sha256.json).

Validação técnica não equivale a aceite visual/jogabilidade do autor. Revisão Claude e aceite do autor pendentes. Armário de emergência continua guardado, sem runtime; caixa S6.13 inalterada.
