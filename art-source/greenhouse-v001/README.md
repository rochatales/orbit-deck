# Greenhouse v001 — OFFLINE / ONLINE

Estufa modular da Colônia de Marte, centro `(14; 22,5)`, 11 × 7 m no eixo leste–oeste e entrada a oeste, conforme escolha do autor. Referência: `Greenhouse_concept01.jpg` fornecida na tarefa. Blender 5.1.1; coordenadas de exportação já são as do jogo.

## Fontes e exportação

- `blend/greenhouse_v001.blend`: fonte independente, OFFLINE inicial. Texto interno `alternar_estado.py`: altere `ONLINE = False` para `True` e execute para inspecionar ONLINE.
- `scripts/build.py`: construção reproduzível. Não lê nem salva a sessão gráfica do Blender.
- `../../src/assets/greenhouse/greenhouse-v001.glb` e manifesto: runtime separado da colônia. O glTF não guarda objetos ocultos; use `estado_inicial` e `estado_operacao` por `id_estavel`.
- `../mars-masterplan-v007/blend/mars_colony_masterplan_v007_greenhouse.blend`: montagem contextual com os outros módulos e ARES. Fonte anterior preservada; nova montagem salva noutro arquivo.

Comandos a partir da raiz da worktree:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-source/greenhouse-v001/scripts/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-source/mars-masterplan-v007/scripts/build.py
node scripts/validate-greenhouse-geometry.mjs
node scripts/validate-masterplan-paths.mjs
node scripts/validate-masterplan-surfaces.mjs
node scripts/measure-greenhouse-runtime.mjs
npm test
npm run build
git diff --check
```

## Contrato

55 peças semânticas, 51.056 triângulos, GLB de 2.589.472 bytes; 5 pórticos, 4 vãos, 8 cubas inferiores, 4 bandejas superiores e 8 calhas com dois difusores cada. Componentes agrupados por função para limitar draw calls, com slots próprios para os materiais dinâmicos. Folhagem, gelo/condensação e irrigação são ONLINE; tanque/bomba secos ficam visíveis nos dois estados e seu colisor é constante. As quatro bandejas superiores são distribuídas alternadamente entre os lados.

O estado inicial é OFFLINE. O jogo recebe quatro luzes locais de cultivo explícitas; não importa luzes do GLB. O modo de prévia `?greenhousePreview` oferece botões para comparação; não cria missão, desbloqueio, persistência ou nova tecla de interação.

`TET_Estufa` controla cobertura, vidros do teto e `TET_Estufa_GrowLights` ao entrar no ambiente. Paredes, vidros laterais, porta, canteiros e plantas permanecem. As luminárias e suas luzes apagam com o corte; não ficam suspensas. Colisores: cinco caixas de paredes, duas de canteiros e uma de tanque, sempre externos à malha visual.

As zonas externas abertas e os materiais/cores dos tiles anteriores são mantidos; a implantação acrescenta piso de serviço ao norte/oeste para preservar o acesso à área de construção leste, e ao sul para o tanque. Nenhum túnel foi recolocado.

## Evidências

`notas/auditoria-geometria.json`: auditoria de todos os estados, inclusive malhas ocultas e faces opostas. Tolerância de plano 0,01 mm e área acumulada mínima de 10 mm² por par de peças. Zero pares coplanares de área positiva acima dessa tolerância; 273 interfaces verificadas (39 vidros × 7 conjuntos estruturais), folga mínima aproximada de 10 mm.

`notas/qa-runtime.json`: verificações de estado e entrada real W/S no navegador, oito rotações, EDEN, viagem e pausa, sem screenshots ou revisão de concepção visual. `notas/custo-runtime.json`: microensaio de CPU em Node, não benchmark de GPU. `notas/exportacao.json` e `notas/preservacao.json`: contagens, tamanho e hashes.

A aparência e a jogabilidade continuam aguardando avaliação do autor. Handoff: `docs/handoffs/s6.12-greenhouse-estados.md` na raiz do repositório.
