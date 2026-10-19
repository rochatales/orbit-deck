# Estudo de arte — plataforma de lançamento · v006 ("B3"): a B refinada da v005 com o conjunto 6 m a oeste e o
# foguete com 9,8 m, para que nenhum ângulo da câmera em giro livre esconda o jogador no acesso, na baia e no
# elevador (scripts/busca_v006.py). Braço da tripulação em treliça, ligado à torre e ao casco; torre e mastro em lados
# opostos do foguete para separar as silhuetas na vista sul. O cenário não mostra rota subterrânea.
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v005_plataforma_B2.blend \
#           -P art-source/mars-colony-plataforma/scripts/build_plataforma_v006.py -- criar
#   (reconstrução: rode sobre mars_colony_estudo_v006_plataforma_B3.blend, sem "criar")
# Parte da v005 (preservada) e grava um arquivo NOVO. Não altera pisos, colisores ativos, INTERACT_Nave nem o embarque.
import bpy
import math
import os
import sys
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
V6 = os.path.join(ROOT, 'blend', 'mars_colony_estudo_v006_plataforma_B3.blend')
sys.path.insert(0, HERE)
import importlib
import colony_lib_v004 as L
importlib.reload(L)
from colony_lib_v004 import G, Builder, collection, make_obj, text_mesh, link_dup

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if 'criar' in args:
    assert bpy.data.filepath.endswith('mars_colony_estudo_v005_plataforma_B2.blend'), bpy.data.filepath
    assert not os.path.exists(V6), 'v006 já existe; não sobrescrever'
    bpy.ops.wm.save_as_mainfile(filepath=V6, copy=False)
assert bpy.data.filepath == V6, 'rode sobre a v006 (ou com -- criar a partir da v005)'

PI = math.pi
sc = bpy.context.scene
M = {k: bpy.data.materials[n] for k, n in (
    ('painel', 'M_Painel'), ('estrutura', 'M_Estrutura'), ('metal', 'M_MetalEscuro'), ('marcacao', 'M_Marcacao'),
    ('ambar', 'M_LuzAmbar'), ('vidro', 'M_Vidro'), ('vedacao', 'M_Vedacao'), ('texto', 'M_Sinal_Texto'),
    ('tela', 'M_TelaCiano'), ('concreto', 'M_Concreto'), ('casco', 'M_Foguete_Casco'), ('motor', 'M_Foguete_Motor'),
    ('deck', 'M_Deck'), ('junta', 'M_Junta'))}

# ------------------------------------------------------------ parâmetros (scripts/busca_v006.py, notas/busca_v006_*.json)
CX, CZ = -10.0, 41.5              # centro do foguete (jogo): 6 m a oeste da v005, base encostada no deck
ALT_FOG = 9.8                     # v005: 14 m; v004: 17,8 m
K = ALT_FOG / 17.84               # escala vertical sobre a malha da v004
ESC_XY = 0.75                     # um pouco mais robusto que a redução uniforme (0,55), para manter massa
RZ = PI / 2                       # escotilha (face +Y local) voltada para oeste, para a torre; aceleradores norte-sul
D_TORRE = 3.8                     # torre a oeste e mastro a leste, no eixo leste-oeste (silhuetas separadas na vista S)
ALT_TORRE_TOTAL = 8.2             # proporção torre/foguete da v005 (11,7/14)
ALT_MASTRO_TOTAL = 5.6
BASE_HX, BASE_HZ = 2.3, 1.65      # meia-largura × meia-profundidade da base (locais, antes do giro)

# ------------------------------------------------------------ coleções (idempotente)
c = bpy.data.collections.get('PLATAFORMA_B3_V006')
if c:
    for o in list(c.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
C = {'b3': collection('PLATAFORMA_B3_V006', bpy.data.collections['ARQUITETURA'])}
C['col'] = bpy.data.collections['COL_NOVO_PLATAFORMA']
for o in list(C['col'].objects):
    if o.name.startswith('COL_NOVO_PLAT_B3_'):
        bpy.data.objects.remove(o, do_unlink=True)


def caixa(b, x0, x1, z0, z1, y0, y1, m):
    b.bounds(x0, x1, -z1, -z0, y0, y1, m)


def suave(o, ang=35):
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(ang))
    return o


