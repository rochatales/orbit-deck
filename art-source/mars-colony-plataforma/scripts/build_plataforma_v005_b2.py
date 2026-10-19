# Estudo de arte — plataforma de lançamento · v005 · refinamento da variante B ("B2")
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v004_plataforma.blend \
#           -P art-source/mars-colony-plataforma/scripts/build_plataforma_v005_b2.py -- criar
#   (reconstrução: rode sobre mars_colony_estudo_v005_plataforma_B2.blend, sem "criar")
# Parte da v004 (preservada) e grava um arquivo NOVO. Não altera pisos, colisores ativos, INTERACT_Nave nem o embarque.
import bpy
import math
import os
import sys
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
V5 = os.path.join(ROOT, 'blend', 'mars_colony_estudo_v005_plataforma_B2.blend')
sys.path.insert(0, HERE)
import importlib
import colony_lib_v004 as L
importlib.reload(L)
from colony_lib_v004 import G, Builder, collection, material, make_obj, text_mesh, link_dup

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if 'criar' in args:
    assert bpy.data.filepath.endswith('mars_colony_estudo_v004_plataforma.blend'), bpy.data.filepath
    assert not os.path.exists(V5), 'v005 já existe; não sobrescrever'
    bpy.ops.wm.save_as_mainfile(filepath=V5, copy=False)
assert bpy.data.filepath == V5, 'rode sobre a v005 (ou com -- criar a partir da v004)'

PI = math.pi
sc = bpy.context.scene
M = {k: bpy.data.materials[n] for k, n in (
    ('painel', 'M_Painel'), ('estrutura', 'M_Estrutura'), ('metal', 'M_MetalEscuro'), ('marcacao', 'M_Marcacao'),
    ('ambar', 'M_LuzAmbar'), ('ciano', 'M_LuzCiano'), ('vidro', 'M_Vidro'), ('vedacao', 'M_Vedacao'),
    ('texto', 'M_Sinal_Texto'), ('texto_escuro', 'M_Sinal_TextoEscuro'), ('tela', 'M_TelaCiano'),
    ('concreto', 'M_Concreto'), ('casco', 'M_Foguete_Casco'), ('motor', 'M_Foguete_Motor'), ('deck', 'M_Deck'))}

# ------------------------------------------------------------ parâmetros escolhidos (scripts/otimizar_b2.py)
CX, CZ = -4.0, 41.5               # centro do foguete (jogo)
ALT_FOG = 14.0                    # altura total do foguete (v004: 17,8 m)
ESC_XY, ESC_Z = 0.92, ALT_FOG / 17.84
ALT_TORRE = 10.3                  # estrutura; total com cabine ≈ 11,5 m (v004: 14,8 m)
THETA = math.radians(35)          # torres atrás do foguete, a ±35° do eixo baia→foguete
D_TORRE = 3.4
BAIA = (0.0, 33.0)
ux, uz = CX - BAIA[0], CZ - BAIA[1]
nrm = math.hypot(ux, uz)
ux, uz = ux / nrm, uz / nrm       # eixo baia→foguete (jogo)
AX = Vector((ux, -uz, 0))         # o mesmo eixo no Blender
RZ = math.atan2(AX.y, AX.x)       # giro do conjunto: aceleradores (eixo local X) alinhados ao eixo

# ------------------------------------------------------------ coleções (idempotente)
for n in ('PLATAFORMA_B2_REFINADA', 'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA'):
    c = bpy.data.collections.get(n)
    if c:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
C = {'b2': collection('PLATAFORMA_B2_REFINADA', bpy.data.collections['ARQUITETURA'])}
C['tunel'] = collection('B2_RAMPA_TRANSFERENCIA_CENOGRAFICA', C['b2'])
C['col'] = bpy.data.collections['COL_NOVO_PLATAFORMA']
for o in list(C['col'].objects):
    if o.name.startswith('COL_NOVO_PLAT_B2_'):
        bpy.data.objects.remove(o, do_unlink=True)
