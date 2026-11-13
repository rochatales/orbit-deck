# Level 02 — Rio de Janeiro: arte Blender v001

Data: 13/11/2026. Implementação: Codex. **Aceite visual: pendente do autor.**

## Base e isolamento

- Base: `claude/level02-rio-blender`, commit `2e3c667`, sobre o blockout `99fa57f`.
- Branch: `rochatales/level02-rio-arte`.
- Worktree: `/Users/rochatales/.codex/worktrees/level02-rio-arte/game-workplace`.
- Nenhuma alteração em `src/`, planta, colisão, plano ou quadro. Sem merge ou push.
- Blender **5.1.1**, executado por CLI. O conector Blender não estava exposto nesta sessão; nenhuma operação pelo conector foi realizada.

## Entrega

O gerador lê `art-source/rio-fase01/export/layout.json` e reconstrói a cena, as texturas, os GLBs e a auditoria. Todos os objetos são gerados pelo script. Coordenadas em metros: Blender `(x, -z, altura)`; GLB `(x, altura, z)`, transformações unitárias.

Em `art-source/rio-fase01/`:

- `scripts/build_blender.py`: composição, módulos, exportações e câmeras.
- `scripts/textures.py`: nove texturas procedurais, semente fixa; origem e resolução em `texturas/manifesto.json`.
- `scripts/audit_view.py`: auditoria de planta, áreas reservadas, orçamento e geometria efetivamente gravada nos GLBs.
- `scripts/test_audit.py`: regressões com invasões e desvio introduzidos em memória, sem salvar alterações na fonte.
- `blend/rio_fase01_v001.blend`: fonte editável, com texturas empacotadas.
- `export/rio-fase01.glb`: mapa; `export/rio-limites-v001.glb`: morros, mar e fechamento sul.
- `notas/rio-fase01-v001.json`: envelopes, desvios, orçamento e SHA-256 dos arquivos.
- `notas/elementos.json`: vínculo das peças com a planta.
- `notas/testes-auditoria-v001.json`: resultados dos testes do auditor.
- `notas/reproducibilidade-v001.json`: comparação de duas reconstruções independentes.

Coleções do `.blend`:

1. `00_MODULOS_REUTILIZAVEIS`: amostras de térreo, pavimento e cobertura por fileira, fachada completa, quiosque, posto, palmeira, duna, banco, poste, veículos, morro e escombros. Oculta por padrão; dados de malha compartilhados.
2. `01_KIT_LAYOUT_EDITAVEL`: peças individuais nas posições da planta. Oculta para evitar duplicação com a exportação.
3. `02_EXPORT_MAPA` e `03_EXPORT_LIMITES`: malhas agrupadas por setor/material, visíveis e exportadas.
4. `04_COLISORES_MARCADORES`: somente empties de conferência, ocultos e excluídos dos GLBs.
5. `05_CAMERAS_LUZ_REVISAO`: câmeras e iluminação de revisão, excluídas dos GLBs.

As famílias de textura usam arquivos isolados de 256 × 256 px; as ondas usam 1024 × 1024 px, com repetição de 5 × 8 m. Não há blocos de cores distintas adjacentes em um atlas. Texturas embutidas nos GLBs; nenhuma emissão exterior. Vidros são opacos e simplificados. O material do calçadão repete na faixa, sem recorte de atlas.

## Decisões de composição e limites

- Um prédio por quadra, térreos fechados, mar de 15 m e alturas da planta preservadas. A cadência dos pavimentos é 3,3 m; cobertura e caixa-d’água cabem na altura total. O último pavimento tem aberturas mais baixas sob a cobertura técnica.
- Prédios com cornijas, varandas, cobogós, lojas fechadas, toldos e vegetação. A variação vem das dimensões/pavimentos da planta e da vegetação procedural.
- Quiosques circulares com terraço, patamar e escada helicoidal. Postos de madeira, palmeiras e bancos como peças independentes do kit.
- Areia e fragmentos sobre as vias são acabamentos baixos (até 5 cm), sem criar obstáculos sem colisão. Copas acima de 3 m podem sombrear as vias. Dunas altas exigiriam decisão posterior sobre colisão e circulação.
- Ônibus e carros ficam no fechamento destruído ao sul, fora das pistas transitáveis; não foram colocados como obstáculos novos na avenida. São peças separadas no kit, reposicionáveis por script após decisão de layout.
- As marcas do pouso são pintura em geometria rasa. Deck e reserva livres de objetos acima do acabamento.
- A luz quente é exclusivamente de revisão; não representa a luz final do jogo.
- Nenhum GLB foi copiado para o runtime ou carregado no jogo. Não houve benchmark de GPU nem aprovação de jogabilidade.

## Orçamento e auditoria

| Arquivo | Triângulos | Malhas | Materiais | Bytes |
|---|---:|---:|---:|---:|
| `rio-fase01.glb` | 49.413 | 76 | 12 | 5.017.792 |
| `rio-limites-v001.glb` | 14.608 | 25 | 9 | 1.273.244 |

