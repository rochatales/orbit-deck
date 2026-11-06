# Confirmação em `14620a8`

**As duas correções estão confirmadas e não encontrei problema real restante nesse recorte.** `tests/engineer.test.mjs` passou 16/16 em `14620a8`. Li só os dois arquivos pedidos, não repeti a suíte e o build nem rodei no navegador, e nada foi editado. O mesmo intervalo também altera o handoff e as evidências, que ficaram fora desta leitura.

## Entrada no banco: corrigida
- **Chegada com o jogador por perto:** a nova checagem roda no mesmo passo em que a fase vira `sit`. O NPC fica em `Idle`, com `seated = 0`, sem iniciar o recuo nem gastar os 14 s da atividade.
- **Jogador que entra durante o recuo:** `src/npcs/engineerRoutine.ts:78-81` só avança o recuo com folga de pelo menos 0,8 m ou se o movimento não aproximar o NPC do jogador.
- **Sem travamento:** toda espera depende só de o jogador se afastar. A saída continua protegida, porque o espaço livre já garante 0,8 m em todo o trecho entre banco e apoio.
- **Conversa durante a espera:** com `seated = 0`, a conversa continua liberada, e o NPC fala em pé no ponto livre, longe do banco.
- **Teste:** as posições lateral (-10,3; 13,65) e traseira (-10,95; 13) são as mesmas do meu exemplo. O teste zera `seated` manualmente em vez de simular a chegada, mas a lógica executada é a mesma.

## Regressão de A1: corrigida
- **Estrutura da cena:** o teste executa o `EngineerScene.tsx` real e procura o visual e o corpo como irmãos no JSX. Se o grupo voltar para dentro do `RigidBody`, ele falha.
- **Comportamento sem física:** `useLayoutEffect` e `useFrame` reais rodam com o rig, o GLB e a rotina reais, sem nenhum step do Rapier. O visual percorre mais de 0,8 m até o ponto livre e termina em `Yelling`, lido do painel real da loja.
- **Asserção inerte:** o `Group` físico que não provava nada foi removido.

## Observações que não bloqueiam
- **Regra de folga sem teste direto:** nos testes que li, nenhum caso coloca o jogador no caminho no meio do recuo, então remover essa regra provavelmente não derrubaria nenhum teste. Pelo código, ela funciona.
- **Limpeza do teste de A1:** `globalThis.window` só é restaurado no fim do teste, sem `finally`. Se esse teste falhar, o valor falso de `window` continua no processo e pode confundir o diagnóstico de outros testes.

Do meu lado, os achados de código desta tarefa estão encerrados. O aceite visual e da jogabilidade continua com o autor.
