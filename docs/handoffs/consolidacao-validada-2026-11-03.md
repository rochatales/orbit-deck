# Consolidação da versão aprovada · 03/11/2026

O autor aprovou todos os ajustes deste bate-bola até **`61f2ec7`**
(“Ficaram ótimos”) e pediu consolidar. Conforme acordo explícito deste chat,
isso autoriza merge e push das entregas aprovadas. Nenhum sprint novo iniciado.

## Histórico e destino

- Publicação anterior: `5bc240fd09d3e4e6af10534f8e6ed2a1dae5ebf4`, conferida
  por fetch e `git ls-remote` nas duas refs de integração/consolidação.
- Código aprovado: `61f2ec7f60fa9c713dd95e11d3300082294e151f`, branch
  `rochatales/s6.8-inventario-dash-colonia`, **31 commits** desde a publicação.
- Worktree de consolidação reutilizada:
  `/Users/rochatales/.codex/worktrees/consolidacao-validada-2026-11-02/game-workplace`,
  branch `rochatales/consolidacao-validada-2026-11-02`. Seus 41 commits de quadro
  desde a publicação e o registro desta autorização foram preservados.
- `git merge --no-ff --no-commit rochatales/s6.8-inventario-dash-colonia`:
  união limpa das duas linhas, sem conflito, rebase, squash ou cherry-pick.
  Aceites, plano e quadro reunidos no merge. Somente documentação difere do
  código aprovado; os testes verificam novamente a composição integrada.

Publicação por push atômico, sem force, em `origin`:

1. `rochatales/s6.8-inventario-dash-colonia`: código aprovado `61f2ec7`.
2. `rochatales/consolidacao-validada-2026-11-02`: merge e registros desta rodada.
3. **`rochatales/horda-survivor`**: mesma ponta final consolidada.

`main` não é alterada. O checkout principal e sua ref local permanecem em
`b54162c` com os arquivos do autor intactos. Não apagar/mover espelhos de arte,
assets, backups ou worktrees. Para novas tarefas, usar o remoto consolidado:

```bash
git fetch origin
git rev-parse origin/rochatales/horda-survivor
```

Fixar o SHA retornado; a ref local do checkout principal ainda não é a base
atual. Nenhuma branch de outro trabalho foi reunida nesta rodada.

## Composição aprovada

- Áudio: ambiência urbana em Shanghai, vento externo/interior em Marte,
  crossfades, músicas Strung Out/Dov, volumes e alcance dos passos ajustados,
  mecanismo de rifle vazio, sons distintos e sincronizados ao abrir/fechar
  portas normais e a porta frontal do Hangar.
- Poeira dos passos: avermelhada em Marte, cinza em Shanghai, apoiada no piso.
- Interações E: balão flutuante compartilhado de proximidade para nave,
  EDEN, caixas e base de interações futuras.
- HUD beta: vida vermelha/energia azul, quatro espaços de equipamento,
  ícones ilustrados, mochila de 30 kg com peso real, menus de pausa/controles
  e ferramentas de teste recolhidas. Energia para duas cargas de Dash,
  vazio → cheio em 5 s.
- Facão: modelo/clipes, troca 1/2 e golpes em Shanghai; bloqueio permanece
  fora do escopo. Cursor e giro próximos do jogador corrigidos.
- Shanghai: carros destruídos reposicionados, cabines iluminadas, quatro
  kits médicos no chão por tentativa, coletados por E para o inventário
  e usados por 3. Sem reaparecer durante as quatro hordas.
- Colônia: visor azul/frontal ligado e mochila sem luz em Marte; Shanghai
  mantém iluminação anterior. Data Center junto à fazenda solar de frente
  para a Meeting Room; Meeting Room central com portas oeste/sul; Cafeteria
  ao lado do Hangar substitui os dois prédios anteriores.
- Três prédios: portas/letreiros no padrão da Control Room, nomes montados
  acima dos vãos (Meeting Room ao sul para Hangar), sem pisos/pads próprios
  ativos. Pavimento comum com tile original dos corredores, limpo por dentro;
  duplicações coplanares removidas no interior e no entorno.
- Corredores: preenchimentos Cafeteria–Quartel/Hangar e volta externa da
  estufa até deck/embarque, recorte pelo contorno real do deck, cobertura
  única e percurso Rapier completo nos dois sentidos.
- Sandwind: névoa mais próxima da cor do terreno, nuvens avermelhadas com
  vento/inércia, pausa, máscara de interiores e recursos instanciados.
- Arma principal: escolha no inventário pausado, mantida entre viagens/retry;
  rifle ou facão pendurado na cintura em Marte. Dash também na colônia.
  Facão no encaixe aprovado, ponta 21° abaixo, herdando a rotação do quadril
  durante Dash como o rifle; volta suave ao encaixe da locomoção.

Os escopos completos de sprints futuros, S2.9, extração/persistência,
construção da máquina e dispositivos continuam pendentes. O aceite atual
não é fechamento automático desses itens. Interpolação continua opcional
(`?interp=1` na prévia aprovada); nenhum padrão físico foi trocado.

## Verificação e preservação

Comandos desta worktree: `npm test`, `npm run build`,
`git diff --check 5bc240f HEAD`, `git diff --check` e comparação da árvore
integrada fora de `docs/` contra `61f2ec7`: **481/481 testes**, build
e diff-check verdes. Somente o aviso preexistente de tamanho de chunk.
Sem nova revisão atribuída ao Claude e sem QA de jogo pelo
agente: o aceite visual/auditivo e de jogabilidade é o informado pelo autor.

Novos blobs desde a publicação: 402 versões de blobs, 132.502.358 bytes no
histórico; maior arquivo 11.320.959 bytes, nenhum acima de 100 MiB.
Fontes e hashes dos assets permanecem exatamente como na linha aprovada.
Arquivos soltos do autor no checkout principal não foram selecionados nem alterados.

O servidor **4186** continua na worktree da linha aprovada, servindo o mesmo
runtime consolidado, sem alteração de jogo por este merge documental.
Para os próximos ajustes, manter o fluxo: implementar/checks → URL para o
autor testar → retorno/aceite → consolidação e publicação quando solicitadas.

## Resultado da publicação

Merge **`dadd884cf6d38cb81b9e6b8587007cfc899efde4`**, pais `1e1bbf8` e
`61f2ec7`. Push atômico concluído nas três referências listadas: integração
e consolidação avançaram de `5bc240f` ao merge; a branch da linha aprovada
foi criada em `61f2ec7`. Sem force, rejeição ou conflito. O registro posterior
de publicação é somente documental e avança junto nas duas refs consolidadas;
a ponta final é a retornada por `git rev-parse origin/rochatales/horda-survivor`.

**481/481**, build e diff-check verdes, árvore fora de docs idêntica a
`61f2ec7`. Índice e bundle servidos em 4186 conferidos por HTTP contra o
build da consolidação. Nenhum novo teste de jogo pelo agente. O aceite
é o explicitamente informado pelo autor.
