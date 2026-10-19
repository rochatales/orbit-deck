# Pranchas da v006 (Python do sistema + Pillow).
#   python3 art-source/mars-colony-plataforma/scripts/montar_v006.py [comparacoes] [rotacao] [deck] [conexao] [giro] [diagnostico]
import json
import math
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
R = os.path.join(ROOT, 'renders', 'v006')
N = os.path.join(ROOT, 'notas')
ETAPAS = set(sys.argv[1:]) or {'comparacoes', 'rotacao', 'deck', 'conexao', 'giro', 'diagnostico'}
F = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s)
FB = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', s)
FUNDO = (22, 26, 26)
CLARO = (242, 236, 222)
AMBAR, CIANO = (224, 160, 70), (110, 200, 196)
NOME = {'B2_v005': 'B refinada v005', 'B3_v006': 'B3 v006'}


def rot(img, txt, sz=24, pos=(10, 10), bg=(22, 28, 28), fonte=None):
    d = ImageDraw.Draw(img)
    f = (fonte or F)(sz)
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=f)
    d.rectangle((pos[0], pos[1], pos[0] + x1 - x0 + 16, pos[1] + y1 - y0 + 12), fill=bg)
    d.text((pos[0] + 8 - x0, pos[1] + 6 - y0), txt, font=f, fill=CLARO)


def abrir(n, esc=0.5):
    im = Image.open(os.path.join(R, n)).convert('RGB')
    return im.resize((int(im.width * esc), int(im.height * esc)), Image.LANCZOS)


def prancha(linhas, titulo, saida, rodape=None):
    w, h = linhas[0][0].size
    extra = 40 if rodape else 0
    out = Image.new('RGB', (2 * w + 10, len(linhas) * (h + 8) + 60 + extra), FUNDO)
    rot(out, titulo, sz=24, pos=(6, 8), fonte=FB)
    for k, (A, B) in enumerate(linhas):
        out.paste(A, (0, 56 + k * (h + 8)))
        out.paste(B, (w + 10, 56 + k * (h + 8)))
    if rodape:
        ImageDraw.Draw(out).text((10, out.height - 32), rodape, font=F(18), fill=(200, 200, 190))
    out.save(os.path.join(R, saida))


AN = json.load(open(os.path.join(N, 'analise_v006.json')))
OC = AN['oclusao']
RO = {'B2_v005': json.load(open(os.path.join(N, 'rotacao_v005_B2.json'))),
      'B3_v006': json.load(open(os.path.join(N, 'rotacao_v006_B3.json')))}


def med8(var, an):
    o = OC[var]
    return 'jogador %d%% · baia %d%% · faixa sul %d%%' % (o['jogador_no_desembarque'][an]['pct'], o['baia_ate_INTERACT_Nave'][an]['pct'],
                                                        o['faixa_sul_deck'][an]['pct'])


def perf(var, ponto, g):
    return int(round(100 * RO[var]['pontos'][ponto]['perfil_plataforma'][g % 360]))