def col_novo(nome, cx, cz, hx, hz, h, nota):
    r = (cx - hx, cx + hx, cz - hz, cz + hz)
    b = Builder(origin=G(cx, cz))
    caixa(b, *r, 0, h, M['junta'])
    o = b.build(nome, C['col'], props={'rect_jogo': '%.3f,%.3f,%.3f,%.3f' % r, 'conjunto': 'proposta (fora do candidato)',
                                       'nota': nota})
    o.display_type = 'WIRE'
    o.hide_render = True
    return o


def aabb_rot(hx, hz, rz):
    c_, s_ = abs(math.cos(rz)), abs(math.sin(rz))
    return hx * c_ + hz * s_, hx * s_ + hz * c_


def faixa_perigo(b, centro, raio_in, raio_out, n, z, rz0=0.0):
    # anel de segurança rente: segmentos alternados claro/escuro (linguagem industrial, sem código de cor)
    for k in range(n):
        a0 = rz0 + 2 * PI * k / n
        a1 = rz0 + 2 * PI * (k + 1) / n
        pts = []
        for r_, a in ((raio_in, a0), (raio_out, a0), (raio_out, a1), (raio_in, a1)):
            pts.append((centro.x + r_ * math.cos(a), centro.y + r_ * math.sin(a), z))
        b.prism(pts, [(p[0], p[1], z + 0.006) for p in pts], M['marcacao'] if k % 2 == 0 else M['metal'])


pf = G(CX, CZ)
# ============================================================ foguete (mesmo desenho, 9,8 m)
me = bpy.data.meshes['PLAT_Foguete'].copy()
me.name = 'PLAT_B3_Foguete'
me.transform(Matrix.Diagonal((ESC_XY, ESC_XY, K, 1)))
me.transform(Matrix.Rotation(RZ, 4, 'Z'))
fog = make_obj('PLAT_B3_Foguete', me, C['b3'], pf)
suave(fog, 30)
fog.location.z = 0.93 - 1.15 * K
fog['altura_total_m'] = ALT_FOG
fog['nota'] = 'Desenho da v004/v005 com 9,8 m; escotilha voltada para a torre (oeste).'
R_CORE = 1.2 * ESC_XY

# base de lançamento
b = Builder(origin=pf)
o0 = pf
hx, hy = BASE_HX, BASE_HZ
b.bounds(o0.x - hx, o0.x + hx, o0.y - hy, o0.y + hy, -0.5, 0.25, M['concreto'])
b.bounds(o0.x - hx + 0.1, o0.x + hx - 0.1, o0.y - hy + 0.1, o0.y + hy - 0.1, 0.25, 0.85, M['painel'])
b.bounds(o0.x - hx, o0.x + hx, o0.y - hy, o0.y + hy, 0.85, 0.93, M['estrutura'])
for s in (-1, 1):
    b.bounds(o0.x - 0.7, o0.x + 0.7, o0.y + s * hy - 0.03, o0.y + s * hy + 0.03, 0.25, 0.75, M['motor'])
for a in range(4):
    ang = a * PI / 2 + PI / 4
    p = o0 + Vector((math.cos(ang), math.sin(ang), 0)) * 1.15
    b.box((p.x, p.y, 1.1), (0.34, 0.34, 0.4), M['estrutura'], rz=ang)
    q = o0 + Vector((math.cos(ang), math.sin(ang), 0)) * 0.98
    b.box((q.x, q.y, 1.25), (0.26, 0.18, 0.14), M['metal'], rz=ang)
base = b.build('PLAT_B3_Base_Lancamento', C['b3'], bevel=(0.03, 2, 40))
base.data.transform(Matrix.Rotation(RZ, 4, 'Z'))

