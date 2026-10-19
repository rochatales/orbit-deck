# Estudo de arte — Colônia de Marte · v004 · plataforma de lançamento (Blender em background)
#   Blender -b <v003.blend> -P art-source/mars-colony-plataforma/scripts/build_plataforma_v004.py -- criar
#   Blender -b art-source/mars-colony-plataforma/blend/mars_colony_estudo_v004_plataforma.blend -P <este script>
# Parte de mars_colony_estudo_v003.blend (somente leitura) e grava um arquivo NOVO. Coordenadas: Blender X = x do
# jogo, Y = -z, Z = altura; 1 unidade = 1 m. Não altera colisores candidatos nem pisos caminháveis.
import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
V4 = os.path.join(ROOT, 'blend', 'mars_colony_estudo_v004_plataforma.blend')
sys.path.insert(0, HERE)
import importlib
import colony_lib_v004 as L
importlib.reload(L)
from colony_lib_v004 import G, Builder, collection, material, make_obj, text_mesh, link_dup, empty

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if 'criar' in args:
    assert bpy.data.filepath.endswith('mars_colony_estudo_v003.blend'), bpy.data.filepath
    assert not os.path.exists(V4), 'v004 já existe; não sobrescrever'
    bpy.ops.wm.save_as_mainfile(filepath=V4, copy=False)
assert bpy.data.filepath == V4, 'rode sobre a v004 (ou com -- criar a partir da v003)'

PI = math.pi
sc = bpy.context.scene
M = {k: bpy.data.materials[n] for k, n in (
    ('painel', 'M_Painel'), ('estrutura', 'M_Estrutura'), ('metal', 'M_MetalEscuro'), ('marcacao', 'M_Marcacao'),
    ('ambar', 'M_LuzAmbar'), ('ciano', 'M_LuzCiano'), ('vidro', 'M_Vidro'), ('vedacao', 'M_Vedacao'),
    ('texto', 'M_Sinal_Texto'), ('texto_escuro', 'M_Sinal_TextoEscuro'), ('tela', 'M_TelaCiano'),
    ('concreto', 'M_Concreto'), ('gasto', 'M_Painel_Gasto'))}
M['casco'] = material('M_Foguete_Casco', '#E6E0D2', 0.45)
M['motor'] = material('M_Foguete_Motor', '#2B3131', 0.35, metal=0.7)

# ------------------------------------------------------------ limpeza idempotente das coleções da v004
NOVAS = ('PLATAFORMA_COMUM', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'V003_SUBSTITUIDOS', 'COL_NOVO_PLATAFORMA')
for n in NOVAS:
    c = bpy.data.collections.get(n)
    if c:
        for o in list(c.objects):
            if n == 'V003_SUBSTITUIDOS':
                continue
            bpy.data.objects.remove(o, do_unlink=True)
C = {}
C['comum'] = collection('PLATAFORMA_COMUM', bpy.data.collections['ARQUITETURA'])
C['A'] = collection('PLATAFORMA_A_CENTRAL', bpy.data.collections['ARQUITETURA'])
C['B'] = collection('PLATAFORMA_B_DESLOCADA', bpy.data.collections['ARQUITETURA'])
C['subst'] = collection('V003_SUBSTITUIDOS')
C['col'] = collection('COL_NOVO_PLATAFORMA', bpy.data.collections['COL_PROPOSTAS'])

# nave antiga: preservada numa coleção excluída (não apagada)
nave = bpy.data.objects.get('PROP_Nave_Referencia')
if nave and C['subst'].name not in [c.name for c in nave.users_collection]:
    for c in list(nave.users_collection):
        c.objects.unlink(nave)
    C['subst'].objects.link(nave)
# Explorador importado (alta densidade): fora da v004; o manequim e o proxy simples ficam
for o in list(bpy.data.objects):
    if o.name.startswith('REF_Explorador_') and o.name != 'REF_Explorador_Proxy_Escala':
        bpy.data.objects.remove(o, do_unlink=True)
for blk in (bpy.data.meshes, bpy.data.armatures, bpy.data.images, bpy.data.actions):
    for d in list(blk):
        if d.users == 0:
            blk.remove(d)


def suave(o, ang=35):
    """Sombreamento suave com arestas vivas acima de `ang` graus (normais vão para o glTF)."""
    me = o.data
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(ang))
    return o


def caixa(b, x0, x1, z0, z1, y0, y1, m):
    """Caixa por limites em coordenadas do JOGO (x, z) e altura y."""
    b.bounds(x0, x1, -z1, -z0, y0, y1, m)


