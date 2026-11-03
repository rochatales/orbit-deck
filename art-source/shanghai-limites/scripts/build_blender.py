"""Blender 5.1 · S6.3 Limites de Shanghai: gera fonte .blend e GLB versionado.

Uso: Blender --background --python art-source/shanghai-limites/scripts/build_blender.py

Convenção igual à fase 01: Blender X = x, Y = -z, Z = altura; 1 m.
Os materiais têm os mesmos nomes da fase 01 e cor no GLB.
"""
import bpy, bmesh, json, math, random, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import limites as L

ROOT, ART = L.ROOT, L.ART
GLB = L.RUNTIME / 'shanghai-limites-v001.glb'
BLEND = ART / 'blend/shanghai_limites_v001.blend'
rng = random.Random(6319)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
export = bpy.data.collections.new('01_EXPORT_LIMITES')
scene.collection.children.link(export)
helpers = bpy.data.collections.new('02_COLISORES_REFERENCIA')
scene.collection.children.link(helpers)

COLORS = {
    'entulho': '#b9ab98',
    'terra': '#80715d',
    'concreto': '#ddddcc',
    'tijolo': '#9c6650',
    'metal': '#4b5250',
    'sombra': '#292c29',
    'azul': '#7e9c9d',
    'terracota': '#bd7056',
    'bege': '#c4b695'
}
mats = {}
for name, col in COLORS.items():
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = True
    c = [int(col[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c]
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*c, 1)
    bs.inputs['Roughness'].default_value = .9
    mats[name] = m


class Batch:
    """Acumula geometria em coordenadas do jogo por material."""
    def __init__(self):
        self.parts = {}

    def add(self, material, verts, faces):
        v, f = self.parts.setdefault(material, ([], []))
        off = len(v)
        v.extend(verts)
        f.extend(tuple(off + i for i in face) for face in faces)

    def build(self, prefix, parent=None):
        objects = []
        for material, (verts, faces) in sorted(self.parts.items()):
            mesh = bpy.data.meshes.new(f'{prefix}_{material}')
            mesh.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
            mesh.update()
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            if prefix.startswith('Limite_Terreno'):
                if sum(f.normal.z for f in bm.faces) < 0:
                    for f in bm.faces: f.normal_flip()
            bm.to_mesh(mesh)
            bm.free()
            mesh.update()

            uv = mesh.uv_layers.new(name='UVMap')
            for poly in mesh.polygons:
                n = poly.normal
                axis = max(range(3), key=lambda k: abs(n[k]))
                axes = [k for k in range(3) if k != axis]
                for li in poly.loop_indices:
                    co = mesh.vertices[mesh.loops[li].vertex_index].co
                    uv.data[li].uv = (co[axes[0]] / 3.0, co[axes[1]] / 3.0)

            obj = bpy.data.objects.new(mesh.name, mesh)
            export.objects.link(obj)
            obj.data.materials.append(mats[material])
            obj['id_estavel'] = mesh.name
            obj['papel'] = 'limite'
            if parent:
                obj.parent = parent
            objects.append(obj)
        return objects


BOX_FACES = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]


def box_verts(cx, cy, cz, w, h, d, yaw=0.0, tilt=0.0, tilt_dir=0.0):
    out = []
    ct, st = math.cos(tilt), math.sin(tilt)
    ax, az = math.cos(tilt_dir), math.sin(tilt_dir)
    for x, y, z in [(-w / 2, -h / 2, -d / 2), (w / 2, -h / 2, -d / 2), (w / 2, -h / 2, d / 2), (-w / 2, -h / 2, d / 2),
                    (-w / 2, h / 2, -d / 2), (w / 2, h / 2, -d / 2), (w / 2, h / 2, d / 2), (-w / 2, h / 2, d / 2)]:
        x, z = x * math.cos(yaw) - z * math.sin(yaw), x * math.sin(yaw) + z * math.cos(yaw)
        dot = x * ax + z * az
        kx, ky, kz = ax, 0.0, az
        cxv, cyv, czv = ky * z - kz * y, kz * x - kx * z, kx * y - ky * x
        rx = x * ct + cxv * st + kx * dot * (1.0 - ct)
        ry = y * ct + cyv * st
        rz = z * ct + czv * st + kz * dot * (1.0 - ct)
        out.append((cx + rx, cy + ry, cz + rz))
    return out


# ---------------------------------------------------------------- Terreno das bordas
terrain = Batch()
nx = int(round(2 * (L.HALF_X + L.OUTER) / L.CELL))
nz = int(round(2 * (L.HALF_Z + L.OUTER) / L.CELL))
x0, z0 = -(L.HALF_X + L.OUTER), -(L.HALF_Z + L.OUTER)
heights = {}
for i in range(nx + 1):
    for j in range(nz + 1):
        x, z = x0 + i * L.CELL, z0 + j * L.CELL
        h = L.height(x, z)
        if h is not None:
            heights[i, j] = h

