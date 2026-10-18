"""Raios reais na malha exportável, câmera ortográfica do jogo. Sem ocultação runtime."""
import bpy,json,math,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
ART=Path(__file__).resolve().parents[1];d=json.loads((ART/'export/layout.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(ART/'blend/shanghai_fase01_v001.blend'))
objects=list(bpy.data.collections['02_EXPORT_SETORES'].objects)
verts=[];faces=[]
for o in objects:
 off=len(verts);verts += [tuple(o.matrix_world@v.co) for v in o.data.vertices];o.data.calc_loop_triangles();faces += [tuple(off+i for i in f.vertices) for f in o.data.loop_triangles]
bvh=BVHTree.FromPolygons(verts,faces,all_triangles=True)
# Alternative structural height cap, for decision only. Not applied/exported.
short=BVHTree.FromPolygons([(x,y,min(z,6.6)) for x,y,z in verts],faces,all_triangles=True)
points=[]
for ri,route in enumerate(d['routes']):
 for i in range(len(route)-1):
  a,b=route[i:i+2];n=math.ceil(math.hypot(a['x']-b['x'],a['z']-b['z'])/2)
  for k in range(n):points.append(dict(id=f'rota{ri}_{i}_{k}',kind='rota',x=a['x']+(b['x']-a['x'])*k/n,z=a['z']+(b['z']-a['z'])*k/n))
 points.append(dict(id=f'rota{ri}_fim',kind='rota',**route[-1]))
points += [dict(kind='chegada',id='desembarque',**d['exit'])]+[dict(p,kind='loot') for p in d['loot']]+[dict(p,kind='spawn') for p in d['spawns']]
H,V=18.38,13;length=math.hypot(H,V);ratios=[];perpoint=[];start=time.perf_counter()
for pi,p in enumerate(points):
 counts={'player':0,'enemy':0,'loot':0,'cap6_6':0};playerangles=[]
 for deg in range(360):
  a=math.radians(deg);direction=Vector((math.cos(a)*H/length,-math.sin(a)*H/length,V/length))
  def blocked(height,tree=bvh):
   origin=Vector((p['x'],-p['z'],height));camera=Vector((p['x']+math.cos(a)*H*3,-p['z']-math.sin(a)*H*3,.55+V*3))
   distance=(camera-origin).dot(direction)-.1
   return tree.ray_cast(origin,direction,distance)[0] is not None
  hits=sum(blocked(h) for h in [.3,.9,1.25]);counts['player']+=hits;playerangles.append(hits)
  counts['enemy']+=sum(blocked(h) for h in [.35,.95,1.5]);counts['loot']+=blocked(.35)
  counts['cap6_6']+=sum(blocked(h,short) for h in [.3,.9,1.25])
 perpoint.append(dict(id=p['id'],kind=p['kind'],x=p['x'],z=p['z'],playerHiddenPct=counts['player']/1080*100,enemyHiddenPct=counts['enemy']/1080*100,lootHiddenPct=counts['loot']/360*100,heightCap6_6HiddenPct=counts['cap6_6']/1080*100,playerHitsByAngle=playerangles))
summary={}
for kind in ['chegada','rota','loot','spawn']:
 items=[p for p in perpoint if p['kind']==kind]
 summary[kind]={key:round(sum(p[key] for p in items)/len(items),2) for key in ['playerHiddenPct','enemyHiddenPct','lootHiddenPct','heightCap6_6HiddenPct']}
 summary[kind]['points']=len(items);summary[kind]['maxPlayerHiddenPct']=round(max(p['playerHiddenPct'] for p in items),2)
report=dict(method='BVH da geometria visual exportável; dupla face; 360 orientações de 1°; rotas amostradas a cada <=2m; raios paralelos até plano da câmera; sem nave/personagens; sem oclusão de corpos por outros corpos; coletáveis/enemies como sondas, sem loot implementado',camera=dict(horizontal=H,vertical=V,distanceScale=3,near=.1,viewport=[1280,800],zoom=800/26*1.6),heights=dict(player=[.3,.9,1.25],enemy=[.35,.95,1.5],loot=[.35]),summary=summary,points=perpoint,seconds=time.perf_counter()-start)
(ART/'notas/occlusion.json').write_text(json.dumps(report,indent=2))
# Orthographic frustum XY does not change when pulling the camera backward.
# Count triangles whose projected bounds overlap the viewport and which straddle near.
v=np.array(verts);tri=np.array(faces,dtype=np.int32);near=[];halfW,halfH=13,8.125
def clip(poly,axis,edge,sign):
 out=[]
 for i,b in enumerate(poly):
  a=poly[i-1];va=(a[axis]-edge)*sign;vb=(b[axis]-edge)*sign
  if (va>=0)!=(vb>=0):
   t=va/(va-vb);out.append(a+(b-a)*t)
  if vb>=0:out.append(b)
 return out
for p in d['viewpoints']:
 for deg in range(360):
  a=math.radians(deg);direction=np.array([math.cos(a)*H/length,-math.sin(a)*H/length,V/length]);right=np.array([math.sin(a),math.cos(a),0]);up=np.cross(right,direction);up=-up if up[2]<0 else up
  rel=v-np.array([p['x'],-p['z'],.55]);xx=rel@right;yy=rel@up;depth=rel@direction
  tx=xx[tri];ty=yy[tri];td=depth[tri]
  onscreen=(tx.min(1)<=halfW)&(tx.max(1)>=-halfW)&(ty.min(1)<=halfH)&(ty.max(1)>=-halfH)
  row=dict(position=p['id'],angle=deg)
  for scale in [1,3]:
   plane=length*scale-.1
   cross=behind=0
   for idx in np.flatnonzero(onscreen&(td.max(1)>plane)):
    poly=[np.array([tx[idx,k],ty[idx,k],td[idx,k]]) for k in range(3)]
    for axis,edge,sign in [(0,-halfW,1),(0,halfW,-1),(1,-halfH,1),(1,halfH,-1)]:
     if poly:poly=clip(poly,axis,edge,sign)
    if not poly:continue
    depths=[v[2] for v in poly]
    cross+=min(depths)<plane<max(depths);behind+=min(depths)>=plane
   row['crossingNear_x'+str(scale)]=int(cross)
   row['fullyBehind_x'+str(scale)]=int(behind)
  near.append(row)
(ART/'notas/near-plane.json').write_text(json.dumps(dict(method='triângulos recortados exatamente no retângulo XY do viewport antes de testar depth/near; contagem de faces, não pixels; câmera 1280x800 zoom inicial; mesma malha antes/depois',summary={key:max(r[key] for r in near) for key in ['crossingNear_x1','fullyBehind_x1','crossingNear_x3','fullyBehind_x3']},cases=near),indent=2))
print(json.dumps(summary,indent=2));print('near', {key:max(r[key] for r in near) for key in ['crossingNear_x1','fullyBehind_x1','crossingNear_x3','fullyBehind_x3']})
