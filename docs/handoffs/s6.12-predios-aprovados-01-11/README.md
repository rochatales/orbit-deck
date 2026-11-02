# S6.12 — prédios finais aprovados · integração de 01/11/2026

Pedido explícito do autor: incorporar os acabamentos aprovados da Control Room e do
Hangar à linha do explorador. Base `2661ffd`, branch `rochatales/s6.8-explorador-astronauta`.
Merge autorizado **9ed6817**, da Control Room revisada **cf8916a**.
Não houve push, merge na integração, alteração no checkout principal ou remoção de worktrees.

## Proveniência e assets finais

Os acabamentos aprovados estavam sem commit no scratch `preview` baseado em `18bfa9d`.
Foram incorporados somente 31 arquivos pertinentes aos prédios; os ajustes antigos de
personagem/luz daquele checkout não foram trazidos. `fontes.json` registra origem,
SHA-256, tamanho e hash anterior. A origem não foi modificada. As duas adaptações
posteriores (runtime da Control Room e metadado de triângulos do Hangar) guardam também
`source_sha256`. As versões históricas da Control Room v001 e Hangar v001 permanecem.

| Asset final | Bytes | Triângulos | SHA-256 |
|---|---:|---:|---|
| Control Room v002 | 1.785.560 | 9.320 | `a7ece29112a46c5d4784c8a51f61fbfc87893467088f12f8e2810196dc910653` |
| Hangar v002 | 2.075.324 | 8.732 | `29d6d972bd19f9c64e3ef9baa0b65a6e2bcbd5c3148e4bfba643e867a3d88a2c` |

Os GLBs de runtime são idênticos aos exports aprovados. Scripts, atlas, renders,
manifestos e `.blend` aprovados foram preservados na cópia versionada da tarefa.
Não se reconstruiu nem reinterpretou a arte nesta integração. O relatório original do
Hangar conserva `triangles: 8612`; o campo adicionado `trianglesExport: 8732` registra a
contagem efetiva dos índices do GLB, sem apagar o número histórico do Blender.

## Runtime e conferência

- Paleta marfim/terracota/grafite, indicadores âmbar, vidro neutro e pisos 1,25 × 1,50 m
  com juntas de 30 mm incorporados. Ciano restrito ao conjunto central da EDEN; nenhum
  tile ciano aplicado ao Hangar. Detalhes de geometria em `geometria.json`.
- UVMap único: nenhuma face com UV degenerado de área significativa. Há duas lascas
  numéricas de boolean no Hangar, com 1,6451e−7 m² cada; a geometria aprovada foi preservada.
- Control Room substitui a sala antiga no runtime. Sete colisores antigos de móveis
  removidos, três colisores simples novos; paredes/vãos existentes preservados.
  Malha nunca é colisor. Os dois pisos globais são recortados sob o prédio.
- Portas por proximidade, teto com fade e pedestal/holograma ativos. A projeção visual
  usa o anchor do manifesto (0; 0,92; −10,5); ponto/raio da interação existente com EDEN
  permanecem, e o marcador usa esse mesmo contrato.
- Control Room incluída no Sandwind; cache, geometria fonte e descarte verificados.
  Balizas regeneradas só para a assinatura dos obstáculos: mesmas 203 posições.
- Na primeira prévia apareceram filetes ciano nas arestas por mistura dos mipmaps do
  atlas, apesar dos PNGs idênticos aos aprovados. `BuildingAtlasSampling` usa filtragem
  linear sem mipmaps em oito texturas privadas dos dois prédios, compartilhando as
  imagens originais. Preparação por montagem, sem alocação por quadro, cache GLTF intacto
  e descarte exatamente uma vez. GLBs, cores e PBR não foram alterados para essa correção.
  Capturas `antes-*` e `01/02-*` registram o resultado.

## Verificações

```bash
node scripts/arte/gerar-balizas-marte.mjs
npm test
npm run build
git diff --check 96d8ea5 HEAD
```

**368/368**, build verde, com aviso preexistente de chunk. Diff-check do intervalo e
conteúdo preparado para commit conferidos na entrega. Após os últimos metadados,
os nove testes de Control Room/estudo do Hangar passaram novamente.
Testes cobrem hashes, triângulos, paleta/UVs/juntas, piso sem sobreposição,
colisores simples, cápsula Rapier passando nas portas sul/leste nos dois sentidos,
teto/portas/pausa, Sandwind e descarte das texturas sem modificar o cache.

QA no build de produção na porta 4186: exterior/interior de ambos os prédios,
teto recortado e interação EDEN. Capturas 01–04 e relatório `qa-producao.json`
nesta pasta. Assets carregados confirmados pelos hashes finais. O relatório registra
contadores e ambiente; não contém janela de benchmark e não constitui medição S2.9
nem aceite visual do agente.

## Roteiro do autor e pendências

1. Abrir `http://127.0.0.1:4186/?personagem=astronauta&comparar` com recarga completa.
2. Conferir Control Room por fora, entrar pelas portas sul/leste, conversar com EDEN e
   observar teto, pedestal e piso sem sobreposição.
3. Conferir Hangar por fora e por dentro, portas, rampa, teto, piso e acesso ao deck.
4. Observar acabamento quente e areia dos dois prédios, sem os antigos filetes externos.

O acabamento-fonte já foi aprovado pelo autor no pedido. A conferência desta integração
no jogo continua sendo do autor. Quadro da integração não foi editado nesta branch.
