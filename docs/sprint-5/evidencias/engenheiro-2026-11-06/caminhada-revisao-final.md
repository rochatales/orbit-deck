**Achado encerrado em `fa10cae`: não encontrei defeito real restante no patch.** Rodei só `tests/engineer.test.mjs`, que passou 21/21 com a árvore limpa. Os 607 da suíte e o build são resultados seus, que não reexecutei.

- **Runtime (`src/npcs/engineerRig.ts:61`):** com `clipTime` nulo, um one-shot agora sempre começa em 0, e o `paused` já tinha sido limpo pelo `next.reset()`. Isso elimina a pausa imediata por `time >= duration`, causa do congelamento.
- **Outros clipes:** `ShovedReaction` é o único one-shot afetado, porque `StartWalking`, `CrouchDown` e `CrouchToStand` sempre recebem `clipTime` (`src/npcs/engineerRoutine.ts:141,153`). Idle, Yelling, Acknowledging e Sitting continuam preservando o tempo durante o blend.
- **Regressão (`tests/engineer.test.mjs:144`):** pela leitura do teste, os dois cenários falhariam no código anterior, porque o tempo herdado (cerca de 2 s no interrompido e `duration` no concluído) não passa em `time < .02`. Não rodei o teste contra o código antigo. O peso residual acima de 0,5 confirma que o novo esbarrão ocorre mesmo durante o blend, e `time > .1` com `!paused` confirma que a reação avança.

**Limites conhecidos, sem exigir mudança:**
- Reiniciar em 0 com peso residual pode causar o salto curto de pose que já apontei, proporcional a esse peso. É o custo aceito desta correção, em um caso raro.
- O teste exercita o rig diretamente, a 60 Hz, sem passar pela `EngineerRoutine`. Isso basta aqui, porque a correção está no rig e o caminho pela rotina foi rastreado na revisão anterior, mas não executado de ponta a ponta.
