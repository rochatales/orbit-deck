**Sem achados.** `node --test tests/first-expedition-ui.test.mjs` passou 6/6; o resto é rastreio de código, sem rodar no navegador.

Conferi o único risco do foco novo: depois de retomar, a engrenagem fica focada e o Espaço, que é o dash, poderia abrir o menu. No jogo em andamento, `PlayerController.tsx:91` chama `preventDefault` no `keydown` em captura, o que no Chromium impede o clique; não verifiquei o comportamento em outros navegadores.

Os outros pontos pedidos também fecham:
- **Foco:** o foco preso inclui a engrenagem do modal, e ao retomar o foco volta à engrenagem do topo (`App.tsx:50-52`).
- **Teclas e estados:** ESC, B, F, conversa, cabine e morte mantêm a prioridade.
- **Rádio:** fica oculto na pausa e na conversa (`App.tsx:148`).
- **Saída:** continua passando por `returnHome`, com o abandono da campanha preservado.

O aceite visual e de jogabilidade continua com o autor. Não editei nada nem rodei o script colado, então `/tmp/s3-2-pause-review.jsonl` não foi gerado.
