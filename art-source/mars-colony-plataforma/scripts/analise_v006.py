# Análise da v006: B2 (v005) × B3 (v006) (Blender em background; não salva o .blend).
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v006_plataforma_B3.blend \
#           -P art-source/mars-colony-plataforma/scripts/analise_v006.py
# Gera notas/analise_v006.json: oclusão na câmera do jogo (v003, A, B), passagem r = 0,36 m, invasões visuais,
# medidas e contagens.
import bpy
import json
import math
import os
from collections import deque
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
sc = bpy.context.scene
PI = math.pi
PIL = json.load(open(os.path.join(ROOT, 'notas', 'piloto_mundo_marte.json')))
ANG = [('L', 0.0), ('SE', PI / 4), ('S', PI / 2), ('SO', 3 * PI / 4), ('O', PI), ('NO', 5 * PI / 4), ('N', 3 * PI / 2), ('NE', 7 * PI / 4)]
IGN = ('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'LUZ_', 'CAM_')


def G(x, z, y=0.0):
    return Vector((x, -z, y))


def find_lc(lc, name):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        r = find_lc(ch, name)
        if r:
            return r


ref = sc.view_layers.get('Referencia_v003') or sc.view_layers.new('Referencia_v003')
for n in ('REF_LAYOUT', 'COLISORES_ESTUDO', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_COMUM', 'PLATAFORMA_B2_REFINADA',
          'PLATAFORMA_B3_V006'):
    find_lc(ref.layer_collection, n).exclude = True
find_lc(ref.layer_collection, 'V003_SUBSTITUIDOS').exclude = False
VARS = {'B2_v005': 'Plataforma_B2', 'B3_v006': 'Plataforma_B3'}
rep = {}

# ------------------------------------------------------------ 1. oclusão (câmera do jogo)
AREAS = {
    'jogador_no_desembarque': [(0, 29.5, h) for h in (0.3, 0.9, 1.25)],
    'zona_embarque_2_7m': [(x, z, 1.0) for x in (-1.5, 0, 1.5) for z in (27.5, 28.5, 29.5, 30.5, 31.5)],
    'baia_ate_INTERACT_Nave': [(x, z, 1.0) for x in (-0.8, 0, 0.8) for z in (31.0, 32.0, 33.0, 34.0)],
    'passagem_z25_31': [(x, z, 1.0) for x in (-1.2, 0, 1.2) for z in (25, 26.5, 28)],
    'deck_livre': [(x, z, 1.0) for x in (-6, -4.5, 4.5, 6) for z in (30, 32, 34, 36, 37.5)],
    'caminho_sul': [(x, z, 1.0) for x in (-6, -3, 0, 3, 6) for z in (20, 22.5, 25, 27)],
    'faixa_sul_deck': [(x, z, 1.0) for x in (-6, -4.5, -3, 3, 4.5, 6) for z in (35.5, 37.0)],
    'jogador_no_elevador_0_33': [(0, 33, h) for h in (0.3, 0.9, 1.25)],
}
TRAJETO = [(0.0, 19.0 + 0.5 * i) for i in range(22)] + [(0.0, 30.0 + 0.5 * i) for i in range(7)]


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


oc = {}
for var, layer in VARS.items():
    dg = depsgraph(layer)
    oc[var] = {}
    for area, pts in AREAS.items():
        oc[var][area] = {}
        for an, a in ANG:
            d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
            bl = [bloqueio(dg, G(x, z, h), d) for (x, z, h) in pts]
            n = sum(1 for b in bl if b)
            quem = {}
            for b in bl:
                if b:
                    quem[b] = quem.get(b, 0) + 1
            oc[var][area][an] = {'pct': round(100 * n / len(pts)), 'bloqueadores': dict(sorted(quem.items(), key=lambda kv: -kv[1])[:3])}
rep['oclusao'] = oc
rep['oclusao_resumo'] = {var: {area: {'media_%': round(sum(v['pct'] for v in d.values()) / 8, 1),
                                      'max_%': max(v['pct'] for v in d.values()),
                                      'SE_padrao_%': d['SE']['pct']} for area, d in oc[var].items()} for var in oc}

# ------------------------------------------------------------ 2. passagem (raio 0,36 m) e invasões visuais
B = PIL['bounds']
RES = 0.05
NX, NZ = int(round((B['maxX'] - B['minX']) / RES)), int(round((B['maxZ'] - B['minZ']) / RES))
GX, GZ = np.meshgrid(B['minX'] + (np.arange(NX) + 0.5) * RES, B['minZ'] + (np.arange(NZ) + 0.5) * RES)
W = np.zeros_like(GX, dtype=bool)
for a in PIL['walkableAreas']:
    W |= (GX >= a['minX']) & (GX <= a['maxX']) & (GZ >= a['minZ']) & (GZ <= a['maxZ'])
CAND = [(o['minX'], o['maxX'], o['minZ'], o['maxZ']) for o in PIL['obstacles']]


def rmask(r, pad=0.0):
    return (GX >= r[0] - pad) & (GX <= r[1] + pad) & (GZ >= r[2] - pad) & (GZ <= r[3] + pad)


def cmask(r, rad):
    dx = np.maximum(np.maximum(r[0] - GX, 0), GX - r[1])
    dz = np.maximum(np.maximum(r[2] - GZ, 0), GZ - r[3])
    return dx * dx + dz * dz < rad * rad


def alcance(rects, rad=0.36, extra=None):
    bl = np.zeros_like(W)
    for r in rects:
        bl |= cmask(r, rad)
    free = W & ~bl
    if extra is not None:
        free &= ~extra
    sx, sz = int((0 - B['minX']) / RES), int((0.8 - B['minZ']) / RES)
    seen = np.zeros_like(free)
    q = deque([(sz, sx)])
    seen[sz, sx] = True
    while q:
        z, x = q.popleft()
        for dz, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nz, nx = z + dz, x + dx
            if 0 <= nz < NZ and 0 <= nx < NX and free[nz, nx] and not seen[nz, nx]:
                seen[nz, nx] = True
                q.append((nz, nx))
    return seen


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def pmask(poly):
    m = np.ones_like(W)
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    sg = 1 if area > 0 else -1
    for i in range(len(poly)):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % len(poly)]
        m &= sg * ((x1 - x0) * (GZ - z0) - (z1 - z0) * (GX - x0)) >= -1e-9
    return m