def col_novo(nome, r, h, nota):
    x0, x1, z0, z1 = r
    b = Builder(origin=G((x0 + x1) / 2, (z0 + z1) / 2))
    caixa(b, x0, x1, z0, z1, 0, h, bpy.data.materials['M_Junta'])
    o = b.build(nome, C['col'], props={'rect_jogo': '%.3f,%.3f,%.3f,%.3f' % r, 'conjunto': 'proposta (fora do candidato)',
                                       'nota': nota})
    o.display_type = 'WIRE'
    o.hide_render = True
    return o


# ============================================================ COMUM: baia de embarque (sobre os 3 colisores da nave)
# Colisores do piloto mantidos: laterais x ±1,8 (0,45 × 4,5) em z 30,75..35,25 e fundo x ±1,7 em z 34,75..35,25.
b = Builder(origin=G(0, 33))
for s in (-1, 1):
    caixa(b, s * 1.8 - 0.225, s * 1.8 + 0.225, 30.75, 35.25, 0.0, 0.18, M['estrutura'])
    caixa(b, s * 1.8 - 0.2, s * 1.8 + 0.2, 30.8, 35.2, 0.18, 1.05, M['painel'])
    caixa(b, s * 1.8 - 0.225, s * 1.8 + 0.225, 30.75, 35.25, 1.05, 1.15, M['estrutura'])
    caixa(b, s * 1.8 - s * 0.205 - 0.01, s * 1.8 - s * 0.205 + 0.01, 31.0, 35.0, 0.9, 0.95, M['ambar'])
b.build('PLAT_Baia_Parapeitos', C['comum'], bevel=(0.04, 2, 40), props={'tipo': 'baia de embarque',
        'nota': 'Mesma planta dos colisores laterais da nave do piloto (COL_Nave_Lateral_O/L).'})
b = Builder(origin=G(0, 31.6))
b.cyl(G(0, 32.6, 0.004), 1.15, 0.008, M['marcacao'], seg=32)
b.cyl(G(0, 32.6, 0.006), 1.0, 0.008, bpy.data.materials['M_Deck'], seg=32)
for k in range(7):
    z = 30.95 + k * 0.5
    caixa(b, -1.2, 1.2, z, z + 0.06, 0.0, 0.007, M['marcacao'])
b.build('PLAT_Baia_Piso_Embarque', C['comum'], props={'tipo': 'sinalização de piso', 'nota': 'Nível do piso; não obstrui.'})
text_mesh('PLAT_Sinal_Piso_EMBARQUE', 'EMBARQUE', 0.42, C['comum'], G(0, 30.35, 0.009), (0, 0, 0), M['marcacao'], extrude=0.0)

# ============================================================ foguete (malha compartilhada pelas duas variantes)
def foguete_mesh():
    b = Builder()
    z0 = 1.15                                                     # topo da base de lançamento
    for a in range(4):                                            # motores
        ang = a * PI / 2 + PI / 4
        b.cyl((0.55 * math.cos(ang), 0.55 * math.sin(ang), z0 + 0.4), 0.18, 0.8, M['motor'], seg=16, r2=0.36)
    b.cyl((0, 0, z0 + 1.0), 1.15, 0.4, M['motor'], seg=32)       # saia
    b.cyl((0, 0, z0 + 6.0), 1.2, 9.6, M['casco'], seg=32)        # 1º estágio
    for zz, h, m in ((z0 + 2.4, 0.35, M['estrutura']), (z0 + 6.4, 0.35, M['estrutura']), (z0 + 10.5, 0.25, M['estrutura']),
                     (z0 + 10.82, 0.08, M['ambar'])):
        b.cyl((0, 0, zz), 1.215, h, m, seg=32)
    b.cyl((0, 0, z0 + 11.25), 1.2, 0.5, M['estrutura'], seg=32, r2=1.0)   # interestágio
    b.cyl((0, 0, z0 + 12.6), 1.0, 2.2, M['casco'], seg=32)       # 2º estágio
    b.cyl((0, 0, z0 + 13.75), 1.01, 0.1, M['estrutura'], seg=32)
    b.cyl((0, 0, z0 + 14.9), 1.0, 2.2, M['casco'], seg=32, r2=0.08)   # coifa
    b.cyl((0, 0, z0 + 16.3), 0.05, 0.6, M['metal'], seg=8)        # mastro
    b.sphere((0, 0, z0 + 16.62), 0.07, M['ambar'], sub=1)
    for s in (-1, 1):                                             # aceleradores laterais
        bx = s * 1.75
        b.cyl((bx, 0, z0 + 4.2), 0.5, 7.0, M['casco'], seg=24)
        b.cyl((bx, 0, z0 + 8.15), 0.5, 0.9, M['casco'], seg=24, r2=0.05)
        b.cyl((bx, 0, z0 + 3.0), 0.505, 0.25, M['estrutura'], seg=24)
        b.cyl((bx, 0, z0 + 6.6), 0.505, 0.18, M['estrutura'], seg=24)
        b.cyl((bx, 0, z0 + 0.45), 0.2, 0.5, M['motor'], seg=12, r2=0.32)
        for zz in (z0 + 1.8, z0 + 6.9):
            b.box((s * 1.3, 0, zz), (0.5, 0.12, 0.12), M['estrutura'])
    for a in (PI / 2, -PI / 2):                                   # aletas (fora do eixo dos aceleradores)
        b.box((0, math.sin(a) * 1.45, z0 + 1.4), (0.08, 0.6, 1.1), M['estrutura'])
    # escotilha da tripulação (face +Y = norte do jogo, voltada para a baia)
    b.box((0, 1.205, z0 + 9.6), (0.78, 0.05, 1.15), M['metal'])
    b.box((0, 1.215, z0 + 9.6), (0.9, 0.02, 1.27), M['ambar'])
    b.box((0, 1.225, z0 + 9.6), (0.7, 0.02, 1.07), M['metal'])
    b.box((0.0, 1.21, z0 + 10.7), (0.3, 0.04, 0.3), M['vidro'])
    b.cyl((0, 1.205, z0 + 7.6), 0.35, 0.02, M['ambar'], seg=24, rx=PI / 2)   # emblema (anel âmbar)
    b.cyl((0, 1.215, z0 + 7.6), 0.27, 0.02, M['casco'], seg=24, rx=PI / 2)
    me = b.mesh('PLAT_Foguete')
    return me


