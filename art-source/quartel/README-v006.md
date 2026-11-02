# Quartel v006 — colisores internos e porta do banheiro

Pedido do autor em 28/10/2026, após a captura do banheiro: bloquear camas, armários/gavetas, estruturas internas, divisórias e privada; ampliar a porta do banheiro e abrir por proximidade. Base `f1d53f1`, mesma branch/worktree `rochatales/s6.12-quartel-colonia`. O script v006 lê a v005 preservada e grava somente esta variante.

## Mudanças

- **18 caixas de mobiliário:** três beliches, seis armários, mesa, dois bancos, banco/nichos de entrada, gabinete de entrada, gabinete lateral, pia, privada e vidro do box. Mesa e bancos têm caixas separadas; tapetes e vãos de circulação ficam livres.
- **Quatro caixas nas divisórias do banheiro:** parede lateral, duas partes da fachada e lintel acima do vão. A porta fixa anterior saiu da malha do interior.
- **Porta do banheiro de 1,20 × 2 m**, antes 0,6375 m de largura. Duas folhas telescópicas com ação `Bathroom_Open`, viagens de 0,68/1,26 m, centro mundial (13,125; 2,9). Material, acabamento e abertura suavizada por proximidade seguem o padrão das portas existentes. Fecha ao afastar e permanece aberta enquanto o jogador está no vão; pausa congela a animação. As dez caixas móveis seguem a posição real dos COL animados do GLB. Foi corrigido o deslocamento linear anterior, que divergia das curvas dos clipes; a comparação agora é feita em todos os quadros de abertura/fechamento nas três portas.
- Box deslocado **0,60 m para dentro do banheiro**, liberando a entrada ampliada. Vidro sólido e base caminhável com apoio analítico de **0,066 m** sobre o piso. Não se cria um bloco alto em toda a área do box.

Dimensões externas **10,5 × 9 m**, implantação **(12; 0), Y=−90°, raiz 1×**, mobiliário 10% maior, piso, rampas, borda, duas portas externas e teto preservados. As **19 malhas exteriores** foram comparadas vértice a vértice com a v005. Nenhuma malha visual vira colisor; as caixas são medidas da geometria pelo script e exportadas como COL sem triângulos.

| Recurso | v005 | v006 |
|---|---:|---:|
| Triângulos visuais | 9.078 | **9.410** |
| Materiais | 1 | **1** |
| Malhas | 20 | **24** |
| Referências COL no asset | 65 | **90** |
| Caixas estáticas no runtime | 54 | **77** |
| Caixas de folhas móveis | 8 | **10** |
| Portas / clipes | 2 | **3** |

Das 77 caixas estáticas, uma é o apoio baixo do box; sua pegada não bloqueia a navegação. As demais incluem os 54 COL externos anteriores, quatro divisórias e 18 móveis. Os três metadados de piso/rampas continuam no asset, independentes da física de triângulos.

## Evidências

[Banheiro fechado](renders/v006-banheiro-fechado.png) · [Banheiro aberto](renders/v006-banheiro-aberto.png) · [Topo sem teto](renders/v006-superior-sem-teto.png) · [Planta das caixas e rota](renders/planta-colisores-v006.svg).

[Validação Blender](notas/validacao-v006.json) · [Caixas derivadas e medidas](notas/build-v006.json) · [Manifesto do runtime](notas/runtime-v006.json) · [SHA-256](notas/arte-v006-sha256.json).

A validação Blender confere 25 referências novas (23 estáticas + duas folhas), 20 raios livres pelo vão e 40 amostras das folhas. Erro máximo das caixas <0,000001 m. Os testes Rapier usam a cápsula real de raio 0,32 m e os parâmetros atuais: bloqueio de móveis/divisórias/privada, porta fechada sólida, entrada/saída automática, aproximação da privada, vidro do box e subida/descida de seu apoio. As rotas praça → quartel → Lab e a borda não escalável permanecem verificadas.

## Reprodução

Na raiz desta worktree, com Blender 5.1.1:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v006.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v006.blend -P art-source/quartel/scripts/validate_barracks_v006.py
/Applications/Blender.app/Contents/MacOS/Blender -b art-source/quartel/blend/barracks-v006.blend -P art-source/quartel/scripts/measure_barracks.py -- art-source/quartel/notas/medidas-v006.json
node art-source/quartel/scripts/export_runtime_v006.mjs
python3 art-source/quartel/scripts/planta_colisores_v006.py
```

O estúdio de render fica fora do .blend e GLB salvos. A v005 e versões anteriores permanecem intactas, assim como o armário de emergência guardado e a caixa S6.13. Aceite visual/jogabilidade do autor e revisão Claude pendentes. Sem push ou merge.
