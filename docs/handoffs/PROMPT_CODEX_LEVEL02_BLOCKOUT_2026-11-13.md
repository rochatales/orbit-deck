# EXODEN · Level 02 · Rio de Janeiro · blockout jogável · 13/11/2026

> Prompt para o Codex. Autor: Tales Rocha. Papel do Codex: **implementar o
> blockout jogável em Three.js**. Revisão: Claude. Aceite de jogabilidade e
> visual: só o autor. A arte no Blender é a fase seguinte e fica com o Claude.

## 1. Antes de começar

1. Valem `AGENTS.md` e as regras dos prompts anteriores: sem merge, sem push,
   sem editar plano e quadro, textos em pt-BR, "uma colônia" e nunca "última
   colônia".
2. Base: **`claude/level02-rio-de-janeiro`**, no commit que contém este prompt.
   Ela parte de `rochatales/s5.3-ajustes-control-room` (`72a03ef`). **Não contém
   a Frente B** (`rochatales/s3.9-extracao-derrota`).
3. Branch nova em worktree própria: `rochatales/level02-rio-blockout`.
4. Leia antes de mexer:
   - `docs/level-02/BRIEF.md`: decisões do autor, planta e pendências;
   - `docs/handoffs/level02-rio-de-janeiro.md`: como a planta foi feita.
5. O level não tem numeração no plano oficial. Não crie numeração.

## 2. O que já existe

- **Planta v0 aprovada como base.** O autor confirmou que o croqui é a vista da
  câmera: o mundo fica alinhado aos eixos, como em Shanghai.
- **Fonte única:** `art-source/rio-fase01/scripts/layout.py` gera
  `art-source/rio-fase01/export/layout.json`. O arquivo tem todas as chaves do
  `layout.json` de Shanghai (`bounds`, `ship`, `exit`, `landingReservation`,
  `walkableAreas`, `obstacles`, `buildings`, `loot`, `patrolRoutes`, `spawns`,
  `routes`, `viewpoints`) e mais quatro próprias: `bands`, `parts`, `limits` e
  `limitColliders`.
- **Dimensão:** 102 × 108 m, igual a Shanghai. O mar fica em +X e não é
  caminhável: a área caminhável vai até X = 36.
- **Pranchas:** `art-source/rio-fase01/notas/planta-v0-camera.svg` e
  `planta-v0-topo.svg`.
- **Testes do contrato:** `tests/rio-layout.test.mjs`.
- Nada em `src/` conhece o Rio.

## 3. Estado do jogo

- `src/game/session.ts`: `MapId = 'mars' | 'shanghai'`.
- `src/game/config.ts`: `MAPS` e `MAP_CAMERA_ANGLE` por mapa.
- `src/game/shanghaiWorld.ts` e `src/game/shanghai/layout.ts`: criam o mundo de
  Shanghai a partir do `layout.json`. O visual vem de um GLB carregado à parte;
  a colisão vem só dos dados.
- `src/combat/config.ts`: `encounterLayout()` entrega rotas, spawns, kits e
  ponto de chegada ao combate.
- `src/ui/ShipCockpit.tsx`: a cabine tem um destino fixo por mapa (`EXTERIOR`).
- **17 arquivos comparam o mapa com o texto `'shanghai'`** para dizer "mapa de
  combate": `App.tsx` (13 vezes), `useExpeditionStore.ts` (8), `AmbienceMixer.ts`
  (7), `OfficeScene.tsx` (5) e outros.

## 4. O que entregar

### 4.1 Terceiro mapa

- Acrescentar `'rio'` a `MapId`, com título "Terra · Rio de Janeiro".
- **Não espalhar `|| map === 'rio'`.** Trocar as comparações com `'shanghai'` que
  significam "mapa de expedição" por uma consulta única (por exemplo um campo
  `kind: 'hub' | 'expedition'` em `MAPS` e um `isExpedition(map)`). Manter
  `'shanghai'` só onde a regra é mesmo de Shanghai (kits, carros, caixas, modo
  `?shanghaiAtual`).
- Shanghai e Marte não podem mudar de comportamento. Os testes existentes são a
  prova.

### 4.2 Mundo do Rio a partir da planta

- Copiar a planta para o runtime (`src/assets/rio-fase01/layout.json`) como
  cópia exata da exportação, com teste de igualdade. A fonte continua sendo o
  script em `art-source`.
