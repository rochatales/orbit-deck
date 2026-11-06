**Sem achados.** `node --test tests/engineer-visor-line.test.mjs` passou 2/2. Não abri os renders nem conferi `faixa-reta-red.txt`, então a falha com os pontos antigos fica como registro do implementador.

- **Certificação:**
  - A conversão de Catmull-Rom para Bézier é exata: `2a-b=18·b1` e `2b-a=18·b2`, cada trecho cúbico.
  - Em cada folha, o fecho convexo cabe na esfera em `b[0]`, então `d - r - halo` é um limite inferior válido, em unidades locais do Head.
  - `frontGap > 0` em toda folha, somado à distância positiva, garante que a curva não atravessa a malha.
- **Superfície:** o Idle está mesmo aplicado (`engineerRig.ts:49`), embora só em `t=0`. O GLB tem uma única malha de corpo, `Engenheiro_TrajeBranco`, então nenhuma parte do capacete fica de fora.
- **Números:**
  - Largura de 0,3394366 m contra 0,3393456 m do jogador.
  - Halo de 13,13 mm.
  - Folga de 1,4089 mm, com máximo de 17,38 mm e 4.096 folhas no JSON de medidas.
- **Pedido e isolamento:**
  - Y fica em 0,06 nos 17 pontos.
  - No runtime só mudaram os pontos e o comentário de `engineerVisor.ts`; `radiusScale` não mudou.
  - O helper não entra no glob `*.test.mjs` nem em `src`.

A certificação vale só para o Idle, como o handoff declara. Walk e Sitting ficam cobertos apenas por vínculo e espessura, e o aceite visual do encaixe é do autor. Não editei nada nem rodei o script colado, então `/tmp/s3-2-line-review.jsonl` não foi gerado.
