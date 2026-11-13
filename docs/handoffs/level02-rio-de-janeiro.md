# Level 02 · Rio de Janeiro · abertura da branch · 13/11/2026

## Base e papel

- Pedido do autor: abrir a branch de desenvolvimento do Level 02, com a estética
  das imagens de referência, a composição do croqui e a dimensão de Shanghai.
- Base: `rochatales/s5.3-ajustes-control-room` em **`72a03ef`**, a linha mais
  avançada em 13/11. Ela contém a luz interna aprovada e os ajustes da Control
  Room. **Não contém a Frente B** (`rochatales/s3.9-extracao-derrota`, `2a5e4cd`).
- Branch: `claude/level02-rio-de-janeiro`, na worktree
  `.claude/worktrees/exoden-design-sprints-397366`. Sem push e sem merge.
- O level não tem numeração no plano oficial; nenhuma foi criada. O plano e o
  quadro não foram editados.

## Entrega

| Arquivo | Conteúdo |
|---|---|
| `docs/level-02/BRIEF.md` | Decisões do autor, leitura das referências, planta v0, propostas e decisões em aberto |
| `art-source/rio-fase01/referencias/` | As duas imagens e o croqui do autor |
| `art-source/rio-fase01/scripts/layout.py` | Fonte única da planta, no contrato de Shanghai |
| `art-source/rio-fase01/export/layout.json` | Planta v0 gerada |
| `art-source/rio-fase01/notas/planta-v0-camera.svg` | Planta no ângulo da câmera do jogo |
| `art-source/rio-fase01/notas/planta-v0-topo.svg` | Planta vista de cima |
| `art-source/rio-fase01/notas/planta-v0.json` | Métricas e verificações da planta |
| `tests/rio-layout.test.mjs` | Quatro testes do contrato da planta |

Nada em `src/` foi alterado: o Rio ainda **não é jogável**. Esta entrega é a
planta e o brief para o autor validar antes do blockout.

## Como a planta foi tirada do croqui

Medi no croqui a direção da orla e a perpendicular, e levei cada elemento para
as coordenadas do jogo pela posição ao longo da orla e pela distância ao
calçadão. Depois regularizei as medidas (quadras iguais, ruas de 12 m).
Mantive do croqui: as três praças do canteiro, a Praça Central de frente para a
rua entre dois prédios, os dois quiosques, o deck na ponta e as quadras de
fundo cortadas pelo limite.

Para regenerar:

```bash
python3 art-source/rio-fase01/scripts/layout.py
```

## Verificação

- O gerador confere sozinho: soma das faixas, colisores dentro do mapa e sem
  sobreposição, reserva de pouso livre, pontos em piso livre e entradas de
  inimigos a 14 m ou mais do desembarque. Resultado: sem erros.
- `tests/rio-layout.test.mjs`: 4/4. Suíte completa com **658/658**; `npm run build`
  e `git diff --check` verdes.
- Conferi a prancha da câmera em imagem: deck embaixo à esquerda, mar embaixo à
  direita, praças, quadras e morro, como no croqui.

## Não verificado e pendências

- A leitura do croqui é minha (ver decisão 1 do brief). Se o autor quis uma
  planta vista de cima, com ruas em diagonal, a planta muda inteira.
- Nenhum teste no jogo: não há mapa do Rio no runtime.
- Alturas, largura do mar, térreos e encontros dependem do autor.
- A base não tem a Frente B. Ao consolidar, o Rio herda extração por
  aniquilação e Level Clear sem trabalho extra, porque usa o contrato de Shanghai.