if 'comparacoes' in ETAPAS:
    linhas = []
    for a, t, an in (('01_geral', 'Vista geral', None), ('05_jogo_%s_SE', 'Câmera padrão (SE, 45°)', 'SE'),
                     ('05_jogo_%s_SO', 'Sudoeste (SO, 135°)', 'SO'), ('05_jogo_%s_S', 'Sul (S, 90°)', 'S'),
                     ('05_jogo_%s_112', '112° (entre S e SO)', '112')):
        par = []
        for tag, var in (('B2', 'B2_v005'), ('B3', 'B3_v006')):
            nome = (a + '_%s.png') % tag if '%s' not in a else (a % tag) + '.png'
            im = abrir(nome)
            if an is None:
                m = ''
            elif an == '112':
                m = ' · jogador %d%% · no elevador %d%%' % (perf(var, 'desembarque_0_29_5', 112), perf(var, 'elevador_0_33', 112))
            else:
                m = ' · ' + med8(var, an)
            rot(im, '%s · %s%s' % (NOME[var], t, m), sz=17, pos=(6, 6))
            par.append(im)
        linhas.append(tuple(par))
    prancha(linhas, 'v005 × v006 · jogador no desembarque (0; 29,5) · câmera real do jogo (near 0,1) · % = corpo oculto pela plataforma',
            'comparacao_v005_x_v006.png')
    # 8 orientações da B3
    ANG = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE']
    ims = []
    for an in ANG:
        im = abrir('05_jogo_B3_%s.png' % an)
        rot(im, '%s · %s' % (an, med8('B3_v006', an)), sz=18, pos=(6, 6))
        ims.append(im)
    out = Image.new('RGB', (4 * 960 + 30, 2 * 540 + 70), FUNDO)
    rot(out, 'B3 (v006) · teste parado no desembarque · 8 orientações · câmera real do jogo', sz=24, pos=(6, 8), fonte=FB)
    for k, im in enumerate(ims):
        out.paste(im, (6 + (k % 4) * 966, 60 + (k // 4) * 546))
    out.save(os.path.join(R, 'jogo_8_rotacoes_B3_desembarque.png'))
    # a bordo
    linhas = []
    for g in (45, 105, 112, 120, 128):
        par = []
        for tag, var in (('B2', 'B2_v005'), ('B3', 'B3_v006')):
            im = abrir('10_elevador_%s_%03d.png' % (tag, g))
            rot(im, '%s · a bordo (0; 33) · câmera travada em %d° · jogador %d%% oculto' % (NOME[var], g, perf(var, 'elevador_0_33', g)),
                sz=17, pos=(6, 6))
            par.append(im)
        linhas.append(tuple(par))
    prancha(linhas, 'A bordo: o jogo leva o jogador a INTERACT_Nave (0; 33) e trava o giro no ângulo do embarque',
            'elevador_a_bordo_v005_x_v006.png')
    # silhuetas
    linhas = []
    for an in ('S', 'SO', 'SE'):
        par = []
        for tag, var in (('B2', 'B2_v005'), ('B3', 'B3_v006')):
            im = abrir('11_silhueta_%s_%s.png' % (tag, an))
            rot(im, '%s · vista %s · centrada no foguete · zoom do jogo' % (NOME[var], an), sz=17, pos=(6, 6))
            par.append(im)
        linhas.append(tuple(par))
    prancha(linhas, 'Silhuetas: foguete, torre e mastro (v006) × foguete e duas torres (v005)', 'silhuetas_v005_x_v006.png')
    A, B = abrir('12_braco_B2.png'), abrir('12_braco_B3.png')
    rot(A, 'v005 · cabine solta junto à coifa', sz=18, pos=(6, 6))
    rot(B, 'v006 · treliça articulada na torre + mão-francesa + cabine no casco', sz=18, pos=(6, 6))
    prancha([(A, B)], 'Braço da tripulação', 'braco_tripulacao_v005_x_v006.png')
    print('COMPARACOES_OK')

if 'rotacao' in ETAPAS:
    ordem = sorted(RO['B3_v006']['pontos'], key=lambda n: RO['B3_v006']['pontos'][n]['z'])
    W, lh, ml = 1928, 15, 250
    H = 90 + 2 * (len(ordem) * lh + 60) + 40
    img = Image.new('RGB', (W, H), FUNDO)
    d = ImageDraw.Draw(img)
    d.text((10, 10), 'Giro livre da câmera (360°, de 1 em 1°): corpo do jogador oculto pela plataforma em cada ponto do acesso', font=FB(22), fill=CLARO)
    d.text((10, 42), 'preto = visível · laranja = oculto (fração do corpo) · faixa clara = 100°–125° · traços = 8 orientações de 45°', font=F(17),
           fill=(200, 200, 190))
    y = 80
    gw = (W - ml - 20) / 360
    for var in ('B2_v005', 'B3_v006'):
        d.text((10, y), NOME[var], font=FB(19), fill=CLARO)
        y += 30
        d.rectangle((ml + 100 * gw, y - 4, ml + 126 * gw, y + len(ordem) * lh + 2), fill=(52, 58, 58))
        for k, n in enumerate(ordem):
            p = RO[var]['pontos'][n]
            yy = y + k * lh
            d.text((10, yy), n.replace('_', ' '), font=F(12), fill=(200, 200, 200))
            for g, v in enumerate(p['perfil_plataforma']):
                if v > 0:
                    d.rectangle((ml + g * gw, yy + 1, ml + (g + 1) * gw, yy + lh - 2), fill=(int(60 + 180 * v), int(50 + 90 * v), 30))
                else:
                    d.rectangle((ml + g * gw, yy + 1, ml + (g + 1) * gw, yy + lh - 2), fill=(36, 40, 40))
        for g in range(0, 360, 45):
            d.line((ml + g * gw, y - 6, ml + g * gw, y + len(ordem) * lh), fill=(150, 150, 150), width=1)
            d.text((ml + g * gw + 2, y + len(ordem) * lh + 2), '%d°' % g, font=F(12), fill=(180, 180, 180))
        y += len(ordem) * lh + 34
    img.save(os.path.join(R, 'rotacao_360_ocultacao_v005_x_v006.png'))
    print('ROTACAO_OK')

if 'deck' in ETAPAS:
    esc = 34
    x0, z0, x1, z1 = -16.0, 24.0, 8.0, 47.0
    Wp, Hp = int((x1 - x0) * esc), int((z1 - z0) * esc)
    out = Image.new('RGB', (2 * Wp + 30, Hp + 150), FUNDO)
    rot(out, 'Deck alcançável (colisores ativos, r 0,36 m): maior ângulo contínuo de giro com o corpo majoritariamente oculto pelo conjunto alto',
        sz=19, pos=(6, 8), fonte=FB)
    for k, var in enumerate(('B2_v005', 'B3_v006')):
        p = Image.new('RGB', (Wp, Hp), (34, 30, 28))
        d = ImageDraw.Draw(p)
        P = lambda x, z: ((x - x0) * esc, (z - z0) * esc)
        d.rectangle((*P(-7, 29), *P(7, 38)), outline=(120, 120, 110), width=2)
        d.rectangle((*P(-2, 25), *P(2, 29)), outline=(120, 120, 110), width=2)
        for g in RO[var]['deck_alcancavel']:
            v = g['graus_conjunto_alto_maioria']
            c = (int(70 + min(v, 90) / 90 * 180), int(60 + min(v, 90) / 90 * 80), 30) if v else (58, 66, 64)
            a, b = P(g['x'] - 0.24, g['z'] - 0.24), P(g['x'] + 0.24, g['z'] + 0.24)
            d.rectangle((*a, *b), fill=c)
        cx, cz = (-4.0, 41.5) if var == 'B2_v005' else (-10.0, 41.5)
        d.ellipse((*P(cx - 1.4, cz - 1.4), *P(cx + 1.4, cz + 1.4)), outline=CLARO, width=3)
        d.text(P(cx + 1.6, cz - 0.4), 'foguete', font=F(16), fill=CLARO)
        d.ellipse((*P(-0.25, 32.75), *P(0.25, 33.25)), outline=(255, 255, 255), width=2)
        d.text(P(0.4, 32.6), 'elevador (0; 33)', font=F(14), fill=CLARO)
        d.line((*P(-7, 35), *P(7, 35)), fill=(170, 170, 150), width=1)
        d.text(P(3.2, 35.2), 'faixa sul (z 35–38)', font=F(14), fill=(200, 200, 180))
        R_ = RO[var]['deck_resumo']
        fs = R_['faixa_sul_z35_38']
        out.paste(p, (10 + k * (Wp + 10), 56))
        ImageDraw.Draw(out).text((10 + k * (Wp + 10), 62 + Hp),
                                 '%s · pontos com o corpo majoritariamente oculto em algum ângulo: %d de %d\nfaixa sul: %d de %d (pior: %d° de giro)'
                                 % (NOME[var], R_['conjunto_alto']['pontos_com_corpo_majoritariamente_oculto_em_algum_angulo'],
                                    R_['pontos_alcancaveis'], fs['com_corpo_majoritariamente_oculto_pelo_conjunto_alto'], fs['pontos'],
                                    fs['graus_max_maioria_oculta']), font=F(17), fill=CLARO)
    ImageDraw.Draw(out).text((10, out.height - 34), 'cinza = nunca oculto · laranja = oculto (mais escuro → mais graus de giro, até 90°) · '
                             'o anel do elevador e a placa do totem não ficam majoritariamente ocultos na v006', font=F(16), fill=(200, 200, 190))
    out.save(os.path.join(R, 'deck_alcancavel_ocultacao_v005_x_v006.png'))
    print('DECK_OK')

if 'conexao' in ETAPAS:
    im = Image.open(os.path.join(R, '13_conexao_B3.png')).convert('RGB')
    lab = json.load(open(os.path.join(R, 'conexao_rotulos_v006.json')))
    d = ImageDraw.Draw(im)
    p2 = (lab['2']['x'] * im.width, lab['2']['y'] * im.height)
    p3 = (lab['3']['x'] * im.width, lab['3']['y'] * im.height)
    n = 16
    for i in range(n):
        if i % 2 == 0:
            a = (p2[0] + (p3[0] - p2[0]) * i / n, p2[1] + (p3[1] - p2[1]) * i / n)
            b = (p2[0] + (p3[0] - p2[0]) * (i + 1) / n, p2[1] + (p3[1] - p2[1]) * (i + 1) / n)
            d.line((*a, *b), fill=CIANO, width=5)
    mx, my = (p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2
    rot(im, 'o elevador desce; a transferência até a base é automática (narrativa, sem rota jogável)', sz=22,
        pos=(int(mx) + 30, int(my) - 20), bg=(20, 40, 42))
    for k, v in lab.items():
        x, y = v['x'] * im.width, v['y'] * im.height
        cor = AMBAR if v['tipo'] == 'jogavel' else CIANO
        d.ellipse((x - 24, y - 24, x + 24, y + 24), fill=cor, outline=(20, 20, 20), width=3)
        d.text((x - 9, y - 17), k, font=FB(30), fill=(20, 20, 20))
    d.rectangle((0, 0, im.width, 56), fill=(22, 28, 28))
    d.text((16, 12), 'B3 (v006) · imagem de análise: como a baia, o elevador e o foguete se ligam', font=FB(28), fill=CLARO)
    leg_h = 70 + 46 * len(lab)
    out = Image.new('RGB', (im.width, im.height + leg_h), (22, 28, 28))
    out.paste(im, (0, 0))
    d = ImageDraw.Draw(out)
    y = im.height + 16
    d.text((20, y), 'Âmbar = parte jogável (interação atual, sem mudança no jogo) · Ciano = cenográfico. '
                    'As cores existem só nesta imagem; o cenário não marca rota.', font=F(24), fill=CLARO)
    y += 48
    for k, v in lab.items():
        cor = AMBAR if v['tipo'] == 'jogavel' else CIANO
        d.ellipse((20, y, 54, y + 34), fill=cor)
        d.text((31, y + 3), k, font=FB(24), fill=(20, 20, 20))
        d.text((70, y + 3), v['texto'], font=F(24), fill=CLARO)
        y += 46
    out.save(os.path.join(R, 'conexao_baia_elevador_foguete_B3_analise.png'))
    print('CONEXAO_OK')

if 'giro' in ETAPAS:
    S = json.load(open(os.path.join(N, 'giro_v006.json')))
    Q = S['quadros']
    pasta = os.path.join(R, 'giro', 'lado_a_lado')
    os.makedirs(pasta, exist_ok=True)
    n = len(Q)

    def grafico(cursor, W, H):
        g = Image.new('RGB', (W, H), (24, 26, 26))
        d = ImageDraw.Draw(g)
        ml = 190
        d.text((10, 6), 'corpo do jogador oculto pela plataforma, quadro a quadro (24 qps)', font=F(15), fill=(220, 220, 220))
        for k, var in enumerate(('B2_v005', 'B3_v006')):
            y = 36 + k * 58
            d.text((10, y + 14), NOME[var], font=F(15), fill=(210, 210, 210))
            for i, f in enumerate(Q):
                v = f[var]
                xa = ml + (W - ml - 10) * i / n
                xb = ml + (W - ml - 10) * (i + 1) / n
                cor = (int(60 + 180 * v), int(50 + 90 * v), 30) if v > 0 else (40, 44, 44)
                d.rectangle((xa, y, xb, y + 44), fill=cor)
        tre = None
        for i, f in enumerate(Q):
            t = f['trecho'].split(' · ')[0]
            if t != tre:
                x = ml + (W - ml - 10) * i / n
                d.line((x, 30, x, 156), fill=(120, 120, 120), width=1)
                d.text((x + 4, 156), {'A': 'A · desembarque, giro Q e C', 'B': 'B · acesso (0; 26), giro Q', 'C': 'C · a bordo, giro travado'}[t],
                       font=F(14), fill=(200, 200, 200))
                tre = t
        x = ml + (W - ml - 10) * cursor / n
        d.line((x, 30, x, 152), fill=(240, 240, 240), width=2)
        return g
    feitos = 0
    for i, f in enumerate(Q):
        a = os.path.join(R, 'giro', 'B2_v005', 'f_%04d.png' % i)
        b = os.path.join(R, 'giro', 'B3_v006', 'f_%04d.png' % i)
        if not (os.path.exists(a) and os.path.exists(b)):
            continue
        A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
        W = A.width * 2 + 8
        out = Image.new('RGB', (W, A.height + 46 + 180), (20, 22, 22))
        out.paste(A, (0, 46))
        out.paste(B, (A.width + 8, 46))
        rot(out, 'Giro da câmera do jogo · %s · câmera em %.0f° · t = %.2f s' % (f['trecho'], f['graus'], f['t']), sz=20, pos=(6, 6), bg=(20, 22, 22))
        rot(out, 'v005 · oculto pela plataforma: %d%%' % (100 * f['B2_v005']), sz=16, pos=(6, 54))
        rot(out, 'v006 · oculto pela plataforma: %d%%' % (100 * f['B3_v006']), sz=16, pos=(A.width + 14, 54))
        out.paste(grafico(i, W, 180), (0, 46 + A.height))
        out.save(os.path.join(pasta, 'f_%04d.png' % i))
        feitos += 1
    print('GIRO_MONTADO', feitos)

if 'diagnostico' in ETAPAS:
    D = os.path.join(R, 'diagnostico')
    linhas = []
    for pref, x, z, g in (('v005', 0, 21, 101), ('v006', 0, 19, 114)):
        par = []
        for modo, txt in (('fiel', 'câmera na posição real (near 0,1)'), ('recuada', 'mesma direção, câmera recuada')):
            im = Image.open(os.path.join(D, '%s_x%g_z%g_%03d_%s.png' % (pref, x, z, g, modo))).convert('RGB')
            rot(im, '%s · jogador (%g; %g) · %d° · %s' % (pref, x, z, g, txt), sz=17, pos=(6, 6))
            par.append(im)
        linhas.append(tuple(par))
    prancha(linhas, 'Corte pelo plano near: a câmera do jogo fica a 22,8 m do alvo e corta peças altas atrás dela',
            'diagnostico_corte_near_camera.png',
            rodape='Efeito do runtime (CameraRig.tsx), não do modelo: recuar a câmera na mesma direção não muda o enquadramento ortográfico.')
    print('DIAGNOSTICO_OK')
