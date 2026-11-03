"""S6.3 · Limites de Shanghai: fonte única da geometria e colisores (sem Blender).

Convenção do jogo:
- X / Z no plano, Y é altura (metros).
- Distrito jogável: x ∈ [-51, 51], z ∈ [-54, 54].
- Topo da imagem do autor = +Z (z=54).
- Base da imagem do autor = -Z (z=-54).
- Esquerda da imagem do autor = -X (x=-51).
- Direita da imagem do autor = +X (x=51).

Elementos da imagem (02/11/2026):
1. Borda contínua de escombros em todo o perímetro (berma irregular de entulho).
2. Duas esquinas do topo (fundo): x=-51, z=54 e x=51, z=54 com prédios altos em ruína e escombros.
3. Duas esquinas da base (frente): x=-51, z=-54 e x=51, z=-54 cobertas por morro baixo de escombros.
4. Meio da borda da base (frente): x=0, z=-54 com um prédio alto em ruína.
5. Nuvens em branco cobrindo bordas e suaves no centro do mapa.
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/shanghai-limites'
RUNTIME = ROOT / 'src/assets/shanghai-limites'
VERSION = 's6.3-limites-v001'

BOUNDS = dict(minX=-51.0, maxX=51.0, minZ=-54.0, maxZ=54.0)
HALF_X, HALF_Z = 51.0, 54.0
CAMERA_SLOPE = 13.0 / 18.38        # elevação ortográfica da câmera
TERRAIN_SLOPE = 0.45               # inclinação das bermas
OUTER = 16.0                       # anel externo em metros
CELL = 1.0                         # resolução da grade do terreno

# Cantos da base (frente: z=-54): morros baixos que cobrem a quina
CORNER_RADIUS = 2.2
HILL_MAX_HEIGHT = 2.4

# Prédios altos em ruína (todos fora do distrito jogável, com faces a >= 1m da borda)
FLOOR = 3.3
RUINS = [
    # Topo-esquerda (fundo):
    dict(id='Ruina_Fundo_Oeste', x=-57.0, z=59.0, w=10.0, d=10.0, floors=7, material='azul', seed=71, low=(-1, 1)),
    # Topo-direita (fundo):
    dict(id='Ruina_Fundo_Leste', x=57.0, z=59.0, w=10.0, d=10.0, floors=6, material='terracota', seed=72, low=(1, 1)),
    # Meio da borda da frente (base z=-54, x=0):
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


def outside(x, z):
    """Distância signed até o retângulo [-51, 51] x [-54, 54] (>=0 fora, <0 dentro)."""
    ex, ez = abs(x) - HALF_X, abs(z) - HALF_Z
    if ex > 0 and ez > 0:
        return math.hypot(ex, ez)
    return max(ex, ez)


def corner_mound_d(x, z):
    """Distância radial aos cantos frontais (-51, -54) e (+51, -54)."""
    if z > -50:
        return None
    d1 = math.hypot(x - (-HALF_X), z - (-HALF_Z))
    d2 = math.hypot(x - HALF_X, z - (-HALF_Z))
    return min(d1, d2)


def berm_height(e):
    if e < 0:
        return None
    base = 0.05 + 4.2 * (1.0 - math.exp(-e / 8.5))
    if e > OUTER - 3.0:
        t = min(1.0, (e - (OUTER - 3.0)) / 3.0)
        base = base * (1.0 - t) + (-1.5) * t
    return base


def height(x, z):
    """Altura da superfície do terreno de limites (None se for o asfalto interno)."""
    e = outside(x, z)
    best = None
    b = berm_height(e)
    if b is not None:
        amp = min(1.2, 0.16 * e)
        best = b + amp * noise(x, z, 11)

    cmd = corner_mound_d(x, z)
    if cmd is not None:
        if e <= 0:
            if cmd <= CORNER_RADIUS:
                t = (CORNER_RADIUS - cmd) / CORNER_RADIUS
                h = t * 0.45
                best = h if best is None else max(best, h)
        else:
            dist_from_corner = cmd
            if dist_from_corner < 12.0:
                h_mound = HILL_MAX_HEIGHT * math.exp(-dist_from_corner / 6.0) + 0.3 * noise(x, z, 37, 2.5)
                best = h_mound if best is None else max(best, h_mound)

    return best


def border_colliders():
    """Gera colisores estáticos apenas na berma externa / morros de canto (fora das rotas)."""
    out = []
    # 4 paredes externas que impedem sair do mapa pelo terreno íngreme (minY=0, maxY=4.0)
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
    print(f"Limites gerados: {len(data['colliders'])} colisores, {len(data['ruins'])} ruínas")
