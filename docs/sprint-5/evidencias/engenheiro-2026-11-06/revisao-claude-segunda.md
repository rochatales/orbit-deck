# Confirmação em `47261e8`

**Os seis ainda não estão todos corrigidos: cinco estão, e o achado 2 (banco) está corrigido só em parte.** Também encontrei um problema novo, criado pelo recuo do banco. `tests/engineer.test.mjs` passou 12/12 em `47261e8`; não repeti a suíte nem o build, e nada foi editado.

| # | Achado | Estado | Evidência no diff |
|---|---|---|---|
| 1 | Retomada de clipes | Corrigido | `clipTime` é aplicado após o `reset()`, e o teste cobre as duas transições com conversa e esbarrão |
| 2 | Banco | **Parcial** | Caminhada, levantar e esbarrão estão certos; a conversa não (A1) |
| 3 | Escape na pausa | Corrigido | A pausa vem antes de fechar a conversa, mas falta teste (A3) |
| 4 | Arrancada | Corrigido | k=1,1, com teste contra os 1,63 m da animação original |
| 5 | Alocação por passo | Corrigido | `clearSegment` saiu da rotina |
| 6 | Testes | Corrigido | A porta real bloqueia fechada e libera aberta; o modo desenvolvimento compara todo o `localStorage` |

## Achados restantes

### P2
**A1. Na conversa, o NPC continua dentro do banco e salta ao fechar o diálogo**
- **Onde:** `src/npcs/EngineerScene.tsx:49` e `:55`, com `src/physics/PhysicsWorld.tsx:10-11`
- **Causa:** o visual é filho do `RigidBody`, e o painel aberto pausa a física. Com a pausa, o binding não executa `step` nem atualiza a posição da malha (`react-three-rapier.esm.js:972` e `:810-850`).
- **Ao abrir a conversa:** `routine.position` volta ao ponto livre, mas o corpo e o visual ficam em x=-10,3. O NPC faz `Yelling` em pé, no centro do banco.
- **Ao fechar:** a física volta e o NPC salta cerca de 0,8 m para a frente, depois recua até o banco em 0,35 s, já na pose sentada.
- **Por que o teste não pega:** `tests/engineer.test.mjs:93-94` só confere `routine.position`, não o objeto em cena. Deduzi o efeito do código e do binding, sem rodar no navegador.
- **Correção:** tirar o grupo visual do `RigidBody` e posicioná-lo a cada quadro com `routine.position`, deixando o corpo só com a cápsula. Vale testar também que o visual segue esse ponto com a física pausada.

**A2. O recuo do banco leva a cápsula para cima do jogador**
- **Onde:** `src/npcs/engineerRoutine.ts:72-74`
- **Causa:** a saída do banco não verifica se o ponto livre está desocupado, ao contrário da caminhada, que para a menos de 1,05 m do jogador.
- **Exemplo:** o caminho natural até o NPC sentado é pela frente, vindo da porta. O esbarrão dispara com o jogador em x≈-9,54 a -9,46, e a cápsula volta para x=-9,45, praticamente sobre ele. Isso também acontece ao levantar com o jogador ali.
- **Risco:** o controlador do jogador não é empurrado por corpos cinemáticos, então as cápsulas se sobrepõem e a reação com giro acontece sobre o jogador. Não testei se isso também atrapalha o movimento do jogador.
- **Correção:** enquanto o jogador estiver a menos de cerca de 0,8 m do ponto livre, manter `seated` em 1, adiar o levantar e não disparar o esbarrão. Falta teste com o jogador nesse ponto.

### P3
**A3. O Escape corrigido não tem teste**
- **Onde:** `src/app/App.tsx:98-100`
- **Problema:** o código está certo, mas nenhum teste cobre a ordem pausa → conversa, e essa regressão passaria despercebida.
- **Correção:** como `tests/home-screen.test.mjs:85` já confere o código-fonte de forma parecida, uma asserção semelhante ou uma função pura extraída do handler resolve.

## Sem achados
- **Trajeto até o banco:** `seatObstacle` deixa folga de 0,57 m até a parada, maior que o raio de 0,38 m, e o teste valida os caminhos contra esse obstáculo.
- **Coerência do recuo:** a parada menos o recuo de 0,85 m dá exatamente o centro do assento.
- **Clipes em loop:** um `clipTime` maior que a duração, como em `Crouch` e `Sitting`, é normalizado pelo mixer no primeiro passo.
- **Escape na cabine:** priorizar a pausa não muda esse fluxo, porque embarcar limpa a pausa e nenhum caminho que li a religa na cabine.
