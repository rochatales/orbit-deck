"""Texturas próprias: metal pintado, desgaste, borracha e faixa industrial. Sem projeção da referência."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,random
D=Path(__file__).resolve().parents[1]/'texturas';D.mkdir(exist_ok=True);N=1024
rng=np.random.default_rng(613);r=random.Random(613)
y,x=np.mgrid[0:N,0:N]
# Ruído de baixa frequência periódico, poeira irregular e riscos sem luz gravada.
a=Image.fromarray(rng.integers(0,255,(8,8),dtype=np.uint8)).resize((N,N),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(8))
cloud=np.asarray(a,dtype=float)/255
noise=rng.normal(0,3,(N,N,1));base=np.array([68,80,89])[None,None,:]+noise
coat=np.clip(base+(np.maximum(cloud-.48,0)*65)[:,:,None]*np.array([1,.78,.48]),0,255).astype('uint8')
im=Image.fromarray(coat);d=ImageDraw.Draw(im)
for i in range(850):
 xx=r.randrange(N);yy=r.randrange(N);w=r.randint(1,3);h=r.randint(2,13)
 d.ellipse((xx,yy,xx+w,yy+h),fill=(45,49,51) if i%3 else (124,112,92))
for i in range(70):
 xx=r.randrange(N);yy=r.randrange(N);length=r.randrange(4,65)
 d.line((xx,yy,xx+length,yy+r.randrange(-5,12)),fill=(116,120,117),width=1)
im.save(D/'metal_pintado.png')
rough=np.clip(175+cloud*47+rng.normal(0,2,(N,N)),0,255).astype('uint8');Image.fromarray(rough).save(D/'rugosidade.png')
a=np.asarray(im.convert('L'),float)/255;dx=np.roll(a,1,1)-np.roll(a,-1,1);dy=np.roll(a,1,0)-np.roll(a,-1,0)
n=np.stack([dx*.35,-dy*.35,np.ones_like(a)],2);n/=np.linalg.norm(n,axis=2)[:,:,None]
Image.fromarray(np.uint8((n*.5+.5)*255)).resize((512,512),Image.Resampling.LANCZOS).save(D/'normal.png')
# Hazard stripes: fixed printed geometry pattern, not a generated symbol.
hazard=np.zeros((N,N,3),np.uint8);mask=((x+y)//160)%2==0
hazard[mask]=[183,102,45];hazard[~mask]=[36,44,49]
hazard=np.clip(hazard.astype(float)+rng.normal(0,4,(N,N,1)),0,255).astype('uint8')
h=Image.fromarray(hazard);d=ImageDraw.Draw(h)
for i in range(2400):
 xx=r.randrange(N);yy=r.randrange(N);d.line((xx,yy,xx+r.randint(1,7),yy+r.randint(1,5)),fill=(76,73,62),width=1)
h.save(D/'faixas_seguranca.png')
# Alpha veil, brightest at the cavity; diffuse light column without an opaque solid cone.
w,h=128,256;yy,xx=np.mgrid[0:h,0:w];horizontal=np.maximum(0,1-abs(xx-w/2)/(w/2));vertical=(yy/(h-1))**1.6
rgba=np.zeros((h,w,4),np.uint8);rgba[:,:,:3]=[57,233,255];rgba[:,:,3]=np.uint8(horizontal*vertical*45)
Image.fromarray(rgba).save(D/'revelacao_alpha.png')
print('Texturas criadas: 5 imagens, máximo 1024px.')
