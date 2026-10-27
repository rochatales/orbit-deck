"""Parada A: medidas de projeção e três opções. Nenhum transform é aplicado ao asset.
Executar com Python + Pillow; gera JSON, SVG e PNG de estudo.
"""
from pathlib import Path
import json, math, html
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'art-source/quartel'
master=json.loads((ROOT/'src/world/marsMasterplan.json').read_text())
manifest=json.loads((ROOT/'src/assets/colony-v007.manifest.json').read_text())
measured=json.loads((OUT/'notas/medidas-v002.json').read_text());objs={o['name']:o for o in measured['objects']}
rooms={r['id']:r for r in master['rooms']};corridors={r['id']:r for r in master['corridors']}
def rect(r):
 x,z=r['position']['x'],r['position']['z'];w,d=r['size']['width'],r['size']['depth'];return [x-w/2,z-d/2,x+w/2,z+d/2]
def room_art(id):
 bs=[p['bounds'] for p in manifest['parts'] if p.get('ambiente')==id]
 return [min(b['minX'] for b in bs),min(b['minZ'] for b in bs),max(b['maxX'] for b in bs),max(b['maxZ'] for b in bs)]
def corners(b):return [(b[0],b[1]),(b[2],b[1]),(b[2],b[3]),(b[0],b[3])]
def transform(p,option):
 # Blender Rz=-90°, seguido de glTF Y-up: jogo x=cx+Y, z=cz+X.
 # Atenção: Rz=-90 transforma (X,Y) em (Y,-X); glTF z=-Y' = X.
 x,y=p;s=option['scale'];return (option['x']+y*s,option['z']+x*s)
def local_box(name,option):
 b=objs[name];return [transform(p,option) for p in corners([b['min'][0],b['min'][1],b['max'][0],b['max'][1]])]
def bbox(poly):return [min(x for x,z in poly),min(z for x,z in poly),max(x for x,z in poly),max(z for x,z in poly)]
def rounded(hx,hy,r):
 pts=[]
 for cx,cy,a0 in [(hx-r,-hy+r,-90),(hx-r,hy-r,0),(-hx+r,hy-r,90),(-hx+r,-hy+r,180)]:
  for i in range(6):
   a=math.radians(a0+i*18);pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
 return pts
def plinth(op):return [transform(p,op) for p in rounded(6.45,5.45,1.75)]
def clip(poly,b):
 for axis,edge,sign in [(0,b[0],1),(0,b[2],-1),(1,b[1],1),(1,b[3],-1)]:
  out=[]
  if not poly:return []
  for a,c in zip(poly,poly[1:]+poly[:1]):
   ia=(a[axis]-edge)*sign>=-1e-9;ic=(c[axis]-edge)*sign>=-1e-9
   if ia:out.append(a)
   if ia!=ic:
    t=(edge-a[axis])/(c[axis]-a[axis]);out.append(tuple(a[i]+t*(c[i]-a[i]) for i in [0,1]))
  poly=out
 return poly
def area(poly):return abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(poly,poly[1:]+poly[:1])))/2 if poly else 0
def overlap(a,b):return [max(0,min(a[2],b[2])-max(a[0],b[0])),max(0,min(a[3],b[3])-max(a[1],b[1]))]
def gap(a,b):
 dx=max(a[0]-b[2],b[0]-a[2],0);dz=max(a[1]-b[3],b[1]-a[3],0)
 return math.hypot(dx,dz)