ME_FOG = foguete_mesh()


def base_lancamento(nome, coll, cx, cz, frente_porta=True):
    """Base (mesa de lançamento) 5,2 × 3,7 × 1,15 m, com fosso de chamas e quatro travas."""
    b = Builder(origin=G(cx, cz))
    x0, x1, z0, z1 = cx - 2.6, cx + 2.6, cz - 1.85, cz + 1.85
    caixa(b, x0, x1, z0, z1, -0.5, 0.25, M['concreto'])
    caixa(b, x0 + 0.1, x1 - 0.1, z0 + 0.1, z1 - 0.1, 0.25, 1.05, M['painel'])
    caixa(b, x0, x1, z0, z1, 1.05, 1.15, M['estrutura'])
    for s in (-1, 1):                                             # fosso de chamas (leste/oeste)
        caixa(b, cx + s * 2.62 - 0.03, cx + s * 2.62 + 0.03, cz - 0.9, cz + 0.9, 0.25, 0.95, M['motor'])
    for k in range(9):                                            # faixa de segurança no topo
        u = x0 + 0.1 + k * 0.555
        caixa(b, u, u + 0.28, z0 + 0.05, z0 + 0.2, 1.15, 1.16, M['marcacao'])
    for a in range(4):                                            # travas (hold-downs)
        ang = a * PI / 2 + PI / 4
        dx, dy = math.cos(ang), math.sin(ang)
        p = G(cx, cz) + Vector((dx * 1.55, dy * 1.55, 0))
        b.box((p.x, p.y, 1.45), (0.45, 0.45, 0.6), M['estrutura'], rz=ang)
        q = G(cx, cz) + Vector((dx * 1.3, dy * 1.3, 0))
        b.box((q.x, q.y, 1.65), (0.35, 0.22, 0.18), M['metal'], rz=ang)
        b.box((q.x, q.y, 1.77), (0.36, 0.23, 0.04), M['ambar'], rz=ang)
    if frente_porta:                                              # porta do elevador na face norte (fundo da baia)
        caixa(b, cx - 0.55, cx + 0.55, z0 - 0.03, z0, 0.25, 1.05, M['metal'])
        caixa(b, cx - 0.62, cx + 0.62, z0 - 0.04, z0 - 0.03, 0.98, 1.03, M['ambar'])
    o = b.build(nome, coll, bevel=(0.03, 2, 40), props={'tipo': 'base de lançamento', 'centro_jogo_xz': '%.2f, %.2f' % (cx, cz)})
    return o


