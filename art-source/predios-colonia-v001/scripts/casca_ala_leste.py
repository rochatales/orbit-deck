"""Cascas do Quartel e do Laboratório na linguagem de Data Center/Cafeteria.

Os GLBs ativos (barracks-v006, laboratorio-v002) não são reexportados: animações, portas, interior e colisores
ficam intactos. Cada casca é um GLB à parte, no espaço local do prédio, montado no runtime (colonyShell.ts):
- Building_Roof: telhado de quatro águas; substitui o telhado antigo e abre ao entrar, como antes.
- Casca_Fixa: embasamento terracota, faixa grafite, friso, quinas e placa.
- Casca_Parede (só Laboratório): revestimento creme, filho de Building_Walls, que se abre junto com o teto.
Cores: material CF_Palette da Cafeteria, sem paleta nova.

  Blender -b --python art-source/predios-colonia-v001/scripts/casca_ala_leste.py -- [--render]
"""
import bpy, bmesh, math, sys, json, hashlib
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/predios-colonia-v001'
RENDER = '--render' in sys.argv
CREAM, TERRA, GRAPHITE, TRIM, DARK, SOFFIT, BRASS = (0, 0), (1, 0), (3, 0), (5, 0), (5, 2), (0, 1), (2, 0)
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


class Parts:
    def __init__(self):
        self.bm = bmesh.new(); self.uv = self.bm.loops.layers.uv.new('UVMap')

    def face(self, points, cell):
        face = self.bm.faces.new([self.bm.verts.new(p) for p in points])
        for loop in face.loops: loop[self.uv].uv = ((cell[0] + .5) / 8, (cell[1] + .5) / 8)
        face.smooth = False

    def solid(self, ring, z0, z1, cell):
        if sum(p[0] * q[1] - q[0] * p[1] for p, q in zip(ring, ring[1:] + ring[:1])) < 0: ring = ring[::-1]
        self.face([(*p, z0) for p in reversed(ring)], cell); self.face([(*p, z1) for p in ring], cell)
        for i in range(len(ring)):
            a, b = ring[i], ring[(i + 1) % len(ring)]
            self.face([(*a, z0), (*b, z0), (*b, z1), (*a, z1)], cell)

    def keep(self, source, decide):
        bm = bmesh.new(); bm.from_mesh(source.data); seen, doomed = set(), []
        for v in bm.verts:
            if v in seen: continue
            todo, comp = [v], []; seen.add(v)
            while todo:
                a = todo.pop(); comp.append(a)
                for e in a.link_edges:
                    b = e.other_vert(a)
                    if b not in seen: seen.add(b); todo.append(b)
            box = [min(q.co[i] for q in comp) for i in range(3)] + [max(q.co[i] for q in comp) for i in range(3)]
            delta = decide(box)
            if delta is None: doomed.extend(comp)
            else:
                for q in comp: q.co += Vector(delta)
        bmesh.ops.delete(bm, geom=doomed, context='VERTS')
        return bm


class Plan:
    """Planta retangular com quina chanfrada; off é a distância para fora do plano da parede."""
    def __init__(self, cx, cy, hx, hy, c):
        self.cx, self.cy, self.hx, self.hy, self.c = cx, cy, hx, hy, c

    def diag(self, off): return self.hx + self.hy - self.c + off * math.sqrt(2)

    def point(self, side, t, off):
        if side == 'S': return (self.cx + t, self.cy - self.hy - off)
        if side == 'N': return (self.cx + t, self.cy + self.hy + off)
        if side == 'E': return (self.cx + self.hx + off, self.cy + t)
        return (self.cx - self.hx - off, self.cy + t)

    def end(self, side, off):
        return self.diag(off) - (self.hy + off if side in 'SN' else self.hx + off)

    def layer(self, part, side, off0, off1, z0, z1, cell, t0=None, t1=None):
        a0, a1 = (-self.end(side, off0), -self.end(side, off1)) if t0 is None else (t0, t0)
        b0, b1 = (self.end(side, off0), self.end(side, off1)) if t1 is None else (t1, t1)
        part.solid([self.point(side, a0, off0), self.point(side, a1, off1), self.point(side, b1, off1), self.point(side, b0, off0)], z0, z1, cell)

    def segments(self, part, side, off0, off1, z0, z1, cell, gaps=()):
        """Trecho da fachada com vãos [(t0, t1)] de portas ou janelas."""
        start = None
        for g0, g1 in sorted(gaps):
            self.layer(part, side, off0, off1, z0, z1, cell, start, g0); start = g1
        self.layer(part, side, off0, off1, z0, z1, cell, start, None)

    def chamfer(self, part, sx, sy, off0, off1, z0, z1, cell):
        def corner(off):
            d = self.diag(off); x = self.hx + off; y = self.hy + off
            return (self.cx + sx * x, self.cy + sy * (d - x)), (self.cx + sx * (d - y), self.cy + sy * y)
        a0, b0 = corner(off0); a1, b1 = corner(off1)
        part.solid([a0, a1, b1, b0], z0, z1, cell)


