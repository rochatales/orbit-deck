# Handoff — Consolidação S0–S2 de 19/10/2026

Implementa: Codex. Branch/worktree únicas: `rochatales/integracao-2026-10-19-s0-s2`,
`/Users/rochatales/.codex/worktrees/integracao-2026-10-19-s0-s2/game-workplace`.
Referência: [plano por fases](../consolidacao/PLANO_SPRINTS_0_2.md).
**Registro das Fases 1–3 e do ajuste documental após a revisão 4.1; avanço 4.2
e Fases 5–6 não executados pelo Codex.**

## Bases, commits e conferências do autor

| Referência | Commit |
|---|---|
| Base inicial indicada pelo autor | `a8c7813886a3387fe239e51c74ed384867b17097` |
| B1 · docs locais registrados na integração principal | `1637449be4880ac2c7021b5ebe931c6b55e36a43` |
| S6.13 · duas caixas, fonte final e handoff | `239d59f22b35fa85d79283516d99b8bb958a99fa` |
| Fase 1 · código e evidências | `7e91c1ad1b390f733fa9c5bc5d05fa7d6fe24df5` |
| Fase 2 · fonte B3, portas e manifesto | `989b81ff2489e169e82bb2d3a817990020800063` |

O commit documental da Fase 3 sucede a Fase 2; obter a ponta com
`git rev-parse rochatales/integracao-2026-10-19-s0-s2`. O quadro registra o SHA
consolidado de código/fontes da Fase 2, evitando autorreferência de commit.
A integração principal `rochatales/horda-survivor` permanece em B1.

O autor conferiu a Fase 0 antes de autorizar a Fase 1. Ao autorizar as Fases 2–3,
informou que o Claude verificou merges, ajuste das costas e 104/104 testes e
que ele conferiu no jogo viagem, hordas, caixas e costas. Esse é o registro
da conferência da Parada 1, baseado no relato do autor; não é uma nova revisão
invocada pelo Codex nem dispensa a revisão do conjunto na Fase 4. **O aceite de
jogabilidade continua na etapa 6.5**, conforme instrução expressa do autor.

## Fase 1 — código integrado e conflitos

Dois merges `--no-ff` executados na branch da tarefa, previstos no plano:

- Hordas de `claude/robot-patrol-queue-hordes-797d36` (`0204158`), merge
  `83e93de`, sem conflito.
- Caixas de `rochatales/s6.13-caixa-suprimentos` (`239d59f`), merge `5adee8a`.
  Quatro conflitos: `src/combat/CombatHud.tsx`, `CombatScene.tsx`,
  `simulation.ts` e `src/state/useCombatStore.ts`. Resolução da referência
  `munition-box-update`, com `encounter`, crates como quarto argumento,
  `nearCrate: false`, `encounterTotal` no restart e mensagens de munição por contexto.

Antes do ajuste de costas, 114 arquivos de `src/` e `tests/` ficaram idênticos
por SHA-256 à referência + arquivos novos da S6.13. Commit separado `c1a4be0`
limitou a percepção de 3 m a 135° de cada lado (ponto cego traseiro de 90°),
preservando paredes, cone frontal de 120°/10 m e alerta por tiro recebido de
qualquer direção. [Registro, testes e navegador da Fase 1](integracao-2026-10-19/README.md).

## Fase 2 — fontes versionadas e preservação

**67 arquivos, 4.588.322 bytes**, além do manifesto:

- 63 arquivos B3 em `art-source/mars-colony-plataforma/`: `.blend` final,
  `NOTAS_ESTUDO_v006_B3.md`, notas, scripts sem cache e dados/GLB da exportação
  de prévia. SHA-256 do `.blend` na origem, snapshot e cópia:
  `a17aa3c4b557a7e323997429ec7083d1bca5d990c55dcb552c460352f2728dc4`.