options=[{'id':'A','label':'Centro antigo · não cabe','x':10.5,'z':0,'scale':1}, {'id':'B','label':'Escala original · expansão leste','x':19.5,'z':.6,'scale':1}, {'id':'C','label':'Escala 0,75× · só opção','x':10.5,'z':0,'scale':.75}]
neighbors={'Laboratório':room_art('smart-lab'),'Oficina':room_art('output-review'),'Praça / hub':room_art('central-hub'),'Conector Lab–Alojamentos':rect(corridors['lab-quarters-connector']),'Conector leste da praça':rect(corridors['east-connector-design']),'Zona A':rect(corridors['build-zone-a'])}
for op in options:
 full=[transform(p,op) for p in corners([measured['visualBoundsNoGround']['min'][0],measured['visualBoundsNoGround']['min'][1],measured['visualBoundsNoGround']['max'][0],measured['visualBoundsNoGround']['max'][1]])]
 p=plinth(op);op['fullVisualAABB']=bbox(full);op['plinthAABB']=bbox(p)
 op['doorNorth']=transform((-6,0),op);op['doorWest']=transform((0,-5),op)
 op['rampNorthTip']=transform((objs['Entrance_W_Ramp']['min'][0],0),op);op['rampWestTip']=transform((0,objs['Entrance_S_Ramp']['min'][1]),op)
 op['doorClearWidth']=1.3*op['scale'];op['doorClearHeightAboveThreshold']=2.22*op['scale'];op['height']=4.685*op['scale']
 op['interferences']={}
 for name,b in neighbors.items():
  ov=overlap(op['fullVisualAABB'],b)
  component_hits=[]
  for mesh in measured['objects']:
   if mesh['type']!='MESH':continue
   mb=bbox(local_box(mesh['name'],op));ovm=overlap(mb,b)
   if ovm[0]>1e-7 and ovm[1]>1e-7:component_hits.append({'name':mesh['name'],'overlapXZ':ovm})
  op['interferences'][name]={'componentAABBIntersections':component_hits,'envelopeOverlapXZ':ov,'plinthProjectionAreaM2':area(clip(p,b)),'plinthAABBGapM':gap(op['plinthAABB'],b),'rampNorthProjectionAreaM2':area(clip(local_box('Entrance_W_Ramp',op),b)),'rampWestProjectionAreaM2':area(clip(local_box('Entrance_S_Ramp',op),b))}
 op['zoneAPlinthAreaM2']=area(clip(p,neighbors['Zona A']));op['zoneAOccupiedPercent']=100*op['zoneAPlinthAreaM2']/125
 op['eastBeyondZoneAM']=max(0,op['fullVisualAABB'][2]-20.5)
report={'base':'6184b7c9f4cebb994b566319cba748e062e3f1db','rotationYProposalDeg':-90,'transform':'jogo.x=cx+Blender.Y*escala; jogo.z=cz+Blender.X*escala','notAppliedToBlendOrGLB':True,'neighbors':neighbors,'options':options,'method':'Interseções em projeção X/Z: plinto arredondado e AABBs individuais medidos das rampas vs AABBs conservadoras do v007. Sobreposição de envelope não é teste de triângulo/colisão Rapier.','playerReference':{'radius':.32,'controllerOffset':.06,'referenceDiameter':.76,'visualHeight':1.5},'constraints':['O conector sozinho não resolve a interferência com a Oficina na opção A.','Escala para caber nos 6,5 m antigos exigiria <=0,5417: vão 0,704 m, menor que a faixa de referência 0,76 m.','A opção C é representação na planta, nunca exportação redimensionada.','Pisos/apoio da rampa têm que transicionar do v007 para 0,35 m (ou 0,2625 m em C), em entrega posterior.']}
(OUT/'notas/encaixe-v002.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')

# Renderizador determinístico de planta: SVG editável + PNG de revisão.
W,H=2400,1490;BG='#0c1b23';FG='#e2edf0';MUT='#a3bdc8'
img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img);svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="{BG}"/><g font-family="Arial,sans-serif">']
fontfile='/System/Library/Fonts/Supplemental/Arial.ttf';boldfile='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
def text(x,y,t,size=22,color=FG,bold=False,anchor='start'):
 f=ImageFont.truetype(boldfile if bold else fontfile,size);box=d.textbbox((0,0),t,font=f);tw=box[2]-box[0];xx=x-(tw/2 if anchor=='middle' else tw if anchor=='end' else 0)
 d.text((xx,y),t,font=f,fill=color);svg.append(f'<text x="{x:.2f}" y="{y+size*.87:.2f}" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}" text-anchor="{anchor}">{html.escape(t)}</text>')
