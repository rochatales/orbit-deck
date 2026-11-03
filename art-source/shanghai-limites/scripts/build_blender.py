"""Blender 5.1 · S6.3 Limites de Shanghai v004: folha de estudo A/B/C/D, versão leve.

Uso: Blender --background --python art-source/shanghai-limites/scripts/build_blender.py

- A · Prédio em colapso: grade de pilares, lajes por vão com panquecas caídas,
  fachada de fundo com janelas vazadas, corte interior virado para o mapa,
  escada em zigue-zague, divisórias de tijolo e vergalhões nas bordas fraturadas.
- B · Pilha de escombros: berma em camadas de contorno, lajes sobrepostas,
  aglomerados de alvenaria, vigas I, vergalhões dobrados e espirais de arame.
- C · Veículos: ônibus carbonizado procedural nas saídas das avenidas; carros
  reaproveitam o rusted-car.glb do mapa em runtime (limites.json → wrecks).
- D · Corredor: cada avenida termina em barricada de carcaças e entulho.

Sem imagens no GLB: os nomes dos materiais coincidem com os materiais
texturizados da fase 01 e o runtime troca pelos já carregados (zero textura extra).
"""
import bpy, bmesh, json, math, random, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import limites as L

ROOT, ART = L.ROOT, L.ART
GLB = L.RUNTIME / 'shanghai-limites-v001.glb'
BLEND = ART / 'blend/shanghai_limites_v001.blend'
rng = random.Random(6319)
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
export = bpy.data.collections.new('01_EXPORT_LIMITES')
scene.collection.children.link(export)
helpers = bpy.data.collections.new('02_COLISORES_REFERENCIA')
scene.collection.children.link(helpers)

# ---------------------------------------------------------------- Materiais chapados (nomes = fase 01)
MATERIAL_DEFS = {
    'asfalto': ('#3a3c3e', 0.92, 0.0),
    'terra': ('#544636', 0.95, 0.0),
    'entulho': ('#a89f8c', 0.88, 0.0),
    'concreto': ('#c9c4b8', 0.80, 0.0),
    'calcada': ('#b8b5a0', 0.82, 0.0),
    'tijolo': ('#9c5038', 0.88, 0.0),
    'metal': ('#3a3d3e', 0.50, 0.75),
    'sombra': ('#1c1d1e', 0.96, 0.0),
    'azul': ('#6c8a8c', 0.85, 0.0),
    'terracota': ('#b05e46', 0.85, 0.0),
    'bege': ('#bca984', 0.85, 0.0),
    'ferrugem': ('#5b3a2b', 0.78, 0.35),
}


