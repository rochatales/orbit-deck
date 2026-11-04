# Facão — fontes e pipeline v001

Fontes do autor copiadas sem alterações em `fontes/`; SHA-256 completo e caminho
original em `notas/fontes-v001.json`. FBX do modelo é alternativa preservada;
o runtime deriva do GLB. Nenhum arquivo da pasta do autor foi movido/apagado.

A partir da raiz do projeto, Blender 5.1.1 e dependências do lockfile:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/armas/facao/scripts/preparar_facao.py
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P art-source/armas/facao/scripts/exportar_arma.py
cp art-source/armas/facao/export/explorador-facao-v001.glb src/assets/characters/player/explorador-facao-v001.glb
cp art-source/armas/facao/export/facao-v001.glb src/assets/weapons/facao-v001.glb
cp art-source/armas/facao/export/facao-icon-v001.png src/assets/ui/facao-icon-v001.png
node art-source/armas/facao/scripts/medir_encaixe.mjs
```

Primeiro script depende do Idle e das notas v009 já versionados em
`art-source/personagens/explorador-astronauta/`. Confere o bind dos 57 ossos,
conserva escala/origem/eixos, neutraliza Hips horizontal e mede passada. Não
reexporta nem modifica o GLB aprovado do jogador. O complemento carrega só as
animações no mixer do avatar existente; sua malha sem texturas não é montada.
Todos os arquivos de origem são somente leitura para os scripts.

Clipes v002 (combo, giro e morte com espada) e tabelas do runtime:
`scripts/preparar_espada.py` e `scripts/medir_arcos.mjs`. Estudo e comandos em
`docs/handoffs/s6.2-luta-espada.md`. `Machete_Slash` ficou só como histórico.

`Machete_Block` é exportado para rastreabilidade, mas excluído do carregamento
das ações em runtime: bloqueio foi explicitamente adiado pelo autor.

Segundo script conserva PBR dielétrico, adiciona marcadores de pega e produz
ícone do próprio modelo em fundo transparente. A lâmina da fonte aponta **−Y**
em glTF, o cabo fica em **+Y**. Originais não são regravados. Não há colisor de
malha. `notas/encaixe-v001.json` contém transform e ensaio da pega dinâmica/IK
esquerda, sem escala variável da arma. Aceite visual é do autor.