def torre_mesh(h=13.0):
    """Torre treliçada 1,4 × 1,4 m: montantes, anéis a cada 1,5 m, diagonais, escada e cabine com farol."""
    b = Builder()
    w = 0.7
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((sx * w, sy * w, h / 2), (0.14, 0.14, h), M['estrutura'])
    n = int(h / 1.5)
    for k in range(n + 1):
        z = 0.3 + k * 1.5 if k < n else h - 0.1
        for (cx, cy, sx, sy) in ((0, w, 1.4, 0.1), (0, -w, 1.4, 0.1), (w, 0, 0.1, 1.4), (-w, 0, 0.1, 1.4)):
            b.box((cx, cy, z), (sx, sy, 0.1), M['estrutura'])
        if k < n:
            dz = 1.5
            L_ = math.hypot(1.4, dz)
            a = math.atan2(dz, 1.4)
            for (cx, cy, rz) in ((0, w, 0), (0, -w, 0), (w, 0, PI / 2), (-w, 0, PI / 2)):
                M_ = (Matrix.Translation((cx, cy, z + dz / 2)) @ Matrix.Rotation(rz, 4, 'Z') @
                      Matrix.Rotation(-a if k % 2 else a, 4, 'Y') @ Matrix.Diagonal((L_, 0.06, 0.06, 1)))
                r = bmesh.ops.create_cube(b.bm, size=1.0, matrix=M_)
                b._assign(r['verts'], M['estrutura'])
    b.box((0, 0, 0.12), (1.7, 1.7, 0.24), M['concreto'])             # sapata
    b.box((0, 0, h + 0.6), (1.5, 1.5, 1.2), M['painel'])              # cabine
    b.box((0, 0, h + 1.25), (1.6, 1.6, 0.1), M['estrutura'])
    b.box((0, -0.76, h + 0.65), (1.0, 0.02, 0.4), M['vidro'])
    b.cyl((0, 0, h + 1.45), 0.08, 0.3, M['metal'], seg=8)
    b.sphere((0, 0, h + 1.65), 0.1, M['ambar'], sub=1)
    for k in range(int(h / 0.35)):                                    # escada na face oeste
        b.box((-w - 0.12, 0, 0.3 + k * 0.35), (0.05, 0.4, 0.04), M['metal'])
    return b.mesh('PLAT_Torre_Servico')


ME_TORRE = torre_mesh()


def passarela(nome, coll, p0, p1, alt, larg=0.9):
    """Passarela de serviço entre a torre e o foguete (piso + guarda-corpos), em coordenadas Blender (x, y)."""
    p0, p1 = Vector((p0[0], p0[1], 0)), Vector((p1[0], p1[1], 0))
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
    b.box(lp(0, 0, alt - 0.12), (L_, 0.2, 0.18), M['estrutura'], rz=rz)
    for s in (-1, 1):
        b.box(lp(0, s * larg / 2, alt + 1.0), (L_, 0.05, 0.05), M['estrutura'], rz=rz)
        b.box(lp(0, s * larg / 2, alt + 0.55), (L_, 0.03, 0.03), M['estrutura'], rz=rz)
        for k in range(int(L_ / 0.9) + 1):
            b.box(lp(-L_ / 2 + k * L_ / max(1, int(L_ / 0.9)), s * larg / 2, alt + 0.5), (0.05, 0.05, 1.0), M['estrutura'], rz=rz)
    return b.build(nome, coll, props={'tipo': 'passarela', 'altura_m': alt})


def mangueira(nome, coll, pts, r=0.07, m=None, apoio=None):
    """Cabo/linha de abastecimento com curvatura (pontos Blender) — malha, não curva, para exportar."""
    b = Builder(origin=pts[0])
    b.polypipe([Vector(p) for p in pts], r, m or M['vedacao'], seg=10, elbow=m or M['vedacao'])
    o = b.build(nome, coll, props={'tipo': 'cabo/linha de abastecimento'})
    if apoio:
        o['apoiado_em'] = apoio
    return suave(o, 50)


def catenaria(a, b_, flecha, n=8):
    a, b_ = Vector(a), Vector(b_)
    return [a.lerp(b_, t) - Vector((0, 0, flecha * 4 * t * (1 - t))) for t in (i / n for i in range(n + 1))]


