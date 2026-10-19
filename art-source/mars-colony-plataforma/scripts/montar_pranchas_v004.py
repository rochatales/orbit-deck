# Pranchas comparativas do estudo da plataforma (Python do sistema + Pillow).
#   python3 art-source/mars-colony-plataforma/scripts/montar_pranchas_v004.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
R = os.path.join(ROOT, 'renders')
AN = json.load(open(os.path.join(ROOT, 'notas', 'analise_v004.json')))
F = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s)
NOME = {'A': 'A · foguete central (fundo do deck)', 'B': 'B · foguete deslocado (sudoeste, fora do deck)', 'v003': 'v003 · referência'}
CHAVE = {'A': 'A_central', 'B': 'B_deslocada', 'v003': 'v003'}


def rot(img, txt, sz=26, pos=(10, 10)):
    d = ImageDraw.Draw(img)
    f = F(sz)
    x0, y0, x1, y1 = d.textbbox((0, 0), txt, font=f)
    d.rectangle((pos[0], pos[1], pos[0] + x1 - x0 + 16, pos[1] + y1 - y0 + 12), fill=(22, 28, 28))
    d.text((pos[0] + 8 - x0, pos[1] + 6 - y0), txt, font=f, fill=(242, 236, 222))


def lado(arqs, rotulos, saida, escala=0.5):
    ims = [Image.open(os.path.join(R, a)).convert('RGB') for a in arqs]
    ims = [i.resize((int(i.width * escala), int(i.height * escala)), Image.LANCZOS) for i in ims]
    W = sum(i.width for i in ims) + 10 * (len(ims) - 1)
    out = Image.new('RGB', (W, max(i.height for i in ims)), (25, 25, 25))
    x = 0
    for i, t in zip(ims, rotulos):
        out.paste(i, (x, 0))
        rot(out, t, pos=(x + 10, 10))
        x += i.width + 10
    out.save(os.path.join(R, saida))
    return saida


feitos = []
feitos.append(lado(['01_geral_v003.png', '01_geral_A.png', '01_geral_B.png'], [NOME['v003'], NOME['A'], NOME['B']],
                   'comparacao_geral_v003_A_B.png', 0.45))
feitos.append(lado(['03_aproximacao_v003.png', '03_aproximacao_A.png', '03_aproximacao_B.png'], [NOME['v003'], NOME['A'], NOME['B']],
                   'comparacao_aproximacao_v003_A_B.png', 0.45))
feitos.append(lado(['04_entrada_v003.png', '04_entrada_A.png', '04_entrada_B.png'], [NOME['v003'], NOME['A'], NOME['B']],
                   'comparacao_entrada_v003_A_B.png', 0.45))
feitos.append(lado(['02_planta_A.png', '02_planta_B.png'], ['Planta · ' + NOME['A'], 'Planta · ' + NOME['B']],
                   'comparacao_planta_A_B.png', 0.6))
ANG = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE']
for tag in ('v003', 'A', 'B'):
    oc = AN['oclusao'][CHAVE[tag]]
    tiles = []
    for a in ANG:
        im = Image.open(os.path.join(R, '05_jogo_%s_%s.png' % (tag, a))).convert('RGB')
        rot(im, '%s · jogador %d%% · baia %d%% · zona %d%% · deck %d%%' % (
            a, oc['jogador_no_desembarque'][a]['pct'], oc['baia_ate_INTERACT_Nave'][a]['pct'],
            oc['zona_embarque_2_7m'][a]['pct'], oc['deck_livre'][a]['pct']), sz=17, pos=(6, 6))
        tiles.append(im)
    w, h = tiles[0].size
    out = Image.new('RGB', (4 * w + 30, 2 * h + 70), (25, 25, 25))
    rot(out, 'Câmera do jogo, zoom inicial, jogador no desembarque (0; 29,5) · %s · %% = amostras ocultas' % NOME[tag], sz=22, pos=(6, 8))
    for i, t in enumerate(tiles):
        out.paste(t, (6 + (i % 4) * (w + 6), 60 + (i // 4) * (h + 6)))
    nome = 'jogo_8_rotacoes_%s.png' % tag
    out.save(os.path.join(R, nome))
    feitos.append(nome)
print('\n'.join(feitos))
