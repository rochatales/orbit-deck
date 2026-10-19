# Oclusão na rotação contínua da câmera do jogo (CameraRig.tsx): Q/C giram 1,75 rad/s sem encaixe, ângulo amortecido
# (dampAngle, 8), câmera a 18,38 m na horizontal e 13,55 m de altura do alvo, near 0,1. A bordo (0; 33) a rotação fica
# bloqueada (simulationBlocked) e o ângulo congela no do embarque. Varre 360° de 1 em 1° e mede, por ponto, a fração
# do corpo do jogador (0,3 / 0,9 / 1,25 m) oculta pela plataforma (PLAT_*) e por qualquer objeto. O raio só conta até
# o plano da câmera: o que fica atrás dela é cortado pelo near e não oculta. Não salva o .blend.
#   Blender -b <arquivo.blend> -P art-source/mars-colony-plataforma/scripts/rotacao_v006.py -- <camada> <saida.json> [deck]
import bpy
import json
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
args = sys.argv[sys.argv.index('--') + 1:]
LAYER, SAIDA = args[0], args[1]
DECK = 'deck' in args[2:]
sc = bpy.context.scene
IGN = ('REF_', 'COL_', 'SPAWN_', 'INTERACT_', 'LUZ_', 'CAM_')
DCAM = math.hypot(18.38, 13.55) - 0.1          # do alvo até o plano near
ALT = (0.3, 0.9, 1.25)
CONJ_ALTO = ('Foguete', 'Torre', 'Mastro', 'Braco', 'Passarela', 'Umbilical', 'Base_Lanc', 'Casa_Elev', 'Linhas')
VEL = 1.75                                     # rad/s (Q/C)


def G(x, z, y=0.0):
    return Vector((x, -z, y))


vl = sc.view_layers[LAYER]
if vl.depsgraph is None:
    vl.update()
dg = vl.depsgraph
dg.update()


def bloqueio(o, d):
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


DIRS = [Vector((math.cos(math.radians(a)) * 18.38, -math.sin(math.radians(a)) * 18.38, 13.55)).normalized() for a in range(360)]


def perfil(x, z, passo=1, alturas=ALT):
    plat, qual, quem = [], [], {}
    for a in range(0, 360, passo):
        bl = [bloqueio(G(x, z, h), DIRS[a]) for h in alturas]
        p = [b for b in bl if b and b.startswith('PLAT_')]
        plat.append(round(len(p) / len(alturas), 2))
        qual.append(round(sum(1 for b in bl if b) / len(alturas), 2))
        for b in p:
            quem[b] = quem.get(b, 0) + 1
    return plat, qual, quem


def setores(v, passo=1, lim=0.0):
    n, out, i = len(v), [], 0
    on = [x > lim for x in v]
    if all(on):
        return [[0, 360]]
    k0 = next(i for i in range(n) if not on[i])      # começa num ponto livre para tratar a volta 359° → 0°
    i = 0
    while i < n:
        j = (k0 + i) % n
        if on[j]:
            s = i
            while i < n and on[(k0 + i) % n]:
                i += 1
            out.append([((k0 + s) % n) * passo, ((k0 + i - 1) % n) * passo])
        else:
            i += 1
    return out


def giro(v, passo=1, a0=45.0, sentido=1, voltas=1.0, dt=1 / 120):
    # segura Q (sentido +1) ou C (−1) a partir de a0 até completar `voltas`; ângulo real amortecido como no jogo
    alvo = ang = math.radians(a0)
    fim = alvo + sentido * voltas * 2 * math.pi
    t = oculto = 0.0
    while abs(ang - fim) > math.radians(0.2):
        if (fim - alvo) * sentido > 0:
            alvo = alvo + sentido * min(VEL * dt, abs(fim - alvo))
        ang = ang + (alvo - ang) * (1 - math.exp(-8 * dt))
        k = int(round(math.degrees(ang) / passo)) % len(v)
        if v[k] > 0:
            oculto += dt
        t += dt
    return round(t, 2), round(oculto, 2)


