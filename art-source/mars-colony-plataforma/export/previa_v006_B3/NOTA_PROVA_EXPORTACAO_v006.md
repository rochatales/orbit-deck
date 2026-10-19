# Prova de exportação: plataforma B3 (v006)

Teste de ida e volta Blender → GLB → Blender. O GLB é **só de prévia**: não é
asset de runtime e não foi copiado para nenhum caminho do jogo.

O `.blend` fonte foi aberto em background e **não foi salvo**. A cena de
reimportação é um arquivo novo.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `plataforma_v006_B3_previa.glb` | GLB de prévia (898 KB) |
| `manifesto_plataforma_v006_B3.json` | Uma entrada por objeto: id estável, papel, colisor, pivô e caixa em coordenadas do jogo, triângulos e materiais. Também traz câmeras, luzes e mundo da fonte |
| `colisores_propostos_v006_B3.json` | As 3 propostas `COL_NOVO_PLAT_B3_*`, **fora do GLB** |
| `inspecao_glb.json` | Leitura direta do JSON do GLB, sem Blender, confrontada com o manifesto |
| `plataforma_v006_B3_reimportado.blend` | Cena de fábrica com o GLB reimportado e as luzes da fonte recriadas pelo manifesto |
| `verificacao_reimportacao.json` | Medições na cena reimportada |
| `referencia_normais_fonte.json` | Normais por canto de face das peças suavizadas e chanfradas |
| `renders_antes/`, `renders_depois/`, `comparacao_*.png`, `diferencas_render.json` | Comparação de pixels entre fonte e reimportado |

Scripts em `../../scripts/`:

- `exportar_previa_v006.py`
- `inspecionar_glb_v006.py`
- `reimportar_previa_v006.py`
- `comparar_previa_v006.py`

## Escopo

- **Plataforma B3:** os 17 objetos.
- **Parte comum:** baia, consoles, carros e rack.
- **Contexto:** piso do deck e marcações (sem mudança) e tanques.
- **Marcadores:** `SPAWN_Desembarque` e `INTERACT_Nave`.
- **Câmeras:** `CAM_PLAT_Geral` e `CAM_PLAT_B3_Conexao`.

**Ficaram de fora:**

- **Luzes:** o glTF perde a cor e a força do sol. As 3 luzes da fonte estão
  no manifesto e foram recriadas a partir dele.
- **Colisores:** nenhum no GLB.
- **Terreno e o resto da colônia.**

## IDs estáveis e organização

- Cada nó leva nos extras:
  - `id_estavel`: `marte.plataforma.` + o nome sem prefixo de variante, por
    exemplo `marte.plataforma.foguete` e `marte.plataforma.elevador_embarque`;
  - `papel`: 19 papéis, como `foguete`, `torre_servico`, `braco_tripulacao`,
    `elevador_embarque`, `coluna_chamada_elevador` e `piso_contexto`;
  - `colisor`: proposta separada, ativo do piloto, rente ou fora da área
    caminhável;
  - `estado_inicial` e `previa`.
- São **30 IDs, todos únicos**, iguais aos do manifesto depois da
  reimportação.
- Nenhum objeto `COL_` foi importado.

## Resultados

| Verificação | Resultado |
|---|---|
| Diferenças fonte × GLB (pivôs, triângulos, extras, materiais) | nenhuma |
| Pivôs e caixas após reimportação | diferença máxima de 0,04 mm e 0,05 mm |
| Escala | 1 em todos os nós |
| Alturas | foguete 10,098 m, torre 8,064 m e mastro 5,410 m, iguais à fonte |
| Marcadores | `INTERACT_Nave` (0; 0; 33) e `SPAWN_Desembarque` (0; 0; 29,5), em coordenadas do jogo |
| Triângulos | 18.742 = 18.742 |
| Materiais | os 14 do GLB voltam com o mesmo nome em cada objeto |
| Vidro | `alphaMode` BLEND no GLB e BLENDED no reimportado |
| Emissivos | `KHR_materials_emissive_strength` (âmbar 4,43; ciano 2,99) |
| Normais | todas as malhas têm `NORMAL` |
| Normais, ponto a ponto | foguete 0,02°, braço 0°, base 0°, casa do elevador 0,028° (desvio máximo) |
| Renders, mesmas câmeras e luzes da fonte | diferença média 0,05 e 0,03 em 255; 0,02% dos pixels acima de 8; nenhum acima de 32 |

**Ressalva.** A cena de fábrica traz um material "Material" que não vem do
GLB.

**Ressalva.** O exportador marca todos os materiais como `doubleSided`
(comportamento já visto na prova do laboratório).

Este GLB de prévia não aprova nada: a avaliação visual e de jogabilidade é do
autor, e não houve integração.
