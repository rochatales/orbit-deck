# Varredura de posições/alturas do foguete (analítico, sem Blender).
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import composicao_preliminar as cp  # noqa: E402

res = []
for H in (13.0, 17.0):
    cp.ALTURA_FOGUETE = H
    cp.ALTURA_TORRE = H * 0.75
    for cx in (-9, -6, -4.5, 0, 4.5, 6, 9, 11.5):
        for cz in (34.0, 36.6, 38.5, 41.0):
            if -7 < cx < 7 and 29 <= cz <= 38 and abs(cx) < 2.6:
                pass
            for eixo in ('x', 'z'):
                r = cp.cenario(cx, cz, cp.torres(cx, cz, eixo))
                pas = r['passagem/desembarque']
                res.append({'H': H, 'cx': cx, 'cz': cz, 'torres': eixo, 'passagem_SE': pas['SE'],
                            'passagem_max': max(pas.values()), 'passagem_media': round(sum(pas.values()) / 8, 1),
                            'deck_media': round(sum(r['deck_livre'].values()) / 8, 1),
                            'sul_media': round(sum(r['caminho_sul'].values()) / 8, 1)})
res.sort(key=lambda d: (d['passagem_SE'], d['passagem_media'] + 0.5 * d['deck_media'] + 0.3 * d['sul_media']))
for d in res[:14]:
    print(d)
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'notas', 'varredura_posicoes.json'), 'w'), indent=0)
