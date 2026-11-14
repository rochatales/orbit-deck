"""Level 02 · Rio de Janeiro · planta v0 em coordenadas do jogo (X/Z plano, Y altura, metros).

Fonte única da planta, no mesmo contrato de `art-source/shanghai-fase01/scripts/layout.py`.
Traduz o croqui do autor de 13/11/2026 (`referencias/croqui-autor-2026-11-13.webp`).
Só Python padrão: gera `export/layout.json`, duas pranchas SVG e as métricas em `notas/`.

Orientação: o mar fica em +X e a orla corre ao longo de Z. Com a câmera padrão de
Shanghai (azimute pi/4), o mar aparece embaixo à direita e o deck embaixo à esquerda,
como no croqui.
"""
from pathlib import Path
import json, math

OUT = Path(__file__).resolve().parents[1]
VERSION = 'rio-fase01-planta-v1'
# Mesma dimensão de Shanghai fase 01.
BOUNDS = dict(minX=-51, maxX=51, minZ=-54, maxZ=54)
FLOOR = 3.3  # altura de pavimento usada em Shanghai

# Faixas ao longo de X, do morro (oeste) ao mar (leste).
BANDS = [
    ('lote_fundo',     -51, -40, 'Quadra de fundo, cortada pelo morro'),
    ('calcada_fundo',  -40, -38, 'Calçada'),
    ('rua_fundo',      -38, -31, 'Rua de trás'),
    ('calcada_meio',   -31, -29, 'Calçada'),
    ('lote_frente',    -29, -11, 'Quadra da orla'),
    ('calcada_orla',   -11,  -9, 'Calçada dos prédios'),
    ('pista_cidade',    -9,  -3, 'Pista da avenida, lado dos prédios'),
    ('canteiro',        -3,   4, 'Praças do canteiro central'),
    ('pista_praia',      4,  10, 'Pista da avenida, lado da praia'),
    ('calcadao',        10,  15, 'Calçadão de pedras portuguesas em ondas'),
    ('areia',           15,  36, 'Faixa de areia'),
    ('mar',             36,  51, 'Mar: limite leste'),
]
BAND = {name: (a, b) for name, a, b, _ in BANDS}
WATERLINE = BAND['mar'][0]

# Quadras ao longo de Z. +Z é a ponta do deck; -Z é a ponta do morro que fecha a praia.
BLOCKS = [('0', 39, 54), ('1', 5, 27), ('2', -29, -7), ('3', -54, -41)]
CROSS_STREETS = [(27, 39), (-7, 5), (-41, -29)]
# Praças do canteiro: as travessias ficam de frente para o meio das quadras 1 e 2.
PLAZAS = [('Praca_Sul', 25, 54), ('Praca_Central', -18, 17), ('Praca_Norte', -54, -26)]
KIOSKS = [('Quiosque_1', 17.5), ('Quiosque_2', -36.0)]
KIOSK = dict(alongZ=13.0, depthX=7.5)
DECK = dict(minX=17, maxX=33, minZ=40, maxZ=54)
SHIP = dict(x=25, y=0, z=47)
EXIT = dict(x=25, y=0, z=43.5)
LANDING = dict(minX=20, maxX=30, minZ=40, maxZ=53)