def srgb(hex_c):
    c = [int(hex_c[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c]


mats = {}
for name, (color, rough, metal) in MATERIAL_DEFS.items():
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*srgb(color), 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    mats[name] = m


class Batch:
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
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            if prefix.startswith('Limite_Terreno'):
                # Campo de alturas: toda face aponta para cima, inclusive o chão externo isolado.
                for f in bm.faces:
                    f.normal_update()
                    if f.normal.z < 0: f.normal_flip()
            bm.to_mesh(mesh)
            bm.free()
            mesh.update()
            # Terreno e vergalhões suaves: menos vértices duplicados no GLB e tubos mais redondos.
            if prefix.startswith('Limite_Terreno') or material == 'metal':
                mesh.shade_smooth()
            # UV triplanar em metros, mesma escala que os materiais texturizados da fase 01 esperam.
            uv = mesh.uv_layers.new(name='UVMap')
            scale = 4.0 if material in ('asfalto', 'calcada') else 3.0
            for poly in mesh.polygons:
                n = poly.normal
                axis = max(range(3), key=lambda k: abs(n[k]))
                axes = [k for k in range(3) if k != axis]
                for li in poly.loop_indices:
                    co = mesh.vertices[mesh.loops[li].vertex_index].co
                    uv.data[li].uv = (co[axes[0]] / scale, co[axes[1]] / scale)
            obj = bpy.data.objects.new(mesh.name, mesh)
            export.objects.link(obj)
            obj.data.materials.append(mats[material])
            obj['id_estavel'] = mesh.name
            obj['papel'] = 'limite'
            if parent:
                obj.parent = parent
            objects.append(obj)
        return objects


# ---------------------------------------------------------------- Primitivas leves
BOX_FACES = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
WEDGE_FACES = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]


def rotate(x, y, z, yaw, tilt, tdir):
    x, z = x * math.cos(yaw) - z * math.sin(yaw), x * math.sin(yaw) + z * math.cos(yaw)
    if not tilt:
        return x, y, z
    ct, st = math.cos(tilt), math.sin(tilt)
    kx, kz = math.cos(tdir), math.sin(tdir)
    dot = x * kx + z * kz
    cxv, cyv, czv = -kz * y, kz * x - kx * z, kx * y
    return (x * ct + cxv * st + kx * dot * (1 - ct), y * ct + cyv * st, z * ct + czv * st + kz * dot * (1 - ct))


def box_verts(cx, cy, cz, w, h, d, yaw=0.0, tilt=0.0, tdir=0.0, jitter=0.0):
    out = []
    for i, (x, y, z) in enumerate([(-w / 2, -h / 2, -d / 2), (w / 2, -h / 2, -d / 2), (w / 2, -h / 2, d / 2), (-w / 2, -h / 2, d / 2),
                                   (-w / 2, h / 2, -d / 2), (w / 2, h / 2, -d / 2), (w / 2, h / 2, d / 2), (-w / 2, h / 2, d / 2)]):
        if jitter and i >= 4:
            x += rng.uniform(-jitter, jitter) * w
            y += rng.uniform(-jitter, jitter) * h * 2
            z += rng.uniform(-jitter, jitter) * d
        rx, ry, rz = rotate(x, y, z, yaw, tilt, tdir)
        out.append((cx + rx, cy + ry, cz + rz))
    return out


def chunk(batch, material, x, y, z, w, h, d):
    """Fragmento de 8 triângulos (prisma triangular irregular): mais barato que uma caixa."""
    yaw, tilt, tdir = rng.uniform(0, TAU), rng.uniform(0.05, 0.45), rng.uniform(0, TAU)
    base = [(-w / 2, 0, -d / 2), (w / 2, 0, -d / 2 + rng.uniform(-.2, .2) * d), (rng.uniform(-.3, .3) * w, 0, d / 2)]
    pts = base + [(bx * .7, h * rng.uniform(.6, 1.0), bz * .7) for bx, _, bz in base]
    batch.add(material, [(x + a, y + b - h * .25, z + c) for a, b, c in (rotate(*p, yaw, tilt, tdir) for p in pts)], WEDGE_FACES)


def rod(batch, material, points, r=0.035):
    """Vergalhão/arame: tubo de seção triangular ao longo de uma polilinha (6 triângulos por trecho)."""
    rings = []
    for i, p in enumerate(points):
        a = points[max(0, i - 1)]
        b = points[min(len(points) - 1, i + 1)]
        t = [b[k] - a[k] for k in range(3)]
        n = math.sqrt(sum(v * v for v in t)) or 1.0
        t = [v / n for v in t]
        up = (0.0, 1.0, 0.0) if abs(t[1]) < 0.9 else (1.0, 0.0, 0.0)
        u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]
        un = math.sqrt(sum(v * v for v in u)) or 1.0
        u = [v / un for v in u]
        w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        rings.append([tuple(p[k] + r * (math.cos(a2) * u[k] + math.sin(a2) * w[k]) for k in range(3)) for a2 in (0, TAU / 3, 2 * TAU / 3)])
    verts = [v for ring in rings for v in ring]
    faces = []
    for i in range(len(rings) - 1):
        for k in range(3):
            a, b = i * 3 + k, i * 3 + (k + 1) % 3
            faces.append((a, b, b + 3, a + 3))
    batch.add(material, verts, faces)