C['piso4'] = collection('PLATAFORMA_COMUM_PISO_V004', bpy.data.collections['PLATAFORMA_COMUM'])
for n in ('PLAT_Baia_Piso_Embarque', 'PLAT_Sinal_Piso_EMBARQUE'):   # marcações da v004 só nas camadas A/B
    o = bpy.data.objects[n]
    if C['piso4'].name not in [c.name for c in o.users_collection]:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        C['piso4'].objects.link(o)


def caixa(b, x0, x1, z0, z1, y0, y1, m):
    b.bounds(x0, x1, -z1, -z0, y0, y1, m)


def suave(o, ang=35):
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(ang))
    return o


def girar_malha(o, rz):
    o.data.transform(Matrix.Rotation(rz, 4, 'Z'))
    return o


def col_novo(nome, cx, cz, hx, hz, h, nota):
    r = (cx - hx, cx + hx, cz - hz, cz + hz)
    b = Builder(origin=G(cx, cz))
    caixa(b, *r, 0, h, bpy.data.materials['M_Junta'])
    o = b.build(nome, C['col'], props={'rect_jogo': '%.3f,%.3f,%.3f,%.3f' % r, 'conjunto': 'proposta (fora do candidato)',
                                       'nota': nota})
    o.display_type = 'WIRE'
    o.hide_render = True
    return o


def aabb_rot(hx, hz, rz):
    c, s = abs(math.cos(rz)), abs(math.sin(rz))
    return hx * c + hz * s, hx * s + hz * c


# ============================================================ foguete reduzido e girado
me = bpy.data.meshes['PLAT_Foguete'].copy()
me.name = 'PLAT_B2_Foguete'
me.transform(Matrix.Diagonal((ESC_XY, ESC_XY, ESC_Z, 1)))
fog = make_obj('PLAT_B2_Foguete', me, C['b2'], G(CX, CZ))
girar_malha(fog, RZ)
suave(fog, 30)
fog['altura_total_m'] = ALT_FOG
fog['nota'] = 'Mesmo desenho da v004, reduzido (14 m) e girado: aceleradores no eixo baia→foguete (perfil estreito visto da baia).'

# base de lançamento girada (5,2 × 3,7 m), sem porta: o acesso chega pelo subsolo
b = Builder(origin=G(CX, CZ))
o0 = G(CX, CZ)
b.bounds(o0.x - 2.6, o0.x + 2.6, o0.y - 1.85, o0.y + 1.85, -0.5, 0.25, M['concreto'])
b.bounds(o0.x - 2.5, o0.x + 2.5, o0.y - 1.75, o0.y + 1.75, 0.25, 0.85, M['painel'])
b.bounds(o0.x - 2.6, o0.x + 2.6, o0.y - 1.85, o0.y + 1.85, 0.85, 0.93, M['estrutura'])
for s in (-1, 1):
    b.bounds(o0.x - 0.8, o0.x + 0.8, o0.y + s * 1.85 - 0.03, o0.y + s * 1.85 + 0.03, 0.25, 0.75, M['motor'])
for a in range(4):
    ang = a * PI / 2 + PI / 4
    p = o0 + Vector((math.cos(ang), math.sin(ang), 0)) * 1.4
    b.box((p.x, p.y, 1.15), (0.4, 0.4, 0.5), M['estrutura'], rz=ang)
    q = o0 + Vector((math.cos(ang), math.sin(ang), 0)) * 1.18
    b.box((q.x, q.y, 1.32), (0.3, 0.2, 0.16), M['metal'], rz=ang)
    b.box((q.x, q.y, 1.42), (0.31, 0.21, 0.04), M['ambar'], rz=ang)
for k in range(8):                                                # faixa de segurança na borda voltada ao deck
    b.bounds(o0.x - 2.4 + k * 0.6, o0.x - 2.1 + k * 0.6, o0.y + 1.7, o0.y + 1.82, 0.93, 0.94, M['marcacao'])
base = b.build('PLAT_B2_Base_Lancamento', C['b2'], bevel=(0.03, 2, 40))
girar_malha(base, RZ)
fog.location.z = 0.93 - 1.15 * ESC_Z                              # assenta o foguete na base mais baixa

