# Integração de 18/10/2026 — Shanghai fase 01, foguete, Patrol Unit e UI nova

Pedido do autor: "aumentar mais 1/3 o tamanho do robô, já incluir no novo mapa e fazer o
merge de tudo: novo mapa Shanghai, com a nave, robôs maiores e a UI mais recente."
Executado pelo Claude na branch `claude/integracao-shanghai-fase01`, a partir de
`rochatales/horda-survivor` em `c38d38e`. O avanço da branch de integração é feito pelo
autor no checkout principal, com `git merge --ff-only`; esta sessão não opera esse
checkout. Sem push.

## Branches integradas

| Ordem | Branch | Tarefa | Conflitos |
|---|---|---|---|
| 1 | `rochatales/s6.12-colonia-v006` (`5afd225`) | Colônia de Marte v006 B3: portas, batentes, tile, bloqueio do foguete, sombra | — |
| 2 | `claude/s2.12-movimento-mira-explorador` (`82e3229`) | Movimento pela mira e Explorador r7 | — |
| 3 | `rochatales/s2.4-horda-patrulha` (`cd5ac19`) | Horda de 32, patrulha, visão, metais, corações e HUD segmentada em ciano | `global.css`: a folha nova da S2.4 inteira, mais a regra `.qa-asset` da S2.12 (selo só em DEV/`?comparar`) |
| 4 | `claude/s6.1-robo-patrulha` (`5eecb7a`) | Patrol Unit do autor, 2,67 m (1,5 × 4/3 × 4/3) | — |
| 5 | `rochatales/s6.3-shanghai-fase01` (`1452548`) | Shanghai fase 01 e foguete estacionado sem base | `CameraRig.tsx` e `OfficeScene.tsx`: as duas criaram o recuo ×3 da câmera. Ficou o enquadramento separado dos limites (S6.3), com recuo em Marte e na fase 01, a névoa de cada mapa e a luz de cada mapa |

**Fora desta integração:**

- `claude/horda-survivor-main-player-optimized-fc390c` (S6.8, fontes do Explorador):
  1,6 GB (1,0 GB de renders, 271 MB de `.blend`). O jogo não depende dela, porque o GLB r7
  entra pela S2.12. O merge chegou a ser feito e foi desfeito logo em seguida nesta branch
  local, antes de qualquer compartilhamento, para decisão do autor (LFS ou só as fontes
  finais, S7.10).
- `claude/plano-s6.19-atmosfera`: o checkout principal tem uma versão local mais nova da
  S6.19 no plano.
- `rochatales/s6.5-lab-preview`: estacionada no quadro.
- `claude/preview-colonia-r7`: prévia descartável.

## Ajustes de integração (`7062b81`)

- **Horda no mapa novo.** `CombatSimulation` recebe um `EncounterLayout`
  (`encounterLayout()` em `src/combat/config.ts`).
  - Na fase 01, os 32 spawns e as 4 patrulhas vêm do `layout.json` da S6.3.
  - Os encontros pequenos (1–5) usam os spawns mais próximos da chegada.
  - Os corações ficam em (−17,5; 9,5) e (17,5; 9,5), cruzamentos fora da reserva de
    pouso.
  - O layout anterior continua intacto para `?shanghaiAtual` e para os testes antigos.
- **Fase 01 como padrão.** `isShanghaiPhase01()` agora vale sem parâmetro. Use
  `?shanghaiAtual` para comparar com o blockout anterior. Em Node, onde não há `window`,
  vale o blockout anterior, referência dos testes antigos.
- **Sombra em Shanghai.** A `ShanghaiLighting` passa ao `ShadowFit` da S6.12, com a mesma
  direção de sol: a caixa se ajusta à tela e anda em passos de texel. Antes, a luz seguia
  o jogador numa caixa fixa de ±32 m, sem passo de texel.

## Verificações

- `npm test` **87/87**. Inclui `tests/integration-shanghai.test.mjs`:
  - horda de 32 nos spawns da fase 01, todos transitáveis e fora da reserva de pouso;
  - corações alcançáveis;
  - patrulha de 10 s sem atravessar prédios;
  - encontros pequenos perto da chegada;
  - layout anterior intacto.
- `npm run build` e `git diff --check`: verdes.
- **No navegador** (dev):
  - Marte com a colônia, o tile, a HUD nova e o r7;
  - viagem pela nave até Shanghai fase 01 (limites x −51..51, z −54..54);
  - foguete estacionado, r7, HUD nova com "0 / 32";
  - Patrol Units de 2,67 m patrulhando as ruas, coração no cruzamento.
- O selo "Prévia de teste · Personagem" da S2.12 só aparece em DEV ou com `?comparar`; o
  build de produção não o mostra.

## Pendências para o autor

1. **Colisor do robô.** O visual tem 2,67 m de altura e ~1,78 m de largura, e o colisor da
   simulação continua com raio de 0,42 m. Os robôs vão parecer atravessar quinas e uns aos
   outros. Ajustar o raio (≈ 0,8 m) muda a navegação, o contato e a separação, e pede
   conferir as vielas da fase 01 (≥ 2,5 m).
2. **Decisões abertas da S6.3:** ocultação pelos prédios altos, licença da fonte dos
   letreiros, densidade de entulho e letreiros, e ajuste fino do ritmo com a horda de 32 no
   mapa 9× maior.
3. **Escadas da área do foguete (S6.12):** aguardam a sua escolha.
4. **Quadro e plano:** marcar no `docs/SPRINT_STATUS.md` as tarefas integradas (S6.12,
   S2.12 A, S2.4, S6.1, S6.3) e os checkboxes do plano. Isso é seu, porque o checkout
   principal tem edições locais suas no plano.
5. **Desempenho:** `?perf` em equipamento real com a horda de 32 na fase 01 (32 malhas com
   esqueleto e sombra, mais o mapa).
6. **Aceite visual e de jogabilidade:** é seu. Nada aqui está aprovado.
