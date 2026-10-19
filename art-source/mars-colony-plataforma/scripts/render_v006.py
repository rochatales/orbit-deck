# Renders da v006 (B2 da v005 × B3). Blender em background; não salva o .blend.
# As vistas "jogo" usam a câmera na posição real do CameraRig (near 0,1): o que se vê é o que o runtime mostra hoje.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v006_plataforma_B3.blend \
#           -P art-source/mars-colony-plataforma/scripts/render_v006.py -- <pasta> [pct] [etapas]
import bpy
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
PCT = int(args[1]) if len(args) > 1 else 100
ETAPAS = set(args[2].split(',')) if len(args) > 2 else {'geral', 'jogo', 'elevador', 'silhueta', 'braco', 'conexao'}
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
PI = math.pi
ORTHO_JOGO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)
ANG = [('L', 0), ('SE', 45), ('S', 90), ('SO', 135), ('O', 180), ('NO', 225), ('N', 270), ('NE', 315)]
VAR = (('B2', 'Plataforma_B2', 'Planta_Plataforma_B2'), ('B3', 'Plataforma_B3', 'Planta_Plataforma_B3'))
proxy = bpy.data.objects['REF_Explorador_Proxy_Escala']
for o in bpy.data.objects:
    if o.name.startswith('REF_Manequim_Medicao_'):
        o.hide_render = True


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def render(nome, cam, layer, res=(1920, 1080), pct=None):
    sc.camera = cam if isinstance(cam, bpy.types.Object) else bpy.data.objects[cam]
    for vl in sc.view_layers:
        vl.use = (vl.name == layer)
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = pct or PCT
    sc.render.filepath = os.path.join(OUT, nome + '.png')
    bpy.ops.render.render(write_still=True, layer=layer)


cd = bpy.data.cameras.new('CAM_Jogo_Fiel')
cd.type, cd.ortho_scale, cd.clip_start, cd.clip_end = 'ORTHO', ORTHO_JOGO, 0.1, 160
cam = bpy.data.objects.new('CAM_Jogo_Fiel', cd)
sc.collection.objects.link(cam)


def cam_jogo(x, z, graus, escala=None):
    a = math.radians(graus)
    alvo = G(x, z, 0.55)
    off = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55))
    cam.location = alvo + off
    cam.rotation_euler = (-off).to_track_quat('-Z', 'Y').to_euler()
    cd.ortho_scale = escala or ORTHO_JOGO


def jogador(x, z, olhando_para=None):
    proxy.location = G(x, z, 0.0)
    proxy.rotation_euler = (0, 0, 0 if olhando_para is None else olhando_para)


if 'geral' in ETAPAS:
    g = bpy.data.objects['CAM_PLAT_Geral']
    for tag, layer, planta in VAR:
        jogador(0, 29.5)
        render('01_geral_%s' % tag, g, layer)
        render('02_planta_%s' % tag, 'CAM_PLAT_Planta', planta, res=(1600, 1600))
        render('04_entrada_%s' % tag, 'CAM_PLAT_Entrada', layer)

if 'jogo' in ETAPAS:
    for tag, layer, _ in VAR:
        jogador(0, 29.5)
        for an, gr in ANG + [('112', 112), ('120', 120)]:
            cam_jogo(0, 29.5, gr)
            render('05_jogo_%s_%s' % (tag, an), cam, layer)

if 'elevador' in ETAPAS:
    # a bordo: o jogo leva o jogador a (0; 33) e trava o giro no ângulo do embarque
    for tag, layer, _ in VAR:
        jogador(0, 33.0)
        for gr in (45, 105, 112, 120, 128):
            cam_jogo(0, 33.0, gr)
            render('10_elevador_%s_%03d' % (tag, gr), cam, layer)

if 'silhueta' in ETAPAS:
    # vista sul (90°) do conjunto, mesmo zoom do jogo, centrada no foguete de cada variante
    for tag, layer, _ in VAR:
        jogador(0, 29.5)
        cx, cz = (-4.0, 41.5) if tag == 'B2' else (-10.0, 41.5)
        for an, gr in (('S', 90), ('SO', 135), ('SE', 45)):
            cam_jogo(cx, cz - 6.0, gr)
            render('11_silhueta_%s_%s' % (tag, an), cam, layer)

if 'braco' in ETAPAS:
    # detalhe em perspectiva do braço da tripulação (ligação torre → cabine → casco)
    cdp = bpy.data.cameras.new('CAM_Braco')
    cdp.lens, cdp.clip_start, cdp.clip_end = 40, 0.1, 400
    cp = bpy.data.objects.new('CAM_Braco', cdp)
    sc.collection.objects.link(cp)
    for tag, layer, alvo, pos in (('B2', 'Plataforma_B2', G(-2.6, 42.6, 8.6), G(6.5, 30.0, 12.5)),
                                  ('B3', 'Plataforma_B3', G(-12.0, 41.5, 5.8), G(-4.5, 30.5, 9.5))):
        cp.location = pos
        cp.rotation_euler = (alvo - pos).normalized().to_track_quat('-Z', 'Y').to_euler()
        render('12_braco_%s' % tag, cp, layer)

if 'conexao' in ETAPAS:
    jogador(0, 31.6, PI)
    render('13_conexao_B3', 'CAM_PLAT_B3_Conexao', 'Plataforma_B3')
print('RENDER_V006_OK')
