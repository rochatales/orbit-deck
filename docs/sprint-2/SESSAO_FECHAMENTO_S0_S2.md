# Sessão final do autor — Sprint 2

**Kit atualizado em 26/10/2026. Restam o aceite geral da etapa 6.5 e as medições/aceite da S2.9.**
Os roteiros já aceitos foram retirados desta sessão; os registros históricos permanecem
nos handoffs. S2.12 concluída; S2.11 comparada pelo autor em 144 Hz e não adotada:
manter o padrão, sem `?interp=1`. Nenhum resultado abaixo está preenchido pelo agente.

## Versão e preparação

| Referência | Valor |
|---|---|
| Base de runtime desta sessão | **`62a7040fef130827e9534548f4bacb4543f647c3`** |
| Branch e checkout a testar | `rochatales/s2.12-b` · `/Users/rochatales/.codex/worktrees/s2-12-b/game-workplace` |
| Conteúdo | Aranha ×2,5/recuperação, ricochetes/pool 256/280 HP e marcha (`d1ac5c6`, `72b5b00`, `5ee7aa7`, `7e67128`), aprovados pelo autor após revisão Claude sem defeitos; patrulha de tipo único `53829eb`, reunida em `62a7040`, também aprovada |
| Verificação técnica desta base | **256/256**, build e diff-check verdes, reexecutados pelo Codex em 26/10; aviso de chunk grande preexistente |
| Documentos | Kit nesta linha e cópia na branch de fechamento; quadro oficial em `rochatales/fechamento-s0-s2`. A worktree documental de fechamento não contém o runtime novo |

Comandos **para o autor**, na worktree do jogo acima. Commits posteriores só de
documentação podem fazer o HEAD diferir da base; anotar o SHA real. O comando de
ancestralidade deve terminar com código 0, e a branch deve ser `rochatales/s2.12-b`.