def bent_rebar(batch, x, y, z, length, heading, rise):
    """Vergalhão saindo de uma fratura e dobrando para baixo (dois trechos)."""
    hx, hz = math.cos(heading), math.sin(heading)
    k = length * rng.uniform(.45, .6)
    p0 = (x, y, z)
    p1 = (x + hx * k, y + rise * k, z + hz * k)
    droop = rng.uniform(.25, .7)
    p2 = (p1[0] + hx * (length - k) * .8, p1[1] - droop, p1[2] + hz * (length - k) * .8)
    rod(batch, 'metal', [p0, p1, p2])


def wire_spiral(batch, x, y, z, radius=0.45, turns=2.2, length=1.6):
    heading = rng.uniform(0, TAU)
    hx, hz = math.cos(heading), math.sin(heading)
    steps = 14
    pts = []
    for i in range(steps + 1):
        t = i / steps
        a = t * turns * TAU
        s = t * length - length / 2
        pts.append((x + hx * s - hz * math.cos(a) * radius, y + radius + math.sin(a) * radius * .8, z + hz * s + hx * math.cos(a) * radius))
    rod(batch, 'metal', pts, r=0.018)


def i_beam(batch, x, y, z, length, yaw, tilt, tdir):
    """Viga I de aço: mesa superior, alma e mesa inferior."""
    for oy, w, h in ((0.17, 0.32, 0.05), (0.0, 0.05, 0.3), (-0.17, 0.32, 0.05)):
        dx, dy, dz = rotate(0, oy, 0, yaw, tilt, tdir)
        batch.add('metal', box_verts(x + dx, y + dy, z + dz, w, h, length, yaw, tilt, tdir), BOX_FACES)


