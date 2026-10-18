"""Fonte única do layout em coordenadas do jogo: X/Z plano, Y altura, metros."""
from pathlib import Path
import json, math, random
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'art-source/shanghai-fase01'
r=random.Random(6301)
bounds=dict(minX=-51,maxX=51,minZ=-54,maxZ=54)
parts=[]; obstacles=[]; buildings=[]
def box(name,x,y,z,w,h,d,mat,angle=0,collider=False):
    p=dict(id=name,x=x,y=y,z=z,w=w,h=h,d=d,material=mat,angle=angle)
    parts.append(p)
    if collider:
        dx=abs(math.cos(angle))*w/2+abs(math.sin(angle))*d/2
        dz=abs(math.sin(angle))*w/2+abs(math.cos(angle))*d/2
        obstacles.append(dict(id='COL_'+name,minX=x-dx,maxX=x+dx,minZ=z-dz,maxZ=z+dz,source=name,minY=y-h/2,maxY=y+h/2))
    return p
# Surface at zero; sidewalks are 12 cm steps, not forbidden rectangular obstacles.
box('Rua_Base',0,-.15,0,102,.3,108,'asfalto')
for ix,x in enumerate([-35,0,35]):
 for iz,z in enumerate([-37,0,37]):
  if ix==1 and iz==1: w,d=20,19; z=-1
  else:w,d=(22 if ix!=1 else 20), (24 if iz!=1 else 19)
  # Rounded sidewalk primitive resolved by Blender builder.
  p=box(f'Calcada_{ix}{iz}',x,.06,z,w,.12,d,'calcada');p['radius']=3
  # Thin edge marking outside the rounded sidewalk, no collision / z fighting.
  p=box(f'Borda_{ix}{iz}',x,.006,z,w+.24,.006,d+.24,'faixa');p['ring']=True;p['radius']=3.1
