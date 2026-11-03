"""Blender 5.1 · S6.3 Limites de Shanghai v003: baseado na folha de estudo de referência.

Implementa:
- ASSET STUDY A: Collapsed Apartment Block com corte interior, lajes quebradas e escadas zig-zag
- ASSET STUDY B: Debris Pile com lajes de concreto sobrepostas (tectonic plates), tijolos e vergalhões
- ASSET STUDY C: Burnt-out Vehicles (ônibus urbano carbonizado e carcaças de sedans como barricadas)
- SCENE RECONSTRUCTION: Bloqueio do corredor viário natural, sem linha reta de transição
- PBR textures e normal maps empacotados no GLB
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

# ---------------------------------------------------------------- Materiais PBR
MATERIAL_DEFS = {
    'entulho': dict(color='#d4cbb9', tex='entulho', rough=0.86, norm=0.35),
    'terra': dict(color='#544636', tex='entulho', rough=0.95, norm=0.40, tint=True),
    'asfalto_quebrado': dict(color='#3a3c3e', tex='asfalto', rough=0.92, norm=0.32, tint=True),
    'concreto': dict(color='#dcd8cd', tex='concreto', rough=0.78, norm=0.30),
    'calcada': dict(color='#b8b5a0', tex='calcada', rough=0.82, norm=0.28),
    'tijolo': dict(color='#9c5038', tex='entulho', rough=0.88, norm=0.38, tint=True),
    'metal': dict(color='#3a3d3e', tex='concreto', rough=0.48, norm=0.25, metal=0.80, tint=True),
    'veiculo_ferrugem': dict(color='#684232', tex='entulho', rough=0.72, norm=0.35, metal=0.45, tint=True),
    'azul': dict(color='#6c8a8c', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'terracota': dict(color='#b05e46', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'bege': dict(color='#bca984', tex='fachada', rough=0.85, norm=0.30, tint=True),
    'sombra': dict(color='#1c1d1e', tex=None, rough=0.96),
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


def box_verts(cx, cy, cz, w, h, d, yaw=0.0, tilt=0.0, tdir=0.0):
    out = []
    ct, st = math.cos(tilt), math.sin(tilt)
    ax, az = math.cos(tdir), math.sin(tdir)
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


# ---------------------------------------------------------------- ASSET STUDY C: Veículos Carbonizados / Barricadas
def add_burnt_bus(batch, cx, cy, cz, yaw=0.0, tilt=0.0, tdir=0.0):
    """Ônibus urbano queimado com janelas vazias, teto rompido e carcaça metálica."""
    L_bus = 9.8
    W_bus = 2.5
    H_bus = 2.8
    # 1. Chassi inferior e piso
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 0.35, cz, W_bus, 0.5, L_bus, yaw, tilt, tdir), BOX_FACES)
    # 2. Interior escuro/carbonizado
    batch.add('sombra', box_verts(cx, cy + 0.9, cz, W_bus - 0.2, 0.8, L_bus - 0.4, yaw, tilt, tdir), BOX_FACES)
    # 3. Colunas de janela (Pilares laterais vazados)
    num_windows = 5
    for side in (-W_bus / 2 + 0.08, W_bus / 2 - 0.08):
        for col in range(num_windows + 1):
            offset_z = -L_bus / 2 + 0.6 + col * ((L_bus - 1.2) / num_windows)
            batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.45, cz, 0.12, 1.2, 0.15, yaw, tilt, tdir), BOX_FACES)
    # 4. Teto metálico amassado
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 2.15, cz, W_bus - 0.1, 0.2, L_bus - 0.2, yaw, tilt, tdir), BOX_FACES)
    # 5. Frente (para-brisa oco) e Traseira
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.2, cz + L_bus / 2 - 0.15, W_bus, 1.5, 0.3, yaw, tilt, tdir), BOX_FACES)
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.2, cz - L_bus / 2 + 0.15, W_bus, 1.5, 0.3, yaw, tilt, tdir), BOX_FACES)
    # 6. Rodas / Eixos queimados
    for sx in (-W_bus / 2, W_bus / 2):
        for sz_ratio in (-0.35, 0.28, 0.38):
            batch.add('sombra', box_verts(cx, cy + 0.4, cz + sz_ratio * L_bus, 0.35, 0.75, 0.75, yaw, tilt, tdir), BOX_FACES)


def add_burnt_sedan(batch, cx, cy, cz, yaw=0.0, tilt=0.0, tdir=0.0):
    """Carro de passeio sedan amassado e queimado."""
    L_car = 4.2
    W_car = 1.8
    # 1. Chassi e capô
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 0.4, cz, W_car, 0.65, L_car, yaw, tilt, tdir), BOX_FACES)
    # 2. Habitáculo com pilares vazados (colunas A, B, C)
    batch.add('sombra', box_verts(cx, cy + 0.9, cz - 0.1, W_car - 0.2, 0.6, 2.1, yaw, tilt, tdir), BOX_FACES)
    # Teto
    batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.25, cz - 0.15, W_car - 0.25, 0.12, 1.8, yaw, tilt, tdir), BOX_FACES)
    # Colunas
    for sx in (-W_car / 2 + 0.1, W_car / 2 - 0.1):
        # Coluna A dianteira
        batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.0, cz + 0.8, 0.1, 0.55, 0.1, yaw, tilt + 0.25, tdir), BOX_FACES)
        # Coluna C traseira
        batch.add('veiculo_ferrugem', box_verts(cx, cy + 1.0, cz - 1.0, 0.1, 0.55, 0.1, yaw, tilt - 0.25, tdir), BOX_FACES)
    # Rodas
    for sx in (-W_car / 2, W_car / 2):
        for sz_ratio in (-0.3, 0.3):
            batch.add('sombra', box_verts(cx, cy + 0.3, cz + sz_ratio * L_car, 0.22, 0.55, 0.55, yaw, tilt, tdir), BOX_FACES)


# ---------------------------------------------------------------- ASSET STUDY A: Collapsed Apartment Block
def build_collapsed_apartment(r):
    """Prédio de apartamentos em colapso com corte interior e escadas zig-zag."""
    batch = Batch()
    W = r['w']
    D = r['d']
    floors = r['floors']
    H = floors * L.FLOOR
    cx, cz = r['x'], r['z']
    mat = r['material']

    # Parede dos fundos (externa, intacta)
    batch.add(mat, box_verts(cx, H / 2, cz - D / 2 + 0.25, W, H, 0.5), BOX_FACES)

    # Paredes laterais (degraus quebrados descendo em direção à frente)
    for side in (-W / 2 + 0.25, W / 2 - 0.25):
        side_h = H * 0.75
        batch.add(mat, box_verts(cx + side, side_h / 2, cz, 0.5, side_h, D), BOX_FACES)
        # Borda quebrada da lateral
        batch.add('tijolo', box_verts(cx + side, side_h + 0.15, cz + D * 0.15, 0.45, 0.3, D * 0.6, 0, 0.2, 0), BOX_FACES)

    # Lajes de piso e corte interior exposto
    for fl in range(1, floors + 1):
        fl_y = fl * L.FLOOR
        # Laje de concreto armado
        slab_d = D * (0.85 - 0.08 * fl) # lajes mais altas mais quebradas e curtas
        batch.add('concreto', box_verts(cx, fl_y - 0.15, cz - (D - slab_d) / 2, W - 0.6, 0.3, slab_d), BOX_FACES)

        # Parede interna de alvenaria com tijolo aparente
        if fl < floors:
            batch.add('tijolo', box_verts(cx - W * 0.15, fl_y + 1.3, cz - D * 0.25, 0.2, 2.6, slab_d * 0.6), BOX_FACES)

        # Escada zig-zag interna de concreto (Asset Study A, Phase 1 & 2)
        if fl < floors:
            dir_stair = 1 if fl % 2 == 1 else -1
            stair_w = 1.3
            stair_len = 3.6
            # Rampa/degraus da escada conectando o piso fl_y ao próximo piso fl_y + L.FLOOR
            tilt_ang = math.atan2(L.FLOOR, stair_len)
            stair_x = cx + dir_stair * (W * 0.22)
            stair_z = cz - D * 0.32
            batch.add('concreto', box_verts(stair_x, fl_y + L.FLOOR / 2, stair_z, stair_w, 0.22, stair_len, 0, tilt_ang * dir_stair, 0), BOX_FACES)

        # Vergalhões e vigas saindo da borda fraturada da laje
        for rb in range(4):
            rx = cx - W * 0.35 + rb * (W * 0.22)
            rz = cz - (D - slab_d) / 2 + slab_d / 2
            batch.add('metal', box_verts(rx, fl_y - 0.05, rz + 0.6, 0.04, 0.04, 1.4, 0, rng.uniform(-0.3, 0.3), rng.uniform(0, 6.28)), BOX_FACES)

    # Talus / Apron de escombros desmoronados na frente aberta do prédio
    for k in range(24):
        sx = cx + rng.uniform(-W * 0.45, W * 0.45)
        sz = cz + D * 0.35 + rng.uniform(0.5, 4.0)
        gh = L.height(sx, sz) or 0.3
        batch.add('concreto', box_verts(sx, gh + 0.2, sz, rng.uniform(1.2, 2.8), 0.25, rng.uniform(1.0, 2.2), rng.uniform(0, 6.28), rng.uniform(0.15, 0.5), rng.uniform(0, 6.28)), BOX_FACES)
        batch.add('tijolo', box_verts(sx + 0.3, gh + 0.35, sz, rng.uniform(0.6, 1.4), 0.3, rng.uniform(0.6, 1.2), rng.uniform(0, 6.28), rng.uniform(0.1, 0.4), rng.uniform(0, 6.28)), BOX_FACES)

    return batch


# ---------------------------------------------------------------- ASSET STUDY B: Debris Pile & Layered Slabs
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

        n_blend = L.noise(cx, cz, seed=173, scale=5.0) * 0.5 + L.noise(cx, cz, seed=291, scale=2.2) * 0.3
        score = (avg_h / 2.5) * 0.5 + n_blend

        if e_raw <= 0.6:
            if score < -0.05:
                mat_choice = 'asfalto_quebrado'
            elif score < 0.28:
                mat_choice = 'terra'
            else:
                mat_choice = 'entulho'
        else:
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

# ---------------------------------------------------------------- Construção das Ruínas (Asset Study A)
ruin_boxes = []
for r in L.RUINS:
    root = bpy.data.objects.new(r['id'], None)
    export.objects.link(root)
    root['id_estavel'] = r['id']
    root['papel'] = 'limite_ruina'
    b_ruin = build_collapsed_apartment(r)
    b_ruin.build(r['id'], root)
    ruin_boxes.append((r['x'] - r['w'] / 2 - 2, r['x'] + r['w'] / 2 + 2, r['z'] - r['d'] / 2 - 2, r['z'] + r['d'] / 2 + 2))

# ---------------------------------------------------------------- BARRICADAS DE VEÍCULOS E ESCOMBROS (Asset Study B & C)
debris = Batch()

# 1. Barricada no bloqueio central da frente (x=0, z=-54) — Como em Scene Reconstruction Panel 4!
# Ônibus urbano carbonizado atravessado bloqueando o corredor da avenida
add_burnt_bus(debris, cx=-1.2, cy=0.08, cz=-53.8, yaw=math.radians(16), tilt=0.08, tdir=math.radians(45))
# Carro sedan amassado e soterrado ao lado do ônibus
add_burnt_sedan(debris, cx=4.2, cy=0.06, cz=-53.0, yaw=math.radians(-32), tilt=0.18, tdir=math.radians(-80))
# Segundo sedan amassado contra a calçada oposta
add_burnt_sedan(debris, cx=-6.8, cy=0.06, cz=-53.4, yaw=math.radians(65), tilt=0.12, tdir=math.radians(30))

# 2. Veículos adicionais nas barricadas das outras quinas e bordas
add_burnt_sedan(debris, cx=-49.2, cy=0.12, cz=-52.6, yaw=math.radians(-45), tilt=0.22, tdir=math.radians(50)) # Quina Sudoeste
add_burnt_sedan(debris, cx=49.0, cy=0.14, cz=52.8, yaw=math.radians(110), tilt=0.15, tdir=math.radians(-20))  # Quina Nordeste
add_burnt_sedan(debris, cx=-52.0, cy=0.25, cz=51.5, yaw=math.radians(25), tilt=0.25, tdir=math.radians(70))   # Quina Noroeste

# 3. Lajes de Concreto Sobrepostas (Asset Study B: 3D Scatter & Contours)
# Placas planas de concreto fraturadas sobrepostas como telhas/placas tectônicas
for k in range(55):
    x = rng.uniform(-L.HALF_X - L.OUTER + 2.5, L.HALF_X + L.OUTER - 2.5)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 2.5, L.HALF_Z + L.OUTER - 2.5)
    if abs(x) > 46.5 and abs(z) > 49.0: continue # Protege loot em (48, -51) e (48, 51)
    e_raw = L.outside_raw(x, z)
    if e_raw < 0.6 or e_raw > L.OUTER - 3.0: continue
    gh = L.height(x, z)
    if gh is None: continue

    w_sl = rng.uniform(2.2, 4.2)
    d_sl = rng.uniform(1.4, 2.8)
    yaw_sl = rng.uniform(0, 6.28)
    tilt_sl = rng.uniform(0.12, 0.42)
    tdir_sl = rng.uniform(0, 6.28)

    # Laje de concreto
    debris.add('concreto', box_verts(x, gh + 0.16, z, w_sl, 0.26, d_sl, yaw_sl, tilt_sl, tdir_sl), BOX_FACES)

    # Vergalhões e espirais de arame projetando-se das lajes (Rebar & Wire Spirals)
    for rb in range(rng.randint(2, 5)):
        off_x = (rb / 4.0 - 0.5) * w_sl * 0.85
        wire_len = rng.uniform(1.2, 2.4)
        debris.add('metal', box_verts(x + off_x, gh + 0.28, z + d_sl / 2 + wire_len / 2 - 0.2, 0.04, 0.04, wire_len, yaw_sl, tilt_sl + rng.uniform(-0.15, 0.35), tdir_sl), BOX_FACES)

    # Pedaço de alvenaria de tijolo sob/ao lado da laje
    if k % 2 == 0:
        debris.add('tijolo', box_verts(x + rng.uniform(-0.6, 0.6), gh + 0.22, z + rng.uniform(-0.6, 0.6), rng.uniform(0.8, 1.8), 0.32, rng.uniform(0.8, 1.6), yaw_sl, tilt_sl * 0.6, tdir_sl), BOX_FACES)

# 4. Meio-fios de calçada arrancados e fragmentados
for k in range(50):
    side = rng.randint(0, 3)
    t = rng.uniform(-0.88, 0.88)
    if side == 0: x, z = t * L.HALF_X, -L.HALF_Z + rng.uniform(-0.6, 1.2)
    elif side == 1: x, z = t * L.HALF_X, L.HALF_Z + rng.uniform(-1.2, 0.6)
    elif side == 2: x, z = -L.HALF_X + rng.uniform(-0.6, 1.2), t * L.HALF_Z
    else: x, z = L.HALF_X + rng.uniform(-1.2, 0.6), t * L.HALF_Z
    if abs(x) > 46.5 and abs(z) > 49.0: continue
    gh = L.height(x, z) or 0.02
    debris.add('calcada', box_verts(x, gh + 0.08, z, rng.uniform(0.9, 1.8), 0.16, 0.28, rng.uniform(0, 6.28), rng.uniform(0.05, 0.35), rng.uniform(0, 6.28)), BOX_FACES)

# 5. Scatter de transição fina (Dithering skirt)
KINDS = [('concreto', 0.35), ('asfalto_quebrado', 0.25), ('terra', 0.20), ('tijolo', 0.20)]
placed = 0
for n in range(4000):
    if placed >= 480: break
    x = rng.uniform(-L.HALF_X - L.OUTER + 1.5, L.HALF_X + L.OUTER - 1.5)
    z = rng.uniform(-L.HALF_Z - L.OUTER + 1.5, L.HALF_Z + L.OUTER - 1.5)
    if abs(x) > 46.5 and abs(z) > 49.0: continue
    e_org = L.outside_organic(x, z)
    if not (-0.4 <= e_org <= 4.5): continue
    gh = L.height(x, z)
    if gh is None: continue

    r_kind = rng.choice(KINDS)[0]
    w = rng.uniform(0.35, 1.1)
    h = rng.uniform(0.12, 0.42)
    d = rng.uniform(0.35, 0.95)
    debris.add(r_kind, box_verts(x, gh + h / 2 - 0.03, z, w, h, d, rng.uniform(0, 6.28), rng.uniform(0.05, 0.4), rng.uniform(0, 6.28)), BOX_FACES)
    placed += 1

debris_objects = debris.build('Limite_Detritos')

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

scene['autor'] = 'Antigravity / Codex — S6.3 limites v003'
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
print('BUILD_SUCCESS_V003:', json.dumps(asset, ensure_ascii=False))