# ---------------------------------------------------------------- A · Prédio de apartamentos em colapso
def build_collapsed_apartment(r):
    batch = Batch()
    W, D, floors = r['w'], r['d'], r['floors']
    F = L.FLOOR
    fx, fz = (0.0, -1.0) if r['z'] > 0 else (0.0, 1.0)  # corte interior virado para o mapa
    yaw = math.atan2(-fx, fz)
    ux, uz = math.cos(yaw), math.sin(yaw)
    low = -1.0 if r['x'] * ux < 0 else 1.0               # lado que desaba fica voltado ao centro
    if r['x'] == 0:
        low = 1.0
    local_rng = random.Random(r['seed'])

    def at(u, v):
        return r['x'] + u * ux - v * math.sin(yaw), r['z'] + u * uz + v * math.cos(yaw)

    def box(material, u, y, v, w, h, d, tilt=0.0, tdir=0.0, extra_yaw=0.0):
        x, z = at(u, v)
        batch.add(material, box_verts(x, y, z, w, h, d, yaw + extra_yaw, tilt, tdir), BOX_FACES)

    bays_u, bays_v = max(3, round(W / 3.3)), 3
    bu, bv = W / bays_u, D / bays_v
    # Perfil de colapso: cheio no lado externo, descendo em degraus para o lado do mapa.
    def floors_at(iu):
        t = (iu + .5) / bays_u
        t = t if low > 0 else 1 - t
        drop = 0.55 * t * t * (3 - 2 * t)
        return max(2, min(floors, round(floors * (1 - drop)) - (1 if local_rng.random() < .25 else 0)))

    bay_floors = [floors_at(iu) for iu in range(bays_u)]
    node_floors = [max(bay_floors[max(0, iu - 1)], bay_floors[min(bays_u - 1, iu)]) for iu in range(bays_u + 1)]

    # Pilares da grade; a fileira da frente perde pilares (fachada arrancada).
    for iu in range(bays_u + 1):
        for iv in range(bays_v + 1):
            n = node_floors[iu] - (local_rng.randint(1, 2) if iv == bays_v else 0)
            if n <= 0:
                continue
            u, v = -W / 2 + iu * bu, -D / 2 + iv * bv
            h = n * F - local_rng.uniform(0, 1.2)
            box(r['material'] if iv == 0 else 'concreto', u, h / 2, v, 0.42, h, 0.42)
            if iv == bays_v or local_rng.random() < .35:  # topo fraturado com vergalhão
                x, z = at(u, v)
                for _ in range(2):
                    bent_rebar(batch, x, h, z, local_rng.uniform(.6, 1.1), local_rng.uniform(0, TAU), 1.4)

    # Lajes por vão: furos, bordas da frente quebradas e panqueca caída no último piso.
    for iu in range(bays_u):
        for fl in range(1, bay_floors[iu] + 1):
            y = fl * F - 0.14
            for iv in range(bays_v):
                if local_rng.random() < .12 and fl > 1:
                    continue
                u, v = -W / 2 + (iu + .5) * bu, -D / 2 + (iv + .5) * bv
                front = iv == bays_v - 1
                d = bv * (local_rng.uniform(.45, .85) if front else 1.0)
                vv = v - (bv - d) / 2
                last = fl == bay_floors[iu]
                if last and local_rng.random() < .55:
                    # Laje desabada pendurada por um lado (Study A, fase 2).
                    box('concreto', u, y - 1.1, vv, bu * .95, 0.26, d, tilt=local_rng.uniform(.35, .7), tdir=yaw + (0 if local_rng.random() < .5 else math.pi))
                else:
                    box('concreto', u, y, vv, bu, 0.28, d)
                if front:
                    x, z = at(u, vv + d / 2)
                    for k in range(3):
                        bent_rebar(batch, x + (k - 1) * bu * .3 * ux, y, z + (k - 1) * bu * .3 * uz, local_rng.uniform(.7, 1.4), math.atan2(math.cos(yaw), -math.sin(yaw)) + local_rng.uniform(-.5, .5), -.2)

    # Fachada de fundo com janelas vazadas: peitoris + vergas + montantes.
    for iu in range(bays_u):
        u = -W / 2 + (iu + .5) * bu
        for fl in range(bay_floors[iu]):
            y0 = fl * F
            box(r['material'], u, y0 + 0.5, -D / 2, bu, 1.0, 0.3)         # peitoril
            box(r['material'], u, y0 + F - 0.35, -D / 2, bu, 0.7, 0.3)     # verga
            box(r['material'], u - bu * .36, y0 + 1.6, -D / 2, bu * .28, 1.2, 0.3)
            box(r['material'], u + bu * .36, y0 + 1.6, -D / 2, bu * .28, 1.2, 0.3)
            box('sombra', u, y0 + 1.6, -D / 2 + 0.22, bu * .45, 1.2, 0.06)  # interior escuro atrás da janela
    # Empenas laterais: cheias até o perfil, com borda serrilhada de tijolo.
    for side, iu in ((-1, 0), (1, bays_u - 1)):
        n = bay_floors[iu]
        for iv in range(bays_v):
            v = -D / 2 + (iv + .5) * bv
            h = (n - (iv == bays_v - 1)) * F - local_rng.uniform(0, 1.5)
            box(r['material'], side * W / 2, h / 2, v, 0.3, h, bv)
            box('tijolo', side * W / 2, h + 0.2, v, 0.32, 0.45, bv * local_rng.uniform(.4, .9), tilt=.2, tdir=yaw)

    # Divisórias internas de tijolo e escada em zigue-zague no vão mais alto.
    tall = max(range(bays_u), key=lambda i: bay_floors[i])
    su = -W / 2 + (tall + .5) * bu
    for fl in range(bay_floors[tall] - 1):
        y0 = fl * F
        dir_s = 1 if fl % 2 == 0 else -1
        run = bv * 1.2
        box('concreto', su + dir_s * bu * .2, y0 + F / 2, -D / 2 + bv * .9, bu * .38, 0.2, run, tilt=math.atan2(F, run) * dir_s, tdir=yaw + math.pi / 2)
        box('concreto', su, y0 + F - 0.1, -D / 2 + bv * .2, bu * .8, 0.2, 1.0)  # patamar
    for iu in range(bays_u):
        for fl in range(bay_floors[iu] - 1):
            if local_rng.random() < .45:
                u = -W / 2 + iu * bu + bu * local_rng.uniform(.3, .7)
                box('tijolo', u, fl * F + 1.5, -D / 2 + bv * 1.5, 0.18, F - 0.6, bv * local_rng.uniform(.6, 1.1), extra_yaw=math.pi / 2 * (iu % 2))

    # Talude de escombros na frente aberta (lajes, tijolo e vigas).
    for k in range(16):
        u = local_rng.uniform(-W * .5, W * .5)
        v = D / 2 + local_rng.uniform(0.2, 3.8)
        x, z = at(u, v)
        gh = L.surface(x, z) + 0.15
        batch.add('concreto', box_verts(x, gh + .2, z, local_rng.uniform(1.4, 2.8), .26, local_rng.uniform(1.0, 2.0), local_rng.uniform(0, TAU), local_rng.uniform(.2, .55), local_rng.uniform(0, TAU)), BOX_FACES)
        if k % 2 == 0:
            chunk(batch, 'tijolo', x + .4, gh + .2, z + .3, local_rng.uniform(.8, 1.5), local_rng.uniform(.4, .8), local_rng.uniform(.7, 1.3))
        if k % 5 == 0:
            i_beam(batch, x, gh + .45, z, local_rng.uniform(2.5, 4.0), local_rng.uniform(0, TAU), local_rng.uniform(.15, .4), local_rng.uniform(0, TAU))
    return batch


