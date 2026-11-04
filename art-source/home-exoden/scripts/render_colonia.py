"""Renderiza a colônia de Marte para o fundo da tela inicial (S6.15).

Monta os GLBs reais nas posições do jogo, com a mesma direção da câmera isométrica,
e fundo transparente. O corte das salas substituídas segue os runtimes da colônia.
Não altera nenhum asset.

Uso, na raiz do repositório:
  Blender -b --factory-startup --python art-source/home-exoden/scripts/render_colonia.py
"""
import bmesh
import bpy
import json
import math
import pathlib

from mathutils import Matrix, Vector

ROOT = pathlib.Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'src/assets'
SAIDA = ROOT / 'src/assets/home/colonia.webp'


def carregar(nome):
    return json.loads((ASSETS / nome).read_text(encoding='utf-8'))


COLONIA = carregar('colony-v007.manifest.json')
PREDIOS = carregar('buildings/colony-buildings-v001.json')
HANGAR = carregar('hangar/hangar-v002.manifest.json')
QUARTEL = carregar('quartel/barracks-v006.manifest.json')
LAB = carregar('laboratorio/laboratorio-v002.manifest.json')
SALAS_REMOVIDAS = {'brand-brain', 'design', 'smart-lab', 'orbit-garden', *HANGAR['removedRooms']}
for predio in PREDIOS:
    SALAS_REMOVIDAS.update(predio['replaces'])
PECAS_REMOVIDAS = {*QUARTEL['removedParts'], *LAB['removedParts']}
PECAS = {p['id']: p for p in COLONIA['parts']}


def sala_da_peca(peca, visitadas=()):
    if peca.get('ambiente'):
        return peca['ambiente']
    for apoio in [*peca.get('apoiado_em', []), *peca.get('apoiado_em_todos', [])]:
        if apoio in PECAS and apoio not in visitadas:
            sala = sala_da_peca(PECAS[apoio], (*visitadas, peca['id']))
            if sala:
                return sala
    return ''


def fica_na_vista(ob):
    identificador = ob.get('id_estavel')
    if not identificador or identificador in PECAS_REMOVIDAS or identificador not in PECAS:
        return identificador is None
    peca = PECAS[identificador]
    return peca.get('papel') != 'marking' and sala_da_peca(peca) not in SALAS_REMOVIDAS


def importar(arquivo, x=0.0, y=0.0, z=0.0, giro=0.0, filtro=None):
    """Posição e giro em coordenadas do jogo (Y para cima); o Blender usa (x, -z, y)."""
    antes = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ASSETS / arquivo))
    novos = set(bpy.context.scene.objects) - antes
    raiz = bpy.data.objects.new(f'Raiz_{pathlib.Path(arquivo).stem}', None)
    bpy.context.scene.collection.objects.link(raiz)
    raiz.location = (x, -z, y)
    raiz.rotation_euler = (0, 0, giro)
    for ob in list(novos):
        # O importador cria formas de osso que não existem no GLB.
        if ob.type == 'MESH' and ob.name.startswith('Icosphere'):
            novos.discard(ob)
            bpy.data.objects.remove(ob)
    for ob in list(novos):
        oculto = ob.get('estado_inicial') == 'oculto'
        if oculto or (filtro and not filtro(ob)):
            for filho in ob.children_recursive:
                novos.discard(filho)
                bpy.data.objects.remove(filho)
            novos.discard(ob)
            bpy.data.objects.remove(ob)
    for ob in novos:
        if ob.parent is None:
            ob.parent = raiz


scene = bpy.context.scene
for ob in list(scene.objects):
    bpy.data.objects.remove(ob)

importar('colony-v007.glb', filtro=fica_na_vista)
importar('buildings/colony-shared-floor-v001.glb')
importar('control-room/control-room-v002.glb')
importar('greenhouse/greenhouse-v001.glb')
importar('hangar/hangar-v002.glb', HANGAR['placement']['x'], HANGAR['placement']['y'], HANGAR['placement']['z'], HANGAR['placement']['rotationY'])
importar('quartel/barracks-v006.glb', QUARTEL['placement']['x'], QUARTEL['placement']['y'], QUARTEL['placement']['z'], QUARTEL['placement']['rotationY'])
# O laboratório fica de fora: o bloco branco sem textura rouba a cena sob os botões.
for predio, arquivo in zip(PREDIOS, ('meeting-room', 'data-center', 'cafeteria')):
    importar(f'buildings/{arquivo}.glb', predio['placement']['x'], 0, predio['placement']['z'], predio['placement']['rotationY'])
importar('ares-mars/deck-mars.glb', 0, 0, 33)
importar('ares-lander/ares-lander.glb', 0.72, 0.012, 33.52)

# Holograma de módulo planejado no terreno vazio a oeste, como na referência: só decoração.
holo = bpy.data.materials.new('Holograma')
holo.use_nodes = True
saida = holo.node_tree.nodes['Material Output']
emissao = holo.node_tree.nodes.new('ShaderNodeEmission')
emissao.inputs['Color'].default_value = (0.32, 1.0, 0.86, 1)
emissao.inputs['Strength'].default_value = 1.6
holo.node_tree.links.new(emissao.outputs[0], saida.inputs['Surface'])
bm = bmesh.new()
matriz_base = Matrix.Translation((0, 0, 1.25)) @ Matrix.Rotation(math.radians(22.5), 4, 'Z') @ Matrix.Diagonal((1.0, 1.0, 1.0, 1.0))
bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=5.6, radius2=4.4, depth=2.5, matrix=matriz_base)
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0, 3.0)) @ Matrix.Diagonal((3.6, 3.6, 1.0, 1.0)))
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
malha = bpy.data.meshes.new('ModuloPlanejado')
bm.to_mesh(malha)
bm.free()
malha.materials.append(holo)
modulo = bpy.data.objects.new('ModuloPlanejado', malha)
scene.collection.objects.link(modulo)
modulo.location = (-22, -12.3, 0.02)
fio = modulo.modifiers.new('Fio', 'WIREFRAME')
fio.thickness = 0.05
fio.use_replace = True
bpy.context.view_layer.update()

scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.resolution_x = 2000
scene.render.resolution_y = 1400
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = 82
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('Ambiente')
scene.world.use_nodes = True
fundo = scene.world.node_tree.nodes['Background']
fundo.inputs[0].default_value = (0.62, 0.50, 0.46, 1)
fundo.inputs[1].default_value = 0.85

sol_data = bpy.data.lights.new('Sol', 'SUN')
sol_data.energy = 3.4
sol_data.color = (1.0, 0.88, 0.74)
sol_data.angle = math.radians(4)
sol = bpy.data.objects.new('Sol', sol_data)
scene.collection.objects.link(sol)
sol.rotation_euler = (math.radians(52), 0, math.radians(-38))

# Mesma direção da câmera do jogo: (13, 13, 13) em three.js é (13, -13, 13) aqui.
camera_data = bpy.data.cameras.new('Camera')
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 72
camera_data.clip_end = 500
camera = bpy.data.objects.new('Camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
alvo = Vector((0, -10, 0))
camera.location = alvo + Vector((60, -60, 60))
camera.rotation_euler = (alvo - camera.location).to_track_quat('-Z', 'Y').to_euler()

scene.render.filepath = str(SAIDA)
bpy.ops.render.render(write_still=True)
print('COLONIA ok', SAIDA, SAIDA.stat().st_size)
