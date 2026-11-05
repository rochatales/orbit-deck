# S2.9 / etapa 6.5 — sessão de fechamento · 05/11/2026

## Pedido, base e escopo

Autor pediu realizar agora as medições S2.9, o aceite geral 6.5 e registrar o
fechamento da Sprint 2; limpeza da documentação/assets fica para depois.
Base publicada `90e7734` foi conferida, mas o autor pediu a versão mais recente da colônia. Base da sessão alterada para `00ab557a545b7ac1af6630cca118c03efed9ba42`, descendente da publicação, com Quartel/Laboratório, Oficina e ajustes de telhado. Nenhum merge foi feito.
Branch `rochatales/s2-fechamento-2026-11-05`, worktree própria gerenciada pelo Codex.
Assets, regras de jogo e lockfile preservados; ajuste posterior somente na instrumentação opcional `?perf`. Checkout principal preservado.
Implementação/registro: Codex. Validação visual, jogabilidade e decisões: autor.

## Entregue nesta preparação

Roteiro atualizado para astronauta/rifle laser, facão, Dash, interpolação padrão,
quatro kits guardados/uso por 3, sete suprimentos e composição de 115 ameaças.
Retiradas instruções operacionais obsoletas de 26/10, preservadas no histórico Git.
Build de produção em `http://127.0.0.1:5194/?perf`.

## Verificação técnica

Verificações da base atual: 562/562 testes, build passou (aviso preexistente de chunk grande), diff-check limpo. Preparação anterior em `90e7734`: 551/551, build/diff verdes; logs preservados em `preparacao-base-publicada-90e7734/` e não usados para aprovar a base nova. Logs atuais em
`docs/sprint-2/evidencias/2026-11-05/`. Dependências existentes por symlink local,
com SHA-256 do lockfile idêntico à instalação. Não houve instalação/upgrade.

## Resultados e pendências

Sessão manual e medições em andamento. S2.9 e etapa 6.5 sem aceite por enquanto.
Ambiente em `sessao.json`; JSONs por caso serão preservados nessa pasta. Roteiro
em `docs/sprint-2/SESSAO_FECHAMENTO_S0_S2.md`. Sem merge/push/limpeza.


## Ajuste da instrumentação durante a sessão

A tentativa de agendamento remoto pelo console não gerou amostra no relatório;
a cópia via área de transferência também retornou vazia na automação. Nenhuma
amostra M1 foi aceita por isso. Para permitir o teste sem console/clipboard,
o painel `?perf` recebe **Amostra 30 s** e **Baixar JSON**, além das opções
anteriores. Exportação fica bloqueada enquanto amostra está em curso. Os
relatórios completos são baixados em arquivos com mapa e data/hora no nome.

Na conferência de carregamento foi reproduzida outra regressão da S2.9: a
sonda ainda esperava o jogador `Explorador` e a EDEN antiga (`EDEN`), portanto
não publicava `scene-assets-ready` com o astronauta e a EDEN da Control Room.
A sonda passa a ler a variante selecionada e aguardar `EdenFigura`, o conteúdo
carregado real da EDEN. Não basta seu wrapper vazio; o tracker preserva a
espera até o frame desenhado seguinte. Shanghai não depende da EDEN.
Nenhuma lista/objeto novo é criado no passo dessa conferência.

Dois testes de regressão adicionados em `tests/perf-readiness.test.mjs`:
prontidão real em Marte e seleção de variante em Shanghai. Os 13 testes
relevantes de perf passaram. Suíte completa após o ajuste: **564/564**, build e diff-check verdes;
logs da rodada atual em `npm-test-painel.txt`/`build-painel.txt`; a rodada anterior permanece nos arquivos sem o sufixo `-painel`.


## Revisão independente · 05/11

Claude revisou `00ab557...18fe0d6`: nenhum defeito de código e nenhuma mudança
de gameplay. Apontou a contagem antiga de testes no roteiro e uma frase ambígua
sobre os logs; ambas corrigidas. Parecer completo em `revisao-claude.txt`.
Código medido: `18fe0d6`, com mapas/regras de `00ab557`; commits documentais
posteriores não mudam o build. A primeira tentativa remota não produziu amostra.
Autor orientado a iniciar M1 pelo botão de 30 s e baixar o relatório na tela
Odyssey G5. Aceites S2.9 e 6.5 continuam pendentes.


## M1 — relato do autor e painel

Autor informou M1 concluída e JSON baixado. Painel nativo do Chrome observado:
amostra válida, p50 13,1 ms, p95 14,5 ms, >33 ms 0, >50 ms 0, LoAF 0,
DPR janela/renderer 1/1. O arquivo ainda não foi localizado em Downloads/Desktop
nem pelo nome na indexação; solicitado caminho/nome ao autor. Valores são
provisórios até conferir o relatório completo, duração, coverage e contexto.
Nenhum aceite S2.9 ou 6.5 inferido.


## Arquivo recebido — entrada preliminar

Autor indicou `/Users/rochatales/Game Development/Horda Survivor/` como destino
dos relatórios. Arquivo de 16:11:25 UTC preservado por cópia com SHA-256 conferido
em `A-entrada-marte-preliminar.json`, fonte intacta. É production, contém o
Laboratório visual v003, Quartel/cascas e o evento `scene-assets-ready` (8.188,9 ms),
confirmando a correção da prontidão. Porém `samples` está vazio e contexto reporta
DPR 2/renderer 1,5 e screen 1512×982, diferente do painel da M1 (DPR 1/1).
Não usado como medição M1. Solicitado Baixar JSON novamente na aba existente,
sem recarregar/repetir a amostra já concluída.