# Planta v1: píer quebrado junto ao morro do norte. Só os dois primeiros trechos são caminháveis.
PIER_Z = (-53, -47)
PIER_SECTIONS = [('Pier_Rampa', 28, 36, True), ('Pier_Tablado', 36, 46, True), ('Pier_Ponta_Caida', 46, 51, False)]
PIER_END = 46
# Planta v1: destroços com colisão. (id, tipo, x, z, eixo do comprimento, giro visual em graus)
VEHICLE_SIZE = dict(onibus=(2.5, 8.2, 2.65), carro=(1.8, 3.9, 1.6))
VEHICLES = [
    ('Onibus_Praia', 'onibus', 8.6, -8.0, 'z', 4), ('Onibus_Avenida', 'onibus', -7.6, 14.0, 'z', -6),
    ('Onibus_Fundo', 'onibus', -36.6, -18.0, 'z', 3), ('Onibus_Travessa', 'onibus', -22.0, 35.4, 'x', 5),
    ('Carro_Praia_Sul', 'carro', 5.2, 30.0, 'z', 12), ('Carro_Avenida_Norte', 'carro', -4.2, -30.0, 'z', -9),
    ('Carro_Deck', 'carro', 9.0, 47.5, 'z', 7), ('Carro_Fundo', 'carro', -32.2, 12.0, 'z', -14),
    ('Carro_Travessa', 'carro', -22.5, 3.2, 'x', 8), ('Carro_Avenida_Sul', 'carro', -4.3, 40.0, 'z', 15),
    ('Carro_Calcadao', 'carro', 13.6, -12.0, 'z', -22), ('Carro_Ponta_Norte', 'carro', -4.4, -46.0, 'z', 10),
]
# (id, x, z, largura em X, comprimento em Z, altura): entulho de fachada caído sobre calçadas e pistas.
RUBBLE = [
    ('Entulho_F2_Avenida', -9.6, -22.0, 3.6, 6.0, 1.6), ('Entulho_F1_Travessa', -14.0, 4.5, 4.0, 2.4, 1.2),
    ('Entulho_T1_Fundo', -38.6, 21.0, 2.8, 6.0, 1.8), ('Entulho_F3_Ponta', -10.2, -46.0, 2.4, 4.4, 1.4),
    ('Entulho_Calcadao', 11.2, 36.0, 2.2, 3.0, .9), ('Entulho_Travessa_Norte', -30.0, -38.4, 5.0, 2.6, 1.3),
    ('Entulho_T2_Fundo', -39.0, 10.0, 2.0, 5.0, 1.5),
]
# Dano visual por prédio; o envelope de colisão não muda.
DAMAGE = dict(F0='rachado', F1='canto_desabado', F2='rachado', F3='fachada_aberta',
              T0='rachado', T1='fachada_aberta', T2='canto_desabado', T3='rachado')

parts, obstacles, buildings, limits, props = [], [], [], [], []


def rect(kind, name, minX, maxX, minZ, maxZ, **extra):
    part = dict(id=name, kind=kind, minX=minX, maxX=maxX, minZ=minZ, maxZ=maxZ, **extra)
    parts.append(part)
    return part


def collider(name, minX, maxX, minZ, maxZ, height, source):
    obstacles.append(dict(id='COL_' + name, minX=minX, maxX=maxX, minZ=minZ, maxZ=maxZ,
                          source=source, minY=0.0, maxY=round(height, 2)))


# Superfícies contínuas.
for name, a, b, label in BANDS:
    if name in ('lote_fundo', 'lote_frente', 'canteiro'):
        continue
    rect('faixa', name, a, b, BOUNDS['minZ'], BOUNDS['maxZ'], label=label)
for i, (a, b) in enumerate(CROSS_STREETS):
    rect('faixa', f'travessa_{i}', BAND['lote_fundo'][0], BAND['calcada_orla'][1], a, b, label='Rua transversal')
# A pista ocupa também o vão entre as praças.
rect('faixa', 'pista_canteiro', *BAND['canteiro'], BOUNDS['minZ'], BOUNDS['maxZ'], label='Travessias do canteiro')

