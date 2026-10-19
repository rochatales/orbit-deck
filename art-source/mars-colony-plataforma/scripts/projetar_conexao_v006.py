# Projeta na câmera CAM_PLAT_B3_Conexao os pontos que a imagem de análise rotula (sem renderizar; não salva o .blend).
#   Blender -b blend/mars_colony_estudo_v006_plataforma_B3.blend -P scripts/projetar_conexao_v006.py
import bpy
import json
import os
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sc = bpy.context.scene
cam = bpy.data.objects['CAM_PLAT_B3_Conexao']
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
vl = sc.view_layers['Plataforma_B3']
vl.update()


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def centro(n, dz=0.0):
    o = bpy.data.objects[n]
    vs = [o.matrix_basis @ v.co for v in o.data.vertices]
    return sum(vs, Vector()) / len(vs) + Vector((0, 0, dz))


PONTOS = {
    '1': ('Desembarque e zona de embarque (raio 2,7 m) · jogável', G(0, 29.5, 0.1), 'jogavel'),
    '2': ('Elevador de embarque = INTERACT_Nave (0; 33) · onde o jogo coloca o jogador', G(0, 33.0, 0.05), 'jogavel'),
    '3': ('Chegada do elevador na base do foguete · cenográfica', centro('PLAT_B3_Casa_Elevador_Base', 0.4), 'cenografico'),
    '4': ('Torre → braço da tripulação → escotilha · cenográfico', centro('PLAT_B3_Braco_Tripulacao'), 'cenografico'),
}
out = {}
for k, (txt, p, tipo) in PONTOS.items():
    v = world_to_camera_view(sc, cam, p)
    out[k] = {'texto': txt, 'tipo': tipo, 'x': v.x, 'y': 1 - v.y}
json.dump(out, open(os.path.join(ROOT, 'renders', 'v006', 'conexao_rotulos_v006.json'), 'w'), ensure_ascii=False, indent=1)
print('PROJ_OK', json.dumps(out, ensure_ascii=False))