# casa do elevador na base (onde a rampa de transferência sobe), voltada para a baia
hz_ = o0 + AX * -1.2
b = Builder(origin=(hz_.x, hz_.y, 0.93))
b.box((hz_.x, hz_.y, 1.75), (1.2, 1.0, 1.6), M['painel'], rz=RZ)
b.box((hz_.x, hz_.y, 2.6), (1.3, 1.1, 0.1), M['estrutura'], rz=RZ)
d_ = hz_ - AX * 0.51
b.box((d_.x, d_.y, 1.55), (0.04, 0.7, 1.2), M['metal'], rz=RZ)
b.box((d_.x, d_.y, 2.2), (0.05, 0.8, 0.06), M['ambar'], rz=RZ)
casa = b.build('PLAT_B2_Casa_Elevador_Base', C['b2'], bevel=(0.03, 2, 40),
               props={'tipo': 'saída da rampa de transferência (cenográfica)'})
suave(casa, 40)

# torres atrás do foguete, giradas com o conjunto
from_tower = bpy.data.meshes['PLAT_Torre_Servico'].copy()
from_tower.name = 'PLAT_B2_Torre_Servico'
from_tower.transform(Matrix.Diagonal((1, 1, ALT_TORRE / 13.0, 1)))   # mesma treliça, mais baixa
torres = []
ang_ax = math.atan2(uz, ux)
for i, s in enumerate((-1, 1)):
    a = ang_ax + s * THETA
    tx, tz = CX + D_TORRE * math.cos(a), CZ + D_TORRE * math.sin(a)
    t = link_dup('PLAT_B2_Torre_%d' % (i + 1), from_tower, C['b2'], G(tx, tz), rz=RZ)
    t['altura_m'] = round(ALT_TORRE + 1.45 * ALT_TORRE / 13.0 + 0.3, 2)
    torres.append((tx, tz))
    col_novo('COL_NOVO_PLAT_B2_Torre_%d' % (i + 1), tx, tz, *aabb_rot(0.85, 0.85, RZ), 12.0, 'torre fora do deck caminhável')
hx_, hz2 = aabb_rot(2.6, 1.85, RZ)
col_novo('COL_NOVO_PLAT_B2_Base_Lancamento', CX, CZ, hx_, hz2, 2.0, 'base fora do deck (borda a ≈1,6 m)')


def passarela(nome, p0, p1, alt, larg=0.85):
    p0, p1 = Vector((p0.x, p0.y, 0)), Vector((p1.x, p1.y, 0))
    d = p1 - p0
    L_ = d.length
    rz = math.atan2(d.y, d.x)
    mid = (p0 + p1) / 2
    b = Builder(origin=(mid.x, mid.y, alt))
    R3 = Matrix.Rotation(rz, 3, 'Z')

    def lp(u, v, z):
        q = Vector((u, v, 0))
        q.rotate(R3)
        return (mid.x + q.x, mid.y + q.y, z)
    b.box(lp(0, 0, alt), (L_, larg, 0.12), M['metal'], rz=rz)
    b.box(lp(0, 0, alt - 0.12), (L_, 0.2, 0.16), M['estrutura'], rz=rz)
    for sv in (-1, 1):
        b.box(lp(0, sv * larg / 2, alt + 1.0), (L_, 0.05, 0.05), M['estrutura'], rz=rz)
        b.box(lp(0, sv * larg / 2, alt + 0.55), (L_, 0.03, 0.03), M['estrutura'], rz=rz)
        nposts = max(1, int(L_ / 0.9))
        for k in range(nposts + 1):
            b.box(lp(-L_ / 2 + k * L_ / nposts, sv * larg / 2, alt + 0.5), (0.05, 0.05, 1.0), M['estrutura'], rz=rz)
    return b.build(nome, C['b2'], props={'tipo': 'passarela', 'altura_m': alt})