# casa do elevador na base: mesmo desenho do elevador da baia (anel de segurança, coluna e placa), porta voltada à baia
ax_baia = (G(0.0, 33.0) - pf)
ax_baia.z = 0
ax_baia.normalize()
rz_baia = math.atan2(ax_baia.y, ax_baia.x)
hc = pf + ax_baia * 1.55
b = Builder(origin=(hc.x, hc.y, 0.93))
b.box((hc.x, hc.y, 1.83), (1.1, 1.3, 1.8), M['painel'], rz=rz_baia)
b.box((hc.x, hc.y, 2.78), (1.22, 1.42, 0.1), M['estrutura'], rz=rz_baia)
dp = hc + ax_baia * 0.56
b.box((dp.x, dp.y, 1.6), (0.04, 0.8, 1.3), M['metal'], rz=rz_baia)
b.box((dp.x, dp.y, 2.36), (0.05, 0.9, 0.06), M['marcacao'], rz=rz_baia)
lp = hc + ax_baia * 0.57 + Vector((-ax_baia.y, ax_baia.x, 0)) * 0.55
b.box((lp.x, lp.y, 2.0), (0.04, 0.12, 0.12), M['ambar'], rz=rz_baia)
soleira = hc + ax_baia * 0.95
faixa_perigo(b, Vector((soleira.x, soleira.y, 0)), 0.0001, 0.42, 8, 0.93, rz_baia)
casa = b.build('PLAT_B3_Casa_Elevador_Base', C['b3'], bevel=(0.02, 2, 40),
               props={'tipo': 'chegada do elevador de embarque na base (cenográfica)'})
text_mesh('PLAT_B3_Sinal_Casa_Elevador', 'ELEVADOR', 0.16, C['b3'], hc + ax_baia * 0.585 + Vector((0, 0, 2.55)),
          (PI / 2, 0, rz_baia + PI / 2), M['texto'], extrude=0.002)

# ============================================================ torre (oeste, braço da tripulação) e mastro (leste)
tw_mesh = bpy.data.meshes['PLAT_Torre_Servico']
dir_oeste, dir_leste = Vector((-1, 0, 0)), Vector((1, 0, 0))
P_T = pf + dir_oeste * D_TORRE
P_M = pf + dir_leste * D_TORRE


def torre(nome, pos, total, esc_xy):
    alt = (total - 0.3) / (1 + 1.45 / 13.0)
    mm = tw_mesh.copy()
    mm.name = nome
    mm.transform(Matrix.Diagonal((esc_xy, esc_xy, alt / 13.0, 1)))
    o = make_obj(nome, mm, C['b3'], pos)
    o['altura_m'] = total
    return o


t1 = torre('PLAT_B3_Torre_Servico', P_T, ALT_TORRE_TOTAL, 0.85)
t2 = torre('PLAT_B3_Mastro_Servico', P_M, ALT_MASTRO_TOTAL, 0.7)
for nome, p, hw, h in (('COL_NOVO_PLAT_B3_Torre_Servico', P_T, 0.85 * 0.85, 9.0),
                       ('COL_NOVO_PLAT_B3_Mastro_Servico', P_M, 0.85 * 0.7, 6.0)):
    col_novo(nome, p.x, -p.y, hw, hw, h, 'fora do deck caminhável')
bx, bz = aabb_rot(BASE_HX, BASE_HZ, RZ)
col_novo('COL_NOVO_PLAT_B3_Base_Lancamento', CX, CZ, bx, bz, 2.0, 'base fora do deck')


def passarela(nome, p0, p1, alt, larg=0.8):
    p0, p1 = Vector((p0.x, p0.y, 0)), Vector((p1.x, p1.y, 0))
    d = p1 - p0
    L_ = d.length
    rz = math.atan2(d.y, d.x)
    mid = (p0 + p1) / 2
    b = Builder(origin=(mid.x, mid.y, alt))
    R3 = Matrix.Rotation(rz, 3, 'Z')

    def lp_(u, v, z):
        q = Vector((u, v, 0))
        q.rotate(R3)
        return (mid.x + q.x, mid.y + q.y, z)
    b.box(lp_(0, 0, alt), (L_, larg, 0.12), M['metal'], rz=rz)
    b.box(lp_(0, 0, alt - 0.12), (L_, 0.2, 0.16), M['estrutura'], rz=rz)
    for sv in (-1, 1):
        b.box(lp_(0, sv * larg / 2, alt + 1.0), (L_, 0.05, 0.05), M['estrutura'], rz=rz)
        b.box(lp_(0, sv * larg / 2, alt + 0.55), (L_, 0.03, 0.03), M['estrutura'], rz=rz)
        nposts = max(1, int(L_ / 0.9))
        for k in range(nposts + 1):
            b.box(lp_(-L_ / 2 + k * L_ / nposts, sv * larg / 2, alt + 0.5), (0.05, 0.05, 1.0), M['estrutura'], rz=rz)
    return b.build(nome, C['b3'], props={'tipo': 'passarela', 'altura_m': alt})


