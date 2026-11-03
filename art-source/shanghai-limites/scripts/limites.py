"""S6.3 · Limites de Shanghai: fonte matemática refinada (blend orgânico e game design).

Convenção do jogo:
- X / Z no plano, Y é altura (metros).
- Distrito jogável: x ∈ [-51, 51], z ∈ [-54, 54].
- Topo da imagem = +Z (z=54).
- Base da imagem = -Z (z=-54).
- Esquerda = -X (x=-51).
- Direita = +X (x=51).
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/shanghai-limites'
RUNTIME = ROOT / 'src/assets/shanghai-limites'
VERSION = 's6.3-limites-v002'

BOUNDS = dict(minX=-51.0, maxX=51.0, minZ=-54.0, maxZ=54.0)
HALF_X, HALF_Z = 51.0, 54.0
CAMERA_SLOPE = 13.0 / 18.38
TERRAIN_SLOPE = 0.45
OUTER = 16.0
CELL = 0.8                         # grade mais densa (0.8m) para silhueta mais orgânica

# Morros das esquinas frontais (z=-54)
CORNER_RADIUS = 3.2
HILL_MAX_HEIGHT = 2.6

FLOOR = 3.3
RUINS = [
    # Fundo oeste:
    dict(id='Ruina_Fundo_Oeste', x=-57.0, z=59.0, w=10.0, d=10.0, floors=7, material='azul', seed=71, low=(-1, 1)),
    # Fundo leste:
    dict(id='Ruina_Fundo_Leste', x=57.0, z=59.0, w=10.0, d=10.0, floors=6, material='terracota', seed=72, low=(1, 1)),
    # Frente centro:
    dict(id='Ruina_Frente_Centro', x=0.0, z=-61.5, w=12.0, d=11.0, floors=7, material='bege', seed=73, low=(0, -1)),
]


def _hash(ix, iz, seed):
    h = (ix * 374761393 + iz * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 0xFFFF * 2.0 - 1.0


def noise(x, z, seed=0, scale=4.0):
    total, amp, norm = 0.0, 1.0, 0.0
    for octave in range(2):
        fx, fz = x / scale, z / scale
        ix, iz = math.floor(fx), math.floor(fz)
        tx, tz = fx - ix, fz - iz
        tx, tz = tx * tx * (3 - 2 * tx), tz * tz * (3 - 2 * tz)
        s = seed + octave * 101
        a = _hash(ix, iz, s) + (_hash(ix + 1, iz, s) - _hash(ix, iz, s)) * tx
        b = _hash(ix, iz + 1, s) + (_hash(ix + 1, iz + 1, s) - _hash(ix, iz + 1, s)) * tx
        total += (a + (b - a) * tz) * amp
        norm += amp; amp *= 0.5; scale *= 0.5
    return total / norm


def outside_raw(x, z):
    ex, ez = abs(x) - HALF_X, abs(z) - HALF_Z
    if ex > 0 and ez > 0:
        return math.hypot(ex, ez)
    return max(ex, ez)


def border_wave(x, z):
    """Perturbação orgânica da borda para quebrar a linha reta do asfalto."""
    w1 = noise(x, z, seed=83, scale=7.0) * 1.3
    w2 = noise(x, z, seed=157, scale=3.0) * 0.5
    wave = w1 + w2

    # Perto dos pontos de loot nas quinas (48, -51) e (48, 51), amortecer para não invadir o loot
    if abs(x) > 45.0 and abs(z) > 48.0:
        wave = min(wave, 0.3)
    return wave


def outside_organic(x, z):
    """Distância signed com contorno orgânico (valores negativos invadem levemente o asfalto)."""
    return outside_raw(x, z) - border_wave(x, z)


def corner_mound_d(x, z):
    """Distância radial aos cantos frontais (-51, -54) e (+51, -54)."""
    if z > -48.0:
        return None
    d1 = math.hypot(x - (-HALF_X), z - (-HALF_Z))
    d2 = math.hypot(x - HALF_X, z - (-HALF_Z))
    return min(d1, d2)


def height(x, z):
    """Altura da superfície do terreno de limites."""
    e_org = outside_organic(x, z)
    e_raw = outside_raw(x, z)

    # Se estiver muito dentro do asfalto (além da onda orgânica de avanço), não gera terreno
    if e_org < -0.2:
        return None

    # Berma contínua com subida gradual
    # Na franja de invasão sobre o asfalto (e_raw <= 0), a altura fica entre 0.02 e 0.16m
    if e_raw <= 0:
        t = (border_wave(x, z) - (e_raw)) / max(0.1, border_wave(x, z) + 0.2)
        h = max(0.015, t * 0.16)
        h += 0.02 * noise(x, z, 55, 1.5)
        best = h
    else:
        # Fora do distrito: sobe de 0.16m até 4.5m
        base = 0.16 + 4.2 * (1.0 - math.exp(-e_raw / 8.0))
        if e_raw > OUTER - 3.0:
            t = min(1.0, (e_raw - (OUTER - 3.0)) / 3.0)
            base = base * (1.0 - t) + (-1.5) * t
        amp = min(1.3, 0.2 * e_raw)
        best = base + amp * noise(x, z, 11, 4.0)

    # Morros nos cantos frontais
    cmd = corner_mound_d(x, z)
    if cmd is not None:
        if e_raw <= 0:
            if cmd <= CORNER_RADIUS:
                t = (CORNER_RADIUS - cmd) / CORNER_RADIUS
                h_c = t * 0.55 + 0.04 * noise(x, z, 23, 1.8)
                best = h_c if best is None else max(best, h_c)
        else:
            if cmd < 13.0:
                h_mound = HILL_MAX_HEIGHT * math.exp(-cmd / 6.5) + 0.35 * noise(x, z, 37, 2.5)
                best = h_mound if best is None else max(best, h_mound)

    return best


def border_colliders():
    out = []
    out.append(dict(id='COL_Limite_Norte', minX=-HALF_X, maxX=HALF_X, minZ=-HALF_Z - 3.0, maxZ=-HALF_Z, minY=0.0, maxY=4.0))
    out.append(dict(id='COL_Limite_Sul', minX=-HALF_X, maxX=HALF_X, minZ=HALF_Z, maxZ=HALF_Z + 3.0, minY=0.0, maxY=4.0))
    out.append(dict(id='COL_Limite_Oeste', minX=-HALF_X - 3.0, maxX=-HALF_X, minZ=-HALF_Z, maxZ=HALF_Z, minY=0.0, maxY=4.0))
    out.append(dict(id='COL_Limite_Leste', minX=HALF_X, maxX=HALF_X + 3.0, minZ=-HALF_Z, maxZ=HALF_Z, minY=0.0, maxY=4.0))
    return out


def runtime_data():
    ruins = [
        dict(
            id=r['id'],
            minX=round(r['x'] - r['w'] / 2, 2),
            maxX=round(r['x'] + r['w'] / 2, 2),
            minZ=round(r['z'] - r['d'] / 2, 2),
            maxZ=round(r['z'] + r['d'] / 2, 2),
            height=round(r['floors'] * FLOOR, 2)
        )
        for r in RUINS
    ]
    return dict(
        version=VERSION,
        bounds=BOUNDS,
        cameraSlope=round(CAMERA_SLOPE, 6),
        terrainSlope=TERRAIN_SLOPE,
        outerRing=OUTER,
        colliders=border_colliders(),
        ruins=ruins
    )


if __name__ == '__main__':
    RUNTIME.mkdir(parents=True, exist_ok=True)
    data = runtime_data()
    (RUNTIME / 'limites.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f"Limites v002 gerados: {len(data['colliders'])} colisores, {len(data['ruins'])} ruínas")