# Prédios: um volume por quadra, como no croqui. Recuo de 1 m da calçada.
for row, lot, floors_by_block in (('F', 'lote_frente', (7, 8, 6, 8)), ('T', 'lote_fundo', (10, 9, 10, 9))):
    x0, x1 = BAND[lot]
    for (block, z0, z1), floors in zip(BLOCKS, floors_by_block):
        rect('quadra', f'Quadra_{row}{block}', x0, x1, z0, z1)
        # Na borda do mapa o volume encosta no limite; nas outras faces recua.
        bx0 = x0 if x0 == BOUNDS['minX'] else x0 + 1
        bz0 = z0 if z0 == BOUNDS['minZ'] else z0 + 1
        bz1 = z1 if z1 == BOUNDS['maxZ'] else z1 - 1
        bx1 = x1 - 1
        name = f'Predio_{row}{block}'
        height = floors * FLOOR
        buildings.append(dict(id=name, x=(bx0 + bx1) / 2, z=(bz0 + bz1) / 2, w=bx1 - bx0, d=bz1 - bz0,
                              height=round(height, 2), floors=floors, ruin=False,
                              pilotis=row == 'F', row='orla' if row == 'F' else 'fundo', damage=DAMAGE[row + block]))
        rect('predio', name, bx0, bx1, bz0, bz1, floors=floors)
        collider(name, bx0, bx1, bz0, bz1, height, name)

# Praças: canteiros elevados (12 cm), sem colisão. Palmeiras e areia entram como props.
for name, z0, z1 in PLAZAS:
    rect('praca', name, BAND['canteiro'][0] + .5, BAND['canteiro'][1] - .5, z0, z1, radius=3, step=.12)

# Quiosques na areia, encostados no calçadão.
for name, zc in KIOSKS:
    x0 = BAND['areia'][0]
    box = (x0, x0 + KIOSK['depthX'], zc - KIOSK['alongZ'] / 2, zc + KIOSK['alongZ'] / 2)
    rect('quiosque', name, *box)
    # Núcleo circular do quiosque (raio 2,6 m) como colisor; o deck em volta é caminhável.
    cx, r = (box[0] + box[1]) / 2, 2.6
    collider(name + '_Nucleo', cx - r, cx + r, zc - r, zc + r, 3.4, name)

for name, x0, x1, walk in PIER_SECTIONS:
    rect('pier', name, x0, x1, *PIER_Z, walkable=walk)
for name, kind, x, z, axis, yaw in VEHICLES:
    w, length, height = VEHICLE_SIZE[kind]
    a = math.radians(abs(yaw))
    # Caixa alinhada aos eixos que contém o veículo girado.
    across, along = w * math.cos(a) + length * math.sin(a), length * math.cos(a) + w * math.sin(a)
    dx, dz = (across, along) if axis == 'z' else (along, across)
    props.append(dict(id=name, kind=kind, x=x, z=z, axis=axis, yaw=yaw, w=w, length=length, height=height))
    collider(name, round(x - dx / 2, 3), round(x + dx / 2, 3), round(z - dz / 2, 3), round(z + dz / 2, 3), height, name)
for name, x, z, w, d, h in RUBBLE:
    props.append(dict(id=name, kind='entulho', x=x, z=z, w=w, d=d, height=h))
    collider(name, x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, name)

rect('deck', 'Deck_Pouso', **DECK)
rect('reserva', 'Reserva_Pouso', **LANDING)

# Limites. O mar fecha a leste; morro e escombros fecham os outros três lados.
limits.append(dict(id='Limite_Leste_Mar', kind='mar', minX=WATERLINE, maxX=BOUNDS['maxX'], minZ=BOUNDS['minZ'], maxZ=BOUNDS['maxZ'],
                   note='Linha d\'água irregular no visual; colisão reta em X = 36.'))
limits.append(dict(id='Limite_Oeste_Morro', kind='morro', minX=BOUNDS['minX'] - 16, maxX=BOUNDS['minX'], minZ=BOUNDS['minZ'], maxZ=BOUNDS['maxZ'],
                   note='Cadeia de morros de granito com mata atrás das quadras de fundo.'))
limits.append(dict(id='Limite_Norte_Morro_Escombros', kind='morro_escombros', minX=BOUNDS['minX'], maxX=WATERLINE, minZ=BOUNDS['minZ'] - 16, maxZ=BOUNDS['minZ'],
                   note='Morro que avança até o mar e fecha a praia, com escombros na avenida.'))