# ---------------------------------------------------------------- C · Ônibus carbonizado
def add_burnt_bus(batch, b):
    x0, z0 = b['x'], b['z']
    y0 = L.surface(x0, z0) - 0.25
    yaw, roll, pitch = b['yaw'], b['roll'], b['pitch']
    Lb, Wb, Hb = 9.8, 2.5, 2.9

    def piece(material, lx, ly, lz, w, h, d):
        px, py, pz = rotate(lx, ly, lz, 0, roll, 0)
        px, py, pz = rotate(px, py, pz, 0, pitch, math.pi / 2)
        px, py, pz = rotate(px, py, pz, yaw, 0, 0)
        verts = [rotate(*rotate(*rotate(vx - lx, vy - ly, vz - lz, 0, roll, 0), 0, pitch, math.pi / 2), yaw, 0, 0)
                 for vx, vy, vz in box_verts(lx, ly, lz, w, h, d)]
        batch.add(material, [(x0 + px + vx, y0 + py + vy, z0 + pz + vz) for vx, vy, vz in verts], BOX_FACES)

    piece('ferrugem', 0, 0.55, 0, Wb, 0.7, Lb)                 # saia e chassi
    piece('sombra', 0, 1.55, 0, Wb - 0.25, 1.2, Lb - 0.5)       # interior queimado
    windows = 6
    for side in (-1, 1):
        for k in range(windows + 1):
            lz = -Lb / 2 + 0.4 + k * (Lb - 0.8) / windows
            piece('ferrugem', side * (Wb / 2 - 0.06), 1.6, lz, 0.1, 1.2, 0.16)  # montantes das janelas vazias
    piece('ferrugem', 0, 2.3, -0.6, Wb - 0.05, 0.18, Lb - 2.6)  # teto abaulado, aberto na frente
    piece('ferrugem', 0.4, 2.15, Lb / 2 - 1.2, Wb * .5, 0.14, 1.6)  # chapa do teto caída
    piece('ferrugem', 0, 1.2, Lb / 2 - 0.12, Wb, 1.3, 0.22)
    piece('ferrugem', 0, 1.4, -Lb / 2 + 0.12, Wb, 1.7, 0.22)
    for side in (-1, 1):
        for lz in (-Lb * .32, Lb * .3):
            piece('sombra', side * Wb / 2, 0.45, lz, 0.32, 0.8, 0.8)  # rodas carbonizadas