## M1 — JSON completo validado

Novo arquivo indicado pelo autor (nome externo não relacionado ao conteúdo)
contém um relatório perf v2 em production com uma amostra M1 de Marte válida:
30.008,4 ms de 30.000 solicitados, invalidReason null e warnings vazio.
Cobertura: 2.853 intervalos e 286 leituras do renderer, nenhuma saturação.
A cena estava pronta antes da amostra. Rota parada é declaração do autor;
o contexto é da exportação posterior e não constitui telemetria contínua de imobilidade.

- rAF p50 13,1 ms; p95 14,5 ms; máximo 14,8 ms; >33/>50 ms zero; LoAF zero.
- Draw calls mín./máx./média: 370 / 372 / 371,57; triângulos: 404.491 /
  404.569 / 404.552,36 (passes de sombra fora dessas contagens).
- Exportação: tela 2560×1440, viewport/buffer 1363×1035, DPR 1/1;
  Chrome 156 / ANGLE Metal Apple M2 Pro. Heap da exportação não é heap
  específico da janela M1. Tela Odyssey G5 144 Hz confirmada pelo autor.
- Preservado em `M1-marte-parado-30s.json`, hash de origem/cópia conferido;
  checagem e proveniência em `M1-validacao.json`. Fonte intacta.

M1 registrada tecnicamente; próximos casos M2/B/S2/S1/S44 e aceites expressos
S2.9/6.5 permanecem pendentes. Não constitui encerramento da sprint.


## M2 — JSON completo validado

Autor confirmou movimento e exportação. Última amostra (índice 2) do relatório:
30.000,7 ms de 30.000 solicitados; válida, invalidReason null e warnings vazio.
4.320 intervalos, 288 leituras, sem saturação. rAF p50 6,9 ms / p95 7,7 ms /
máximo 7,9 ms; >33/>50 ms e LoAF zero. M1 preservada integralmente no índice 0;
índice 1 é uma amostra extra de condição não identificada, não contada como
medição obrigatória. Fonte e cópia `M2-marte-movimento-30s.json` iguais por SHA-256;
ver `M2-validacao.json`.

Tela/viewport/buffer/DPR/GPU/navegador e zoom da exportação iguais aos da M1.
Posição e ângulo de câmera mudam com o percurso; contagens não são comparação
isolada de otimização. Draw calls mín./máx./média 135/359/271,39; triângulos
234.295/396.525/323.389,34. Contexto/heap são da exportação posterior.
M2 registrada; seguem B/S2/S1/S44 e decisões expressas do autor.


## B + S2 — viagem e cinco comuns

Autor confirmou o caso feito, sem matar nenhum robô: cinco vivos no início/fim.
Fonte com grafia `S2-shanhai-5-robos-10s.json` preservada intacta; cópia da sessão
nomeada `S2-shanghai-5-robos-30s.json`, pois a duração real é **30.004,5 ms**
(requestedMs 30.000), e não 10 s. A coleta maior é registrada explicitamente;
não foi reetiquetada como janela de 10 s. Production, válida, sem warnings ou
saturação, 4.303 intervalos / 288 leituras; cena pronta antes da coleta.

rAF p50 6,9 / p95 7,7 / máximo 55,6 ms; dois >33 ms, um >50 ms; um LoAF de
66 ms. Draw calls mín./máx./média 86/146/115,66; triângulos
99.960/217.839/139.296,23. Contexto da exportação mantém tela, viewport, buffer,
DPR, GPU e navegador das medições anteriores. Zoom/posição mudam ao entrar em
Shanghai. Não há limite universal de FPS aprovado nem medição de GPU.

Eventos de B completos: map-loading → canvas → primeiro draw → personagens
prontos; primeiro draw +4.893,8 ms, personagens prontos +5.051,1 ms após loading.
Eventos e JSON completos no mesmo arquivo S2; não é necessário duplicá-lo para B.
O JSON contém nova entrada de Marte e histórico de amostras reiniciado; M1/M2
anteriores já estão preservados. Proveniência/checagens em `S2-validacao.json`
e `B-viagem-validacao.json`. Próximos: S1, S44 e aceites do autor.


## S1 — Shanghai sem inimigos

Autor confirmou zero inimigos, conclusão e exportação. Última amostra (índice 1):
10.003 ms de 10.000 solicitados, production, válida, invalidReason null,
sem warnings/saturação. 1.440 intervalos / 96 leituras. p50 6,9 / p95 7,7 /
máximo 7,9 ms; >33/>50 ms e LoAF zero. S2 anterior preservada integralmente
no índice 0. Tela/viewport/buffer/DPR/GPU/navegador/zoom iguais à exportação S2.
Draw calls mín./máx./média 83/131/111,89; triângulos 103.549/198.150/118.258,54.
Fonte intacta (grafia `S1-shangai...`), cópia normalizada e SHA-256 conferido;
`S1-shanghai-sem-inimigos-10s.json` e `S1-validacao.json`. Movimento e população
são condição manual declarada. Próximo pico S44 e aceites do autor pendentes.
