"""Blender 5.1.1 — Control Room EDEN v002:
- Estrutura externa remodelada no estilo visual e arquitetônico do Hangar (saia ferrugem chanfrada,
  contrafortes de canto com faixa hazard e parafusos, portais trapezoidais com balizadores, unidade
  lateral de resfriamento com turbinas, tubulações com flanges e telhado chanfrado com espinha dorsal
  corrugada e nervuras).
- Estrutura interna central substituída pela plataforma quadrada chanfrada + pedestal octogonal
  escalonado do projetor holográfico EDEN (conforme referência), com anéis emissivos no piso,
  feixes de cabos nas 4 bordas, tubulação dourada nos cantos, painéis EDEN iluminados e lente
  emissora superior para o Holograma do Novo EDEN.
- Alvo de ~10.000 triângulos (estritamente <= 10.000).
"""
import bpy, bmesh, sys, math, json, hashlib
sys.dont_write_bytecode = True
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import geometry as g
from geometry import box, cyl, beam, extrude, pipe

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

manifest = []
meshes = []
groups = {}
colliders = []


def group(name, role='detail', support=(), state='visivel', operation='both'):
    groups[name] = {
        'start': len(g.parts),
        'papel': role,
        'support': list(support),
        'state': state,
        'operation': operation
    }
    return name


def end(name):
    spec = groups[name]
    objects = g.parts[spec['start']:]
    assert objects, f'Grupo vazio: {name}'
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        if o.data.uv_layers:
            o.data.uv_layers[0].name = 'UVMap'
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    o.location.z -= .15  # piso acabado coincide com o nível 0 da colônia
    o.location.y += 10.5  # Blender -Y mapeia para +Z no jogo: centro (0, -10.5)
    for key, value in {
        'id_estavel': name,
        'papel': spec['papel'],
        'ambiente': 'brand-brain',
        'estado_inicial': spec['state'],
        'estado_operacao': spec['operation']
    }.items():
        o[key] = value
    o['apoiado_em'] = json.dumps(spec['support'])
    o['apoiado_em_todos'] = '[]'
    meshes.append(o)
    return o


def col(n, p, h):
    colliders.append({
        'id': 'COL_CR_' + n,
        'center': {'x': p[0], 'y': p[2] - .15, 'z': -p[1] - 10.5},
        'halfExtents': {'x': h[0], 'y': h[2], 'z': h[1]},
        'type': 'CuboidCollider',
        'proposal': True
    })


def frame(n, p, size, t=1, bev=0):
    p = Vector(p)
    thin = 0 if size[0] < size[1] else 1
    wide = 1 - thin
    for sign in [-1, 1]:
        pos = p.copy()
        pos.z += sign * (size[2] / 2 - .035)
        dims = list(size)
        dims[2] = .07
        box(n, pos, dims, t, bev=bev)
        pos = p.copy()
        pos[wide] += sign * (size[wide] / 2 - .035)
        dims = list(size)
        dims[wide] = .07
        dims[2] -= .14
        box(n, pos, dims, t, bev=bev)


def pipe_n(n, points, r=.04, t=4, rings=6):
    pts = [Vector(p) for p in points]
    verts = []
    faces = []
    previous_tangent = None
    previous_u = None
    for i, p in enumerate(pts):
        tangent = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((1, 0, 0))
        if abs(tangent.dot(ref)) > .9:
            ref = Vector((0, 1, 0))
        u = (
            (previous_tangent.rotation_difference(tangent) @ previous_u).normalized()
            if previous_tangent is not None
            else tangent.cross(ref).normalized()
        )
        v = tangent.cross(u).normalized()
        previous_tangent = tangent.copy()
        previous_u = u.copy()
        verts.extend([
            p + r * (u * math.cos(j * 2 * math.pi / rings) + v * math.sin(j * 2 * math.pi / rings))
            for j in range(rings)
        ])
    for i in range(len(pts) - 1):
        for j in range(rings):
            faces.append((
                i * rings + j,
                i * rings + (j + 1) % rings,
                (i + 1) * rings + (j + 1) % rings,
                (i + 1) * rings + j
            ))
    faces.extend([
        tuple(reversed(range(rings))),
        tuple((len(pts) - 1) * rings + j for j in range(rings))
    ])
    me = bpy.data.meshes.new(n)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(n, me)
    bpy.context.collection.objects.link(o)
    return g.finish(o, n, t)


def slab(n, z0, z1, t, outline):
    k = len(outline)
    v = [(x, y, z) for z in [z0, z1] for x, y in outline]
    f = [tuple(reversed(range(k))), tuple(range(k, 2 * k))] + [
        (i, (i + 1) % k, (i + 1) % k + k, i + k) for i in range(k)
    ]
    me = bpy.data.meshes.new(n)
    me.from_pydata(v, [], f)
    me.update()
    o = bpy.data.objects.new(n, me)
    bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    g.finish(o, n, t)
    return o


