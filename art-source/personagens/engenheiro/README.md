# Engenheiro · v001 · 06/11/2026

Fontes fornecidas pelo autor em `Personagens/3D`. Os oito arquivos em `fontes/`
são cópias integrais; os SHA-256 estão em `notas/export-v001.json`. Nenhum original
foi movido ou modificado. O FBX e GLB chamados Low Poly Astronaut não têm rig;
os seis FBX de animação já incluem o mesmo astronauta branco com 33 ossos.
`Acknowledging.fbx` fornece a malha e o rig canônicos; as matrizes de bind dos
outros cinco foram comparadas antes de copiar as poses.

## Reprodução

Blender 5.1.1, sem dependências novas do jogo:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
  -P art-source/personagens/engenheiro/scripts/preparar.py -- --render
```

`--ingest <pasta>` permite copiar as oito fontes de uma pasta externa. Se a cópia
já existir e o hash divergir, o script interrompe sem sobrescrever a fonte.
O script regrava apenas os derivados desta versão em `export/`, `texturas/v001/`
e `notas/`. Use outra versão antes de fazer novas alterações artísticas.
`scripts/inspecionar.py -- --source <pasta>` inspeciona FBX/GLB; sem argumento usa
`fontes/`. Para atualizar o jogo, copie o GLB derivado para
`src/assets/characters/npcs/engenheiro-v001.glb` e confira o hash no manifesto.

## Derivação

- Altura em pé: 2,23 m, compatível com o explorador. 3.214 triângulos, 33 ossos,
  dez clipes, GLB de 3.381.008 bytes. Sem redução de topologia nesta versão.
- Root motion horizontal removido das cópias; giro do esbarrão e movimento
  vertical preservados. Apoio no chão corrigido apenas nos derivados.
- `StartWalking` mantém a arrancada; `Walk` recorta os frames 45–87 do mesmo
  FBX para repetição, com velocidade medida de 0,789572 m/s. Erro agregado de
  pose dos quatro pontos dos pés na emenda: 0,06495 m; sensação final e sliding
  precisam de aceite do autor.
- `CrouchDown` inverte `Crouch To Stand`; `Crouch` repete em ida/volta seu começo.
  `Idle` segura a pose inicial de Acknowledging. Os demais clipes mantêm as poses
  fornecidas. Não há clipe próprio para sentar/levantar do banco: blend provisório.
- Pesos limitados a quatro influências e normalizados para o shader atual.
  Peso descartado: máximo 3,49%, média 0,0205% por vértice. Teste de articulações
  amostra o GLB, sem substituir avaliação artística.
- Texturas derivadas de 2048 para 1024 px, embutidas no GLB; materiais do traje
  com metalness 0 e roughness 0,8. UV e fontes intactas.
- `.blend` preserva a versão editável; `notas/renders/` contém seis poses de
  estúdio para inspeção, sem representar aprovação da iluminação em Marte.

SHA-256 do GLB de runtime/export:
`31e83cce148ce61b5a52e9f23cdd4094ad42509482f1b4f42c24fbb2be99786a`.

Comportamento, validação e roteiro: [handoff](../../../docs/handoffs/s5.1-engenheiro-colonia.md).
