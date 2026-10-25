"""Estufa modular v001 — Blender 5.1, coordenadas do jogo, OFFLINE inicial.
Blender -b --factory-startup --python art-source/greenhouse-v001/scripts/build.py
"""
import bpy, bmesh, math, json, random, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'art-source/greenhouse-v001'
ASSET=ROOT/'src/assets/greenhouse'
for p in [OUT/'blend',OUT/'notas',ASSET]:p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system='METRIC'
CX,CZ=14,22.5
rng=random.Random(7231)
groups={};definitions={};clearances=[];switch=[]

def material(name,color,metal=.0,rough=.6,alpha=1,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
 rgb=[((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in rgb]
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*rgb,alpha)
 n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;n.inputs['Alpha'].default_value=alpha
 n.inputs['Emission Color'].default_value=(*rgb,1);n.inputs['Emission Strength'].default_value=emission
 if alpha<1:m.surface_render_method='DITHERED'
 return m
cream=material('MAT_GH_Frame','#C7BFA9',.3,.48)
base=material('MAT_GH_Base','#B8B0A4',.4,.62);base_dark=material('MAT_GH_BaseShadow','#8C857B',.4,.65)
dark=material('MAT_GH_Joints','#293438',.55,.5);black=material('MAT_GH_Cable','#20272B',.05,.7)
orange=material('MAT_GH_Clamps','#D97A5E',.25,.5);yellow=material('MAT_GH_Hazard','#E4B94C',.1,.6)
glass=material('MAT_GH_GlassTeal','#5F9EA0',.05,.08,.35)
glass_light=material('MAT_GH_GlassTealLight','#76B5B8',.05,.08,.35)
tray=material('MAT_GH_Planter','#6E7D85',.5,.48);pipe=material('MAT_GH_WaterPipe','#4FA3D1',.25,.35)
soil=material('MAT_GH_Substrate','#3E352F',.0,.92)
leaf1=material('MAT_GH_LeafGreen','#4C9E45',.0,.72);leaf2=material('MAT_GH_LeafLight','#74C358',.0,.7)
water=material('MAT_GH_Water','#6EC6F0',.05,.12,.64)
ice=material('MAT_GH_Ice','#B7EBF9',.0,.16,.8)
grow=material('MAT_GH_GrowDiffuse','#3A3F45',.0,.3)
status=material('MAT_GH_Status','#2B383A',.0,.3)
for name,off,on,strength in [('MAT_GH_GrowDiffuse','#3A3F45','#FF66C4',3.2),('MAT_GH_Status','#2B383A','#00F5FF',2.8)]:
 switch.append(dict(name=name,offline=dict(color=off,emissive='#000000',emissiveIntensity=0),online=dict(color=on,emissive=on,emissiveIntensity=strength)))

def definition(id,role='detail',supports=(),online=False):
 if id not in groups:
  groups[id]=[];definitions[id]=dict(id=id,papel=role,ambiente='greenhouse',apoiado_em=list(supports),apoiado_em_todos=[],estado_inicial='oculto' if online else 'visivel',estado_operacao='online' if online else 'both')
 return id

def point(u,v,h):return Vector((CX+u,-CZ-v,h))
def add(o,g,mat):
 groups[g].append(o);o.data.materials.append(mat);return o

def box(g,u,v,h,w,d,t,mat=cream,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(u,v,h));o=bpy.context.object;o.dimensions=(w,d,t)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Chanfro','BEVEL');b.width=min(bevel,w/5,d/5,t/5);b.segments=2
  o.modifiers.new('Normais','WEIGHTED_NORMAL')
 return add(o,g,mat)

def beam(g,a,b,width,mat=cream,depth=None):
 a,b=point(*a),point(*b);delta=b-a
 bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.dimensions=(width,depth or width,delta.length)
 o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Chanfro','BEVEL');mod.width=min(width*.15,.025);mod.segments=2
 o.modifiers.new('Normais','WEIGHTED_NORMAL');return add(o,g,mat)

def cylinder(g,a,b,r,mat=dark,n=12):
 a,b=point(*a),point(*b);delta=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=delta.length,location=(a+b)/2);o=bpy.context.object
 o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return add(o,g,mat)

def tube(g,coords,r,mat=black):
 c=bpy.data.curves.new('Tubo','CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(coords)-1)
 for bp,p in zip(sp.bezier_points,coords):bp.co=point(*p);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new('Tubo',c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return add(o,g,mat)

def prism(g,coords,thickness,mat):
 vv=[point(*p) for p in coords];normal=(vv[1]-vv[0]).cross(vv[2]-vv[0]).normalized();n=len(vv)
 verts=[p+normal*s*thickness/2 for s in [-1,1] for p in vv]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new('Painel');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Painel',me);bpy.context.collection.objects.link(o);return add(o,g,mat)

north=definition('ARQ_Estufa_Parede_N','wall');south=definition('ARQ_Estufa_Parede_S','wall')
east=definition('ARQ_Estufa_Parede_L','wall');west1=definition('ARQ_Estufa_Parede_O_1','wall');west2=definition('ARQ_Estufa_Parede_O_2','wall')
portal=definition('ARQ_Estufa_Portal_Entrada','wall',[west1,west2])
roof=definition('TET_Estufa','roof')
grow_group=definition('TET_Estufa_GrowLights','detail',[roof])
planters=definition('PROP_Estufa_Canteiros','furniture')
upper=definition('PROP_Estufa_Canteiros_Suspensos','furniture',[north,south])
plants=definition('PROP_Estufa_Plantas_Online','detail',[planters,upper],True)
status_group=definition('PROP_Estufa_Status','detail',[portal])
tank=definition('PROP_Estufa_Tanque_Bomba','prop')
frozen=definition('PROP_Estufa_Tanque_Gelo_Online','detail',[tank],True)

# Foundation, five ribs and independently removable upper roof arches.
ribs=[-5.38,-2.69,0,2.69,5.38]
profile=[(-3.38,2.52),(-1.95,3.92),(0,3.92),(1.95,3.92),(3.38,2.52)]
for sign,g in [(-1,north),(1,south)]:
 box(g,0,sign*3.38,.43,10.76,.28,.55,base,.07)
 box(g,0,sign*3.37,.075,9.9,.40,.13,base_dark,.04)
 for u in ribs:
  beam(g,(u,sign*3.38,.72),(u,sign*3.38,2.50),.20,cream,.20)
  for h in [1.05,2.18]:
   box(g,u,sign*3.50,h,.29,.05,.20,base_dark,.02)
   for du in [-.09,.09]:cylinder(g,(u+du,sign*3.532,h),(u+du,sign*3.55,h),.026,dark,8)
 for u in [-5.40,5.40]:box(g,u,sign*3.40,.38,.46,.46,.76,base,.09)
 # Midrail has explicit separation from adjacent glass panes.
 box(g,0,sign*3.38,1.50,10.50,.10,.10,cream,.018)
 for i in range(4):
  u=(ribs[i]+ribs[i+1])/2
  box(g,u,sign*3.55,.37,.84,.035,.25,dark,.014)
  for j in range(5):box(g,u-.32+j*.16,sign*3.577,.37,.07,.018,.18,base_dark,.008)
  for level,(low,high) in enumerate([(.78,1.43),(1.57,2.38)]):
   pg=definition(f'ARQ_Estufa_Vidro_{"N" if sign<0 else "S"}_{i}_{level}','detail',[g])
   box(pg,u,sign*3.38,(low+high)/2,ribs[i+1]-ribs[i]-.30,.024,high-low,glass,0)
   clearances.append(dict(panelId=pg,otherIds=[g],minimum=.002))
for u in ribs:
 for (v1,h1),(v2,h2) in zip(profile,profile[1:]):
  a=Vector((v1,h1));b=Vector((v2,h2));direction=(b-a).normalized();a+=direction*.072;b-=direction*.072
  beam(roof,(u,a.x,a.y),(u,b.x,b.y),.20,cream,.20)
for v,h in profile:box(roof,0,v,h,10.51,.12,.12,cream,.018)
# Roof glazing: four longitudinal bays, two slopes and split flat truncated crown.
for i in range(4):
 u0,u1=ribs[i]+.15,ribs[i+1]-.15
 for j,(v0,h0,v1,h1) in enumerate([(-3.23,2.667,-2.10,3.773),(-1.80,3.92,-.10,3.92),(.10,3.92,1.80,3.92),(2.10,3.773,3.23,2.667)]):
  g=definition(f'ARQ_Estufa_Vidro_Teto_{i}_{j}','detail',[roof])
  prism(g,[(u0,v0,h0),(u1,v0,h0),(u1,v1,h1),(u0,v1,h1)],.022,glass_light)
  clearances.append(dict(panelId=g,otherIds=[roof],minimum=.002))
# Rear and front facades; central west door stays on the longitudinal aisle.
box(east,5.38,0,.38,.28,6.76,.664,base,.06)
for sign,g in [(-1,west1),(1,west2)]:
 box(g,-5.38,sign*2.28,.38,.28,2.20,.664,base,.06)
 box(g,-5.38,sign*2.28,2.43,.20,1.98,.14,cream)
 box(g,-5.38,sign*1.16,1.52,.22,.15,1.60,cream)
 for j,v in enumerate([sign*2.28]):
  pg=definition(f'ARQ_Estufa_Vidro_Fachada_{sign}','detail',[g])
  box(pg,-5.38,v,1.55,.024,1.93,1.52,glass_light,0)
 # Hazard dashes sit ahead of the base, separated by 6mm.
 for k in range(6):
  o=box(g,-5.535,sign*2.28+(k-2.5)*.24,.59,.018,.11,.12,yellow,0);o.rotation_euler.x=.35
for v in [-2.25,0,2.25]:
 pg=definition('ARQ_Estufa_Vidro_Fundo_'+str(v),'detail',[east])
 box(pg,5.38,v,1.56,.024,2.04,1.50,glass,0)
for v in [-1.13,1.13]:box(east,5.38,v,1.55,.20,.12,1.70,cream)
box(east,5.38,0,2.43,.20,6.58,.14,cream)
# Gable glazing behind façade supports, clear of the roof arches.
for end,g in [(-1,portal),(1,east)]:
 pg=definition('ARQ_Estufa_Vidro_Empena_'+str(end),'detail',[g])
 prism(pg,[(end*5.38,-3.05,2.67),(end*5.38,-1.78,3.75),(end*5.38,1.78,3.75),(end*5.38,3.05,2.67)],.024,glass)
for v in [-1.15,1.15]:box(portal,-5.55,v,1.2,.24,.16,2.38,cream,.05)
box(portal,-5.55,0,2.43,.24,2.46,.24,cream,.06)
# Two recessed leaves, with rounded visor and handle; no visual mesh collider.
for sign,suffix in [(-1,'L'),(1,'R')]:
 g=definition('D_Estufa_Entrada_'+suffix,'door',[portal])
 box(g,-5.52,sign*.55,1.15,.10,1.085,2.28,base,.07)
 box(g,-5.582,sign*.55,1.82,.018,.77,.49,dark,.08)
 box(g,-5.596,sign*.55,1.82,.008,.65,.37,glass_light,.07)
 box(g,-5.594,sign*.22,.97,.035,.10,.25,dark,.025)
 definitions[g]['slide_x']=0;definitions[g]['slide_z']=sign*1.14
box(portal,-5.57,0,2.94,.27,1.0,.50,base,.065)
box(status_group,-5.719,0,2.60,.02,.92,.10,status,.018)
box(status_group,-5.718,.22,2.97,.018,.30,.13,status,.01)
for v in [-.48,.48]:tube(portal,[(-5.74,v,3.03),(-5.75,v*1.6,2.93),(-5.75,v*1.6,2.68)],.035,black)
# Black exposed conduit and orange clamps, split so roof pieces cut with the roof.
for u in ribs:
 for sign,g in [(-1,north),(1,south)]:
  tube(g,[(u+.06,sign*3.57,.78),(u+.06,sign*3.57,1.65),(u+.06,sign*3.57,2.40)],.027,black)
  for h in [1.10,2.0]:box(g,u+.06,sign*3.57,h,.13,.10,.06,orange,.01)
 tube(roof,[(u+.04,-3.51,2.65),(u+.04,-1.98,4.06),(u+.04,0,4.07),(u+.04,1.98,4.06),(u+.04,3.51,2.65)],.025,black)
# Parallel curved pipes exit the left/north foundation and reach the soil.
for u in [-4.3,-3.86]:
 tube(north,[(u,-3.50,.49),(u,-3.64,.46),(u,-3.67,.28),(u,-3.67,.07)],.065,base_dark)
 cylinder(north,(u,-3.526,.49),(u,-3.566,.49),.105,dark,12)

# Two planter rows: eight lower tubs, four upper trays supported by the side frame.
bay_centres=[(ribs[i]+ribs[i+1])/2 for i in range(4)]
plant_sites=[]
for bay,u in enumerate(bay_centres):
 for sign in [-1,1]:
  v=sign*2.20;g=planters;h=.76
  box(g,u,v,h,2.24,1.20,.42,tray,.07)
  box(g,u,v,h+.225,2.10,1.06,.06,soil,.02)
  for du in [-.85,.85]:box(g,u+du,v,.33,.18,.82,.42,dark,.025)
  for dv in [-.60,.60]:box(g,u,v+dv,h+.25,2.27,.055,.07,base_dark,.015)
  # Water rail with elbow, valve, gauge and telemetry on the aisle side.
  inside=v-sign*.67
  tube(g,[(u-.90,inside,.55),(u-.90,inside,.98),(u+.90,inside,.98),(u+.98,inside,.80)],.037,pipe)
  cylinder(g,(u-.7,inside,.94),(u-.7,inside,1.07),.075,orange,12)
  cylinder(g,(u+.68,inside,.99),(u+.68,inside-sign*.055,.99),.09,dark,16)
  cylinder(g,(u+.68,inside-sign*.06,.99),(u+.68,inside-sign*.07,.99),.071,base,16)
  beam(g,(u+.68,inside-sign*.077,.99),(u+.71,inside-sign*.077,1.03),.008,dark)
  box(status_group,u,inside-sign*.015,.74,.28,.025,.12,status,.01)
  plant_sites.append((u,v,h+.28,2.0,.91))
 # Four upper trays total, alternating left/right bay, on cantilever brackets.
 sign=-1 if bay%2==0 else 1;v=sign*2.65;h=2.17
 box(upper,u,v,h,2.05,.86,.28,tray,.06);box(upper,u,v,h+.155,1.91,.72,.05,soil,.01)
 for du in [-.76,.76]:
  beam(upper,(u+du,sign*3.22,1.75),(u+du,v,2.0),.065,dark)
  beam(upper,(u+du,sign*3.22,2.0),(u+du,v,2.0),.075,dark)
 plant_sites.append((u,v,h+.19,1.8,.62))
 # Eight grow bars, two per bay, each with two diffuser panels.
 for v in [-1.55,1.55]:
  box(grow_group,u,v,3.32,2.0,.34,.17,tray,.04)
  for du in [-.48,.48]:box(grow_group,u+du,v,3.218,.87,.27,.025,grow,.008)
  for du in [-.75,.75]:cylinder(grow_group,(u+du,v,3.42),(u+du,v,3.81),.018,dark,8)
# Dense low-poly leaves with raised central ridge; deterministic placement.
for u,v,h,w,d in plant_sites:
 for ix in range(5):
  for iz in range(2):
   cx=u-w*.4+ix*w*.2+rng.uniform(-.035,.035);cv=v+(iz-.5)*d*.58;hh=h+rng.uniform(0,.035)
   cylinder(plants,(cx,cv,hh),(cx,cv,hh+.20),.015,leaf1,6)
   for k in range(6):
    a=k*math.tau/6+rng.uniform(-.15,.15);size=rng.uniform(.17,.25);dx,dv=math.cos(a),math.sin(a)
    coords=[(cx,cv,hh+.10),(cx+dx*size*.55-dv*.075,cv+dv*size*.55+dx*.075,hh+.25),(cx+dx*size,cv+dv*size,hh+.17),(cx+dx*size*.55+dv*.075,cv+dv*size*.55-dx*.075,hh+.25),(cx+dx*size*.52,cv+dv*size*.52,hh+.29)]
    me=bpy.data.meshes.new('Folha');me.from_pydata([point(*p) for p in coords],[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
    o=bpy.data.objects.new('Folha',me);bpy.context.collection.objects.link(o);add(o,plants,leaf1 if k%2 else leaf2)
 # Irrigation visible only ONLINE, beneath supply rail nozzles.
 for du in [-.75,.75]:cylinder(plants,(u+du,v,h+.30),(u+du,v,h+.06),.011,water,6)

# Permanent dry/inactive tank, frost/ice/condensation are separate ONLINE geometry.
tu,tv,th=2.0,4.72,1.03
cylinder(tank,(tu-1.35,tv,th),(tu+1.35,tv,th),.66,base_dark,24)
for du in [-1.35,1.35]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=point(tu+du,tv,th));o=bpy.context.object;o.scale=(.24,.66,.66);add(o,tank,base)
for du in [-.85,.85]:
 # Separate saddle feet and collars, with positive offset from the shell surface.
 box(tank,tu+du,tv,.24,.32,1.38,.38,base_dark,.07)
 cylinder(tank,(tu+du-.055,tv,th),(tu+du+.055,tv,th),.69,dark,24)
box(tank,tu+.45,tv+.68,th,.84,.18,.55,tray,.06)
for i in range(6):box(tank,tu+.45+(i-2.5)*.12,tv+.785,th,.05,.025,.39,dark,.005)
tube(tank,[(tu-1.60,tv,th),(tu-1.83,tv,th),(tu-1.97,4.0,th+.18),(tu-1.97,3.54,th+.18)],.14,base_dark)
for v in [3.60,4.0]:
 cylinder(tank,(tu-1.97,v-.045,th+.18),(tu-1.97,v+.045,th+.18),.22,dark,16)
 for a in range(6):
  cylinder(tank,(tu-1.97+.18*math.cos(a*math.tau/6),v+.05,th+.18+.18*math.sin(a*math.tau/6)),(tu-1.97+.18*math.cos(a*math.tau/6),v+.075,th+.18+.18*math.sin(a*math.tau/6)),.025,base,6)
cylinder(tank,(tu+.80,tv,1.68),(tu+.80,tv,1.88),.08,dark,12)
cylinder(tank,(tu+.80,tv-.03,1.91),(tu+.80,tv+.04,1.91),.16,base,20)
box(status_group,tu+.45,tv+.79,th+.08,.38,.02,.08,status,.008)
ice_sites=[]
for i in range(28):
 while True:
  u=tu+rng.uniform(-1.7,1.7);v=tv+rng.uniform(-.83,.83);r=rng.uniform(.035,.11)
  if all(math.hypot(u-x,v-z)>r+radius+.012 for x,z,radius in ice_sites):break
 ice_sites.append((u,v,r))
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=r,radius2=.012,depth=r*2.7,location=point(u,v,.02+r*1.35));add(bpy.context.object,frozen,ice)
poly=[(tu+math.cos(a*math.tau/20)*(1.95+rng.uniform(-.15,.15)),tv+math.sin(a*math.tau/20)*(.95+rng.uniform(-.10,.1)),.013) for a in range(20)]
prism(frozen,poly,.004,water)

# Every façade/roof glass is audited against every structural frame, including corners.
clearances=[dict(panelId=id,otherIds=[north,south,east,west1,west2,portal,roof],minimum=.002) for id in groups if id.startswith('ARQ_Estufa_Vidro_')]

# Join by semantic part; material slots remain addressable for state switches.
parts=[]
for id,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  o.select_set(False)
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=id
 # Apply transforms so GLTF coordinates, door tracks and bounds share world/game axes.
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 d=definitions[id]
 for k in ['papel','ambiente','estado_inicial','estado_operacao']:o[k]=d[k]
 o['id_estavel']=id;o['colony_name']=id
 for k in ['apoiado_em','apoiado_em_todos']:o[k]=','.join(d[k])
 for k in ['slide_x','slide_z']:
  if k in d:o[k]=d[k]
 o.hide_render=d['estado_inicial']=='oculto';o.hide_set(False)
 parts.append(o)
bpy.context.view_layer.update()
for o in parts:
 b=[o.matrix_world@Vector(p) for p in o.bound_box];definitions[o.name]['bounds']=dict(minX=min(p.x for p in b),maxX=max(p.x for p in b),minY=min(p.z for p in b),maxY=max(p.z for p in b),minZ=min(-p.y for p in b),maxZ=max(-p.y for p in b))
# Physics intentionally contains only outer shell, two planter rows and one tank.
colliders=[]
def col(id,u0,u1,v0,v1):colliders.append(dict(id=id,minX=CX+u0,maxX=CX+u1,minZ=CZ+v0,maxZ=CZ+v1))
col('greenhouse-wall-n',-5.66,5.66,-3.75,-3.20);col('greenhouse-wall-s',-5.66,5.66,3.20,3.68)
col('greenhouse-wall-e',5.20,5.66,-3.68,3.68)
col('greenhouse-wall-w1',-5.70,-5.20,-3.68,-1.10);col('greenhouse-wall-w2',-5.70,-5.20,1.10,3.68)
col('greenhouse-planters-n',-5.0,5.0,-3.14,-1.43);col('greenhouse-planters-s',-5.0,5.0,1.43,3.14)
col('greenhouse-tank',-.25,3.65,3.68,5.47)
manifest=dict(version='greenhouse-v001',initialState='OFFLINE',position=dict(x=CX,z=CZ),size=dict(width=11,depth=7),entrance='west',
 parts=list(definitions.values()),doors=[dict(id='D_Estufa_Entrada',x=8.48,z=CZ,axis='z',width=2.2,owner='greenhouse')],
 walkableAreas=[dict(id='greenhouse',minX=8.5,maxX=19.5,minZ=19,maxZ=26)],colliders=colliders,clearances=clearances,switchMaterials=switch,
 growLights=[dict(x=CX+u,y=2.78,z=CZ,intensity=5,distance=5,color='#FF66C4') for u in bay_centres],
 stats=dict(ribs=5,bays=4,lowerPlanters=8,upperPlanters=4,growBars=8,parts=len(parts)),
 sourceReference='/Users/rochatales/Game Development/Horda Survivor/Predios/Greenhouse_concept01.jpg')
manifest['stats']['triangles']=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parts)
(ASSET/'greenhouse-v001.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ASSET/'greenhouse-v001.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_apply=True,export_lights=False,export_cameras=False,export_animations=False)
for o in parts:
 hidden=o['estado_inicial']=='oculto';o.hide_render=hidden;o.hide_set(hidden)
# Authoring state switches are embedded in the .blend, matching the exported manifest.
state_script='''import bpy\nONLINE = False # mude para True para a vista ONLINE\nfor o in bpy.context.scene.objects:\n    if o.get('estado_operacao') == 'online':\n        o.hide_render = not ONLINE\n        o.hide_set(not ONLINE)\n'''
state_script+='\nSTATES = '+repr(switch)+'\n'
state_script+='''for s in STATES:\n    m=bpy.data.materials.get(s['name'])\n    d=s['online' if ONLINE else 'offline']\n    p=m.node_tree.nodes.get('Principled BSDF')\n    def rgb(h):\n        c=[int(h[i:i+2],16)/255 for i in (1,3,5)]\n        return [((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in c]\n    p.inputs['Base Color'].default_value=(*rgb(d['color']),1)\n    p.inputs['Emission Color'].default_value=(*rgb(d['emissive']),1)\n    p.inputs['Emission Strength'].default_value=d['emissiveIntensity']\n'''
bpy.data.texts.new('alternar_estado.py').write(state_script)
bpy.ops.object.camera_add(location=point(-16,15,14));cam=bpy.context.object;cam.rotation_euler=(point(0,0,1.7)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=18;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='SUN',location=point(0,0,10));bpy.context.object.data.energy=2
bpy.context.scene.world=bpy.data.worlds.new('Estudio');bpy.context.scene.world.color=(.15,.15,.15)
# Hidden simple collider authoring collection (never exported).
c=bpy.data.collections.new('COL_CANDIDATO_Estufa');bpy.context.scene.collection.children.link(c)
for b in colliders:
 bpy.ops.mesh.primitive_cube_add(size=1,location=((b['minX']+b['maxX'])/2,-(b['minZ']+b['maxZ'])/2,1.5));o=bpy.context.object;o.name='COL_'+b['id'];o.dimensions=(b['maxX']-b['minX'],b['maxZ']-b['minZ'],3)
 for old in list(o.users_collection):old.objects.unlink(o)
 c.objects.link(o);o.display_type='WIRE';o.hide_render=True;o.hide_set(True)
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_location=point(0,0,1.8)
   area.spaces.active.region_3d.view_distance=18
   area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
   area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/greenhouse_v001.blend'))
(OUT/'notas/exportacao.json').write_text(json.dumps(dict(stats=manifest['stats'],glbBytes=(ASSET/'greenhouse-v001.glb').stat().st_size,glbSHA256=hashlib.sha256((ASSET/'greenhouse-v001.glb').read_bytes()).hexdigest()),indent=2))
print('GREENHOUSE_OK',manifest['stats'])
