"""Planta v005: área ampliada para leste, vizinhos, acessos e ocupação real da zona A."""
import json,math,html
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'art-source/quartel'
m=json.loads((OUT/'notas/medidas-v005.json').read_text());q=json.loads((OUT/'notas/runtime-v005.json').read_text());near=json.loads((OUT/'notas/encaixe-v002.json').read_text())['neighbors']
objects={o['name']:o for o in m['objects']};T=lambda p:(12+p[1],p[0])
b=m['visualBoundsNoGround'];full=[12+b['min'][1],b['min'][0],12+b['max'][1],b['max'][0]]
pieces={o['name']:[12+o['min'][1],o['min'][0],12+o['max'][1],o['max'][0]] for o in m['objects'] if o['type']=='MESH'}
def hit(a,b):return min(a[2],b[2])-max(a[0],b[0])>1e-7 and min(a[3],b[3])-max(a[1],b[1])>1e-7
inter={n:[p for p,b in pieces.items() if hit(b,near[n])] for n in ['Laboratório','Oficina','Praça / hub','Zona A']};assert not any(inter[n] for n in ['Laboratório','Oficina','Praça / hub'])
# Interseção do plinto arredondado com X >=15,5: faixa reta e semicircunferência leste.
r=1.3125;zone_area=(16.275-15.5)*9.675+(9.675-2*r)*r+math.pi*r*r/2
west=q['ramps'][1]['minX'];north=q['ramps'][0]['minZ']
report={'variant':'v005','chosenBy':'autor em 27/10/2026','placement':q['placement'],'wallsMapXZ':[10.5,9],'fullVisualAABB':full,'plinthAABB':[6.4125,-4.8375,17.5875,4.8375],'componentAABBIntersections':inter,'connectors':q['connectors'],'workshopGapM':near['Oficina'][1]-4.8375,'zoneAOccupiedM2':zone_area,'zoneATotalM2':125,'zoneAOccupiedPercent':zone_area/125*100,'eastAdvanceFromV004M':3,'doorClearWidth':1.8,'doorClearHeight':1.998,'rampWidth':2,'furnitureScale':1.1,'removedZoneMarkers':q['removedZoneMarkers']}
(OUT/'notas/encaixe-v005.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
W,H=1600,1260;BG='#0c1b23';FG='#dfedf1';MUT='#a5c2cd';img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img);svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="{BG}"/><g font-family="Arial,sans-serif">']
def text(x,y,t,size=22,color=FG,bold=False):
 f=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf',size);d.text((x,y),t,font=f,fill=color);svg.append(f'<text x="{x}" y="{y+size*.88}" fill="{color}" font-size="{size}" font-weight="{700 if bold else 400}">{html.escape(t)}</text>')