```bash
cd /Users/rochatales/.codex/worktrees/s2-12-b/game-workplace
git branch --show-current
git rev-parse HEAD
git merge-base --is-ancestor 62a7040fef130827e9534548f4bacb4543f647c3 HEAD
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Abrir [o jogo](http://127.0.0.1:4173/) num perfil de navegador de teste. Usar o
Explorador r7 e Shanghai fase 01 padrão; sem comparação, mapa antigo, fixture ou
ganchos de QA. Só iniciar preview após build verde. Porta ocupada: identificar a
instância antes de continuar, sem encerrar processos desconhecidos. Ctrl+C encerra
este preview. O checkout principal não participa.

Registrar em `ambiente-e-resultados.md`: data/fuso, SHA/branch/URL/build production,
dispositivo/CPU/GPU/RAM, sistema/navegador, tela (autor dispõe de **144 Hz**, anotar
configuração efetiva), viewport/canvas/buffer, DPR da janela/renderer, zoom/câmera,
energia/carga de outras aplicações e cache/perfil/extensões. Manter condições
comparáveis; indisponível/null não significa zero.

Criar uma pasta nova de evidências em outro terminal:

```bash
cd /Users/rochatales/.codex/worktrees/s2-12-b/game-workplace
HORDA_SESSAO_DIR="$(pwd)/docs/sprint-2/evidencias/fechamento-s0-s2/autor-$(TZ=America/Sao_Paulo date +%Y%m%d-%H%M%S)"
mkdir -p "$HORDA_SESSAO_DIR"
printf '%s\n' "$HORDA_SESSAO_DIR"
```

## Etapa 6.5 — aceite do combate completo

Testar a pé em Shanghai. Na cabine, campo **Encontro de teste**; na vitória/derrota,
escolher e reiniciar. Começar pelas patrulhas isoladas e depois jogar as quatro hordas.
Para percepção, reiniciar entre casos: inimigo já alertado continua perseguindo.
Preencher passou/falhou/pendente e evidência; falhas precisam de passos para reprodução.

| Item | Ação e esperado | Resultado / evidência |
|---|---|---|
| 6.5 · seletor por tipo | Exercitar Patrol comum, Patrol grande, Mutante pequeno e Mutante grande, cada um com 1/3/5; só o comum oferece 32. Retry preserva tipo/quantidade; Hordas restaura o encontro misto | pendente — |
| 6.5 · percepção e pressão | Frente: cone 120°/10 m; perto: 3 m sem costas, ponto cego traseiro de 90°; paredes bloqueiam visão. Acerto não letal alerta, erro fora da visão não. Conferir pressão dos pequenos rápidos, cerco e recuperação dos grandes sem fila permanente nem atravessar prédios | pendente — |
| 6.5 · rifle, porte e cobertura | Tiro/cano a 0,85 m da rua, retícula 0,86; parede encostada/quina bloqueia inclusive centro→cano, alcance até 32 m desde o cano. Comum 2,24 m e grande 3,20 m, aranha ×2,5; 3/6/2/12 tiros eliminam comum/grande/pequeno/aranha. R leva 1,5 s, até 24 no pente descontados da reserva. Visual sobe no piso; tiro permanece no nível da rua | pendente — |
| 6.5 · investida | Aranha prepara por 0,8 s a 4–9 m com linha livre; aviso vermelho largo, mesmo no mudo. Desviar saindo da faixa; corrida até 10 m, parede interrompe, recarga 3 s. Aliados são empurrados sem dano e atravessados se não houver espaço; jogador atingido leva 30, contato comum da aranha 15, respeitando intervalo global | pendente — |
| 6.5 · recursos | Comum: 1 ferro + 1 cobre; Patrol grande: 1 titânio; pequeno: 1 orgânica; aranha: 3 orgânicas separadas. Contadores individuais, coleta instantânea e visual acelerado; itens flutuam sem giro Y. Anéis prata/laranja/dourado/verde pulsam acima da rua/calçada/canteiro/grama e somem na coleta. São recursos temporários da tentativa | pendente — |
| 6.5 · caixas e cura | Caixas (−10;12) e (36;−22): pela frente, até 1,8 m, E/botão, abertura 2,4 s; +48 na reserva uma vez a partir de 0,733 s, sem encher pente. Parede/pausa/morte bloqueiam interação. Dois corações curam até +50, teto 100; não consumir com vida cheia | pendente — |
| 6.5 · efeitos e áudio | Clarão no cano/traçador fino, metal laranja/branco nos robôs, verde nos animais, poeira na parede e tranco curto. Ricochetes apoiados no piso. Ouvir disparo/recarga/passos do jogador, dos Patrols e da aranha/acerto/morte/ataque/coleta; M e painel salvam mudo/volume. Alerta e morte da aranha usam sons provisórios; pequeno sem passo próprio | pendente — |
| 6.5 · pausa, morte e retry | Esc/perda de foco suspendem combate, animação e áudio; retomar sem tecla/tiro preso, dano ou sons acumulados. Retry restaura HP/munição do encontro, caixas e contadores, limpa recursos/partículas/avisos/recuperação; sem herdar estado da tentativa anterior | pendente — |
| 6.5 · ciclo e dificuldade | Completar as quatro hordas abaixo: todos contam na HUD/resultado e na próxima horda; zerar uma antes da seguinte (4 s inicial, 6 s entre elas), terminar 115/115. Avaliar duração, munição e dificuldade, sem inimigo preso indefinidamente | pendente —; duração: — |
| 6.5 · retorno | Embarcar na ARES-I em Shanghai (0;9,5), voltar a Marte e desembarcar (0;29,5); caminho Hangar/deck livre, colônia v007/estufa preservadas, sem combate ou efeitos herdados em Marte. Loot persistente/extração obrigatória da Sprint 4 ficam fora deste aceite | pendente — |

| Horda | Comuns | Patrol grandes | Pequenos | Aranhas | Total | Mínimo de munição total* |
|---|---|---|---|---|---|---|
| 1 | 10 | 0 | 3 | 0 | **13** | 54 |
| 2 | 20 | 0 | 6 | 0 | **26** | 108 |
| 3 | 25 | 5 | 0 | 2 | **32** | 194 |
| 4 | 30 | 10 | 0 | 4 | **44** | 297 |
| Total | 85 | 15 | 9 | 6 | **115** | — |

*Início da horda só completa a reserva se pente + reserva estiverem abaixo do
mínimo (acertos necessários ×1,5, arredondados para cima); não reduz munição nem
enche pente. Repõe os dois corações, sem fechar ou recompensar novamente caixas abertas.

**Aceite expresso 6.5:** aprovo / não aprovo / pendente: —. Pendências: —.
Aceites individuais já registrados não substituem esta decisão sobre o ciclo completo.

## S2.9 — medições no equipamento do autor

Usar o mesmo preview em [/?perf](http://127.0.0.1:4173/?perf), aba visível e jogo em
foco, cena/modelos carregados. Abrir a URL novamente reinicia a página; exportar antes.
Não fazer testes de pausa/perda de foco durante amostras. Manter câmera/zoom/DPR/energia
comparáveis, DevTools fechado/desacoplado de forma consistente antes de medir.

Para M1/M2 (30 s), agendar no console e voltar ao jogo antes dos 5 s iniciais:

```javascript
setTimeout(() => {
  window.__hordaPerf.sample(30000).then(r => console.info('Amostra 30 s concluída', r));
}, 5000);
```

Voltar pelo atalho do DevTools, sem clicar no canvas de Shanghai (pode atirar), e
retomar antes do início se necessário. S1/S2/**S44** usam o botão **Amostra 10 s**
ou o mesmo agendamento com `sample(10000)`. Ao terminar cada caso, **Copiar JSON**
exporta o relatório completo (`context`, carregamento, `sceneEvents`, `samples`);
salvar na pasta da sessão, não apenas o retorno isolado de `sample`. Histórico de
até dez amostras: exportar após cada caso e antes de recarregar/voltar de mapa.

| Item | Condição | Arquivo / resultado |
|---|---|---|
| P0–P2 / C1 | Sem `?perf`: painel/API ausentes. Com flag: painel não bloqueia HUD, clique/rolagem não atira/gira/zooma. API e relatório funcionam; `context.build` é `production` | `ambiente-e-resultados.md` — pendente |
| JSON A | Marte carregado: eventos da entrada até cena pronta, tempos/cache | `A-entrada-marte.json` — pendente |
| M1 | Marte parado, a pé, **30 s**, sem menu/pausa | `M1-marte-parado-30s.json` — pendente |
| M2 | Marte em movimento contínuo em rota livre, **30 s** | `M2-marte-movimento-30s.json` — pendente |
| JSON B | Viajar com patrulha de 5 comuns; após desembarque, eventos até cena pronta e `sinceMapLoadingMs` | `B-viagem-shanghai.json` — pendente |
| S2 | Shanghai com 5 comuns no início, andando/atirando, **10 s**; registrar ativos início/fim | `S2-shanghai-5-robos-10s.json` — pendente |
| S1 | Depois de eliminar os cinco, andar em Shanghai sem inimigos, **10 s** | `S1-shanghai-sem-inimigos-10s.json` — pendente |
| **S44** | Selecionar Hordas e reiniciar; completar 13/26/32. Ao nascer a quarta, HUD **HORDA 4/4 · 44 ATIVOS**: manter **30 comuns + 10 grandes + 4 aranhas** vivos por **10 s inteiros**, andando/desviando sem matar; registrar HUD/ativos no início e fim | **`S44-shanghai-pico-44-10s.json`** — pendente |

**S44 substitui S40 como pico obrigatório.** Patrulha de 32 ou janela com menos de
44 não substitui o pico. Não usar cheat, fixture, código alterado ou ganchos DEV.
Se não conseguir manter os 44 por 10 s sem morrer/pausar, salvar com sufixo
`-tentativa-01`, registrar motivo/ativos/duração e repetir ou deixar pendente.
**Janela parcial ou pausada não vale**, mesmo que a API retorne `status: valid`.

Em cada JSON, conferir `status`, `invalidReason`, `requestedMs` (S44 = 10000),
`elapsedMs` (≥10000 e aproximadamente 10 s), `map`, `warnings` e `coverage` sem
saturação. Rejeitar mudança de mapa/contexto, aba oculta, pausa/menu/cabine,
morte/retry, coleta incompleta ou alteração da composição durante S44. Informar
rAF p50/p95/máximo e >33/>50 ms, LoAF quando disponível, draw calls/triângulos
mín./máx./média, memória e avisos **da amostra**, não do painel ao vivo.
Sem suporte = null/indisponível; draw calls excluem sombras e rAF não é tempo de GPU.
`scene-assets-ready` não certifica todos os GLBs novos: conferir prontidão visual.

**Arquivos entregues / ambiente:** —.
**Aceite expresso S2.9:** aprovo / não aprovo / pendente: —.

## Entrega e parada

Enviar o relato por identificador 6.5/P0–P2/C1/A/B/M1/M2/S1/S2/S44, JSONs, ambiente
e decisões expressas de **6.5 e S2.9**. Lacunas continuam pendentes. O agente só
registra resultados/checkboxes restantes após essas decisões; esta preparação
não encerra a Sprint 2 nem os itens futuros antecipados de recursos/arte/áudio.
Sem push, merge na integração ou remoção de worktrees. **Parada: kit pronto,
aguardando a sessão final do autor.**
