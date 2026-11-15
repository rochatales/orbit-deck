# Level 02 Rio — recebimento da base consolidada em 15/11/2026

## Resultado e histórico

Merge autorizado pelo autor, exclusivamente na branch `rochatales/level02-rio-morros`, worktree `/Users/rochatales/.codex/worktrees/level02-rio-morros/game-workplace`.

- Base anterior do Rio: `6e814a31e1617030d624bf248864fe081b416334`.
- Preservação das entregas locais: **`7156da9`**, 87 arquivos selecionados por caminhos explícitos. Inclui fontes e renders dos morros v004, água v005, texturas, GLBs, código e testes existentes. Não é aceite visual dessas entregas.
- Base recebida, confirmada por `git fetch origin`: **`fa79e37dc648c3ea39aedb9540bb19151a252436`**, `origin/rochatales/horda-survivor`; código consolidado `3105d4f`, contendo S3.9 `2a5e4cd`.
- **Commit do merge: `267db19f932edfed961bbd3035f237341f331247`**, pais `7156da9` e `fa79e37`.
- Sem rebase, cherry-pick, reescrita de histórico ou push. As branches/worktrees de blockout, arte e píer e a branch de integração não foram alteradas.
- `docs/SPRINT_STATUS.md` corresponde byte a byte ao arquivo em `fa79e37`.

A primeira inspeção encontrou a tarefa de água ainda editando arquivos. O merge aguardou a conclusão informada pelo autor. Após a retomada, a suíte local anterior ao merge passou com **672/672**; o build também passou. Todo esse trabalho foi preservado antes de iniciar o merge.

## Conflitos resolvidos

| Arquivo | Resolução |
|---|---|
| `src/combat/CombatHud.tsx` | Mantida a apresentação e a derrota de campanha da S3.9. Preservado o nome do mapa no texto de nova tentativa em Desenvolvimento: Rio de Janeiro ou Shanghai. |
| `src/interactions/WorldInteractionBubbles.tsx` | Mantidos o marcador de extração e o embarque da S3.9, junto das caixas específicas por expedição (`expeditionCrates`) e do acesso à carga no Rio em Desenvolvimento. |
| `src/state/useExpeditionStore.ts` | Retry local continua disponível nos dois mapas em Desenvolvimento; permanece bloqueado em campanha conforme S3.9. Preservados destino selecionável, spawn e respawn do Rio. |

As combinações automáticas em `App.tsx`, `CombatScene.tsx`, `simulation.ts` e `ShipCockpit.tsx` foram inspecionadas. O cálculo de limpeza, snapshot reutilizado, tempo de conclusão, respeito a movimento reduzido e desaceleração visual vieram da S3.9; terreno, encontro e suprimentos específicos do Rio foram preservados.

## Conferência da S3.9 no Rio — pendências, sem alteração da regra

**A equivalência completa com a campanha de Shanghai ainda não existe.** O Rio continua disponível apenas em Desenvolvimento. Nesse modo, a própria S3.9 mantém retorno livre e nova tentativa local também em Shanghai. Não foi imposto bloqueio de extração ao Desenvolvimento para simular campanha.

| Comportamento | Resultado da conferência |
|---|---|
| Limpeza do combate | Compartilhada e testada no terreno do Rio: exige jogador vivo, todas as hordas concluídas, intervalo zerado, fila vazia e nenhum inimigo vivo. O HUD recebe a transição uma vez e reinicia o estado na nova tentativa. |
| Retorno só com mapa limpo | O bloqueio de decolagem de campanha está condicionado a `map === 'shanghai'` na store de expedição e na cabine. Rio em Desenvolvimento mantém retorno livre. |
| Tela de mapa limpo | `CombatHud` apresenta `LevelClear` somente em campanha. `LevelClear.tsx` mantém o título `SHANGHAI CLEAR` e a consulta de cota de Shanghai. No Rio/Desenvolvimento permanece o resultado simples do encontro. |
| Derrota voltando para antes da decolagem | A restauração do porão por `departureCargo` e o retorno ao deck de Marte estão cobertos pelos testes da campanha de Shanghai. `returnAfterDefeat` ainda exige Shanghai; no Rio/Desenvolvimento o comportamento é retry local. Não foi alegada validação de derrota em uma campanha Rio inexistente. |

Para uma futura campanha no Rio, será necessário revisar, em tarefa autorizada:

1. A elegibilidade do destino Rio e suas etapas/cotas na política de campanha; hoje `send('depart', 'rio')` é recusado fora do Desenvolvimento.
2. Os seletores de mapa do bloqueio de decolagem, marcador de extração, consolidação da viagem e retorno após derrota em `useExpeditionStore.ts`, `ShipCockpit.tsx` e `WorldInteractionBubbles.tsx`.
3. A apresentação de `LevelClear.tsx`, seu título e a consulta de cota pelo mapa correto.
4. Testes de viagem, derrota, abandono/reload e restauração de carga numa campanha Rio real.

Esses ajustes foram apenas listados, conforme pedido do autor. A regra recebida da S3.9 não foi ampliada nesta tarefa. Esta conferência corrige a expectativa do handoff de abertura do Rio de que a equivalência completa viria automaticamente, sem trabalho adicional.

## Testes e preservação

- `npm test`: **677 testes passaram, zero falhas, zero ignorados**. Todos os arquivos de testes da base publicada permanecem presentes; nenhum teste foi removido ou desabilitado.
- `npm run build`: passou. Aviso de bundle acima de 500 kB, sem erro de compilação.
- `git diff --check`: passou; também conferido o diff completo desde `6e814a3`.
- Teste novo `tests/rio-s39-merge.test.mjs`: execução das quatro hordas no terreno Rio, publicação única de limpeza, tempo de conclusão estável, derrota sem limpeza e reset da apresentação.
- Atualizado `tests/rio-blockout.test.mjs`: rejeitar Rio na campanha continua sem escrita; uma decolagem válida para Shanghai passa a salvar a carga anterior, conforme S3.9. Os demais saves continuam preservados. O teste antigo que exigia ausência de qualquer escrita mesmo após decolagem válida foi adaptado ao novo contrato.
- Testes recebidos da S3.9 cobrem bloqueio da cabine, apresentação/marcador, retorno parcial, derrota, abandono e reload. Os testes existentes de viagem do Rio, píer e água também passaram.
- Comparação SHA-256 dos 87 arquivos locais contra o estado preservado: nenhum asset, script de arte ou código de água foi alterado pelo merge. As exceções posteriores são o teste de viagem acima e sete quebras de linha Markdown nos dois estudos, convertidas de espaços finais para barra invertida para manter a renderização e satisfazer `diff --check`.

Não foram refeitos renders, exportações Blender ou aprovação de jogabilidade nesta tarefa de recebimento de base. O aceite da água, dos morros e do Rio permanece com o autor.

## Roteiro de revisão do autor

1. Em Desenvolvimento, viajar ao Rio, conferir píer e água, voltar com ameaças ainda presentes e testar nova tentativa após derrota. Esse retorno livre é o comportamento preservado do modo.
2. Em campanha, viajar para Shanghai e conferir que embarcar é permitido, mas decolar permanece bloqueado até a limpeza real, incluindo os intervalos e a fila das ondas.
3. Após limpar Shanghai, conferir a tela, o marcador e o retorno; numa nova tentativa, perder com carga anterior no porão e conferir o retorno ao deck de Marte e a restauração do saldo de antes da decolagem.
4. Revisar as pendências acima antes de autorizar a extensão da campanha ao Rio. Não há aceite visual ou de jogabilidade marcado pelo agente.
