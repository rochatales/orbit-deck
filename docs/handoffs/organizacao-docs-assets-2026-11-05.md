# Organização de documentação e inventário de assets · 05/11/2026

## Pedido e base

Autor pediu seguir à organização de documentação e ao inventário de assets
antigos após encerrar a Sprint 2. Base aceita do fechamento:
`6b67f1efaee17b5da570c7140625c51f7e0c6e4a`, não `main` nem o checkout principal antigo.
Branch `rochatales/organizacao-docs-assets-2026-11-05`; worktree própria.
Referências oficiais: preservação S0.2/S0.3 e orçamento/distribuição S7.5/S7.10;
a organização não encerra itens futuros nem cria nova numeração de sprint.
Implementa Codex; revisão Claude; decisão visual/jogabilidade continua do autor.

## Mudanças

- README atualizado para os controles e o estado desta base: Shanghai fase 01,
  hordas 115, quatro tipos, kits/armas/Dash e save da carga da aeronave.
- Índice central de documentação, índice histórico e navegação de handoffs/revisões.
- 28 documentos do MCP Office (26 de docs e dois da raiz) realocados para
  `archive/mcp-office/docs/` e `archive/mcp-office/raiz/`, nos
  mesmos destinos já preparados no índice do autor no checkout principal.
  Todos byte a byte por SHA-256, inclusive comparados ao índice do autor.
  Nada preexistente em archive foi editado; checkout principal somente consultado.
  Havia oito links quebrados no README arquivado: a realocação resolve sete e
  um redirecionamento novo resolve o último, sem editar o README original.
- Avisos datados nos documentos que ainda diziam S2.9 pendente ou interpolação
  desativada, nos planos de consolidação e no prompt estrutural já executado.
  Corpos e evidências históricos preservados; nenhum aceite futuro fabricado.
- Inventário reproduzível de assets/fontes, SHA-256, referências em código,
  ferramentas/testes e manifesto real do Vite, cópias de public/dist por hash, mídia base64 nos chunks
  e duplicatas por conteúdo. Inclui public, GLBs da raiz e blender.
  Nada em `src/assets/` ou `art-source/` é movido, removido ou reescrito.

Quadro `SPRINT_STATUS.md` preservado na branch de tarefa; atualização da S2
continua no patch entregue no fechamento. Os vídeos de transição nos intervalos
de loading da navegação da aeronave seguem como pendência do autor na S6.16.

## Verificações

Suíte **566/566**, build com manifesto e testes do inventário verdes. Aviso de
chunk grande preexistente. Inventários, links e preservação conferidos: 743 links locais, nenhum quebrado; 28 realocações idênticas e 1033 hashes de assets/fontes preservados. Dois testes
relevantes cobrem caminhos/globs/templates, JSON referenciado no código, variantes
emitidas no build, fonte de ferramenta, backup e ausência de mutação pelo inventário.
O manifesto veio de `npm run build -- --manifest`; cópias de public e mídia
incorporada são conferidas separadamente. Aplicação/configuração intactas.

O levantamento adicional no checkout principal registra 441 arquivos fora do
índice (somente nomes/tamanhos, sem seguir symlinks ou copiar conteúdo). Não é
backup nem validação do snapshot S0.2. Todos continuam protegidos e intocados.

## Limites e roteiro

O inventário não decide obsolescência. Emitido no build não significa usado na
rota padrão; JSON pode estar incorporado ao JS. Nomes isolados e expressões
dinâmicas têm limites explícitos. Fontes, backups, não rastreados e outros
worktrees permanecem preservados. A prova de preservação acompanha a entrega;
ausência de import direto não autoriza remoção. Não foi feita medição visual nova.

Revisar `docs/README.md`, `docs/ASSETS.md`, o histórico e os relatórios em
`docs/organizacao/2026-11-05/`. Sem merge/push ou limpeza destrutiva.


## Revisão e ampliação do levantamento

Parecer inicial em `docs/organizacao/2026-11-05/revisao-claude.txt`. Os seis
achados foram tratados: escopo ampliado para public, dois GLBs da raiz e blender;
cópias public/dist conferidas por hash; mídia incorporada identificada por base64
real nos chunks; templates não resolvidos tratados como evidência fraca; globs
com `**/` zero diretórios e alternativas simples testados; texto de colony-v006
e de links corrigido. Havia oito links quebrados no README arquivado: sete
resolvidos pela realocação e o último pelo redirecionamento novo.

Inventário final: **170 assets** (163 src/assets, cinco public e dois GLBs da
raiz), **863 arquivos de fonte/pipeline** (835 art-source e 28 blender). Cinco
cópias public/dist por hash; 15 áudios pequenos com conteúdo base64 confirmado
no JS; 71 grupos de conteúdo idêntico. Fontes, backups e os 441 arquivos fora
do índice levantados no principal continuam preservados. A fonte de áudio
original não é marcada como carregada apenas por uma consulta de template.

Após as correções: **566/566**, build com manifesto e testes focados verdes.
Hashes dos 1033 arquivos, public/dist e conteúdo inline reconferidos; runtime,
public, blender, art-source, dependências, plano e quadro sem alterações.
O inventário informa o HEAD consultado, mas lê conteúdo da worktree/índice;
o hash do gerador usado também está no relatório de preservação.