# Glifos vetoriais aeroespaciais (baixa contagem de triângulos e visual sci-fi fiel à referência)
GLYPHS = {
    'E': [
        (0.00, 0.00, 0.18, 1.00),
        (0.18, 0.82, 0.72, 1.00),
        (0.18, 0.42, 0.62, 0.58),
        (0.18, 0.00, 0.72, 0.18),
    ],
    'D': [
        (0.00, 0.00, 0.18, 1.00),
        (0.18, 0.82, 0.56, 1.00),
        (0.18, 0.00, 0.56, 0.18),
        (0.56, 0.14, 0.74, 0.86),
    ],
    'N': [
        (0.00, 0.00, 0.18, 1.00),
        (0.58, 0.00, 0.76, 1.00),
        (0.18, 0.56, 0.38, 0.82),
        (0.38, 0.24, 0.58, 0.56),
    ],
    'C': [
        (0.00, 0.14, 0.18, 0.86),
        (0.18, 0.82, 0.70, 1.00),
        (0.18, 0.00, 0.70, 0.18),
    ],
    'O': [
        (0.00, 0.14, 0.18, 0.86),
        (0.56, 0.14, 0.74, 0.86),
        (0.18, 0.82, 0.56, 1.00),
        (0.18, 0.00, 0.56, 0.18),
    ],
    'T': [
        (0.00, 0.82, 0.74, 1.00),
        (0.28, 0.00, 0.46, 0.82),
    ],
    'R': [
        (0.00, 0.00, 0.18, 1.00),
        (0.18, 0.82, 0.58, 1.00),
        (0.18, 0.44, 0.58, 0.60),
        (0.56, 0.56, 0.72, 0.86),
        (0.46, 0.00, 0.70, 0.44),
    ],
    'L': [
        (0.00, 0.00, 0.18, 1.00),
        (0.18, 0.00, 0.70, 0.18),
    ],
}


def text_mesh(n, body, p, rot, size, t, extrude_depth=.006):
    char_w = size * 0.76
    gap = size * 0.18
    total_w = len(body) * char_w + max(0, len(body) - 1) * gap
    start_x = -total_w / 2
    verts = []
    faces = []
    for idx, ch in enumerate(body):
        ox = start_x + idx * (char_w + gap)
        for (x0, y0, x1, y1) in GLYPHS.get(ch, []):
            xa = ox + x0 * size
            xb = ox + x1 * size
            ya = (y0 - 0.5) * size
            yb = (y1 - 0.5) * size
            za = -extrude_depth
            zb = extrude_depth
            base = len(verts)
            verts.extend([
                (xa, ya, za), (xb, ya, za), (xb, yb, za), (xa, yb, za),
                (xa, ya, zb), (xb, ya, zb), (xb, yb, zb), (xa, yb, zb),
            ])
            faces.extend([
                (base + 3, base + 2, base + 1, base + 0),
                (base + 4, base + 5, base + 6, base + 7),
                (base + 0, base + 1, base + 5, base + 4),
                (base + 1, base + 2, base + 6, base + 5),
                (base + 2, base + 3, base + 7, base + 6),
                (base + 3, base + 0, base + 4, base + 7),
            ])
    me = bpy.data.meshes.new(n)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(n, me)
    bpy.context.collection.objects.link(o)
    o.location = p
    o.rotation_euler = rot
    return g.finish(o, n, t)


# ==============================================================================
# 1. PISO E EMBASAMENTO (PIS_Control) — Ladrilhos 1,25 x 1,50 m com junta 30 mm (estilo Quartel / Pátio)
# ==============================================================================
group('PIS_Control', 'floor')
outline = [
    (-3.5, -2.93), (-3.18, -3.25), (3.18, -3.25), (3.5, -2.93),
    (3.5, 2.93), (3.18, 3.25), (-3.18, 3.25), (-3.5, 2.93)
]
slab('Plinth', 0, .12, 1, outline)
slab('Floor', .12, .15, 12, outline)
for x in [-2.5, -1.25, 0.0, 1.25, 2.5]:
    box('TileJointX', (x, 0, .152), (.03, 6.40, .004), 13)
for y in [-2.25, -.75, .75, 2.25]:
    box('TileJointY', (0, y, .152), (6.90, .03, .004), 13)
end('PIS_Control')
col('Piso', (0, 0, .075), (3.5, 3.25, .075))

# ==============================================================================
# 2. CASCO EXTERNO ESTILO HANGAR (Saia ferrugem, cintura grafite, placas creme)
# ==============================================================================
# Fachada Sul (entrada central de 2,2 m preservada)
group('ARQ_Control_Parede_S', 'wall')
for sx in [-1, 1]:
    x = sx * 2.2
    # Saia inferior chanfrada estilo Hangar (ferrugem tile 11)
    box('SouthSkirt', (x, -3.19, .66), (2.18, .28, 1.02), 11, bev=.03)
    # Friso de cintura (grafite tile 1) + faixa hazard
    box('SouthBelt', (x, -3.23, 1.24), (2.22, .22, .16), 1)
    box('SouthHazard', (x, -3.345, .64), (1.62, .015, .10), 7)
    # Placa superior creme boleada (tile 10) + coroamento
    box('SouthHullUpper', (x, -3.15, 2.02), (2.18, .22, 1.40), 10, bev=.03)
    box('SouthCrown', (x, -3.19, 2.62), (2.22, .26, .18), 1)
    for xx in [x - .96, x + .96]:
        box('SouthRib', (xx, -3.20, 1.62), (.14, .26, 2.15), 0)
    frame('SouthWindowFrame', (x, -3.27, 1.82), (1.76, .10, .82), 1)
    box('SouthGrille', (x, -3.34, .36), (.95, .025, .24), 9)
box('SouthDoorHeader', (0, -3.16, 2.54), (2.32, .26, .34), 10, bev=.025)
end('ARQ_Control_Parede_S')
for x in [-2.2, 2.2]:
    col('Sul_' + str(x), (x, -3.15, 1.4), (1.1, .1, 1.3))

# Fachada Norte (traseira estilo Hangar com saia ferrugem, vigas, inspeção e vents)
group('ARQ_Control_Parede_N', 'wall')
box('NorthSkirt', (0, 3.19, .66), (6.36, .28, 1.02), 11, bev=.035)
box('NorthBelt', (0, 3.23, 1.24), (6.40, .22, .16), 1)
box('NorthHull', (0, 3.15, 2.00), (6.36, .22, 1.38), 10, bev=.03)
box('NorthCrown', (0, 3.19, 2.62), (6.40, .26, .18), 1)
for x in [-3.05, -1.55, 0.0, 1.55, 3.05]:
    box('NorthRib', (x, 3.21, 1.48), (.16, .26, 2.55), 0)
