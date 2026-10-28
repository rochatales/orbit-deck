"""Planta técnica da integração; executar com Python + Pillow, sem alterar fontes 3D."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parents[3]
l=json.loads((p/'src/assets/laboratorio/laboratorio-v001.manifest.json').read_text());q=json.loads((p/'src/assets/quartel/barracks-v006.manifest.json').read_text())
im=Image.new('RGB',(1320,1470),'#191f28');d=ImageDraw.Draw(im)
f='/System/Library/Fonts/Supplemental/Arial.ttf';font=ImageFont.truetype(f,17);big=ImageFont.truetype(f,28);small=ImageFont.truetype(f,14)
s=36;ox=275;oy=790
def xy(x,z):return (ox+x*s,oy+z*s)
def rect(b,color,outline,label=None):
 a=xy(b['minX'],b['minZ']);c=xy(b['maxX'],b['maxZ']);d.rectangle((*a,*c),fill=color,outline=outline,width=2)
 if label:d.text((a[0]+7,a[1]+7),label,font=font,fill='#f5eee1')
d.text((34,24),'LABORATÓRIO · implantação em escala real',font=big,fill='#eee1c8')
d.text((34,66),'Base f1756c4 · centro (13,5; −12,5) · escala 1× · v001 preservada',font=font,fill='#bbbfc4')
for x in range(-5,24):d.line((*xy(x,-19),*xy(x,7)),fill='#29303a')
for z in range(-19,8):d.line((*xy(-5,z),*xy(24,z)),fill='#29303a')
rect({'minX':15.5,'maxX':20.5,'minZ':-10.5,'maxZ':14.5},'#373428','#736243')
rect({'minX':-3.5,'maxX':3.5,'minZ':-13.75,'maxZ':-7.25},'#3a4855','#8d9da5','EDEN')
rect(q['plinth'],'#384c46','#80a895','QUARTEL')
for a in q['ramps']:rect(a,'#5c6559','#a9b9a1')
rect({'minX':7.39,'maxX':13.61,'minZ':5.64,'maxZ':11.36},'#3a4855','#8d9da5','OFICINA')
rect({'minX':-4,'maxX':4,'minZ':-4,'maxZ':4},'#3a4855','#8d9da5','PRAÇA')
for a in l['areas']:rect(a,'#334c56','#83c4cc')
for a in l['connectors']:rect(a,'#66695d','#c5c4a8')
for a in l['staticCuboids']:
 if a['bounds']['minY']<1.5:rect(a['bounds'],'#586b73','#b3b9b8')
for a in l['dynamicCuboids']:rect(a['bounds'],'#d7ab64','#fae5ad')
d.text(xy(7.0,-16.9),'LAB · 14 × 10 m',font=font,fill='#e8edee')
old={'minX':6.5,'maxX':14.5,'minZ':-13,'maxZ':-8}
a=xy(old['minX'],old['minZ']);b=xy(old['maxX'],old['maxZ']);d.rectangle((*a,*b),outline='#f59a94',width=3)
d.text((a[0]+8,b[1]-25),'Sala anterior 8 × 5 m',font=small,fill='#ffb0a5')
path=[(3,-10.5),(5.5,-10.5),(5.5,-12.7),(9.5,-12.7),(9.5,-9.5),(15.5,-9.5),(15.5,-6.4),(10.5,-6.4),(10.5,0),(3,0)]
d.line([xy(*v) for v in path],fill='#a3eab1',width=4)
for pt in path:d.ellipse((xy(*pt)[0]-4,xy(*pt)[1]-4,xy(*pt)[0]+4,xy(*pt)[1]+4),fill='#a3eab1')
d.text((34,1350),'Verde: percurso Rapier nos dois sentidos · Salmão: laboratório anterior · Dourado: portas móveis',font=font,fill='#e8dcc5')
d.text((34,1380),'Porta oeste: (6,74; −12,70) · Porta sul: (15,50; −7,74) · piso e patamares y=0',font=font,fill='#c3cbd1')
d.text((34,1410),'A implantação ocupa parte da zona A. Seus props provisórios conflitantes saem só da cópia montada.',font=font,fill='#c3cbd1')
im.save(p/'docs/sprint-6/laboratorio-colonia/planta-implantacao.png')