limits.append(dict(id='Limite_Sul_Escombros', kind='escombros', minX=BOUNDS['minX'], maxX=WATERLINE, minZ=BOUNDS['maxZ'], maxZ=BOUNDS['maxZ'] + 16,
                   note='Prédios desabados e avenida destruída atrás do deck de pouso.'))
limit_colliders = [
    dict(id='COL_Limite_Norte', minX=-51.0, maxX=51.0, minZ=-57.0, maxZ=-54.0, minY=0.0, maxY=4.0),
    dict(id='COL_Limite_Sul', minX=-51.0, maxX=51.0, minZ=54.0, maxZ=57.0, minY=0.0, maxY=4.0),
    dict(id='COL_Limite_Oeste', minX=-54.0, maxX=-51.0, minZ=-54.0, maxZ=54.0, minY=0.0, maxY=4.0),
    # O mar abre só a boca do píer: fecha ao sul dele, na face do morro e depois do trecho desabado.
    dict(id='COL_Limite_Mar', minX=float(WATERLINE), maxX=54.0, minZ=float(PIER_Z[1]), maxZ=54.0, minY=0.0, maxY=4.0),
    dict(id='COL_Limite_Mar_Pier_Norte', minX=float(WATERLINE), maxX=54.0, minZ=-54.0, maxZ=float(PIER_Z[0]), minY=0.0, maxY=4.0),
    dict(id='COL_Limite_Mar_Pier_Ponta', minX=float(PIER_END), maxX=54.0, minZ=float(PIER_Z[0]), maxZ=float(PIER_Z[1]), minY=0.0, maxY=4.0),
]

walkable = [dict(minX=BOUNDS['minX'], maxX=WATERLINE, minZ=BOUNDS['minZ'], maxZ=BOUNDS['maxZ']),
            # Tablado do píer; sobrepõe 2 m de areia para a navegação cruzar sem costura.
            dict(minX=WATERLINE - 2, maxX=PIER_END, minZ=PIER_Z[0], maxZ=PIER_Z[1])]

# Propostas de jogo, a validar: suprimentos nos quiosques, rotas e pontos de entrada dos inimigos.
# Balcão do quiosque no lado do mar, fora do núcleo circular.
loot = [dict(id=f'LOOT_{name}', kind='deposito', x=BAND['areia'][0] + KIOSK['depthX'] / 2 + 3.2, z=zc) for name, zc in KIOSKS]
lane_w, lane_e = sum(BAND['pista_cidade']) / 2, sum(BAND['pista_praia']) / 2
back = sum(BAND['rua_fundo']) / 2
patrol_routes = [
    # Volta na avenida em torno da praça central.
    [dict(x=lane_e, z=21), dict(x=lane_e, z=-22), dict(x=lane_w, z=-22), dict(x=lane_w, z=21)],
    # Volta no quarteirão 1 pela rua de trás.
    [dict(x=lane_w, z=33), dict(x=lane_w, z=-1), dict(x=back, z=-1), dict(x=back, z=33)],
    # Volta no quarteirão 2 pela rua de trás.
    [dict(x=lane_w, z=-1), dict(x=lane_w, z=-35), dict(x=back, z=-35), dict(x=back, z=-1)],
    # Calçadão e areia entre os quiosques.
    [dict(x=12.5, z=30), dict(x=12.5, z=-45), dict(x=28, z=-45), dict(x=28, z=30)],
]
spawns = []
for i, z in enumerate((33, -1, -35)):          # Mutantes Rio descem do morro pelas travessas.
    spawns.append(dict(id=f'SPAWN_Morro_{i}', x=-49.0, z=float(z), origem='morro'))
for i, x in enumerate((lane_w, lane_e, 12.5)):  # Patrol Rio chegam pela ponta norte da avenida.
    spawns.append(dict(id=f'SPAWN_Avenida_Norte_{i}', x=float(x), z=-52.0, origem='avenida_norte'))