- 4 arquivos da S6.12: `jogo-e-preview.json`, `geometria/medicao.json` e
  `scripts/qa-colony-doors{,-run}.mjs`, copiados sem alteração e conferidos
  contra o snapshot. São evidências históricas; o replay completo de portas
  não foi reexecutado nesta fase.

Aplicada a regra geral da Fase 2 também às pastas `export/previa_v006_B3/` e
`geometria/`: imagens, vídeos, renders, `*.blend1`, caches e scripts temporários
ficam no snapshot. Notas/scripts anteriores incluídos na seleção explícita
da B3 permanecem como contexto de geração, sem importar os estudos Blender
v001–v005. Os colisores propostos da prévia não substituem os colisores/layout
atuais. Nenhuma nova exportação foi executada nem GLB de runtime alterado.

O [manifesto de fontes](../consolidacao/fontes-arte-2026-10-19.json) registra
cada arquivo, origem, snapshot, tamanho, SHA-256 e relação com asset de runtime:
Patrol Unit, Explorador, Astro Explorer candidato, estudos de colônia/plataforma,
MainPlayer/arte solta, renders/backups da caixa, mídias de portas e docs históricos.
Todos os arquivos de snapshot nele listados foram reconferidos por SHA-256.

| Snapshot externo | Conteúdo / total de payload |
|---|---|
| `/Users/rochatales/Automations/game-workplace-backups/consolidacao-s0-s2-20261019-201227` | Fase 0 já conferida: 3.222 arquivos (inclui 3 patches), 2.785.238.544 bytes; manifesto original intacto |
| `/Users/rochatales/Automations/game-workplace-backups/consolidacao-s0-s2-complemento-fase2-20261019-204529` | Árvore integral do Explorador: 2.398 arquivos, 3.874.118.420 bytes; cópias e origens reconferidas em duas passagens |

O complemento foi necessário porque a seleção da Fase 0 não abrangia a worktree
do Explorador. O inventário integral inclui intermediários, renders e arquivos
ignorados/caches, por isso supera a estimativa antiga de 1,6 GB do plano. Cada
snapshot tem manifesto, verificação e `RESTORE.md`; recuperar sempre em pasta
nova. São cópias locais, sem proteção contra perda do disco.

Explorador r7: exportação confere byte a byte com
`src/assets/characters/player/explorador-r7.glb`. A branch de fontes `4c0ecfd`
continua intacta, sem merge; fontes grandes aguardam decisão S7.10/LFS.
Patrol Unit: exportação preservada tem SHA-256 `56dc0510…c43b28`, diferente
do GLB já versionado `c01d3ea6…b339ad`; JSON glTF é idêntico, chunk BIN difere.
Ambos foram preservados e seus hashes completos estão no manifesto. A divergência
é anterior à Fase 2; não se afirma equivalência binária nem se reexporta o robô.
Astro Explorer v001 é candidato sem uso no jogo.

Docs de `project-review`: colaboração já incorporada por cópia revisada;
`GAMEPLAY_REVIEW_SPRINTS.md` é histórico do MCP Office e não foi adotado;
prompts WorldLabs continuam só no snapshot. S6.5 permanece estacionada.

## Fase 3 — documentação entregue

- [Quadro](../SPRINT_STATUS.md): tarefas integradas sem aceite, fontes e base
  atuais, 104 testes, linha da arte da plataforma e histórico das conferências.
- [Plano oficial](../HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md): data/status,
  notas S2.4/S2.12 A/S6.13, sem mudar qualquer checkbox existente. Não marca
  S3.1/S3.4/S3.8 nem concede aceite de item completo por uma entrega parcial.
- [Roteiro manual](../sprint-2/VALIDACAO_MANUAL.md): Shanghai fase 01, hordas
  padrão com opção de 1 robô, visão/proximidade/tiro, caixas, Patrol Unit de
  2,67 m, cobertura/loot atuais e **A1–A13 preservados literalmente** do handoff
  da S2.12. Corrigidas as instruções antigas que ainda falavam em movimento lateral
  e ausência de hordas/coleta.