PONTOS = {'elevador_0_33': (0.0, 33.0), 'desembarque_0_29_5': (0.0, 29.5)}
for i in range(21):
    PONTOS['acesso_z%.1f' % (19 + 0.5 * i)] = (0.0, 19 + 0.5 * i)
for i in range(1, 7):
    PONTOS['baia_z%.1f' % (29.5 + 0.5 * i)] = (0.0, 29.5 + 0.5 * i)
rep = {'camada': LAYER, 'camera': {'horizontal_m': 18.38, 'altura_m': 13.55, 'giro_rad_s': VEL, 'amortecimento': 8,
                                   'raio_ate_plano_near_m': round(DCAM, 2), 'giro_livre_sem_encaixe': True},
       'pontos': {}}
for nome, (x, z) in PONTOS.items():
    plat, qual, quem = perfil(x, z)
    sp = setores(plat)
    rep['pontos'][nome] = {
        'x': x, 'z': z,
        'graus_ocultos_pela_plataforma': sum(1 for v in plat if v > 0),
        'graus_totalmente_ocultos_pela_plataforma': sum(1 for v in plat if v >= 0.99),
        'setores_plataforma': sp,
        'graus_ocultos_por_qualquer_objeto': sum(1 for v in qual if v > 0),
        'bloqueadores_plataforma': dict(sorted(quem.items(), key=lambda kv: -kv[1])[:4]),
        'giro_Q_volta_completa_s': giro(plat), 'perfil_plataforma': plat}
# rotação segurando Q a partir do padrão (45°) até 180°, com o jogador parado no desembarque e na baia
rep['giro_SE_ate_O'] = {n: giro(rep['pontos'][n]['perfil_plataforma'], voltas=135 / 360)
                        for n in ('desembarque_0_29_5', 'baia_z31.0', 'baia_z32.5')}
el = rep['pontos']['elevador_0_33']
rep['elevador_a_bordo'] = {'rotacao_bloqueada': True,
                           'angulos_de_embarque_que_deixam_o_jogador_oculto_todo_o_tempo_a_bordo': el['setores_plataforma']}
resumo = {n: (p['graus_ocultos_pela_plataforma'], p['setores_plataforma']) for n, p in rep['pontos'].items()}
rep['acesso_graus_ocultos_max'] = max(p['graus_ocultos_pela_plataforma'] for p in rep['pontos'].values())