vid = {}
verts = []
quads = {'entulho': [], 'terra': []}
for i in range(nx):
    for j in range(nz):
        corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if any(c not in heights for c in corners):
            continue
        cx, cz = x0 + (i + .5) * L.CELL, z0 + (j + .5) * L.CELL
        face = []
        for c in corners:
            if c not in vid:
                vid[c] = len(verts)
                verts.append((x0 + c[0] * L.CELL, heights[c], z0 + c[1] * L.CELL))
            face.append(vid[c])
        avg = sum(heights[c] for c in corners) / 4.0
        quads['terra' if avg < .45 else 'entulho'].append(tuple(reversed(face)))

for material, faces in quads.items():
    used = sorted({v for f in faces for v in f})
    remap = {v: k for k, v in enumerate(used)}
    terrain.add(material, [verts[v] for v in used], [tuple(remap[v] for v in f) for f in faces])
terrain_objects = terrain.build('Limite_Terreno')

# ---------------------------------------------------------------- Ruínas (3 prédios altos)
ruin_boxes = []
ruin_objects = {}
for r in L.RUINS:
    rr = random.Random(r['seed'])
    root = bpy.data.objects.new(r['id'], None)
    export.objects.link(root)
    root['id_estavel'] = r['id']
    root['papel'] = 'limite_ruina'
    batch = Batch()
    ncx, ncz = max(2, round(r['w'] / 3.3)), max(2, round(r['d'] / 3.3))
    cw, cd = r['w'] / ncx, r['d'] / ncz
    lowx, lowz = r['low']
    norm = math.hypot(lowx, lowz) or 1.0
    tops = {}
    for i in range(ncx):
        for j in range(ncz):
            u = (i + .5) / ncx * 2.0 - 1.0
            v = (j + .5) / ncz * 2.0 - 1.0
            t = (u * lowx + v * lowz) / norm
            drop = max(0.0, t) * r['floors'] * .55 + rr.uniform(0, 1.6)
            floors = max(1, r['floors'] - int(drop))
            tops[i, j] = floors * L.FLOOR - rr.uniform(0, .9)
    full = max(tops, key=lambda k: tops[k])
    tops[full] = r['floors'] * L.FLOOR

    for (i, j), top in tops.items():
        cx = r['x'] - r['w'] / 2 + (i + .5) * cw
        cz = r['z'] - r['d'] / 2 + (j + .5) * cd
        base = -2.0
        batch.add(r['material'], box_verts(cx, (top + base) / 2, cz, cw, top - base, cd), BOX_FACES)
        broken = top < r['floors'] * L.FLOOR - .5
        tilt = rr.uniform(.04, .22) if broken else 0
        batch.add('concreto', box_verts(cx, top + .12, cz, cw + .35, .3, cd + .35, 0, tilt, rr.uniform(0, 6.28)), BOX_FACES)
        if broken:
            for k in range(rr.randint(3, 6)):
                bx = cx + rr.uniform(-cw / 2.4, cw / 2.4)
                bz = cz + rr.uniform(-cd / 2.4, cd / 2.4)
                ln = rr.uniform(.8, 2.0)
                batch.add('metal', box_verts(bx, top + ln / 2, bz, .05, ln, .05, rr.uniform(0, 6.28), rr.uniform(.1, .6), rr.uniform(0, 6.28)), BOX_FACES)

    # Lajes caídas / vigas expostas
    for (i, j), top in tops.items():
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (i + di, j + dj)
            if n not in tops or tops[n] - top < L.FLOOR * 1.5:
                continue
            level = top + L.FLOOR * rr.randint(1, max(1, int((tops[n] - top) / L.FLOOR) - 1))
            cx = r['x'] - r['w'] / 2 + (i + .5) * cw + di * cw * .3
            cz = r['z'] - r['d'] / 2 + (j + .5) * cd + dj * cd * .3
            batch.add('concreto', box_verts(cx, level, cz, cw * (.55 if di else .95), .25, cd * (.55 if dj else .95), 0,
                                            rr.uniform(.15, .45), math.atan2(dj, di) + math.pi / 2), BOX_FACES)

    ruin_objects[r['id']] = batch.build(r['id'], root)
    ruin_boxes.append((r['x'] - r['w'] / 2 - 2, r['x'] + r['w'] / 2 + 2, r['z'] - r['d'] / 2 - 2, r['z'] + r['d'] / 2 + 2))

# ---------------------------------------------------------------- Detritos e entulhos ao longo da berma
debris = Batch()
KINDS = [('laje', .38), ('bloco', .25), ('tijolo', .15), ('vergalhao', .13), ('viga', .09)]


def pick():
    t = rng.random()
    for k, w in KINDS:
        if t < w: return k
        t -= w
    return KINDS[-1][0]


