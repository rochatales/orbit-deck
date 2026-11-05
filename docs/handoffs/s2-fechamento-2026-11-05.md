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
logs separados `npm-test-painel.txt`/`build-painel.txt` preservam a rodada anterior.
