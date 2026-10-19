# Sequência do acesso (v005/B2): eclusa → desembarque → embarque (teleporte para INTERACT_Nave, como no jogo) →
# desembarque → saída. Renderiza B2 nas orientações SE (padrão) e SO e mede, a cada quadro, a fração do corpo
# do jogador oculta nas 8 orientações para B (v004) e B2 (v005). Não salva o .blend.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v005_plataforma_B2.blend \
#           -P art-source/mars-colony-plataforma/scripts/sequencia_v005.py -- [medir|render|ambos]
import bpy
import json
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'renders', 'v005', 'sequencia')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ETAPA = args[0] if args else 'ambos'
sc = bpy.context.scene
PI = math.pi
FPS, DT = 24, 1 / 24
VMAX, ACC, DEC = 3.2, 10.0, 14.0
ORTHO_JOGO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)
ANG = [('L', 0.0), ('SE', PI / 4), ('S', PI / 2), ('SO', 3 * PI / 4), ('O', PI), ('NO', 5 * PI / 4), ('N', 3 * PI / 2), ('NE', 7 * PI / 4)]
IGN = ('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'LUZ_', 'CAM_')


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def damp(a, b, lam, dt):
    return a + (b - a) * (1 - math.exp(-lam * dt))


# ------------------------------------------------------------ roteiro do jogador
def caminhada(z0, z1, t0):
    out, s, v, L = [], 0.0, 0.0, abs(z1 - z0)
    sg = 1 if z1 > z0 else -1
    while s < L - 1e-4:
        v = min(VMAX, v + ACC * DT, math.sqrt(max(0.0, 2 * DEC * (L - s))))
        s = min(L, s + v * DT)
        out.append((0.0, z0 + sg * s, 'caminhando', sg))
    return out


Q = [(0.0, 19.0, 'parado', 1)] * 8
Q += caminhada(19.0, 29.5, 0)
Q += [(0.0, 29.5, 'no desembarque · interação de embarque', 1)] * 14
Q += [(0.0, 33.0, 'a bordo: jogo coloca o jogador em INTERACT_Nave (0; 33)', 1)] * 19
Q += [(0.0, 29.5, 'desembarque (0; 29,5)', -1)] * 10
Q += caminhada(29.5, 22.0, 0)
Q += [(0.0, 22.0, 'parado', -1)] * 8


def depsgraph(layer):
    vl = sc.view_layers[layer]
    if vl.depsgraph is None:
        vl.update()
    dg = vl.depsgraph
    dg.update()
    return dg


def bloqueio(dg, o, d):
    for _ in range(32):
        ok, loc, nrm, idx, ob, mw = sc.ray_cast(dg, o, d, distance=250.0)
        if not ok:
            return None
        o = loc + d * 0.003
        ob = getattr(ob, 'original', ob)
        if ob.name.startswith(IGN):
            continue
        ev = ob.evaluated_get(dg)
        try:
            if ev.data.materials[ev.data.polygons[idx].material_index].name == 'M_Vidro':
                continue
        except Exception:
            pass
        return ob.name
    return None


os.makedirs(OUT, exist_ok=True)
if ETAPA in ('medir', 'ambos'):
    med = {'quadros': [], 'orientacoes': [a for a, _ in ANG]}
    dgs = {'B_v004': depsgraph('Plataforma_B'), 'B2_v005': depsgraph('Plataforma_B2')}
    for i, (x, z, estado, _) in enumerate(Q):
        fr = {'i': i, 't': round(i * DT, 3), 'z': round(z, 3), 'estado': estado}
        for var, dg in dgs.items():
            plat, qualquer = [], []
            for an, a in ANG:
                d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
                bl = [bloqueio(dg, G(x, z, h), d) for h in (0.3, 0.9, 1.25)]
                plat.append(round(sum(1 for b in bl if b and b.startswith('PLAT_')) / 3, 2))
                qualquer.append(round(sum(1 for b in bl if b) / 3, 2))
            fr[var] = {'plataforma': plat, 'qualquer_objeto': qualquer}
        med['quadros'].append(fr)
    for var in ('B_v004', 'B2_v005'):
        med['resumo_' + var] = {
            'quadros': len(Q),
            'quadros_com_jogador_oculto_pela_plataforma_em_alguma_das_8': sum(1 for f in med['quadros'] if max(f[var]['plataforma']) > 0),
            'por_orientacao_quadros_ocultos_pela_plataforma': {an: sum(1 for f in med['quadros'] if f[var]['plataforma'][k] > 0)
                                                              for k, (an, _) in enumerate(ANG)},
            'quadros_com_oculto_por_qualquer_objeto': sum(1 for f in med['quadros'] if max(f[var]['qualquer_objeto']) > 0)}
    json.dump(med, open(os.path.join(ROOT, 'notas', 'sequencia_v005.json'), 'w'), ensure_ascii=False)
    print('MEDIDA_OK', json.dumps({k: v for k, v in med.items() if k.startswith('resumo')}, ensure_ascii=False))

if ETAPA in ('render', 'ambos'):
    for vl in sc.view_layers:
        vl.use = (vl.name == 'Plataforma_B2')
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 960, 540, 100
    try:
        sc.eevee.taa_render_samples = 16
    except Exception:
        pass
    for o in bpy.data.objects:
        if o.name.startswith('REF_Manequim_Medicao_'):
            o.hide_render = True
    proxy = bpy.data.objects['REF_Explorador_Proxy_Escala']
    cd = bpy.data.cameras.new('CAM_Seq')
    cd.type, cd.ortho_scale, cd.clip_start, cd.clip_end = 'ORTHO', ORTHO_JOGO, 0.1, 400
    cam = bpy.data.objects.new('CAM_Seq', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for an, a in (('SE', PI / 4), ('SO', 3 * PI / 4)):
        pasta = os.path.join(OUT, an)
        os.makedirs(pasta, exist_ok=True)
        tx, tz = Q[0][0], Q[0][1]
        d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
        prev_z = None
        for i, (x, z, estado, sg) in enumerate(Q):
            if prev_z is not None and abs(z - prev_z) > 1.0:       # teleporte do jogo: a câmera do jogo também salta
                tx, tz = x, z
            prev_z = z
            tx, tz = damp(tx, x, 6.5, DT), damp(tz, z, 6.5, DT)
            proxy.location = G(x, z, 0.0)
            proxy.rotation_euler = (0, 0, 0 if sg > 0 else PI)
            cam.location = G(tx, tz, 0.55) + d * 90
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(pasta, 'f_%04d.png' % i)
            bpy.ops.render.render(write_still=True, layer='Plataforma_B2')
    print('SEQ_RENDER_OK', len(Q))
