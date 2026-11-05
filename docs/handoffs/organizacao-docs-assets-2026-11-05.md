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
  Um redirecionamento novo corrige o único link já quebrado do README arquivado.
- Avisos datados nos documentos que ainda diziam S2.9 pendente ou interpolação
  desativada, nos planos de consolidação e no prompt estrutural já executado.
  Corpos e evidências históricos preservados; nenhum aceite futuro fabricado.
- Inventário reproduzível de assets/fontes, SHA-256, referências em código,
  ferramentas/testes e manifesto real do Vite, incluindo duplicatas por hash.
  Nada em `src/assets/` ou `art-source/` é movido, removido ou reescrito.

Quadro `SPRINT_STATUS.md` preservado na branch de tarefa; atualização da S2
continua no patch entregue no fechamento. Os vídeos de transição nos intervalos
de loading da navegação da aeronave seguem como pendência do autor na S6.16.

## Verificações

Suíte **566/566**, build com manifesto e testes do inventário verdes. Aviso de
chunk grande preexistente. Inventários, links e preservação conferidos: 736 links locais, nenhum quebrado; 28 realocações idênticas e 998 hashes de assets/fontes preservados. Dois testes
relevantes cobrem caminhos/globs/templates, JSON referenciado no código, variantes
emitidas no build, fonte de ferramenta, backup e ausência de mutação pelo inventário.
O manifesto veio de `npm run build -- --manifest`; aplicação/configuração intactas.

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
