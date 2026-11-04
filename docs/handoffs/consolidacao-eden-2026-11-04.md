# Consolidação aprovada — EDEN, tela inicial e ajustes da espada

Data: 04/11/2026. Pedido do autor: EDEN exatamente como na frente antiga da porta 5191;
todo o restante com os ajustes atuais; tudo aprovado e consolidar.

## Resultado e base

- Base remota fixada antes da execução: `d232de0037b7a7fd7609121f552e1d3dfe9dfb15`.
- Ajustes aprovados da espada preservados no commit `02df590`: farol com espada/Dash,
  filete azul nos dois mapas, rifle reserva junto à mochila e passo físico do combo.
- Consolidação em `rochatales/consolidacao-eden-2026-11-04`, worktree
  `/Users/rochatales/.codex/worktrees/consolidacao-eden-2026-11-04/game-workplace`.
- EDEN incorporada em `5d7e015`. Tela inicial incorporada em `957d578`.
  **Código consolidado:** `957d57897313d8ed4d64d5459080de956efbabeb`.
- Portes seletivos, sem merge, rebase, cherry-pick ou reescrita. As worktrees de origem e
  o checkout principal com alterações do autor permanecem preservados.

## EDEN da porta 5191, sem trazer o restante da frente antiga

Origem: `claude/s6.12-eden-control-room`, commit `23b17ff101a51ee57c85ce3c053ec3ec7c9c75e3`.
Os **12 arquivos** alterados por essa entrega foram inicialmente incorporados byte a byte: GLB v002,
fonte Blender/script/notas, runtime/componente, montagem da figura, integração com descarte
da areia, altura do balão e testes. Asset, escala **0,8**, posição no pedestal, materiais,
Idle_Float, Heart_Surge, Coordinate_Telemetry e Comm_Alert preservados exatamente.

A sala não foi substituída: `ControlRoom.tsx`, `controlRoomRuntime.ts`, layout e GLB da sala
coincidem com a linha atual aprovada. Mantém iluminação, portas, teto e circulação atuais.
As alterações compartilhadas da interação só acrescentam altura opcional (padrão anterior
mantido para outros NPCs); EDEN usa balão a 3 m acima da posição configurada.

[Manifesto EDEN de origem](./consolidacao-eden-2026-11-04/eden-sha256.json).

A única adaptação posterior é no teste geométrico: a versão aprovada tem excursão de
**7,6 mm exclusivamente no Holo_Halo** acima do plano de 2,55 m do teto durante Idle_Float.
O teste antigo exigia todos os vértices abaixo desse plano e falhava também na referência.
O corpo continua sujeito ao limite estrito; apenas o halo usa limite de 8 mm, amostrado em
121 poses por clipe. Nenhum runtime, escala, clipe, asset ou posição foi alterado.
Onze arquivos continuam idênticos, e a diferença do teste está explicitada na comparação.
[Envelope medido](./consolidacao-eden-2026-11-04/eden-envelope-aprovado.json).

## Tela inicial da porta 5192 e ajustes atuais

Origem: estado aprovado de `claude/s6.15-home-exoden`, sobre `d232de0`.
**12 arquivos** copiados byte a byte, incluindo assets e fontes/scripts da tela; nenhuma
alteração foi feita na worktree do Claude. App, sessão e CSS de destino ainda coincidiam
com a base antes da cópia, portanto não havia código de combate a sobrescrever nesses
arquivos. Entram Início, Continuar, Configurações, campo de nome e a apresentação aprovada.

[Manifesto home](./consolidacao-eden-2026-11-04/home-sha256.json).
[Comparação do escopo](./consolidacao-eden-2026-11-04/comparacao.json) confirma que **todos
os demais arquivos de runtime são idênticos a `02df590`**. Assim permanecem os ajustes
de espada/colônia/Shanghai, cabine, kits, áudio, efeitos, HUD e interpolação já aprovados.

## Verificação

`npm test`: **551/551** passaram após registrar o envelope aprovado do halo.
`npm run build`: passou, somente aviso preexistente de chunk grande.
`git diff --check`: limpo. Conferências de conteúdo/SHA e escopo passaram.
O build corresponde ao runtime de `957d578`; o commit posterior `3618de2` altera apenas
o teste e a evidência do envelope, sem diferença em `src/`.
[Registro técnico](./consolidacao-eden-2026-11-04/verificacao.json). Os testes visuais e o aceite dos ajustes
vieram do autor nesta conversa; não foi produzida nova certificação de GPU/jogabilidade.

## Publicação e prévias

Destinos autorizados pela consolidação, somente por fast-forward e sem `--force`:
`origin/rochatales/consolidacao-eden-2026-11-04` e `origin/rochatales/horda-survivor`.
A ponta final publicada inclui o registro documental posterior ao código `957d578` e se
obtém com `git rev-parse origin/rochatales/horda-survivor`.

A porta **5193** serve o build de produção desta worktree consolidada, após os checks. As portas
5191 (EDEN original) e 5192 (home original) permanecem como referências preservadas.
O checkout principal em `b54162c` não é avançado: contém alterações e artes sem rastreio do
próprio autor. Para novas tarefas, usar a ponta publicada, não essa referência local antiga.

## Limites e roteiro

Esta entrega não encerra os escopos completos S6.12/S6.15, a fundação S6.14 nem os sprints
futuros. Mantém o aviso preexistente de chunk grande, o save de perfil/briefing e os demais
limites já documentados. Os roteiros históricos que presumem a tela antiga continuam
históricos; a fixture DEV pede entrar/Continuar antes dos comandos de QA do mundo.

Para conferência após consolidar: entrar/Continuar na nova tela; visitar EDEN na Control
Room e conversar; viajar a Shanghai; alternar rifle/espada; conferir farol, Dash e três
cortes com W/S; voltar à colônia. É roteiro de regressão para o autor, sem novo bloqueio de
aprovação dos itens já aceitos.