spawns.append(dict(id='SPAWN_Rua_Fundo_Norte', x=float(back), z=-52.0, origem='rua_fundo'))
spawns.append(dict(id='SPAWN_Rua_Fundo_Sul', x=float(back), z=52.0, origem='rua_fundo'))
# Mesmo formato dos spawns de Shanghai: rota de patrulha e waypoint mais próximo.
for spawn in spawns:
    candidates = range(len(patrol_routes)) if spawn['id'].startswith(('SPAWN_Morro', 'SPAWN_Rua')) else (0, 3)
    best = min(((math.hypot(p['x'] - spawn['x'], p['z'] - spawn['z']), r, w) for r in candidates for w, p in enumerate(patrol_routes[r])))
    spawn['routeIndex'], spawn['waypoint'] = best[1], best[2]
routes = [[dict(**EXIT), dict(x=12.5, z=43.5), dict(x=12.5, z=21), dict(x=lane_e, z=21), dict(x=lane_w, z=-1), dict(x=back, z=-1)]]
viewpoints = [dict(id='chegada', x=EXIT['x'], z=EXIT['z']), dict(id='praca-central', x=.5, z=-.5),
              dict(id='quiosque-norte', x=23.5, z=-36), dict(id='rua-de-tras', x=back, z=-1)]


def overlaps(a, b):
    return a['minX'] < b['maxX'] and b['minX'] < a['maxX'] and a['minZ'] < b['maxZ'] and b['minZ'] < a['maxZ']


def inside(point, box, margin=0.0):
    return box['minX'] - margin <= point['x'] <= box['maxX'] + margin and box['minZ'] - margin <= point['z'] <= box['maxZ'] + margin


def check():
    errors = []
    total = sum(b - a for _, a, b, _ in BANDS)
    if total != BOUNDS['maxX'] - BOUNDS['minX']:
        errors.append(f'faixas somam {total} m em X')
    for o in obstacles:
        if not (BOUNDS['minX'] <= o['minX'] and o['maxX'] <= BOUNDS['maxX'] and BOUNDS['minZ'] <= o['minZ'] and o['maxZ'] <= BOUNDS['maxZ']):
            errors.append(f"{o['id']} fora dos limites")
        if overlaps(o, LANDING):
            errors.append(f"{o['id']} invade a reserva de pouso")
    for c in limit_colliders:
        if any(overlaps(c, dict(minX=area['minX'] + .01, maxX=area['maxX'] - .01, minZ=area['minZ'] + .01, maxZ=area['maxZ'] - .01)) for area in walkable):
            errors.append(f"{c['id']} fecha área caminhável")
    for o in obstacles:
        if any(overlaps(o, dict(minX=x0, maxX=x1, minZ=PIER_Z[0], maxZ=PIER_Z[1])) for _, x0, x1, _ in PIER_SECTIONS):
            errors.append(f"{o['id']} sobre o píer")
    for i, a in enumerate(obstacles):
        for b in obstacles[i + 1:]:
            if overlaps(a, b):
                errors.append(f"{a['id']} sobrepõe {b['id']}")
    points = [('saida', EXIT)] + [(s['id'], s) for s in spawns] + [(l['id'], l) for l in loot] \
        + [(f'rota{i}_{j}', p) for i, r in enumerate(patrol_routes + routes) for j, p in enumerate(r)] \
        + [(v['id'], v) for v in viewpoints]
    for name, p in points:
        if not any(inside(p, area) for area in walkable):
            errors.append(f'{name} fora da área caminhável')
        if any(inside(p, o) for o in obstacles):
            errors.append(f'{name} dentro de um colisor')
    for s in spawns:
        if math.hypot(s['x'] - EXIT['x'], s['z'] - EXIT['z']) < 14:
            errors.append(f"{s['id']} a menos de 14 m do desembarque")
    return errors


def area(b):
    return (b['maxX'] - b['minX']) * (b['maxZ'] - b['minZ'])