box('NorthInspection', (0, 3.29, 1.96), (2.20, .12, .92), 1, bev=.035)
for x in [-.68, 0, .68]:
    box('NorthVent', (x, 3.36, 1.96), (.42, .03, .64), 9)
for sx in [-1, 1]:
    box('NorthSidePanel', (sx * 2.28, 3.27, 1.96), (1.18, .08, .88), 10)
    box('NorthHazard', (sx * 2.28, 3.34, .64), (1.10, .015, .10), 7)
    pipe_n('NorthCoolant', [
        (sx * 2.82, 3.38, .12), (sx * 2.82, 3.38, .42),
        (sx * 2.72, 3.32, .58), (sx * 2.72, 3.32, 2.48),
        (sx * 2.60, 3.22, 2.62)
    ], .055, 4, rings=6)
end('ARQ_Control_Parede_N')
col('Norte', (0, 3.15, 1.4), (3.18, .1, 1.3))

# Fachada Oeste (janela panorâmica superior + cooler de turbinas estilo Hangar)
group('ARQ_Control_Parede_O', 'wall')
box('WestSkirt', (-3.44, 0, .66), (.28, 5.86, 1.02), 11, bev=.03)
box('WestBelt', (-3.48, 0, 1.24), (.22, 5.90, .16), 1)
box('WestUpperHeader', (-3.40, 0, 2.44), (.22, 5.86, .52), 10, bev=.025)
for sy in [-1, 1]:
    box('WestUpperFlank', (-3.40, sy * 2.34, 1.76), (.22, 1.18, .92), 10)
for y in [-2.86, -1.76, 1.76, 2.86]:
    box('WestRib', (-3.44, y, 1.48), (.26, .15, 2.55), 0)
frame('WestPanoramicFrame', (-3.51, 0, 1.80), (.10, 3.46, .88), 1)
# Unidade lateral de resfriamento com 2 turbinas (estilo Hangar)
box('WestSideCooler', (-3.68, 0, .68), (.38, 1.62, .96), 1, bev=.05)
for y in [-.42, .42]:
    cyl('WestIntakeRim', (-3.87, y, .66), (-3.93, y, .66), .23, 4, verts=10)
    cyl('WestIntakeDark', (-3.93, y, .66), (-3.95, y, .66), .18, 8, verts=10)
    cyl('WestIntakeHub', (-3.95, y, .66), (-3.98, y, .66), .065, 4, verts=8)
    for k in range(3):
        b = box('WestFanBlade', (-3.95, y, .66), (.02, .29, .04), 4)
        b.rotation_euler.x = k * math.pi / 3
for sy in [-1, 1]:
    box('WestTelemetryFrame', (-3.54, sy * 2.34, 1.80), (.12, .86, .34), 1)
    box('WestTelemetryScreen', (-3.61, sy * 2.34, 1.80), (.02, .68, .16), 8)
    pipe_n('WestCoolant', [
        (-3.72, sy * 1.42, .12), (-3.72, sy * 1.42, .38),
        (-3.60, sy * 1.42, .54), (-3.60, sy * 1.42, 2.36),
        (-3.48, sy * 1.42, 2.54)
    ], .06, 4, rings=6)
end('ARQ_Control_Parede_O')
col('Oeste', (-3.4, 0, 1.4), (.1, 2.93, 1.3))

# Fachada Leste (entrada leste de 2,2 m preservada + estilo Hangar)
group('ARQ_Control_Parede_L', 'wall')
for sy in [-1, 1]:
    y = sy * 2.05
    box('EastSkirt', (3.44, y, .66), (.28, 1.88, 1.02), 11, bev=.03)
    box('EastBelt', (3.48, y, 1.24), (.22, 1.90, .16), 1)
    box('EastUpper', (3.40, y, 2.02), (.22, 1.88, 1.40), 10, bev=.03)
    box('EastCrown', (3.44, y, 2.62), (.26, 1.90, .18), 1)
    box('EastHazard', (3.59, y, .64), (.015, 1.35, .10), 7)
    for dy in [-.80, .80]:
        box('EastRib', (3.44, y + dy, 1.62), (.26, .16, 2.15), 0)
    frame('EastWindowFrame', (3.51, y, 1.80), (.09, 1.32, .74), 1)
box('EastDoorHeader', (3.42, 0, 2.54), (.26, 2.32, .34), 10, bev=.025)
end('ARQ_Control_Parede_L')
for y in [-2.05, 2.05]:
    col('Leste_' + str(y), (3.4, y, 1.4), (.1, .95, 1.3))

# Contrafortes de canto a 45° no estilo do Hangar (blindagem ferrugem + bloco creme + hazard + bolts)
group('ARQ_Control_Cantos', 'wall')
for sx in [-1, 1]:
    for sy in [-1, 1]:
        section = [
            (sx * 3.52, sy * 2.91), (sx * 3.16, sy * 3.27),
            (sx * 3.06, sy * 3.05), (sx * 3.30, sy * 2.81)
        ]
        slab('CornerArmor', .15, 1.20, 2, section)
        slab('CornerHazard', 1.20, 1.36, 7, section)
        slab('CornerUpper', 1.36, 2.72, 0, section)
        cx, cy = sx * 3.36, sy * 3.11
        for z in [.48, .96, 1.85, 2.35]:
            cyl('CornerBolt', (cx, cy, z), (cx + sx * .06, cy + sy * .06, z), .045, 4, verts=6)
end('ARQ_Control_Cantos')

