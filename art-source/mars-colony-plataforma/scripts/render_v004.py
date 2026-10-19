# Renders do estudo da plataforma (Blender em background; não salva o .blend).
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v004_plataforma.blend \
#           -P art-source/mars-colony-plataforma/scripts/render_v004.py -- <pasta_saida> [pct] [grupos...]
# grupos: gerais jogo (padrão: ambos)
import bpy
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
PCT = int(args[1]) if len(args) > 1 else 100
GRUPOS = set(args[2:]) or {'gerais', 'jogo'}
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
PI = math.pi
ORTHO_JOGO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)   # zoom inicial real ≈ 39 m
ANG = [('L', 0.0), ('SE', PI / 4), ('S', PI / 2), ('SO', 3 * PI / 4), ('O', PI), ('NO', 5 * PI / 4), ('N', 3 * PI / 2), ('NE', 7 * PI / 4)]


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def find_lc(lc, name):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        r = find_lc(ch, name)
        if r:
            return r


# camada de referência v003 (só em memória): plataforma nova excluída, nave antiga incluída
ref = sc.view_layers.get('Referencia_v003') or sc.view_layers.new('Referencia_v003')
for n in ('REF_LAYOUT', 'COLISORES_ESTUDO', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_COMUM'):
    find_lc(ref.layer_collection, n).exclude = True
find_lc(ref.layer_collection, 'V003_SUBSTITUIDOS').exclude = False


def render(nome, cam, layer, res=(1920, 1080), pct=None):
    sc.camera = cam if isinstance(cam, bpy.types.Object) else bpy.data.objects[cam]
    for vl in sc.view_layers:
        vl.use = (vl.name == layer)
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = pct or PCT
    sc.render.filepath = os.path.join(OUT, nome + '.png')
    bpy.ops.render.render(write_still=True, layer=layer)


if 'gerais' in GRUPOS:
    for tag, layer, planta in (('A', 'Plataforma_A', 'Planta_Plataforma_A'), ('B', 'Plataforma_B', 'Planta_Plataforma_B'),
                               ('v003', 'Referencia_v003', None)):
        render('01_geral_%s' % tag, 'CAM_PLAT_Geral', layer)
        if planta:
            render('02_planta_%s' % tag, 'CAM_PLAT_Planta', planta, res=(1600, 1600))
        render('03_aproximacao_%s' % tag, 'CAM_PLAT_Aproximacao', layer)
        render('04_entrada_%s' % tag, 'CAM_PLAT_Entrada', layer)

if 'jogo' in GRUPOS:
    cd = bpy.data.cameras.new('CAM_Jogo_Plataforma')
    cd.type, cd.ortho_scale, cd.clip_start, cd.clip_end = 'ORTHO', ORTHO_JOGO, 0.1, 400
    cam = bpy.data.objects.new('CAM_Jogo_Plataforma', cd)
    sc.collection.objects.link(cam)
    alvo = G(0, 29.5, 0.55)                         # jogador no desembarque
    for tag, layer in (('A', 'Plataforma_A'), ('B', 'Plataforma_B'), ('v003', 'Referencia_v003')):
        for an, a in ANG:
            d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
            cam.location = alvo + d * 90
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            render('05_jogo_%s_%s' % (tag, an), cam, layer, pct=max(25, PCT // 2))
print('RENDER_V004_OK')