- [Handoff da plataforma](arte-plataforma-lancamento.md): cópia histórica com
  nota de regularização, distinguindo o estudo v004/v005 da B3 usada pela S6.12.
- [Diff documental para a Parada 3](integracao-2026-10-19/fases-2-3/documentacao.patch),
  contra `989b81f`; o manifesto técnico da Fase 2 é lido separadamente.

## Comandos e verificação

- Inventário Git/arquivos, cópias com `shutil.copy2`, tamanho e SHA-256 por arquivo;
  hashes dos manifestos externos conferidos. Nenhuma origem movida ou apagada.
- `npm test`: **104/104**, zero falhas/skips. [Saída](integracao-2026-10-19/fases-2-3/testes.txt).
- `npm run build`: passou (TypeScript + Vite); aviso de chunk > 500 kB mantido.
  [Saída](integracao-2026-10-19/fases-2-3/build.txt).
- `node --check scripts/qa-colony-doors.mjs` e `node --check scripts/qa-colony-doors-run.mjs`:
  passaram. Scripts copiados sem alterar comportamento.
- `git diff --check`, `git diff --cached --check` e diff contra B1 passaram.
  Conferência documental verifica links novos/alterados, tabela do quadro,
  A1–A13 e igualdade dos estados de todos os checkboxes oficiais.
- Runtime, testes, dependências e lockfile iguais à ponta da Parada 1.
  Após o build/testes da Fase 2, somente docs foram editados na Fase 3; sem
  motivo para repetir a sessão de navegador já conferida pelo autor.

## Pendências do autor / próximas fases

1. Ler o diff documental desta Parada 3. Na Fase 4, revisão completa contra B1
   pelo Claude e correções/confirmação; avanço `--ff-only` somente pelo autor.
2. S0.4 (Fase 5): movimento contínuo, diálogo de EDEN e medições reais.
3. Fase 6: revisão específica da S2.12 A e A1–A13/Run; medições S2.9 no pico
   de 40; proposta da S2.12 B na Parada 6.3; S2.11 depois. Raio E1, faixa
   vertical do Patrol Unit e altura/colisão de caixas/depósitos exigem decisão.
4. Aceite de jogabilidade na etapa **6.5**; só depois registrar encerramentos
   autorizados na 6.6. E3 (ocultação/licença/densidade), E4 (escadas), LFS e
   avaliação dos estudos continuam pendentes conforme o plano.

Sem push, novo merge, avanço da integração principal, remoção de worktrees ou
limpeza de arquivos do autor nas Fases 2–3. Nenhum aceite novo marcado.

## Ajuste documental após a revisão 4.1 — 19/10/2026

O autor informou que o Claude revisou a Fase 4.1: código sem defeitos,
104/104 testes, build e diff-check verdes. Esse relato atualiza o estado
histórico de revisão pendente descrito nas seções anteriores.

A pedido do autor, um único commit de docs ajusta o bloco "Base consolidada"
do quadro para continuar válido após o `--ff-only`: B1 e a Fase 2 são referências
históricas, e a base de uma nova tarefa é o SHA obtido de
`git rev-parse rochatales/horda-survivor` depois do avanço. O roteiro manual
passa a usar o checkout principal nessa branch após a Fase 4.2; o item 4.3 do
plano inclui a worktree desta consolidação entre as obsoletas após o avanço.

Verificações reexecutadas na worktree da consolidação: `npm test` **104/104**,
`npm run build` e `git diff --check` passaram; permanece o aviso de chunk
> 500 kB. Somente docs alterados, sem mudança de runtime ou de aceite.
Nenhum avanço da branch principal, push ou remoção de worktree executado.
Aceite de jogabilidade permanece na etapa 6.5. Parada após este ajuste e checks.
