"""Texturas autorais determinísticas, sem imagens externas ou iluminação baked."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import numpy as np,random
OUT=Path(__file__).resolve().parents[1]/'texturas';OUT.mkdir(exist_ok=True)
N=1024;r=random.Random(6302);rng=np.random.default_rng(6302)
y,x=np.mgrid[0:N,0:N]; broad=5*np.sin(x*2*np.pi/N)*np.cos(y*4*np.pi/N)
def base(color,noise=4):return np.clip(np.array(color)+broad[:,:,None]+rng.normal(0,noise,(N,N,1)),0,255).astype('uint8')
for name,color in [('asfalto',(72,76,75)),('concreto',(170,165,153)),('fachada',(207,204,193)),('entulho',(133,124,111)),('calcada',(166,151,124))]:
 im=Image.fromarray(base(color,6 if name=='asfalto' else 4));d=ImageDraw.Draw(im)
 if name=='asfalto':
  for k in range(12):
   px=r.randrange(N);py=r.randrange(N);pts=[(px,py)]
   for j in range(r.randint(8,20)):
    px+=r.randint(-25,25);py+=r.randint(10,28);pts.append((px,py))
   # Repeat across all tile edges, preserving seamless crack paths.
   for dx in [-N,0,N]:
    for dy in [-N,0,N]:d.line([(a+dx,b+dy) for a,b in pts],fill=(37,39,38),width=2)
  for k in range(2):
   xx=r.randrange(150,750);yy=r.randrange(150,750)
   d.rounded_rectangle((xx,yy,xx+155,yy+210),radius=7,outline=(50,53,51),width=3)
 elif name=='calcada':
  for row in range(8):
   yy=row*128;d.line((0,yy,N,yy),fill=(96,91,78),width=4)
   for col in range(-1,5):
    xx=col*256+(row%2)*128;d.line((xx,yy,xx,yy+128),fill=(97,91,79),width=4)
 elif name in ['fachada','concreto']:
  # Broad weathering plus subtle vertical mineral streaks, not directional shadows.
  layer=Image.new('RGBA',(N,N));ld=ImageDraw.Draw(layer)
  for k in range(95):
   xx=r.randrange(N);yy=r.randrange(N);w=r.randint(2,14);h=r.randint(20,190)
   ld.rectangle((xx,yy,xx+w,yy+h),fill=(60,58,51,r.randint(12,28)))
  im=Image.alpha_composite(im.convert('RGBA'),layer.filter(ImageFilter.GaussianBlur(3))).convert('RGB')
  d=ImageDraw.Draw(im)
  for k in range(450):
   xx=r.randrange(N);yy=r.randrange(N);s=r.randint(1,4);d.ellipse((xx,yy,xx+s,yy+s),fill=(160,155,144))
 im.resize((768,768),Image.Resampling.LANCZOS).save(OUT/(name+'.png'))
 # Derivative normal of luminance; subtle relief, explicitly tile wrapped.
 a=np.asarray(im.convert('L'),dtype=float)/255
 dx=np.roll(a,1,axis=1)-np.roll(a,-1,axis=1);dy=np.roll(a,1,axis=0)-np.roll(a,-1,axis=0)
 normal=np.stack([dx*.8,-dy*.8,np.ones_like(a)],axis=2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 Image.fromarray(np.uint8(np.clip((normal*.5+.5)*255,0,255))).resize((512,512),Image.Resampling.LANCZOS).save(OUT/(name+'_normal.png'))
# Correct generic simplified Chinese, handwritten layout with a local system font.
sign=Image.new('RGB',(1024,256),(86,56,51));d=ImageDraw.Draw(sign)
fontpath='/System/Library/Fonts/STHeiti Medium.ttc'
try:font=ImageFont.truetype(fontpath,160)
except OSError:raise RuntimeError('Fonte STHeiti ausente: não gerar texto substituto ilegível')
d.text((65,20),'商店   药房',font=font,fill=(219,212,190))
for k in range(1300):
 xx=r.randrange(1024);yy=r.randrange(256);d.rectangle((xx,yy,xx+r.randrange(1,6),yy+1),fill=(102,77,65))
sign.save(OUT/'letreiro.png')
print('11 texturas geradas; autoria procedural; caracteres: 商店 (loja), 药房 (farmácia).')
