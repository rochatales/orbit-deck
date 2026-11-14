# Level 02 · Rio · píer quebrado e passe pós-apocalíptico · 14/11/2026

## Base e papel

- Pedido direto do autor ao Claude: fazer o deck quebrado junto ao morro e deixar
  a fase com mais cara pós-apocalíptica, como em Shanghai: ruas quebradas,
  prédios rachados, escombros e veículos pelas ruas.
- Base: arte v001 do Codex (`rochatales/level02-rio-arte`, `3d8c0f2`).
- Branch: `claude/level02-rio-pier`. Sem push e sem merge.
- Substitui o `PROMPT_LEVEL02_RIO_PIER_2026-11-13.md`, que não foi enviado.

## O que mudou

### Planta v1 (`art-source/rio-fase01/scripts/layout.py`)

- **Píer junto ao morro do norte**, com 6 m de largura (Z de −53 a −47):
  rampa na areia (X 28 a 36), tablado sobre o mar (X 36 a 46) e ponta desabada
  (X 46 a 51), que **não é caminhável**.
- Segunda área caminhável para o tablado. O colisor do mar foi dividido em três:
  o mar abre só a boca do píer e fecha na face do morro e depois do vão.
- **12 veículos com colisão:** 4 ônibus e 8 carros, na avenida, na rua de trás,
  nas travessas e no calçadão. Cada colisor contém o veículo girado.
- **7 montes de entulho com colisão**, ao pé das fachadas e nas calçadas.
- Dano por prédio (`damage`): rachado, fachada aberta ou canto desabado. É só
  visual; os colisores dos prédios não mudam.
- Pranchas novas: `notas/planta-v1-camera.svg` e `notas/planta-v1-topo.svg`.
  As da v0 foram mantidas.

### Jogo (blockout)

- O mundo do Rio já lia obstáculos e áreas da planta; a cópia em
  `src/assets/rio-fase01/layout.json` foi atualizada e continua idêntica à exportação.
- `src/game/rio/visual.ts` desenha o píer, os veículos e o entulho em volumes simples.
- Piso plano, como o resto do mapa. O jogo continua usando o blockout; o GLB
  ainda não entra no runtime.

### Blender (`build_blender.py`, cena `blend/rio_fase01_v002.blend`)

- **Píer:** rampa de concreto com areia, tablado de tábuas (três afundadas, sem
  abrir buraco), longarinas, pilares na água, guarda-corpo incompleto, borda
  quebrada, lajes caídas e pilares isolados na ponta. Rochas do morro encostam
  no píer.
- **Veículos:** carcaças enferrujadas de ônibus e carro, com vidros escuros e
  roda solta, nas posições da planta.
- **Entulho:** blocos, laje caída e ferragem em cada monte.
- **Vias:** 54 rachaduras, 12 buracos, 10 placas de asfalto levantadas, fendas
  no calçadão e mato nas sarjetas.
- **Prédios:** rachaduras nas três faces visíveis de todos; rombo de três
  pavimentos com lajes expostas em dois; canto alto arrancado em outros dois;
  hera nas fachadas.
- Sem emissão e sem contornos luminosos.
- A cena v001 (`rio_fase01_v001.blend`), as notas e os renders v001 foram mantidos.

### Auditoria (`audit_view.py`)

- Destroços só são aceitos sobre as vias dentro do próprio colisor da planta.
- O píer só é aceito sobre o mar dentro das peças `Pier_*`.
- Falha se algum destroço da planta ficar sem arte ou se o píer faltar.

## Números

| Arquivo | Triângulos | Limite | Tamanho |
|---|---:|---:|---:|
| `export/rio-fase01.glb` | 54.731 | 55.042 | 5,4 MB |
| `export/rio-limites-v001.glb` | 16.424 | 28.838 | 1,4 MB |

O mapa ficou a 311 triângulos do limite de Shanghai. Não cabe mais nada sem
cortar em outro lugar.

## Verificação

- `layout.py`: sem erros (sobreposição, pontos em piso livre, mar fechado fora
  da boca do píer, nada sobre o píer nem na reserva de pouso).
- Blender 5.1.1 por linha de comando: cena reconstruída do zero em cerca de 7 s,
  auditoria sem erros.
- `npm test`: **666/666**, com três testes novos: píer só até o vão, colisores
  dos destroços com passagem livre nas pistas, e os quatro tipos de inimigo indo
  até o fim do píer e voltando. `npm run build` e `git diff --check` verdes.
- Regressão da auditoria no Blender (`test_audit.py`): 7 casos passaram.
- Conferi em imagem a vista geral e a aproximação do píer: rampa, tablado e
  ponta desabada lêem como pedido; ônibus, rombos e rachaduras aparecem na vista geral.

## Renders (só em disco)

Em `art-source/rio-fase01/renders/v002/`:

- `jogo.png`: câmera do jogo, mesmo enquadramento da prancha da planta;
- `geral.png` e `topo.png`;
- `pier.png` e `pier_ponta.png`;
- `avenida.png` e `rua_fundo.png`;
- `calcadao.png`, `predio.png`, `quiosque.png`, `praca.png`, `deck.png`,
  `morro.png`, `escombros.png`, `linha_dagua.png`.

## Não verificado e pendências

- Olhei só `geral.png` e `pier.png`. Os outros 13 renders foram gerados sem
  erro, mas não conferi um a um.
- Não abri o jogo: o blockout do píer e dos destroços foi validado por teste,
  não na prévia.
- Na vista geral, o entulho e as rachaduras do chão ficam pequenos. Se o autor
  quiser mais peso de destruição, o orçamento de triângulos está no limite e
  será preciso simplificar as fachadas ou subir o teto.
- Os pilares da ponta do píer aparecem por baixo da borda do mar no render,
  porque o plano d'água do GLB termina em X = 51. No jogo o mar do blockout
  continua para fora.
- Decisões do autor: suprimento na ponta do píer como recompensa; píer com
  degrau real em vez de piso plano.
- Aceite visual da v001 e da v002: do autor.

## Roteiro para o autor

1. Abrir `art-source/rio-fase01/blend/rio_fase01_v002.blend` e olhar pela
   câmera `CAM_Jogo`, depois `CAM_Pier` e `CAM_Avenida`.
2. Comparar `renders/v002/jogo.png` com `renders/v001/jogo.png`.
3. No jogo, modo de desenvolvimento, Rio: andar até o fim do píer, tentar
   passar do vão e das bordas, e conferir a colisão dos ônibus, carros e entulhos.
