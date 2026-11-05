# Assets, fontes e referências

Inventário da base do fechamento S2, com gameplay e binários preservados.
[Relatório completo](organizacao/2026-11-05/assets-inventario.json) ·
[Verificações](organizacao/2026-11-05/README.md).

## Escopo e distribuição

**170 assets rastreados:** 163 em `src/assets/`, 5 em `public/` e
2 GLBs legados na raiz. **863 arquivos de fonte/pipeline:** 835 em
`art-source/` e 28 em `blender/`. Nomes, tamanhos, SHA-256 e referências
registrados no JSON. Fontes e backups não foram movidos nem apagados.

O manifesto Vite lista assets emitidos e chunks, mas **não cobre sozinho toda
a distribuição**: `public/` é copiado mesmo sem import e mídia pequena pode estar
incorporada ao JavaScript. O levantamento combina:

1. Manifesto de `npm run build -- --manifest`.
2. SHA-256 de cada `public/<caminho>` e de sua cópia `dist/<caminho>`.
3. Busca do conteúdo base64 completo de mídia até 64 KiB nos chunks JS/CSS.
4. Caminhos, globs e referências estáticas em arquivos rastreados. Templates
   dinâmicos e nomes isolados são evidências fracas, sem comprovação de uso.

| Evidência predominante | Arquivos | MiB |
|---|---:|---:|
| Só nome/template não resolvido (evidência fraca) | 7 | 3.96 |
| Cópia public → dist conferida por hash | 5 | 2.89 |
| Emitido no manifesto Vite | 109 | 226.01 |
| Referência em testes | 5 | 2.00 |
| Referência documental | 2 | 0.16 |
| Referência em código, distribuição não determinada pelo manifesto | 17 | 0.87 |
| Mídia incorporada no JS, conteúdo base64 verificado | 15 | 0.04 |
| Backup protegido | 1 | 29.29 |
| Referência em ferramenta ou fonte | 9 | 5.23 |

Assets: **270.44 MiB**; fontes/pipeline:
**1086.13 MiB**. Há **71 grupos de
conteúdo idêntico**; pares fonte/export e texturas compartilhadas não equivalem
a espaço liberável. Todas as ações do relatório são **preservar**.

## Public: distribuído fora do manifesto

Os cinco arquivos abaixo têm cópias idênticas em `dist`, embora não tenham
referência literal encontrada no código consultado. Isso identifica revisão
futura de distribuição, sem autorizar remoção dos originais.

| Arquivo | MiB | Cópia conferida no build |
|---|---:|---|
| [public/art/interaction/eden/background.png](../public/art/interaction/eden/background.png) | 1.17 | `art/interaction/eden/background.png` |
| [public/art/interaction/eden/eden.png](../public/art/interaction/eden/eden.png) | 0.74 | `art/interaction/eden/eden.png` |
| [public/art/interaction/eden/player.png](../public/art/interaction/eden/player.png) | 0.60 | `art/interaction/eden/player.png` |
| [public/assets/fonts/Roboto-msdf.json](../public/assets/fonts/Roboto-msdf.json) | 0.17 | `assets/fonts/Roboto-msdf.json` |
| [public/assets/fonts/Roboto-msdf.png](../public/assets/fonts/Roboto-msdf.png) | 0.21 | `assets/fonts/Roboto-msdf.png` |

**15 áudios pequenos** também foram confirmados dentro do JavaScript por
conteúdo base64, sem asset separado no manifesto. A prova é do conteúdo no
bundle, não de qual cópia idêntica o importou. JSON pode ser incorporado como
código; a varredura base64 não valida esse caso. Referência em `src/` também pode
pertencer a um módulo fora da entrada de produção.

## Legado e fontes fora de src/assets

- [player-main-transformed.glb](../player-main-transformed.glb): 1.79 MiB, não emitido pelo manifesto e sem cópia public; referências fracas, inclusive nos módulos legados de código da raiz, são preservadas no inventário.
- [social-media-transformed.glb](../social-media-transformed.glb): 1.64 MiB, não emitido pelo manifesto e sem cópia public; referências fracas, inclusive nos módulos legados de código da raiz, são preservadas no inventário.
- `blender/`: 28 arquivos, **417.12 MiB**,
  incluindo FBX, prévias e scripts antigos. São fontes de pipeline preservadas;
  não são parte automática do build e não foram movidas ou removidas.