def buttress(part, plan, side, t, depth=.15):
    h = lambda off: off
    profile = [(.15, 0), (.15 + depth, 0), (.15 + depth, .2), (.17, 1.0), (.15, 1.05)]
    for a, b in [(t - .14, t + .14)]:
        pts = lambda s: [(*plan.point(side, s, off), z) for off, z in profile]
        A, B = pts(a), pts(b)
        n = len(profile)
        flip = side in ('S', 'W')
        part.face(A if flip else A[::-1], TERRA); part.face(B[::-1] if flip else B, TERRA)
        for i in range(n):
            j = (i + 1) % n
            q = [A[i], B[i], B[j], A[j]]
            part.face(q if flip else q[::-1], TERRA)


def hip(part, plan, eave_x, eave_y, c_eave, top_x, top_y, c_top, z0, z1):
    octagon = lambda hx, hy, c, z: [(plan.cx + x, plan.cy + y, z) for x, y in [(hx - c, -hy), (hx, -hy + c), (hx, hy - c), (hx - c, hy), (-hx + c, hy), (-hx, hy - c), (-hx, -hy + c), (-hx + c, -hy)]]
    low, high = octagon(eave_x, eave_y, c_eave, z0), octagon(top_x, top_y, c_top, z1)
    for i in range(8):
        j = (i + 1) % 8
        part.face([low[i], low[j], high[j], high[i]], CREAM)
    part.face(high, CREAM); part.face(low[::-1], SOFFIT)


def panel(part, x0, x1, y0, y1, z, ribs):
    ring = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    part.solid(ring, z - .02, z + .04, CREAM)
    part.solid([(x0 + .1, y0 + .1), (x1 - .1, y0 + .1), (x1 - .1, y1 - .1), (x0 + .1, y1 - .1)], z + .04, z + .06, DARK)
    step = (x1 - x0 - .3) / ribs
    for k in range(ribs):
        x = x0 + .15 + k * step
        part.solid([(x, y0 + .15), (x + .06, y0 + .15), (x + .06, y1 - .15), (x, y1 - .15)], z + .06, z + .09, GRAPHITE)


def write(part, name, parent, material, extra=None):
    if name in bpy.data.objects: bpy.data.objects[name].name = name + '_fonte'  # o runtime procura pelo nome exato
    mesh = bpy.data.meshes.new(name); part.bm.to_mesh(mesh); part.bm.free()
    mesh.materials.append(material)
    if extra: mesh.materials.append(extra)
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj); obj.parent = parent
    return obj


def text(body, location, rotation, size, width, parent, material):
    bpy.ops.object.text_add(location=location); o = bpy.context.object
    o.name = 'Texto_' + body; o.data.body = body; o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'; o.data.size = size; o.data.extrude = .002
    o.rotation_euler = rotation
    bpy.ops.object.convert(target='MESH'); bpy.context.view_layer.update()
    if o.dimensions.x > width: o.scale.x *= width / o.dimensions.x
    uv = o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
    for loop in uv.data: loop.uv = ((GRAPHITE[0] + .5) / 8, (GRAPHITE[1] + .5) / 8)
    o.data.materials.clear(); o.data.materials.append(material)
    o.parent = parent
    return o


def placa(part, parent, material, x, y, height, label, tag):
    """Placa creme/latão acima da porta sul, medidas de padronizar.py, em coordenadas do prédio."""
    part.solid([(x - 1.83, y - .24), (x + 1.83, y - .24), (x + 1.83, y - .12), (x - 1.83, y - .12)], height - .2, height + .2, GRAPHITE)
    part.solid([(x - 1.73, y - .34), (x + .78, y - .34), (x + .78, y - .22), (x - 1.73, y - .22)], height - .18, height + .18, TRIM)
    part.solid([(x + .84, y - .34), (x + 1.7, y - .34), (x + 1.7, y - .22), (x + .84, y - .22)], height - .18, height + .18, TERRA)
    for dx in (-.7, .7): part.solid([(x + dx - .05, y - .24), (x + dx + .05, y - .24), (x + dx + .05, y), (x + dx - .05, y)], height - .3, height - .14, GRAPHITE)
    for body, dx, width in [(label, -.475, 2.3), (tag, 1.27, .7)]:
        text(body, (x + dx, y - .345, height), (math.pi / 2, 0, 0), .20, width, parent, material)


