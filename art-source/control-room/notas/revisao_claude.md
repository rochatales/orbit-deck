# Revisão técnica — confirmações

## Correções principais

Os seis pontos foram resolvidos. Conferi só lendo `art-source/control-room/scripts/build_control_room.py` (o script fica nesse caminho, não em `scripts/`), `tests/control-room-asset.test.mjs` e `notas/roundtrip.json`. Não rodei nada.

- **(B) Resolvido.** O `WallConsole` agora vai de 0,15 a 1,15 no Blender; com o recuo de −0,15, a base fica em 0. Os `MonitorSupport` (1,11–1,25) entram no tampo e também na borda de baixo das telas inclinadas (cerca de 1,20), então nada fica solto.
- **(C) Resolvido.** O colisor do rack vai de 2,08 a 3,06 em Y no Blender e cobre os trilhos (frente em 2,11), as gavetas e a telemetria. Na vertical vai de 0 a 1,94 e na largura (meia-largura 0,40) cobre os 0,37 do móvel.
- **(D) Resolvido.** O teste novo confere três coisas:
  - a base em Y = 0 de console, rack e consoles N;
  - o envelope completo nos três eixos, com os mínimos e máximos de cada um;
  - a folga entre as folhas das portas S e L, que pelas contas é 0,015 e passa do mínimo de 0,014.

  Pelas contas, o colisor do console (Y de 0 a 1,14; profundidade de −0,83 a 0,77 no Blender) cobre a mesa inclinada e os controles físicos.
- **(A) Resolvido.** As letras ficam dentro das placas: começam em 3,12, que fica entre 3,04 e 3,36, e cabem na largura. Sobra só um detalhe de 1 mm: a face de trás do texto fica em −2,996 e a frente da placa em −2,995. As letras ficam 1 mm à frente sem encostar. Não aparece em jogo e evita que as superfícies pisquem uma sobre a outra.
- **(E) Resolvido.** A faixa de status S entra 4,5 mm no `PortalTop` (−3,3855 contra −3,39) e fica dentro da área plana fora do chanfro. A L faz o mesmo (3,6255 contra 3,63).
- **(F) Resolvido.** `hide_set` e `hide_render=True` acontecem antes de salvar o `.blend` (linhas 252–254). Só depois é que todos os objetos voltam a `hide_render=False` para a exportação (linha 255).

O `roundtrip.json` está coerente: 26 objetos, 8176 triângulos, erro 0 e desvio de normal de 0,031°. Os hashes só se confirmam rodando `npm test`, o que não fiz.

**Único achado restante (menor, não impede o candidato):** os `PeripheralKeys` (linha 200) ficam de 2,08 a 2,30 em Y. O tampo do `WallConsole` começa justamente em 2,30, então o teclado é uma bandeja de 22 cm em balanço, presa só pela aresta. Se não for intencional, dá para recuar o centro para cerca de 2,36 ou pôr um suporte embaixo.

A abertura das portas continua fora deste candidato, como está documentado.


## Apoio final dos teclados

Sim, o suporte está resolvido e o conjunto continua dentro do envelope. Conferi por leitura do script, do teste e do manifesto exportado; não rodei nada.

**Suporte** (`build_control_room.py:195-201`, medidas do Blender)
- O WallConsole tem a frente em Y 2.30 e o topo em Z 1.15.
- A KeyboardTray vai de Y 2.06 a 2.34 e de Z 1.105 a 1.145. Ela entra 4 cm na frente do gabinete e fica abaixo do topo dele, então funciona como um balanço engastado.
- As PeripheralKeys vão de Y 2.08 a 2.30 e de Z 1.145 a 1.175. A base das teclas encosta exatamente no topo da bandeja (1.145) e a planta delas cabe inteira na bandeja (0,49 × 0,22 dentro de 0,55 × 0,28). Não ficou nada flutuando.
- Um detalhe, sem impacto: o chanfro de 0,045 da aresta frontal superior do gabinete cai justamente na faixa onde a bandeja entra. O sólido de fato se cruza num triângulo na parte de trás e de baixo da bandeja. O topo dela passa pela linha do chanfro em Y 2.34, então o vão fica escondido e o apoio continua de verdade.

**Envelope** (`col('Consoles_N',(1.20,2.55,.92),(1.2,.50,.77))`)
- Vai de Y 2.05 a 3.05 no Blender, o que no jogo dá Z −13.55 a −12.55. A frente da bandeja está em 2.06, então sobra 1 cm.
- O manifesto foi regenerado com a bandeja: `PROP_Control_Consoles_N` tem maxZ −12.56, minZ −13.5, X de 0.05 a 2.35 e Y de 0 a 1.445. Tudo cabe no colisor (X de 0 a 2.4, Y de 0 a 1.54, Z de −13.55 a −12.55).
- O teste de `tests/control-room-asset.test.mjs:89-97` cobre os seis lados com tolerância de 1e-5. Pelos números do manifesto, ele deve passar.