# Vidros translúcidos (VID_Control)
group('VID_Control', 'detail', ('ARQ_Control_Parede_S', 'ARQ_Control_Parede_O', 'ARQ_Control_Parede_L'))
for x in [-2.2, 2.2]:
    box('SouthGlass', (x, -3.275, 1.82), (1.60, .025, .68), 14, bev=.04)
box('WestGlass', (-3.52, 0, 1.80), (.025, 3.28, .72), 14, bev=.04)
for y in [-2.05, 2.05]:
    box('EastGlass', (3.522, y, 1.80), (.025, 1.15, .58), 14, bev=.04)
end('VID_Control')

# ==============================================================================
# 3. PORTAIS ESTILO HANGAR E FOLHAS DE PORTA (Sul e Leste)
# ==============================================================================
for side in ['S', 'L']:
    group('ARQ_Control_Portal_' + side, 'wall')
    for s in [-1, 1]:
        if side == 'S':
            box('PortalPost', (s * 1.18, -3.30, 1.35), (.22, .30, 2.40), 1, bev=.04)
            beam('PortalDiag', (s * 1.18, -3.30, 2.22), (s * .78, -3.30, 2.54), .18, 1)
            box('PostHazard', (s * 1.18, -3.46, .56), (.16, .02, .58), 7)
            for z, t in [(.38, 8), (.78, 6)]:
                box('BeaconBase', (s * 1.18, -3.48, z), (.11, .05, .11), 1)
                box('BeaconLight', (s * 1.18, -3.515, z), (.075, .03, .075), t)
        else:
            box('PortalPost', (3.54, s * 1.18, 1.35), (.30, .22, 2.40), 1, bev=.04)
            beam('PortalDiag', (3.54, s * 1.18, 2.22), (3.54, s * .78, 2.54), .18, 1)
            box('PostHazard', (3.70, s * 1.18, .56), (.02, .16, .58), 7)
            for z, t in [(.38, 8), (.78, 6)]:
                box('BeaconBase', (3.72, s * 1.18, z), (.05, .11, .11), 1)
                box('BeaconLight', (3.755, s * 1.18, z), (.03, .075, .075), t)
    if side == 'S':
        box('PortalHeader', (0, -3.31, 2.50), (2.56, .32, .22), 1, bev=.04)
    else:
        box('PortalHeader', (3.55, 0, 2.50), (.32, 2.56, .22), 1, bev=.04)
    end('ARQ_Control_Portal_' + side)

    for sx in [-1, 1]:
        leaf = 'D_Control_' + side + ('_A' if sx < 0 else '_B')
        group(leaf, 'door')
        if side == 'S':
            box('DoorLeaf', (sx * .535, -3.15, 1.25), (1.055, .09, 2.20), 1, bev=.045)
            box('DoorPanel', (sx * .535, -3.205, 1.24), (.90, .025, 1.98), 10)
            box('DoorStripe', (sx * .535, -3.22, .72), (.86, .015, .14), 2)
            box('DoorGlazing', (sx * .535, -3.225, 1.74), (.52, .025, .46), 14)
        else:
            box('DoorLeaf', (3.40, sx * .535, 1.25), (.09, 1.055, 2.20), 1, bev=.045)
            box('DoorPanel', (3.455, sx * .535, 1.24), (.025, .90, 1.98), 10)
            box('DoorStripe', (3.47, sx * .535, .72), (.015, .86, .14), 2)
            box('DoorGlazing', (3.475, sx * .535, 1.74), (.025, .52, .46), 14)
        end(leaf)

    group('PROP_Control_Status_' + side, 'detail', ('ARQ_Control_Portal_' + side,))
    if side == 'S':
        box('Status', (0, -3.48, 2.50), (.68, .025, .065), 6)
    else:
        box('Status', (3.72, 0, 2.50), (.025, .68, .065), 6)
    end('PROP_Control_Status_' + side)

# ==============================================================================
# 4. TELHADO ESTILO HANGAR (Águas chanfradas, ombros creme e espinha corrugada)
# ==============================================================================
group('TET_Control', 'roof')
slab('RoofSill', 2.70, 2.84, 2, outline)
slab('RoofDeck', 2.84, 3.12, 0, outline)
# Rampas inclinadas estilo Hangar nas laterais X e ombros planos
for sx in [-1, 1]:
    for j in range(3):
        y0 = -2.76 + j * 1.84
        y1 = y0 + 1.78
        extrude('RoofSlope', [
            (sx * 3.46, 3.08), (sx * 3.46, 3.18),
            (sx * 2.52, 3.68), (sx * 2.42, 3.58)
        ], y0, y1, 10)
        box('RoofShoulder', (sx * 1.72, (y0 + y1) / 2, 3.64), (1.56, 1.78, .12), 10)
        cyl('RoofRivet', (sx * 2.32, y0 + .25, 3.69), (sx * 2.32, y0 + .25, 3.72), .03, 4, verts=6)
# Fechamento frontal e traseiro do telhado alto
for sy in [-1, 1]:
    box('RoofEndCap', (0, sy * 2.66, 3.38), (4.96, .24, .52), 10, bev=.03)
# Espinha dorsal central rebaixada e corrugada (estilo Hangar)
box('RoofSpine', (0, 0, 3.56), (1.88, 5.28, .12), 1)
for j in range(10):
    box('SpineRib', (0, -2.34 + j * .52, 3.64), (1.78, .06, .06), 4)
for sx in [-1, 1]:
    for y in [-2.1, 0.0, 2.1]:
        box('SpineClamp', (sx * .96, y, 3.70), (.20, .14, .10), 2)
end('TET_Control')

