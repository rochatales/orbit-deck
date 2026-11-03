"""Comparação de tamanho: explorador astronauta a 1,5 m ao lado do rifle em três comprimentos.

Sem rig: o rifle fica na altura da mão direita, apontado para a frente, só para julgar proporção.
  Blender -b --factory-startup -P art-source/armas/rifle-laser/scripts/comparar_tamanho.py -- <explorador.glb>
"""
import bpy, sys, os, math
from mathutils import Vector

explorer = sys.argv[sys.argv.index('--') + 1]
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RIFLE = os.path.join(BASE, 'export', 'rifle-laser-v001.glb')
HEIGHT, LENGTHS, GAP = 1.5, (0.65, 0.75, 0.85), 1.1

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def imported(path):
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in scene.objects if o not in before]
    root = bpy.data.objects.new('raiz', None); scene.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    return root, [o for o in new if o.type == 'MESH']

def bounds(meshes):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))

for i, length in enumerate(LENGTHS):
    x = (i - 1) * GAP
    body, meshes = imported(explorer)
    mn, mx = bounds(meshes)
    k = HEIGHT / (mx.z - mn.z); body.scale = (k,) * 3
    mn, mx = bounds(meshes)
    body.location = Vector((x, 0, 0)) - Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    gun, _ = imported(RIFLE)
    gun.scale = (length / 0.75,) * 3
    # Punho na altura da mão (~0,62 m), à direita do corpo, cano para a frente (-Y no Blender).
    gun.location = (x - 0.24, -0.12, 0.62)
    label = bpy.data.objects.new(f'{length:.2f} m', bpy.data.curves.new('t', 'FONT')); scene.collection.objects.link(label)
    label.data.body = f'{length:.2f} m'; label.data.size = 0.12; label.data.align_x = 'CENTER'
    label.location = (x, -0.5, 1.7); label.rotation_euler = (math.radians(90), 0, 0)

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1500, 900
world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.32, 0.32, 0.35, 1)
sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(25)); sun.data.energy = 3
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 3.6
centre = Vector((0, 0, 0.85))
for name, d in {'lado': (-1, -0.3, 0.12), 'jogo': (-0.6, -0.8, 1.0)}.items():
    d = Vector(d).normalized()
    cam.location = centre + d * 8
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(BASE, 'renders', f'comparacao-tamanho-{name}.png')
    bpy.ops.render.render(write_still=True)
