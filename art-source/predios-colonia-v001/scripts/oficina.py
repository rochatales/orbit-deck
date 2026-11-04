"""Oficina (Workshop) v002: casca nova na linguagem aprovada de Data Center/Cafeteria.

Fonte intacta: originais/workshop.blend. Do modelo do autor ficam móveis e equipamentos (bancadas, prateleiras,
fabricadora, emissor neon, bomba, janela, dutos, braço robótico, escotilha e chaminé). Saem a casca arredondada,
a base escura, a laje plana, a clarabóia e a porta pivotante fora de centro.
Porta centrada com o kit da Control Room, como nos prédios aprovados; COL_* são empties de meia extensão.

  Blender -b --python art-source/predios-colonia-v001/scripts/oficina.py -- [--render]
"""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/predios-colonia-v001'
SOURCE = ART / 'originais/workshop.blend'
CAFETERIA = ART / 'originais/cafeteria.glb'
REF = ROOT / 'src/assets/control-room/control-room-v002.glb'
RENDER = '--render' in sys.argv
LABEL = ('WORKSHOP', 'WS')
WALL_TOP, SKIRT_TOP, BAND_TOP = 2.75, 1.1, 1.45
DOOR_HALF, HEADER = .85, 2.0
WINDOW = (-3.25, -1.95, 1.45, 2.2)  # x0, x1, z0, z1 da abertura, fora do curso das folhas (±1,81 m)
# Células 8 × 8 da paleta. As linhas 4–7 recebem as cores da Cafeteria; 0–3 seguem com a paleta do autor.
CREAM, TERRA, GRAPHITE, TRIM, DARK = (0, 4), (1, 4), (3, 4), (5, 4), (5, 6)
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
workshop_scene = bpy.data.scenes['Workshop']
for window in bpy.context.window_manager.windows: window.scene = workshop_scene
for o in list(bpy.data.scenes['Scene'].objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.data.scenes.remove(bpy.data.scenes['Scene'])
for action in list(bpy.data.actions): bpy.data.actions.remove(action)
root = bpy.data.objects['Workshop']
palette, glass = bpy.data.materials['WS_Palette'], bpy.data.materials['WS_Glass']
loaded = set(bpy.data.objects)


def importar(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.data.objects if o not in before]


# Cores da Cafeteria nas linhas livres da paleta: sem material novo, mesmos valores de pixel.
for o in importar(CAFETERIA): bpy.data.objects.remove(o, do_unlink=True)
for own, other in [('WS_Palette_BaseColor', 'cafeteria_basecolor'), ('WS_Palette_Emissive', 'cafeteria_emissive')]:
    a, b = bpy.data.images[own], bpy.data.images[other]
    if tuple(a.size) != (128, 128) or tuple(b.size) != (128, 128): raise RuntimeError('Paleta inesperada')
    pixels, source = list(a.pixels), list(b.pixels)
    pixels[64 * 128 * 4:] = source[:64 * 128 * 4]
    a.pixels = pixels; a.update(); a.pack()
bsdf = next(n for n in palette.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Metallic'].default_value, bsdf.inputs['Roughness'].default_value, bsdf.inputs['Emission Strength'].default_value = .05, .82, 1.6
bsdf = next(n for n in glass.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value = (.01, .02, .03, 1); bsdf.inputs['Metallic'].default_value = .05
bsdf.inputs['Roughness'].default_value = .25; bsdf.inputs['Alpha'].default_value = .72

# Kit real da porta, como em padronizar.py.
kit = {}
for o in importar(REF):
    o['do_kit'] = True
for name in ['ARQ_Control_Portal_S', 'PROP_Control_Status_S', 'D_Control_S_A', 'D_Control_S_B']:
    o = bpy.data.objects[name]
    data = o.data.copy(); data.transform(o.matrix_world); data.transform(Matrix.Translation((0, -7.325, 0)))
    data.use_fake_user = True; kit[name] = data
atlas = bpy.data.materials['MAT_Control_Atlas_2K']; atlas.use_fake_user = True
for o in [o for o in bpy.data.objects if o.get('do_kit')]: bpy.data.objects.remove(o, do_unlink=True)


def tile_uv(mesh, tile):
    uv = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    u, v = (tile % 4 + .5) / 4, 1 - (tile // 4 + .5) / 4
    for loop in uv.data: loop.uv = (u, v)
    mesh.materials.clear(); mesh.materials.append(atlas)
    for p in mesh.polygons: p.material_index = 0


class Parts:
    """Malha acumulada: peças do autor por componente conexo e sólidos novos da casca."""
    def __init__(self):
        self.bm = bmesh.new(); self.uv = self.bm.loops.layers.uv.new('UVMap')

    def face(self, points, cell):
        face = self.bm.faces.new([self.bm.verts.new(p) for p in points])
        for loop in face.loops: loop[self.uv].uv = ((cell[0] + .5) / 8, (cell[1] + .5) / 8)
        face.smooth = False

    def solid(self, bottom, top, cell):
        """Prisma entre dois contornos anti-horários vistos de cima."""
        n = len(bottom)
        self.face(list(reversed(bottom)), cell); self.face(top, cell)
        for i in range(n):
            j = (i + 1) % n
            self.face([bottom[i], bottom[j], top[j], top[i]], cell)

    def keep(self, source, decide):
        """decide(caixa, n_vértices) devolve o deslocamento do componente, ou None para retirá-lo."""
        if (source.matrix_world.to_translation()).length > 1e-6: raise RuntimeError(source.name)
        bm = bmesh.new(); bm.from_mesh(source.data); bm.verts.ensure_lookup_table(); seen, doomed, kept = set(), [], 0
        for v in bm.verts:
            if v in seen: continue
            todo, comp = [v], []; seen.add(v)
            while todo:
                a = todo.pop(); comp.append(a)
                for e in a.link_edges:
                    b = e.other_vert(a)
                    if b not in seen: seen.add(b); todo.append(b)
            box = [min(q.co[i] for q in comp) for i in range(3)] + [max(q.co[i] for q in comp) for i in range(3)]
            delta = decide(box, len(comp))
            if delta is None: doomed.extend(comp)
            else:
                kept += 1
                for q in comp: q.co += Vector(delta)
        bmesh.ops.delete(bm, geom=doomed, context='VERTS')
        temp = bpy.data.meshes.new('temp'); bm.to_mesh(temp); bm.free()
        temp.uv_layers.active.name = 'UVMap'
        self.bm.from_mesh(temp); bpy.data.meshes.remove(temp)
        return kept

    def write(self, obj):
        mesh = bpy.data.meshes.new(obj.name); self.bm.to_mesh(mesh); self.bm.free()
        mesh.materials.append(palette); mesh.materials.append(glass)
        old = obj.data; obj.data = mesh
        if old.users == 0: bpy.data.meshes.remove(old)


parts = {n: Parts() for n in ['Wall_N', 'Wall_E', 'Wall_S', 'Wall_W', 'Interior', 'Furniture', 'Exterior', 'Building_Roof']}
SIDES = {'Wall_S': ((1, 0), (0, -1)), 'Wall_E': ((0, 1), (1, 0)), 'Wall_N': ((-1, 0), (0, 1)), 'Wall_W': ((0, -1), (-1, 0))}
DIAG0 = 8.3  # |x| + |y| do chanfro na face H = 4,5: quina de 0,70 m, como na Cafeteria


def diag(h): return DIAG0 + (h - 4.5) * math.sqrt(2)


def plan(side, t, h):
    tangent, normal = SIDES[side]
    return (tangent[0] * t + normal[0] * h, tangent[1] * t + normal[1] * h)


def layer(side, inner, outer, z0, z1, cell, target=None, t0=None, t1=None):
    """Trecho reto entre os planos H=inner e H=outer, com meia-esquadria no chanfro."""
    limit = lambda h: diag(h) - h
    a0, a1 = (-limit(inner), -limit(outer)) if t0 is None else (t0, t0)
    b0, b1 = (limit(inner), limit(outer)) if t1 is None else (t1, t1)
    ring = [plan(side, a0, inner), plan(side, a1, outer), plan(side, b1, outer), plan(side, b0, inner)]
    ring = ring if inner < outer else ring[::-1]
    area = sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(ring, ring[1:] + ring[:1]))
    if area < 0: ring.reverse()
    (target or parts[side]).solid([(*p, z0) for p in ring], [(*p, z1) for p in ring], cell)


def chamfer(sx, sy, inner, outer, z0, z1, cell, target):
    a = lambda h: (sx * h, sy * (diag(h) - h))
    b = lambda h: (sx * (diag(h) - h), sy * h)
    ring = [a(inner), a(outer), b(outer), b(inner)]
    if sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(ring, ring[1:] + ring[:1])) < 0: ring.reverse()
    target.solid([(*p, z0) for p in ring], [(*p, z1) for p in ring], cell)


# Casca: parede creme, embasamento terracota, faixa grafite e friso, na mesma ordem da Cafeteria.
for side in SIDES:
    trechos = [(None, None)]
    if side == 'Wall_S': trechos = [(None, -DOOR_HALF), (DOOR_HALF, None)]
    for t0, t1 in trechos:
        layer(side, 4.5, 4.65, 0, SKIRT_TOP, TERRA, t0=t0, t1=t1)
        layer(side, 4.5, 4.58, SKIRT_TOP, BAND_TOP, GRAPHITE, t0=t0, t1=t1)
        layer(side, 4.2, 4.19, 0, .95, TERRA, parts['Interior'], t0=t0, t1=t1)
        layer(side, 4.2, 4.18, 0, .1, GRAPHITE, parts['Interior'], t0=t0, t1=t1)
        layer(side, 4.2, 4.18, .95, 1.0, GRAPHITE, parts['Interior'], t0=t0, t1=t1)
    layer(side, 4.5, 4.52, 2.69, 2.73, TRIM)
    if side != 'Wall_S': layer(side, 4.2, 4.5, 0, WALL_TOP, CREAM)
x0, x1, z0, z1 = WINDOW
layer('Wall_S', 4.2, 4.5, 0, WALL_TOP, CREAM, t0=None, t1=x0)
layer('Wall_S', 4.2, 4.5, 0, z0, CREAM, t0=x0, t1=x1)
layer('Wall_S', 4.2, 4.5, z1, WALL_TOP, CREAM, t0=x0, t1=x1)
layer('Wall_S', 4.2, 4.5, 0, WALL_TOP, CREAM, t0=x1, t1=-DOOR_HALF)
layer('Wall_S', 4.2, 4.5, HEADER, WALL_TOP, CREAM, t0=-DOOR_HALF, t1=DOOR_HALF)
layer('Wall_S', 4.2, 4.5, 0, WALL_TOP, CREAM, t0=DOOR_HALF, t1=None)
for sx, sy, wall in [(1, -1, 'Wall_E'), (1, 1, 'Wall_N'), (-1, 1, 'Wall_W'), (-1, -1, 'Wall_S')]:
    chamfer(sx, sy, 4.2, 4.5, 0, WALL_TOP, CREAM, parts[wall])
    chamfer(sx, sy, 4.5, 4.65, 0, SKIRT_TOP, TERRA, parts[wall])
    chamfer(sx, sy, 4.5, 4.58, SKIRT_TOP, BAND_TOP, GRAPHITE, parts[wall])
    chamfer(sx, sy, 4.65, 4.8, 0, .85, TERRA, parts[wall])  # placa de quina
    chamfer(sx, sy, 4.5, 4.52, 2.69, 2.73, TRIM, parts[wall])
    chamfer(sx, sy, 4.2, 4.19, 0, .95, TERRA, parts['Interior'])


def buttress(side, t):
    """Contraforte inclinado do embasamento, mesmo perfil da Cafeteria."""
    tangent, normal = SIDES[side]
    profile = [(4.65, 0), (4.99, 0), (4.99, .22), (4.73, 1.06), (4.65, 1.1)]
    at = lambda s, h, z: (tangent[0] * s + normal[0] * h, tangent[1] * s + normal[1] * h, z)
    P = parts[side]; a, b = t - .14, t + .14
    n = len(profile)
    P.face([at(a, *q) for q in profile] if (tangent[0] * normal[1] - tangent[1] * normal[0]) < 0 else [at(a, *q) for q in reversed(profile)], TERRA)
    P.face([at(b, *q) for q in reversed(profile)] if (tangent[0] * normal[1] - tangent[1] * normal[0]) < 0 else [at(b, *q) for q in profile], TERRA)
    for i in range(n):
        j = (i + 1) % n
        q = [at(a, *profile[i]), at(a, *profile[j]), at(b, *profile[j]), at(b, *profile[i])]
        P.face(q if (tangent[0] * normal[1] - tangent[1] * normal[0]) > 0 else q[::-1], TERRA)


BUTTRESSES = [('Wall_S', -2.75), ('Wall_E', -3.1), ('Wall_E', 3.0), ('Wall_N', -2.6), ('Wall_N', 2.6), ('Wall_W', -2.6), ('Wall_W', 2.6)]
for side, t in BUTTRESSES: buttress(side, t)


# Equipamentos do autor. Tudo o que é casca antiga fica de fora.
def inside(box, a, b):
    return all(a[i] - .011 <= box[i] and box[i + 3] <= b[i] + .011 for i in range(3))


def wall_s(box, n):
    if inside(box, (-1.16, -4.63, 1.34), (.36, -4.08, 2.52)) and n != 8 or inside(box, (-1.06, -4.37, 1.44), (.26, -4.33, 2.21)) or inside(box, (-.96, -4.55, 2.32), (.16, -4.5, 2.52)) or inside(box, (-.66, -4.4, 1.44), (-.14, -4.3, 2.21)) or inside(box, (-1.11, -4.22, 1.39), (.31, -4.08, 1.46)):
        return (-2.2, 0, 0)  # janela e faixa de alerta, à esquerda da porta
    if inside(box, (.59, -4.83, 1.97), (1.24, -3.56, 3.63)) and n > 4: return (1.5, 0, 0)  # caixa e dutos
    if inside(box, (-3.44, -4.59, 2.19), (-2.86, -4.5, 2.62)): return (6.35, 0, 0)  # grelha
    if inside(box, (2.74, -4.65, 1.03), (3.06, -4.5, 1.47)): return (0, 0, .6)  # painel, acima da faixa
    if inside(box, (3.33, -4.54, 2.8), (3.57, -4.5, 2.9)) or inside(box, (-3.57, -4.54, 2.8), (-3.33, -4.5, 2.9)): return (0, 0, -.2)  # luzes
    return None


def wall_n(box, n):
    if inside(box, (-1.99, 4.49, 2.06), (-1.21, 4.59, 2.54)): return (0, 0, 0)  # grelha
    if inside(box, (-1.21, 4.1, 1.19), (1.21, 4.21, 2.21)): return (0, 0, 0)  # painel de ferramentas
    if inside(box, (3.33, 4.5, 2.8), (3.57, 4.55, 2.9)) or inside(box, (-3.57, 4.5, 2.8), (-3.33, 4.55, 2.9)): return (0, 0, -.2)
    return None


def wall_w(box, n):
    if inside(box, (-4.59, -.39, 2.06), (-4.5, .39, 2.54)): return (0, 0, 0)  # grelha
    if inside(box, (-4.54, -1.21, .55), (-4.5, 1.21, .69)): return (-.06, 0, .6)  # faixa de alerta, sobre a faixa grafite
    if inside(box, (-4.54, -3.57, 2.8), (-4.5, -3.33, 2.9)) or inside(box, (-4.54, 3.33, 2.8), (-4.5, 3.57, 2.9)): return (0, 0, -.2)
    return None


def wall_e(box, n):
    if n > 4 and box[3] >= 4.53 and box[0] >= 4.44 and box[5] <= 2.44 and not inside(box, (4.49, -3.8, 0), (4.63, 3.8, .6)) and box[4] - box[1] < 3 and box[5] - box[2] < 2.2:
        return (0, 0, 0)  # emissor neon, bomba e painel
    if inside(box, (4.51, -3.57, 2.8), (4.54, -3.33, 2.9)) or inside(box, (4.51, 3.33, 2.8), (4.54, 3.57, 2.9)): return (0, 0, -.2)
    return None


def furniture(box, n):
    if inside(box, (0, -1.2, -.01), (.4, -.8, .65)): return None  # banquinho no meio da sala, retirado a pedido do autor
    return (-.12, -.12, 0) if box[0] > 2.8 and box[1] > 2.6 else (0, 0, 0)  # fabricadora, afastada do chanfro


def exterior(box, n):
    return (.85, -.2, 0) if box[0] >= 2.34 else (1.0, 0, 0)  # livra a frente da porta


kept = {
    'Wall_S': parts['Wall_S'].keep(bpy.data.objects['Wall_S'], wall_s),
    'Wall_N': parts['Wall_N'].keep(bpy.data.objects['Wall_N'], wall_n),
    'Wall_W': parts['Wall_W'].keep(bpy.data.objects['Wall_W'], wall_w),
    'Wall_E': parts['Wall_E'].keep(bpy.data.objects['Wall_E'], wall_e),
    'Furniture': parts['Furniture'].keep(bpy.data.objects['Furniture'], furniture),
    'Exterior': parts['Exterior'].keep(bpy.data.objects['Exterior'], exterior),
}

# Telhado de quatro águas: beiral octogonal a 2,75 m e topo plano a 4 m, como na Cafeteria.
R = parts['Building_Roof']
EAVE, TOP, TOP_Z = 4.6, 2.2, 4.0
octagon = lambda h, c, z: [(h - c, -h, z), (h, -h + c, z), (h, h - c, z), (h - c, h, z), (-h + c, h, z), (-h, h - c, z), (-h, -h + c, z), (-h + c, -h, z)]
low, high = octagon(EAVE, .74, WALL_TOP), octagon(TOP, .3, TOP_Z)
for i in range(8):
    j = (i + 1) % 8
    R.face([low[i], low[j], high[j], high[i]], CREAM)
R.face(high, CREAM)
R.face(list(reversed(low)), (0, 5))
# Painel escuro com nervuras, no mesmo tom dos painéis aprovados.
def roof_box(x0, x1, y0, y1, z0, z1, cell):
    ring = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    R.solid([(*p, z0) for p in ring], [(*p, z1) for p in ring], cell)
roof_box(-1.7, 1.7, .15, 1.95, TOP_Z - .02, TOP_Z + .04, CREAM)
roof_box(-1.6, 1.6, .25, 1.85, TOP_Z + .04, TOP_Z + .06, DARK)
for k in range(9): roof_box(-1.55, 1.55, .3 + k * .17, .36 + k * .17, TOP_Z + .06, TOP_Z + .09, GRAPHITE)


def roof_items(box, n):
    # Escotilha com braço robótico sobre o topo; chaminé na água leste; faixa de alerta no topo.
    if inside(box, (-3.06, -3.06, 3.37), (-1.26, -1.55, 4.48)) and box[0] < -1.2: return (2.2, 1.25, .62)
    if inside(box, (2.6, 1.49, 3.37), (3.2, 2.11, 4.17)): return (0, 0, .25)
    if inside(box, (3.61, -1.21, 3.37), (3.89, 1.21, 3.45)): return (-1.7, 0, .62)
    return None


kept['Building_Roof'] = R.keep(bpy.data.objects['Building_Roof'], roof_items)
for name, part in parts.items(): part.write(bpy.data.objects[name])

# Piso e pad só existem na fonte: o runtime os retira e usa o pavimento comum.
floor = bpy.data.objects['Building_Floor']
pad = floor.copy(); pad.data = floor.data.copy(); pad.name = 'Building_Pad'; pad.data.name = 'Building_Pad'
workshop_scene.collection.objects.link(pad) if not floor.users_collection else floor.users_collection[0].objects.link(pad)
pad.parent = floor.parent


def set_collider(name, center, half, angle=0, parent=None):
    o = bpy.data.objects.get(name)
    if not o:
        o = bpy.data.objects.new(name, None); floor.users_collection[0].objects.link(o)
        o.empty_display_type = 'CUBE'; o.empty_display_size = .2
    o.parent = parent or bpy.data.objects['Colliders']
    o.matrix_world = Matrix.Translation(center) @ Matrix.Rotation(angle, 4, 'Z') @ Matrix.Diagonal((*half, 1))
    return o


for o in list(bpy.data.objects['Colliders'].children):
    if o.name.startswith(('COL_Corner', 'COL_Wall')): bpy.data.objects.remove(o, do_unlink=True)
wall_half = diag(4.35) - 4.35
set_collider('COL_Wall_N_0', (0, 4.35, 1.25), (wall_half, .21, 1.25))
set_collider('COL_Wall_E_0', (4.35, 0, 1.25), (.21, wall_half, 1.25))
set_collider('COL_Wall_W_0', (-4.35, 0, 1.25), (.21, wall_half, 1.25))
south = ((wall_half - DOOR_HALF) / 2, (wall_half + DOOR_HALF) / 2)
set_collider('COL_Wall_S_0', (-south[1], -4.35, 1.25), (south[0], .21, 1.25))
set_collider('COL_Wall_S_1', (south[1], -4.35, 1.25), (south[0], .21, 1.25))
for name, sx, sy, angle in [('COL_Corner_E', 1, -1, math.pi / 4), ('COL_Corner_N', 1, 1, -math.pi / 4), ('COL_Corner_W', -1, 1, math.pi / 4), ('COL_Corner_S', -1, -1, -math.pi / 4)]:
    set_collider(name, (sx * 4.15, sy * 4.15, 1.25), (.62, .3, 1.25), angle)
for i, (side, t) in enumerate(BUTTRESSES):
    p = plan(side, t, 4.82)
    half = (.14, .17, 1.25) if side in ('Wall_S', 'Wall_N') else (.17, .14, 1.25)
    set_collider(f'COL_Buttress_{i}', (p[0], p[1], 1.25), half)
for name, delta in {'COL_Fabricator': (-.12, -.12, 0), 'COL_Kiosk': (.85, -.2, 0), 'COL_Welding_Bench': (1, 0, 0)}.items():
    bpy.data.objects[name].matrix_world.translation += Vector(delta)

# Porta: kit e clipes idênticos aos dos prédios aprovados, no centro da fachada.
old = bpy.data.objects['Door_South']
for child in list(old.children_recursive): bpy.data.objects.remove(child, do_unlink=True)
bpy.data.objects.remove(old, do_unlink=True)
collection = floor.users_collection[0]
group = bpy.data.objects.new('Door_South', None); collection.objects.link(group); group.parent = root; group.location = (0, -4.35, 0)
for suffix, key in [('L', 'D_Control_S_A'), ('R', 'D_Control_S_B')]:
    data = kit[key].copy(); data.use_fake_user = False
    sx = -1 if suffix == 'L' else 1
    data.transform(Matrix.Translation((-sx * .535, 0, 0))); data.transform(Matrix.Diagonal((.84 / 1.055, 1, 1, 1)))
    leaf = bpy.data.objects.new('DoorS_Leaf' + suffix, data); collection.objects.link(leaf); leaf.parent = group; leaf.location.x = sx * .43
    col = bpy.data.objects.new('COL_DoorS_' + suffix, None); collection.objects.link(col); col.parent = leaf
    col.location = (0, 0, 1.1); col.scale = (.42, .065, 1.1); col.empty_display_type = 'CUBE'; col.empty_display_size = .2
    leaf.location.x = sx * .43; leaf.keyframe_insert(data_path='location', frame=0)
    leaf.location.x = sx * 1.39; leaf.keyframe_insert(data_path='location', frame=24)
    action = leaf.animation_data.action
    for layer_ in action.layers:
        for strip in layer_.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for keyframe in curve.keyframe_points: keyframe.interpolation = 'LINEAR'
    action.name = f'DoorSouth_Open_{suffix}'
    track = leaf.animation_data.nla_tracks.new(); track.name = 'DoorSouth_Open'; track.strips.new(track.name, 0, action)
    leaf.animation_data.action = None; leaf.location.x = sx * .43
for key in ['ARQ_Control_Portal_S', 'PROP_Control_Status_S']:
    data = kit[key].copy(); data.use_fake_user = False; data.transform(Matrix.Diagonal((1.7 / 2.2, 1, 1, 1)))
    o = bpy.data.objects.new('Padrao_' + key + '_South', data); collection.objects.link(o); o.parent = group


def box(name, center, size, tile, parent, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center); o = bpy.context.object; o.name = name
    o.scale = size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('Chanfro', 'BEVEL'); m.width = bevel; m.segments = 1
        bpy.ops.object.modifier_apply(modifier=m.name)
    tile_uv(o.data, tile); o.parent = parent
    return o


def text(body, location, rotation, size, width, tile, parent):
    bpy.ops.object.text_add(location=location); o = bpy.context.object
    o.name = 'Texto_' + body; o.data.body = body; o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'; o.data.size = size; o.data.extrude = .002
    o.rotation_euler = rotation
    bpy.ops.object.convert(target='MESH'); bpy.context.view_layer.update()
    if o.dimensions.x > width: o.scale.x *= width / o.dimensions.x
    tile_uv(o.data, tile); o.parent = parent
    return o


# Placa de fachada, mesmas medidas de padronizar.py.
board = bpy.data.objects.new('Letreiro_Padrao', None); collection.objects.link(board)
board.parent = bpy.data.objects['Wall_S']; board.matrix_world = Matrix.Translation((0, -4.35, 0))
height, center_x = 2.66, .0875
box('Fundo_Letreiro', (0, -.18, height), (3.665, .12, .40), 1, board, .015)
for x, width, tile in [(-.38, 2.65, 0), (1.45, .86, 2)]: box('Placa', (x - center_x, -.28, height), (width, .12, .36), tile, board, .025)
for body, x, width in [(LABEL[0], -.38, 2.48), (LABEL[1], 1.45, .7)]:
    text(body, (x - center_x, -.352, height), (math.pi / 2, 0, 0), .20, width, 1, board)
for x in [-.7, .7]: box('Suporte_Letreiro', (x, -.18, 2.45), (.10, .12, .16), 1, board)

# Letreiros pintados no telhado, como CAFETERIA/FOOD STORAGE.
slope = math.atan2(TOP_Z - WALL_TOP, EAVE - TOP)
mid = (EAVE + TOP) / 2 + .03
mid_z = (WALL_TOP + TOP_Z) / 2 + .025
roof = bpy.data.objects['Building_Roof']
text('WORKSHOP', (0, -mid, mid_z), (slope, 0, 0), .42, 3.6, 1, roof)
for sign, body in [(1, 'FABRICATION'), (-1, 'FABRICATION')]:
    t = text(body, (sign * mid, 0, mid_z), (slope, 0, sign * math.pi / 2), .34, 3.8, 1, roof)

# Mesmo problema de teto: dutos altos da fachada pertencem ao conjunto que desaparece.
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from componentes_estruturais import fix_building
structural_fixes = fix_building('workshop')

# Só a hierarquia do prédio entra no arquivo.
bpy.context.scene.render.fps = 24; bpy.context.scene.frame_start = 0; bpy.context.scene.frame_end = 24; bpy.context.scene.frame_set(0)
hierarchy = {root, *root.children_recursive}
for o in bpy.context.scene.objects: o.select_set(o in hierarchy)
target = ART / 'export/workshop-v002.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_yup=True, export_extras=True)
(ROOT / 'src/assets/buildings/workshop.glb').write_bytes(target.read_bytes())
(ART / 'notas/oficina-v002.json').write_text(json.dumps({
    'id': 'workshop', 'source_sha256': digest(SOURCE), 'sha256': digest(target), 'bytes': target.stat().st_size, 'reference_sha256': digest(REF),
    'structural_fixes_04_11': structural_fixes, 'palette_source_sha256': digest(CAFETERIA), 'label': LABEL[0], 'kept_components': kept,
    'doors': [{'side': 'South', 'plane': [0, -4.35, 0], 'motion': 'sliding', 'width': 1.7}],
    'label_mount': {'source_door': 'South', 'center_height_m': height, 'plate_bottom_m': height - .18, 'plate_front_from_door_m': .34, 'back_from_door_m': .12, 'parent': 'Wall_S'},
}, indent=2, ensure_ascii=False) + '\n')
print('OFICINA', kept, target.stat().st_size)

if RENDER:
    out = ART / 'renders/oficina-v002'
    s = bpy.context.scene; s.render.engine = 'BLENDER_EEVEE'; s.render.resolution_x = s.render.resolution_y = 900
    s.world = bpy.data.worlds.new('w'); s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[0].default_value = (.45, .42, .4, 1)
    for name in ['Building_Floor', 'Building_Pad']: bpy.data.objects[name].hide_render = True
    sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); s.collection.objects.link(sun); sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sun.data.energy = 3
    cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); s.collection.objects.link(cam); s.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 15
    for name, d, hide in [('frente', (.25, -1, .6), False), ('nordeste', (1, 1, .7), False), ('leste', (1, -.4, .45), False), ('interior', (.3, -.6, 1.4), True)]:
        roof.hide_render = hide
        for child in roof.children: child.hide_render = hide
        d = Vector(d).normalized(); c = Vector((0, -.5, 1)); cam.location = c + d * 14; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        s.render.filepath = str(out / f'{name}.png'); bpy.ops.render.render(write_still=True)