def montar_variante(tag, coll, cx, cz, eixo_torres='x', ponte=False):
    """Foguete + base + 2 torres + passarelas + braço da tripulação + cabos."""
    base_lancamento('PLAT_%s_Base_Lancamento' % tag, coll, cx, cz, frente_porta=(tag == 'A'))
    fog = link_dup('PLAT_%s_Foguete' % tag, ME_FOG, coll, G(cx, cz))
    fog['tipo'] = 'foguete (estudo)'
    fog['altura_total_m'] = 17.8
    suave(fog, 30)
    torres = []
    for i, s in enumerate((-1, 1)):
        tx, tz = (cx + s * 3.7, cz) if eixo_torres == 'x' else (cx, cz + s * 3.7)
        t = link_dup('PLAT_%s_Torre_%d' % (tag, i + 1), ME_TORRE, coll, G(tx, tz))
        t['tipo'] = 'torre de serviço'
        t['altura_m'] = 14.3
        torres.append((tx, tz))
        pt = G(tx, tz)
        pf = G(cx, cz)
        dirv = (pf - pt).normalized()
        ini = pt + dirv * 0.75
        fim = pf - dirv * (1.75 + 0.55 if eixo_torres == 'x' else 1.3)
        for alt in (5.2, 9.0):
            passarela('PLAT_%s_Passarela_T%d_%dm' % (tag, i + 1, int(alt)), coll, (ini.x, ini.y), (fim.x, fim.y), alt)
        # umbilicais em catenária, da torre ao foguete
        for k, (alt0, alt1) in enumerate(((3.2, 2.8), (7.6, 7.0), (11.2, 10.6))):
            a = ini + Vector((0, 0.25 * (k - 1), alt0))
            b_ = pf - dirv * 2.3 + Vector((0, 0.25 * (k - 1), alt1))      # termina no acelerador lateral
            mangueira('PLAT_%s_Umbilical_T%d_%d' % (tag, i + 1, k + 1), coll, catenaria(a, b_, 0.45), 0.06,
                      M['vedacao'] if k != 1 else M['estrutura'])
    # braço de acesso da tripulação até a escotilha (face norte), com cabine branca fechada (sem acesso do jogador)
    tx, tz = torres[1] if eixo_torres == 'x' else torres[0]
    hatch = G(cx, cz) + Vector((0, 1.25, 10.75))
    b = Builder(origin=(hatch.x, hatch.y, 10.1))
    braço_ini = G(tx, tz) + Vector((0, 0.75, 0))
    xs = sorted([braço_ini.x, hatch.x])
    b.bounds(xs[0], xs[1], braço_ini.y - 0.45, braço_ini.y + 0.45, 10.05, 10.17, M['metal'])
    b.bounds(hatch.x - 0.7, hatch.x + 0.7, braço_ini.y - 0.45, hatch.y + 0.9, 10.05, 10.17, M['metal'])
    b.bounds(hatch.x - 0.65, hatch.x + 0.65, hatch.y + 0.15, hatch.y + 1.25, 10.17, 12.25, M['painel'])   # cabine
    b.bounds(hatch.x - 0.7, hatch.x + 0.7, hatch.y + 0.1, hatch.y + 1.3, 12.25, 12.37, M['estrutura'])
    b.bounds(hatch.x - 0.4, hatch.x + 0.4, hatch.y + 1.25, hatch.y + 1.27, 11.0, 11.6, M['vidro'])
    b.bounds(hatch.x - 0.5, hatch.x + 0.5, hatch.y + 1.25, hatch.y + 1.28, 12.05, 12.12, M['ambar'])
    b.build('PLAT_%s_Braco_Tripulacao' % tag, coll, bevel=(0.02, 1, 40),
            props={'tipo': 'braço de acesso da tripulação', 'nota': 'Cabine fechada e elevada; o jogador não entra.'})
    text_mesh('PLAT_%s_Sinal_Torre_1' % tag, 'TORRE 1', 0.28, coll, G(torres[0][0], torres[0][1], 2.2) + Vector((0, 0.86, 0)),
              (PI / 2, 0, PI), M['texto_escuro'], extrude=0.003)
    return torres


# ============================================================ VARIANTE A — central, no fundo do deck
A_C = (0.0, 36.6)
montar_variante('A', C['A'], *A_C, eixo_torres='x')
b = Builder(origin=G(0, 34.8))
caixa(b, -1.25, 1.25, 34.62, 34.75, 1.1, 1.4, M['metal'])
b.build('PLAT_A_Placa_Elevador', C['A'])
text_mesh('PLAT_A_Sinal_Elevador', 'ELEVADOR · TRIPULAÇÃO', 0.14, C['A'], G(0, 34.615, 1.25), (PI / 2, 0, PI), M['texto'], extrude=0.002)
# abastecimento: dos tanques (oeste) por canaleta coberta rente ao piso do deck até a torre 1
b = Builder(origin=G(-5, 33))
for (x0, x1, z0, z1) in ((-7.0, -3.7, 31.45, 31.75), (-3.85, -3.55, 31.45, 35.9)):
    caixa(b, x0, x1, z0, z1, 0.0, 0.012, M['metal'])
    caixa(b, x0 + 0.02, x1 - 0.02, z0 + 0.02, z1 - 0.02, 0.012, 0.016, M['estrutura'])
b.build('PLAT_A_Canaleta_Abastecimento', C['A'], props={'tipo': 'canaleta coberta (rente ao piso)', 'nota': 'Não obstrui: 1,6 cm.'})
mangueira('PLAT_A_Linha_Torre1', C['A'], [G(-3.7, 35.9, 0.05), G(-3.7, 35.95, 0.6), G(-3.15, 35.95, 0.9), G(-3.15, 35.95, 3.0)],
          0.07, M['estrutura'])
# propostas de colisão da variante A (dentro do deck caminhável)
col_novo('COL_NOVO_PLAT_A_Base_Lancamento', (-2.6, 2.6, 34.75, 38.45), 1.8, 'base sobre o fundo do deck')
for i, s in enumerate((-1, 1)):
    col_novo('COL_NOVO_PLAT_A_Torre_%d' % (i + 1), (s * 3.7 - 0.85, s * 3.7 + 0.85, 35.75, 37.45), 14.0, 'torre no deck')

