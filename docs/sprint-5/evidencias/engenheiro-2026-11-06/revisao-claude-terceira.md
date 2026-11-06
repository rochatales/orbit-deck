# Confirmação em `c5c2af9`

**A1 e A3 estão resolvidos. A2 está resolvido no problema que apontei, a saída do banco, mas a entrada ainda tem uma falha menor.** `tests/engineer.test.mjs` passou 15/15 em `c5c2af9`. Li só o diff pedido, não rodei o jogo no navegador nem repeti a suíte e o build, e nada foi editado.

| Item | Estado | O que confirmei no diff |
|---|---|---|
| **A1** | Resolvido | O grupo visual e o balão estão fora do `RigidBody`, e `EngineerRig` posiciona o grupo a cada quadro, mesmo com a física pausada. Ao fechar a conversa, o NPC desliza de volta ao banco, sem o salto. |
| **A2 (saída)** | Resolvido | Com o apoio ou a saída ocupados, o NPC fica em `Sitting`, sem gastar o tempo da atividade nem reagir ou levantar. `canTalkToEngineer` só libera a conversa com saída livre, e o teste de 20 s prova a espera. |
| **A3** | Resolvido | `sessionEscape` é pura e o handler a usa, com o mesmo comportamento de antes. O teste cobre pausa → diálogo, cabine e viagem. |
| **Linha de visão** | Correto | A closure saiu, e a checagem ainda considera obstáculos e portas, sem exigir solo caminhável entre os dois. |

## Problema restante

### P3: a entrada no banco não verifica se o jogador está ali
- **Onde:** `src/npcs/engineerRoutine.ts:77` e `:89`
- **Causa:** a proteção da linha 89 só vale com `seated > 0`, mas a chegada começa com `seated = 0`. A linha 77 passa a recuar assim que a animação vira `Sitting`, sem olhar o jogador. Depois disso, a linha 89 mantém `Sitting`, e o recuo continua até o banco.
- **Exemplo:** com o jogador encostado no lado do banco, em (-10,3; 13,65), ele fica a 1,07 m do ponto de parada, e a caminhada só cede abaixo de 1,05 m. O NPC chega e recua, e a cápsula termina a cerca de 0,65 m do jogador, quando o contato seria a 0,70 m. Atrás do banco, em x≈-10,95, acontece o mesmo.
- **Impacto:** a sobreposição é de cerca de 5 cm, bem menor que a do problema original, e o jogador pode sair andando. Calculei isso pelas coordenadas; não testei o efeito no controlador do jogador.
- **Correção:** só iniciar o recuo com espaço livre, por exemplo `s.animation === 'Sitting' && (s.seated > 0 || engineerHasStandingRoom(s, player))`. O teste pode pôr o jogador nesse ponto antes da chegada e verificar que `seated` continua em 0.

Isso não impede o aceite visual: você pode corrigir agora ou registrar como pendência no handoff.

## Limite do teste de A1
A asserção sobre `physical` em `tests/engineer.test.mjs` não prova nada, porque esse `Group` nunca é atualizado. A separação entre visual e corpo em `EngineerScene.tsx` foi confirmada só por leitura, então, se o grupo voltar para dentro do `RigidBody`, o teste continua passando. O comportamento atual está correto; o que falta é proteção contra regressão.
