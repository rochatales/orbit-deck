"""Exteriores provisórios da cabine. Blender 5.1; não grava nem altera os GLBs fonte.
blender -b --factory-startup --python art-source/ui/cockpit/scripts/render_backdrops.py
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'src/assets/ui/cockpit'
ASSETS = ROOT / 'src/assets'


def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*color, 1)
    m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .9
    return m


def import_glb(file, placement=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ASSETS / file))
    added = set(bpy.data.objects) - before
    if placement:
        parent = bpy.data.objects.new('BackdropPlacement', None)
        bpy.context.collection.objects.link(parent)
        for o in added:
            if not o.parent:
                o.parent = parent
        parent.location = (placement.get('x', 0), -placement.get('z', 0), placement.get('y', 0))
        parent.rotation_euler.z = -placement.get('rotationY', 0)
    return added


def render(map_id):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Atmosfera')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (.45, .25, .12, 1) if map_id == 'mars' else (.20, .30, .37, 1)
    bg.inputs['Strength'].default_value = .65
    ground = material('Solo', (.24, .105, .048) if map_id == 'mars' else (.09, .12, .13))
    bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, -.03))
    bpy.context.object.data.materials.append(ground)
    if map_id == 'mars':
        added = import_glb('colony-v007.glb')
        manifest = json.loads((ASSETS / 'buildings/colony-buildings-v001.json').read_text())
        removed = {'meeting-suite', 'meeting-exterior-airlock', 'brand-brain', 'dormitory', 'greenhouse'}
        for b in manifest:
            removed.update(b['replaces'])
        for o in added:
            if o.get('ambiente') in removed or o.name.startswith('PLAT_B3'):
                o.hide_render = True
        for glb, metadata in [('hangar/hangar-v002.glb', 'hangar/hangar-v002.manifest.json'),
                              ('quartel/barracks-v006.glb', 'quartel/barracks-v006.manifest.json'),
                              ('laboratorio/laboratorio-v002.glb', 'laboratorio/laboratorio-v002.manifest.json')]:
            m = json.loads((ASSETS / metadata).read_text())
            import_glb(glb, m['placement'])
        for b in manifest:
            import_glb('buildings/' + b['id'] + '.glb', b['placement'])
        import_glb('control-room/control-room-v002.glb', {'x': 0, 'z': -10.5})
        # Relevo distante só do cenário de vídeo, sem dados novos no mundo do jogo.
        for i in range(11):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(-100 + i * 21, 85, -4))
            hill = bpy.context.object
            hill.scale = (24, 20, 8 + 3 * math.sin(i * 1.7))
            hill.data.materials.append(ground)
        position, target = (0, -27, 3.1), (0, -4, 4.1)
    else:
        import_glb('shanghai-fase01/shanghai-fase01.glb')
        import_glb('shanghai-limites/shanghai-limites-v001.glb')
        position, target = (0, -8, 2.4), (0, 22, 6.5)
    bpy.ops.object.light_add(type='SUN', location=(12, -18, 30))
    sun = bpy.context.object
    sun.rotation_euler = (math.radians(32), math.radians(-18), math.radians(-30))
    sun.data.energy = 2.2 if map_id == 'mars' else 1.3
    sun.data.angle = .12
    sun.data.color = (1, .77, .52) if map_id == 'mars' else (.72, .85, 1)
    bpy.ops.object.camera_add(location=position)
    camera = bpy.context.object
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.lens = 24
    scene.camera = camera
    scene.render.filepath = str(OUT / (map_id + '.png'))
    bpy.ops.render.render(write_still=True)


for map_id in ['mars', 'shanghai']:
    render(map_id)
