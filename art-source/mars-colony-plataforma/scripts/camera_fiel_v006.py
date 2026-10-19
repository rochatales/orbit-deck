# Render com a câmera do jogo na posição real (CameraRig.tsx: alvo + 18,38 m na horizontal, 13,55 m de altura,
# ortográfica, near 0,1, far 160), para mostrar o corte pelo plano near que as câmeras recuadas dos estudos escondem.
# Não salva o .blend.
#   Blender -b <arquivo.blend> -P scripts/camera_fiel_v006.py -- <camada> <pasta_saida> <prefixo> x,z,graus [x,z,graus ...]
import bpy
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
LAYER, OUT, PREF = args[0], args[1], args[2]
TOMADAS = [tuple(float(v) for v in a.split(',')) for a in args[3:]]
sc = bpy.context.scene
ORTHO_JOGO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)
os.makedirs(OUT, exist_ok=True)
for vl in sc.view_layers:
    vl.use = (vl.name == LAYER)
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 960, 540, 100
try:
    sc.eevee.taa_render_samples = 16
except Exception:
    pass
for o in bpy.data.objects:
    if o.name.startswith('REF_Manequim_Medicao_'):
        o.hide_render = True
proxy = bpy.data.objects['REF_Explorador_Proxy_Escala']
cd = bpy.data.cameras.new('CAM_Fiel')
cd.type, cd.ortho_scale = 'ORTHO', ORTHO_JOGO
cam = bpy.data.objects.new('CAM_Fiel', cd)
sc.collection.objects.link(cam)
sc.camera = cam
for x, z, g in TOMADAS:
    a = math.radians(g)
    proxy.location = Vector((x, -z, 0.0))
    alvo = Vector((x, -z, 0.55))
    off = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55))
    for nome, rec, near in (('fiel', 1.0, 0.1), ('recuada', 4.0, 0.1)):
        cam.location = alvo + off * rec
        cam.rotation_euler = (-off).to_track_quat('-Z', 'Y').to_euler()
        cd.clip_start, cd.clip_end = near, 400
        sc.render.filepath = os.path.join(OUT, '%s_x%g_z%g_%03d_%s.png' % (PREF, x, z, g, nome))
        bpy.ops.render.render(write_still=True, layer=LAYER)
print('CAMERA_FIEL_OK', len(TOMADAS))