# Arrival occupies south edge of centre block, old coordinates retained.
box('Chegada',0,.008,13,10,.012,10,'concreto')
# Buildings. Taller remnants on remote edges; lower shop fronts along play routes.
for ix,x in enumerate([-35,0,35]):
 for iz,z in enumerate([-37,0,37]):
  if ix==1 and iz==1:
   specs=[(-6,-5,6,8,2,False),(6,-5,6,8,1,True)]
  else:
   # 4–5 storey rear core and 1–2 storey collapsed neighbour, alley >= 3 m.
   back=-1 if iz==0 else 1 if iz==2 else 0
   specs=[(x-5.5,z+back*3,7,12,4+(ix+iz)%2,False),(x+5.5,z-back*3,7,10,1+(ix+iz)%2,True)]
  for j,(bx,bz,w,d,floors,ruin) in enumerate(specs):
   bid=f'Predio_{ix}{iz}{j}'; mat=['terracota','azul','bege'][(ix+iz+j)%3]
   h=floors*3.3;pilotis=(iz==1 and ix in [0,2] and j==0)
   buildings.append(dict(id=bid,x=bx,z=bz,w=w,d=d,height=h,floors=floors,ruin=ruin,pilotis=pilotis))
   # Whole footprint solid: dark ground-floor recesses are NOT traversable pilotis.
   base=3.3 if pilotis else 0
   box(bid+'_Nucleo',bx,(h+base)/2,bz,w-.5,h-base,d-.5,'sombra',collider=not pilotis)
   for floor in range(floors):
    y=floor*3.3
    box(bid+f'_Laje_{floor}',bx,y+(.14 if floor==0 else .22),bz,w,.12 if floor==0 else .28,d,'concreto')
    if pilotis and floor==0:continue
    for side in [-1,1]:
     for k in range(round(w/3.5)):
      xx=bx-w/2+(k+.5)*w/round(w/3.5)
      zz=bz+side*d/2
      box(bid+f'_Peitoril_{floor}_{side}_{k}',xx,y+.88,zz,w/round(w/3.5)-.1,1.05,.25,mat)
      box(bid+f'_Viga_{floor}_{side}_{k}',xx,y+3,zz,w/round(w/3.5)-.1,.42,.32,mat)
      box(bid+f'_Janela_{floor}_{side}_{k}',xx,y+2,zz-side*.16,2.85,1.55,.07,'vidro' if floor else 'metal')
      for m in [-1,0,1]:box(bid+f'_Caixilho_{floor}_{side}_{k}_{m}',xx+m*.94,y+2,zz-side*.08,.055,1.58,.09,'metal')
      box(bid+f'_CaixilhoH_{floor}_{side}_{k}',xx,y+2,zz-side*.08,2.85,.055,.09,'metal')
      if floor==0:
       for slat in range(9):box(bid+f'_Persiana_{side}_{k}_{slat}',xx,1.35+slat*.15,zz-side*.06,2.8,.025,.03,'sombra')
    for side in [-1,1]:
     for k in range(round(d/4)):
      zz=bz-d/2+(k+.5)*d/round(d/4);xx=bx+side*w/2
      box(bid+f'_ParedeL_{floor}_{side}_{k}',xx,y+1.65,zz,.28,3.05,d/round(d/4)-.1,mat)
      box(bid+f'_JanelaL_{floor}_{side}_{k}',xx+side*.16,y+2,zz,.09,1.3,2.5,'vidro')
      for m in [-1,0,1]:box(bid+f'_MoldL_{floor}_{side}_{k}_{m}',xx+side*.22,y+2,zz+m*.8,.08,1.34,.05,'metal')
   for sx in [-1,1]:
    for sz in [-1,1]:box(bid+f'_Pilar_{sx}_{sz}',bx+sx*(w/2-.15),h/2,bz+sz*(d/2-.15),.4,h,.4,'concreto',collider=pilotis)
   # Broken roof: separated slabs and exposed rebar, no giant pristine cap.
   for k in range(3):
    box(bid+f'_Topo_{k}',bx+(k-1)*w/3,h+.06,bz+(k%2)*1.2,w/3-.12,.24,d*(.52 if k==1 else .84),'concreto',angle=(k-1)*.025)
    for q in range(3):box(bid+f'_Ferro_{k}_{q}',bx+(k-1)*w/3+q*.16,h+.55,bz+d*.3,.025,1,.025,'metal',angle=.15)
   box(bid+'_Letreiro',bx,h-.5,bz-d/2-.19,w-.7,.68,.09,'letreiro')
   # Rubble placed inside building footprint, extra scattered pieces below autostep.
   for k in range(13):
    xx=bx+r.uniform(-w/2+.6,w/2-.6);zz=bz+r.uniform(-d/2+.6,d/2-.6)
    yy=h+.3 if not ruin else h+.15
    box(bid+f'_Destroco_{k}',xx,yy,zz,r.uniform(.3,1),r.uniform(.12,.5),r.uniform(.25,.9),'entulho',r.uniform(-1,1))
# Colliders contain the full building façade, not just its recessed core.
for o in obstacles:
 if not o['source'].endswith('_Nucleo'):continue
 b=next(v for v in buildings if o['source']==v['id']+'_Nucleo');o.update(minX=b['x']-b['w']/2-.27,maxX=b['x']+b['w']/2+.27,minZ=b['z']-b['d']/2-.27,maxZ=b['z']+b['d']/2+.27)
# Streets: lanes, stop lines and arrows. Main X avenues at +-17.5 / Z +-18.5.
for x in [-17.5,17.5]:
 for z in range(-50,53,5):
  if any(abs(z-v)<9 for v in [-18.5,18.5]):continue
  box(f'Faixa_NS_{x}_{z}',x,.014,z,.12,.004,2.3,'faixa')
for z in [-18.5,18.5]:
 for x in range(-47,50,5):
  if any(abs(x-v)<8 for v in [-17.5,17.5]):continue
  box(f'Faixa_EW_{x}_{z}',x,.014,z,2.3,.004,.12,'faixa')