group('PROP_Control_Telhado', 'detail', ('TET_Control',))
# Respiradouros inclinados nas águas do telhado (estilo Hangar)
for sx in [-1, 1]:
    for y in [-1.35, 1.35]:
        v = box('RoofVentFoot', (sx * 2.95, y, 3.38), (.46, .52, .10), 1)
        v.rotation_euler.y = sx * math.radians(28)
        a = (sx * 2.95, y, 3.43)
        b = (sx * 3.04, y, 3.53)
        cyl('RoofVentRim', a, b, .13, 4, verts=6)
        cyl('RoofVentCore', b, (sx * 3.06, y, 3.55), .09, 8, verts=6)
# Antena e torre de telemetria no nordeste do telhado
cyl('AntennaBase', (1.95, 1.85, 3.68), (1.95, 1.85, 3.88), .14, 1, verts=6)
cyl('AntennaMast', (1.95, 1.85, 3.88), (1.95, 1.85, 4.65), .028, 4, verts=6)
cyl('AntennaBeacon', (1.95, 1.85, 4.65), (1.95, 1.85, 4.74), .05, 6, verts=6)
for z in [4.10, 4.38]:
    beam('AntennaCross', (1.78, 1.85, z), (2.12, 1.85, z), .024, 4)
# Pórtico frontal de sinalização estilo Hangar
box('ControlSignBoard', (-.52, -2.92, 3.30), (2.10, .24, .36), 0, bev=.035)
text_mesh('CONTROL', 'CONTROL', (-.52, -3.05, 3.30), (math.pi / 2, 0, 0), .20, 1)
box('EdenSignBoard', (1.18, -2.92, 3.30), (1.10, .24, .36), 2, bev=.035)
text_mesh('EDEN_ROOF', 'EDEN', (1.18, -3.05, 3.30), (math.pi / 2, 0, 0), .19, 0)
end('PROP_Control_Telhado')

group('TET_Control_Luminarias', 'detail', ('TET_Control',))
for x in [-1.65, 1.65]:
    box('LightHousing', (x, 0, 2.67), (.18, 3.80, .11), 1, bev=.02)
    box('LightDiffuser', (x, 0, 2.605), (.12, 3.64, .025), 6)
end('TET_Control_Luminarias')

# ==============================================================================
# 5. ESTRUTURA INTERNA CENTRAL — PLATAFORMA E PEDESTAL DO HOLOGRAMA EDEN
#    (Fiel à imagem de referência anexada pelo autor)
# ==============================================================================
group('PROP_Control_Console', 'furniture')

# 5.1. Plataforma quadrada chanfrada escura no piso (2,68 m × 2,68 m)
plat_outer = [
    (-1.34, -1.16), (-1.16, -1.34), (1.16, -1.34), (1.34, -1.16),
    (1.34, 1.16), (1.16, 1.34), (-1.16, 1.34), (-1.34, 1.16)
]
plat_inner = [
    (-1.26, -1.10), (-1.10, -1.26), (1.10, -1.26), (1.26, -1.10),
    (1.26, 1.10), (1.10, 1.26), (-1.10, 1.26), (-1.26, 1.10)
]
slab('HoloPlatformBase', .15, .195, 1, plat_outer)
slab('HoloPlatformDeck', .195, .22, 8, plat_inner)

# Placas modulares de canto e borda na plataforma escura
for sx in [-1, 1]:
    for sy in [-1, 1]:
        box('PlatCornerTile', (sx * .98, sy * .98, .223), (.44, .44, .012), 1)
for s in [-1, 1]:
    for d in [-.42, .42]:
        box('PlatEdgeTileX', (d, s * 1.12, .223), (.36, .22, .012), 1)
        box('PlatEdgeTileY', (s * 1.12, d, .223), (.22, .36, .012), 1)

# 4 Feixes duplos de cabos/conduítes entrando pelas 4 bordas até o anel luminoso
for offset in [-.08, .08]:
    for sy in [-1, 1]:
        pipe_n('DeckCableNS', [
            (offset, sy * 1.36, .165),
            (offset, sy * 1.28, .228),
            (offset, sy * .92, .228)
        ], .020, 4, rings=4)
    for sx in [-1, 1]:
        pipe_n('DeckCableEW', [
            (sx * 1.36, offset, .165),
            (sx * 1.28, offset, .228),
            (sx * .92, offset, .228)
        ], .020, 4, rings=4)
for s in [-1, 1]:
    box('DeckCableClampNS', (0, s * 1.24, .232), (.24, .055, .022), 1)
    box('DeckCableClampEW', (s * 1.24, 0, .232), (.055, .24, .022), 1)

# Anéis concêntricos no piso da plataforma (1 anel ciano sutil + anéis dourado/grafite)
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.12, minor_radius=.018,
    major_segments=20, minor_segments=3,
    location=(0, 0, .224)
)
g.finish(bpy.context.object, 'FloorRingOuterCyan', 5)

bpy.ops.mesh.primitive_torus_add(
    major_radius=.92, minor_radius=.016,
    major_segments=20, minor_segments=3,
    location=(0, 0, .225)
)
g.finish(bpy.context.object, 'FloorRingInnerDark', 1)

bpy.ops.mesh.primitive_torus_add(
    major_radius=1.02, minor_radius=.010,
    major_segments=20, minor_segments=3,
    location=(0, 0, .224)
)
g.finish(bpy.context.object, 'FloorRingMidAmber', 3)

# Marcadores radiais discretos (latão/grafite) e 4 setas triangulares âmbar/douradas nas diagonais
for i in range(16):
    ang = i * math.tau / 16
    if i % 4 == 2:
        continue
    rx, ry = 1.02 * math.cos(ang), 1.02 * math.sin(ang)
    t = box('FloorRingTick', (rx, ry, .226), (.022, .085, .008), 3 if i % 4 == 0 else 1)
    t.rotation_euler.z = ang + math.pi / 2