if DECK:
    # pontos alcançáveis do deck e da passagem (colisores ativos, r = 0,36), de 0,5 em 0,5 m, varredura de 3 em 3°
    PIL = json.load(open(os.path.join(ROOT, 'notas', 'piloto_mundo_marte.json')))
    W = PIL['walkableAreas']
    OBS = [(o['minX'], o['maxX'], o['minZ'], o['maxZ']) for o in PIL['obstacles']]

    def livre(x, z):
        if not any(a['minX'] <= x <= a['maxX'] and a['minZ'] <= z <= a['maxZ'] for a in W):
            return False
        for r in OBS:
            dx = max(r[0] - x, 0, x - r[1])
            dz = max(r[2] - z, 0, z - r[3])
            if dx * dx + dz * dz < 0.36 * 0.36:
                return False
        return True
    grade = []
    for ix in range(-14, 15):
        for iz in range(50, 77):
            x, z = ix * 0.5, iz * 0.5
            if not livre(x, z):
                continue
            alto = [0] * 120
            baixo = [0] * 120
            quem = {}
            for k, a in enumerate(range(0, 360, 3)):
                for h in ALT:
                    bn = bloqueio(G(x, z, h), DIRS[a])
                    if bn and bn.startswith('PLAT_'):
                        quem[bn] = quem.get(bn, 0) + 1
                        if any(t in bn for t in CONJ_ALTO):
                            alto[k] += 1
                        else:
                            baixo[k] += 1
            grade.append({'x': x, 'z': z,
                          'graus_conjunto_alto_algum': 3 * sum(1 for v in alto if v),
                          'graus_conjunto_alto_maioria': 3 * sum(1 for v in alto if v >= 2),
                          'graus_conjunto_alto_total': 3 * sum(1 for v in alto if v >= 3),
                          'graus_mobiliario_baixo_algum': 3 * sum(1 for v in baixo if v),
                          'graus_mobiliario_baixo_maioria': 3 * sum(1 for v in baixo if v >= 2),
                          'bloqueadores': dict(sorted(quem.items(), key=lambda kv: -kv[1])[:3])})
    rep['deck_alcancavel'] = grade
    faixa = [g for g in grade if g['z'] >= 35.0]
    rep['deck_resumo'] = {
        'pontos_alcancaveis': len(grade),
        'conjunto_alto': {'pontos_com_ocultacao_em_algum_angulo': sum(1 for g in grade if g['graus_conjunto_alto_algum']),
                          'pontos_com_corpo_majoritariamente_oculto_em_algum_angulo': sum(1 for g in grade if g['graus_conjunto_alto_maioria']),
                          'pontos_com_corpo_todo_oculto_em_algum_angulo': sum(1 for g in grade if g['graus_conjunto_alto_total']),
                          'pior_ponto': max(grade, key=lambda g: g['graus_conjunto_alto_maioria']) if grade else None},
        'mobiliario_baixo': {'pontos_com_ocultacao_em_algum_angulo': sum(1 for g in grade if g['graus_mobiliario_baixo_algum']),
                             'pontos_com_corpo_majoritariamente_oculto_em_algum_angulo': sum(1 for g in grade if g['graus_mobiliario_baixo_maioria'])},
        'faixa_sul_z35_38': {'pontos': len(faixa),
                             'com_corpo_majoritariamente_oculto_pelo_conjunto_alto': sum(1 for g in faixa if g['graus_conjunto_alto_maioria']),
                             'graus_max_maioria_oculta': max((g['graus_conjunto_alto_maioria'] for g in faixa), default=0)}}
    # elementos de leitura: anel do elevador, totem e placa (visíveis ou não em cada ângulo)
    # (a placa do totem só é legível de frente; conta apenas ângulos com a câmera do lado da baia, z < 34,75)
    EL = {'anel_elevador': [(0.0, 33.0, 0.06), (1.2, 33.0, 0.06), (-1.2, 33.0, 0.06), (0.0, 31.8, 0.06)],
          'totem_e_placa_vista_frontal': [(0.0, 34.7, 1.4), (-0.9, 34.7, 1.1), (0.9, 34.7, 1.1)]}
    rep['elementos'] = {}
    for nome, pts in EL.items():
        v = []
        for a in range(0, 360, 3):
            if nome.startswith('totem') and math.sin(math.radians(a)) > -0.05:
                v.append(0.0)
                continue
            bl = [bloqueio(G(x, z, h), DIRS[a]) for x, z, h in pts]
            v.append(round(sum(1 for b in bl if b and b.startswith('PLAT_')) / len(pts), 2))
        rep['elementos'][nome] = {'graus_com_ocultacao_pela_plataforma': 3 * sum(1 for q in v if q > 0),
                                  'graus_maioria_oculta': 3 * sum(1 for q in v if q > 0.5), 'setores': setores(v, 3)}

json.dump(rep, open(SAIDA, 'w'), ensure_ascii=False)
print('ROTACAO_OK', LAYER, json.dumps({k: v for k, v in resumo.items() if v[0]}, ensure_ascii=False))
print('GIRO', json.dumps(rep['giro_SE_ate_O']), 'ELEV', json.dumps(rep['elevador_a_bordo']))
if DECK:
    print('DECK', json.dumps(rep['deck_resumo'], ensure_ascii=False), json.dumps(rep['elementos'], ensure_ascii=False))