# ============================================================ VARIANTE B — deslocada a sudoeste, fora do deck
B_C = (-5.0, 41.0)
montar_variante('B', C['B'], *B_C, eixo_torres='x')
# acesso: rampa de serviço da borda sul do deck até a base (fora da área caminhável) + faixa guia no piso
b = Builder(origin=G(-4.2, 38.6))
caixa(b, -5.0, -3.4, 38.0, 39.15, -0.3, 0.05, M['concreto'])
for k in range(5):
    caixa(b, -5.0, -3.4, 38.05 + k * 0.22, 38.2 + k * 0.22, 0.05, 0.08 + k * 0.21, M['metal'])
for s in (-1, 1):
    caixa(b, -4.2 + s * 0.8 - 0.03, -4.2 + s * 0.8 + 0.03, 38.0, 39.15, 0.05, 1.15, M['estrutura'])
    caixa(b, -4.2 + s * 0.8 - 0.04, -4.2 + s * 0.8 + 0.04, 38.0, 39.15, 1.1, 1.15, M['ambar'])
b.build('PLAT_B_Rampa_Servico', C['B'], props={'tipo': 'rampa de serviço', 'nota': 'Fora da área caminhável (z > 38).'})
b = Builder(origin=G(-2, 36))
pts = [(-2.3, 32.0), (-2.3, 37.0), (-4.2, 37.0), (-4.2, 37.95)]   # sai pela lateral aberta da baia
for (a, c_) in zip(pts[:-1], pts[1:]):
    (ax, az), (cx_, cz_) = a, c_
    if abs(ax - cx_) < 1e-6:
        caixa(b, ax - 0.12, ax + 0.12, min(az, cz_), max(az, cz_), 0.0, 0.007, M['marcacao'])
    elif abs(az - cz_) < 1e-6:
        caixa(b, min(ax, cx_), max(ax, cx_), az - 0.12, az + 0.12, 0.0, 0.007, M['marcacao'])
    else:
        for t in range(6):
            p = (ax + (cx_ - ax) * t / 5, az + (cz_ - az) * t / 5)
            caixa(b, p[0] - 0.12, p[0] + 0.12, p[1] - 0.12, p[1] + 0.12, 0.0, 0.007, M['marcacao'])
b.build('PLAT_B_Faixa_Guia', C['B'], props={'tipo': 'faixa guia de piso', 'nota': 'Liga a baia à rampa; rente ao piso.'})
b = Builder(origin=G(0, 35.0))
caixa(b, -1.25, 1.25, 34.75, 35.25, 0.0, 1.3, M['painel'])
caixa(b, -1.3, 1.3, 34.72, 35.28, 1.3, 1.38, M['estrutura'])
caixa(b, -0.9, 0.9, 34.72, 34.75, 0.55, 1.15, M['metal'])
caixa(b, -0.8, 0.8, 34.71, 34.72, 0.62, 1.08, M['tela'])
caixa(b, -1.2, 1.2, 34.71, 34.72, 1.2, 1.24, M['ambar'])
b.build('PLAT_B_Totem_Embarque', C['B'], bevel=(0.02, 1, 40),
        props={'tipo': 'totem de embarque', 'nota': 'Sobre o colisor do fundo da nave (COL_Nave_Fundo); x ±1,25 dentro de ±1,7.'})
text_mesh('PLAT_B_Sinal_Totem', 'EMBARQUE ›', 0.16, C['B'], G(0, 34.705, 0.85), (PI / 2, 0, PI), M['texto'], extrude=0.002)
# abastecimento: dos tanques por fora do deck (oeste e sul), sem cruzar a passagem
b = Builder(origin=G(-11, 37))
rota = [G(-12.4, 33.4, 0.6), G(-12.4, 34.6, 0.15), G(-12.4, 39.6, 0.15), G(-9.6, 41.0, 0.15), G(-9.4, 41.0, 0.15)]
for dz in (0.0, 0.3):
    b.polypipe([p + Vector((dz, 0, 0)) for p in rota], 0.07, M['estrutura'], elbow=M['metal'])
for p in (G(-12.4, 35.5), G(-12.4, 37.0), G(-12.4, 38.5), G(-10.9, 40.3)):
    b.bounds(p.x - 0.25, p.x + 0.55, p.y - 0.12, p.y + 0.12, 0.0, 0.1, M['metal'])
