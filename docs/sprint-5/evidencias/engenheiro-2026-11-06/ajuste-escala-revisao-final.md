**A hipótese do autostep não se reproduziu, e não há defeito real restante no ajuste de escala.** Retiro o achado da revisão anterior: a correção sugerida no colisor do banco não é necessária. Rodei `tests/engineer.test.mjs` e deu 18/18; não rodei a suíte completa nem o build.

## O que confirmei
- **Bloqueio:** os quatro lados param entre 0,50 m e 0,65 m do centro, faixa exigida pelo teste. Isso bate com os cerca de 0,56 m informados (0,182 do banco + 0,32 da cápsula + 0,06 do offset).
- **Fidelidade ao runtime:** o teste usa o mesmo Rapier do `@react-three/rapier`, com os parâmetros de `playerConfig` e a mesma configuração do controller. A cápsula e a altura também batem com o jogo.
- **Filtro omitido:** o teste não passa o `solidOnly` de `PlayerController.tsx:208`, mas isso não muda nada, porque esse filtro só exclui sensores e o teste não tem nenhum.
- **Runtime:** desde `44aa9c3`, só mudaram o teste e arquivos de `docs/`, então o build anterior continua válido.

## Erro na minha revisão
Tratei "subir no banco" como possível sem ler o trecho do controller. O `next.y` em `PlayerController.tsx:211` vem de `supportHeight` e ignora o Y corrigido pelo controller, então o autostep nunca eleva o jogador. O único risco real seria atravessar o banco na horizontal, e é isso que o teste mede.

## Limites do teste (não são defeitos)
- **Cobertura:** ele só testa aproximação frontal a 60 Hz e 4,2 m/s, sem diagonais, quinas ou dash (7,2 m/s).
- **Sem controle positivo:** nenhum obstáculo mais baixo mostra o autostep disparando nesse arranjo. Como o bloqueio foi medido em posição real, o resultado continua válido para o caso testado.
- **Medidas copiadas:** o colisor é recriado com a mesma fórmula de `EngineerScene.tsx:67`, então uma mudança na cena não faria o teste falhar.

Nada disso bloqueia a entrega. As quinas e o dash podem entrar no roteiro visual do autor: correr e usar dash contra o banco vazio, inclusive nas quinas.
