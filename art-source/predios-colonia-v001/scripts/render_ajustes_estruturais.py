"""Renders técnicos antes/depois; sem salvar blend nem editar fontes.
Blender -b --python .../render_ajustes_estruturais.py -- --base /tmp/exoden-estrutural-base
"""
import bpy
import math
import sys
import subprocess
import tempfile
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[3]
temporary = None
if '--base' in sys.argv:
    BASE = Path(sys.argv[sys.argv.index('--base') + 1])
else:
    temporary = tempfile.TemporaryDirectory(prefix='exoden-estrutural-base-')
    BASE = Path(temporary.name)
    ref = sys.argv[sys.argv.index('--base-ref') + 1] if '--base-ref' in sys.argv else '59b3614'
    for source in ['buildings/meeting-room.glb', 'buildings/data-center.glb', 'buildings/workshop.glb', 'laboratorio/laboratorio-casca-v001.glb']:
        (BASE / Path(source).name).write_bytes(subprocess.check_output(['git', 'show', ref + ':src/assets/' + source], cwd=ROOT))
OUT = ROOT / 'docs/handoffs/s6.12-ajustes-estruturais-colonia/renders'


def load(file):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(file))
    bpy.context.view_layer.update()
    return list(set(bpy.data.objects) - previous)


def render(stage, name, camera, center, scale, lab=False, opened=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1200, 1000
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('Mundo')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.33, .27, .21, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
    if lab:
        file = ROOT / ('src/assets/laboratorio/laboratorio-v002.glb' if stage == 'antes' else 'src/assets/laboratorio/laboratorio-visual-v003.glb')
        nodes = load(file)
        bpy.data.objects['Building_Roof'].hide_render = True
        bpy.data.objects['Building_Roof'].name = 'Telhado_Fonte_Oculto'
        shell = load(BASE / 'laboratorio-casca-v001.glb' if stage == 'antes' else ROOT / 'src/assets/laboratorio/laboratorio-casca-v001.glb')
        for o in shell:
            if o.name.startswith('Building_Roof') or o.name.startswith('Texto_SYNTHESIS') or o.parent and o.parent.name.startswith('Building_Roof'):
                o.hide_render = True
        for o in bpy.data.objects:
            if o.name in ['Building_Walls', 'Casca_Parede']:
                o.hide_render = True
            if o.name.startswith('Lab_') and o.type == 'MESH' and o.name.endswith(('Door_L', 'Door_R')):
                o.hide_render = True
        # A folha antiga é ocultada na montagem pelo osso, como LaboratorioRuntime.
        for o in nodes:
            if o.type == 'ARMATURE':
                for b in o.pose.bones:
                    if b.name in ['Lab_ServiceDoor', 'Lab_AirlockDoor']:
                        b.scale = (.0001, .0001, .0001)
        # Linhas no piso têm contraste legível sem adicionar uma plataforma ao modelo.
    else:
        building = {'C-meeting': 'meeting-room', 'D-data-placa': 'data-center', 'E-data-interior': 'data-center', 'F-oficina': 'workshop'}[name]
        load(BASE / (building + '.glb') if stage == 'antes' else ROOT / ('src/assets/buildings/' + building + '.glb'))
        if opened:
            roof = bpy.data.objects['Building_Roof']
            for o in [roof, *roof.children_recursive]:
                o.hide_render = True
        for id in ['Building_Pad', 'Building_Floor']:
            o = bpy.data.objects.get(id)
            if o:
                for child in [o, *o.children_recursive]:
                    child.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -.012))
    floor = bpy.context.object
    material = bpy.data.materials.new('Pavimento_Neutro')
    material.diffuse_color = (.12, .13, .13, 1)
    floor.data.materials.append(material)
    bpy.ops.object.light_add(type='SUN', location=(8, -12, 20))
    sun = bpy.context.object
    sun.rotation_euler = (.45, -.25, -.4)
    sun.data.energy = 2
    sun.data.angle = .1
    bpy.ops.object.camera_add(location=camera)
    cam = bpy.context.object
    cam.rotation_euler = (Vector(center) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = scale
    scene.camera = cam
    scene.render.filepath = str(OUT / (name + '-' + stage + '.png'))
    bpy.ops.render.render(write_still=True)


for stage in ['antes', 'depois']:
    render(stage, 'A-maquina', (6, -8, 6), (0, 0, 1), 7, lab=True)
    render(stage, 'B-laboratorio', (19, -24, 20), (0, 0, 1), 21, lab=True)
    render(stage, 'C-meeting', (11, -15, 16), (0, 0, 1), 12, opened=True)
    render(stage, 'D-data-placa', (11, -16, 8), (0, 0, 1.7), 13)
    render(stage, 'E-data-interior', (12, -17, 20), (0, 0, 1), 14, opened=True)
    render(stage, 'F-oficina', (12, -17, 20), (0, 0, 1), 14, opened=True)

if temporary:
    temporary.cleanup()
