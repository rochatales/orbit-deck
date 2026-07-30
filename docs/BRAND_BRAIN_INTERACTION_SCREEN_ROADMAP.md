# Plano de Acao: Nova Tela de Interacao EDEN

> Objetivo: criar uma tela de interacao em pixel art com EDEN e o player
> conversando por balao de texto dinamico. A imagem `Interaction_EDEN.jpeg`
> deve ser usada apenas como referencia visual, nunca como arte final dentro
> do jogo.
>
> Companion doc: ver `PIXEL_INTERACTION_VISUAL_ROADMAP.md` para as regras
> visuais (grid de pixel, paleta, tipografia, 9-slice) e o rollout para os
> outros MCPs. Este doc cobre o *o que*; o companion cobre o *como*.

## Status Atual

- Patch 0 aplicado: a imagem de referencia saiu do runtime.
- Patch 1 aplicado: o palco pixel art agora tem componentes reutilizaveis,
  background temporario, retratos temporarios e balao basico.
- Fase visual intermediaria aplicada: EDEN ja tem estado `idle/talk`
  procedural e o balao agora renderiza texto em tamanho nativo do palco maior.
- Patch 3 aplicado: o balao agora troca texto, speaker e estado de fala por
  etapa do fluxo.
- Patch 4 aplicado: as perguntas do cadastro Brand Brain foram migradas para
  a cena old-school e salvam no mesmo modelo atual, gerando `rules.md`.
- Patch 5 iniciado: `InteractionSceneShell`, `InteractionPixelStage`,
  `PixelDialogueBubble`, `PixelPortrait` e texturas compartilhadas ja formam a
  base reutilizavel para outros MCPs.
- Proximo passo apos validacao geral: Patch 2 de arte final, substituindo os
  placeholders procedurais por PNGs/spritesheets reais de EDEN e player.

## 1. Revisao Do Estado Atual

O prototipo atual abriu a tela correta no fluxo do EDEN, mas misturou duas
coisas que precisam ficar separadas:

- **Referencia visual**: a imagem anexada mostra composicao, escala, clima,
  luz, posicao dos personagens e estilo do balao.
- **Asset do jogo**: a cena final precisa ser feita com personagens do nosso
  jogo, renderizados ou desenhados em pixel art.

O erro principal foi colocar a referencia inteira como textura de cena. Isso
resolve temporariamente o enquadramento, mas nao cria a tela real do jogo.
Tambem impede texto dinamico, troca de personagem e evolucao para outros NPCs.

## 2. Direcao Correta

A nova tela deve ser uma **cena propria de interacao**, nao um modal e nao uma
imagem fixa.

Componentes obrigatorios:

- background proprio do Brand Brain / Mente das Marcas
- sprite ou retrato pixel art do EDEN
- sprite ou retrato pixel art do player
- balao pixel art renderizado separadamente
- texto dinamico dentro do balao
- estado de fala, idle e foco por personagem
- entrada de respostas do cadastro do cliente dentro da cena

## 3. Regra De Ouro

A referencia nao entra no produto final.

Ela pode existir apenas como:

- arquivo de comparacao no `public/assets/interaction-reference/`
- guia para composicao
- ferramenta de QA visual lado a lado

Ela nao deve ser usada como `map` principal da cena, background final ou
substituto de retratos.

## 4. Arquitetura Visual Recomendada

Usar React Three Fiber com camera ortografica e coordenadas de palco fixas.

Palco base:

- `960x540` como base atual para manter legibilidade e enquadramento 16:9
- upscale via CSS `image-rendering: pixelated`

Camadas da cena:

1. **Background**
   - placa isometrica propria do Brand Brain
   - pode ser imagem pintada, render do escritorio ou tilemap simples
   - escurecida e com leve profundidade

2. **Luz e atmosfera**
   - wash azul/ciano atras do player
   - glow dourado/ciano perto do EDEN
   - vinheta discreta

3. **Personagens**
   - EDEN grande no lado esquerdo
   - player menor no lado direito
   - ambos em PNG transparente ou spritesheet
   - `NearestFilter` e sem mipmaps

4. **Balao de texto**
   - frame pixel art proprio
   - preferencialmente 9-slice ou textura desenhada em canvas
   - posicionado no centro inferior, como na referencia

5. **Texto dinamico**
   - renderizado em canvas texture ou `troika-three-text`
   - deve suportar quebra de linha
   - deve suportar efeito typewriter depois

6. **Input**
   - input HTML invisivel/minimo para teclado real
   - resposta espelhada no balao em Three.js

## 5. Plano De Execucao

### Patch 0: corrigir o prototipo atual

Objetivo: parar de usar a imagem de referencia como cena final.

Tarefas:

- remover `scenePlateTexture` como plano principal da cena
- manter `Interaction_EDEN.jpeg` apenas como referencia local
- criar uma cena temporaria com shapes/planos proprios ate os assets finais
- manter a abertura da tela pelo EDEN funcionando

Aceite:

- ao abrir EDEN, nao aparece a imagem inteira da referencia
- a tela ainda abre em full-screen
- o enquadramento fica estavel e sem cortes

### Patch 1: criar palco pixel art proprio

Objetivo: estabelecer a composicao sem depender dos assets finais.

Tarefas:

- criar `InteractionPixelStage`
- usar camera ortografica com frustum fixo
- criar background abstrato/isometrico simples em Three.js ou canvas texture
- criar marcadores temporarios para EDEN e player com silhuetas pixeladas
- criar frame pixel art do balao

Aceite:

- visual ja lembra a composicao da referencia
- EDEN e player ficam sempre visiveis
- balao fica no centro inferior
- nada depende da imagem de referencia para aparecer corretamente

### Patch 2: produzir assets de personagem

Objetivo: substituir marcadores por arte real.

Assets necessarios:

- `eden-idle.png`
- `eden-talk-a.png`
- `eden-talk-b.png`
- `eden-blink.png`
- `player-idle.png`
- `player-talk-a.png`
- `player-talk-b.png`
- `player-blink.png`

Recomendacao:

- gerar ou desenhar assets em 16:9/transparent PNG
- manter EDEN maior, com cabeca de cerebro e oculos grandes
- manter player menor, astronauta/operador futurista
- usar contorno grosso e rim light ciano/magenta

Aceite:

- os personagens sao do nosso jogo
- a silhueta do EDEN e reconhecivel
- o player parece o avatar do escritorio, nao um personagem generico

### Patch 3: texto dinamico no balao

Objetivo: transformar a cena visual em conversa real.

Tarefas:

- criar `PixelDialogueBubble`
- renderizar nome do personagem falando
- renderizar mensagem atual com quebra de linha
- adicionar cursor/indicador de continuar
- adicionar typewriter opcional

Aceite:

- o texto muda por estado (aplicado)
- o balao nao quebra quando a frase e longa
- `Esc` fecha a cena (aplicado)
- o fluxo avanca pelos controles pixel-UI da cena

### Patch 4: conectar fluxo de cadastro Brand Brain

Objetivo: levar as perguntas do cadastro para a cena.

Perguntas:

- nome da marca
- segmento
- objetivo de comunicacao
- publico-alvo
- volume mensal
- tipos de post
- tom de voz
- o que evitar
- pilares
- paleta
- logo
- CTA
- slug
- revisao final

Aceite:

- todas as perguntas aparecem dentro da cena (aplicado)
- respostas sao salvas no mesmo modelo atual (aplicado)
- `rules.md` continua sendo gerado pelo codigo existente (aplicado)
- o cliente e criado no `useClientSetupStore` (aplicado)

### Patch 5: transformar em sistema reutilizavel para todos os MCPs

Objetivo: EDEN ser o primeiro NPC, nao uma excecao impossivel de manter.

Tarefas:

- extrair `InteractionSceneShell`
- aceitar `npcId`, `portraitSet`, `accentColor`, `dialogueFlow`
- permitir que Mister, Max, Nara e Astra usem a mesma estrutura

Aceite:

- EDEN usa o sistema generico (base aplicada)
- outros NPCs podem plugar suas artes e falas depois

## 6. Estrutura De Arquivos Recomendada

```text
src/
  interactions/
    scene/
      InteractionPixelStage.tsx
      InteractionSceneShell.tsx
      PixelDialogueBubble.tsx
      PixelPortrait.tsx
      pixelSceneTextures.ts
    brandBrain/
      BrandBrainInteractionScene.tsx
      brandBrainDialogueFlow.ts
      brandBrainRegistrationAdapter.ts
  art/
    interaction/
      backgrounds/
      portraits/
      frames/
```

## 7. Decisoes Tecnicas

### Texto

Comecar com canvas texture para o balao.

Motivo:

- combina com pixel art
- permite controlar quebra de linha
- evita DOM visivel por cima da cena

### Input

Usar input HTML invisivel ou discreto.

Motivo:

- teclado, paste, acentos e foco funcionam melhor
- a resposta visivel continua sendo desenhada no balao

### Assets temporarios

Usar silhuetas pixeladas proprias antes dos assets finais.

Motivo:

- valida composicao sem depender de arte pronta
- evita a tentacao de usar a imagem de referencia como cena

## 8. Criterio De Qualidade Visual

Antes de conectar cadastro real, a tela precisa passar neste checklist:

- EDEN visivel por inteiro
- player visivel por inteiro
- personagens olham um para o outro
- balao nao cobre rostos
- cena ocupa a tela com proporcao correta
- imagem tem pixel art real, nao blur de UI
- referencia e reconhecivel como inspiracao, nao como asset copiado

## 9. Proximo Passo Recomendado

Implementar o **Patch 0 + Patch 1** juntos:

- remover a referencia como plano principal
- criar o palco pixel art proprio
- desenhar background temporario
- desenhar silhuetas temporarias de EDEN e player
- criar balao dinamico basico

Depois disso, o user testa apenas composicao e escala. Se a composicao passar,
a gente avanca para assets finais e texto dinamico real.
