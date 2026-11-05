# EXODEN

**O mundo acabou. A humanidade, não.**

Protótipo local de exploração e combate. A humanidade vive em Marte e envia um
explorador às ruínas da Terra. EDEN orienta a expedição pelo rádio. React, Vite,
TypeScript, three/R3F, Rapier e zustand, sem backend.

## Estado desta base · 05/11/2026

Sprint 2 encerrada por aceite do autor: S2.9 e etapa 6.5 aprovadas, 115/115 e
retorno a Marte sem bloqueios. [Plano oficial](docs/HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md)
· [Registro do fechamento](docs/sprint-2/SESSAO_FECHAMENTO_S0_S2.md).

- Colônia marciana com EDEN, Quartel/Laboratório atualizados, Oficina, Hangar e deck ARES-I.
- Embarque/desembarque separados da viagem Marte → Shanghai → Marte.
- Shanghai fase 01, com quatro tipos de inimigos e hordas 13 → 26 → 32 → 44 (115 no total).
- Rifle laser, facão, Dash, kits médicos, munição, recursos, mochila e carga da aeronave.
- Perfil/briefing e carga da aeronave têm save local. A tentativa a pé não é retomada após recarregar a página.

Os Sprints 3/4/6 têm entregas antecipadas; seus escopos completos, a extração
obrigatória e a máquina do laboratório permanecem no plano. Os vídeos de transição
nos intervalos de loading da navegação da aeronave são pendência do autor na S6.16.
A aprovação desta base não publica nem integra branches automaticamente.

## Executar e verificar

Usar as dependências do lockfile do projeto (pnpm), preservando a stack atual.
Com dependências instaladas:

```sh
npm run dev -- --host 127.0.0.1 --port 5178
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
git diff --check
```

Abrir [desenvolvimento](http://127.0.0.1:5178/) ou o
[build de produção](http://127.0.0.1:4173/). Para medições opcionais, acrescentar
`?perf` à URL de produção: painel com amostras de 10/30 s e download do JSON.
rAF mede cadência do navegador, não tempo de GPU. O dev e as fixtures não são benchmark.

## Controles

| Entrada | Ação |
|---|---|
| W / ↑ | Correr na direção da mira |
| S / ↓ | Recuar mantendo o corpo voltado à mira |
| W + S | Parar; A/D não deslocam lateralmente |
| Mouse / botão esquerdo | Mirar / usar a arma equipada em Shanghai |
| 1 / 2 | Equipar rifle laser / facão |
| R | Recarregar |
| Espaço | Dash; duas cargas, recarga total em 5 s |
| 3 | Usar kit médico guardado |
| Q / C | Girar a câmera |
| Roda do mouse / + / − | Zoom |
| E | Conversar, interagir, embarcar/desembarcar |
| B / F | Mochila / carga da aeronave, perto dela |
| Escape / M | Fechar/pausar conforme contexto / som |

Na nave, usar a ação de viagem para partir; entrar na cabine não inicia o voo.
A volta a Marte continua livre nesta base e não conclui a extração obrigatória futura.

## Documentação e assets

Começar pelo [índice de documentação](docs/README.md).
[Assets e preservação](docs/ASSETS.md) distingue arquivos emitidos no build,
referências de código/testes/ferramentas, fontes e backups.

O produto anterior MCP Office está em `archive/mcp-office/`. Seus documentos
foram separados em `archive/mcp-office/docs/`; consulte o [índice histórico](docs/historico/README.md).
Eles não definem controles, tarefas ou runtime do EXODEN.

`tests/browser-smoke.html` e outras fixtures são ferramentas de QA fora do build
normal. Validação visual e jogabilidade são do autor; evidências e relatórios
ficam nos handoffs e nas pastas de sprint. [Fluxo de trabalho](docs/AI_WORKFLOW.md).
