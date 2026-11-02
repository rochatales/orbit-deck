# Shanghai — props novos, 02/11/2026

Fontes GLB do autor copiadas intactas em `fontes/`. SHA-256 completo e caminhos
originais: `notas/fontes.json`. Cópias de runtime em `src/assets/props/shanghai/`.

```sh
node art-source/shanghai-props-v002/scripts/preparar.mjs
npm test
npm run build
```

O script só lê/conferre os originais e grava cópias próprias. Não abre Blender,
não reexporta assets e não modifica o GLB/layout da fase 01. A tabela das 36 peças
dos carros antigos é extraída dos dados originais para retirar somente os seus
432 triângulos dos lotes de runtime, mantendo prédios, piso e fonte intactos.

Referência do autor e marcações: `notas/referencia.json`. Posições finais em
`src/game/shanghai/propPlacements.ts` e `src/game/props/supplyCrate.ts`.
Planta e relatório: `docs/handoffs/s6.13-shanghai-props/`.

- Carro: escala uniforme 3,8415338027; 3,8 × 2,6513 × 1,8437 m (C × L × A).
- Armário: escala 1; casco/base em colisor simples fixo 1,8 × 2,0 × 2,09 m,
  apoiado na altura do piso. Porta usa a animação autorada, rebaseada em runtime
  para iniciar fechada (fonte vem a 62°) e abrir até 108°. Curva CUBICSPLINE é
  amostrada corretamente; nenhum byte da fonte é alterado.
- Kit: largura 0,6 m, flutuação e anel vermelho no piso, sem giro vertical;
  sem colisor de malha e sem ocupar peso na mochila. Cura automática de 50,
  como o coração anterior.

Aceite visual/jogabilidade é do autor; nenhum teste de jogo pelo agente.