def mangueira(nome, pts, r=0.055, m=None):
    b = Builder(origin=pts[0])
    b.polypipe([Vector(p) for p in pts], r, m or M['vedacao'], seg=10, elbow=m or M['vedacao'])
    return suave(b.build(nome, C['b3'], props={'tipo': 'cabo/linha de abastecimento'}), 50)


def catenaria(a, b_, flecha, n=8):
    a, b_ = Vector(a), Vector(b_)
    return [a.lerp(b_, t) - Vector((0, 0, flecha * 4 * t * (1 - t))) for t in (i / n for i in range(n + 1))]


# passarela de serviço da torre e umbilicais do mastro
ini_t, fim_t = P_T + dir_leste * 0.72, pf + dir_oeste * (R_CORE + 0.1)
passarela('PLAT_B3_Passarela_Servico_3m', ini_t, fim_t, 3.0)
ini_m, fim_m = P_M + dir_oeste * 0.5, pf + dir_leste * (R_CORE + 0.1)
for k, (h0, h1) in enumerate(((2.2, 1.95), (4.4, 4.1))):
    lat = Vector((0, 0.25 * (2 * k - 1), 0))
    mangueira('PLAT_B3_Umbilical_Mastro_%d' % (k + 1), catenaria(ini_m + lat + Vector((0, 0, h0)), fim_m + lat + Vector((0, 0, h1)), 0.3))
mangueira('PLAT_B3_Umbilical_Torre', catenaria(ini_t + Vector((0, 0.68, 4.6)), fim_t + Vector((0, 0.68, 4.3)), 0.3), m=M['estrutura'])

# ============================================================ braço da tripulação: treliça presa à torre, cabine encostada no casco
H_ESC = fog.location.z + (1.15 + 9.6) * K          # altura da escotilha da malha original, na nova escala
piso = H_ESC - 0.55
x_torre = P_T.x + 0.72                             # face leste da torre
x_casco = pf.x - R_CORE                            # casco na direção da escotilha
cab_l = 0.75                                       # comprimento da cabine (sala branca) junto ao casco
x_cab0, x_cab1 = x_casco - cab_l, x_casco + 0.14   # entra um pouco no casco: sem fresta na curvatura
y0 = pf.y
H_TR = 1.3                                         # altura da treliça; a cabine tem a mesma altura (bloco contínuo)
b = Builder(origin=(x_torre, y0, piso))
# treliça: banzos inferior e superior, montantes e diagonais, dos dois lados do piso, até a cabine
for sv in (-1, 1):
    yy = y0 + sv * 0.45
    b.pipe((x_torre, yy, piso), (x_cab0, yy, piso), 0.05, M['estrutura'], seg=6)
    b.pipe((x_torre, yy, piso + H_TR), (x_cab0, yy, piso + H_TR), 0.045, M['estrutura'], seg=6)
    n = 3
    for k in range(n + 1):
        xa = x_torre + (x_cab0 - x_torre) * k / n
        b.pipe((xa, yy, piso), (xa, yy, piso + H_TR), 0.035, M['estrutura'], seg=6)
        if k < n:
            xb = x_torre + (x_cab0 - x_torre) * (k + 1) / n
            b.pipe((xa, yy, piso + (0 if k % 2 == 0 else H_TR)), (xb, yy, piso + (H_TR if k % 2 == 0 else 0)), 0.03, M['estrutura'], seg=6)
b.bounds(x_torre, x_cab0, y0 - 0.42, y0 + 0.42, piso - 0.06, piso + 0.04, M['metal'])           # piso do braço
b.bounds(x_torre, x_cab0, y0 - 0.47, y0 + 0.47, piso + H_TR + 0.03, piso + H_TR + 0.08, M['metal'])  # cobertura leve
# articulação na torre: dois mancais nas laterais e o pino; mão-francesa da torre até o meio do vão
for sv in (-1, 1):
    b.bounds(x_torre - 0.06, x_torre + 0.14, y0 + sv * 0.45 - 0.05, y0 + sv * 0.45 + 0.05, piso - 0.25, piso + 0.35, M['metal'])