## Maiores arquivos e motivo de preservação

| Arquivo | MiB | Evidência |
|---|---:|---|
| [characters/player/player-main.glb.bak](../src/assets/characters/player/player-main.glb.bak) | 29.29 | Backup protegido |
| [characters/player/player-main.glb](../src/assets/characters/player/player-main.glb) | 29.26 | Emitido no manifesto Vite |
| [characters/npcs/brand-brain.glb](../src/assets/characters/npcs/brand-brain.glb) | 19.78 | Emitido no manifesto Vite |
| [colony-v007.glb](../src/assets/colony-v007.glb) | 11.04 | Emitido no manifesto Vite |
| [audio/music/mars-strung-out.mp3](../src/assets/audio/music/mars-strung-out.mp3) | 10.80 | Emitido no manifesto Vite |
| [shanghai-fase01/shanghai-fase01.glb](../src/assets/shanghai-fase01/shanghai-fase01.glb) | 10.59 | Emitido no manifesto Vite |
| [enemies/mutant-animal.glb](../src/assets/enemies/mutant-animal.glb) | 10.13 | Emitido no manifesto Vite |
| [enemies/large-mutant.glb](../src/assets/enemies/large-mutant.glb) | 10.05 | Emitido no manifesto Vite |
| [props/shanghai/rusted-car.glb](../src/assets/props/shanghai/rusted-car.glb) | 9.35 | Emitido no manifesto Vite |
| [enemies/patrol-unit.glb](../src/assets/enemies/patrol-unit.glb) | 8.92 | Emitido no manifesto Vite |
| [audio/music/shanghai-dov.mp3](../src/assets/audio/music/shanghai-dov.mp3) | 8.33 | Emitido no manifesto Vite |
| [props/shanghai/medkit.glb](../src/assets/props/shanghai/medkit.glb) | 7.29 | Emitido no manifesto Vite |

- `player-main.glb` e `explorador-r7.glb`: variantes de comparação ainda emitidas;
  `player-main.glb.bak`: backup protegido.
- `brand-brain.glb`: 19,78 MiB, ainda emitido; a EDEN atual usa `eden-v002.glb`.
  Investigar retirada do import legado na S7.5 requer revisão do cadastro/fallbacks,
  preservando o original.
- `colony-v006.glb`: **6,70 MiB e emitido no build**, além das referências de
  props/exportação. Não é descartável apenas porque o mapa usa v007.
- Laboratório v002 também é emitido, junto ao visual v003. Laboratórios e Quartéis
  anteriores têm referências de teste/exportação/proveniência.
- Áudio original e variações alimentam preparação/corte. Uma consulta por template
  às chaves de um glob não prova que o original é carregado por esse glob.

## Arquivos do autor fora do índice

O [levantamento do principal](organizacao/2026-11-05/arquivos-protegidos-principal.json)
registra 441 arquivos (522.55 MiB) fora do índice nas áreas
explicitadas no relatório. Só metadados, sem seguir symlinks ou copiar conteúdo.
Não é backup nem comparação com o manifesto do Sprint 0; nada autoriza limpeza
desses arquivos. Outros worktrees e archive não são percorridos por esse levantamento.

## Reproduzir e interpretar

```sh
npm run build -- --manifest
node scripts/audit-project-assets.mjs dist/manifest.json docs/organizacao/2026-11-05/assets-inventario.json
```

O script lê arquivos rastreados da worktree e escreve o relatório indicado fora
de `src/`, `public/`, `art-source/`, `blender/` e `archive/`. Archive, os próprios
relatórios, este guia, o gerador do inventário e seu teste são excluídos da busca
de referências, para evitar prova circular. `revision` informa o HEAD
consultado; os textos vêm da worktree/índice, inclusive alterações ainda locais.

Globs suportam `*`, `**`, `?` e alternativas simples `{a,b}`; outras construções
podem escapar da análise. Não avalia diretórios arbitrários, histórico inteiro
ou outras branches. Ausência de referência não decide obsolescência. Fontes,
backups e não rastreados são protegidos pelo [AGENTS](../AGENTS.md).
S7.5/S7.10 e avaliação de LFS/compressão continuam trabalhos próprios.
