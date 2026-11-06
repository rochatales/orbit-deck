**Um achado provável, não reproduzido:** o jogador pode conseguir subir no banco. Fora isso, não encontrei defeitos neste ajuste. `tests/engineer.test.mjs` passou 17/17. Não editei, commitei nem fiz merge.

## Achado

**Banco ficou baixo demais para barrar o autostep do jogador: `src/npcs/EngineerScene.tsx:67`**

- **Causa:** a escala também reduziu a altura do colisor, cujo topo passou de 0,45 m para cerca de 0,303 m.
- **Limite do jogador:** o autostep é de 0,26 m (`playerConfig.ts:35`, usado em `PlayerController.tsx:100`), o que deixa só 0,043 m de folga nominal.
- **Por que a folga pode não existir:** pelo que lembro do código do Rapier, ele soma o `offset` do controller à altura do autostep. Com 0,06 m (`playerConfig.ts:34`), o limite real seria cerca de 0,32 m, acima do banco. Antes, com 0,45 m, isso não acontecia em nenhum dos dois casos.
- **Efeito se confirmar:** com o banco livre, o jogador sobe nele andando em linha reta, em vez de ser barrado. A largura não impede: o topo tem cerca de 0,36 m, contra 0,22 m exigidos.
- **O que falta confirmar:** não verifiquei o `offset` no código do Rapier nem testei em execução, porque você limitou a execução ao teste do Engenheiro. Os testes atuais não cobrem esse caso, porque o teste do banco ocupado posiciona o jogador direto, sem passar pelo controller.
- **Correção sugerida:** escalar só X/Z do colisor e manter a altura em `.225` (`args` Y e `position` Y). O visual continua em 0,306 m, e o colisor volta a barrar como antes. O bloqueio físico não precisa acompanhar a altura visual, porque a cápsula do NPC já se sobrepõe ao banco quando ele está sentado.

**Verificação manual:** na prévia, andar contra o banco vazio pelos quatro lados e confirmar que o jogador é barrado.

## Conferido sem defeito

- **Escala:** é aplicada a um clone novo a cada efeito, então não acumula, e nenhum clipe a sobrescreve.
- **Cápsula:** a meia-altura de 0,305 m e o raio de 0,32 m são iguais aos do player.
- **Navegação:** o raio de 0,38 m preserva a margem de 0,06 m nas rotas.
- **Obstáculo do banco:** a aproximação continua livre, com 0,66 m entre o ponto de parada e o obstáculo.
- **Esbarrão:** o raio de 0,78 m continua alcançável, porque o contato físico acontece em 0,70 m.
- **Portas:** o corte por altura em 1,50 m bate com a nova altura do NPC.
- **Passada:** a velocidade e a distância da arrancada são proporcionais à escala.