Referência: mapa 55.042 triângulos / 115 malhas / 15 materiais / 11,1 MB; limites 28.838 triângulos / 1,5 MB. Ambos abaixo dos limites.

Maior desvio de planta: 0.000001526 m. Maior desvio entre envelopes das coleções e posições binárias GLB: 0 m. Zero violações de pouso, água ou circulação. Os SHA-256 completos estão no JSON da auditoria.

Os primeiros passes de desenvolvimento excederam a referência de triângulos do mapa. Foram reduzidos os caixilhos e transformados os vidros em faces simples. Os arquivos entregues estão abaixo das referências tanto em geometria quanto em tamanho.

A auditoria mede os envelopes reais das peças editáveis, testa os pisos/edificações contra a planta e lê as posições binárias dos vértices nos GLBs. Também verifica ausência de nós de colisão e de materiais emissivos. Testes negativos confirmam rejeição de desvio de prédio de 25 cm e invasões de pouso, pista e água. A projeção do chão em `CAM_Jogo` coincide com a prancha SVG dentro de 1 px.

## Renders em disco

Todos em PNG, 1361 × 851 px. Não foram anexados à conversa.

Diretório absoluto: `/Users/rochatales/.codex/worktrees/level02-rio-arte/game-workplace/art-source/rio-fase01/renders/v001/`

| Arquivo | Conteúdo |
|---|---|
| `jogo.png` | Ortográfica, azimute π/4, elevação 35,264°, projeção do chão no enquadramento de `planta-v0-camera.svg` |
| `geral.png` | Vista adicional com margem para as cotas altas, sem corte dos morros |
| `topo.png` | Vista superior completa |
| `calcadao.png` | Ondas, pedras e areia sobre o calçadão |
| `predio.png` | Fachada da orla e cobertura |
| `quiosque.png` | Quiosque, terraço, patamar e escada |
| `praca.png` | Canteiro, palmeiras, mato e banco |
| `deck.png` | Piso e reserva de pouso |
| `morro.png` | Granito facetado e mata, visto do lado externo para evitar oclusão pelos prédios |
| `escombros.png` | Fechamento sul e ruínas |
| `linha_dagua.png` | Faixa de espuma e transição areia/mar |

A vista `jogo.png` conserva a projeção da planta no chão; volumes altos podem sair da margem superior prevista para a planta 2D. `geral.png` é a alternativa para avaliar o conjunto sem esse corte.

## Como reconstruir e conferir

Na raiz da worktree, com Blender 5.1.1:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/build_blender.py -- --render
/Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/audit_view.py
/Applications/Blender.app/Contents/MacOS/Blender --background --python art-source/rio-fase01/scripts/test_audit.py
npm test
npm run build
git diff --check
```

Omitir `-- --render` reconstrói cena, texturas, exportações e auditoria sem renderizar. O gerador preserva `.blend1` existentes; o backup local produzido durante a implementação foi mantido fora do commit. A reconstrução substitui os artefatos gerados v001; eventuais alterações manuais devem ser incorporadas ao script para persistirem.

Validação executada:

- `npm test`: **663 passaram, zero falhas**.
- `npm run build`: passou; aviso existente de chunk maior que 500 kB.
- Auditoria Blender: passou, sem desvios acima de 5 cm.
- Regressão do auditor: **7 casos passaram**, incluindo enquadramento da câmera.
- Reconstrução do zero: arquivos GLB e texturas comparados por SHA-256 (ver relatório de reprodutibilidade).
- `git diff --check`: passou.
- Inspeção técnica dos renders pelo agente: enquadramento, sobreposições, leitura das ondas, cobertura, pouso e espuma. **Isso não é aceite visual.**

## Roteiro do autor e pendências

1. Abrir `blend/rio_fase01_v001.blend` no Blender 5.1.1 e selecionar `CAM_Jogo` / `CAM_Geral` para avaliar escala e silhueta. Conferir `geral.png` antes dos detalhes.
2. Conferir a linguagem das fachadas, alturas, padrão e escala das ondas, quiosques, vegetação, ruínas e espuma nos renders listados.
3. Para editar, ocultar as duas coleções `EXPORT` e ativar `01_KIT_LAYOUT_EDITAVEL`. Ativar `00_MODULOS_REUTILIZAVEIS` apenas para inspecionar amostras; as peças ficam reunidas na origem.
4. Ativar `04_COLISORES_MARCADORES` para comparar envelopes com o pouso e a circulação. Os empties são referência, não colisores exportados.
5. Dar o aceite visual ou indicar alterações. Seguem abertas para o autor: altura final, pilotis, becos e largura final do mar. Qualquer mudança de planta deve passar pelo gerador de layout e seus testes numa etapa autorizada.

**Parada desta tarefa: aguardando aceite visual do autor. A integração do GLB no jogo depende de novo pedido.**