b.cyl((x_torre + 0.05, y0, piso + 0.05), 0.07, 1.05, M['estrutura'], seg=10, rx=PI / 2)
for sv in (-1, 1):
    b.pipe((x_torre + 0.05, y0 + sv * 0.45, piso - 1.6), ((x_torre + x_cab0) / 2, y0 + sv * 0.45, piso - 0.05), 0.05, M['estrutura'], seg=6)
# cabine (sala branca) presa ao fim da treliça e encostada no casco; quadro na mesma estrutura verde da torre
b.bounds(x_cab0, x_cab1, y0 - 0.45, y0 + 0.45, piso - 0.06, piso + H_TR + 0.02, M['painel'])
b.bounds(x_cab0 - 0.02, x_cab1, y0 - 0.48, y0 + 0.48, piso + H_TR + 0.02, piso + H_TR + 0.1, M['metal'])
for sv in (-1, 1):
    for xx in (x_cab0, x_casco - 0.05):
        b.bounds(xx - 0.04, xx + 0.04, y0 + sv * 0.46 - 0.04, y0 + sv * 0.46 + 0.04, piso - 0.08, piso + H_TR + 0.06, M['estrutura'])
b.bounds(x_cab0 - 0.02, x_cab0 + 0.01, y0 - 0.3, y0 + 0.3, piso, piso + 1.1, M['metal'])        # vão do braço
b.cyl((x_casco + 0.02, y0, piso + 0.62), 0.6, 0.12, M['metal'], seg=24, ry=PI / 2)              # colar de acoplamento
braco = b.build('PLAT_B3_Braco_Tripulacao', C['b3'], bevel=(0.01, 1, 40),
                props={'nota': 'Treliça articulada na torre, com mão-francesa; cabine encostada no casco com colar de acoplamento. '
                               'Cenográfico: o jogador não entra.'})
suave(braco, 40)

# linhas dos tanques → torre, por fora do deck
b = Builder(origin=G(-12.4, 37))
rota = [G(-12.4, 33.4, 0.6), G(-12.4, 34.6, 0.15), G(-13.7, 36.0, 0.15), G(P_T.x + 0.3, 40.4, 0.15),
        G(P_T.x + 0.3, 40.4, 1.1)]
for dz in (0.0, 0.3):
    b.polypipe([p + Vector((dz, 0, 0)) for p in rota], 0.07, M['estrutura'], elbow=M['metal'])
for p in (G(-12.4, 35.0), G(-13.5, 37.5), G(-13.5, 39.5)):
    b.bounds(p.x - 0.3, p.x + 0.6, p.y - 0.12, p.y + 0.12, 0.0, 0.1, M['metal'])
b.build('PLAT_B3_Linhas_Tanques', C['b3'], props={'nota': 'Fora da área caminhável; não cruza a passagem.'})

# ============================================================ baia: elevador de embarque no ponto real de interação
pe = G(0, 33)
b = Builder(origin=pe)
b.cyl(G(0, 33, 0.004), 1.18, 0.008, M['metal'], seg=48)
faixa_perigo(b, pe, 0.98, 1.14, 24, 0.008)
b.cyl(G(0, 33, 0.011), 0.97, 0.006, M['deck'], seg=48)
b.cyl(G(0, 33, 0.015), 0.9, 0.003, M['metal'], seg=48)                 # junta da plataforma móvel
b.cyl(G(0, 33, 0.016), 0.88, 0.003, M['deck'], seg=48)
for k in range(4):
    a = k * PI / 2 + PI / 4
    p = pe + Vector((math.cos(a), math.sin(a), 0)) * 0.55
    b.box((p.x, p.y, 0.02), (0.22, 0.22, 0.004), M['metal'], rz=a)
b.build('PLAT_B3_Elevador_Embarque', C['b3'], props={'tipo': 'elevador de embarque', 'centro_jogo_xz': '0, 33',
                                                     'nota': 'Coincide com INTERACT_Nave (para onde o jogo leva o jogador ao embarcar). Rente ao piso.'})
b = Builder(origin=G(0, 31))
for k in range(4):                                                    # chevrons do desembarque até o elevador
    z = 30.4 + k * 0.5
    for sv in (-1, 1):
        b.box(G(sv * 0.32, z, 0.004), (0.55, 0.1, 0.007), M['marcacao'], rz=sv * math.radians(35))
