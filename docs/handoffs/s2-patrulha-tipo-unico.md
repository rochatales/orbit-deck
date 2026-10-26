# Patrulha de teste com um só tipo de inimigo

Pedido do autor em 26/10/2026 (item 9 do lote da aranha). Implementação: Claude, a pedido do autor.
Base: `72b5b00` (`rochatales/s2.12-b`, aranha 2,5× e recuperação de travamento). Branch:
`claude/s2-patrulha-tipo-unico`. Aceite visual e de jogabilidade: autor, pendente.

## O que mudou

- **Seletor** (`src/combat/CombatHud.tsx`, cabine em Marte, vitória e derrota): campo "Encontro de
  teste" com Hordas ou Patrulha de Patrol comum, Patrol grande, Mutante pequeno ou Mutante grande;
  campo "Quantidade" com 1, 3 ou 5 (32 só para o Patrol comum). Hordas continua o padrão.
- **Escolha** (`src/combat/config.ts`): o Patrol comum continua como número (1/3/5/32), então saves e
  escolhas antigas seguem válidos; os outros tipos usam `tipo:quantidade` (ex.: `largeMutant:3`).
  `parseEncounter`, `patrolChoice`, `PATROL_KINDS` e `PATROL_COUNTS` centralizam a regra;
  `ENCOUNTER_CHOICES` rejeita 32 fora do Patrol comum e qualquer tipo desconhecido.
- **Simulação** (`src/combat/simulation.ts`): a patrulha de um tipo usa os spawns e rotas da fase que
  são válidos no raio daquele tipo (caminho livre até o contato no desembarque), alternando rotas.
  Se faltarem pontos, completa pela borda, como nas hordas. Cada robô recebe vida, velocidade,
  setor do cerco (mutante pequeno) e slots de drop do tipo (3 para o mutante grande). A grade de
  navegação do tipo só é criada quando o encontro usa esse tipo. Munição completada pela mesma
  margem das hordas, se faltar.
- **Visual** (`src/combat/CombatScene.tsx`): os rigs e GLBs do Patrol grande, do mutante pequeno e
  do mutante grande também são carregados na patrulha, só quando o tipo é usado.

## Verificações

- `tests/patrol-type.test.mjs` (5 testes): escolhas e compatibilidade; cada tipo × quantidade cria só
  aquele tipo, em pontos livres e distintos, com drops e munição corretos; rotas alternadas e setores do
  bando; 20 s de simulação sem ninguém dentro de sólido; blockout antigo; store aceita, reinicia e rejeita.
- Na fase 01, os três tipos nascem nas rotas (1 → rota 1; 3 → rotas 1, 3, 2; 5 → rotas 1, 3, 2, 0, 1),
  sem usar a borda. Munição inicial (24 + 96) já cobre 5 mutantes grandes com margem.
- `npm test` **250/250**, `npm run build` verde (aviso de chunk grande já existente), `git diff --check` verde.

## Roteiro do autor

1. Embarcar em Marte e, na cabine, escolher "Patrulha · Mutante grande" e quantidade 1. Decolar: só uma
   aranha deve aparecer, patrulhando; aproximar-se para ver a investida sozinha.
2. Repetir com "Mutante pequeno · 5" (cerco do bando) e "Patrol grande · 3".
3. Na vitória ou na derrota, trocar o tipo/quantidade e usar "Reiniciar encontro": a escolha vale.
4. Voltar a "Hordas": as 4 hordas seguem como antes.

## Pendências

- Base `72b5b00` não inclui `7e67128` do Codex (marcha estável e glitch da aranha); juntar as duas linhas
  antes da consolidação. Conflitos prováveis só em `simulation.ts`.
- Sem push nem merge.
