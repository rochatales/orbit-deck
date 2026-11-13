# Level 02 · Rio de Janeiro · blockout jogável

- **Data** 13/11/2026
- **Base** `bf5989c` (`claude/level02-rio-de-janeiro`), sobre `72a03ef`
- **Branch** `rochatales/level02-rio-blockout`
- **Implementação** Codex · **Revisão solicitada** Claude · **Aceite** autor

## Entrega

| Arquivos | Conteúdo |
|---|---|
| `src/assets/rio-fase01/layout.json`, `src/game/rio/` | Planta v0 copiada byte a byte da exportação, terreno, volumes Three.js, deck, limites, ARES e suprimentos |
| `src/game/config.ts`, `src/game/session.ts`, `src/state/useExpeditionStore.ts`, `src/app/App.tsx`, `src/ui/ShipCockpit.tsx` | Categoria de mapa, carregamento, viagem de ida e volta, seleção de destino em Marte no Desenvolvimento |
| `src/combat/config.ts`, `src/combat/simulation.ts`, `src/combat/CombatScene.tsx` | Encontros do Rio, quatro hordas, patrulhas e integração de suprimentos |
| `src/scene/OfficeScene.tsx`, `src/scene/RioLighting.tsx`, `src/game/shanghai/buildingFade.ts` | Câmera a 45°, fim de tarde e esmaecimento dos prédios quando encobrem o explorador |
| `src/audio/`, `src/interactions/`, `src/ui/`, `src/characters/player/` | Áudio, interação, radar, rádio, pausa, controles e HUD de expedição |
| `tests/rio-blockout.test.mjs` | Planta, mundo, navegação por raio, encontros, suprimentos, viagem, carga e saves |

A fonte da planta continua em `art-source/rio-fase01/scripts/layout.py`.
A faixa de mar começa em X = 36. Os quatro `limitColliders` entram nos
colisores simples da física e na navegação. A linha d'água do blockout segue
reta e o plano azul continua para fora do mapa. Os pisos são planos em Y = 0.
As cores e a marcação do deck têm pequenos deslocamentos visuais verticais
para evitar sobreposição de planos. O núcleo cilíndrico de cada quiosque
usa o envelope retangular exportado. O ARES é uma representação em
volumes do modelo de Shanghai, com os mesmos seis colisores e a escada
alinhada à saída da planta.

A luz, as cores e os volumes do entorno são provisórios. Vídeo e imagem
externa da cabine, trilha, ambiência e inimigos vêm de Shanghai. A cabine,
o rádio e o HUD identificam o Rio. O objetivo usa o texto genérico de
expedição. A campanha mantém apenas Shanghai.

### Suprimentos e encontros

- Kits em `(22,95; 17,5)`, `(22,95; −36)`, `(0,5; −10)` e
  `(−37; 13)`, junto aos dois quiosques, na Praça Central e na rua de trás.
- Caixas em `(23,95; 21,5)`, `(23,95; −32)`, `(0,5; 31)` e
  `(−30; −11)`, junto aos quiosques, na Praça Sul e no acesso da rua de
  trás. A recompensa é de 48 munições por caixa a cada tentativa.
- As patrulhas usam as quatro rotas e os oito spawns da planta. A opção de
  32 completa os pontos no perímetro terrestre, seguindo para o waypoint
  mais próximo. As quatro hordas usam o perímetro terrestre, inclusive
  a linha da praia, recuado para manter os inimigos em terra.
- No desembarque, a grade considera o raio de cada inimigo e a escada do
  ARES. O fim do caminho precisa alcançar a distância de contato do tipo.
  Os oito spawns passaram nesse teste com os quatro raios.

## Verificação

- `npm test` passou com **663/663** testes. `npm run build` e
  `git diff --check` passaram. O Vite emite um aviso de tamanho do chunk principal.
