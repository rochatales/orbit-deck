# Três prédios da colônia · S6.12

Fontes copiadas sem alterar de `orbit_deck_buildings2` do autor. Os seis hashes
completos estão em `notas/fontes.json`. Nenhuma exportação nova: os três GLBs
runtime são cópias byte a byte; os `.blend` foram abertos só para leitura no
Blender 5.1.1. Objetos COL são empties; o tamanho de desenho 0,2 não representa
a caixa de colisão. A escala codifica a meia extensão, coerente com paredes e
móveis; o runtime usa cuboides orientados, jamais malha.

Na raiz da worktree:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python art-source/predios-colonia-v001/scripts/revisar-fontes.py
node art-source/predios-colonia-v001/scripts/manifesto.mjs
node art-source/predios-colonia-v001/scripts/planta.mjs
node scripts/arte/gerar-balizas-marte.mjs
node --test tests/colony-buildings.test.mjs
```

O manifesto usa GLTFLoader em Node para a geometria, animações e transformações;
as texturas só são ignoradas na leitura técnica do teste, não nos assets.
Portas são pivôs articulados com clipes de abrir/fechar, teto separado e piso
na cota zero. O runtime amostra os clipes Open para frente e para trás,
com o mesmo curso exponencial/áudio das portas normais atuais.

A planta e o roteiro de teste estão em `docs/handoffs/s6.12-predios-colonia.md`.
Aceite visual exclusivamente do autor no servidor.