COLORS = dict(mar='#2f6f8f', areia='#e3cf9c', calcadao='#cfcfcf', pista_praia='#4a4d52', pista_cidade='#4a4d52',
              pista_canteiro='#4a4d52', rua_fundo='#4a4d52', calcada_orla='#9a9a94', calcada_meio='#9a9a94',
              calcada_fundo='#9a9a94', travessa='#4a4d52', quadra='#8d8778', predio='#d8cdb4', praca='#6f9a5c',
              quiosque='#b98a5a', deck='#5fd6e6', reserva='none', pier='#8a6a45')
ORDER = ['faixa', 'quadra', 'praca', 'predio', 'quiosque', 'pier', 'deck', 'reserva']


def svg(project, filename, title):
    """Prancha da planta. `project` leva (x, z) do jogo para a página."""
    corners = [project(x, z) for x in (BOUNDS['minX'] - 16, BOUNDS['maxX']) for z in (BOUNDS['minZ'] - 16, BOUNDS['maxZ'] + 16)]
    xs, ys = [c[0] for c in corners], [c[1] for c in corners]
    pad, scale = 6, 7
    w, h = (max(xs) - min(xs) + 2 * pad) * scale, (max(ys) - min(ys) + 2 * pad) * scale + 30

    def pt(x, z):
        px, py = project(x, z)
        return f'{(px - min(xs) + pad) * scale:.1f},{(py - min(ys) + pad) * scale + 30:.1f}'

    def poly(b, fill, stroke='#2b2b2b', width=.6, extra=''):
        pts = ' '.join(pt(x, z) for x, z in ((b['minX'], b['minZ']), (b['maxX'], b['minZ']), (b['maxX'], b['maxZ']), (b['minX'], b['maxZ'])))
        return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" {extra}/>'

    def label(x, z, text, size=11, color='#1c1c1c'):
        px, py = pt(x, z).split(',')
        return f'<text x="{px}" y="{py}" font-size="{size}" fill="{color}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">{text}</text>'

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">',
           f'<rect width="{w:.0f}" height="{h:.0f}" fill="#f4f1ea"/>',
           f'<text x="12" y="20" font-size="14" font-family="Helvetica, Arial, sans-serif" fill="#1c1c1c">{title}</text>']
    for limit in limits:
        fill = {'mar': COLORS['mar'], 'morro': '#6b7a5e', 'morro_escombros': '#77786a', 'escombros': '#8a8580'}[limit['kind']]
        out.append(poly(limit, fill, '#555', .4, 'opacity="0.85"'))
    for kind in ORDER:
        for part in parts:
            if part['kind'] != kind:
                continue
            key = part['id'] if kind == 'faixa' else kind
            key = 'travessa' if key.startswith('travessa') else key
            if kind == 'pier' and not part.get('walkable'):
                out.append(poly(part, '#5d4a35', '#2b2b2b', .6, 'stroke-dasharray="3 2" opacity="0.7"'))
            elif kind == 'reserva':
                out.append(poly(part, 'none', '#0b6b7a', 1, 'stroke-dasharray="4 3"'))
            else:
                out.append(poly(part, COLORS.get(key, '#bbbbbb')))
    for o in obstacles:
        if 'Nucleo' in o['id']:
            out.append(poly(o, '#7a5a38'))
        elif o['source'].startswith(('Onibus', 'Carro')):
            out.append(poly(o, '#9c4a2c'))
        elif o['source'].startswith('Entulho'):
            out.append(poly(o, '#6f6a64'))
    for b in buildings:
        out.append(label(b['x'], b['z'], f"{b['id'].replace('Predio_', 'Prédio ')} · {b['floors']} pav."))
    for name, z0, z1 in PLAZAS:
        out.append(label(.5, (z0 + z1) / 2, name.replace('_', ' ').replace('Praca', 'Praça'), 10, '#12300c'))
    for name, zc in KIOSKS:
        out.append(label(BAND['areia'][0] + KIOSK['depthX'] / 2, zc, name.replace('_', ' '), 9))
    out.append(label(25, 50.5, 'Deck de pouso', 10, '#063e47'))
    out.append(label(37, -50, 'Píer quebrado', 9, '#f3e7d2'))
    out.append(label(43.5, 0, 'MAR', 16, '#e9f4f8'))
    out.append(label(25.5, -8, 'AREIA', 12, '#6b5a2c'))
    out.append(label(12.5, -8, 'CALÇADÃO', 9))
    out.append(label(-59, 0, 'MORRO', 14, '#eef2e6'))
    out.append(label(-10, -62, 'MORRO E ESCOMBROS', 12, '#f0f0e8'))
    out.append(label(-10, 62, 'ESCOMBROS', 12, '#f3efe9'))
    for s in spawns:
        px, py = pt(s['x'], s['z']).split(',')
        out.append(f'<circle cx="{px}" cy="{py}" r="4" fill="#c0392b" stroke="#fff" stroke-width="1"/>')
    px, py = pt(EXIT['x'], EXIT['z']).split(',')
    out.append(f'<circle cx="{px}" cy="{py}" r="4.5" fill="#00a6c0" stroke="#fff" stroke-width="1"/>')
    out.append(poly(dict(**BOUNDS), 'none', '#111', 1.4))
    out.append('</svg>')
    (OUT / 'notas' / filename).write_text('\n'.join(out) + '\n', encoding='utf-8')


