# Três prédios da colônia · S6.12

Fontes copiadas sem alterar de `orbit_deck_buildings2` do autor. Os seis hashes
completos estão em `notas/fontes.json`. Na implantação inicial (`783eb44`), os GLBs runtime eram cópias byte a byte.
O ajuste de 03/11 gera variantes v002 em `export/` pelo script `padronizar.py`,
usando somente as cópias GLB e a Control Room ativa como referência. Os `.blend`
foram abertos só para leitura no Blender 5.1.1. Objetos COL são empties; o tamanho de desenho 0,2 não representa
a caixa de colisão. A escala codifica a meia extensão, coerente com paredes e
móveis; o runtime usa cuboides orientados, jamais malha.

Na raiz da worktree:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/revisar-fontes.py
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/padronizar.py
node art-source/predios-colonia-v001/scripts/manifesto.mjs
node art-source/predios-colonia-v001/scripts/planta.mjs
node scripts/arte/gerar-balizas-marte.mjs
node --test tests/colony-buildings.test.mjs
```

O manifesto usa GLTFLoader em Node para a geometria, animações e transformações;
as texturas só são ignoradas na leitura técnica do teste, não nos assets.
As variantes v002 trocam os pivôs por folhas deslizantes copiadas do kit
visual da Control Room, com COL filhos acompanhando a translação. Mantêm vão
de 1,70 m; folhas/portal têm o desenho, vidro grafite, faixa e balizas da
referência, adaptados à largura dos vãos. Teto separado e piso na cota zero. O runtime amostra os clipes Open para frente e para trás,
com o mesmo curso exponencial/áudio das portas normais atuais.

A planta e o roteiro de teste estão em `docs/handoffs/s6.12-predios-colonia.md`.
Aceite visual exclusivamente do autor no servidor.

Padronização v002: atlas real da Control Room nos pisos (tile 12), juntas
geométricas de 30 mm (tile 13), grade de mundo 1,25 × 1,50 m; letreiros com
placa creme/latão, texto grafite em BFont e nome próprio. Partes do portal
antigo são retiradas por componentes conexos; casca, COL estáticos, móveis e
fontes originais ficam preservados. Os novos hashes e a referência utilizada
estão em `notas/padronizacao-v002.json`. Só os três prédios novos foram alterados,
conforme resposta explícita do autor. A Cafeteria gira −90° no centro (11,5; 11,7).
