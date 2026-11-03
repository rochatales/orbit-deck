"""Blender 5.1 · S6.3 Limites de Shanghai: geração com blend orgânico, PBR e game design.

Uso: Blender --background --python art-source/shanghai-limites/scripts/build_blender.py
"""
import bpy, bmesh, json, math, random, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import limites as L

ROOT, ART = L.ROOT, L.ART
GLB = L.RUNTIME / 'shanghai-limites-v001.glb'
BLEND = ART / 'blend/shanghai_limites_v001.blend'
TEX_DIR = ART / 'texturas'
rng = random.Random(6319)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
export = bpy.data.collections.new('01_EXPORT_LIMITES')
scene.collection.children.link(export)
helpers = bpy.data.collections.new('02_COLISORES_REFERENCIA')
scene.collection.children.link(helpers)

# ---------------------------------------------------------------- Setup de Materiais PBR com texturas empacotadas
MATERIAL_DEFS = {
    'entulho': dict(color='#d6ccbc', tex='entulho', rough=0.86, norm=0.35),
    'terra': dict(color='#524638', tex='entulho', rough=0.94, norm=0.40, tint=True),
    'asfalto_quebrado': dict(color='#424446', tex='asfalto', rough=0.90, norm=0.30, tint=True),
    'concreto': dict(color='#dbd8ce', tex='concreto', rough=0.78, norm=0.30),
    'calcada': dict(color='#b8b5a2', tex='calcada', rough=0.82, norm=0.28),
    'tijolo': dict(color='#9c523c', tex='entulho', rough=0.88, norm=0.38, tint=True),
    'metal': dict(color='#404445', tex='concreto', rough=0.46, norm=0.25, metal=0.75, tint=True),
    'azul': dict(color='#6e8b8c', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'terracota': dict(color='#ae6049', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'bege': dict(color='#baa986', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'sombra': dict(color='#262828', tex=None, rough=0.95),
}

mats = {}
for name, spec in MATERIAL_DEFS.items():
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = True
    bs = m.node_tree.nodes.get('Principled BSDF')

    hex_c = spec['color']
    c = [int(hex_c[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c]

    bs.inputs['Base Color'].default_value = (*c, 1)
    bs.inputs['Roughness'].default_value = spec.get('rough', 0.85)
    if 'metal' in spec:
        bs.inputs['Metallic'].default_value = spec['metal']

    tex_name = spec.get('tex')
    if tex_name:
        tex_path = TEX_DIR / f'{tex_name}.png'
        if tex_path.exists():
            t_node = m.node_tree.nodes.new('ShaderNodeTexImage')
            t_node.image = bpy.data.images.load(str(tex_path), check_existing=True)
            t_node.image.pack()

            if spec.get('tint'):
                # Bake tint into a private image copy for reliable glTF material export
                img_copy = t_node.image.copy()
                img_copy.name = f'{name}_tint'
                pix = list(img_copy.pixels)
                for px in range(0, len(pix), 4):
                    for ch in range(3):
                        pix[px + ch] *= c[ch] ** (1.0 / 2.2)
                img_copy.pixels[:] = pix
                img_copy.pack()
                t_node.image = img_copy

            m.node_tree.links.new(t_node.outputs['Color'], bs.inputs['Base Color'])

        norm_path = TEX_DIR / f'{tex_name}_normal.png'
        if norm_path.exists():
            n_node = m.node_tree.nodes.new('ShaderNodeTexImage')
            n_node.image = bpy.data.images.load(str(norm_path), check_existing=True)
            n_node.image.colorspace_settings.name = 'Non-Color'
            n_node.image.pack()
            norm_map = m.node_tree.nodes.new('ShaderNodeNormalMap')
            norm_map.inputs['Strength'].default_value = spec.get('norm', 0.3)
            m.node_tree.links.new(n_node.outputs['Color'], norm_map.inputs['Color'])
            m.node_tree.links.new(norm_map.outputs['Normal'], bs.inputs['Normal'])

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
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            if prefix.startswith('Limite_Terreno'):
                if sum(f.normal.z for f in bm.faces) < 0:
                    for f in bm.faces: f.normal_flip()
            bm.to_mesh(mesh)
            bm.free()
            mesh.update()

            uv = mesh.uv_layers.new(name='UVMap')
            scale = 4.0 if material in ['asfalto_quebrado', 'calcada'] else 3.0
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


def add_ibeam(batch, cx, cy, cz, length, width=0.28, height=0.35, flange_t=0.035, web_t=0.03, yaw=0.0, tilt=0.3, tdir=0.0):
    """Gera uma viga em I realista com mesa superior, inferior e alma."""
    # Mesa superior
    batch.add('metal', box_verts(cx, cy + height / 2 - flange_t / 2, cz, width, flange_t, length, yaw, tilt, tdir), BOX_FACES)
    # Mesa inferior
    batch.add('metal', box_verts(cx, cy - height / 2 + flange_t / 2, cz, width, flange_t, length, yaw, tilt, tdir), BOX_FACES)
    # Alma central
    batch.add('metal', box_verts(cx, cy, cz, web_t, height - 2 * flange_t, length, yaw, tilt, tdir), BOX_FACES)


def add_pipe(batch, cx, cy, cz, length, r_out=0.48, r_in=0.38, segments=10, yaw=0.0, tilt=0.1, tdir=0.0):
    """Gera um duto/tubulação de drenagem urbana oca e partida."""
    verts = []
    faces = []
    cy_mid = 0
    # Gera cilindro oco ao longo do eixo Z local
    ct, st = math.cos(tilt), math.sin(tilt)
    ax, az = math.cos(tdir), math.sin(tdir)

    def rot(lx, ly, lz):
        lx, lz = lx * math.cos(yaw) - lz * math.sin(yaw), lx * math.sin(yaw) + lz * math.cos(yaw)
        dot = lx * ax + lz * az
        cxv, cyv, czv = -az * ly, az * lx - ax * lz, ax * ly
        rx = lx * ct + cxv * st + ax * dot * (1.0 - ct)
        ry = ly * ct + cyv * st
        rz = lz * ct + czv * st + az * dot * (1.0 - ct)
        return (cx + rx, cy + ry, cz + rz)

    for side in (-length / 2, length / 2):
        for i in range(segments):
            ang = i * 2.0 * math.pi / segments
            verts.append(rot(math.cos(ang) * r_out, math.sin(ang) * r_out, side))
        for i in range(segments):
            ang = i * 2.0 * math.pi / segments
            verts.append(rot(math.cos(ang) * r_in, math.sin(ang) * r_in, side))

    s = segments
    # Lados externos
    for i in range(s):
        faces.append((i, (i + 1) % s, (i + 1) % s + 2 * s, i + 2 * s))
    # Lados internos
    for i in range(s):
        faces.append((i + s + 2 * s, (i + 1) % s + s + 2 * s, (i + 1) % s + s, i + s))
    # Tampas das pontas
    for i in range(s):
        faces.append(((i + 1) % s, i, i + s, (i + 1) % s + s))
        faces.append((i + 2 * s, (i + 1) % s + 2 * s, (i + 1) % s + 3 * s, i + 3 * s))

    batch.add('concreto', verts, faces)


# ---------------------------------------------------------------- Terreno com Blend Orgânico de Materiais
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
quads = {
    'asfalto_quebrado': [],
    'terra': [],
    'entulho': [],
    'concreto': []
}

for i in range(nx):
    for j in range(nz):
        corners = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if any(c not in heights for c in corners):
            continue
        cx = x0 + (i + .5) * L.CELL
        cz = z0 + (j + .5) * L.CELL

        face = []
        for c in corners:
            if c not in vid:
                vid[c] = len(verts)
                verts.append((x0 + c[0] * L.CELL, heights[c], z0 + c[1] * L.CELL))
            face.append(vid[c])

        avg_h = sum(heights[c] for c in corners) / 4.0
        e_raw = L.outside_raw(cx, cz)

        # Blend score com multi-frequência de ruído para transição suave e fractal
        n_blend = L.noise(cx, cz, seed=173, scale=5.0) * 0.5 + L.noise(cx, cz, seed=291, scale=2.2) * 0.3
        score = (avg_h / 2.5) * 0.5 + n_blend

        if e_raw <= 0.6:
            # Zona de transição sobre e rente à borda do asfalto
            if score < -0.05:
                mat_choice = 'asfalto_quebrado'
            elif score < 0.28:
                mat_choice = 'terra'
            else:
                mat_choice = 'entulho'
        else:
            # Encosta da berma e cristas externas
            if score < 0.15:
                mat_choice = 'terra'
            elif score < 0.65:
                mat_choice = 'entulho'
            else:
                mat_choice = 'concreto'

        quads[mat_choice].append(tuple(reversed(face)))

for material, faces in quads.items():
    if not faces: continue
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
        # Fachada texturizada do prédio
        batch.add(r['material'], box_verts(cx, (top + base) / 2, cz, cw, top - base, cd), BOX_FACES)

        # Seção interna de alvenaria com tijolos aparentes sob a quebra
        broken = top < r['floors'] * L.FLOOR - .5
        if broken:
            batch.add('tijolo', box_verts(cx, top - 0.4, cz, cw * 0.92, 0.7, cd * 0.92), BOX_FACES)

        tilt = rr.uniform(.04, .24) if broken else 0
        batch.add('concreto', box_verts(cx, top + .12, cz, cw + .35, .32, cd + .35, 0, tilt, rr.uniform(0, 6.28)), BOX_FACES)

        # Vergalhões expostos e vigas
        if broken:
            for k in range(rr.randint(3, 7)):
                bx = cx + rr.uniform(-cw / 2.3, cw / 2.3)
                bz = cz + rr.uniform(-cd / 2.3, cd / 2.3)
                ln = rr.uniform(1.0, 2.5)
                batch.add('metal', box_verts(bx, top + ln / 2, bz, .04, ln, .04, rr.uniform(0, 6.28), rr.uniform(.15, .65), rr.uniform(0, 6.28)), BOX_FACES)

    # Lajes penduradas e vigas de aço cravadas no topo
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
            # Adiciona uma viga I pendurada na laje rompida
            add_ibeam(batch, cx, level - 0.2, cz, length=rr.uniform(2.5, 4.2), yaw=rr.uniform(0, 6.28), tilt=rr.uniform(0.2, 0.6), tdir=rr.uniform(0, 6.28))

    ruin_objects[r['id']] = batch.build(r['id'], root)
    ruin_boxes.append((r['x'] - r['w'] / 2 - 2, r['x'] + r['w'] / 2 + 2, r['z'] - r['d'] / 2 - 2, r['z'] + r['d'] / 2 + 2))

# ---------------------------------------------------------------- Detalhes Ricos de Escombros (Game Designer Pass)
debris = Batch()

# 1. Vigas de aço em 'I' (H-Beams) espalhadas na berma e morros
for k in range(28):
    x = rng.uniform(-L.HALF_X - L.OUTER + 3, L.HALF_X + L.OUTER - 3)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 3, L.HALF_Z + L.OUTER - 3)
    e = L.outside_raw(x, z)
    if e < 1.2 or e > L.OUTER - 4: continue
    gh = L.height(x, z)
    if gh is None: continue
    add_ibeam(debris, x, gh + rng.uniform(0.2, 0.8), z, length=rng.uniform(3.0, 5.5), yaw=rng.uniform(0, 6.28), tilt=rng.uniform(0.15, 0.65), tdir=rng.uniform(0, 6.28))

# 2. Dutos e tubulações de concreto partidos expostos na encosta
for k in range(12):
    x = rng.uniform(-L.HALF_X - L.OUTER + 3, L.HALF_X + L.OUTER - 3)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 3, L.HALF_Z + L.OUTER - 3)
    e = L.outside_raw(x, z)
    if e < 2.0 or e > L.OUTER - 4.5: continue
    gh = L.height(x, z)
    if gh is None: continue
    add_pipe(debris, x, gh + 0.25, z, length=rng.uniform(2.5, 4.5), yaw=rng.uniform(0, 6.28), tilt=rng.uniform(0.05, 0.25), tdir=rng.uniform(0, 6.28))

# 3. Lajes de concreto armado fraturadas com feixes de vergalhões
for k in range(35):
    x = rng.uniform(-L.HALF_X - L.OUTER + 2.5, L.HALF_X + L.OUTER - 2.5)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 2.5, L.HALF_Z + L.OUTER - 2.5)
    e = L.outside_raw(x, z)
    if e < 0.8 or e > L.OUTER - 3.5: continue
    gh = L.height(x, z)
    if gh is None: continue
    w_sl = rng.uniform(2.0, 3.8)
    d_sl = rng.uniform(1.2, 2.5)
    yaw_sl = rng.uniform(0, 6.28)
    tilt_sl = rng.uniform(0.1, 0.45)
    debris.add('concreto', box_verts(x, gh + 0.15, z, w_sl, 0.26, d_sl, yaw_sl, tilt_sl, rng.uniform(0, 6.28)), BOX_FACES)
    # Feixe de vergalhões saindo da borda
    for rb in range(rng.randint(2, 5)):
        off_x = (rb / 4.0 - 0.5) * w_sl * 0.8
        debris.add('metal', box_verts(x + off_x, gh + 0.25, z + d_sl / 2 + 0.4, 0.035, 0.035, rng.uniform(0.8, 1.6), yaw_sl, tilt_sl + rng.uniform(-0.1, 0.3), rng.uniform(0, 6.28)), BOX_FACES)

# 4. Meio-fios de calçada arrancados e fragmentados na margem do asfalto
for k in range(50):
    side = rng.randint(0, 3)
    t = rng.uniform(-0.9, 0.9)
    if side == 0:   # Norte
        x, z = t * L.HALF_X, -L.HALF_Z + rng.uniform(-0.8, 1.2)
    elif side == 1: # Sul
        x, z = t * L.HALF_X, L.HALF_Z + rng.uniform(-1.2, 0.8)
    elif side == 2: # Oeste
        x, z = -L.HALF_X + rng.uniform(-0.8, 1.2), t * L.HALF_Z
    else:           # Leste
        x, z = L.HALF_X + rng.uniform(-1.2, 0.8), t * L.HALF_Z
    # Evita obstruir o loot em (48, -51) e (48, 51)
    if abs(x) > 46.5 and abs(z) > 49.0: continue
    gh = L.height(x, z)
    if gh is None: gh = 0.02
    debris.add('calcada', box_verts(x, gh + 0.08, z, rng.uniform(0.8, 1.6), 0.16, 0.28, rng.uniform(0, 6.28), rng.uniform(0.05, 0.35), rng.uniform(0, 6.28)), BOX_FACES)

# 5. Pilhas de tijolos e restos de alvenaria vermelha
for k in range(30):
    x = rng.uniform(-L.HALF_X - L.OUTER + 2, L.HALF_X + L.OUTER - 2)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 2, L.HALF_Z + L.OUTER - 2)
    e = L.outside_raw(x, z)
    if e < 0.8 or e > L.OUTER - 3.5: continue
    gh = L.height(x, z)
    if gh is None: continue
    debris.add('tijolo', box_verts(x, gh + 0.15, z, rng.uniform(1.0, 2.2), rng.uniform(0.3, 0.7), rng.uniform(0.8, 1.8), rng.uniform(0, 6.28), rng.uniform(0.05, 0.35), rng.uniform(0, 6.28)), BOX_FACES)

# 6. Scatter Skirt: fragmentos de concreto, pedregulhos e asfalto estilhaçado na zona de blend
KINDS = [('bloco_concreto', 'concreto', 0.30), ('asfalto_lasca', 'asfalto_quebrado', 0.28), ('terra_monte', 'terra', 0.22), ('tijolo_solto', 'tijolo', 0.20)]
placed = 0
for n in range(3500):
    if placed >= 450: break
    x = rng.uniform(-L.HALF_X - L.OUTER + 1.5, L.HALF_X + L.OUTER - 1.5)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 1.5, L.HALF_Z + L.OUTER - 1.5)
    # Protege área de loot
    if abs(x) > 46.5 and abs(z) > 49.0: continue
    e_raw = L.outside_raw(x, z)
    e_org = L.outside_organic(x, z)

    # Prioriza a zona de transição e invasão na borda da rua
    if not (-0.4 <= e_org <= 5.0): continue
    gh = L.height(x, z)
    if gh is None: continue

    r_kind = rng.choice(KINDS)
    mat = r_kind[1]
    w = rng.uniform(0.35, 1.1)
    h = rng.uniform(0.12, 0.45)
    d = rng.uniform(0.35, 0.95)
    debris.add(mat, box_verts(x, gh + h / 2 - 0.04, z, w, h, d, rng.uniform(0, 6.28), rng.uniform(0.05, 0.4), rng.uniform(0, 6.28)), BOX_FACES)
    placed += 1

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

# ---------------------------------------------------------------- Exportação GLB
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

scene['autor'] = 'Antigravity / Codex — S6.3 limites v002'
scene['convencao'] = 'Blender X=x, Y=-z, Z=altura; 1m'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

asset = dict(
    version=L.VERSION,
    triangles=sum(tris.values()),
    trianglesByNode=tris,
    materials=sorted({m.name for o in export.objects if o.type == 'MESH' for m in o.data.materials}),
    colliders=len(data['colliders']),
    glbBytes=GLB.stat().st_size
)
(ART / 'notas/asset.json').write_text(json.dumps(asset, indent=2, ensure_ascii=False) + '\n')
print('BUILD_SUCCESS_V002:', json.dumps(asset, ensure_ascii=False))