- O navegador percorreu Marte → Rio → Marte pelos controles da cabine,
  incluindo desembarque, pausa e embarque. O QA posicionou o explorador na
  escada de Marte para começar. A campanha abriu a cabine sem seletor,
  recusou a solicitação direta ao Rio e chegou a Shanghai. Os bytes do perfil
  de Desenvolvimento, do porão e do save de campanha foram comparados antes
  e depois das viagens testadas.
- Capturas em azimute padrão: [desembarque](level02-rio-blockout/evidencias/rio-desembarque.png),
  [avenida](level02-rio-blockout/evidencias/rio-avenida.png),
  [vista geral](level02-rio-blockout/evidencias/rio-planta.png) e
  [rua de trás](level02-rio-blockout/evidencias/rio-rua-de-tras.png).
  Avenida e rua de trás usam posições assistidas. Na rua de trás, a
  opacidade do prédio que encobria o explorador chegou a 0,12. A vista
  geral reduz o zoom e desloca o enquadramento vertical, mantendo o
  azimute do jogo.

### Medição com `?perf`

Quatro amostras de 4 s por mapa, com o jogador parado no desembarque.
O QA aguardou o nascimento de toda a horda antes de amostrar e encerrou
cada horda por automação para alcançar a seguinte. Mesmo navegador,
resolução de 1440 × 900 e DPR 1. Os intervalos são de
`requestAnimationFrame` em Chromium headless com ANGLE/Metal.
[Relatório bruto](level02-rio-blockout/evidencias/perf.json).

| Horda | Inimigos | Rio p50 / p95 (ms) | Shanghai p50 / p95 (ms) |
|---|---:|---:|---:|
| 1 | 13 | 16,7 / 16,7 | 16,7 / 16,7 |
| 2 | 26 | 16,7 / 16,7 | 16,7 / 16,8 |
| 3 | 32 | 16,7 / 16,7 | 16,7 / 16,7 |
| 4 | 44 | 16,7 / 16,8 | 16,7 / 16,7 |

As oito amostras foram válidas. Na horda 4, o Rio registrou em média
112 chamadas de desenho e 176 mil triângulos, e Shanghai, 125 e 220 mil.
Esses números refletem o conteúdo visível no desembarque de cada mapa.
A única amostra com quadro acima de 33,3 ms foi a horda 2 de Shanghai
(máximo de 49,9 ms).

## Roteiro para o autor

1. Rode `npm run dev -- --host 127.0.0.1 --port 5178`. No menu,
   abra **Configurações → Modo de desenvolvimento → Continuar** ou
   **Encontro de teste** para criar o perfil. Em Marte, siga ao deck,
   embarque com E, selecione Rio de Janeiro e confirme a decolagem.
2. Desembarque. Confira o mar embaixo à direita, o deck embaixo à
   esquerda e o morro em cima à esquerda ao afastar a câmera. Verifique
   o rádio de EDEN e a posição da aeronave no radar.
3. Do deck, siga até o calçadão, atravesse a avenida e passe pela Praça
   Central até a travessa e a rua de trás. Confira o fade ao passar por
   trás dos prédios. Siga pela travessa até o pé do morro.
4. Pressione W contra cada limite. Teste a água a leste, o morro a oeste,
   o fechamento ao norte e os escombros ao sul. Use Q/C para girar a
   câmera e conferir as transições entre chão, mar e volumes.
5. Em **Controles e opções → Encontro de teste**, experimente patrulhas
   com quantidades fixas e as quatro hordas. Lute na avenida, na areia e
   na rua de trás. Recolha um kit e use 3. Abra uma caixa com E, confira
   a munição e use R. Confira radar, pausa e reinício no deck.
6. Volte à escada da aeronave, embarque, selecione **Retornar a Marte** e
   desembarque. Na campanha, confira que a cabine de Marte oferece
   Shanghai como destino.

A revisão de código do Claude e o aceite visual e de jogabilidade do autor
estão pendentes. A arte do cenário e dos inimigos do Rio, as cotas, a
progressão e a integração com a Frente B seguem para as fases previstas.
