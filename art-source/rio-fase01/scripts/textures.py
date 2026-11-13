"""Texturas autorais repetíveis, executadas dentro do Blender com numpy."""
from pathlib import Path
import bpy
import numpy as np
import json

OUT = Path(__file__).resolve().parents[1] / 'texturas'
PALETTE = {
    'reboco': (203, 195, 174), 'concreto': (151, 145, 128),
    'asfalto': (66, 70, 68), 'pedra': (144, 138, 119),
    'areia': (205, 181, 137), 'madeira': (110, 91, 69),
    'ferrugem': (134, 78, 49), 'folha': (74, 94, 45),
}

def generate():
    OUT.mkdir(exist_ok=True)
    rng = np.random.default_rng(13112026)
    records = []
    for name in [*PALETTE, 'ondas']:
        n = 1024 if name == 'ondas' else 256
        y, x = np.mgrid[0:n, 0:n]
        u, v = x / n, y / n
        variation = 6 * np.sin(u*6.283)*np.cos(v*12.566) + rng.normal(0, 2, (n,n))
        if name == 'ondas':
            # Azulejo de 5 × 8 m, periódico nos dois eixos. Pedras miúdas com junta.
            pattern = np.cos(2*np.pi*(u*2 + .48*np.sin(v*2*np.pi)))
            dark = pattern > .4
            rgb = np.where(dark[...,None], [39,42,38], [213,207,185]).astype(float)
            joints = ((np.mod(u*80,1)<.08) | (np.mod(v*80+(np.floor(u*80)%2)*.5,1)<.08))
            rgb[joints] *= .77
            rgb += variation[...,None]
        else:
            rgb = np.zeros((n,n,3)) + PALETTE[name] + variation[...,None]
            if name == 'reboco':
                streak = np.maximum(0, np.sin(u*31*2*np.pi))**15
                rust = streak * (np.cos(v*2*np.pi)*.5+.5)**4
                rgb -= rust[...,None] * [23,48,57]
                rgb -= ((np.sin(u*8*np.pi)*np.sin(v*6*np.pi)) > .65)[...,None]*18
            elif name == 'madeira':
                rgb -= (np.mod(x,64)<3)[...,None]*28
                rgb += (np.sin(u*180*np.pi)*3)[...,None]
            elif name == 'asfalto':
                cracks = np.abs(np.sin(2*np.pi*(u*3+.08*np.sin(v*16*np.pi)))) < .018
                rgb -= cracks[...,None]*22
            elif name == 'concreto':
                rgb -= ((x%128<2)|(y%128<2))[...,None]*19
            elif name == 'ferrugem':
                patch = np.sin(u*14*np.pi)*np.cos(v*12*np.pi) > .25
                rgb[patch] = rgb[patch]*.45 + np.array([42,50,48])
            elif name == 'areia':
                rgb += np.sin((u*24+.18*np.sin(v*2*np.pi))*2*np.pi)[...,None]*3
        rgba = np.ones((n,n,4),dtype=np.float32)
        rgba[:,:,:3] = np.clip(rgb/255,0,1)
        image = bpy.data.images.new('RIO_'+name, n, n, alpha=False)
        image.pixels.foreach_set(rgba.ravel())
        image.filepath_raw = str(OUT/(name+'.png'))
        image.file_format = 'PNG'
        image.save()
        records.append(dict(file=name+'.png',width=n,height=n,origin='Procedural autoral, numpy, semente 13112026',
                            uv='REPEAT, família isolada; sem blocos de cores vizinhos no atlas'))
    (OUT/'manifesto.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
