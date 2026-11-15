# Plano de ação — cabine holográfica da ARES-I (S6.16)

Pedido do autor em 15/11/2026. Este documento é o plano; nada de código foi
alterado ainda. Aceite visual, sonoro e de jogabilidade é sempre do autor.

- **Branch:** `claude/s6.16-cabine-holografica`
- **Base:** `e76ff63` (`rochatales/level02-rio-morros`), que já contém a base
  consolidada `fa79e37`. Motivo concreto: a escolha de destino com o Rio só
  existe nessa linha (`src/ui/ShipCockpit.tsx`, `RIO_ROUTE` e o seletor de
  destino). Partir da origin obrigaria a refazer isso e geraria conflito depois.
- **Item do plano oficial:** S6.16 (cabine, carregamento e vídeos de transição).
- **Referências do autor:** `docs/sprint-6/referencias/cabine-holografica/`
  (`ref-01-cabine.jpg`, `ref-02-globo.jpg`).

## 1. A experiência, passo a passo

| Momento | O que o jogador vê | O que ouve |
|---|---|---|
| A. Entrar na nave | Tela preta | Motor ligando, alto |
| B. Painel acende | A cabine aparece; botões e telas do painel piscam em sequência | Bipes do painel |
| C. Menu surge | Menu holográfico flutuando no ar, sem fundo, como na referência 1 | Som curto de holograma |
| D. Escolher destino | À esquerda, o globo holográfico gira até a cidade escolhida e marca o ponto | Giro suave e "trava" no alvo |
| E. Ver a nave | À direita, os dados da aeronave | — |
| F. Decolar | Pelas janelas: vista do mapa atual, depois muita fumaça branca | Ignição e decolagem |
| G. Viagem | Fundo preto com estrelas riscando a tela em alta velocidade. **Substitui o carregamento** | Som de viagem espacial, em loop |
| H. Pouso | Animação de chegada que termina exatamente na vista do pouso do novo mapa | Reentrada, toque no solo, motor desacelerando |

## 2. O que já existe e será preservado

- Cabine em tela cheia com quadro de janelas e vídeo do mapa por trás.
- Regras de jogo: embarcar não inicia viagem; bloqueio de decolagem na campanha;
  aba de carga e porão; E/ESC para desembarcar; foco do teclado; modo de
  movimento reduzido; um único vídeo ativo por vez.
- Nada entra no passo de simulação nem em `useFrame` do jogo.

## 3. Etapas de implementação

Cada etapa termina com testes, build e diff-check verdes e um roteiro de
conferência para o autor. As etapas 1 a 5 funcionam com material provisório;
os vídeos e sons finais entram na etapa 6.

1. **Novo quadro e menu sem fundo.** Trocar o quadro pela arte da referência 1,
   recortar as janelas, e redesenhar os painéis como hologramas soltos no ar
   (linhas e texto ciano, sem caixas). Esquerda: destino. Direita: aeronave.
2. **Sequência de entrada (A → C).** Tela preta, painel acendendo com botões
   piscando e menu surgindo. Com movimento reduzido, o menu aparece direto.
3. **Globo holográfico.** Esfera de pontos e linhas, feita em código (leve, sem
   vídeo), só ativa com a cabine aberta. Gira até a latitude/longitude do
   destino e marca a cidade. Shanghai: 31,2° N, 121,5° L. Rio: 22,9° S, 43,2° O.
   Quando o destino é Marte, o globo passa a mostrar Marte com a colônia marcada.
4. **Painel da aeronave, versão inicial.** Só dados reais nesta primeira versão:
   nome da nave, estado (no solo, em trânsito), carga do porão e capacidade,
   explorador, elo de rádio (EDEN ou Engenheiro). "Level" aparece como campo
   reservado até o autor definir a regra de progressão.
5. **Sequência de viagem (F → H).** Máquina de quatro tempos: vista atual →
   fumaça → estrelas em loop → pouso. O trecho das estrelas repete enquanto o
   mapa carrega e tem duração mínima, para nunca piscar. O pouso só toca quando
   o destino está pronto. Em caso de erro, volta ao menu com "Tentar novamente".
6. **Troca pelo material final.** Substituir os provisórios pelos vídeos e sons
   do roteiro abaixo, com conferência de formato, peso e ausência de áudio nos vídeos.
7. **Acabamento.** Ajuste de tempos, volumes, legibilidade e desempenho; roteiro
   final de aceite.

### Como garantir que o pouso termina igual à vista do mapa

A fumaça da decolagem e a chegada são **camadas claras sobre fundo preto**,
somadas por cima da vista do mapa. Assim a animação se dissolve e o que sobra é
a própria vista do mapa, sem salto de imagem. Depois, se o autor quiser, cada
mapa pode ganhar um vídeo de pouso exclusivo.

## 4. Roteiro de vídeos (com prompt sugerido)

Formato de entrega: MP4 H.264, 1920 × 1080, 24 fps, **sem áudio**, câmera
parada. Estilo comum a todos, para colar no fim de cada prompt:
*"low-poly stylized 3D, soft cinematic lighting, muted teal and orange palette,
no text, no UI, no people, static camera, seamless"*.