for i in range(4):
    ang = math.pi / 4 + i * math.pi / 2
    cx, cy = 1.02 * math.cos(ang), 1.02 * math.sin(ang)
    ux, uy = -math.cos(ang), -math.sin(ang)
    px, py = -uy, ux
    tri = [
        (cx + ux * .075, cy + uy * .075),
        (cx - ux * .055 + px * .065, cy - uy * .055 + py * .065),
        (cx - ux * .055 - px * .065, cy - uy * .055 - py * .065)
    ]
    slab('FloorArrowAmber', .222, .232, 3, tri)

# 5.2. Corpo Octogonal Escalonado do Pedestal Central (Branco/Creme aeroespacial + Ouro + Ciano)
def oct_points(half_w, chamfer):
    d = half_w - chamfer
    return [
        (-d, -half_w), (d, -half_w), (half_w, -d), (half_w, d),
        (d, half_w), (-d, half_w), (-half_w, d), (-half_w, -d)
    ]

# Zócalo inferior grafite, corpo principal creme/branco e coroa superior chanfrada
slab('PedestalPlinth', .22, .30, 1, oct_points(.76, .22))
slab('PedestalLowerHull', .30, .58, 0, oct_points(.72, .21))
slab('PedestalMidStep', .58, .74, 10, oct_points(.64, .19))
slab('PedestalUpperCrown', .74, .90, 0, oct_points(.52, .15))
slab('PedestalTopDeck', .90, .94, 1, oct_points(.45, .13))

# Tubulação perimetral dupla dourada/latão (tile 3) contornando os 4 cantos chanfrados da base
for sx in [-1, 1]:
    for sy in [-1, 1]:
        for z_pipe in [.315, .375]:
            pts = [
                (sx * .36, sy * .755, z_pipe),
                (sx * .53, sy * .755, z_pipe),
                (sx * .755, sy * .53, z_pipe),
                (sx * .755, sy * .36, z_pipe)
            ]
            pipe_n('CornerGoldPipe', pts, .022, 3, rings=5)
        # Abraçadeiras grafite nos cantos da tubulação dourada
        for (bx, by) in [(sx * .46, sy * .755), (sx * .755, sy * .46)]:
            box('GoldPipeBracket', (bx, by, .345), (.055, .055, .11), 1)

        # Grelha vertical técnica nos 4 chanfros inferiores
        rot_diag = math.atan2(sx, -sy)
        dnx, dny = math.sin(rot_diag), -math.cos(rot_diag)
        dtx, dty = math.cos(rot_diag), math.sin(rot_diag)
        gx, gy = sx * .615, sy * .615
        glow = box('CornerCyanVentGlow', (gx + dnx * .01, gy + dny * .01, .45), (.22, .025, .17), 8)
        glow.rotation_euler.z = rot_diag
        frame_c = box('CornerCyanVentFrame', (gx + dnx * .016, gy + dny * .016, .45), (.25, .02, .20), 1)
        frame_c.rotation_euler.z = rot_diag
        for k in [-1, 0, 1]:
            px = gx + dnx * .022 + k * .055 * dtx
            py = gy + dny * .022 + k * .055 * dty
            fin = box('CornerVentFin', (px, py, .45), (.016, .035, .16), 0)
            fin.rotation_euler.z = rot_diag

        # Displays técnicos escuros nos 4 chanfros superiores
        ux, uy = sx * .445, sy * .445
        uch = box('UpperChamferScreenFrame', (ux + dnx * .012, uy + dny * .012, .815), (.19, .025, .11), 1)
        uch.rotation_euler.z = rot_diag
        ucs = box('UpperChamferScreen', (ux + dnx * .022, uy + dny * .022, .815), (.15, .018, .075), 8)
        ucs.rotation_euler.z = rot_diag

# Painéis laterais nas 4 faces cardeais (Sul, Norte, Leste, Oeste)
# Sul (-Y) e Leste (+X): Painel escuro emoldurado em dourado com letreiro luminoso "EDEN" em ciano
for face, pos, rot_z in [
    ('S', (0, -.72, .52), 0.0),
    ('L', (.72, 0, .52), math.pi / 2),
    ('N', (0, .72, .52), math.pi),
    ('O', (-.72, 0, .52), -math.pi / 2)
]:
    nx, ny = math.sin(rot_z), -math.cos(rot_z)
    tx, ty = math.cos(rot_z), math.sin(rot_z)

    def place_face(name, forward_offset, side_offset, z_pos, size, tile_idx, bev=0.0):
        px = pos[0] + nx * forward_offset + tx * side_offset
        py = pos[1] + ny * forward_offset + ty * side_offset
        o = box(name, (px, py, z_pos), size, tile_idx, bev=bev)
        o.rotation_euler.z = rot_z
        return o

    # Moldura dourada/âmbar + fundo escuro do painel principal da face
    place_face(f'FaceGoldFrame_{face}', .012, 0, .48, (.54, .03, .23), 3)
    place_face(f'FaceDarkRecess_{face}', .024, 0, .48, (.48, .02, .18), 8)

    if face in ('S', 'L'):
        # Letreiro luminoso "EDEN" em ciano + filetes dourados
        place_face(f'FaceCyanAccent_{face}', .030, 0, .40, (.40, .015, .016), 3)
        place_face(f'FaceAmberAccent_{face}', .030, 0, .56, (.34, .015, .014), 3)
        lx = pos[0] + nx * .038
        ly = pos[1] + ny * .038
        text_mesh(
            f'EDEN_PEDESTAL_{face}', 'EDEN',
            (lx, ly, .48),
            (math.pi / 2, 0, rot_z),
            .095, 5, extrude_depth=.006
        )
    else:
        # Grelhas técnicas douradas + painel escuro nas faces Norte e Oeste
        place_face(f'FaceCenterScreen_{face}', .030, 0, .48, (.18, .018, .12), 8)
        for s_side in [-.16, .16]:
            place_face(f'FaceSideLouvre_{face}', .030, s_side, .48, (.11, .018, .13), 3)

    # Sub-painel / visor técnico inferior na saia e superior na coroa (metal escuro neutro)
    place_face(f'LowerTechDisplayFrame_{face}', .028, 0, .325, (.24, .03, .075), 1)
    place_face(f'LowerTechDisplay_{face}', .038, 0, .325, (.19, .015, .048), 8)
    place_face(f'UpperCrownDisplayFrame_{face}', -.19, 0, .82, (.28, .03, .10), 1)
    place_face(f'UpperCrownDisplay_{face}', -.178, 0, .82, (.23, .018, .068), 8)

