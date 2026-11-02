# Quartel v005 — ampliação para leste

Escolha do autor em 27/10/2026: **10,5 × 9 m**, crescendo a leste, portas próximas de 1,80 × 2 m e móveis 10% maiores. Base `79b61dedb4aa29e3157d57cbe2796a6c95cdbe0e`, mesma branch/worktree `rochatales/s6.12-quartel-colonia`. Origem, v002, v003 e v004 permanecem intactas; a receita v005 lê a v004 e grava somente arquivos novos.

| Medida | v004 | v005 |
|---|---:|---:|
| Paredes no mapa X × Z | 7,50 × 9,00 m | **10,50 × 9,00 m** |
| Área nominal | 67,50 m² | **94,50 m² (+40%)** |
| Implantação, rotação Y, raiz | (10,5; 0), −90°, 1× | **(12; 0), −90°, 1×** |
| Altura total | 3,51375 m | **4,164 m** |
| Vão útil das duas portas | 1,400 × 1,665 m | **1,800 × 1,998 m** |
| Rampas: largura × corrida | 1,60 × 1,20 m | **2,00 × 1,20 m** |
| Piso nominal / subida | 0,2625 m | **0,2625 m** |
| Grupos de mobiliário | tamanho v004 | **15 conjuntos a 1,10×** |
| Triângulos / materiais | 9.054 / 1 | **9.078 / 1** |
| Malhas / COL | 20 / 65 | **20 / 65** |

A ampliação foi incorporada à geometria. Os cantos conservam seus raios, a fachada oeste conserva X=6,75 m e a fachada leste avança para X=17,25 m. O plinto chega a X=17,5875 m. A profundidade norte/sul não aumenta; permanece a folga de 0,80250 m à Oficina.

Os dois acessos mantêm seus centros mundiais: oeste **(6,75; 0)** e norte **(10,5; −4,5)**. A porta norte fica deslocada 1,50 m a oeste do novo centro do prédio, conservando a rota ao Laboratório. Os conectores mantêm seus endpoints e 2,60 m de largura. A raiz segue em 1×; nenhuma escala extra no React.

## Portas e interior

Folhas telescópicas, marquises, batentes e animações são proporcionais ao novo vão. Cada portal continua com quatro painéis, clipes `Door_Open`/`Door_S_Open`. Os deslocamentos passam a 0,514286 e 0,964286 m. O bolsão termina em |u|=1,433571 m. As duas janelas adjacentes foram deslocadas 0,30 m ao longo da fachada para liberar o bolsão; a marquise da janela começa em 1,4775 m, deixando 0,043929 m de folga. Sem atravessar janela ou quina.

Beliches, seis armários, mesa/bancos, nichos e banco da entrada, gabinete lateral e os conjuntos sanitários crescem **10% nos três eixos como conjuntos**, preservando a montagem de cada móvel. O script registra medidas antes/depois dos 15 conjuntos. O piso e as divisórias são regenerados para a nova planta; teto/interior seguem em nós próprios. Duas juntas extras do piso explicam os únicos 24 triângulos adicionais. Paleta/PBR/emissivo continuam no mesmo material atlas.

O pé-direito acima do piso cresce 20%; piso, inclinação das rampas e parâmetros do controller permanecem iguais. Borda do pedestal continua bloqueada por COL não visuais de 0,75 m, com aberturas de 2 m para as rampas. COL são reconstruídos no script; física usa 54 caixas estáticas e oito cinemáticas, nunca a malha visual.

## Encaixe e zona A

[Planta atualizada](renders/planta-encaixe-v005.png) · [medições](notas/medidas-v005.json) · [encaixe calculado](notas/encaixe-v005.json).

Sem sobreposição de componentes com praça, Laboratório ou Oficina. O plinto ocupa **19,45719 m² da zona A (15,56575% de 125 m²)**, calculando os cantos arredondados. Isso corresponde ao avanço de 3 m para leste autorizado pelo autor. Doze segmentos de demarcação encobertos pelo prédio saem apenas da cópia montada; as demais demarcações permanecem. Masterplan v007 fonte intacto. A ocupação deve ser considerada quando o Builder for implementado; este ajuste não implementa Builder, streaming ou residentes.

## Evidências e reprodução

[Frente](renders/v005-frente.png) · [3/4](renders/v005-tres-quartos.png) · [Topo sem teto](renders/v005-superior-sem-teto.png) · [Validação Blender](notas/validacao-v005.json) · [COL/implantação do runtime](notas/runtime-v005.json) · [SHA-256](notas/arte-v005-sha256.json).

Na raiz desta worktree, Blender 5.1.1 e Python com Pillow:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v005.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v005.blend -P art-source/quartel/scripts/validate_barracks_v005.py
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v005.blend -P art-source/quartel/scripts/measure_barracks.py -- art-source/quartel/notas/medidas-v005.json
node art-source/quartel/scripts/export_runtime_v005.mjs
python3 art-source/quartel/scripts/planta_v005.py
```

O estúdio de render fica fora do .blend e GLB salvos. Conferência técnica do agente não é aceite visual ou de jogabilidade. Armário de emergência guardado e caixa S6.13 inalterados. Sem push ou merge.
