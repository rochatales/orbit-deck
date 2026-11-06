**Sem achados.** `node --test tests/first-expedition.test.mjs` passou 13/13; não abri os renders regenerados.

- **Razão:** `1.6416853033 / 1.5570486839` iguala a espessura mundial, porque `raio × (jogador / Engenheiro) × Engenheiro = raio × jogador`. O teste compara filete e halo nos dois GLBs reais, com tolerância de `1e-7`.
- **Medida do jogador:** o teste mede `player.scene` cru, e isso vale para o runtime: o astronauta usa `scale: 1` (`src/characters/characterAssetConfig.ts:52`), e não encontrei escala em `PlayerModel.tsx`.
- **Faixa do jogador:** continua igual, porque `ColonyPlayerVisor.tsx:7` não passa `points` nem `radiusScale`, então valem os pontos padrão e o fator 1. `colonyVisorAttachment.ts` não mudou nesse diff.
- **Descarte:** não mudou, porque o fator só altera o raio das geometrias. O teste segue exigindo 4 eventos de `dispose` e `parent` nulo após o `rig.dispose()` duplo.

O aceite visual da faixa continua com o autor. Não editei nada nem rodei o script colado, então `/tmp/s3-2-review-visor.jsonl` não foi gerado.