def roof_texts(plan, top_x, top_y, eave_x, eave_y, z0, z1, front, side, parent, material):
    run_y, run_x = eave_y - top_y, eave_x - top_x
    tilt_y, tilt_x = math.atan2(z1 - z0, run_y), math.atan2(z1 - z0, run_x)
    zm = (z0 + z1) / 2 + .025
    text(front, (plan.cx, plan.cy - (eave_y + top_y) / 2 - .03, zm), (tilt_y, 0, 0), .42, top_x * 1.7, parent, material)
    for sign in (1, -1):
        text(side, (plan.cx + sign * ((eave_x + top_x) / 2 + .03), plan.cy, zm), (tilt_x, 0, sign * math.pi / 2), .32, top_y * 1.7, parent, material)


def start(reference):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'art-source/predios-colonia-v001/originais/cafeteria.glb'))
    material = bpy.data.materials['CF_Palette']; material.use_fake_user = True
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / reference)); bpy.context.view_layer.update()
    source = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new('Casca', None); bpy.context.collection.objects.link(root)
    return material, source, root


def export(root, target, source, reference, renders):
    keep = {root, *root.children_recursive}
    for o in bpy.context.scene.objects: o.select_set(o in keep)
    path = ROOT / target
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_animations=False, export_yup=True, export_extras=True)
    (ART / 'export' / path.name).write_bytes(path.read_bytes())
    if RENDER:
        s = bpy.context.scene; s.render.engine = 'BLENDER_EEVEE'; s.render.resolution_x = s.render.resolution_y = 900
        s.world = bpy.data.worlds.new('w'); s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[0].default_value = (.45, .42, .4, 1)
        sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); s.collection.objects.link(sun); sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sun.data.energy = 3
        cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); s.collection.objects.link(cam); s.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = renders
        for o in source:
            if o.name in ('Icosphere', 'LaboratorioPavimento'): o.hide_render = True
        for name, d in [('frente', (.25, -1, .6)), ('lateral', (-1, -.4, .5))]:
            d = Vector(d).normalized(); c = Vector((0, -.5, 1)); cam.location = c + d * 30; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
            s.render.filepath = str(ART / 'renders' / path.stem / f'{name}.png'); bpy.ops.render.render(write_still=True)
    return {'arquivo': target, 'sha256': digest(path), 'bytes': path.stat().st_size, 'referencia': reference, 'referencia_sha256': digest(ROOT / reference)}


# ---------- Quartel ----------
REFERENCE = 'src/assets/quartel/barracks-v006.glb'
material, source, root = start(REFERENCE)
plan = Plan(0, 0, 4.54, 5.29, .6)
fixed, roof = Parts(), Parts()
for name in ['Wall_Corners', 'Building_Roof']: bpy.data.objects[name].hide_render = True
GAPS = {'S': [(-1.3, 1.45)], 'W': [(-2.95, -.2)], 'N': [], 'E': []}
SKIRT, BAND = 1.0, 1.2
for side in 'SNEW':
    plan.segments(fixed, side, 0, .15, 0, SKIRT, TERRA, GAPS[side])
    plan.segments(fixed, side, 0, .08, SKIRT, BAND, GRAPHITE, GAPS[side])
    plan.layer(fixed, side, 0, .02, 2.77, 2.81, TRIM)
    limit = 3.52 if side in 'SN' else 4.28
    plan.layer(fixed, side, -.23, 0, .23, 2.85, CREAM, limit, None)
    plan.layer(fixed, side, -.23, 0, .23, 2.85, CREAM, None, -limit)
for sx in (1, -1):
    for sy in (1, -1):
        plan.chamfer(fixed, sx, sy, -.23, 0, .23, 2.85, CREAM)
        plan.chamfer(fixed, sx, sy, 0, .15, 0, SKIRT, TERRA)
        plan.chamfer(fixed, sx, sy, 0, .08, SKIRT, BAND, GRAPHITE)
        plan.chamfer(fixed, sx, sy, 0, .02, 2.77, 2.81, TRIM)
for side, t in [('S', -3.3), ('S', 3.5), ('N', -2.6), ('N', 2.6), ('E', -3.8), ('E', 3.8), ('W', 2.6), ('W', -3.6)]: buttress(fixed, plan, side, t)
EAVE_X, EAVE_Y, TOP_X, TOP_Y, Z0, Z1 = 4.76, 5.51, 2.35, 3.1, 2.85, 4.2
hip(roof, plan, EAVE_X, EAVE_Y, .74, TOP_X, TOP_Y, .3, Z0, Z1)
panel(roof, -1.9, 1.9, -2.7, -.5, Z1, 18)


