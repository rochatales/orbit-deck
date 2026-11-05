# Organização documental e inventário · 05/11/2026

Base `6b67f1efaee17b5da570c7140625c51f7e0c6e4a`, fechamento aceito da Sprint 2.
Branch `rochatales/organizacao-docs-assets-2026-11-05`, sem merge/push.
Escopo: navegação documental, separação do MCP Office e inventário de assets.

## Entregas

- [Índice atual](../../README.md) e [assets](../../ASSETS.md).
- [Histórico](../../historico/README.md): 28 documentos MCP Office realocados (26 de docs, dois da raiz),
  conteúdo idêntico ao original e ao índice já preparado pelo autor no principal.
- [Handoffs](../../handoffs/README.md) e [revisões](../../reviews/README.md).
- [Mapa de realocação e hashes](documentos-realocados.json).
- [Inventário de assets/fontes](assets-inventario.json): tamanho, SHA-256,
  manifesto de produção, referências por categoria e duplicatas por conteúdo.
- [Arquivos protegidos no principal](arquivos-protegidos-principal.json): 441 arquivos fora do índice, somente metadados; não é backup e nenhum foi alterado.
- [Links locais](links-verificacao.json) e [preservação](preservacao-verificacao.json): conferências finais.
- [Manifesto Vite](manifesto-build.json): cópia do manifesto usado na classificação.
- [Handoff desta tarefa](../../handoffs/organizacao-docs-assets-2026-11-05.md).

O escopo rastreado agora inclui src/assets, public, GLBs da raiz, art-source e
blender. Cópias public/dist por hash e áudio base64 nos chunks complementam o
manifesto. Os relatórios, o guia de assets, o gerador e seu próprio teste ficam fora da busca de referências para
não gerar prova circular. Arquivos emitidos no build podem ser de comparação;
JSON pode estar incorporado ao JS. Limites da detecção dinâmica no inventário.
Nenhum asset, fonte ou backup foi movido/removido; nenhum arquivo preexistente
em archive foi alterado. O checkout principal e suas alterações locais foram
somente consultados. As renomeações documentais são iguais às já preparadas lá.

## Verificações

Suíte **566/566** verde; build com manifesto passou (aviso preexistente de chunk
grande). Links e preservação conferidos: 743 links locais, nenhum quebrado; 28 documentos históricos idênticos por hash e 1033 hashes de assets/fontes preservados.
A evidência de build está em `build.txt`; logs e conferências finais acompanham
a entrega. Os testes visuais continuam do autor; não foram necessários para
alterações que não tocam runtime/colisores/arte.

## Estado e próximos assuntos

Sprint 2 continua encerrada com seus aceites. O plano oficial e o quadro não
são reescritos pela organização. O patch do quadro entregue no fechamento
continua reservado à integração do autor.

Vídeos de transição nos intervalos de loading da navegação da aeronave:
responsabilidade do autor na S6.16. Otimizações de distribuição de GLBs antigos
exigem análise própria de imports/fallbacks e preservação; não são exclusões
automáticas por nome, idade ou duplicidade. S7.5/S7.10 não foram encerradas.


## Ampliação após revisão

O inventário final cobre 170 assets (src/assets, public e GLBs da raiz) e 863
arquivos de fonte/pipeline (art-source e blender). Cinco cópias public/dist por
hash e 15 áudios base64 nos chunks complementam o manifesto. Templates dinâmicos
não são prova de uso; mídia embutida também participa da distribuição. Parecer
inicial em `revisao-claude.txt`; correções e confirmação no handoff desta tarefa.
