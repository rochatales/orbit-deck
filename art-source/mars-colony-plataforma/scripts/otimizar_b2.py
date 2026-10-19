# Busca analítica (sem Blender) para o refinamento da variante B (v005).
# Modelo: foguete = cilindro central + 2 aceleradores alinhados ao eixo baia→foguete (giro do conjunto);
# torres = caixas atrás do foguete, a ±θ do eixo. Câmera do jogo: 36,4°, 8 orientações + varredura contínua.
#   python3 art-source/mars-colony-plataforma/scripts/otimizar_b2.py
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import composicao_preliminar as cp  # noqa: E402

EL = cp.EL
OITO = list(cp.ANG.items())
JOGADOR_H = (0.3, 0.9, 1.25)
TRAJETO = [(0.0, 19.0 + 0.5 * i) for i in range(22)] + [(0.0, 30.0 + 0.5 * i) for i in range(7)]   # eclusa → desembarque → baia
BAIA = [(x, z) for x in (-0.8, 0, 0.8) for z in (31, 32, 33, 34)]
FAIXA_SUL = [(x, z) for x in (-6, -4.5, -3, 3, 4.5, 6) for z in (35.5, 37.0)]
BAY = (0.0, 33.0)


def conjunto(cx, cz, H, theta, dT=3.4):
    ux, uz = cx - BAY[0], cz - BAY[1]
    n = math.hypot(ux, uz)
    ux, uz = ux / n, uz / n
    cil = [(cx, cz, 1.2, H)] + [(cx + s * 1.75 * ux, cz + s * 1.75 * uz, 0.5, H * 0.55) for s in (-1, 1)]
    tor = []
    for s in (-1, 1):
        a = math.atan2(uz, ux) + s * math.radians(theta)
        tx, tz = cx + dT * math.cos(a), cz + dT * math.sin(a)
        tor.append((tx - 0.7, tx + 0.7, tz - 0.7, tz + 0.7, H * 0.82))
    return cil, tor


def oculto(px, pz, py, ang, cil, tor):
    dx, dz, dy = math.cos(ang) * math.cos(EL), math.sin(ang) * math.cos(EL), math.sin(EL)
    return any(cp.hit_cyl(px, pz, py, dx, dz, dy, c[0], c[1], c[2], c[3]) for c in cil) or \
        any(cp.hit_box(px, pz, py, dx, dz, dy, b) for b in tor)


def avaliar(cx, cz, H, theta):
    cil, tor = conjunto(cx, cz, H, theta)
    jog = max(sum(1 for h in JOGADOR_H if oculto(x, z, h, a, cil, tor)) for (x, z) in TRAJETO for _, a in OITO)
    baia = {n: round(100 * sum(1 for (x, z) in BAIA if oculto(x, z, 1.0, a, cil, tor)) / len(BAIA)) for n, a in OITO}
    sul = {n: round(100 * sum(1 for (x, z) in FAIXA_SUL if oculto(x, z, 1.0, a, cil, tor)) / len(FAIXA_SUL)) for n, a in OITO}
    cont = 0
    for k in range(72):   # varredura contínua de 5° em 5°: ângulos em que o corpo do jogador some em algum ponto do trajeto
        a = math.radians(k * 5)
        if any(oculto(x, z, 0.9, a, cil, tor) for (x, z) in TRAJETO):
            cont += 1
    return {'cx': cx, 'cz': cz, 'H': H, 'theta': theta, 'jogador_pontos_ocultos_max': jog,
            'baia_max': max(baia.values()), 'baia': baia, 'sul_max': max(sul.values()), 'sul': sul,
            'angulos_continuos_com_jogador_oculto_de_72': cont,
            'dist_borda_deck_m': round(cz - 1.85 - 38.0, 2)}


res = []
for cx in (-3.5, -4.0, -4.5, -5.0, -5.5, -6.0):
    for cz in (39.6, 40.2, 40.8, 41.5):
        for H in (11.0, 12.0, 13.0, 14.0, 15.0):
            for theta in (35, 50, 65, 90):
                res.append(avaliar(cx, cz, H, theta))
ok = [r for r in res if r['jogador_pontos_ocultos_max'] == 0]
ok.sort(key=lambda r: (r['baia_max'] + 0.6 * r['sul_max'] - 4 * r['H'] + 3 * max(0, r['dist_borda_deck_m'])))
for r in ok[:12]:
    print({k: v for k, v in r.items() if k not in ('baia', 'sul')})
print('v004 B (-5;41) H17.8 torres em x:', {k: v for k, v in avaliar(-5, 41, 17.8, 90).items() if k not in ('baia', 'sul')})
json.dump({'validos': ok[:40], 'total': len(res)}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'notas', 'otimizacao_b2.json'), 'w'), indent=1)
