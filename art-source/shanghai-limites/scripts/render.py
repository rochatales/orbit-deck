"""Blender 5.1 · Renders de conferência dos limites sobre a fase 01 (não exporta nada).

Uso: Blender --background --python art-source/shanghai-limites/scripts/render.py -- [antes]

Abre a fonte dos limites, anexa os setores exportados da fase 01 e troca os
materiais chapados pelos texturizados de mesmo nome (o mesmo que o runtime faz).
Com `antes`, esconde os limites para a comparação antes/depois.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/shanghai-limites'
before = 'antes' in sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else False

bpy.ops.wm.open_mainfile(filepath=str(ART / 'blend/shanghai_limites_v001.blend'))
scene = bpy.context.scene

source = ROOT / 'art-source/shanghai-fase01/blend/shanghai_fase01_v001.blend'
if source.exists():
    with bpy.data.libraries.load(str(source), link=False) as (src, dst):
        dst.collections = ['02_EXPORT_SETORES']
    for c in dst.collections: scene.collection.children.link(c)
    textured = {m.name: m for o in dst.collections[0].objects for m in o.data.materials}
    limits = bpy.data.collections['01_EXPORT_LIMITES']
    for o in limits.objects:
        if o.type != 'MESH': continue
        name = o.data.materials[0].name.split('.')[0]
        if name in textured: o.data.materials[0] = textured[name]
        if before: o.hide_render = True

world = bpy.data.worlds.new('Atmosfera'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.64, .61, .54, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .8

light = bpy.data.lights.new('Sol', 'SUN'); light.energy = 2.4; light.angle = .35
sun = bpy.data.objects.new('Sol', light); scene.collection.objects.link(sun)
# Mesma direção do sol do jogo, (35, 65, 24) em X/Y/Z do jogo.
d = Vector((35, -24, 65)).normalized()
sun.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1280, 800
scene.view_settings.view_transform = 'AgX'


def shot_custom(name, cam_pos, target_pos, ortho_scale):
    cam = bpy.data.cameras.new(name)
    cam.type = 'ORTHO'
    cam.ortho_scale = ortho_scale
    cam.clip_end = 1000
    o = bpy.data.objects.new(name, cam)
    scene.collection.objects.link(o)
    o.location = cam_pos
    o.rotation_euler = (target_pos - o.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = o
    out = ART / 'renders' / f"{name}{'_antes' if before else ''}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print('RENDER', out)


def shot_game(name, x, z, angle, ortho, distance=3.0):
    cam = bpy.data.cameras.new(name)
    cam.type = 'ORTHO'
    cam.ortho_scale = ortho
    cam.clip_end = 1000
    o = bpy.data.objects.new(name, cam)
    scene.collection.objects.link(o)
    target = Vector((x, -z, .55))
    # Câmera do jogo: (cos a, sin a) · 18,38 e altura 13, multiplicadas pelo recuo de Shanghai (3).
    o.location = target + Vector((math.cos(angle) * 18.38 * distance, -math.sin(angle) * 18.38 * distance, 13.0 * distance))
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = o
    out = ART / 'renders' / f"{name}{'_antes' if before else ''}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print('RENDER', out)


# 1. Vista geral equivalente ao ângulo do desenho do autor (olhando de Z=-95 para Z=+54):
shot_custom('01_visao_geral_desenho_autor', Vector((0, 95, 70)), Vector((0, 0, 0)), 155)

# 2. Vista do jogo na chegada (0, 9.5) a 45°:
shot_game('02_jogo_chegada_isometrica', 0, 9.5, math.pi / 4, 60)

# 3. Vista do prédio alto na borda da frente (x=0, z=-54):
shot_game('03_jogo_ruina_frente_centro', 0, -50, math.pi * 0.75, 50)

# 4. Vista da ruína no canto do fundo oeste (x=-51, z=54):
shot_game('04_jogo_ruina_fundo_oeste', -45, 48, math.pi / 4, 48)

# 5. Vista do morro na quina frontal oeste (x=-51, z=-54):
shot_game('05_jogo_morro_frente_oeste', -45, -48, math.pi * 1.25, 48)
