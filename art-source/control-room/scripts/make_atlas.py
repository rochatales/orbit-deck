"""Deterministic 2K PBR atlas aligned with Quartel (barracks-v006) & Colony (v007) materials."""
from pathlib import Path
import struct, zlib
import numpy as np
ROOT=Path(__file__).resolve().parents[1];rng=np.random.default_rng(61225)
def save_png(path, arr):
 h, w, c = arr.shape
 def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
 raw = b''.join(b'\x00' + arr[y].tobytes() for y in range(h))
 color_type = 2 if c == 3 else 6
 path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, color_type, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))
# 0: Shell_Ivory, 1: Graphite, 2: Soil_Red/Terracota, 3: Ochre/Brass,
# 4: Metal_Light, 5: Soft Cyan (minimal EDEN core), 6: Glow_Warm, 7: Shell_Warm,
# 8: Metal_Dark, 9: Roof_Seam, 10: Shell_Ivory_Panel, 11: Terracota_Base,
# 12: Floor_Grey (Quartel/Patio), 13: Floor_Dark (30mm joint), 14: Glass, 15: Interior_Wall
palette=['E6DDC6','3A3E44','9C4A30','C89B4B','A5ABB0','5CD8E6','FFE2B8','C9BFA8','474D55','6A665E','E2D9C2','A45A3D','8B8E90','5F6367','252E36','EDE6D3']
rough=[.82,.72,.85,.55,.58,.35,.40,.85,.65,.88,.82,.86,.85,.90,.22,.88]
metal=[.05,.25,.06,.35,.35,.05,.00,.05,.30,.08,.05,.05,.05,.05,.30,.02]
base=np.zeros((2048,2048,3),np.uint8);orm=base.copy();em=base.copy();normal=np.zeros_like(base);normal[:]=[128,128,255]
y,x=np.mgrid[:512,:512]
for i,h in enumerate(palette):
 c=np.array([int(h[k:k+2],16) for k in (0,2,4)],float);v=np.ones((512,512));height=np.zeros((512,512),float)
 noise=rng.normal(0,1.0,(512,512));v+=(np.sin(x*.025)*np.cos(y*.025)*.008+noise*.002)
 if i in [5,6]:v[:]=1
 rgb=np.clip(c[None,None,:]*v[:,:,None],0,255).astype(np.uint8)
 tileorm=np.zeros((512,512,3),np.uint8);tileorm[:]=[255,int(rough[i]*255),int(metal[i]*255)]
 nm=np.zeros((512,512,3),np.uint8);nm[:]=[128,128,255]
 row=i//4*512;col=i%4*512;base[row:row+512,col:col+512]=rgb;orm[row:row+512,col:col+512]=tileorm;normal[row:row+512,col:col+512]=nm
 if i in [5,6]:em[row:row+512,col:col+512]=rgb
for name,arr in [('basecolor',base),('orm',orm),('normal',normal),('emission',em)]:save_png(ROOT/'texturas'/f'control_v002_{name}.png', arr)
