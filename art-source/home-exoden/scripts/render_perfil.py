"""Renderiza o Explorador do jogo para o cartão de perfil da tela inicial (S6.15).

Usa o GLB real, em pose de Idle, com fundo transparente. Não altera o asset.

Uso, na raiz do repositório:
  Blender -b --factory-startup --python art-source/home-exoden/scripts/render_perfil.py
"""
import bpy
import math
import pathlib

from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[3]
GLB = ROOT / 'src/assets/characters/player/explorador-astronauta.glb'
MOCHILA = ROOT / 'src/assets/characters/player/backpack.glb'
SAIDA = ROOT / 'src/assets/home/explorador-perfil.webp'
ROSTO = Vector((0, 0, 1.27))  # altura do capacete no modelo de 1,5 m


def luz(nome, tipo, energia, cor, direcao, tamanho=None):
    data = bpy.data.lights.new(nome, tipo)
    data.energy = energia
    data.color = cor
    if tamanho:
        data.size = tamanho
    ob = bpy.data.objects.new(nome, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = ROSTO + Vector(direcao)
    ob.rotation_euler = (ROSTO - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob


scene = bpy.context.scene
for ob in list(scene.objects):
    bpy.data.objects.remove(ob)
bpy.ops.import_scene.gltf(filepath=str(GLB))
armature = next(o for o in scene.objects if o.type == 'ARMATURE')
armature.animation_data.action = bpy.data.actions['Idle_Colony']
scene.frame_set(1)
for ob in list(scene.objects):
    # O importador cria formas de osso que não existem no GLB.
    if ob.type == 'MESH' and ob.name.startswith('Icosphere'):
        bpy.data.objects.remove(ob)

# Mochila no mesmo ponto do runtime (BACKPACK_TRANSFORM): 25 cm atrás e 8 cm abaixo de Spine2.
bpy.context.view_layer.update()
coluna = armature.matrix_world @ armature.pose.bones['mixamorig:Spine2'].head
antes = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(MOCHILA))
for ob in set(scene.objects) - antes:
    if ob.type == 'MESH' and ob.name.startswith('Icosphere'):
        bpy.data.objects.remove(ob)
    elif ob.parent is None:
        ob.location = coluna + Vector((-0.02, 0.246, -0.08))
        bpy.context.view_layer.update()
        ob.parent = armature
        ob.matrix_parent_inverse = armature.matrix_world.inverted()

# De frente para a direita da tela, como na referência.
armature.rotation_mode = 'XYZ'
armature.rotation_euler = (armature.rotation_euler.x, armature.rotation_euler.y, math.radians(32))

scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.resolution_x = 960
scene.render.resolution_y = 1100
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = 90
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('Ambiente')
scene.world.use_nodes = True
fundo = scene.world.node_tree.nodes['Background']
fundo.inputs[0].default_value = (0.20, 0.30, 0.34, 1)
fundo.inputs[1].default_value = 0.7

camera_data = bpy.data.cameras.new('Camera')
camera_data.type = 'PERSP'
camera_data.lens = 85
camera = bpy.data.objects.new('Camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
alvo = Vector((0, 0, 1.12))
camera.location = alvo + Vector((0, -2.75, 0.05))
camera.rotation_euler = (alvo - camera.location).to_track_quat('-Z', 'Y').to_euler()

luz('Chave', 'AREA', 55, (1.0, 0.93, 0.84), (-1.3, -1.7, 1.2), 2.0)
luz('Preenchimento', 'AREA', 22, (0.72, 0.92, 1.0), (1.6, -1.2, 0.0), 2.0)
luz('Recorte', 'AREA', 70, (0.42, 0.95, 0.90), (1.0, 1.5, 0.5), 1.2)

scene.render.filepath = str(SAIDA)
bpy.ops.render.render(write_still=True)
print('PERFIL ok', SAIDA, SAIDA.stat().st_size)
