"""Planta da opção 2 escolhida, a partir das medidas da variante física v004."""
import json,math,html
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'art-source/quartel'
m=json.loads((OUT/'notas/medidas-v004.json').read_text());v2=json.loads((OUT/'notas/encaixe-v002.json').read_text());near=v2['neighbors'];objects={o['name']:o for o in m['objects']}
T=lambda p:(10.5+p[1],p[0])
b=m['visualBoundsNoGround'];full=[10.5+b['min'][1],b['min'][0],10.5+b['max'][1],b['max'][0]]
west=10.5+objects['Entrance_S_Ramp']['min'][1];north=objects['Entrance_W_Ramp']['min'][0]
pieces={o['name']:[10.5+o['min'][1],o['min'][0],10.5+o['max'][1],o['max'][0]] for o in m['objects'] if o['type']=='MESH'}
def hit(a,b):return min(a[2],b[2])-max(a[0],b[0])>1e-7 and min(a[3],b[3])-max(a[1],b[1])>1e-7
inter={n:[p for p,b in pieces.items() if hit(b,near[n])] for n in ['Laboratório','Oficina','Praça / hub','Zona A']};assert not any(inter.values())
report={'variant':'v004','chosenOption':'2 / C','placement':{'x':10.5,'z':0,'rotationYDeg':-90,'appliedToAsset':False},'geometryScaleBaked':.75,'rootScale':[1,1,1],'fullVisualAABB':full,'plinthAABB':[6.4125,-4.8375,14.5875,4.8375],'componentAABBIntersections':inter,'connectorsProposed':{'east-connector-design':[4,-1.3,west,1.3],'lab-quarters-connector':[9.2,-8,11.8,north]},'westRampTip':[west,0],'northRampTip':[10.5,north],'workshopGapM':near['Oficina'][1]-4.8375,'zoneAGapM':15.5-full[2],'doorClearWidth':1.4,'doorClearHeightAboveThreshold':1.665,'walkableFloorHeight':.2625,'notRuntime':False,'rampWidth':1.6}
(OUT/'notas/encaixe-v004.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
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
text(45,28,'QUARTEL v004 · PORTAS DE 1,40 m + RUNTIME',36,bold=True);text(45,82,'Escala 0,75× incorporada · centro de implantação (10,5; 0) · orientação Y −90° · raiz do runtime em 1×',22,MUT)
for x in range(-4,23,2):line([P((x,-15)),P((x,13))],'#20353f',1);text(P((x,-15))[0]-5,150,str(x),14,MUT)
for z in range(-14,14,2):line([P((-5,z)),P((22,z))],'#20353f',1);text(30,P((0,z))[1]-8,str(z),14,MUT)
rectangle(near['Zona A'],'#3e3548','#b68acb',True)
for name in ['Conector Lab–Alojamentos','Conector leste da praça']:rectangle(near[name],'#213b4b','#5e8092',True)
for n,label,p in [('Laboratório','LABORATÓRIO',(7.0,-11.2)),('Oficina','OFICINA',(8.3,8.0)),('Praça / hub','PRAÇA',(-2,0))]:rectangle(near[n],'#29483f','#7eb798');text(*P(p),label,20,bold=True)
for b in report['connectorsProposed'].values():rectangle(b,'#25586c','#75d2e1')
def rounded(hx,hy,r):
 out=[]
 for cx,cy,a0 in [(hx-r,-hy+r,-90),(hx-r,hy-r,0),(-hx+r,hy-r,90),(-hx+r,-hy+r,180)]:
  for i in range(6):
   a=math.radians(a0+i*18);out.append(T((cx+r*math.cos(a),cy+r*math.sin(a))))
 return out
polygon([P(p) for p in rounded(6.45*.75,5.45*.75,1.75*.75)],'#3b5460','#c6dde4')
rectangle(pieces['Entrance_W_Ramp'],'#326577','#8bdce8');rectangle(pieces['Entrance_S_Ramp'],'#326577','#8bdce8')
for a,b in [((-4.7,-5),(-.9333333333,-5)),((.9333333333,-5),(4.7,-5)),((6,-3.7),(6,3.7)),((-4.7,5),(4.7,5)),((-6,-3.7),(-6,-.9333333333)),((-6,.9333333333),(-6,3.7))]:line([P(T((a[0]*.75,a[1]*.75))),P(T((b[0]*.75,b[1]*.75)))],'#ebe4d3',5)
for cx,cy,a0 in [(4.7,-3.7,-90),(4.7,3.7,0),(-4.7,3.7,90),(-4.7,-3.7,180)]:
 arc=[P(T(((cx+1.3*math.cos(math.radians(a0+i*18)))*.75,(cy+1.3*math.sin(math.radians(a0+i*18)))*.75))) for i in range(6)];line(arc,'#ebe4d3',5)
rectangle([7.25,-3.25,13.75,3.25],None,'#efb66e',True)
text(*P((7.6,2.5)),'design antigo',17,'#f4c991');text(*P((7.7,.3)),'QUARTEL 0,75×',20,bold=True)
for points in [[(4,0),(west,0),(6.75,0),(10.5,0)],[(10.5,0),(10.5,-4.5),(10.5,north),(10.5,-8)]]:
 line([P(p) for p in points],'#91f3bb',4,True)
text(*P((16.0,-9.5)),'ZONA A',21,'#d8b3f0',True)
text(60,1082,'N ↑ −Z  |  Leste → +X  |  metros',20,MUT)
text(960,183,'DIMENSÕES FINAIS',26,bold=True)
notes=['Paredes: 7,50 × 9,00 m','Envelope: 9,346 × 10,846 m','Altura total: 3,5138 m','Piso nominal: 0,2625 m','Vãos: 1,40 × 1,665 m','9.054 triângulos · 1 material','Raiz do asset: escala 1×','Rampas: 1,60 × 1,20 m']
for i,n in enumerate(notes):text(960,238+i*39,n,23,MUT)
text(960,607,'ENCAIXE E ROTAS',26,bold=True)
notes=['Sem sobreposição dos componentes','com Lab, Oficina, praça e zona A.','Folga à Oficina: 0,8025 m','Zona A livre: distância ≥0,9125 m','Praça → rampa oeste: piso 1,2415 m','Lab → rampa norte: piso 1,9915 m','Verde: rotas testadas com Rapier','Laranja: sala antiga a substituir']
for i,n in enumerate(notes):text(960,660+i*39,n,22,MUT)
text(45,1154,'Portas e rampas ampliadas na v004. Origem, v002 e v003 preservadas; escala original da v003 mantida.',23,FG,True)
text(45,1200,'Colisão e percurso conferidos em teste físico. Revisão Claude e aceite visual/jogabilidade do autor pendentes.',21,MUT)
svg.append('</g></svg>');(OUT/'renders/planta-encaixe-v004.svg').write_text('\n'.join(svg));img.save(OUT/'renders/planta-encaixe-v004.png')
