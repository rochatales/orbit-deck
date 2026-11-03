"""Ícone do perfil no radar a partir da arte conceito (vista 3/4), no estilo dos itens do HUD.

Uso: Blender --background --python art-source/personagens/perfil-radar/gerar_perfil.py

Recorta o busto, tira o fundo azul por inundação a partir das bordas (viseira e luzes ciano ficam,
pois estão cercadas pelo capacete), reforça contraste e aplica o contorno escuro grosso dos ícones.
"""
import bpy, numpy as np
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'src/assets/ui/perfil-explorador-v001.png'
X0, X1, Y0, Y1 = 1560, 1890, 160, 490   # busto na vista 3/4 (pixels da arte, y para baixo)
SIZE, OUTLINE = 128, 5                  # ícone final e contorno em pixels do ícone

im = bpy.data.images.load(str(HERE / 'astronauta-conceito.jpg'))
im.colorspace_settings.name = 'Non-Color'
w, h = im.size
rgba = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # y para baixo
crop = rgba[Y0:Y1, X0:X1, :3]
r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]

# Fundo: azul-petróleo quase sem vermelho (0,02 0,22 0,29). A viseira tem vermelho >= 0,13 e a
# borda ciano é muito mais clara, então a inundação para na silhueta.
teal = (r < .115) & (g > .1) & (g < .45) & (b > r + .12)
seen = np.zeros_like(teal)
seen[0, :] = teal[0, :]; seen[:, 0] = teal[:, 0]; seen[:, -1] = teal[:, -1]; seen[-1, :] = teal[-1, :]
def grow(m):
    o = m.copy()
    o[1:, :] |= m[:-1, :]; o[:-1, :] |= m[1:, :]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]
    return o
while True:
    nxt = grow(seen) & teal
    nxt |= seen
    if nxt.sum() == seen.sum(): break
    seen = nxt
alpha = ~seen

# Corte do busto: base em arco, como o recorte de um retrato.
H, W = alpha.shape
yy, xx = np.mgrid[0:H, 0:W]
alpha &= yy < (H * .96 - ((xx - W * .48) / (W * .62)) ** 2 * H * .2)

# Fica só a maior ilha (tira restos de legenda e de grade).
labels = np.zeros_like(alpha, dtype=np.int32); best = None; best_n = 0
left = alpha.copy()
while left.any():
    y, x = np.argwhere(left)[0]
    m = np.zeros_like(left); m[y, x] = True
    while True:
        n = grow(m) & left
        if n.sum() == m.sum(): break
        m = n
    left &= ~m
    if m.sum() > best_n: best, best_n = m, int(m.sum())
alpha = best

# Pintura: contraste e saturação de ícone ilustrado.
color = crop.copy()
color = np.clip((color - .5) * 1.22 + .52, 0, 1)
luma = color.mean(axis=2, keepdims=True)
color = np.clip(luma + (color - luma) * 1.25, 0, 1)

# Reduz por média (alfa pré-multiplicado) ao tamanho final.
def shrink(a, size):
    ys = (np.arange(size + 1) * a.shape[0] / size).astype(int)
    xs = (np.arange(size + 1) * a.shape[1] / size).astype(int)
    out = np.zeros((size, size) + a.shape[2:], dtype=np.float32)
    for j in range(size):
        for i in range(size):
            out[j, i] = a[ys[j]:ys[j + 1], xs[i]:xs[i + 1]].mean(axis=(0, 1))
    return out
pad = int(W * .04)
A = np.pad(alpha.astype(np.float32), pad)
C = np.pad(color * alpha[..., None], ((pad, pad), (pad, pad), (0, 0)))
a = shrink(A, SIZE)
c = shrink(C, SIZE)
c = c / np.maximum(a[..., None], 1e-4)

# Contorno escuro grosso, em disco, como nos ícones dos itens.
solid = a > .5
ring = solid.copy()
for _ in range(OUTLINE):
    ring = grow(ring)
ink = np.array([.035, .05, .06], dtype=np.float32)
outA = np.maximum(a, ring.astype(np.float32))
rgb = c * a[..., None] + ink * (1 - a[..., None])

px = np.dstack([rgb, outA])[::-1].astype(np.float32)
out = bpy.data.images.new('perfil', SIZE, SIZE, alpha=True)
out.colorspace_settings.name = 'Non-Color'
out.pixels[:] = px.ravel()
out.filepath_raw = str(OUT); out.file_format = 'PNG'; out.save()
print('PERFIL_OK', OUT, 'fundo removido', round(float(seen.mean()), 3))