def line(pts,color,width=2,dash=False):
 for a,b in zip(pts,pts[1:]):
  length=math.dist(a,b)
  for i in range(0,int(length)+1,12 if dash else max(1,int(length)+1)):
   t=min(i+7,length) if dash else length;p=tuple(a[k]+(b[k]-a[k])*i/max(length,1e-9) for k in [0,1]);q=tuple(a[k]+(b[k]-a[k])*t/max(length,1e-9) for k in [0,1]);d.line([p,q],fill=color,width=width)
 svg.append('<polyline points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)+f'" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="8 5"' if dash else '')+'/>')
def polygon(pts,fill,stroke,width=2,dash=False):
 if fill:d.polygon(pts,fill=fill)
 if stroke:line(pts+[pts[0]],stroke,width,dash)
 svg.append('<polygon points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)+f'" fill="{fill or "none"}" stroke="none"/>')
def rectangle(b,fill,stroke,dash=False):polygon([P((b[0],b[1])),P((b[2],b[1])),P((b[2],b[3])),P((b[0],b[3]))],fill,stroke,2,dash)
P=lambda p:(65+(p[0]+5)*31,180+(p[1]+15)*31)
text(45,28,'QUARTEL v005 · AMPLIAÇÃO PARA LESTE',36,bold=True)
text(45,82,'10,50 × 9,00 m · centro (12; 0) · orientação Y −90° · raiz 1× · entradas preservadas',22,MUT)
for x in range(-4,23,2):line([P((x,-15)),P((x,13))],'#20353f',1);text(P((x,-15))[0]-5,150,str(x),14,MUT)
for z in range(-14,14,2):line([P((-5,z)),P((22,z))],'#20353f',1);text(30,P((0,z))[1]-8,str(z),14,MUT)
rectangle(near['Zona A'],'#3e3548','#b68acb',True)
for name in ['Conector Lab–Alojamentos','Conector leste da praça']:rectangle(near[name],'#213b4b','#5e8092',True)
for n,label,p in [('Laboratório','LABORATÓRIO',(7,-11.2)),('Oficina','OFICINA',(8.3,8)),('Praça / hub','PRAÇA',(-2,0))]:rectangle(near[n],'#29483f','#7eb798');text(*P(p),label,20,bold=True)
for c in q['connectors']:rectangle([c['minX'],c['minZ'],c['maxX'],c['maxZ']],'#25586c','#75d2e1')
def rounded(hx,hy,r):
 out=[]
 for cx,cy,a0 in [(hx-r,-hy+r,-90),(hx-r,hy-r,0),(-hx+r,hy-r,90),(-hx+r,-hy+r,180)]:
  for i in range(6):
   a=math.radians(a0+i*18);out.append(T((cx+r*math.cos(a),cy+r*math.sin(a))))
 return out
polygon([P(p) for p in rounded(4.8375,5.5875,1.3125)],'#3b5460','#c6dde4')
rectangle([15.5,-4.5,17.25,4.5],'#645747',None)
for name in ['Entrance_W_Ramp','Entrance_S_Ramp']:rectangle(pieces[name],'#326577','#8bdce8')
for a,b in [((-3.525,-5.25),(-.9,-5.25)),((.9,-5.25),(3.525,-5.25)),((4.5,-4.275),(4.5,4.275)),((-3.525,5.25),(3.525,5.25)),((-4.5,-4.275),(-4.5,-2.4)),((-4.5,-.6),(-4.5,4.275))]:line([P(T(a)),P(T(b))],'#ebe4d3',5)
for cx,cy,a0 in [(3.525,-4.275,-90),(3.525,4.275,0),(-3.525,4.275,90),(-3.525,-4.275,180)]:
 arc=[P(T((cx+.975*math.cos(math.radians(a0+i*18)),cy+.975*math.sin(math.radians(a0+i*18))))) for i in range(6)];line(arc,'#ebe4d3',5)
rectangle([6.75,-4.5,14.25,4.5],None,'#efb66e',True)
text(*P((7.2,3.1)),'limite v004',16,'#f4c991');text(*P((9.5,.3)),'QUARTEL v005',19,bold=True)
for points in [[(4,0),(west,0),(6.75,0),(10.5,0)],[(10.5,0),(10.5,-4.5),(10.5,north),(10.5,-8)]]:line([P(p) for p in points],'#91f3bb',4,True)
text(*P((16,-9.5)),'ZONA A',21,'#d8b3f0',True)
text(60,1082,'N ↑ −Z  |  Leste → +X  |  metros',20,MUT)
text(960,183,'DIMENSÕES NOVAS',26,bold=True)
notes=['Paredes: 10,50 × 9,00 m','Área nominal: 94,50 m² (+40%)','Altura total: 4,164 m','Portas: 1,80 × 1,998 m','Rampas: 2,00 × 1,20 m','Móveis: +10% em cada eixo','9.078 triângulos · 1 material','Piso: 0,2625 m · raiz 1×']
for i,n in enumerate(notes):text(960,238+i*39,n,23,MUT)
text(960,607,'ENCAIXE E ROTAS',26,bold=True)
notes=['Sem colisão com Lab, praça e Oficina.','Folga à Oficina: 0,8025 m','Avanço a leste: +3,00 m',f'Zona A ocupada: {zone_area:.2f} m²'.replace('.',','),f'Parte da zona A: {zone_area/125*100:.2f}%'.replace('.',','),'Portas nas mesmas posições do mapa','Verde: praça → quartel → Lab','Laranja: limite da versão v004']
for i,n in enumerate(notes):text(960,660+i*39,n,22,MUT)
text(45,1154,'Dimensão escolhida pelo autor. Apenas a cópia montada perde as demarcações encobertas pelo novo quartel.',23,FG,True)
text(45,1200,'Variantes anteriores preservadas. Percurso/colisão verificados tecnicamente; aceite visual e jogabilidade pendentes.',21,MUT)
svg.append('</g></svg>');(OUT/'renders/planta-encaixe-v005.svg').write_text('\n'.join(svg));img.save(OUT/'renders/planta-encaixe-v005.png')