def top_down(x, z):
    return x, z  # leste à direita, +Z (deck) embaixo


def camera(x, z):
    # Câmera ortográfica de Shanghai: azimute pi/4 e elevação de 35,26 graus.
    c, s = math.cos(math.pi / 4), math.sin(math.atan2(13, 18.38))
    return (x - z) * c, (x + z) * c * s


def main():
    errors = check()
    data = dict(version=VERSION, bounds=BOUNDS, ship=SHIP, exit=EXIT, landingReservation=LANDING,
                walkableAreas=walkable, obstacles=obstacles, buildings=buildings, loot=loot,
                patrolRoutes=patrol_routes, spawns=spawns, routes=routes, viewpoints=viewpoints,
                bands=[dict(id=n, minX=a, maxX=b, label=l) for n, a, b, l in BANDS], props=props,
                parts=parts, limits=limits, limitColliders=limit_colliders,
                camera=dict(azimuth='pi/4', note='Mar embaixo à direita e deck embaixo à esquerda, como no croqui.'))
    (OUT / 'export').mkdir(exist_ok=True)
    (OUT / 'notas').mkdir(exist_ok=True)
    (OUT / 'export' / 'layout.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    total = area(BOUNDS)
    built = sum(area(o) for o in obstacles)
    metrics = dict(version=VERSION, erros=errors,
                   dimensao=dict(x=BOUNDS['maxX'] - BOUNDS['minX'], z=BOUNDS['maxZ'] - BOUNDS['minZ'], area_m2=total),
                   area_caminhavel_m2=round(area(walkable[0]) + (PIER_END - WATERLINE) * (PIER_Z[1] - PIER_Z[0]) - built, 1), area_mar_m2=area(limits[0]),
                   area_colisores_m2=round(built, 1), predios=len(buildings), quiosques=len(KIOSKS), veiculos=len(VEHICLES), entulhos=len(RUBBLE), pier_caminhavel_m=PIER_END - 28,
                   pracas=len(PLAZAS), spawns=len(spawns),
                   referencia_shanghai=dict(x=102, z=108, pouso='10 x 13 m', pavimento_m=FLOOR))
    (OUT / 'notas' / 'planta-v1.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    svg(top_down, 'planta-v1-topo.svg', 'Rio de Janeiro · Level 02 · planta v1 vista de cima (leste à direita)')
    svg(camera, 'planta-v1-camera.svg', 'Rio de Janeiro · Level 02 · planta v1 no ângulo da câmera do jogo')
    print(json.dumps(metrics, ensure_ascii=False, indent=1))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