| # | Vídeo | Uso | Duração | Situação | Prompt sugerido |
|---|---|---|---|---|---|
| V1 | Vista de Marte (loop) | Janelas, nave no deck | 6–8 s, loop | Existe provisório | "View through a spaceship windshield of a Mars colony launch deck, red dust drifting in the wind, distant domes and hangar lights, calm idle loop" |
| V2 | Vista de Shanghai (loop) | Janelas, nave pousada | 6–8 s, loop | Existe provisório | "View through a spaceship windshield of ruined Shanghai streets, collapsed towers, grey fog and ash drifting, overcast light, calm idle loop" |
| V3 | Vista do Rio (loop) | Janelas, nave pousada | 6–8 s, loop | **Falta** (hoje usa a de Shanghai) | "View through a spaceship windshield of post-apocalyptic Rio de Janeiro waterfront, broken pier, ruined kiosks, hills in haze, slow waves, calm idle loop" |
| V4 | Fumaça da decolagem | Camada sobre a vista atual | 3–4 s | Falta | "Thick white rocket exhaust smoke billowing up from below and filling the whole frame, on a pure black background, dense and fast, ends fully white" |
| V5 | Estrelas em alta velocidade (loop) | Substitui o carregamento | 4 s, loop perfeito | Falta | "Hyperspace travel, long star streaks rushing past the viewer from a central vanishing point on pure black space, subtle blue and white trails, perfectly seamless loop" |
| V6 | Chegada / reentrada | Camada sobre a vista do destino | 4–5 s | Falta | "Atmospheric entry seen from a cockpit, bright glow and clouds rushing past then thinning out and clearing completely, on a pure black background, ends fully black" |
| V7 | Pouso em Marte (opcional) | Versão exclusiva do pouso | 5 s | Opcional | "Descending onto a Mars colony launch deck seen through a windshield, red dust kicked up by thrusters, settles into a still view of the deck" |
| V8 | Pouso em Shanghai (opcional) | Versão exclusiva do pouso | 5 s | Opcional | "Descending between ruined Shanghai towers seen through a windshield, grey dust kicked up by thrusters, settles into a still street view" |
| V9 | Pouso no Rio (opcional) | Versão exclusiva do pouso | 5 s | Opcional | "Descending onto a broken Rio de Janeiro pier seen through a windshield, sand and sea spray kicked up by thrusters, settles into a still waterfront view" |

Para V7–V9, o último quadro precisa ser idêntico ao primeiro quadro do loop do
mesmo mapa (V1–V3). O mais seguro é gerar o pouso a partir dessa imagem final.

## 5. Roteiro de sons (com prompt sugerido)

Formato de entrega: WAV ou MP3, estéreo, sem música de fundo, sem voz.

| # | Som | Momento | Duração | Prompt sugerido |
|---|---|---|---|---|
| S1 | Motor ligando | A | 2–3 s | "Spaceship engine powering up, deep rising turbine whine with a heavy electrical thump at the start, loud and close, sci-fi" |
| S2 | Painel acendendo | B | 1,5 s | "Cockpit dashboard booting, quick sequence of soft electronic beeps and relay clicks, lights switching on one by one" |
| S3 | Holograma surgindo | C | 0,8 s | "Hologram interface materializing, airy shimmer with a soft digital rise, clean and futuristic" |
| S4 | Navegar no menu | D | 0,15 s | "Short soft UI tick for a holographic menu, subtle, glassy" |
| S5 | Confirmar seleção | D | 0,3 s | "Holographic menu confirm, two-tone soft chime, clean sci-fi" |
| S6 | Globo girando e travando | D | 1,2 s | "Holographic globe rotating, smooth servo whirr ending in a precise target-lock blip" |
| S7 | Ação bloqueada | D/F | 0,4 s | "Denied action tone for a spaceship console, low double buzz, not harsh" |
| S8 | Ignição e decolagem | F | 4 s | "Rocket thrusters igniting and spaceship lifting off, massive low rumble building to a roar, cockpit interior perspective" |
| S9 | Viagem espacial (loop) | G | 6 s, loop | "Hyperspace travel ambience from inside a cockpit, steady whooshing drone with subtle pulsing energy, seamless loop" |
| S10 | Reentrada e pouso | H | 4 s | "Atmospheric reentry rumble fading into retro thrusters and a soft heavy touchdown thud, cockpit interior perspective" |
| S11 | Motor desacelerando | H | 2 s | "Spaceship engine winding down after landing, turbine pitch falling to a quiet hum" |
| S12 | Ambiente da cabine (loop) | C em diante | 8 s, loop | "Quiet spaceship cockpit room tone, low electrical hum, faint air system, occasional soft console tick, seamless loop" |

## 6. Decisões que dependem do autor

1. **Sequência de entrada:** tocar completa toda vez (cerca de 3 s) ou completa
   só na primeira vez da sessão e curta (cerca de 1 s) nas seguintes?
   Recomendação: completa na primeira, curta depois.
2. **Estrelas:** vídeo (V5) ou efeito feito em código? Recomendação: começar em
   código, que nunca "engasga" no loop e não pesa, e trocar pelo vídeo se o
   autor preferir o visual.
3. **"Level" da aeronave:** qual regra de progressão ele representa? Até a
   resposta, fica como campo reservado.
4. **Aba de carga:** continua como aba separada ou vira parte do painel direito?
5. **Quem implementa:** Claude nesta branch ou Codex com prompt e revisão do
   Claude, como nas outras frentes.

## 7. Limites

- Não muda regras de extração, derrota, campanha, combate ou salvamento.
- Arte do quadro: a referência 1 é uma imagem só. Para o painel piscar por
  botão, pode ser preciso uma versão em camadas da arte; se não houver, o piscar
  é feito com luzes desenhadas por cima.
- Não entra em `main`, sem push e sem merge até o aceite do autor.
