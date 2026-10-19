# Busca na geometria real da v005 (B2): desloca/gira/encolhe o conjunto alto (foguete, base, torres, braço,
# passarelas, umbilicais) em memória e mede, com a câmera do jogo em giro livre (1 em 1° ou 2 em 2°), quantos graus
# ocultam o jogador nos pontos do acesso, da baia e do elevador. O raio só conta até o plano da câmera.
# Não salva o .blend.
#   Blender -b blend/mars_colony_estudo_v005_plataforma_B2.blend -P scripts/busca_v006.py -- <saida.json> [modo]
import bpy
import json
import math
import sys
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:]
SAIDA = args[0]
MODO = args[1] if len(args) > 1 else 'grade'
sc = bpy.context.scene
IGN = ('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'LUZ_', 'CAM_')
DCAM = math.hypot(18.38, 13.55) - 0.1
PIV = Vector((-4.0, -41.5, 0.0))
ALTO = [o for o in bpy.data.collections['PLATAFORMA_B2_REFINADA'].objects
        if any(k in o.name for k in ('Foguete', 'Base_Lanc', 'Casa_Elev', 'Torre', 'Passarela', 'Umbilical', 'Braco'))]
TORRES = [o for o in ALTO if any(k in o.name for k in ('Torre', 'Passarela', 'Umbilical', 'Braco'))]
M0 = {o.name: o.matrix_basis.copy() for o in ALTO}   # sem pais; matrix_world fica desatualizada fora da camada ativa
vl = sc.view_layers['Plataforma_B2']


def G(x, z, y=0.0):
    return Vector((x, -z, y))


GRUPO1 = [o for o in TORRES if any(k in o.name for k in ('Torre_1', '_T1_', 'Braco'))]
GRUPO2 = [o for o in TORRES if o not in GRUPO1]
EIXO = (PIV - G(0.0, 33.0)).to_2d().normalized()            # do elevador para o foguete (Blender XY)


def ang_eixo(o):
    v = (M0[o.name].translation - PIV).to_2d().normalized()
    return math.degrees(math.atan2(EIXO.x * v.y - EIXO.y * v.x, EIXO.dot(v)))


A1 = ang_eixo(bpy.data.objects['PLAT_B2_Torre_1'])
A2 = ang_eixo(bpy.data.objects['PLAT_B2_Torre_2'])


def aplicar(cx=-4.0, cz=41.5, giro=0.0, esc=1.0, sem_torres=False, abertura=None):
    # abertura: ângulo (em módulo) de cada torre em relação ao eixo elevador → foguete; None mantém a v005 (±35°)
    T = Matrix.Translation(G(cx, cz)) @ Matrix.Rotation(math.radians(giro), 4, 'Z') @ \
        Matrix.Diagonal((1.0, 1.0, esc, 1.0)) @ Matrix.Translation(-PIV)
    for o in ALTO:
        R = Matrix.Identity(4)
        if abertura is not None and o in TORRES:
            a = A1 if o in GRUPO1 else A2
            R = Matrix.Translation(PIV) @ Matrix.Rotation(math.radians(math.copysign(abertura, a) - a), 4, 'Z') @ Matrix.Translation(-PIV)
        o.matrix_basis = T @ R @ M0[o.name]
        o.hide_viewport = sem_torres and o in TORRES
    vl.update()
    dg = vl.depsgraph
    dg.update()
    return dg


def bloqueio(dg, o, d):
    dist = DCAM
    for _ in range(24):
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


PONTOS = [(0.0, 19 + 0.5 * i) for i in range(29)] + [(-0.8, 31.0), (0.8, 31.0), (-0.8, 33.0), (0.8, 33.0)]


def medir(dg, passo=2):
    pior, soma, quem = 0, 0, {}
    elev = 0
    for (x, z) in PONTOS:
        n = 0
        for a in range(0, 360, passo):
            d = Vector((math.cos(math.radians(a)) * 18.38, -math.sin(math.radians(a)) * 18.38, 13.55)).normalized()
            hit = False
            for h in (0.3, 0.9, 1.25):
                b = bloqueio(dg, G(x, z, h), d)
                if b and b.startswith('PLAT_B2_') and b.replace('PLAT_B2_', '') and any(o.name == b for o in ALTO):
                    hit = True
                    quem[b] = quem.get(b, 0) + 1
            n += passo if hit else 0
        pior = max(pior, n)
        soma += n
        if (x, z) == (0.0, 33.0):
            elev = n
    return {'graus_pior_ponto': pior, 'graus_elevador': elev, 'graus_soma': soma,
            'bloqueadores': dict(sorted(quem.items(), key=lambda kv: -kv[1])[:4])}


def folga_deck(cx, cz, giro):
    # distância da borda da base de lançamento à borda do deck (x −7..7, z ≤ 38): 0 = encostada
    o = bpy.data.objects['PLAT_B2_Base_Lancamento']
    vs = [o.matrix_basis @ v.co for v in o.data.vertices]
    zmin = min(-v.y for v in vs)
    xs = [v.x for v in vs]
    dz = max(0.0, zmin - 38.0)
    dx = max(0.0, -7.0 - max(xs), min(xs) - 7.0)
    return round(math.hypot(dx, dz), 2)


res = []
if MODO == 'grade':
    for esc in (1.0, 0.85, 0.7, 0.55, 0.45):
        for cx in (-4.0, -7.0, -10.0, -13.0, -16.0):
            for cz in (41.5, 44.0, 47.0, 50.0):
                bear0 = math.degrees(math.atan2(-(41.5 - 33.0), -4.0))
                bear = math.degrees(math.atan2(-(cz - 33.0), cx))
                dg = aplicar(cx, cz, bear - bear0, esc)
                r = medir(dg)
                r.update({'cx': cx, 'cz': cz, 'escala_altura': esc, 'altura_foguete_m': round(14.03 * esc, 1),
                          'dist_elevador_m': round(math.hypot(cx, cz - 33), 1), 'folga_deck_m': folga_deck(cx, cz, 0)})
                res.append(r)
                print('C', json.dumps({k: r[k] for k in ('cx', 'cz', 'escala_altura', 'graus_pior_ponto', 'graus_elevador', 'folga_deck_m')}))
elif MODO == 'fino':
    for ab in (None, 20.0, 10.0):
        for cx in (-6.0, -8.0, -10.0, -12.0, -14.0):
            for cz in (41.5, 43.0, 44.5, 46.0, 47.5):
                bear0 = math.degrees(math.atan2(-(41.5 - 33.0), -4.0))
                bear = math.degrees(math.atan2(-(cz - 33.0), cx))
                dg = aplicar(cx, cz, bear - bear0, 1.0, abertura=ab)
                r = medir(dg)
                r.update({'cx': cx, 'cz': cz, 'abertura_torres': ab if ab is not None else 35.0, 'escala_altura': 1.0,
                          'desloc_m': round(math.hypot(cx + 4.0, cz - 41.5), 1), 'folga_deck_m': folga_deck(cx, cz, 0)})
                res.append(r)
                print('F', json.dumps({k: r[k] for k in ('cx', 'cz', 'abertura_torres', 'graus_pior_ponto', 'graus_elevador', 'desloc_m', 'folga_deck_m')}))
elif MODO == 'fronteira':
    # passo de 1°, altura original; procura o menor afastamento do deck que zera o acesso, a baia e o elevador
    for cx in (-10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0):
        for cz in (42.0, 43.0, 44.0, 45.0, 46.0, 47.0, 48.0):
            bear0 = math.degrees(math.atan2(-(41.5 - 33.0), -4.0))
            bear = math.degrees(math.atan2(-(cz - 33.0), cx))
            dg = aplicar(cx, cz, bear - bear0, 1.0)
            r = medir(dg, passo=1)
            r.update({'cx': cx, 'cz': cz, 'escala_altura': 1.0, 'desloc_m': round(math.hypot(cx + 4.0, cz - 41.5), 1),
                      'folga_deck_m': folga_deck(cx, cz, 0)})
            res.append(r)
            print('R', json.dumps({k: r[k] for k in ('cx', 'cz', 'graus_pior_ponto', 'graus_elevador', 'desloc_m', 'folga_deck_m')}))
elif MODO == 'altura':
    for cx, cz, escs in ((-4.0, 41.5, (0.4, 0.45, 0.5)), (-7.0, 44.0, (0.65, 0.7, 0.75)), (-10.0, 41.5, (0.65, 0.7, 0.75)),
                         (-8.0, 43.0, (0.65, 0.7))):
        for esc in escs:
            bear0 = math.degrees(math.atan2(-(41.5 - 33.0), -4.0))
            bear = math.degrees(math.atan2(-(cz - 33.0), cx))
            dg = aplicar(cx, cz, bear - bear0, esc)
            r = medir(dg, passo=1)
            r.update({'cx': cx, 'cz': cz, 'escala_altura': esc, 'altura_foguete_m': round(14.03 * esc, 1),
                      'desloc_m': round(math.hypot(cx + 4.0, cz - 41.5), 1), 'folga_deck_m': folga_deck(cx, cz, 0)})
            res.append(r)
            print('H', json.dumps({k: r[k] for k in ('cx', 'cz', 'altura_foguete_m', 'graus_pior_ponto', 'graus_elevador', 'desloc_m', 'folga_deck_m')}))
elif MODO == 'torres':
    for nome, kw in (('v005', {}), ('sem_torres_e_braco', {'sem_torres': True})):
        dg = aplicar(**kw)
        r = medir(dg, passo=1)
        r['variante'] = nome
        res.append(r)
        print('T', json.dumps(r, ensure_ascii=False))
json.dump(res, open(SAIDA, 'w'), ensure_ascii=False)
print('BUSCA_OK', len(res), 'A1', round(A1, 1), 'A2', round(A2, 1))
