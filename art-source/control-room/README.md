# Control Room — candidato S6.12

**01/11/2026: v002 aprovada incorporada ao runtime da branch do explorador.**
Atlas quente/grafite, piso do Quartel e pedestal EDEN em `export/control_room_v002.glb`.
Builder próprio: `scripts/build_control_room_v002.py`; atlas e render próprios v002.
A integração preservou os bytes aprovados, sem rebuild. Proveniência e hashes em
[handoff](../../docs/handoffs/s6.12-predios-aprovados-01-11/README.md).
As instruções v001 abaixo permanecem para reprodução histórica e não geram a v002.

Base `f1756c4`, branch `rochatales/s6.12-control-room`. Arte fora do runtime.
Medidas, estados, limites e roteiro visual no [RELATORIO](RELATORIO.md) e no
[handoff](../../docs/handoffs/s6.12-control-room.md).

## Reconstrução e integridade

Na raiz desta worktree, com Blender 5.1.1:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  --python art-source/control-room/scripts/build_control_room.py
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  --python art-source/control-room/scripts/validate_control_room.py
npm test
npm run build
git diff --check f1756c4
```

**Executar build e validador nessa ordem.** GLB e manifesto são determinísticos;
o `.blend` pode mudar de bytes a cada reconstrução. O teste prende o SHA-256 de
todos os três em `notas/roundtrip.json`. O validador reimporta e verifica a arte,
depois atualiza esse relatório com o hash do `.blend` recém-gerado. Rodar só o
builder pode deixar os testes vermelhos por hash desatualizado. Revisar/commitar
o `.blend` e o relatório juntos depois de reconstruir; não remover a checagem.

Os comandos sobrescrevem derivados gerados na worktree. Preservar qualquer
edição manual em versão separada antes de reconstruir. Atlas, circulação e
renders têm seus passos adicionais descritos no RELATORIO. Para auditar uma
entrega já commitada, usar `git diff --check f1756c4 <commit-da-entrega>`;
`git diff --check` sozinho não confere o conteúdo dos commits anteriores.

## Espelho e integração

A cópia sem rastreio em `/Users/rochatales/Automations/game-workplace/art-source/control-room/`
impede uma integração que tente escrever esses arquivos, mesmo quando iguais.
O autor precisa preservá-la fora do repositório antes de integrar. Esta revisão
não move, apaga ou atualiza essa pasta. Outras pastas sem rastreio exigem
conferência individual; não executar limpeza em lote.

Há também divergência de histórico entre a integração e as linhas de arte:
[retificação da coordenação](../../docs/handoffs/coordenacao-sprint-6-personagens-retificacao.md).
Nenhum merge/rebase autorizado ou executado aqui. Design F5 e aceite visual
continuam pendentes com o autor.