def invasoes(colecoes, layer):
    dg = depsgraph(layer)
    oc_ = np.zeros_like(W)
    for r in CAND:
        oc_ |= rmask(r, 0.02)
    tot = np.zeros_like(W)
    por = {}
    for cn in colecoes:
        for o in bpy.data.collections[cn].all_objects:
            if o.type != 'MESH' or o.hide_render or o.name not in sc.view_layers[layer].objects:
                continue      # só o que está ativo na camada (a rampa subterrânea fica fora da camada de jogo)
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            mw = o.matrix_world
            par = list(range(len(me.vertices)))

            def f(i):
                while par[i] != i:
                    par[i] = par[par[i]]
                    i = par[i]
                return i
            for e in me.edges:
                a_, b_ = f(e.vertices[0]), f(e.vertices[1])
                if a_ != b_:
                    par[a_] = b_
            gr = {}
            for v in me.vertices:
                w = mw @ v.co
                gr.setdefault(f(v.index), []).append((w.x, -w.y, w.z))
            for g in gr.values():
                if max(p[2] for p in g) <= 0.26 or min(p[2] for p in g) >= 1.55:
                    continue
                h = hull([(round(p[0], 3), round(p[1], 3)) for p in g])
                if len(h) < 3:
                    continue
                xs_, zs_ = [p[0] for p in h], [p[1] for p in h]
                if max(xs_) < B['minX'] or min(xs_) > B['maxX'] or max(zs_) < B['minZ'] or min(zs_) > B['maxZ']:
                    continue
                m = pmask(h) & W & ~oc_
                s = int(m.sum())
                if s:
                    tot |= m
                    por[o.name] = round(por.get(o.name, 0) + s * RES * RES, 3)
            ev.to_mesh_clear()
    return tot, por