def mangueira(nome, pts, r=0.06, m=None):
    b = Builder(origin=pts[0])
    b.polypipe([Vector(p) for p in pts], r, m or M['vedacao'], seg=10, elbow=m or M['vedacao'])
    return suave(b.build(nome, C['b2'], props={'tipo': 'cabo/linha de abastecimento'}), 50)


def catenaria(a, b_, flecha, n=8):
    a, b_ = Vector(a), Vector(b_)
    return [a.lerp(b_, t) - Vector((0, 0, flecha * 4 * t * (1 - t))) for t in (i / n for i in range(n + 1))]


R_CORE = 1.2 * ESC_XY
pf = G(CX, CZ)
for i, (tx, tz) in enumerate(torres):
    pt = G(tx, tz)
    dv = (pf - pt).normalized()
    ini, fim = pt + dv * 0.75, pf - dv * (R_CORE + 0.12)
    for alt in (4.2, 7.2):
        passarela('PLAT_B2_Passarela_T%d_%dm' % (i + 1, int(alt)), ini, fim, alt)
    for k, (h0, h1) in enumerate(((2.6, 2.3), (6.0, 5.6), (8.8, 8.4))):
        lat = Vector((-dv.y, dv.x, 0)) * 0.3 * (k - 1)
        mangueira('PLAT_B2_Umbilical_T%d_%d' % (i + 1, k + 1),
                  catenaria(ini + lat + Vector((0, 0, h0)), fim + lat + Vector((0, 0, h1)), 0.35),
                  0.055, M['vedacao'] if k != 1 else M['estrutura'])

# braço da tripulação: da torre 1 até a escotilha (escotilha = face +Y local do foguete, girada)
hatch_dir = Vector((-math.sin(RZ), math.cos(RZ), 0))
h_alt = fog.location.z + (1.15 + 9.6) * ESC_Z
hatch = pf + hatch_dir * (R_CORE + 0.05)
melhor = min(range(2), key=lambda i: (G(*torres[i]) - hatch).length)
pt = G(*torres[melhor])
passarela('PLAT_B2_Braco_Tripulacao_Passarela', pt + (hatch - pt).normalized() * 0.75, hatch + hatch_dir * 0.9, h_alt - 0.6)
cab = hatch + hatch_dir * 0.55
b = Builder(origin=(cab.x, cab.y, h_alt))
b.box((cab.x, cab.y, h_alt + 0.45), (1.1, 1.2, 2.0), M['painel'], rz=math.atan2(hatch_dir.y, hatch_dir.x))
b.box((cab.x, cab.y, h_alt + 1.5), (1.2, 1.3, 0.1), M['estrutura'], rz=math.atan2(hatch_dir.y, hatch_dir.x))
b.box((cab.x, cab.y, h_alt + 1.32), (1.12, 1.22, 0.05), M['ambar'], rz=math.atan2(hatch_dir.y, hatch_dir.x))
b.build('PLAT_B2_Braco_Tripulacao_Cabine', C['b2'], bevel=(0.02, 1, 40),
        props={'nota': 'Cabine elevada e fechada; cenográfica (o jogador não entra).'})

# linhas dos tanques → torre mais a oeste, por fora do deck
tw = min(torres, key=lambda t: t[0])
b = Builder(origin=G(-11, 37))
rota = [G(-12.4, 33.4, 0.6), G(-12.4, 34.6, 0.15), G(-12.4, 39.6, 0.15), G(tw[0] - 1.0, tw[1], 0.15), G(tw[0] - 0.6, tw[1], 0.15),
        G(tw[0] - 0.6, tw[1], 1.2)]
for dz in (0.0, 0.3):
    b.polypipe([p + Vector((0, dz, 0)) for p in rota], 0.07, M['estrutura'], elbow=M['metal'])
for p in (G(-12.4, 35.5), G(-12.4, 37.0), G(-12.4, 38.5)):
    b.bounds(p.x - 0.25, p.x + 0.55, p.y - 0.12, p.y + 0.12, 0.0, 0.1, M['metal'])
