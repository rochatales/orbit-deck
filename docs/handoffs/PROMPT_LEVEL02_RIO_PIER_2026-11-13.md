# EXODEN · Level 02 · Rio de Janeiro · deck quebrado junto ao morro · 13/11/2026

> Prompt para o Codex. Autor: Tales Rocha, depois de ver o render da arte v001.
> Papel do Codex: implementar. Revisão: Claude. Aceite visual e de
> jogabilidade: só o autor.

## 1. Antes de começar

1. Valem `AGENTS.md` e as regras dos prompts anteriores: sem merge, sem push,
   sem editar plano e quadro, textos em pt-BR.
2. Base: **`claude/level02-rio-pier`**, no commit que contém este prompt. Ela
   parte da sua arte v001 (`rochatales/level02-rio-arte`, `3d8c0f2`).
3. Branch nova em worktree própria: `rochatales/level02-rio-pier`.
4. Referência do pedido: `art-source/rio-fase01/referencias/render-v001-anotado-autor-2026-11-13.webp`
   (o render v001 que o autor enviou).
5. Renders só em disco, com os caminhos listados no handoff.

## 2. O pedido do autor

Um **deck colado ao morro, no canto superior direito do mapa**: todo quebrado,
**andável, mas só até certo ponto**.

No render, o canto superior direito é a ponta norte da praia, onde o morro
fecha a areia e encontra o mar. Em coordenadas do jogo, é a região de Z perto de
−54, entre a areia (X de 15 a 36) e o mar (X acima de 36).

Leitura proposta: um píer de madeira e concreto que sai da areia, acompanha a
encosta do morro e avança sobre o mar. O jogador anda por ele até um trecho
desabado. Dali em diante sobram só pedaços soltos na água, à vista e fora de
alcance.

## 3. Estado atual

- A planta (`art-source/rio-fase01/scripts/layout.py`) tem uma única área
  caminhável, de X = −51 a 36. O mar não é caminhável.
- `COL_Limite_Mar` é um colisor único de X = 36 a 54, por todo o Z.
- `COL_Limite_Norte` fecha o mapa em Z = −54. O morro do norte fica fora dos
  limites, de Z = −70 a −54.
- O piso do Rio é plano: `surfaceHeight` devolve 0 em `src/game/rio/layout.ts`.
- A arte v001 e os GLBs saem de `build_blender.py`; a cópia da planta usada
  pelo jogo fica em `src/assets/rio-fase01/layout.json` e tem teste de igualdade.

## 4. O que entregar

### 4.1 Planta (pelo script, nunca à mão)

Acrescentar o píer em `layout.py`. Medidas de partida, a ajustar no render:

| Trecho | X (m) | Z (m) | Estado |
|---|---|---|---|
| Rampa de acesso na areia | 28 a 36 | −53 a −47 | Caminhável |
| Píer sobre o mar | 36 a 46 | −53 a −47 | Caminhável, com tábuas faltando |
| Ponta desabada | 46 a 51 | −53 a −47 | **Não caminhável**: restos soltos na água |

- Largura de 6 m, encostado no limite norte (o morro).
- **Área caminhável:** acrescentar um segundo retângulo, de X = 36 a 46 e
  Z = −53 a −47. O resto do mar continua bloqueado.
- **Colisores:** dividir `COL_Limite_Mar` para abrir só a boca do píer, e fechar
  as duas bordas laterais e a ponta com colisores baixos. O jogador e os
  inimigos não caem na água nem passam do ponto desabado.
- Nova peça `Pier_Morro` em `parts`, com os três trechos.
- Regenerar `export/layout.json` e as pranchas SVG, atualizar a cópia do jogo e
  os testes de `tests/rio-layout.test.mjs` no mesmo commit.
- A planta passa a `rio-fase01-planta-v1`.

### 4.2 Jogo (blockout)

- O mundo do Rio aceita a segunda área caminhável e os colisores novos.
- Blockout do píer em `src/game/rio/visual.ts`: tablado, vãos e ponta caída em
  volumes simples.
- **Piso plano nesta entrega** (Y = 0), como o resto do mapa. O tablado pode
  parecer elevado no visual, desde que a colisão continue plana. Se preferir
  degrau real, registrar a proposta em vez de implementar.
- A navegação dos inimigos alcança o píer: eles perseguem o jogador até lá e
  voltam. Cobrir com teste.
- Nenhum ponto de entrada de inimigo no píer. Ele é beco sem saída: vale propor
  um suprimento na ponta como recompensa pelo risco, a validar com o autor.

### 4.3 Arte (Blender)

Acrescentar o píer ao `build_blender.py`, no kit modular:

- estrutura de concreto e madeira envelhecida, pilares na água, guarda-corpo
  torto e incompleto;
- **quebrado mas legível:** tábuas faltando, trechos afundados e inclinados no
  visual, sem deixar dúvida de onde dá para pisar;
- **o fim precisa ser óbvio:** vão largo, vigas caídas e o trecho seguinte
  isolado na água. O jogador entende de longe que ali acaba;
- junto ao morro: rochas encostando no píer, mato e areia acumulada na rampa;
- sem emissão nem contorno luminoso.

Os vãos decorativos do trecho andável não podem ser buracos reais: a colisão é
um retângulo contínuo.

### 4.4 Conferência

- Auditoria contra a planta atualizada: píer dentro de 5 cm, nada de malha
  andável fora do retângulo caminhável, ponta desabada fora dele.
- Orçamento: registrar triângulos e tamanho antes e depois.
- Renders em `renders/v002/`: vista do jogo, vista de cima, e duas
  aproximações do píer (da areia olhando para o mar, e a ponta desabada).

## 5. Fora desta entrega

- Trocar o blockout pelo GLB no jogo.
- Piso com altura real, água com animação, inimigos do Rio.
- Outros ajustes da arte v001. O autor ainda vai dar o aceite dela à parte.

## 6. Critério de conclusão

- Testes:
  - duas áreas caminháveis e colisores do píer conforme a planta;
  - jogador não atravessa as bordas nem a ponta; o mar segue bloqueado;
  - caminho da areia até o fim do píer e de volta, para os quatro tipos de inimigo;
  - cópia da planta no jogo idêntica à exportação;
  - Shanghai e Marte sem mudança.
- `npm test`, `npm run build` e `git diff --check` verdes.
- Handoff em `docs/handoffs/level02-rio-pier.md`, com base, medidas finais,
  caminhos dos renders e roteiro: andar da areia à ponta, tentar passar do vão,
  encostar nas duas bordas, atrair inimigos para o píer e voltar.
- Parar ao fim e pedir revisão.