b.build('PLAT_B3_Chevrons_Embarque', C['b3'], props={'tipo': 'sinalização de piso (rente)'})
text_mesh('PLAT_B3_Sinal_Piso_Embarque', 'EMBARQUE', 0.38, C['b3'], G(0, 29.95, 0.009), (0, 0, 0), M['marcacao'], extrude=0.0)
# coluna de chamada do elevador: totalmente dentro do colisor COL_Nave_Fundo (x ±1,7; z 34,75..35,25)
b = Builder(origin=G(0, 35.0))
caixa(b, -1.25, 1.25, 34.78, 35.25, 0.0, 1.25, M['painel'])
caixa(b, -1.3, 1.3, 34.75, 35.25, 1.25, 1.33, M['estrutura'])
caixa(b, -0.9, 0.9, 34.76, 34.78, 0.55, 1.12, M['metal'])
caixa(b, -0.8, 0.8, 34.755, 34.76, 0.62, 1.05, M['tela'])
caixa(b, 1.0, 1.12, 34.755, 34.76, 0.95, 1.07, M['ambar'])          # lâmpada de estado (padrão das portas da colônia)
caixa(b, -0.3, 0.3, 34.752, 34.755, 0.16, 0.2, M['marcacao'])
b.build('PLAT_B3_Totem_Embarque', C['b3'], bevel=(0.015, 1, 40),
        props={'nota': 'x ±1,3 e z 34,75–35,25, dentro do colisor do fundo (como na v005).'})
text_mesh('PLAT_B3_Sinal_Totem', 'ELEVADOR DE EMBARQUE', 0.11, C['b3'], G(0, 34.752, 0.86), (PI / 2, 0, PI), M['texto'], extrude=0.002)


# ============================================================ camadas
def find_lc(lc, name):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        r = find_lc(ch, name)
        if r:
            return r


def camada(nome, excl):
    vl = sc.view_layers.get(nome) or sc.view_layers.new(nome)
    for n in ('REF_LAYOUT', 'TERRENO', 'ARQUITETURA', 'TELHADOS', 'PROPS', 'MARCADORES', 'COLISORES_ESTUDO', 'LUZES_CAMERAS',
              'PLATAFORMA_COMUM', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_B2_REFINADA', 'PLATAFORMA_B3_V006',
              'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA', 'PLATAFORMA_COMUM_PISO_V004', 'V003_SUBSTITUIDOS', 'COL_NOVO_PLATAFORMA',
              'REF_EXPLORADOR', 'ARQ_Pisos'):
        lc = find_lc(vl.layer_collection, n)
        if lc:
            lc.exclude = n in excl
    return vl


for vln in [v.name for v in sc.view_layers]:
    if not vln.endswith('B3'):
        lc = find_lc(sc.view_layers[vln].layer_collection, 'PLATAFORMA_B3_V006')
        if lc:
            lc.exclude = True
base_excl = ['COLISORES_ESTUDO', 'V003_SUBSTITUIDOS', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_COMUM_PISO_V004',
             'PLATAFORMA_B2_REFINADA', 'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA']
camada('Plataforma_B3', base_excl + ['REF_LAYOUT'])
camada('Planta_Plataforma_B3', base_excl + ['TELHADOS'])

LC = bpy.data.collections['LUZES_CAMERAS']
o = bpy.data.objects.get('CAM_PLAT_B3_Conexao')
if o:
    bpy.data.objects.remove(o, do_unlink=True)
cd = bpy.data.cameras.new('CAM_PLAT_B3_Conexao')
cd.lens, cd.clip_start, cd.clip_end = 26, 0.1, 400
o = bpy.data.objects.new('CAM_PLAT_B3_Conexao', cd)
LC.objects.link(o)
o.location = G(9.0, 22.0, 13.0)
alvo = G(-5.5, 37.5, 1.0)
o.rotation_euler = (alvo - o.location).normalized().to_track_quat('-Z', 'Y').to_euler()
sc['estudo'] = 'Colônia de Marte v006 — plataforma B3 (B refinada da v005, conjunto a oeste, foguete de 9,8 m)'
bpy.ops.wm.save_mainfile()
print('BUILD_V006_OK', {'centro': (CX, CZ), 'torre': (round(P_T.x, 2), round(-P_T.y, 2)), 'mastro': (round(P_M.x, 2), round(-P_M.y, 2)),
                        'altura_foguete': ALT_FOG, 'escotilha_m': round(H_ESC, 2)})
