"""Explorador astronauta sem mochila, para o auto-rig do Mixamo.

A malha original é feita de peças soltas. A mochila são as peças inteiras atrás do tronco: nada é cortado.
Saídas: corpo sem mochila (FBX para o Mixamo e GLB) e a mochila sozinha (GLB, para voltar depois como
peça rígida presa ao osso Spine2). Pés na origem, 1,5 m de altura, frente para -Y no Blender.

  Blender -b --factory-startup -P art-source/personagens/explorador-astronauta/scripts/separar_mochila.py -- [--render]
"""
import bpy, bmesh, sys, os, json, math, hashlib
from mathutils import Vector

RENDER = '--render' in sys.argv
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(BASE, 'fontes', 'explorador-astronauta-original.glb')
HEIGHT = 1.5
# Caixa da mochila no espaço normalizado da fonte (altura ~0,96, frente -Y): só peças inteiras dentro dela.
PACK = {'minY': 0.025, 'minZ': -0.16, 'maxZ': 0.20, 'maxAbsX': 0.17}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for o in list(bpy.context.scene.objects):
    if o.type == 'EMPTY':
        body.parent = None
        bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.name = body.data.name = 'ExploradorAstronauta'

def islands(bm):
    seen, out = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            a = stack.pop(); comp.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen:
                    seen.add(b.index); stack.append(b)
        out.append(comp)
    return out

bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
pack_verts = set()
for comp in islands(bm):
    xs = [v.co.x for v in comp]; ys = [v.co.y for v in comp]; zs = [v.co.z for v in comp]
    if min(ys) >= PACK['minY'] and min(zs) >= PACK['minZ'] and max(zs) <= PACK['maxZ'] and max(abs(x) for x in xs) <= PACK['maxAbsX']:
        pack_verts.update(v.index for v in comp)
bm.free()

# Duplica o corpo: um fica só com a mochila, o outro sem ela.
pack = body.copy(); pack.data = body.data.copy(); pack.name = pack.data.name = 'Mochila'
bpy.context.scene.collection.objects.link(pack)
for obj, keep_pack in ((body, False), (pack, True)):
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    doomed = [v for v in bm.verts if (v.index in pack_verts) != keep_pack]
    bmesh.ops.delete(bm, geom=doomed, context='VERTS')
    bm.to_mesh(obj.data); bm.free()

# Escala real e pés na origem, pela altura do corpo sem mochila; a mochila acompanha.
pts = [body.matrix_world @ v.co for v in body.data.vertices]
k = HEIGHT / (max(p.z for p in pts) - min(p.z for p in pts))
shift = Vector((-(max(p.x for p in pts) + min(p.x for p in pts)) / 2, -(max(p.y for p in pts) + min(p.y for p in pts)) / 2, -min(p.z for p in pts)))
for obj in (body, pack):
    obj.location = shift * k; obj.scale = (k,) * 3
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.selected_objects: o.select_set(False)
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, scale=True)

def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)

def dims(obj):
    p = [v.co for v in obj.data.vertices]
    return [round(max(c[i] for c in p) - min(c[i] for c in p), 3) for i in range(3)]

for img in bpy.data.images:
    img.pack()
export = os.path.join(BASE, 'export')
os.makedirs(export, exist_ok=True)

def only(obj):
    for o in bpy.context.scene.objects: o.select_set(o is obj)
    bpy.context.view_layer.objects.active = obj

only(body)
fbx = os.path.join(export, 'explorador-sem-mochila.fbx')
bpy.ops.export_scene.fbx(filepath=fbx, use_selection=True, path_mode='COPY', embed_textures=True, apply_unit_scale=True, axis_forward='-Z', axis_up='Y')
body_glb = os.path.join(export, 'explorador-sem-mochila.glb')
bpy.ops.export_scene.gltf(filepath=body_glb, export_format='GLB', use_selection=True)
only(pack)
pack_glb = os.path.join(export, 'mochila.glb')
bpy.ops.export_scene.gltf(filepath=pack_glb, export_format='GLB', use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE, 'explorador-sem-mochila.blend'))

sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
report = {
    'altura_m': HEIGHT, 'caixa_mochila_fonte': PACK,
    'corpo': {'triangulos': tris(body), 'dimensoes_xyz_m': dims(body)},
    'mochila': {'triangulos': tris(pack), 'dimensoes_xyz_m': dims(pack)},
    'sha256': {'fonte_glb': sha(SRC), 'fbx': sha(fbx), 'corpo_glb': sha(body_glb), 'mochila_glb': sha(pack_glb)},
}
with open(os.path.join(BASE, 'notas', 'mochila-v001.json'), 'w') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print('MOCHILA', json.dumps(report, ensure_ascii=False))

if RENDER:
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 700, 900
    world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.33, 0.33, 0.36, 1)
    sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(45), 0, math.radians(150)); sun.data.energy = 3
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.75
    centre = Vector((0, 0, 0.75))
    pack.hide_render = True
    for name, d in {'costas': (0.35, 1, 0.15), 'lado': (1, 0, 0.05), 'frente': (-0.35, -1, 0.15)}.items():
        d = Vector(d).normalized()
        cam.location = centre + d * 5
        cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = os.path.join(BASE, 'renders', f'sem-mochila-{name}.png')
        bpy.ops.render.render(write_still=True)
    pack.hide_render = False; body.hide_render = True
    d = Vector((0.35, 1, 0.15)).normalized(); cam.location = centre + d * 5
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(BASE, 'renders', 'mochila-sozinha.png')
    bpy.ops.render.render(write_still=True)
