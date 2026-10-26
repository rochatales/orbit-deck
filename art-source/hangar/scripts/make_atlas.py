"""Deterministic 2K PBR atlas. Python with numpy/Pillow; no external textures."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];rng=np.random.default_rng(61225)
palette=['D8C3A8','4B4846','9C4928','EA9C24','828282','2BFFB5','FF7A1A','EA9C24','242628','3E3C3B','D8C3A8','9C4928','828282','252628','223B42','D8C3A8']
rough=[.58,.42,.64,.40,.38,.25,.28,.40,.70,.42,.58,.64,.38,.88,.15,.58]
metal=[.12,.78,.18,.25,.82,.20,.20,.25,.60,.78,.12,.18,.82,0,.25,.12]
base=np.zeros((2048,2048,3),np.uint8);orm=base.copy();em=base.copy();normal=np.zeros_like(base);normal[:]=[128,128,255]
y,x=np.mgrid[:512,:512]
for i,h in enumerate(palette):
 c=np.array([int(h[k:k+2],16) for k in (0,2,4)],float);v=np.ones((512,512));height=np.zeros((512,512),float)
 noise=rng.normal(0,1.1,(512,512));v+=(np.sin(x*.03)*np.cos(y*.027)*.018+noise*.004)
 # restrained dust toward edges, rather than high contrast triangulated paint.
 edge=np.minimum.reduce([x,y,511-x,511-y]);v-=.08*np.exp(-edge/25)
 if i==7:
  stripe=((x+y)//55)%2==0;v[stripe]=.12
 if i==9:
  ridge=(x%25)<6;v[ridge]*=.53;height[ridge]=-.7
 if i in [10,11,12,15]:
  line=(abs(x-32)<2)|(abs(x-480)<2)|(abs(y-32)<2)|(abs(y-480)<2)
  v[line]*=.65;height[line]=-.7
  for xx in [48,464]:
   for yy in [48,464]:
    bolt=(x-xx)**2+(y-yy)**2<16;v[bolt]*=.65;height[bolt]=.4
 for _ in range(14 if i not in [5,6,14] else 0):
  xx=int(rng.integers(45,460));yy=int(rng.integers(45,460));length=int(rng.integers(3,22));v[yy:yy+1,xx:xx+length]*=.72;height[yy:yy+1,xx:xx+length]=-.15
 if i in [5,6]:v[:]=1
 rgb=np.clip(c[None,None,:]*v[:,:,None],0,255).astype(np.uint8)
 tileorm=np.zeros((512,512,3),np.uint8);tileorm[:]=[255,int(rough[i]*255),int(metal[i]*255)];tileorm[:,:,0]=np.clip(255+height*35,0,255)
 dy,dx=np.gradient(height);vec=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);vec/=np.linalg.norm(vec,axis=2)[:,:,None];nm=np.uint8(np.clip((vec*.5+.5)*255,0,255))
 row=i//4*512;col=i%4*512;base[row:row+512,col:col+512]=rgb;orm[row:row+512,col:col+512]=tileorm;normal[row:row+512,col:col+512]=nm
 if i in [5,6]:em[row:row+512,col:col+512]=rgb
for name,arr in [('basecolor',base),('orm',orm),('normal',normal),('emission',em)]:Image.fromarray(arr).save(ROOT/'texturas'/f'hangar_{name}.png')
ref=Path('/Users/rochatales/Game Development/Horda Survivor/Predios/hangar_concept01.png')
if ref.exists():Image.open(ref).convert('RGB').save(ROOT/'referencia/hangar_ref.jpg',quality=97)