b.build('PLAT_B_Linhas_Tanques', C['B'], props={'tipo': 'linhas de abastecimento', 'nota': 'Fora da área caminhável.'})
for nm, r in (('Base_Lancamento', (-7.6, -2.4, 39.15, 42.85)), ('Torre_1', (-9.55, -7.85, 40.15, 41.85)),
              ('Torre_2', (-2.15, -0.45, 40.15, 41.85)), ('Rampa_Servico', (-5.0, -3.4, 38.0, 39.15))):
    col_novo('COL_NOVO_PLAT_B_' + nm, r, 2.0 if 'Rampa' in nm else 14.0, 'fora do deck caminhável (z > 38)')

# ============================================================ COMUM: equipamentos de apoio (fora da área caminhável)
cons = Builder()
cons.bounds(-0.45, 0.45, -0.3, 0.3, 0.0, 0.95, M['painel'])
cons.bounds(-0.47, 0.47, -0.32, 0.32, 0.0, 0.1, M['estrutura'])
cons.box((0, -0.2, 1.05), (0.85, 0.42, 0.06), M['estrutura'], rx=math.radians(25))
cons.box((0, -0.215, 1.07), (0.7, 0.32, 0.02), M['tela'], rx=math.radians(25))
cons.bounds(0.3, 0.4, -0.31, -0.3, 0.75, 0.85, M['ambar'])
ME_CONS = cons.mesh('PLAT_Console')
carro = Builder()
carro.bounds(-0.4, 0.4, -0.3, 0.3, 0.25, 0.75, M['estrutura'])
carro.bounds(-0.42, 0.42, -0.32, 0.32, 0.75, 0.8, M['metal'])
carro.bounds(-0.25, 0.1, -0.2, 0.2, 0.8, 1.0, M['painel'])
for sx in (-1, 1):
    for sy in (-1, 1):
        carro.cyl((sx * 0.3, sy * 0.24, 0.1), 0.1, 0.06, M['motor'], seg=10, rx=PI / 2)
ME_CARRO = carro.mesh('PLAT_Carro_Ferramentas')
cil = Builder()
cil.bounds(-0.6, 0.6, -0.25, 0.25, 0.0, 0.08, M['estrutura'])
for k in range(4):
    cil.cyl((-0.45 + k * 0.3, 0, 0.7), 0.12, 1.25, M['casco'] if k % 2 else M['painel'], seg=12)
    cil.cyl((-0.45 + k * 0.3, 0, 1.38), 0.05, 0.12, M['metal'], seg=8)
cil.bounds(-0.6, 0.6, -0.27, -0.25, 0.9, 1.0, M['estrutura'])
ME_CIL = cil.mesh('PLAT_Rack_Cilindros')
APOIO = [('PLAT_Console_Leste', ME_CONS, (8.15, 31.8), PI / 2), ('PLAT_Console_Oeste', ME_CONS, (-8.15, 35.4), -PI / 2),
         ('PLAT_Carro_1', ME_CARRO, (8.3, 34.9), 0.3), ('PLAT_Carro_2', ME_CARRO, (8.4, 37.4), -0.2),
         ('PLAT_Rack_Cilindros', ME_CIL, (-8.25, 29.6), PI / 2)]
for nm, me, (x, z), rz in APOIO:
    o = link_dup(nm, me, C['comum'], G(x, z, 0.0), rz=rz)
    o['tipo'] = 'equipamento de apoio (fora do deck)'
    suave(o, 40)

# ============================================================ marcadores para a planta (render) e câmeras
REFC = bpy.data.collections['REF_LAYOUT']
for o in list(REFC.objects):
    if o.name.startswith('REF_PLAT_'):
        bpy.data.objects.remove(o, do_unlink=True)
mk = Builder(origin=G(0, 29.5, 3.3))
mk.cyl(G(0, 29.5, 3.3), 2.7, 0.04, material('M_REF_Zona_Embarque', '#F0B040', 1.0, emit='#F0B040', strength=0.4, alpha=0.35), seg=48)
mk.build('REF_PLAT_Zona_Embarque_2_7m', REFC, props={'nota': 'near(exit, 2.7) em useExpeditionStore.ts'})
for nm, (x, z), cor in (('REF_PLAT_Marca_Desembarque', (0, 29.5), '#E04A3A'), ('REF_PLAT_Marca_Nave', (0, 33.0), '#40C8D8')):
    mk = Builder(origin=G(x, z, 3.35))
    mk.cyl(G(x, z, 3.35), 0.35, 0.06, material('M_' + nm, cor, 1.0, emit=cor, strength=1.5), seg=24)
    mk.build(nm, REFC)
for nm, txt, (x, z) in (('REF_PLAT_TXT_Desembarque', 'desembarque (0; 29,5)', (2.6, 29.0)),
                        ('REF_PLAT_TXT_Nave', 'INTERACT_Nave (0; 33)', (2.6, 33.3))):
    text_mesh(nm, txt, 0.42, REFC, G(x, z, 3.4), (0, 0, 0), bpy.data.materials['M_REF_Texto'], extrude=0.0)
