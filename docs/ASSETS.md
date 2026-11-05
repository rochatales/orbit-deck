# Assets, fontes e referências

Inventário da base do fechamento S2, sem mudança de gameplay ou binários.
[Relatório completo](organizacao/2026-11-05/assets-inventario.json) ·
[Organização e verificações](organizacao/2026-11-05/README.md).

## O que foi conferido

163 arquivos rastreados em `src/assets/`, 835 em `art-source/`. SHA-256,
tamanho, referências e cópias idênticas preservados no JSON. O manifesto real
veio de `npm run build -- --manifest`; inclui a distribuição de produção,
não apenas a cena/rota padrão. Arquivos não rastreados do autor e outros
worktrees não são descartados por esse levantamento.

| Evidência predominante | Arquivos | MiB |
|---|---:|---:|
| Emitido no build Vite | 109 | 226.01 |
| Referência em testes | 11 | 2.60 |
| Referência em código, sem asset separado no manifesto | 33 | 1.00 |
| Backup protegido | 1 | 29.29 |
| Referência em ferramenta ou fonte de arte | 9 | 5.23 |

Total de assets: **264.12 MiB**;
fontes rastreadas: **669.01 MiB**.
Há **71 grupos de conteúdo idêntico** entre assets/fontes.
São frequentemente pares fonte/export ou texturas compartilhadas; não equivalem
a espaço liberável. Nenhum binário foi movido, removido ou regravado.

JSON pode estar incorporado ao JavaScript sem entrada própria no manifesto.
Referência em `src/` também pode vir de módulo fora da entrada de produção.
Nomes isolados são evidência fraca; caminhos/globs/templates são separados no
relatório. Ausência de referência estática não prova obsolescência.

## Arquivos maiores e motivo de preservação

| Arquivo | MiB | Evidência |
|---|---:|---|
| [characters/player/player-main.glb.bak](../src/assets/characters/player/player-main.glb.bak) | 29.29 | Backup protegido |
| [characters/player/player-main.glb](../src/assets/characters/player/player-main.glb) | 29.26 | Emitido no build Vite |
| [characters/npcs/brand-brain.glb](../src/assets/characters/npcs/brand-brain.glb) | 19.78 | Emitido no build Vite |
| [colony-v007.glb](../src/assets/colony-v007.glb) | 11.04 | Emitido no build Vite |
| [audio/music/mars-strung-out.mp3](../src/assets/audio/music/mars-strung-out.mp3) | 10.80 | Emitido no build Vite |
| [shanghai-fase01/shanghai-fase01.glb](../src/assets/shanghai-fase01/shanghai-fase01.glb) | 10.59 | Emitido no build Vite |
| [enemies/mutant-animal.glb](../src/assets/enemies/mutant-animal.glb) | 10.13 | Emitido no build Vite |
| [enemies/large-mutant.glb](../src/assets/enemies/large-mutant.glb) | 10.05 | Emitido no build Vite |
| [props/shanghai/rusted-car.glb](../src/assets/props/shanghai/rusted-car.glb) | 9.35 | Emitido no build Vite |
| [enemies/patrol-unit.glb](../src/assets/enemies/patrol-unit.glb) | 8.92 | Emitido no build Vite |
| [audio/music/shanghai-dov.mp3](../src/assets/audio/music/shanghai-dov.mp3) | 8.33 | Emitido no build Vite |
| [props/shanghai/medkit.glb](../src/assets/props/shanghai/medkit.glb) | 7.29 | Emitido no build Vite |

## Antigo não significa descartável

- `player-main.glb` e `explorador-r7.glb` continuam nas variantes de comparação;
  `player-main.glb.bak` é backup protegido, separado do GLB atual.
- `brand-brain.glb` ainda consta no manifesto e no cadastro legado; a EDEN atual
  usa `eden-v002.glb`. Investigar retirada do import legado para reduzir distribuição
  é um trabalho de S7.5, com revisão do cadastro/fallbacks, sem apagar o original.
- Laboratórios v001/v002 e Quartéis v004/v005 têm referências de testes,
  exportação ou proveniência. O Laboratório v002 também é emitido no build;
  comparar com o visual v003 antes de uma futura otimização de imports.
- `colony-v006.glb` participa de referências e exports preservados; o nome antigo
  não autoriza apagá-lo ao usar a colônia v007.
- Áudio `original` e variações não selecionadas podem alimentar os scripts de
  corte/preparação. Os manifestos e fontes registram essa relação.

Oportunidades de distribuição são distintas da preservação de fontes. O inventário
marca todos os arquivos como **preservar** e não executa limpeza automática.
Antes de alterar um export, conferir quem o usa em código, testes, scripts,
fontes, comparação e outras branches. Fontes/backups/não rastreados permanecem
protegidos pelo [AGENTS](../AGENTS.md).

## Arquivos do autor fora do índice

O [levantamento do checkout principal](organizacao/2026-11-05/arquivos-protegidos-principal.json)
registra 441 arquivos (522.55 MiB) em art-source, assets soltos
e DOCX fora do índice. São metadados de nomes/tamanhos, sem copiar conteúdo ou
seguir symlinks. Não é backup nem comparação com o manifesto do Sprint 0;
esses arquivos não são candidatos à remoção e não foram alterados.

## Reproduzir

Depois do build com manifesto:

```sh
npm run build -- --manifest
node scripts/audit-project-assets.mjs dist/manifest.json docs/organizacao/2026-11-05/assets-inventario.json
```

O script lê apenas arquivos rastreados da worktree e escreve o relatório indicado,
fora de `src/`, `art-source/` e `archive/`. Não altera runtime, fontes ou backups.
Exclui archive e os próprios relatórios da busca de referências; a enumeração
no inventário não pode virar prova circular de uso.

A análise não elimina o histórico Git nem substitui orçamento de GPU/playtest.
Avaliação de LFS/compressão e orçamento real seguem S7.10; nenhum item futuro
é encerrado por esta organização.