def poly(pts,fill=None,stroke=FG,width=2,dash=False):
 if fill:d.polygon(pts,fill=fill)
 if stroke:
  pp=pts+[pts[0]]
  if dash:
   for a,b in zip(pp,pp[1:]):line([a,b],stroke,width,True)
  else:d.line(pp,fill=stroke,width=width,joint='curve')
 svg.append('<polygon points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)+f'" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{width}"'+(' stroke-dasharray="8 5"' if dash else '')+'/>')
def line(pts,color=FG,width=2,dash=False,arrow=False):
 for a,b in zip(pts,pts[1:]):
  if dash:
   length=math.dist(a,b)
   for i in range(0,int(length),12):
    end=min(i+7,length);p=tuple(a[k]+(b[k]-a[k])*i/max(length,1e-8) for k in [0,1]);q=tuple(a[k]+(b[k]-a[k])*end/max(length,1e-8) for k in [0,1]);d.line([p,q],fill=color,width=width)
  else:d.line([a,b],fill=color,width=width)
 svg.append('<polyline points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)+f'" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="8 5"' if dash else '')+'/>')
 if arrow and len(pts)>1:
  a,b=pts[-2:];an=math.atan2(b[1]-a[1],b[0]-a[0]);q=[b,(b[0]-13*math.cos(an-.45),b[1]-13*math.sin(an-.45)),(b[0]-13*math.cos(an+.45),b[1]-13*math.sin(an+.45))];poly(q,color,color,1)
text(48,30,'QUARTEL · PARADA A · ESTUDO DE ENCAIXE v002',38,bold=True)
text(48,84,'Colônia v007 · entrada principal ao norte, voltada ao Laboratório · nenhuma opção aplicada ao jogo ou ao asset',24,MUT)
colors=['#ffb7a3','#9fe4c1','#c5d2ff']
for index,(op,color) in enumerate(zip(options,colors)):
 left=40+index*795;top=245;S=21;P=lambda p:(left+22+(p[0]+5)*S,top+(p[1]+15)*S)
 text(left+12,145,op['id']+' · '+op['label'],26,color,True)
 text(left+12,184,f"Centro ({op['x']:g}; {op['z']:g}) m  |  rotação Y −90°  |  {op['scale']:g}×",20,MUT)
 for x in range(-4,29,2):line([P((x,-15)),P((x,13))],'#1d333e',1);text(*P((x,-15.9)),str(x),13,'#718f9d',anchor='middle')
 for z in range(-14,14,2):line([P((-5,z)),P((28,z))],'#1d333e',1);text(left+12,P((0,z))[1]-7,str(z),13,'#718f9d',anchor='end')
 # Zona e pisos, antes da proposta.
 poly([P(p) for p in corners(neighbors['Zona A'])],'#3e3548','#a582c6',2,True)
 text(*P((18,-10.05)),'ZONA A',18,'#d7b8f4',True,anchor='middle')
 for cid in ['lab-quarters-connector','east-connector-design']:
  poly([P(p) for p in corners(rect(corridors[cid]))],'#244b5c','#5398b0',2)
 for rid,label in [('central-hub','PRAÇA'),('smart-lab','LABORATÓRIO'),('output-review','OFICINA')]:
  poly([P(p) for p in corners(room_art(rid))],'#24463e','#7cac98',2)
  rr=rooms[rid];x,z=rr['position']['x'],rr['position']['z'];text(*P((x,z-.7)),label,18,'#d9eddf',True,anchor='middle');text(*P((x,z+.25)),f"({x:g}; {z:g})",16,'#accabc',anchor='middle')
 # O plinto é o contorno físico; sem o Ground de 17×15.
 pp=plinth(op);poly([P(p) for p in pp],'#334c59','#a4c8d6',2)
 # Sobreposição em projeção (não é colisão instalada).
 for name in ['Oficina','Laboratório','Praça / hub']:
  clipped=clip(pp,neighbors[name])
  if area(clipped)>1e-6:poly([P(p) for p in clipped],'#aa5149','#ffc0a6',2)
 for name in ['Entrance_W_Ramp','Entrance_S_Ramp']:
  poly([P(p) for p in local_box(name,op)],'#326577','#86d3e2',2)
 # Paredes nominais com aberturas preservadas.
 walls=[((-4.7,-5),(-.65,-5)),((.65,-5),(4.7,-5)),((6,-3.7),(6,3.7)),((-4.7,5),(4.7,5)),((-6,-3.7),(-6,-.65)),((-6,.65),(-6,3.7))]
 for a,b in walls:line([P(transform(a,op)),P(transform(b,op))],'#e9e3ce',5)
 for cx,cy,a0 in [(4.7,-3.7,-90),(4.7,3.7,0),(-4.7,3.7,90),(-4.7,-3.7,180)]:
  arc=[(cx+1.3*math.cos(math.radians(a0+i*18)),cy+1.3*math.sin(math.radians(a0+i*18))) for i in range(6)]
  line([P(transform(p,op)) for p in arc],'#e9e3ce',5)
 for a,b in [((-.65,-5),(.65,-5)),((-6,-.65),(-6,.65))]:line([P(transform(a,op)),P(transform(b,op))],'#ffe5a7',5)
 # Sala antiga, tracejada por cima da proposta.
 poly([P(p) for p in corners(rect(rooms['design']))],None,'#f3b769',2,True)
 text(*P((10.5,2.4)),'design antigo',16,'#ffce8e',anchor='middle')
 # Rotas obrigatórias: propostas de piso / portas abertas.
 if op['id']=='B':
  west=[(4,0),(8,0),op['rampWestTip'],op['doorWest'],(op['x'],op['z'])]
  north=[(op['x'],op['z']),op['doorNorth'],op['rampNorthTip'],(19.5,-8.7),(17.4,-8.7),(17.4,-6.9),(10.5,-6.9),(10.5,-8)]
 else:
  west=[(4,0),op['rampWestTip'],op['doorWest'],(op['x'],op['z'])]
  north=[(op['x'],op['z']),op['doorNorth'],op['rampNorthTip'],(10.5,-8)]
 routecolor='#ffb19b' if op['id']=='A' else '#90f0b8'
 for r in [west,north]:line([P(p) for p in r],routecolor,3,True,True)
 text(*P((op['x'],op['z']+1.0)),'QUARTEL',18,FG,True,anchor='middle')
 for number,point in [('1',(10.5,-5.625)),('2',(5.625,0))]:
  px,py=P(point);d.ellipse([px-11,py-11,px+11,py+11],fill='#173e51',outline='#9cd8ed',width=2)
  svg.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="11" fill="#173e51" stroke="#9cd8ed" stroke-width="2"/>')
  text(px,py-9,number,16,'#d8f4ff',True,anchor='middle')
 text(left+20,865,'N ↑ −Z    |    Leste → +X    |    metros',17,MUT)
 text(left+20,901,'Pegada das paredes: '+f"{10*op['scale']:g} × {12*op['scale']:g} m",21,color,True)
 ab=op['fullVisualAABB'];text(left+20,935,f"Envelope sem Ground: {ab[2]-ab[0]:.2f} × {ab[3]-ab[1]:.2f} m",20,MUT)
 notes={
 'A':['Oficina: plinto invade 0,81 m (≈5,04 m²).','Rampa norte entra 0,12 m no envelope do Lab.','Rampa oeste entra no envelope da praça.','Conectores ficam sob o conjunto novo.','Mudar só o piso/conector não resolve a Oficina.','Zona A: pequena invasão do plinto a leste.'],
 'B':['Mantém escala, portas e mobiliário originais.','Sem sobreposição de plinto com Lab/Oficina.','Ocupa ≈51,6% da zona A e passa 4,45 m a leste.','Exige expansão da implantação e novos pisos.','Rota Lab: desvio ao norte do quartel.','Conector da praça alongado até a rampa oeste.'],
 'C':['Escala é apenas proposta; GLB continua 1×.','Sem sobreposição com Lab/Oficina/praça.','Vão 0,975 × 1,665 m acima da soleira.','Folga sul à Oficina: ≈0,80 m em projeção.','Encurta conectores até os pés das rampas.','Reduz camas, móveis e leitura visual: revisar.']
 }[op['id']]
 for i,n in enumerate(notes):text(left+20,981+i*32,'• '+n,20,FG)
# Legenda e limites do estudo.
line([(48,1220),(2350,1220)],'#395562',2)
text(48,1245,'CONTORNOS',21,FG,True)
text(48,1284,'Creme: paredes / aberturas amarelas   ·   Azul: plinto e rampas   ·   Laranja tracejado: sala antiga',21,MUT)
text(48,1321,'Verde: vizinhos e rotas propostas   ·   Roxo: zona A   ·   Vermelho: interferência em projeção',21,MUT)
text(48,1358,'1 · Lab–Alojamentos (lab-quarters-connector)   2 · Praça leste (east-connector-design)',21,MUT)
text(48,1402,'Parada A: não há runtime, escala aplicada, remoção de sala, piso novo, física ou aceite de jogabilidade.',23,'#ffd49c',True)
text(48,1448,'Fontes: marsMasterplan.json + colony-v007.manifest.json + medidas-v002.json. Detalhes e números completos em notas/encaixe-v002.json.',19,MUT)
svg.append('</g></svg>');(OUT/'renders/planta-encaixe-v002.svg').write_text('\n'.join(svg));img.save(OUT/'renders/planta-encaixe-v002.png')
print(json.dumps([{k:v for k,v in op.items() if k not in ['interferences']} for op in options],indent=2,ensure_ascii=False))

# Corte local do casco para revisar COL versus Wall_*; lintéis acima do corte.
W,H=1400,1260;img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="{BG}"/><g font-family="Arial,sans-serif">']
P=lambda p:(100+(p[0]+9)*66,170+(6.5-p[1])*66)
text(45,25,'QUARTEL v002 · WALL / COL',34,bold=True)
text(45,78,'Corte local a Z=1,40 m · Blender +Y para cima · portas fechadas em magenta',21,MUT)
poly([P(p) for p in rounded(6.45,5.45,1.75)],'#203845','#486474',2)
# Parede exterior nominal no plano do corte.
for a,b in [((-4.7,-5),(-.65,-5)),((.65,-5),(4.7,-5)),((6,-3.7),(6,3.7)),((-4.7,5),(4.7,5)),((-6,-3.7),(-6,-.65)),((-6,.65),(-6,3.7))]:line([P(a),P(b)],'#e9e3ce',16)
for cx,cy,a0 in [(4.7,-3.7,-90),(4.7,3.7,0),(-4.7,3.7,90),(-4.7,-3.7,180)]:
 arc=[(cx+1.175*math.cos(math.radians(a0+i*18)),cy+1.175*math.sin(math.radians(a0+i*18))) for i in range(6)];line([P(p) for p in arc],'#e9e3ce',16)
build=json.loads((OUT/'notas/build-v002.json').read_text())
for c in build['colliders']:
 if c['kind'] not in ['wall','door'] or c['name'].endswith('Lintel'):continue
 x,y,z=c['center'];w,h,_=c['size'];a=math.radians(c['rotationZ']);q=[]
 for u,v in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]:q.append(P((x+u*math.cos(a)-v*math.sin(a),y+u*math.sin(a)+v*math.cos(a))))
 poly(q,None,'#f5b85b' if c['kind']=='wall' else '#ff86b8',3)
for name in ['Entrance_W_Ramp','Entrance_S_Ramp']:
 b=objs[name];poly([P(p) for p in corners([b['min'][0],b['min'][1],b['max'][0],b['max'][1]])],None,'#69bdd3',2,True)
for x,y,t in [(0,5.9,'Wall_N → Leste no jogo'),(0,-4.15,'Wall_S → Oeste / praça'),(-7.5,2.6,'Wall_W'),(6.65,1.7,'Wall_E')]:text(*P((x,y)),t,18,FG,anchor='middle')
text(50,1110,'Creme: núcleo de parede 0,25 m · Âmbar: COL de parede · Magenta: COL da folha',21,MUT)
text(50,1148,'28 caixas de parede, 2 folhas, 1 piso e 2 rampas em metadados; nenhum collider no runtime.',21,MUT)
text(50,1186,'Cantos: caixas conservadoras (excesso radial ≤25 mm). Vidros fechados; lintéis fora deste corte.',20,MUT)
svg.append('</g></svg>');(OUT/'renders/planta-colliders-v002.svg').write_text('\n'.join(svg));img.save(OUT/'renders/planta-colliders-v002.png')