def dil(m, rad):
    k = int(math.ceil(rad / RES))
    out = m.copy()
    zz, xx = np.nonzero(m)
    for dz in range(-k, k + 1):
        for dx in range(-k, k + 1):
            if (dz * RES) ** 2 + (dx * RES) ** 2 <= rad * rad:
                a_, b_ = zz + dz, xx + dx
                ok = (a_ >= 0) & (a_ < NZ) & (b_ >= 0) & (b_ < NX)
                out[a_[ok], b_[ok]] = True
    return out


ALVOS = {'desembarque (0; 29,5)': ((0, 29.5), 0.5), 'INTERACT_Nave (0; 33)': ((0, 33), 0.5),
         'zona de embarque (2,7 m)': ((0, 29.5), 2.7), 'canto SO do deck': ((-6, 37), 0.5), 'canto SE do deck': ((6, 37), 0.5),
         'fundo do deck (0; 37)': ((0, 37), 0.5)}


def alvos(seen):
    return {k: bool((seen & ((GX - x) ** 2 + (GZ - z) ** 2 <= r * r)).any()) for k, ((x, z), r) in ALVOS.items()}


base = alcance(CAND)
deckm = rmask((-7, 7, 29, 38)) | rmask((-2, 2, 25, 31))
pas = {'candidato (sem mudanças)': {'area_alcancavel_deck_m2': round(float((base & deckm).sum()) * RES * RES, 2), 'alvos': alvos(base)}}
for var, layer, pref, colls in (('B2_v005', 'Plataforma_B2', 'COL_NOVO_PLAT_B2_', ['PLATAFORMA_COMUM', 'PLATAFORMA_B2_REFINADA']),
                                ('B3_v006', 'Plataforma_B3', 'COL_NOVO_PLAT_B3_', ['PLATAFORMA_COMUM', 'PLATAFORMA_B3_V006'])):
    props = [tuple(float(v) for v in o['rect_jogo'].split(',')) for o in bpy.data.collections['COL_NOVO_PLATAFORMA'].objects
             if o.name.startswith(pref)]
    s1 = alcance(CAND + props)
    inv, por = invasoes(colls, layer)
    s2 = alcance(CAND, extra=dil(inv, 0.36) if inv.any() else None)
    pas[var] = {
        'propostas_COL_NOVO': [o.name for o in bpy.data.collections['COL_NOVO_PLATAFORMA'].objects if o.name.startswith(pref)],
        'com_propostas': {'area_alcancavel_deck_m2': round(float((s1 & deckm).sum()) * RES * RES, 2),
                          'perda_deck_m2': round(float((base & deckm & ~s1).sum()) * RES * RES, 2), 'alvos': alvos(s1)},
        'geometria_visivel_sem_colisor': {'total_m2': round(float(inv.sum()) * RES * RES, 3), 'por_objeto_m2': por,
                                          'perda_se_fosse_solida_m2': round(float((base & deckm & ~s2).sum()) * RES * RES, 2),
                                          'alvos': alvos(s2)}}
rep['passagem_r036'] = pas