# ---------------------------------------------------------------- B · Terreno em camadas
terrain = Batch()
nx = int(round(2 * (L.HALF_X + L.OUTER) / L.CELL))
nz = int(round(2 * (L.HALF_Z + L.OUTER) / L.CELL))
x0, z0 = -(L.HALF_X + L.OUTER), -(L.HALF_Z + L.OUTER)
heights = {}
for i in range(nx + 1):
    for j in range(nz + 1):
        h = L.height(x0 + i * L.CELL, z0 + j * L.CELL)
        if h is not None:
            heights[i, j] = h

vid, verts = {}, []
quads = {'asfalto': [], 'terra': [], 'entulho': [], 'concreto': []}
for i in range(nx):
    for j in range(nz):
        corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if any(c not in heights for c in corners):
            continue
        face = []
        for c in corners:
            if c not in vid:
                vid[c] = len(verts)
                verts.append((x0 + c[0] * L.CELL, heights[c], z0 + c[1] * L.CELL))
            face.append(vid[c])
        # Material por triângulo com diagonal alternada: a divisa entre manchas fica
        # em 45° e não em degraus de quadra.
        tris_ = ((0, 1, 2), (0, 2, 3)) if (i + j) % 2 == 0 else ((0, 1, 3), (1, 2, 3))
        for tri in tris_:
            cx = sum(x0 + corners[k][0] * L.CELL for k in tri) / 3
            cz = sum(z0 + corners[k][1] * L.CELL for k in tri) / 3
            avg_h = sum(heights[corners[k]] for k in tri) / 3
            e_raw = L.outside_raw(cx, cz)
            # Manchas largas: terra escura domina, entulho nas cristas.
            score = (avg_h / 4.0) * .35 + L.noise(cx, cz, seed=173, scale=11.0) * .55 + L.noise(cx, cz, seed=291, scale=4.5) * .2
            if e_raw <= 0.6:
                mat_choice = 'asfalto' if score < -0.12 else 'terra' if score < 0.22 else 'entulho'
            else:
                mat_choice = 'terra' if score < 0.18 else 'entulho' if score < 0.78 else 'concreto'
            quads[mat_choice].append(tuple(face[k] for k in reversed(tri)))

for material, faces in quads.items():
    if not faces:
        continue
    used = sorted({v for f in faces for v in f})
    remap = {v: k for k, v in enumerate(used)}
    terrain.add(material, [verts[v] for v in used], [tuple(remap[v] for v in f) for f in faces])
# Chão externo: 2 triângulos abaixo de tudo fecham o vazio além da berma, que a
# câmera ortográfica recuada enxergava como céu claro atrás do anel.
FAR = 320.0
terrain.add('terra', [(-FAR, -1.2, -FAR), (FAR, -1.2, -FAR), (FAR, -1.2, FAR), (-FAR, -1.2, FAR)], [(3, 2, 1, 0)])
terrain.build('Limite_Terreno')

# ---------------------------------------------------------------- Ruínas
for r in L.RUINS:
    root = bpy.data.objects.new(r['id'], None)
    export.objects.link(root)
    root['id_estavel'] = r['id']
    root['papel'] = 'limite_ruina'
    build_collapsed_apartment(r).build(r['id'], root)

# ---------------------------------------------------------------- Detritos da berma
debris = Batch()
for b in L.BUSES:
    add_burnt_bus(debris, b)


def near_loot(x, z):
    """Raio livre em volta do alumínio das quinas (48, ±51) e do espelho em -48."""
    return math.hypot(abs(x) - 48.0, abs(z) - 51.0) < 4.5


