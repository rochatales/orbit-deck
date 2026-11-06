# Revisão da tarefa do Engenheiro

**Não há P1: nada quebra a campanha, os saves ou o percurso.** Encontrei 2 achados P2 e 4 P3. Não editei nada nem fiz commit ou merge.

O HEAD mudou durante a revisão, e ela cobre `8b5a28b...3a90ea1`. `tests/engineer.test.mjs` passou 9/9 em `3a90ea1`, e `git diff --check` em `src`, `tests` e `docs` não apontou nada.

## Achados

### P2
**1. Retomar uma transição interrompida causa salto de pose**
- **Onde:** `src/npcs/engineerRig.ts:40`, `src/npcs/engineerRoutine.ts:71-83` e `:113-117`
- **Problema:** conversa e esbarrão preservam `left`, mas o `reset()` reinicia o clipe em t=0.
- **Exemplo:** com 0,3 s restantes de `CrouchToStand`, o NPC volta agachado e passa a andar 0,3 s depois. `CrouchDown` tem a mesma falha. `StartWalking` também recomeça do início, com efeito menor.
- **Correção:** ao retomar `crouch-down` ou `stand-up`, restaurar `left = ENGINEER.crouchTransition`, ou sincronizar `action.time` com o tempo restante. Falta teste de regressão.

**2. O NPC caminha através do banco e fica em pé dentro dele**
- **Onde:** `src/npcs/engineerRoutine.ts:11` e `src/npcs/EngineerScene.tsx:60-64`
- **Problema:** a parada é o centro exato do assento (-10,3; 13), e o banco não existe na navegação nem em `world.obstacles`.
- **Efeito:** as pernas atravessam o assento ao chegar e ao sair, a cada ciclo. Esbarrão ou conversa durante `Sitting` também tocam clipes em pé no centro do banco. Deduzi isso das coordenadas e do código, sem ver em execução.
- **Correção:** usar um ponto de aproximação à frente do banco (+X) e só entrar na pose sentada a partir dele. Ao interromper, devolver o NPC a esse ponto.

### P3
**3. Escape na pausa encerra a conversa sem mostrar isso**
- **Onde:** `src/app/App.tsx:100`, com `:139` e `src/app/GameCanvas.tsx:23`
- **Problema:** se a janela perde o foco durante a conversa, o diálogo some e o menu de pausa aparece. O primeiro Escape fecha o painel oculto e o menu continua; só o segundo retoma o jogo.
- **Correção:** tratar `isPaused` antes de fechar o painel `engineer`.

**4. Os pés deslizam na arrancada**
- **Onde:** `src/npcs/engineerRoutine.ts:95`
- **Problema:** nos 2,93 s de `StartWalking`, a rampa com k=3 percorre cerca de 2,05 m, contra 1,63 m na animação original (`export-v001.json:158`). Calculei esses valores a partir do código e do manifesto.
- **Correção:** k≈1,1 iguala a distância total. Vale ajustar em conjunto com o aceite visual.

**5. Alocação desnecessária no passo de simulação (regra 2 do `AGENTS.md`)**
- **Onde:** `src/npcs/engineerRoutine.ts:99`
- **Problema:** `clearSegment` cria closures a cada passo, mas as rotas e os obstáculos estáticos já foram validados na criação.
- **Correção:** remover essa chamada e manter só a checagem de portas e a do jogador.

**6. Dois testes não provam o que parecem provar**
- **Portas (`tests/engineer.test.mjs:73`):** a asserção repete a mesma checagem que a rotina já fez. Se `engineerDoorClear` sempre retornasse `true`, o teste ainda passaria, então “não atravessa folhas fechadas” fica sem prova. Falta um caso negativo com a porta fechada.
- **Saves (`tests/engineer.test.mjs:117`):** só `exoden:campaign:v1` é verificado. Falta conferir `exoden:hub:v1` no modo desenvolvimento.

## Sem achados por área
- **Percurso e portas:** as rotas terminam no ponto exato e a projeção dos colisores está correta. Só as duas portas pedidas reagem ao NPC, e o som delas atenua com a distância.
- **Animação e raiz:** as durações batem com as constantes (77, 88 e 128 quadros), e o teste confirma que o quadril não se desloca na horizontal.
- **Interrupção e pausa:** pausa, viagem e outros painéis congelam a rotina, o mixer e as portas.
- **Rig e descarte:** o estado está correto depois de `3a90ea1`, que passou a liberar a textura de ossos.
- **Interação móvel e linha de visão:** o balão e o E leem a posição atual e respeitam paredes e portas. O esbarrão é alcançável: a colisão ocorre a cerca de 0,76 m e o gatilho é 0,84 m.
- **Saves e escopo:** `openEngineer` e `closePanel` não gravam nada. `?engineerEden` não afeta a campanha, e o recorte não ativa EDEN, não avança etapas nem entrega a espada.

## O que não foi verificado
- **Medição dos clipes:** o `node -e` inline foi negado, e não tentei contornar. Faltaram a emenda dos ossos nos loops e o giro final de `ShovedReaction`. O manifesto só mostra que a raiz quase não se desloca em `Acknowledging`, `Sitting` e `Yelling`.
- **Execução no navegador:** não rodei o jogo, então os pontos visuais continuam com o autor. Vale incluir no roteiro os pés em `ShovedReaction` (raiz original andava 1,65 m) e em `CrouchToStand` (0,22 m), pois esse deslocamento foi neutralizado.
- **Suíte e build:** não repeti, como você pediu. Confirme se os 595 testes e o build são posteriores a `3a90ea1`, que alterou o rig e o teste.