cu = bpy.data.curves.new('REF_PLAT_Rota_Embarque', 'CURVE')
cu.dimensions = '3D'
cu.bevel_depth = 0.09
sp = cu.splines.new('POLY')
pts = [(0, 17.5), (0, 20.5), (0, 25.0), (0, 29.5), (0, 33.0)]
sp.points.add(len(pts) - 1)
for p, (x, z) in zip(sp.points, pts):
    v = G(x, z, 3.2)
    p.co = (v.x, v.y, v.z, 1)
cu.materials.append(material('M_REF_Rota_Embarque', '#40C8D8', 1.0, emit='#40C8D8', strength=1.2))
make_obj('REF_PLAT_Rota_Embarque', cu, REFC)

LC = bpy.data.collections['LUZES_CAMERAS']
for o in list(LC.objects):
    if o.name.startswith('CAM_PLAT_'):
        bpy.data.objects.remove(o, do_unlink=True)


def cam(nome, alvo, origem=None, direcao=None, lente=None, ortho=None, dist=90):
    cd = bpy.data.cameras.new(nome)
    cd.clip_start, cd.clip_end = 0.1, 400
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    else:
        cd.lens = lente
    o = bpy.data.objects.new(nome, cd)
    LC.objects.link(o)
    if origem is not None:
        o.location = origem
        d = (alvo - origem).normalized()
    else:
        d = -Vector(direcao).normalized()
        o.location = alvo - d * dist
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o


cam('CAM_PLAT_Geral', G(-3, 34, 3), direcao=(0.8, -1.0, 0.95), ortho=40)
c = cam('CAM_PLAT_Planta', G(-2.5, 32, 0), direcao=(0, 0, 1), ortho=34)
c.rotation_euler = (0, 0, 0)
cam('CAM_PLAT_Aproximacao', G(-1.0, 37.5, 6.5), origem=G(4.5, 19.5, 2.4), lente=26)
cam('CAM_PLAT_Entrada', G(0, 34.6, 1.6), origem=G(2.6, 28.0, 1.75), lente=28)

# ============================================================ camadas de visualização das variantes


def find_lc(lc, name):
    if lc.collection.name == name:
        return lc
    for ch in lc.children:
        r = find_lc(ch, name)
        if r:
            return r


def camada(nome, excl):
    vl = sc.view_layers.get(nome) or sc.view_layers.new(nome)
    for n in ('REF_LAYOUT', 'TERRENO', 'ARQUITETURA', 'TELHADOS', 'PROPS', 'MARCADORES', 'COLISORES_ESTUDO',
              'LUZES_CAMERAS', 'PLATAFORMA_COMUM', 'PLATAFORMA_A_CENTRAL', 'PLATAFORMA_B_DESLOCADA', 'V003_SUBSTITUIDOS',
              'COL_NOVO_PLATAFORMA', 'REF_EXPLORADOR'):
        lc = find_lc(vl.layer_collection, n)
        if lc:
            lc.exclude = n in excl
    return vl


for vln in [v.name for v in sc.view_layers]:
    lc = find_lc(sc.view_layers[vln].layer_collection, 'V003_SUBSTITUIDOS')
    if lc:
        lc.exclude = True
base_excl = ['COLISORES_ESTUDO', 'V003_SUBSTITUIDOS']
camada('Plataforma_A', base_excl + ['REF_LAYOUT', 'PLATAFORMA_B_DESLOCADA'])
camada('Plataforma_B', base_excl + ['REF_LAYOUT', 'PLATAFORMA_A_CENTRAL'])
camada('Planta_Plataforma_A', base_excl + ['PLATAFORMA_B_DESLOCADA', 'TELHADOS'])
camada('Planta_Plataforma_B', base_excl + ['PLATAFORMA_A_CENTRAL', 'TELHADOS'])
for vln in ('Completa', 'Sem_Telhados', 'Interiores_SE', 'Planta_Setores'):
    if vln in sc.view_layers:
        lc = find_lc(sc.view_layers[vln].layer_collection, 'PLATAFORMA_A_CENTRAL')
        lc2 = find_lc(sc.view_layers[vln].layer_collection, 'PLATAFORMA_B_DESLOCADA')
        if lc and lc2:
            lc.exclude, lc2.exclude = False, True     # camadas da v003 mostram a variante A por padrão

proxy = bpy.data.objects.get('REF_Explorador_Proxy_Escala')
if proxy:
    proxy.location = G(0.9, 29.2, 0.0)
    proxy.rotation_euler = (0, 0, 0)        # frente -Y local = sul do jogo (para a baia/foguete)
sc['estudo'] = 'Colônia de Marte v004 — estudo da plataforma de lançamento (variantes A central e B deslocada)'
bpy.ops.wm.save_mainfile()
print('BUILD_V004_OK', len(bpy.data.objects))