for x in [-17.5,17.5]:
 for z in [-18.5,18.5]:
  for q in range(4):
   a=q*math.pi/2; dx,dz=math.sin(a),math.cos(a);px,pz=x+dx*11-dz*2,z+dz*11+dx*2
   box(f'Retencao_{x}_{z}_{q}',px,.017,pz,3.3,.004,.19,'faixa',-a)
   # Arrow shape with straight stem and chevron arms.
   px+=dx*3;pz+=dz*3
   box(f'SetaH_{x}_{z}_{q}',px,.02,pz,.16,.004,1.6,'faixa',-a)
   for s in [-1,1]:box(f'SetaP_{x}_{z}_{q}_{s}',px-dx*.65+dz*s*.32,.02,pz-dz*.65-dx*s*.32,.14,.004,.9,'faixa',-a+s*.75)
# Fixed props confined to edges; every tall prop gets simple collision.
for i,(x,z) in enumerate([(-46,-12),(44,5),(-6,40),(7,-39),(-40,26),(40,-26)]):
 box(f'Carro_{i}',x,.7,z,1.8,1.2,3.7,'metal',collider=True)
 box(f'Carro_Cabine_{i}',x,1.48,z-.25,1.6,.5,1.9,'azul')
 for sx in [-1,1]:
  for sz in [-1,1]:box(f'Pneu_{i}_{sx}_{sz}',x+sx*.86,.38,z+sz*1.17,.2,.55,.65,'sombra')
for i,(x,z) in enumerate([(-25,-30),(26,-30),(-25,30),(26,30),(-6,-43),(7,43)]):
 p=box(f'Monte_{i}',x,.48,z,3,.96,3,'entulho',collider=True);p['mound']=True
 for k in range(20):
  box(f'Monte_{i}_Laje_{k}',x+r.uniform(-.8,.8),r.uniform(.2,.9),z+r.uniform(-.8,.8),r.uniform(.3,1.2),r.uniform(.1,.4),r.uniform(.25,1.1),'concreto' if k%3 else 'tijolo',r.uniform(-math.pi,math.pi))
for o in obstacles:
 if o['source'].startswith(('Carro_', 'Monte_')):
  members=[p for p in parts if p['id']==o['source'] or p['id'].startswith(o['source']+'_')]
  if o['source'].startswith('Carro_'):
   i=o['source'].split('_')[1];members += [p for p in parts if p['id'].startswith(('Pneu_'+i+'_','Carro_Cabine_'+i))]
  for p in members:
   a=p['angle'];dx=abs(math.cos(a))*p['w']/2+abs(math.sin(a))*p['d']/2;dz=abs(math.sin(a))*p['w']/2+abs(math.cos(a))*p['d']/2
   o['minX']=min(o['minX'],p['x']-dx);o['maxX']=max(o['maxX'],p['x']+dx);o['minZ']=min(o['minZ'],p['z']-dz);o['maxZ']=max(o['maxZ'],p['z']+dz)
# Low vegetation in pavement joints / small earth beds; all under autostep height.
for i,(x,z) in enumerate([(-44,-28),(44,-28),(-44,28),(44,28),(-30,8),(30,-8),(-7,-28),(7,28)]):
 box(f'Canteiro_{i}',x,.135,z,1.2,.025,2,'terra')
 for k in range(16):
  gx=x+r.uniform(-.5,.5);gz=z+r.uniform(-.85,.85)
  box(f'Grama_{i}_{k}',gx,.19,gz,.035,.12,.25,'grama',r.uniform(0,6.28))
# Rubble rebar, always contained by mound collider.
for i,(x,z) in enumerate([(-25,-30),(26,-30),(-25,30),(26,30),(-6,-43),(7,43)]):
 for k in range(7):box(f'Monte_{i}_Vergalhao_{k}',x+r.uniform(-.8,.8),.8,z+r.uniform(-.8,.8),.025,.5,.025,'metal',k*.1)
