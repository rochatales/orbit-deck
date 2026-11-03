# Retificação do §2 da coordenação — 01/11/2026

Revisão recebida do autor sobre Control Room `a57d7ea`, base `f1756c4`.
Este documento corrige a orientação de integração do handoff
`coordenacao-sprint-6-personagens.md` na branch do Claude (`efe53ac`). O original
não existe na base desta worktree e não foi editado na branch de outro agente;
a retificação fica pronta aqui para o coordenador incorporar. **Nenhuma fila
de merge foi autorizada ou executada.**

## Estado conferido

| Linha | Ponta conferida | Ancestralidade e situação |
|---|---|---|
| Integração do autor `rochatales/horda-survivor` | `b54162c` | Parte de `720527d` + nove commits de quadro (`docs/SPRINT_STATUS.md`); **não contém `f1d53f1`** |
| Rifle/plano `claude/s6.2-encaixe-armas` | `efe53ac` | Parte da linha `f1d53f1`; contém `96d8ea5`. `f1756c4` não é ancestral desta ponta |
| F1 `rochatales/s6.8-explorador-astronauta` | `8257cdb` | Parte de `96d8ea5`; divergiu das alterações documentais posteriores do Claude |
| Control Room `rochatales/s6.12-control-room` | `a57d7ea` antes desta correção | Parte de `f1756c4`; revisão técnica recebida, aguardando correção de EOF e decisões de design/aceite do autor |

Bases comuns verificadas:

- Integração × rifle/plano: **`720527d`**.
- Rifle/plano × F1: **`96d8ea5`**.
- F1 × Control Room: **`f1d53f1`**.

Assim, a ordem anterior “rifle/plano → F1 → Control Room, tudo por `--ff-only`”
**não funciona nas pontas atuais**. Não confundir ausência de conflito de arquivo
com relação de ancestralidade necessária ao fast-forward.

Comandos de conferência, sem mudar branch, arquivos ou histórico:

```bash
git rev-parse rochatales/horda-survivor claude/s6.2-encaixe-armas \
  rochatales/s6.8-explorador-astronauta rochatales/s6.12-control-room
git merge-base --is-ancestor b54162c efe53ac
git merge-base --is-ancestor efe53ac 8257cdb
git merge-base --is-ancestor 8257cdb a57d7ea
```

Os três testes de ancestralidade retornaram **1** (não ancestral).
`git merge-tree --write-tree --messages` também foi usado como simulação:
`a57d7ea` × `8257cdb` sem conflito; `b54162c` × `a57d7ea` com conflito em
**`docs/SPRINT_STATUS.md`**. Só foram calculados objetos de árvore; nenhuma ref,
checkout ou commit de merge foi criado.

## Proposta para decisão posterior do autor

1. Concluir os aceites visuais necessários e preservar fora do repositório o
   espelho sem rastreio de Control Room. Conferir individualmente colisões com
   outros arquivos locais que a integração escreveria.
2. O autor decide se autoriza uma **branch de integração partindo de `b54162c`**,
   reunindo as linhas por merges e resolvendo o quadro de status. Esse ponto de partida
   preserva `b54162c` como ancestral sem reescrever os commits das tarefas.
3. Revisar e testar o resultado reunido antes de propor avanço do checkout
   principal. O avanço final por `--ff-only` só será possível se essa branch
   partir da ponta principal e continuar descendente dela; não existe ainda.

Não há rebase/cherry-pick/merge em execução nem comandos de mutação prescritos
para rodar agora. Rebase das tarefas reescreveria histórico e não faz parte
da autorização atual. A correção de EOF não resolve a divergência nem concede
aceite visual ou autorização de implantação.

## Espelho sem rastreio

Antes desta correção, os 42 arquivos rastreados de `art-source/control-room/`
tinham bytes iguais no espelho principal; havia `.DS_Store` extra. Essa cópia
fica **deliberadamente preservada** na versão de arte anterior, sem sincronizar
esta correção sobre arquivos locais do autor. O autor precisa escolher um
destino fora do repo e guardar a pasta completa antes de integrar. Não usar
`git clean`, exclusão em lote ou sobrescrita forçada.

## Design ainda aberto

O candidato veio de pedido direto do autor com referência, em paralelo ao plano
F5. Tamanho 7 × 6,5 m/opção C, projeção abstrata em vez do androide, portas 2,2 m,
interação 2,7 m, passagem 1,28 m e atlas 2048² **não são decisões automáticas
de substituição do F5**. Confirmar esses pontos e a leitura dos letreiros na
câmera do jogo com o autor. Nenhuma mudança artística/runtime nesta retificação.
