# Sequência de rotação da câmera (v006): simula Q/C como o CameraRig (1,75 rad/s, ângulo amortecido com fator 8) e mede,
# a cada quadro, a fração do corpo do jogador oculta pela plataforma na B2 (v005) e na B3 (v006). Câmera na posição real
# (o raio só conta até o plano near). Trechos:
#   A · desembarque (0; 29,5): segura Q de 45° (SE, padrão) a 180°, pausa, segura C de volta a 45°
#   B · acesso (0; 26): segura Q de 45° a 180°
#   C · a bordo (0; 33): o jogo trava o giro; câmera parada no ângulo do embarque (105°, 112°, 120°)
# Não salva o .blend.
#   Blender -b blend/mars_colony_estudo_v006_plataforma_B3.blend -P scripts/giro_v006.py -- [medir|render]
import bpy
import json
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'renders', 'v006', 'giro')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ETAPA = args[0] if args else 'medir'
sc = bpy.context.scene
FPS, SUB = 24, 5
VEL, AMORT = 1.75, 8.0
IGN = ('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'LUZ_', 'CAM_')
DCAM = math.hypot(18.38, 13.55) - 0.1
ORTHO_JOGO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)
VARS = {'B2_v005': 'Plataforma_B2', 'B3_v006': 'Plataforma_B3'}


def G(x, z, y=0.0):
    return Vector((x, -z, y))


# ------------------------------------------------------------ roteiro (ângulo real a cada quadro)
Q = []


def segurar(x, z, trecho, ang, alvo, ate, sentido):
    # segura a tecla até o alvo de rotação atingir `ate`; depois solta e deixa o amortecimento assentar
    dt = 1 / (FPS * SUB)
    soltou = 0
    while True:
        for _ in range(SUB):
            if sentido * (ate - alvo) > 0:
                alvo += sentido * min(VEL * dt, abs(ate - alvo))
            ang += (alvo - ang) * (1 - math.exp(-AMORT * dt))
        Q.append((x, z, trecho, ang))
        if sentido * (ate - alvo) <= 0:
            soltou += 1
            if abs(ang - alvo) < math.radians(0.3) or soltou > FPS:
                return ang, alvo


def parar(x, z, trecho, ang, n):
    for _ in range(n):
        Q.append((x, z, trecho, ang))


a = alvo = math.radians(45)
parar(0, 29.5, 'A · desembarque · SE (padrão)', a, 10)
a, alvo = segurar(0, 29.5, 'A · desembarque · segurando Q', a, alvo, math.radians(180), 1)
parar(0, 29.5, 'A · desembarque · solta Q em O (180°)', a, 10)
a, alvo = segurar(0, 29.5, 'A · desembarque · segurando C', a, alvo, math.radians(45), -1)
parar(0, 29.5, 'A · desembarque · SE (padrão)', a, 6)
a = alvo = math.radians(45)
parar(0, 26.0, 'B · acesso (0; 26) · SE', a, 6)
a, alvo = segurar(0, 26.0, 'B · acesso (0; 26) · segurando Q', a, alvo, math.radians(180), 1)
parar(0, 26.0, 'B · acesso (0; 26) · O (180°)', a, 6)
for g in (105, 112, 120):
    parar(0, 33.0, 'C · a bordo (0; 33) · giro travado em %d°' % g, math.radians(g), 18)


def bloqueio(dg, o, d):
    dist = DCAM
    for _ in range(32):
        ok, loc, nrm, idx, ob, mw = sc.ray_cast(dg, o, d, distance=dist)
        if not ok:
            return None
        dist -= (loc - o).length + 0.003
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


def depsgraph(layer):
    vl = sc.view_layers[layer]
    if vl.depsgraph is None:
        vl.update()
    dg = vl.depsgraph
    dg.update()
    return dg


os.makedirs(OUT, exist_ok=True)
if ETAPA == 'medir':
    dgs = {v: depsgraph(l) for v, l in VARS.items()}
    med = {'fps': FPS, 'quadros': []}
    for i, (x, z, trecho, ang) in enumerate(Q):
        d = Vector((math.cos(ang) * 18.38, -math.sin(ang) * 18.38, 13.55)).normalized()
        fr = {'i': i, 't': round(i / FPS, 3), 'x': x, 'z': z, 'trecho': trecho, 'graus': round(math.degrees(ang) % 360, 1)}
        for v, dg in dgs.items():
            bl = [bloqueio(dg, G(x, z, h), d) for h in (0.3, 0.9, 1.25)]
            fr[v] = round(sum(1 for b in bl if b and b.startswith('PLAT_')) / 3, 2)
        med['quadros'].append(fr)
    res = {}
    for v in VARS:
        por = {}
        for f in med['quadros']:
            k = f['trecho'].split(' · ')[0]
            p = por.setdefault(k, {'quadros': 0, 'quadros_ocultos': 0})
            p['quadros'] += 1
            p['quadros_ocultos'] += 1 if f[v] > 0 else 0
        for p in por.values():
            p['segundos_ocultos'] = round(p['quadros_ocultos'] / FPS, 2)
        res[v] = por
    med['resumo'] = res
    json.dump(med, open(os.path.join(ROOT, 'notas', 'giro_v006.json'), 'w'), ensure_ascii=False)
    print('GIRO_MEDIDO', len(Q), json.dumps(res, ensure_ascii=False))

if ETAPA == 'render':
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 960, 540, 100
    try:
        sc.eevee.taa_render_samples = 16
    except Exception:
        pass
    for o in bpy.data.objects:
        if o.name.startswith('REF_Manequim_Medicao_'):
            o.hide_render = True
    proxy = bpy.data.objects['REF_Explorador_Proxy_Escala']
    cd = bpy.data.cameras.new('CAM_Giro')
    cd.type, cd.ortho_scale, cd.clip_start, cd.clip_end = 'ORTHO', ORTHO_JOGO, 0.1, 160
    cam = bpy.data.objects.new('CAM_Giro', cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for v, layer in VARS.items():
        for vl in sc.view_layers:
            vl.use = (vl.name == layer)
        pasta = os.path.join(OUT, v)
        os.makedirs(pasta, exist_ok=True)
        for i, (x, z, trecho, ang) in enumerate(Q):
            proxy.location = G(x, z, 0.0)
            off = Vector((math.cos(ang) * 18.38, -math.sin(ang) * 18.38, 13.55))
            cam.location = G(x, z, 0.55) + off
            cam.rotation_euler = (-off).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(pasta, 'f_%04d.png' % i)
            bpy.ops.render.render(write_still=True, layer=layer)
    print('GIRO_RENDER_OK', len(Q))
