"""Compose labeled evidence sheets; no retouching of rendered geometry."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'renders'
try:font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',22);small=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',16)
except OSError:font=small=ImageFont.load_default()
def sheet(name,items,cols,title):
 w=600;h=560;rows=(len(items)+cols-1)//cols;im=Image.new('RGB',(w*cols,80+h*rows),(25,33,38));d=ImageDraw.Draw(im);d.text((24,20),title,fill='#EAE3D8',font=font)
 for i,(path,label) in enumerate(items):
  pic=Image.open(path).convert('RGB');pic=ImageOps.contain(pic,(w-20,h-55));x=i%cols*w;y=80+i//cols*h;im.paste(pic,(x+(w-pic.width)//2,y));d.text((x+20,y+h-40),label,fill='#C5CFD1',font=small)
 im.save(R/name)
views=[('01_front','Frente • ortográfica'),('02_side','Lateral • ortográfica'),('03_back','Traseira • ortográfica'),('04_3q','Três quartos • ortográfica')]
items=[(R/(n+'.png'),label) for n,label in views]
sheet('folha_turnaround_2x2_vistas.png',items,2,'HANGAR — S6.12 | V001 | 8.596 triângulos')
sheet('folha_turnaround_4_vistas.png',items,4,'HANGAR — turnarounds | mesma escala')
sheet('folha_wireframe_4_vistas.png',[(R/('wf_'+n+'.png'),label) for n,label in views],4,'HANGAR — topologia da malha exportada')
sheet('folha_comparacao_referencia_x_3d.png',[(ROOT/'referencia/hangar_ref.jpg','Referência fornecida pelo autor'),(R/'04_3q.png','V001 • candidato para avaliação artística')],2,'HANGAR — referência × modelo')
items=[]
for clip,frames in [('Idle',[1,16,31,46]),('CraneWork',[1,13,25,37]),('RampOpenClose',[1,11,20,40]),('AlertPulse',[1,10,19,28])]:
 for frame in frames:items.append((R/f'anim_{clip}_{frame:03}.png',f'{clip} — quadro {frame}'))
sheet('folha_4_animacoes_3d.png',items,4,'HANGAR — quatro clipes | 30 fps | leitura por quadros-chave')