def protected(x, z):
    """Loot das quinas, ruínas e carcaças ficam livres de scatter grande."""
    if near_loot(x, z):
        return True
    for r in L.RUINS:
        if abs(x - r['x']) < r['w'] / 2 + .5 and abs(z - r['z']) < r['d'] / 2 + .5:
            return True
    return any(math.hypot(x - w['x'], z - w['z']) < 3.2 for w in L.WRECKS + L.BUSES)


def ring_point(lo, hi):
    for _ in range(200):
        x = rng.uniform(-L.HALF_X - L.OUTER + 2, L.HALF_X + L.OUTER - 2)
        z = rng.uniform(-L.HALF_Z - L.OUTER + 2, L.HALF_Z + L.OUTER - 2)
        e = L.outside_raw(x, z)
        if lo <= e <= hi and not protected(x, z) and L.height(x, z) is not None:
            return x, z
    return None


# Lajes sobrepostas ("placas tectônicas") com vergalhões nas bordas.
for k in range(48):
    p = ring_point(0.8, L.OUTER - 3.5)
    if not p:
        continue
    x, z = p
    gh = L.surface(x, z)
    w, d = rng.uniform(2.2, 4.4), rng.uniform(1.4, 2.8)
    yaw, tilt, tdir = rng.uniform(0, TAU), rng.uniform(.12, .42), rng.uniform(0, TAU)
    debris.add('concreto', box_verts(x, gh + .16, z, w, .26, d, yaw, tilt, tdir, jitter=.04), BOX_FACES)
    ex, ez = x + math.cos(yaw) * w * .45, z + math.sin(yaw) * w * .45
    for _ in range(rng.randint(1, 3)):
        bent_rebar(debris, ex + rng.uniform(-.4, .4), gh + .3, ez + rng.uniform(-.4, .4), rng.uniform(.9, 1.8), yaw + rng.uniform(-.6, .6), .5)

# Aglomerados de alvenaria (contraste quente contra o concreto).
for k in range(30):
    p = ring_point(0.4, L.OUTER - 4)
    if not p:
        continue
    x, z = p
    gh = L.surface(x, z)
    for _ in range(rng.randint(3, 5)):
        chunk(debris, 'tijolo', x + rng.uniform(-1, 1), gh + .1, z + rng.uniform(-1, 1), rng.uniform(.5, 1.2), rng.uniform(.3, .7), rng.uniform(.4, .9))

# Vigas I e espirais de arame.
for k in range(12):
    p = ring_point(1.0, L.OUTER - 4)
    if p:
        i_beam(debris, p[0], L.surface(*p) + .35, p[1], rng.uniform(3.0, 5.5), rng.uniform(0, TAU), rng.uniform(.1, .35), rng.uniform(0, TAU))
for k in range(14):
    p = ring_point(0.6, 6.0)
    if p:
        wire_spiral(debris, p[0], L.surface(*p) - .1, p[1], radius=rng.uniform(.3, .55))

# Barricadas nas saídas das avenidas (folha D): pilha mais densa em volta de cada carcaça.
for w in L.WRECKS + L.BUSES:
    for k in range(9):
        a, dist = rng.uniform(0, TAU), rng.uniform(3.0, 5.5)
        x, z = w['x'] + math.cos(a) * dist, w['z'] + math.sin(a) * dist
        if L.outside_raw(x, z) < 0.3 or near_loot(x, z):
            continue
        gh = L.surface(x, z)
        if k % 3 == 0:
            debris.add('concreto', box_verts(x, gh + .15, z, rng.uniform(1.4, 2.6), .24, rng.uniform(1.0, 1.8), rng.uniform(0, TAU), rng.uniform(.2, .5), rng.uniform(0, TAU)), BOX_FACES)
        else:
            chunk(debris, rng.choice(('entulho', 'tijolo', 'concreto')), x, gh, z, rng.uniform(.6, 1.3), rng.uniform(.4, .9), rng.uniform(.5, 1.1))