b.build('PLAT_B2_Linhas_Tanques', C['b2'], props={'nota': 'Fora da área caminhável; não cruza a passagem.'})

# ============================================================ baia: o ponto atual vira o elevador de embarque
b = Builder(origin=G(0, 33))
b.cyl(G(0, 33, 0.006), 1.15, 0.012, M['metal'], seg=40)
b.cyl(G(0, 33, 0.012), 1.08, 0.008, M['ambar'], seg=40)
b.cyl(G(0, 33, 0.014), 0.98, 0.008, M['deck'], seg=40)
for k in range(8):
    a = k * PI / 4
    p = G(0, 33) + Vector((math.cos(a), math.sin(a), 0)) * 0.6
    b.box((p.x, p.y, 0.02), (0.4, 0.05, 0.004), M['metal'], rz=a)
b.build('PLAT_B2_Elevador_Embarque', C['b2'], props={'tipo': 'elevador de embarque', 'centro_jogo_xz': '0, 33',
                                                     'nota': 'Coincide com INTERACT_Nave (para onde o jogo leva o jogador ao embarcar).'})
b = Builder(origin=G(0, 31))
for k in range(4):                                                    # chevrons do desembarque até o elevador
    z = 30.4 + k * 0.5
    for sv in (-1, 1):
        b.box(G(sv * 0.32, z, 0.004), (0.55, 0.1, 0.007), M['marcacao'], rz=sv * math.radians(35))
b.build('PLAT_B2_Chevrons_Embarque', C['b2'], props={'tipo': 'sinalização de piso (rente)'})
text_mesh('PLAT_B2_Sinal_Piso_Embarque', 'EMBARQUE', 0.38, C['b2'], G(0, 29.95, 0.009), (0, 0, 0), M['marcacao'], extrude=0.0)
# totem no fundo da baia: totalmente dentro do colisor COL_Nave_Fundo (x ±1,7; z 34,75..35,25)
b = Builder(origin=G(0, 35.0))
caixa(b, -1.25, 1.25, 34.78, 35.25, 0.0, 1.25, M['painel'])
caixa(b, -1.3, 1.3, 34.75, 35.25, 1.25, 1.33, M['estrutura'])
caixa(b, -0.9, 0.9, 34.76, 34.78, 0.55, 1.12, M['metal'])
caixa(b, -0.8, 0.8, 34.755, 34.76, 0.62, 1.05, M['tela'])
caixa(b, -1.2, 1.2, 34.755, 34.76, 1.16, 1.2, M['ambar'])
b.build('PLAT_B2_Totem_Embarque', C['b2'], bevel=(0.015, 1, 40),
        props={'nota': 'v005: x ±1,3 e z 34,75–35,25, dentro do colisor do fundo (v004 avançava 3 cm).'})
text_mesh('PLAT_B2_Sinal_Totem', 'ELEVADOR DE EMBARQUE', 0.11, C['b2'], G(0, 34.752, 0.86), (PI / 2, 0, PI), M['texto'], extrude=0.002)

# tampas de inspeção rentes ao piso sobre a rampa subterrânea (não são caminho: escuras, espaçadas, sem âmbar)
b = Builder(origin=G(-1.5, 37))
ini2, fim2 = Vector((0.0, 36.2)), Vector((CX - ux * 3.2, CZ - uz * 3.2))
n_ = 4
for k in range(n_):
    t = k / (n_ - 1)
    x, z = ini2.x + (fim2.x - ini2.x) * t, ini2.y + (fim2.y - ini2.y) * t
    if z > 37.9:
        continue
    caixa(b, x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0.0, 0.008, M['metal'])
    caixa(b, x - 0.05, x + 0.05, z - 0.05, z + 0.05, 0.008, 0.01, M['ciano'])
b.build('PLAT_B2_Tampas_Inspecao_Rampa', C['b2'], props={'tipo': 'tampas de inspeção (rentes)', 'nota': 'Indicam a rampa subterrânea; sem acesso.'})

