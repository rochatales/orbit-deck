# Ferro, cobre e Patrol grande — validação do autor

Branch `rochatales/s6.1-patrol-grande-recursos`, base
`a15af914440577ed1b4e26bdeb44e6dd727a06c8`.
Worktree `/Users/rochatales/.codex/worktrees/recursos-patrol-grande/game-workplace`.
Resultado técnico e parâmetros: [handoff](../handoffs/s6.1-patrol-grande-recursos.md).

Executar o **build desta worktree**, em uma porta livre, sem trocar os previews
do fechamento ou da S2.12 B:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4193 --strictPort
```

Anotar o SHA testado. A aprovação visual e de jogabilidade é do autor;
todos os itens abaixo estão pendentes.

| Caso | Esperado | Resultado |
|---|---|---|
| Comuns | Matar Patrol comum e conferir os GLBs novos de ferro e cobre, com aparência da exportação do autor | pendente |
| Coleta | Aproximar: +1 ferro e +1 cobre, uma vez; animação continua sem repetir recompensa. Se morrerem próximos, ainda há feedback visual da coleta imediata | pendente |
| Hordas 1/2 | 10 e 20 comuns, nenhum grande | pendente |
| Horda 3 | 30 inimigos, incluindo 5 Patrol grandes | pendente |
| Horda 4 | 40 inimigos, incluindo 10 Patrol grandes | pendente |
| Grande | Conferir tamanho/legibilidade (3,20 m), marcha, ChaseRun, contato, reação ao tiro e morte, sem atravessar prédios/bordas | pendente |
| Titânio | Grande morto entrega um drop de titânio; aproximação soma +1 somente em TITÂNIO. Os lingotes são provisórios, não um GLB novo | pendente |
| Mistura | Mover-se e neutralizar a primeira linha; verificar pressão dos grandes sem filas bloqueando a conclusão | pendente |
| Suprimento | Rifle/caixas/recarga funcionam; reabastecimento leva em conta a resistência dos grandes sem reduzir reserva existente | pendente |
| Pausa | Simulação, movimento e animação de coleta congelam e retomam sem duplicar itens | pendente |
| Retry | Volta a 10 comuns, vida/munição e ferro/cobre/titânio zerados; sem cadáver, drop ou pose da tentativa anterior | pendente |
| Nave/retorno | E, embarque/desembarque e retorno à colônia preservados; sem salvar esses recursos temporários no hub | pendente |

Não usar a fixture/neutralização assistida do QA como aprovação destas hordas.
Não há coleta de alumínio ou depósitos neste pedido: o autor corrigiu o item
para ferro. S2.12 B continua separada e parada após sua etapa 1.