# Surface fragments and manholes, <= 0.18 m: no gameplay collision.
for i in range(95):
 x=r.uniform(-49,49);z=r.uniform(-52,52)
 if abs(x)<6 and 5<z<19:continue
 if any(o['minX']-1<x<o['maxX']+1 and o['minZ']-1<z<o['maxZ']+1 for o in obstacles):continue
 box(f'Estilhaco_{i}',x,.06,z,r.uniform(.12,.55),.12,r.uniform(.1,.4),'entulho',r.random()*6.28)
for i,(x,z) in enumerate([(-17.5,-35),(17.5,0),(0,18.5),(35,-18.5)]):
 p=box(f'Bueiro_{i}',x,.018,z,.9,.02,.9,'metal');p['round']=True
# Loot reserved only as data, no granting resources. All in clear setbacks.
loot=[dict(id=f'LOOT_Deposito_{i+1}',kind='deposito',x=x,z=z) for i,(x,z) in enumerate([(-17.5,-18.5),(17.5,18.5)])]
loot += [dict(id=f'LOOT_Aluminio_{i+1}',kind='aluminio',x=x,z=z) for i,(x,z) in enumerate([(-17.5,18.5),(17.5,-18.5),(-13,-16),(13,16),(48,-51),(48,51)])]
patrols=[ [dict(x=x,z=z) for x,z in pts] for pts in [ [(-17.5,-51),(17.5,-51),(17.5,-18.5),(-17.5,-18.5)], [(-17.5,21),(-17.5,51),(17.5,51),(17.5,21)], [(-48,-18.5),(-17.5,-18.5),(-17.5,18.5),(-48,18.5)], [(17.5,-18.5),(48,-18.5),(48,18.5),(17.5,18.5)] ]]
spawns=[]
for ri,route in enumerate(patrols):
 lengths=[math.hypot(route[(i+1)%4]['x']-p['x'],route[(i+1)%4]['z']-p['z']) for i,p in enumerate(route)]
 for k in range(8):
  dist=(k+.2)*sum(lengths)/8;edge=0
  while dist>lengths[edge] and edge<3:dist-=lengths[edge];edge+=1
  a,b=route[edge],route[(edge+1)%4];t=dist/lengths[edge]
  spawns.append(dict(id=f'SPAWN_Robo_{ri}_{k}',x=a['x']+(b['x']-a['x'])*t,z=a['z']+(b['z']-a['z'])*t,routeIndex=ri,waypoint=(edge+1)%4))
routes=[ [dict(x=x,z=z) for x,z in pts] for pts in [[(0,9.5),(-8,9.5),(-17.5,9.5),(-17.5,-18.5),(-17.5,-51)],[(0,9.5),(8,9.5),(17.5,9.5),(17.5,18.5),(48,18.5)],[(0,9.5),(-8,9.5),(-8,18.5),(-17.5,18.5),(-17.5,51)]]]
data=dict(version='s6.3-fase01-v001',bounds=bounds,ship=dict(x=0,y=0,z=13),exit=dict(x=0,y=0,z=9.5),landingReservation=dict(minX=-5,maxX=5,minZ=6,maxZ=19),walkableAreas=[bounds],obstacles=obstacles,buildings=buildings,parts=parts,loot=loot,patrolRoutes=patrols,spawns=spawns,routes=routes,viewpoints=[dict(id='chegada',x=0,z=9.5),dict(id='avenida-norte',x=-17.5,z=-18.5),dict(id='rota-leste',x=35,z=18.5),dict(id='rota-sul',x=-17.5,z=40)])
(OUT/'export/layout.json').write_text(json.dumps(data,indent=2))
# JSON holds rectangles/metadata only in runtime; art geometry lives in GLB.
runtime={k:v for k,v in data.items() if k not in ['parts']}
(ROOT/'src/assets/shanghai-fase01/layout.json').write_text(json.dumps(runtime,indent=2))
print(len(parts),'peças;',len(buildings),'prédios;',len(obstacles),'obstáculos;',len(spawns),'spawns')