# ============================================================ rampa de transferência subterrânea (cenográfica)
b = Builder(origin=G(-2, 37, -2))
p_ini = G(0, 33.0)
p_fim = hz_
b.cyl((p_ini.x, p_ini.y, -1.5), 1.0, 3.0, M['painel'], seg=24)                       # poço do elevador da baia
seg_ = [(p_ini, -3.0), (G(0, 35.5), -3.0), (p_fim, -3.0)]
for (pa, za), (pb, zb) in zip(seg_[:-1], seg_[1:]):
    d = Vector((pb.x - pa.x, pb.y - pa.y, 0))
    L_ = d.length
    mid = (pa + pb) / 2
    b.box((mid.x, mid.y, za + 1.1), (L_ + 2.0, 2.2, 2.2), M['painel'], rz=math.atan2(d.y, d.x))
    b.box((mid.x, mid.y, za), (L_ + 2.0, 1.6, 0.1), M['metal'], rz=math.atan2(d.y, d.x))
    for k in range(int(L_ / 1.2) + 1):
        q = pa + d.normalized() * k * 1.2
        b.box((q.x, q.y, za + 2.15), (0.4, 1.0, 0.04), M['ambar'], rz=math.atan2(d.y, d.x))
b.cyl((p_fim.x, p_fim.y, -1.0), 0.9, 4.0, M['painel'], seg=24)                        # poço até a casa do elevador
b.build('PLAT_B2_Rampa_Transferencia_Subterranea', C['tunel'],
        props={'tipo': 'rampa/túnel de transferência', 'nota': 'Cenográfica, abaixo do piso; só aparece no corte explicativo.'})

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
              'PLATAFORMA_COMUM', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_B2_REFINADA',
              'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA', 'PLATAFORMA_COMUM_PISO_V004', 'V003_SUBSTITUIDOS', 'COL_NOVO_PLATAFORMA', 'REF_EXPLORADOR',
              'ARQ_Pisos'):
        lc = find_lc(vl.layer_collection, n)
        if lc:
            lc.exclude = n in excl
    return vl


for vln in [v.name for v in sc.view_layers]:
    if vln.startswith('Plataforma_') or vln.startswith('Planta_Plataforma_') or vln in ('Completa', 'Sem_Telhados', 'Interiores_SE', 'Planta_Setores'):
        lc = find_lc(sc.view_layers[vln].layer_collection, 'PLATAFORMA_B2_REFINADA')
        if lc and not vln.endswith('B2') and 'B2' not in vln:
            lc.exclude = True
base_excl = ['COLISORES_ESTUDO', 'V003_SUBSTITUIDOS', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'PLATAFORMA_COMUM_PISO_V004']
camada('Plataforma_B2', base_excl + ['REF_LAYOUT', 'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA'])
camada('Planta_Plataforma_B2', base_excl + ['TELHADOS', 'B2_RAMPA_TRANSFERENCIA_CENOGRAFICA'])
camada('Corte_Conexao_B2', base_excl + ['REF_LAYOUT', 'TERRENO', 'ARQ_Pisos'])

LC = bpy.data.collections['LUZES_CAMERAS']
for nm in ('CAM_PLAT_B2_Conexao',):
    o = bpy.data.objects.get(nm)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
cd = bpy.data.cameras.new('CAM_PLAT_B2_Conexao')
cd.lens, cd.clip_start, cd.clip_end = 30, 0.1, 400
o = bpy.data.objects.new('CAM_PLAT_B2_Conexao', cd)
LC.objects.link(o)
o.location = G(9.5, 28.0, 8.5)
alvo = G(-2.2, 37.5, 2.5)
o.rotation_euler = (alvo - o.location).normalized().to_track_quat('-Z', 'Y').to_euler()
sc['estudo'] = 'Colônia de Marte v005 — refinamento da variante B da plataforma (B2)'
bpy.ops.wm.save_mainfile()
print('BUILD_V005_OK', {'RZ_graus': round(math.degrees(RZ), 1), 'torres': [tuple(round(v, 2) for v in t) for t in torres],
                        'altura_foguete': ALT_FOG, 'hatch_alt': round(h_alt, 2)})