def try_place(x, z, kind, scale=1.0):
    ground = L.height(x, z)
    if ground is None: return False
    yaw = rng.uniform(0, 6.28)
    tdir = rng.uniform(0, 6.28)
    if kind == 'laje':
        mat, dims, tilt = 'concreto', (rng.uniform(1, 3), rng.uniform(.2, .35), rng.uniform(.6, 2)), rng.uniform(0, .6)
    elif kind == 'bloco':
        mat, dims, tilt = rng.choice(['entulho', 'concreto']), (rng.uniform(.5, 1.4), rng.uniform(.4, 1.0), rng.uniform(.5, 1.3)), rng.uniform(0, .5)
    elif kind == 'tijolo':
        mat, dims, tilt = 'tijolo', (rng.uniform(.5, 1.1), rng.uniform(.25, .5), rng.uniform(.3, .7)), rng.uniform(0, .4)
    elif kind == 'vergalhao':
        mat, dims, tilt = 'metal', (.05, rng.uniform(1, 2.2), .05), rng.uniform(.3, .9)
    else:
        mat, dims, tilt = 'metal', (.22, .32, rng.uniform(2, 3.6)), rng.uniform(.05, .5)

    w, h, d = (v * scale for v in dims)
    vs = box_verts(0, 0, 0, w, h, d, yaw, tilt, tdir)
    low = min(v[1] for v in vs)
    lift = ground - .08 - low
    vs = [(x + vx, vy + lift, z + vz) for vx, vy, vz in vs]
    debris.add(mat, vs, BOX_FACES)
    return True


placed = 0
for n in range(4000):
    if placed >= 480: break
    x = rng.uniform(-L.HALF_X - L.OUTER + 2, L.HALF_X + L.OUTER - 2)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 2, L.HALF_Z + L.OUTER - 2)
    e = L.outside(x, z)
    cmd = L.corner_mound_d(x, z)
    # Coloca nas bermas externas ou nos morros das esquinas frontais
    ok = 1.0 <= e <= L.OUTER - 3.5 or (cmd is not None and cmd <= L.CORNER_RADIUS and e <= 0)
    if not ok: continue
    if any(a <= x <= b and c <= z <= f for a, b, c, f in ruin_boxes): continue
    placed += try_place(x, z, pick())

# Pé dos prédios altos: entulhos concentrados
for r in L.RUINS:
    for k in range(25):
        side = rng.random() * 4.0
        t = rng.uniform(-.5, .5)
        off = rng.uniform(.6, 3.2)
        if side < 1: x, z = r['x'] + t * r['w'], r['z'] - r['d'] / 2 - off
        elif side < 2: x, z = r['x'] + t * r['w'], r['z'] + r['d'] / 2 + off
        elif side < 3: x, z = r['x'] - r['w'] / 2 - off, r['z'] + t * r['d']
        else: x, z = r['x'] + r['w'] / 2 + off, r['z'] + t * r['d']
        if L.outside(x, z) < 1.0: continue
        placed += try_place(x, z, rng.choice(['laje', 'bloco', 'bloco', 'viga']), 1.1)

debris_objects = debris.build('Limite_Detritos')

# ---------------------------------------------------------------- Colisores de referência no blend
data = L.runtime_data()
for c in data['colliders']:
    o = bpy.data.objects.new(c['id'], None)
    helpers.objects.link(o)
    o.empty_display_type = 'CUBE'
    o.location = ((c['minX'] + c['maxX']) / 2, -(c['minZ'] + c['maxZ']) / 2, (c['minY'] + c['maxY']) / 2)
    o.scale = ((c['maxX'] - c['minX']) / 2, (c['maxZ'] - c['minZ']) / 2, (c['maxY'] - c['minY']) / 2)
    o.hide_render = True

# ---------------------------------------------------------------- Exportação GLB e salvamento do .blend
bpy.ops.object.select_all(action='DESELECT')
for o in export.objects:
    o.select_set(True)

L.RUNTIME.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(GLB),
    use_selection=True,
    export_format='GLB',
    export_extras=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_apply=True
)

tris = {}
for o in export.objects:
    if o.type != 'MESH': continue
    o.data.calc_loop_triangles()
    key = o.parent.name if o.parent else o.name
    tris[key] = tris.get(key, 0) + len(o.data.loop_triangles)

(L.RUNTIME / 'limites.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
BLEND.parent.mkdir(parents=True, exist_ok=True)
(ART / 'notas').mkdir(parents=True, exist_ok=True)

scene['autor'] = 'Antigravity / Codex — S6.3 limites'
scene['convencao'] = 'Blender X=x, Y=-z, Z=altura; 1m'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

asset = dict(
    version=L.VERSION,
    triangles=sum(tris.values()),
    trianglesByNode=tris,
    debris=placed,
    materials=sorted({m.name for o in export.objects if o.type == 'MESH' for m in o.data.materials}),
    colliders=len(data['colliders']),
    glbBytes=GLB.stat().st_size
)
(ART / 'notas/asset.json').write_text(json.dumps(asset, indent=2, ensure_ascii=False) + '\n')
print('BUILD_SUCCESS:', json.dumps(asset, ensure_ascii=False))