def roof_items(box):
    # Equipamentos do autor sobre o topo plano: escotilha, chaminés e condensadora.
    if box[3] < -1.9 and box[1] > -3.1 and box[4] < -2.3: return (1.2, 2.5, 1.0)
    if -1.2 < box[0] and box[3] < -.4 and box[1] > 3.3: return (0, -1.1, 1.0)
    if box[0] > -.1 and box[1] > 1.7 and box[4] < 2.6 and box[2] >= 3.19: return (0, -.6, 1.0)
    return None


items = Parts(); items.bm.free(); items.bm = Parts().keep(bpy.data.objects['Building_Roof'], roof_items)
quartel_palette = bpy.data.objects['Building_Roof'].data.materials[0]
fixed_obj = write(fixed, 'Casca_Fixa', root, material)
roof_obj = write(roof, 'Building_Roof', root, material)
equip = bpy.data.meshes.new('Telhado_Equipamentos'); items.bm.to_mesh(equip); items.bm.free(); equip.materials.clear(); equip.materials.append(quartel_palette)
equip_obj = bpy.data.objects.new('Telhado_Equipamentos', equip); bpy.context.collection.objects.link(equip_obj); equip_obj.parent = roof_obj
extra = Parts(); placa(extra, root, material, 0, -5.29, 2.72, 'BARRACKS', 'QT')
write(extra, 'Casca_Placa', fixed_obj, material)
for o in [o for o in root.children if o.name.startswith('Texto_')]: o.parent = fixed_obj
roof_texts(plan, TOP_X, TOP_Y, EAVE_X, EAVE_Y, Z0, Z1, 'BARRACKS', 'CREW QUARTERS', roof_obj, material)
report = [export(root, 'src/assets/quartel/quartel-casca-v001.glb', source, REFERENCE, 17)]

# ---------- Laboratório ----------
REFERENCE = 'src/assets/laboratorio/laboratorio-v002.glb'
material, source, root = start(REFERENCE)
plan = Plan(.1, .1, 7.15, 5.15, 0)
fixed, roof, cover = Parts(), Parts(), Parts()
bpy.data.objects['Building_Roof'].hide_render = True
SERVICE, AIRLOCK = 2 - .1, .2 - .1
GAPS = {'S': [(SERVICE - 1.4, SERVICE + 1.4)], 'W': [(AIRLOCK - 1.4, AIRLOCK + 1.4)], 'N': [], 'E': []}
for side in 'SNEW':
    plan.segments(fixed, side, 0, .15, 0, 1.1, TERRA, GAPS[side])
    plan.segments(fixed, side, 0, .08, 1.1, 1.35, GRAPHITE, GAPS[side])
    plan.layer(fixed, side, 0, .02, 3.5, 3.54, TRIM)
    plan.segments(cover, side, 0, .012, 1.35, 3.6, CREAM, GAPS[side])
    for g0, g1 in GAPS[side]: plan.layer(cover, side, 0, .012, 2.7, 3.6, CREAM, g0, g1)
for side, t in [('S', -3.2), ('S', -5.6), ('S', 5.6), ('N', -4.2), ('N', 0), ('N', 4.2), ('E', -2.4), ('E', 2.4), ('W', -3.3), ('W', 3.4)]: buttress(fixed, plan, side, t)
EAVE_X, EAVE_Y, TOP_X, TOP_Y, Z0, Z1 = 7.42, 5.42, 4.5, 2.5, 3.6, 4.75
hip(roof, plan, EAVE_X, EAVE_Y, .7, TOP_X, TOP_Y, .3, Z0, Z1)
panel(roof, -3.2, 3.0, -1.6, 1.4, Z1, 24)
fixed_obj = write(fixed, 'Casca_Fixa', root, material)
roof_obj = write(roof, 'Building_Roof', root, material)
write(cover, 'Casca_Parede', root, material)
extra = Parts(); placa(extra, root, material, 2, -5.05, 2.95, 'LABORATORY', 'LB')
write(extra, 'Casca_Placa', fixed_obj, material)
for o in [o for o in root.children if o.name.startswith('Texto_')]: o.parent = fixed_obj
roof_texts(plan, TOP_X, TOP_Y, EAVE_X, EAVE_Y, Z0, Z1, 'LABORATORY', 'SYNTHESIS', roof_obj, material)
report.append(export(root, 'src/assets/laboratorio/laboratorio-casca-v001.glb', source, REFERENCE, 21))
(ART / 'notas/casca-ala-leste-v001.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print('CASCA', report)