# Meios-fios arrancados na linha do asfalto.
for k in range(46):
    side, t = rng.randint(0, 3), rng.uniform(-.88, .88)
    if side == 0: x, z = t * L.HALF_X, -L.HALF_Z + rng.uniform(-.6, 1.2)
    elif side == 1: x, z = t * L.HALF_X, L.HALF_Z + rng.uniform(-1.2, .6)
    elif side == 2: x, z = -L.HALF_X + rng.uniform(-.6, 1.2), t * L.HALF_Z
    else: x, z = L.HALF_X + rng.uniform(-1.2, .6), t * L.HALF_Z
    if near_loot(x, z):
        continue
    gh = L.height(x, z) or 0.02
    debris.add('calcada', box_verts(x, gh + .08, z, rng.uniform(.9, 1.8), .16, .28, rng.uniform(0, TAU), rng.uniform(.05, .35), rng.uniform(0, TAU)), BOX_FACES)

# Saia de transição: fragmentos baixos que dissolvem a borda do asfalto.
KINDS = ('concreto', 'concreto', 'asfalto', 'terra', 'tijolo', 'entulho')
placed = 0
for n in range(5000):
    if placed >= 420:
        break
    x = rng.uniform(-L.HALF_X - L.OUTER + 1.5, L.HALF_X + L.OUTER - 1.5)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 1.5, L.HALF_Z + L.OUTER - 1.5)
    if near_loot(x, z):
        continue
    if not (-0.4 <= L.outside_organic(x, z) <= 4.5):
        continue
    gh = L.height(x, z)
    if gh is None:
        continue
    chunk(debris, rng.choice(KINDS), x, gh, z, rng.uniform(.35, 1.1), rng.uniform(.12, .42), rng.uniform(.35, .95))
    placed += 1

debris.build('Limite_Detritos')

# ---------------------------------------------------------------- Colisores de referência
data = L.runtime_data()
for c in data['colliders']:
    o = bpy.data.objects.new(c['id'], None)
    helpers.objects.link(o)
    o.empty_display_type = 'CUBE'
    o.location = ((c['minX'] + c['maxX']) / 2, -(c['minZ'] + c['maxZ']) / 2, (c['minY'] + c['maxY']) / 2)
    o.scale = ((c['maxX'] - c['minX']) / 2, (c['maxZ'] - c['minZ']) / 2, (c['maxY'] - c['minY']) / 2)
    o.hide_render = True

# ---------------------------------------------------------------- Exportação GLB
bpy.ops.object.select_all(action='DESELECT')
for o in export.objects:
    o.select_set(True)
L.RUNTIME.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(GLB), use_selection=True, export_format='GLB', export_extras=True,
    export_animations=False, export_cameras=False, export_lights=False, export_apply=True,
    export_image_format='NONE'
)

tris = {}
for o in export.objects:
    if o.type != 'MESH':
        continue
    o.data.calc_loop_triangles()
    key = o.parent.name if o.parent else o.name
    tris[key] = tris.get(key, 0) + len(o.data.loop_triangles)

(L.RUNTIME / 'limites.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
BLEND.parent.mkdir(parents=True, exist_ok=True)
scene['autor'] = 'Claude — S6.3 limites v004 (leve)'
scene['convencao'] = 'Blender X=x, Y=-z, Z=altura; 1m'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

asset = dict(
    version=L.VERSION,
    triangles=sum(tris.values()),
    trianglesByNode=tris,
    materials=sorted({m.name for o in export.objects if o.type == 'MESH' for m in o.data.materials}),
    colliders=len(data['colliders']),
    wrecks=len(data['wrecks']),
    glbBytes=GLB.stat().st_size
)
(ART / 'notas/asset.json').write_text(json.dumps(asset, indent=2, ensure_ascii=False) + '\n')
print('BUILD_SUCCESS_V004:', json.dumps(asset, ensure_ascii=False))
