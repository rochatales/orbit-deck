# Consolidação local do piloto e colaboração

Data: 29/09/2026. Branch de integração: `rochatales/horda-survivor`.

## Escopo

Preservar num commit local o piloto dos Sprints 1–2, os ajustes de direcionais, os testes, a documentação do Horda Survivor e o arquivo do produto antigo. Incorporar apenas os quatro documentos de colaboração revisados da worktree do Claude, por cópia; não fazer merge daquela branch.

Os SHA-256 completos da origem e da cópia inicial estão em `collaboration-source-hashes.json`. Os quatro arquivos foram copiados byte a byte. Depois da cópia, o guia foi ajustado para exigir commit da tarefa antes de revisão por diff de branches, explicitar o diretório da revisão e o uso de worktrees gerenciadas no Codex Desktop. O prefixo das branches do Codex foi alinhado a `rochatales/`. O quadro recebe a base consolidada após a criação do commit.

O hash calculado de `docs/SPRINT_STATUS.md` na origem termina em `cf95`; o sufixo abreviado colado na conversa era diferente. O valor completo do arquivo foi registrado, sem inferir uma versão a partir do resumo.

## Preservação e seleção

A seleção usa uma lista explícita de caminhos, sem `git add .`. Artes não rastreadas na raiz, `.claude/`, worktree do Claude, dependências e builds ficam fora. Nenhuma arte solta foi apagada ou movida. Arquivos binários já versionados no commit original permanecem no histórico; arquivos retirados do runtime são preservados em `archive/mcp-office/`.

Antes de adicionar arquivos ao índice, criar snapshot externo com cópia dos arquivos selecionados existentes, diff do estado rastreado e manifesto SHA-256. Reconferir as exclusões rastreadas contra os arquivos arquivados e registrar a igualdade byte a byte. O snapshot atual complementa o backup do Sprint 0; não presume que aquele backup cobre trabalho posterior.

## Validação e limites

Executar `npm test`, `npm run build` e `git diff --check` antes do commit. Verificar no índice a preservação dos arquivos arquivados e a ausência de arte solta e worktrees aninhadas. Registrar os resultados finais no handoff de consolidação.

Esta consolidação não executa S2.9–S2.12 nem concede aprovação visual. Não faz push, PR, merge, issue, automação ou delegação. As próximas tarefas usam a base registrada no quadro, com atribuição explícita de implementador e revisor.

## Resultados registrados

- Snapshot externo: `/Users/rochatales/Automations/game-workplace-backups/consolidacao-20260929-195919`.
- 182 arquivos copiados e verificados por SHA-256; 123.342.701 bytes.
- 116 exclusões rastreadas correspondem byte a byte ao conteúdo arquivado.
- 93 arquivos soltos da raiz excluídos da seleção e preservados.
- `npm test`: 20/20 passaram. `npm run build`: passou; aviso de bundle grande permanece.
- `git diff --check`: passou. Validação visual permanece pendente com o autor.

Na verificação do índice, o CSV do inventário apresentou finais de linha CRLF como whitespace. Foram normalizados para LF, sem alterar os dados ou hashes das artes inventariadas. O snapshot preserva a versão anterior.
