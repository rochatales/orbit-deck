# Hangar v002 — estudo de implantação / Parada A

Fonte e exportação v001 preservadas. Variante gerada com portas norte/leste de
2,20 m, quatro folhas próprias e teto separado; sem instalação no runtime.

Procedimento, hashes completos, dimensões, testes e limites:
`docs/handoffs/s6.12-hangar-colonia.md`, na raiz do projeto.

Reprodução:

```bash
blender -b --factory-startup --python art-source/hangar/scripts/build_hangar.py -- --v002
node art-source/hangar/scripts/medir_encaixe.mjs
blender -b --factory-startup --python art-source/hangar/scripts/validate_v002.py
blender -b --factory-startup --python art-source/hangar/scripts/render_v002.py
python3 art-source/hangar/scripts/planta_encaixe.py
```

`build_hangar_v001.py` é arquivo de referência do builder original; não é o
comando de reprodução da variante. O builder ativo exige `--v002` e salva só
nos caminhos v002, validando os hashes dos originais antes/depois.

O autor avalia na Parada A o alongamento do conector leste (45 cm no eixo), o
prolongamento da rampa (15,5 cm) e as adaptações de equipamento para a porta.
Folga da ponta da rampa à passarela do deck: 4,85 m. Aprovação do autor pendente.
