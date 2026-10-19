# Ajuste fino da variante B (analítico): baia, zona de embarque e deck nas 8 orientações.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import composicao_preliminar as cp  # noqa: E402

cp.ALTURA_FOGUETE, cp.ALTURA_TORRE = 17.8, 14.8
AREAS = {'baia': [(x, z) for x in (-0.8, 0, 0.8) for z in (31, 32, 33, 34)],
         'zona': [(x, z) for x in (-1.5, 0, 1.5) for z in (27.5, 28.5, 29.5, 30.5, 31.5)],
         'deck': [(x, z) for x in (-6, -4.5, 4.5, 6) for z in (30, 32, 34, 36, 37.5)]}
for cx, cz in ((-5, 41), (-6.5, 42), (-7.5, 41.5), (-8, 43), (-6, 44), (-9.5, 42)):
    tr = cp.torres(cx, cz, 'x', 3.7)
    linha = []
    for area, ps in AREAS.items():
        pr = {}
        for an, a in cp.ANG.items():
            import math
            dx, dz, dy = math.cos(a) * math.cos(cp.EL), math.sin(a) * math.cos(cp.EL), math.sin(cp.EL)
            n = sum(1 for (x, z) in ps if cp.hit_cyl(x, z, 1.0, dx, dz, dy, cx, cz, 2.3, cp.ALTURA_FOGUETE)
                    or any(cp.hit_box(x, z, 1.0, dx, dz, dy, b) for b in tr))
            pr[an] = round(100 * n / len(ps))
        linha.append('%s max %d (%s) média %.0f' % (area, max(pr.values()), max(pr, key=pr.get), sum(pr.values()) / 8))
    print((cx, cz), ' | '.join(linha))
