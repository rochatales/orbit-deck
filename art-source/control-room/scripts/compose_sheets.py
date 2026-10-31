"""Composição técnica com títulos; não retoca renders ou o conceito."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'renders'
try:font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',22);small=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',17)
except OSError:font=small=ImageFont.load_default()
def sheet(name,items,cols,title):
 w=650;h=620;rows=(len(items)+cols-1)//cols;im=Image.new('RGB',(w*cols,80+h*rows),(27,34,37));d=ImageDraw.Draw(im);d.text((24,22),title,fill='#EAE3D8',font=font)
 for i,(file,label) in enumerate(items):
  pic=ImageOps.contain(Image.open(file).convert('RGB'),(w-16,h-55));x=i%cols*w;y=80+i//cols*h;im.paste(pic,(x+(w-pic.width)//2,y));d.text((x+16,y+h-42),label,fill='#B8DADD',font=small)
 im.save(R/name)
sheet('folha_exterior_interior.png',[(R/'04_exterior.png','Exterior • portas sul e leste preservadas'),(R/'07_maquete_interior.png','Maquete de estudo • paredes frontais removidas')],2,'CONTROL ROOM — candidato v001 | 8.176 triângulos')
sheet('folha_turnaround.png',[(R/'01_front.png','Sul'),(R/'02_side.png','Leste'),(R/'03_back.png','Norte'),(R/'05_top.png','Cobertura')],2,'CONTROL ROOM — vistas ortográficas')
sheet('folha_referencia_modelo.png',[(ROOT/'referencia/control_room_ref.jpg','Referência fornecida pelo autor'),(R/'04_exterior.png','Modelo v001 — exterior'),(R/'07_maquete_interior.png','Modelo v001 — maquete de interior')],3,'CONTROL ROOM — referência × modelo')
sheet('folha_anterior_candidato.png',[(R/'12_sala_anterior.png','Anterior • extração do GLB v007'),(R/'04_exterior.png','Candidato • exterior'),(R/'13_anterior_interior.png','Anterior • sem teto'),(R/'06_interior_sem_teto.png','Candidato • sem teto, paredes preservadas')],2,'CONTROL ROOM — comparação de implantação')
# Overlay paths on the actual orthographic top render, in local Blender X/Y.
im=Image.open(R/'09_planta.png').convert('RGB');d=ImageDraw.Draw(im);w,h=im.size
paths=json.loads((ROOT/'notas/circulacao.json').read_text())['0.36']['paths_local_blender_xy'];colors={'console':'#00E9ED','east_door':'#FFB343','rack_front':'#BBE78A','north_console':'#E8A1DC'}
def pixel(p):return(w/2+p[0]*w/9,h/2-p[1]*w/9)
for key,path in paths.items():d.line([pixel(p) for p in path],fill=colors[key],width=4)
d.rectangle((12,12,470,158),fill='#1B2325');d.text((24,22),'CIRCULAÇÃO — raio 0,36 m | grade 5 cm',font=small,fill='white')
for i,(key,label) in enumerate([('console','Console'),('east_door','Acesso leste'),('rack_front','Rack'),('north_console','Consoles norte')]):d.text((25,51+i*23),label,font=small,fill=colors[key])
d.text((20,h-35),'Portas consideradas abertas • colisores propostos • não é QA de runtime',font=small,fill='white');im.save(R/'planta_circulacao.png')
