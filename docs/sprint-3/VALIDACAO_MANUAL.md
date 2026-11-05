# Sprint 3 — Validação manual

## S3.4 e fila de spawn · 05/11/2026

**Estado:** pendente do autor nesta branch. O aceite anterior de 115/115 refere-se
à base da Sprint 2 e não aprova automaticamente esta alteração.

Usar a branch `rochatales/s3-ondas-dispositivos`, mapa Shanghai fase 01 e encontro
**Hordas**. Manter o mesmo equipamento se comparar desempenho. Não há minas ou
barreiras nesta primeira entrega.

1. Viajar de Marte para Shanghai e conferir que o desembarque/colônia continuam
   na versão correta. A primeira horda deve ter 13, a segunda 26, a terceira 32
   e a quarta 44 ameaças. Intervalos de 4 s inicial e 6 s entre hordas preservados.
2. Antes de uma chegada, caminhar perto de uma borda. Conferir que nenhum inimigo
   nasce em cima do personagem ou de outro inimigo e que os pontos próximos ao
   jogador são substituídos por pontos seguros do perímetro.
3. Conferir grupos mistos junto a paredes, vielas e esquinas: perseguem sem
   atravessar sólidos. A recuperação existente pode ceder passagem entre aliados;
   não deve criar mortes, recompensas ou reiniciar a vida do inimigo.
4. Se aparecer **NA FILA**, a horda permanece ativa até os pendentes nascerem e
   serem derrotados. Sair da região ocupada deve permitir o nascimento seguro.
   O mapa atual comporta a horda completa nas cinco posições automatizadas;
   não é necessário provocar artificialmente a fila no jogo.
5. Pausar/perder foco durante contagem/combate: sem progresso enquanto pausado.
   Retomar sem duplicar inimigos, quedas, peças ou som de morte.
6. Reiniciar pelo menu e depois morrer/tentar novamente: contagem inicial nova,
   nenhum pendente/drop da tentativa anterior. Concluir as quatro hordas,
   conferir **115/115**, explorar e retornar a Marte sem novos spawns.
7. Opcional `?perf`: repetir pico de 44 vivos na mesma Odyssey G5; registrar
   duração e comparar com S44 da S2 sem tratar rAF como tempo de GPU. O diagnóstico
   `window.__hordaPerf.pose()` inclui `queued`, além de `wave` e `alive`.

Registrar versão/branch, equipamento, casos conferidos e falhas concretas.
Jogabilidade/legibilidade e desempenho percebido são decisões do autor.
