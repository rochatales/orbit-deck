# Medições do autor — S2.9 · 05/11/2026

Base de mapas/regras `00ab557`; instrumentação `18fe0d6`. Branch da sessão
`rochatales/s2-fechamento-2026-11-05`. Build de produção servido na porta 5194.
564/564 testes, build e diff-check verdes; revisão Claude sem defeitos de código.
Medições reais feitas pelo autor. **S2.9 e etapa 6.5 aprovadas expressamente em
05/11/2026; Sprint 2 encerrada.** Autor confirmou 115/115 e retorno a Marte sem
bloqueios. Declarações preservadas em `aceites-autor.json`.

## Ambiente declarado e exportado

Autor confirmou Odyssey G5 a 144 Hz. Apple M2 Pro / Mac14,9, 16 GiB RAM,
macOS 26.5.1, alimentação AC. JSONs: Chrome 156, ANGLE Metal Apple M2 Pro,
tela 2560×1440; viewport/canvas/buffer 1363×1035; DPR janela/renderer 1/1.
Interpolação padrão ligada e passo físico 1/60 s. Contexto/heap são lidos na
exportação posterior, não continuamente durante a amostra. Condições manuais
(parado/percurso/população) vêm do relato do autor.

## Estatísticas das amostras

rAF em ms; duração em s. Contagens médias da própria amostra; sombras não incluídas.

| Caso | Duração real | p50 | p95 | Máximo | >33 / >50 ms | Draw calls média | Triângulos média |
|---|---:|---:|---:|---:|---:|---:|---:|
| M1 | 30.0084 | 13.1 | 14.5 | 14.8 | 0 / 0 | 371.57 | 404552.36 |
| M2 | 30.0007 | 6.9 | 7.7 | 7.9 | 0 / 0 | 271.39 | 323389.34 |
| S2 | 30.0045 | 6.9 | 7.7 | 55.6 | 2 / 1 | 115.66 | 139296.23 |
| S1 | 10.0030 | 6.9 | 7.7 | 7.9 | 0 / 0 | 111.89 | 118258.54 |
| S44 | 10.0012 | 7.0 | 13.9 | 14.8 | 0 / 0 | 144.83 | 236485.85 |

M1 parada; M2 em movimento; S2 com cinco comuns vivos (sem abates, autor);
S1 sem inimigos. S2 foi coletada por 30 s, maior que os 10 s pedidos; duração
real preservada, não apresentada como amostra de 10 s. S44: quarta horda, 44 vivos nos 10 s inteiros (autor). Todos os casos acima:
status válido, warnings vazio, coverage sem saturação. M1/M2/S1/S44 sem LoAF;
S2 com um LoAF de 66 ms. Há amostras adicionais em M2 e S44, de condição não identificada; foram preservadas, mas não substituem os casos obrigatórios. S44 usa o último índice (3), com 44 vivos pelos 10 s completos conforme confirmação do autor.

As cenas e ângulos diferem ao longo do percurso. A diferença entre as contagens
ou percentis não isola uma otimização. rAF mede a cadência do navegador e não
tempo de GPU; 144 Hz não é um requisito universal de desempenho aprovado.

## Heap JS na exportação

Valores de `performance.memory`, quantizados pelo Chromium, fora da janela específica de cada amostra. Não representam memória total da GPU nem um pico de uso.

| Relatório | Heap usado (MiB) |
|---|---:|
| M1 | 182.33 |
| M2 | 199.74 |
| S2 | 352.78 |
| S1 | 361.12 |
| S44 | 431.82 |

## Carregamento e evidências

Entrada preliminar `A-entrada-marte-preliminar.json`: contém cena pronta, mas
sem amostras e com DPR/tela diferentes (preparação antes do autor testar).
Preservada como diagnóstico; não substitui M1.

`S2-shanghai-5-robos-30s.json` contém nova entrada de Marte e a viagem completa
para Shanghai. Eventos da viagem: primeiro draw +4.893,8 ms; personagens prontos
+5.051,1 ms após map-loading. Esses marcos não certificam todas as texturas/GLBs
nem equivalem a tempo de GPU. `map-data-ready` é o evento da store, não um
cronômetro de renderização; pode ser emitido após os primeiros draws no fluxo atual.

Relatórios completos preservados nos arquivos M1/M2/S2/S1/S44. Proveniência, índice
da amostra selecionada, SHA-256 e verificações nos respectivos `*-validacao.json`;
eventos da viagem em `B-viagem-validacao.json`. Fontes do autor intactas.
`npm-test-painel.txt` / `build-painel.txt`: rodada de checks do código medido.

As cinco cópias e amostras selecionadas passaram também pela conferência
uniforme de hashes, duração, percentis, cobertura e timestamps; ver
`verificacao-consolidada.json`. O diff de código contra `00ab557` permanece
restrito ao módulo opcional de perf e aos dois testes novos.

## Fechamento pelo autor

Em 05/11/2026, o autor declarou:

- “115/115 e retorno a Marte concluídos sem bloqueios”.
- “Aprovo a etapa 6.5, sem falhas impeditivas”.
- “Aprovo a S2.9 com os resultados e limites registrados”.

Essas decisões encerram a Sprint 2 nesta versão. O agente registrou o aceite
humano; a aprovação não é inferida das verificações técnicas. Inspeção manual
da API pelo console não foi executada; API/lifecycle e ativação opcional têm
cobertura automatizada, e as amostras foram feitas pelo painel no build real.
A duração total da missão não foi informada; todas as durações de amostra foram
conferidas. Duração maior de S2 e limites de rAF/memória/renderer aceitos pelo autor.

Registros na branch `rochatales/s2-fechamento-2026-11-05`, sem merge/push.
Quadro da integração: patch preparado no handoff, sem edição na branch de tarefa.
Pendência posterior do autor, S6.16: vídeos de transição durante o carregamento
no menu de navegação da aeronave. Próxima etapa: organização documental e
inventário de assets antigos, preservando fontes/backups/não rastreados.
