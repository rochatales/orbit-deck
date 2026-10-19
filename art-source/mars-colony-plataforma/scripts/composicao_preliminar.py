# Teste analítico (sem Blender) de oclusão para posições candidatas do foguete + torres.
# Coordenadas do jogo (x, z); câmera do jogo: 36,4° de elevação, 8 orientações.
#   python3 art-source/mars-colony-plataforma/scripts/composicao_preliminar.py
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
EL = math.atan2(13.55, 18.38)
ANG = {'L': 0, 'SE': math.pi / 4, 'S': math.pi / 2, 'SO': 3 * math.pi / 4, 'O': math.pi,
       'NO': 5 * math.pi / 4, 'N': 3 * math.pi / 2, 'NE': 7 * math.pi / 4}
ALTURA_FOGUETE = 17.0
ALTURA_TORRE = 13.0


def hit_cyl(px, pz, py, dx, dz, dy, cx, cz, r, h):
    ox, oz = px - cx, pz - cz
    a = dx * dx + dz * dz
    b = 2 * (ox * dx + oz * dz)
    c = ox * ox + oz * oz - r * r
    disc = b * b - 4 * a * c
    if disc < 0:
        return False
    for t in ((-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)):
        if t > 0 and 0 <= py + t * dy <= h:
            return True
    return False


def hit_box(px, pz, py, dx, dz, dy, b):
    x0, x1, z0, z1, h = b
    tmin, tmax = 0.0, 1e9
    for p, d, lo, hi in ((px, dx, x0, x1), (pz, dz, z0, z1), (py, dy, 0, h)):
        if abs(d) < 1e-9:
            if p < lo or p > hi:
                return False
        else:
            t1, t2 = (lo - p) / d, (hi - p) / d
            tmin, tmax = max(tmin, min(t1, t2)), min(tmax, max(t1, t2))
    return tmin <= tmax


def amostras():
    return {
        'passagem/desembarque': [(x, 25 + 0.5 * i) for i in range(13) for x in (-1.2, 0, 1.2)],
        'deck_livre': [(x, z) for x in (-6, -4, 4, 6) for z in (30, 32, 34, 36, 37.5)],
        'caminho_sul': [(x, z) for x in (-6, -3, 0, 3, 6) for z in (20, 22.5, 25, 27)],
        'conector_pavilhao': [(7.25, z) for z in (17, 19, 21, 23, 25)] + [(8.5, 22.5)],
        'caminho_oeste': [(x, 21.5) for x in (-14, -11, -8, -5)],
    }


def torres(cx, cz, eixo='x', d=3.6):
    if eixo == 'x':
        return [(cx + s * d - 0.7, cx + s * d + 0.7, cz - 0.7, cz + 0.7, ALTURA_TORRE) for s in (-1, 1)]
    return [(cx - 0.7, cx + 0.7, cz + s * d - 0.7, cz + s * d + 0.7, ALTURA_TORRE) for s in (-1, 1)]


def cenario(cx, cz, tr):
    res = {}
    for area, ps in amostras().items():
        res[area] = {}
        for an, a in ANG.items():
            dx, dz, dy = math.cos(a) * math.cos(EL), math.sin(a) * math.cos(EL), math.sin(EL)
            n = sum(1 for (x, z) in ps if hit_cyl(x, z, 1.0, dx, dz, dy, cx, cz, 2.0, ALTURA_FOGUETE)
                    or any(hit_box(x, z, 1.0, dx, dz, dy, b) for b in tr))
            res[area][an] = round(100 * n / len(ps))
    return res


CANDS = {
    'A_central_fundo_deck (0; 36,6)': (0, 36.6, torres(0, 36.6)),
    'B_leste_fora_deck (11,5; 34,5)': (11.5, 34.5, torres(11.5, 34.5, 'z')),
    'C_sudoeste_tanques (-12; 37,5)': (-12, 37.5, torres(-12, 37.5)),
    'D_sul_alem_limite (0; 42,5)': (0, 42.5, torres(0, 42.5)),
}
out = {}
for k, (cx, cz, t) in CANDS.items():
    r = cenario(cx, cz, t)
    out[k] = r
    print(k, 'média %:', {a: round(sum(v.values()) / 8) for a, v in r.items()})
    print('   passagem/desembarque:', r['passagem/desembarque'])
json.dump(out, open(os.path.join(HERE, '..', 'notas', 'composicao_preliminar.json'), 'w'), indent=1, ensure_ascii=False)