end('PROP_Control_Console')
col('Console', (0, 0, .58), (.82, .82, .43))

# 5.3. Colar Segmentado e Lente Emissora Superior (PROP_Control_EDEN_Emissor)
group('PROP_Control_EDEN_Emissor', 'furniture')
cyl('EmitterOuterBase', (0, 0, .94), (0, 0, .99), .42, 1, verts=12)
cyl('EmitterBevelRing', (0, 0, .99), (0, 0, 1.035), .36, 0, verts=12)
cyl('EmitterInnerCollar', (0, 0, 1.035), (0, 0, 1.06), .29, 1, verts=12)
# Lente côncava central azul-ciano suave (onde nasce o Holograma do Novo EDEN)
cyl('EmitterApertureGlow', (0, 0, 1.045), (0, 0, 1.065), .24, 5, verts=16)
cyl('EmitterCoreRing', (0, 0, 1.062), (0, 0, 1.072), .15, 3, verts=12)
cyl('EmitterCoreCenter', (0, 0, 1.066), (0, 0, 1.076), .11, 5, verts=12)

# 8 blocos radiais de travamento ao redor do colar da lente + indicadores em latão/grafite
for i in range(8):
    ang = i * math.tau / 8
    bx, by = .355 * math.cos(ang), .355 * math.sin(ang)
    clamp = box('EmitterRadialClamp', (bx, by, 1.015), (.085, .11, .065), 1 if i % 2 == 0 else 0)
    clamp.rotation_euler.z = ang + math.pi / 2
    lx, ly = .385 * math.cos(ang + math.pi / 8), .385 * math.sin(ang + math.pi / 8)
    ind = box('EmitterRadialLight', (lx, ly, .995), (.045, .045, .025), 3 if i % 2 == 0 else 1)
    ind.rotation_euler.z = ang + math.pi / 8
end('PROP_Control_EDEN_Emissor')

# 5.4. Anéis Holográficos de Interface ao redor do volume do Novo EDEN (PROP_Control_EDEN_Projecao)
group('PROP_Control_EDEN_Projecao', 'detail', ('PROP_Control_EDEN_Emissor',))
# Anel de base do feixe logo acima da lente + 2 órbitas finas inclinadas que envolvem o holograma da EDEN
for z, r, tilt_x, tilt_y, tile_idx in [
    (1.12, .26, 0.0, 0.0, 5),
    (1.56, .54, .22, -.14, 3),
    (1.88, .56, -.18, .20, 6)
]:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r, minor_radius=.009,
        major_segments=16, minor_segments=3,
        location=(0, 0, z),
        rotation=(tilt_x, tilt_y, 0)
    )
    g.finish(bpy.context.object, 'HoloHudRing', tile_idx)

for i in range(6):
    a = i * math.tau / 6
    box('HoloHudNode', (.56 * math.cos(a), .56 * math.sin(a), 1.72), (.022, .022, .045), 3 if i % 2 == 0 else 6)
end('PROP_Control_EDEN_Projecao')

# Geometria de estado de interação (oculta por metadado até interagir)
group('PROP_Control_Interacao', 'detail', ('PROP_Control_Console',), 'oculto', 'interaction')
for s in [-1, 1]:
    box('InteractionGuideS', (s * .52, -.82, .24), (.08, .08, .025), 5)
    box('InteractionGuideL', (.82, s * .52, .24), (.08, .08, .025), 5)
end('PROP_Control_Interacao')

# ==============================================================================
# 6. EQUIPAMENTOS PERIMETRAIS INTERNOS (Rack NW, Consoles NE, Telas e Conduítes)
# ==============================================================================
group('PROP_Control_Rack', 'furniture')
box('ServerRack', (-2.54, 2.57, 1.12), (.74, .78, 1.94), 1, bev=.05)
for z in [.45, .72, .99, 1.26, 1.53, 1.80]:
    box('ServerDrawer', (-2.54, 2.16, z), (.61, .025, .21), 9)
    for x in [-2.77, -2.65]:
        box('Telemetry', (x, 2.137, z), (.055, .012, .025), 6 if z > 1.7 else 8)
for z in [.35, 1.95]:
    box('RackRail', (-2.54, 2.13, z), (.62, .04, .055), 4)
end('PROP_Control_Rack')
col('Rack', (-2.54, 2.57, 1.12), (.40, .49, .97))

group('PROP_Control_Consoles_N', 'furniture')
box('WallConsole', (1.2, 2.65, .65), (2.30, .70, 1.00), 0, bev=.045)
for x in [.42, 1.2, 1.98]:
    box('MonitorSupport', (x, 2.34, 1.18), (.14, .09, .14), 1)
    o = box('PeripheralScreen', (x, 2.32, 1.40), (.64, .11, .39), 1)
    o.rotation_euler.x = math.radians(18)
    o = box('PeripheralGlass', (x, 2.253, 1.41), (.54, .02, .29), 14)
    o.rotation_euler.x = math.radians(18)
    box('KeyboardTray', (x, 2.20, 1.125), (.55, .28, .04), 1)
    box('PeripheralKeys', (x, 2.19, 1.16), (.49, .22, .03), 4)
