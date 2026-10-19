# Rotula a imagem de conexão (Pillow). python3 art-source/mars-colony-plataforma/scripts/rotular_conexao_v005.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

R = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')), 'renders', 'v005')
rot = json.load(open(os.path.join(R, 'conexao_rotulos.json')))
F = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s)
JOG = {'1', '2'}
ims = []
for nome, titulo in (('08_conexao_B2', 'B2 · como a baia se liga ao foguete'),
                     ('09_conexao_corte_B2', 'B2 · corte sem terreno e sem piso: rampa de transferência subterrânea')):
    im = Image.open(os.path.join(R, nome + '.png')).convert('RGB')
    d = ImageDraw.Draw(im)
    for k, v in rot.items():
        x, y = v['x'] * im.width, v['y'] * im.height
        cor = (224, 160, 70) if k in JOG else (110, 200, 196)
        d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=cor, outline=(20, 20, 20), width=3)
        d.text((x - 8, y - 16), k, font=F(28), fill=(20, 20, 20))
    d.rectangle((0, 0, im.width, 54), fill=(22, 28, 28))
    d.text((16, 12), titulo, font=F(28), fill=(242, 236, 222))
    ims.append(im)
W = ims[0].width + ims[1].width + 10
leg_h = 60 + 44 * len(rot)
out = Image.new('RGB', (W, ims[0].height + leg_h), (22, 28, 28))
out.paste(ims[0], (0, 0))
out.paste(ims[1], (ims[0].width + 10, 0))
d = ImageDraw.Draw(out)
y = ims[0].height + 18
d.text((20, y), 'Âmbar = parte jogável (interação atual, sem mudança no jogo) · Ciano = percurso cenográfico (só visual)', font=F(26), fill=(242, 236, 222))
y += 46
for k, v in rot.items():
    cor = (224, 160, 70) if k in JOG else (110, 200, 196)
    d.ellipse((20, y, 52, y + 32), fill=cor)
    d.text((30, y + 2), k, font=F(24), fill=(20, 20, 20))
    d.text((66, y + 2), v['texto'], font=F(24), fill=(242, 236, 222))
    y += 44
out.save(os.path.join(R, 'conexao_baia_rampa_foguete_B2.png'))
print('ROTULOS_OK')