# ------------------------------------------------------------ 3. trajeto do jogador: 8 orientações e varredura contínua
traj = {}
for var, layer in VARS.items():
    dg = depsgraph(layer)
    def frac(x, z, d, so_plataforma):
        n = 0
        for h in (0.3, 0.9, 1.25):
            b_ = bloqueio(dg, G(x, z, h), d)
            if b_ and (not so_plataforma or b_.startswith('PLAT_')):
                n += 1
        return round(n / 3, 2)
    por_ang, por_ang_col = {}, {}
    for an, a in ANG:
        d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
        por_ang[an] = [frac(x, z, d, True) for (x, z) in TRAJETO]
        por_ang_col[an] = [frac(x, z, d, False) for (x, z) in TRAJETO]
    cont, cont_col = [], []
    for k in range(72):
        a = math.radians(k * 5)
        d = Vector((math.cos(a) * 18.38, -math.sin(a) * 18.38, 13.55)).normalized()
        cont.append(max(frac(x, z, d, True) for (x, z) in TRAJETO))
        cont_col.append(max(frac(x, z, d, False) for (x, z) in TRAJETO))
    traj[var] = {'amostras_z': [z for (_, z) in TRAJETO],
                 'oito_orientacoes_so_plataforma': por_ang, 'oito_orientacoes_qualquer_objeto': por_ang_col,
                 'max_oito_so_plataforma': max(max(v) for v in por_ang.values()),
                 'max_oito_qualquer_objeto': max(max(v) for v in por_ang_col.values()),
                 'varredura_5graus_so_plataforma': cont, 'varredura_5graus_qualquer_objeto': cont_col,
                 'angulos_ocultos_pela_plataforma_de_72': sum(1 for c in cont if c > 0),
                 'faixas_ocultas_pela_plataforma_graus': [k * 5 for k, c in enumerate(cont) if c > 0],
                 'angulos_ocultos_por_qualquer_objeto_de_72': sum(1 for c in cont_col if c > 0)}
rep['trajeto'] = traj

# ------------------------------------------------------------ 4. medidas e contagens
dg = depsgraph('Completa')


def bb(o):
    ws = [o.matrix_basis @ (Vector(v.co)) for v in o.data.vertices]   # sem pais; matrix_world pode estar desatualizada
    return {'x': [round(min(v.x for v in ws), 2), round(max(v.x for v in ws), 2)],
            'z_jogo': [round(min(-v.y for v in ws), 2), round(max(-v.y for v in ws), 2)],
            'altura': [round(min(v.z for v in ws), 2), round(max(v.z for v in ws), 2)]}


rep['medidas'] = {n: bb(bpy.data.objects[n]) for n in ('PLAT_B2_Foguete', 'PLAT_B3_Foguete', 'PLAT_B2_Torre_1', 'PLAT_B2_Torre_2',
                                                      'PLAT_B3_Torre_Servico', 'PLAT_B3_Mastro_Servico', 'PLAT_B2_Base_Lancamento',
                                                      'PLAT_B3_Base_Lancamento', 'PLAT_B3_Totem_Embarque', 'PLAT_B2_Braco_Tripulacao_Cabine',
                                                      'PLAT_B3_Braco_Tripulacao', 'PLAT_B3_Casa_Elevador_Base')}
cont = {}
for cn in ('PLATAFORMA_COMUM', 'PLATAFORMA_B2_REFINADA', 'PLATAFORMA_B3_V006'):
    tri, mats, n = 0, set(), 0
    for o in bpy.data.collections[cn].all_objects:
        if o.type != 'MESH' or o.users_collection[0].name in ('PLATAFORMA_COMUM_PISO_V004', 'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA'):
            continue
        n += 1
        me = o.data
        me.calc_loop_triangles()
        tri += len(me.loop_triangles)
        mats |= {m.name for m in me.materials if m}
    cont[cn] = {'objetos': n, 'triangulos_base_sem_modificadores': tri, 'materiais': sorted(mats)}
rep['contagens'] = cont
json.dump(rep, open(os.path.join(ROOT, 'notas', 'analise_v006.json'), 'w'), ensure_ascii=False, indent=1)
print('ANALISE_V006_OK')
print(json.dumps(rep['oclusao_resumo'], ensure_ascii=False))
print(json.dumps({v: {k: x for k, x in d.items() if not k.startswith(('amostras', 'oito_', 'varredura'))} for v, d in traj.items()}, ensure_ascii=False))
print(json.dumps(pas, ensure_ascii=False)[:2500])
print(json.dumps(rep['medidas'], ensure_ascii=False))
print(json.dumps({k: (v['objetos'], v['triangulos_base_sem_modificadores'], len(v['materiais'])) for k, v in cont.items()}, ensure_ascii=False))
