# Pranchas e quadros da sequência da v005 (Python do sistema + Pillow).
#   python3 art-source/mars-colony-plataforma/scripts/montar_v005.py [comparacoes] [sequencia]
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
R = os.path.join(ROOT, 'renders', 'v005')
ETAPAS = set(sys.argv[1:]) or {'comparacoes', 'sequencia'}
F = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s)
AN = json.load(open(os.path.join(ROOT, 'notas', 'analise_v005.json')))
OC = AN['oclusao']


def rot(img, txt, sz=24, pos=(10, 10), bg=(22, 28, 28)):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=F(sz))
    d.rectangle((pos[0], pos[1], pos[0] + x1 - x0 + 16, pos[1] + y1 - y0 + 12), fill=bg)
    d.text((pos[0] + 8 - x0, pos[1] + 6 - y0), txt, font=F(sz), fill=(242, 236, 222))


def med(var, an):
    o = OC[var]
    return 'jogador %d%% · baia %d%% · faixa sul %d%%' % (o['jogador_no_desembarque'][an]['pct'],
                                                        o['baia_ate_INTERACT_Nave'][an]['pct'], o['faixa_sul_deck'][an]['pct'])


if 'comparacoes' in ETAPAS:
    linhas = [('01_geral_B.png', '01_geral_B2.png', 'Vista geral', None),
              ('05_jogo_B_SE.png', '05_jogo_B2_SE.png', 'Câmera do jogo · padrão (SE)', 'SE'),
              ('05_jogo_B_SO.png', '05_jogo_B2_SO.png', 'Câmera do jogo · sudoeste (SO)', 'SO'),
              ('05_jogo_B_S.png', '05_jogo_B2_S.png', 'Câmera do jogo · sul (S)', 'S')]
    esc = 0.5
    tiles = []
    for a, b, t, an in linhas:
        A = Image.open(os.path.join(R, a)).convert('RGB')
        B = Image.open(os.path.join(R, b)).convert('RGB')
        A, B = (i.resize((int(i.width * esc), int(i.height * esc)), Image.LANCZOS) for i in (A, B))
        rot(A, 'B atual (v004) · ' + t + (' · ' + med('B_v004', an) if an else ''), sz=18, pos=(6, 6))
        rot(B, 'B refinada (v005) · ' + t + (' · ' + med('B2_v005', an) if an else ''), sz=18, pos=(6, 6))
        tiles.append((A, B))
    w, h = tiles[0][0].size
    out = Image.new('RGB', (2 * w + 10, len(tiles) * (h + 8) + 60), (22, 26, 26))
    rot(out, 'B atual × B refinada · jogador no desembarque (0; 29,5) · zoom inicial do jogo · % = amostras ocultas', sz=24, pos=(6, 8))
    for k, (A, B) in enumerate(tiles):
        out.paste(A, (0, 56 + k * (h + 8)))
        out.paste(B, (w + 10, 56 + k * (h + 8)))
    out.save(os.path.join(R, 'comparacao_B_atual_x_B_refinada.png'))
    ANG = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE']
    ims = []
    for an in ANG:
        im = Image.open(os.path.join(R, '05_jogo_B2_%s.png' % an)).convert('RGB').resize((960, 540), Image.LANCZOS)
        rot(im, '%s · %s' % (an, med('B2_v005', an)), sz=18, pos=(6, 6))
        ims.append(im)
    out = Image.new('RGB', (4 * 960 + 30, 2 * 540 + 70), (22, 26, 26))
    rot(out, 'B refinada (v005) · teste parado no desembarque · 8 orientações da câmera do jogo', sz=24, pos=(6, 8))
    for k, im in enumerate(ims):
        out.paste(im, (6 + (k % 4) * 966, 60 + (k // 4) * 546))
    out.save(os.path.join(R, 'jogo_8_rotacoes_B2_desembarque.png'))
    print('COMPARACOES_OK')

if 'sequencia' in ETAPAS:
    S = json.load(open(os.path.join(ROOT, 'notas', 'sequencia_v005.json')))
    Q = S['quadros']
    ORI = S['orientacoes']
    pasta = os.path.join(R, 'sequencia', 'lado_a_lado')
    os.makedirs(pasta, exist_ok=True)
    n = len(Q)

    def mapa(cursor, W, H):
        img = Image.new('RGB', (W, H), (24, 26, 26))
        d = ImageDraw.Draw(img)
        ml, mt = 210, 30
        lh = (H - mt - 34) / 16
        d.text((10, 6), 'corpo do jogador oculto pela PLATAFORMA (preto = 0%, laranja = 100%) · 8 orientações', font=F(15), fill=(220, 220, 220))
        for blk, var, nome in ((0, 'B_v004', 'B atual'), (1, 'B2_v005', 'B refinada')):
            for k, an in enumerate(ORI):
                y = mt + (blk * 8 + k) * lh
                d.text((10, y), '%s · %s' % (nome, an), font=F(13), fill=(200, 200, 200))
                for i, f in enumerate(Q):
                    v = f[var]['plataforma'][k]
                    x0 = ml + (W - ml - 10) * i / n
                    x1 = ml + (W - ml - 10) * (i + 1) / n
                    cor = (int(40 + 200 * v), int(40 + 100 * v), int(40 - 20 * v)) if v > 0 else (40, 44, 44)
                    d.rectangle((x0, y + 1, x1, y + lh - 1), fill=cor)
        x = ml + (W - ml - 10) * cursor / n
        d.line((x, mt, x, H - 30), fill=(240, 240, 240), width=2)
        return img
    feitos = 0
    for i, f in enumerate(Q):
        a = os.path.join(R, 'sequencia', 'SE', 'f_%04d.png' % i)
        b = os.path.join(R, 'sequencia', 'SO', 'f_%04d.png' % i)
        if not (os.path.exists(a) and os.path.exists(b)):
            continue
        A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
        W = A.width * 2 + 8
        out = Image.new('RGB', (W, A.height + 46 + 330), (20, 22, 22))
        out.paste(A, (0, 46))
        out.paste(B, (A.width + 8, 46))
        rot(out, 'B refinada (v005) · acesso ao foguete · t = %.2f s · %s' % (f['t'], f['estado']), sz=20, pos=(6, 6), bg=(20, 22, 22))
        rot(out, 'câmera padrão (SE) · oculto pela plataforma: %d%%' % (100 * f['B2_v005']['plataforma'][1]), sz=16, pos=(6, 54))
        rot(out, 'sudoeste (SO) · oculto pela plataforma: %d%%' % (100 * f['B2_v005']['plataforma'][3]), sz=16, pos=(A.width + 14, 54))
        out.paste(mapa(i, W, 330), (0, 46 + A.height))
        out.save(os.path.join(pasta, 'f_%04d.png' % i))
        feitos += 1
    mapa(n - 1, 1928, 330).save(os.path.join(R, 'sequencia_mapa_ocultacao_B_x_B2.png'))
    print('SEQUENCIA_MONTADA', feitos)