end('PROP_Control_Consoles_N')
col('Consoles_N', (1.20, 2.55, .92), (1.2, .50, .77))

group('PROP_Control_Telas', 'detail', ('ARQ_Control_Parede_N', 'ARQ_Control_Parede_O'))
box('MainWallDisplay', (1.22, 3.025, 2.07), (2.8, .045, .72), 1)
box('MainWallGlass', (1.22, 2.992, 2.07), (2.61, .02, .54), 14)
box('SideTerminal', (-3.245, 1.10, 1.40), (.13, .82, .52), 1)
box('SideTerminalScreen', (-3.17, 1.10, 1.42), (.025, .66, .35), 14)
end('PROP_Control_Telas')

group('PROP_Control_Conduites', 'detail', ('ARQ_Control_Parede_N',))
for x in [-2.9, 2.9]:
    pipe_n('WallConduit', [(x, 2.96, .18), (x, 2.96, .40), (x, 2.97, 1.25), (x, 2.97, 2.55)], .024, 1, rings=4)
    for z in [.45, 1.3, 2.1]:
        box('CableClamp', (x, 2.92, z), (.10, .06, .045), 2)
end('PROP_Control_Conduites')


# ==============================================================================
# 7. MATERIAIS PBR ATLAS 2K + EXPORTAÇÃO .BLEND / .GLB / MANIFESTO v002
# ==============================================================================
def material(name, glass=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    p = n.get('Principled BSDF')
    for kind in ['basecolor', 'orm', 'normal', 'emission']:
        im = bpy.data.images.get('control_v002_' + kind + '.png') or bpy.data.images.load(
            str(ROOT / 'texturas' / ('control_v002_' + kind + '.png'))
        )
        im.colorspace_settings.name = 'sRGB' if kind in ['basecolor', 'emission'] else 'Non-Color'
        tex = n.new('ShaderNodeTexImage')
        tex.image = im
        if kind == 'basecolor':
            l.new(tex.outputs['Color'], p.inputs['Base Color'])
        elif kind == 'normal':
            nm = n.new('ShaderNodeNormalMap')
            l.new(tex.outputs['Color'], nm.inputs['Color'])
            l.new(nm.outputs['Normal'], p.inputs['Normal'])
        elif kind == 'orm':
            sep = n.new('ShaderNodeSeparateColor')
            l.new(tex.outputs['Color'], sep.inputs['Color'])
            l.new(sep.outputs['Green'], p.inputs['Roughness'])
            l.new(sep.outputs['Blue'], p.inputs['Metallic'])
        else:
            l.new(tex.outputs['Color'], p.inputs['Emission Color'])
            p.inputs['Emission Strength'].default_value = 1.1
    if glass:
        p.inputs['Alpha'].default_value = .38
        p.inputs['Roughness'].default_value = .22
        m.surface_render_method = 'DITHERED'
        m.diffuse_color = (.15, .18, .21, .38)
    return m


opaque = material('MAT_Control_Atlas_2K')
glass = material('MAT_Control_Vidro', True)

for o in meshes:
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=.000001)
    flat = [f for f in bm.faces if f.calc_area() < 1e-10]
    if flat:
        bmesh.ops.delete(bm, geom=flat, context='FACES_ONLY')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    o.data.materials.clear()
    o.data.materials.append(glass if o.name == 'VID_Control' else opaque)
    for p in o.data.polygons:
        p.material_index = 0
    o.data.calc_loop_triangles()
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(v) for v in o.bound_box]
    bounds = {
        'minX': min(v.x for v in pts),
        'maxX': max(v.x for v in pts),
        'minY': min(v.z for v in pts),
        'maxY': max(v.z for v in pts),
        'minZ': min(-v.y for v in pts),
        'maxZ': max(-v.y for v in pts)
    }
    spec = groups[o.name]
    manifest.append({
        'id': o.name,
        'name': o.name,
        'papel': spec['papel'],
        'ambiente': 'brand-brain',
        'estado_inicial': spec['state'],
        'estado_operacao': spec['operation'],
        'apoiado_em': spec['support'],
        'apoiado_em_todos': [],
        'bounds': bounds,
        'triangles': len(o.data.loop_triangles)
    })

for p in manifest:
    print(f"  {p['id']}: {p['triangles']} tris")
tri = sum(p['triangles'] for p in manifest)
print(f'CONTROL_ROOM_V002_TRIANGLES={tri}')
assert tri <= 10000, f'Acima do orçamento de 10k triângulos: {tri}'

report = {
    'version': 'control-room-v002',
    'base': 'cf8916a',
    'position': {'x': 0, 'z': -10.5},
    'size': {'width': 7, 'depth': 6.5},
    'entrances': ['south', 'east'],
    'hologramAnchor': {'x': 0, 'y': 0.92, 'z': -10.5},
    'parts': manifest,
    'triangles': tri,
    'materials': 2,
    'colliders_proposed': colliders,
    'interaction': {
        'id': 'INTERACT_Control_EDEN',
        'position': {'x': 0, 'y': 0, 'z': -10.5},
        'existingAction': 'openEden',
        'existingRadius': 2.7
    },
    'states': ['idle', 'interaction'],
    'statesRuntimeOnly': True
}

(ROOT / 'export/manifesto_control_room_v002.json').write_text(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'blend/control_room_v002.blend'))
bpy.ops.export_scene.gltf(
    filepath=str(ROOT / 'export/control_room_v002.glb'),
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_extras=True,
    export_materials='EXPORT',
    export_image_format='AUTO'
)
print('CONTROL_ROOM_V002_OK', tri)
