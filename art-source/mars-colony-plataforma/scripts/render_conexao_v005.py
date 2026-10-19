# Imagem explicativa da conexão baia → rampa de transferência → foguete (v005/B2). Não salva o .blend.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v005_plataforma_B2.blend \
#           -P art-source/mars-colony-plataforma/scripts/render_conexao_v005.py
#   depois: python3 art-source/mars-colony-plataforma/scripts/rotular_conexao_v005.py
import bpy
import json
import os
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'renders', 'v005')
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
cam = bpy.data.objects['CAM_PLAT_B2_Conexao']
cam.location = Vector((9.5, -23.0, 13.5))          # G(9,5; 23; 13,5): nordeste, elevada
cam.data.lens = 26
alvo_ = Vector((-2.6, -36.8, -0.5))
cam.rotation_euler = (alvo_ - cam.location).normalized().to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
bpy.context.view_layer.update()
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1920, 1080, 100


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def centro(n, dz=0.0):
    o = bpy.data.objects[n]      # pelos vértices: objetos de coleções excluídas da camada ativa não têm bound_box atualizado
    vs = [v.co for v in o.data.vertices]
    return o.location + sum(vs, Vector()) / len(vs) + Vector((0, 0, dz))


PONTOS = {
    '1': ('Desembarque e zona de embarque · jogável (raio 2,7 m)', G(0, 29.5, 0.1)),
    '2': ('Elevador de embarque = INTERACT_Nave (0; 33) · onde o jogo coloca o jogador', G(0, 33.0, 0.05)),
    '3': ('Rampa de transferência subterrânea · cenográfica, sem acesso', centro('PLAT_B2_Rampa_Transferencia_Subterranea', 0.6)),
    '4': ('Saída na base do foguete (casa do elevador) · cenográfica', centro('PLAT_B2_Casa_Elevador_Base')),
    '5': ('Torre de serviço → braço da tripulação (a 8 m) → escotilha · cenográfico', centro('PLAT_B2_Torre_2', -3.0)),
    '6': ('Tampas de inspeção rentes ao piso · indicam o túnel, não são caminho', centro('PLAT_B2_Tampas_Inspecao_Rampa')),
}
proj = {}
for k, (txt, p) in PONTOS.items():
    v = world_to_camera_view(sc, cam, p)
    proj[k] = {'texto': txt, 'x': v.x, 'y': 1 - v.y}
for nome, layer in (('08_conexao_B2', 'Plataforma_B2'), ('09_conexao_corte_B2', 'Corte_Conexao_B2')):
    for vl in sc.view_layers:
        vl.use = (vl.name == layer)
    bg = sc.world.node_tree.nodes['Background'].inputs['Color']
    if layer.startswith('Corte'):                     # só no corte: fundo escuro para a rampa subterrânea contrastar
        orig = tuple(bg.default_value)
        bg.default_value = (0.02, 0.025, 0.025, 1.0)
    sc.render.filepath = os.path.join(OUT, nome + '.png')
    bpy.ops.render.render(write_still=True, layer=layer)
    if layer.startswith('Corte'):
        bg.default_value = orig
json.dump(proj, open(os.path.join(OUT, 'conexao_rotulos.json'), 'w'), ensure_ascii=False, indent=1)
print('CONEXAO_OK')