- Criar o mundo em `src/game/rio/` no mesmo molde de `shanghai/layout.ts`:
  `bounds`, `walkableAreas`, `obstacles`, reserva de pouso e colisão da nave.
- **Limites:** usar `limitColliders`. O mar é limite: o jogador e os inimigos não
  entram na água.
- Piso plano em Y = 0 nesta fase. Calçadas e praças podem ter o degrau de 12 cm
  de Shanghai ou ficar planas; registrar a escolha.

### 4.3 Visual de blockout

Volumes simples e cores sólidas, gerados da planta. Sem GLB e sem textura.

- Faixas do chão com cores distintas: asfalto, calçada, calçadão, areia, praça.
- Prédios como caixas na altura da planta (`height`), com o esmaecimento que
  Shanghai usa quando escondem o jogador.
- Quiosques: deck baixo e núcleo cilíndrico.
- Deck de pouso com a marcação da reserva.
- Mar: plano azul além de X = 36, sem colisão visual estranha na borda.
- Limites: volumes altos para o morro (oeste e norte) e volumes quebrados para
  os escombros (sul). Devem deixar claro que o mapa acaba ali.
- O ARES pousa no deck como em Shanghai.
- Luz provisória de fim de tarde. A luz final é fase de arte.

### 4.4 Câmera

`MAP_CAMERA_ANGLE.rio = Math.PI / 4`. Conferir na prévia: mar embaixo à direita,
deck embaixo à esquerda, morro em cima à esquerda, como na prancha
`planta-v0-camera.svg`.

### 4.5 Viagem e acesso

- **Só no modo de desenvolvimento** nesta fase. Na cabine em Marte, o
  desenvolvimento passa a escolher o destino entre Shanghai e Rio.
- Na campanha, o Rio não aparece ou aparece como "sem sinal". A campanha
  continua indo só a Shanghai.
- Ida, pouso, desembarque, embarque e retorno a Marte funcionando no Rio.
- Vídeo e imagem da cabine do Rio podem reutilizar os de Shanghai, com o texto
  do destino correto. Registrar como provisório.

### 4.6 Combate

- Usar os inimigos atuais de Shanghai. A arte dos inimigos do Rio ainda não foi
  aceita pelo autor.
- `encounterLayout` do Rio com `patrolRoutes`, `spawns` e `exit` da planta. Os
  spawns já têm `routeIndex` e `waypoint` no formato de Shanghai.
- Kits médicos e caixas de munição: propor posições (quiosques, praças e rua de
  trás), fora da reserva de pouso.
- O seletor de encontros de teste funciona no Rio: patrulhas, quantidades fixas
  e as quatro hordas.
- A navegação por grade precisa achar caminho de todo spawn até o desembarque.
  Cobrir com teste.

### 4.7 Áudio e HUD

- Ambiência e trilha: reutilizar as de Shanghai nesta fase, sem erro de mapa
  desconhecido no mixer.
- Radar, objetivo, rádio e pausa funcionando no Rio.

## 5. Fora desta fase

- Blender, GLB, texturas e o calçadão em ondas.
- Inimigos novos (Mutante Rio e Patrol Rio).
- Rio na campanha, objetivos, cotas e recursos próprios.
- Pilotis caminháveis, becos e segundo prédio por quadra. Seguem como decisão do
  autor no brief.
- Ajustar a planta. Se algo na planta atrapalhar o blockout, **não edite o
  `layout.json` à mão**: registre no handoff para o Claude ajustar o script.

## 6. Critério de conclusão

- Testes:
  - mundo do Rio com os limites e a área caminhável da planta;
  - cópia do runtime idêntica à exportação;
  - caminho de cada spawn até o desembarque;
  - viagem Marte → Rio → Marte no desenvolvimento, sem duplicar carga;
  - campanha sem acesso ao Rio e saves dev e de campanha intactos byte a byte;
  - nenhum comportamento de Shanghai ou de Marte alterado.
- `npm test`, `npm run build` e `git diff --check` verdes.
- Medição `?perf` no Rio com as quatro hordas, para comparar com Shanghai.
- Handoff em `docs/handoffs/level02-rio-blockout.md` com base, arquivos,
  escolhas provisórias, capturas do mapa na câmera padrão e roteiro manual:
  pousar, andar do deck ao morro, tocar os quatro limites, lutar na avenida, na
  areia e na rua de trás, e voltar a Marte.
- Parar ao fim e pedir revisão. O agente não aprova jogabilidade nem visual.
