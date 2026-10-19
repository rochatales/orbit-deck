# Compara os renders antes (fonte) × depois (GLB reimportado, luzes da fonte) da prévia v006. Python do sistema + Pillow.
#   python3 art-source/mars-colony-plataforma/scripts/comparar_previa_v006.py
import json
import os
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.join(ROOT, 'export', 'previa_v006_B3')
F = lambda s: ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', s)
res = {}
for cam in ('CAM_PLAT_Geral', 'CAM_PLAT_B3_Conexao'):
    a = Image.open(os.path.join(D, 'renders_antes', cam + '.png')).convert('RGB')
    b = Image.open(os.path.join(D, 'renders_depois', cam + '.png')).convert('RGB')
    df = ImageChops.difference(a, b)
    g = df.convert('L')
    h = g.histogram()
    n = a.width * a.height
    res[cam] = {'diferenca_media_0_255': round(sum(i * c for i, c in enumerate(h)) / n, 3),
                'pixels_acima_de_8_pct': round(100 * sum(h[9:]) / n, 3),
                'pixels_acima_de_32_pct': round(100 * sum(h[33:]) / n, 3), 'max': max(i for i, c in enumerate(h) if c)}
    amp = df.point(lambda v: min(255, v * 6))
    t = [im.resize((960, 540), Image.LANCZOS) for im in (a, b, amp)]
    out = Image.new('RGB', (3 * 960 + 20, 540 + 50), (22, 26, 26))
    d = ImageDraw.Draw(out)
    for k, (im, txt) in enumerate(zip(t, ('fonte (.blend v006)', 'GLB reimportado (luzes da fonte)', 'diferença ×6'))):
        out.paste(im, (k * 970, 50))
        d.text((k * 970 + 8, 14), txt, font=F(22), fill=(240, 236, 222))
    out.save(os.path.join(D, 'comparacao_%s.png' % cam))
json.dump(res, open(os.path.join(D, 'diferencas_render.json'), 'w'), ensure_ascii=False, indent=1)
print('COMPARA_OK', json.dumps(res))
