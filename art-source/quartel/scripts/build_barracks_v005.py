"""v005: +3 m para leste, pé-direito +20%, portas 1,80 m, móveis +10%.
Lê v004, nunca grava variantes anteriores. Raiz 1×; implantação (12; 0), Y=-90°.
"""
import bpy,bmesh,sys,math,json,hashlib,inspect
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;OUT=HERE.parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(OUT.parent/'armario-emergencia/scripts'))
import build_barracks as src
from build_emergency_locker import new_empty
source=OUT/'blend/barracks-v004.blend';source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.name='Quartel_v005';scene.frame_set(1);bpy.context.view_layer.update()
root=scene.objects['Barracks'];atlas=scene.objects['Building_Roof'].data.materials[0]
FLOOR=.2625;HX=4.5;HY=5.25;R=.975;THICK=.1875;TOP=FLOOR+(2.4-FLOOR)*1.2;DOOR=1.8
Z=lambda z:z if z<=FLOOR else FLOOR+(z-FLOOR)*1.2
Y=lambda y:y+(1.5 if y>1e-7 else -1.5 if y<-1e-7 else 0)
# As caixas são reconstruídas das dimensões atuais; removê-las só na cópia v005.
for obj in list(scene.objects):
 if obj.name.startswith('COL_'):bpy.data.objects.remove(obj,do_unlink=True)
# Casco e teto: estende apenas os trechos retos, sem deformar o raio dos cantos.
for name in ['Building_Shell','Building_Roof']:
 obj=scene.objects[name];bm=bmesh.new();bm.from_mesh(obj.data);remaining=set(bm.verts)
 while remaining:
  seed=remaining.pop();part={seed};stack=[seed]
  while stack:
   v=stack.pop()
   for edge in v.link_edges:
    other=edge.other_vert(v)
    if other in remaining:remaining.remove(other);part.add(other);stack.append(other)
  lo=[min(v.co[i] for v in part) for i in range(3)];hi=[max(v.co[i] for v in part) for i in range(3)]
  shift=Y((lo[1]+hi[1])/2)-(lo[1]+hi[1])/2
  # Duas janelas da fachada oeste afastadas do bolsão das novas folhas.
  window=name=='Building_Shell' and lo[1]<-3.4 and hi[1]<-3.2 and lo[2]>1.20 and 1.17<abs((lo[0]+hi[0])/2)<2.74 and hi[0]-lo[0]<1.6
  for v in part:
   v.co.y=Y(v.co.y) if hi[1]-lo[1]>5 else v.co.y+shift
   if window:v.co.x+=math.copysign(.3,(lo[0]+hi[0])/2)
   v.co.z=Z(v.co.z)
 bm.to_mesh(obj.data);bm.free();obj.data.update()
# Paredes preservam aberturas de janela; os dois vãos são remapeados individualmente.
for name in ['Wall_S','Wall_N','Wall_E','Wall_W','Wall_Corners']:
 obj=scene.objects[name]
 for v in obj.data.vertices:
  x,y,z=v.co
  if name=='Wall_S':
   if abs(abs(x)-.7)<1e-5:x=math.copysign(.9,x)
   elif abs(abs(x)-1.3125)<1e-5 or abs(abs(x)-2.5875)<1e-5:x+=math.copysign(.3,x)
  y=Y(y)
  if name=='Wall_W' and abs(abs(v.co.y)-.7)<1e-5:y=-1.5+math.copysign(.9,v.co.y)
  v.co=(x,y,Z(z))
 obj.data.update()
# Portais: a fachada norte conserva o centro mundial X=10,5 apesar do novo centro X=12.
# O eixo tangente é X para S e -Y para W. Altura útil 1,998 m.
ratio=DOOR/1.4
for side in ['S','W']:
 frame=scene.objects['Entrance_'+side+'_Frame']
 for v in frame.data.vertices:
  if side=='S':v.co.x*=ratio;v.co.y-=1.5
  else:v.co.y=v.co.y*ratio-1.5
  v.co.z=Z(v.co.z)
 frame.data.update()
 for label in ['L0','L1','R0','R1']:
  leaf=scene.objects[f'Door_{side}_{label}'];slide=leaf['slide_u']*ratio
  leaf.animation_data_clear();leaf.location=(0,0,0)
  for v in leaf.data.vertices:
   if side=='S':v.co.x*=ratio;v.co.y-=1.5
   else:v.co.y=v.co.y*ratio-1.5
   v.co.z=Z(v.co.z)
  leaf.data.update();leaf['slide_u']=slide
  leaf.keyframe_insert('location',frame=1);leaf.location=(slide,0,0) if side=='S' else (0,-slide,0);leaf.keyframe_insert('location',frame=20)
  action='Door_S_Open' if side=='S' else 'Door_Open';a=leaf.animation_data.action
  track=leaf.animation_data.nla_tracks.new();track.name=action;strip=track.strips.new(action,1,a);strip.name=action;leaf.animation_data.action=None
# As rampas mantêm posição no mapa, corrida e subida; largura 2 m.
for side in ['W','S']:
 ramp=scene.objects['Entrance_'+side+'_Ramp']
 for v in ramp.data.vertices:
  if side=='S':v.co.x*=1.25;v.co.y-=1.5
  else:v.co.y=v.co.y*1.25-1.5
 ramp.data.update()
# Interior gerado novamente da receita, com móveis crescidos como conjuntos inteiros.
bpy.data.objects.remove(scene.objects['Building_Interior'],do_unlink=True)
src.HY=7.;src.IY=6.75;src.WALL_TOP=TOP/.75
mats=src.build_materials();palette=json.loads((OUT/'notas/build-v002.json').read_text())['palette']
records=[]
def mark(b):return set(b.bm.verts)
def grow(b,before,pivot,shift=(0,0,0),name='móvel'):
 pivot=Vector(pivot);shift=Vector(shift);verts=set(b.bm.verts)-before
 size_before=[max(v.co[i] for v in verts)-min(v.co[i] for v in verts) for i in range(3)]
 for v in verts:v.co=pivot+(v.co-pivot)*1.1+shift
 size_after=[max(v.co[i] for v in verts)-min(v.co[i] for v in verts) for i in range(3)]
 records.append({'name':name,'scale':1.1,'vertices':len(verts),'sizeBefore':[s*.75 for s in size_before],'sizeAfter':[s*.75 for s in size_after]})
def bunk(b,x,y):
 before=mark(b);src.bunk(b,x,y);grow(b,before,(x,y,src.FLOOR),name='beliche')
def locker(b,x,y,**kwargs):
 before=mark(b);src.locker(b,x,y,**kwargs);grow(b,before,(x,src.IY,src.FLOOR),name='armário')
recipe=inspect.getsource(src.build_interior).replace('tx, ty = 0.8, -IY + 1.45','tx, ty = 3.3, -IY + 1.45').replace('by = IY - 1.05','by = IY - 1.20').replace('for y in (-2.4, 0, 2.4):','for y in (-4.8, -2.4, 0, 2.4, 4.8):')
recipe=recipe.replace('    # toilet, sink + mirror, shower','    saved=mark(b)\n    # toilet, sink + mirror, shower')
recipe=recipe.replace('    b.box((0.6, 0.42, 0.12)',"    grow(b,saved,(4.2,IY,FLOOR),name='sanitário');saved=mark(b)\n    b.box((0.6, 0.42, 0.12)")
recipe=recipe.replace('    b.box((1.1, 1.05, 0.08)',"    grow(b,saved,(3.0,IY,FLOOR),name='pia e espelho');saved=mark(b)\n    b.box((1.1, 1.05, 0.08)")
recipe=recipe.replace('    b.box((0.9, 0.04, 0.03)',"    grow(b,saved,(IX,py+.62,FLOOR),name='chuveiro')\n    b.box((0.9, 0.04, 0.03)")
recipe=recipe.replace('    # --- west entrance:', '    saved=mark(b)\n    # --- west entrance:')
recipe=recipe.replace('    # --- south communal area:',"    grow(b,saved,(-IX,0,FLOOR),(0,-2,0),name='entrada e nichos');saved=mark(b)\n    # --- south communal area:")
recipe=recipe.replace('    b.box((6.0, 0.04, 0.04)',"    grow(b,saved,(tx,ty,FLOOR),name='mesa e bancos')\n    b.box((6.0, 0.04, 0.04)")
recipe=recipe.replace('    # storage cabinet under the east window','    saved=mark(b)\n    # storage cabinet under the east window').replace('    return b.finish',"    grow(b,saved,(IX,-2,FLOOR),name='armário lateral')\n    return b.finish")
ns=src.__dict__.copy();ns.update(mark=mark,grow=grow,bunk=bunk,locker=locker);exec(compile(recipe,'<v005:interior>','exec'),ns)
interior=ns['build_interior'](mats,root,scene.collection,src.load_font());uv=interior.data.uv_layers.new(name='PaletteUV')
for v in interior.data.vertices:v.co*=.75
for poly in interior.data.polygons:
 cell=palette[interior.data.materials[poly.material_index].name]['cell']
 for i in poly.loop_indices:uv.data[i].uv=((cell%8+.5)/8,1-(cell//8+.5)/8)
 poly.material_index=0
interior.data.materials.clear();interior.data.materials.append(atlas)
# Referências COL exatas: paredes/lintéis, cantos, borda e cada painel animado.
def col(name,center,size,rot=0,parent=root,kind='wall'):
 obj=new_empty(name,center,(0,0,rot),parent=parent,collection=scene.collection);obj.empty_display_type='CUBE';obj.empty_display_size=1;obj.scale=tuple(s/2 for s in size)
 obj['shape']='box';obj['kind']=kind;obj['size_m']=list(size);obj['center_m']=list(center);return obj
for side,origin,rot,length,door_center in [('S',(0,-HY),0,2*(HX-R),0),('N',(0,HY),180,2*(HX-R),None),('W',(-HX,0),270,2*(HY-R),1.5),('E',(HX,0),90,2*(HY-R),None)]:
 a=math.radians(rot);intervals=[(-length/2,length/2)] if door_center is None else [(-length/2,door_center-.9),(door_center+.9,length/2)]
 for i,(u0,u1) in enumerate(intervals):
  u=(u0+u1)/2;col(f'COL_{side}_{i}',(origin[0]+math.cos(a)*u-math.sin(a)*THICK/2,origin[1]+math.sin(a)*u+math.cos(a)*THICK/2,(FLOOR+TOP)/2),(u1-u0,THICK,TOP-FLOOR),rot)
 if door_center is not None:
  u=door_center;bottom=Z(1.95);col(f'COL_{side}_Lintel',(origin[0]+math.cos(a)*u-math.sin(a)*THICK/2,origin[1]+math.sin(a)*u+math.cos(a)*THICK/2,(bottom+TOP)/2),(DOOR,THICK,TOP-bottom),rot)
for j,(cx,cy,a0) in enumerate([(HX-R,-HY+R,-90),(HX-R,HY-R,0),(-HX+R,HY-R,90),(-HX+R,-HY+R,180)]):
 for i in range(5):
  a=math.radians(a0+(i+.5)*18);r=R-THICK/2;col(f'COL_Corner_{j}_{i}',(cx+r*math.cos(a),cy+r*math.sin(a),(FLOOR+TOP)/2),(THICK+.009,2*R*math.sin(math.pi/20)+.009,TOP-FLOOR),math.degrees(a))
PHX,PHY,PR=4.8375,5.5875,1.3125
for side,length,origin,rot,dc in [('S',2*(PHX-PR),(0,-PHY),0,0),('N',2*(PHX-PR),(0,PHY),180,None),('W',2*(PHY-PR),(-PHX,0),270,1.5),('E',2*(PHY-PR),(PHX,0),90,None)]:
 intervals=[(-length/2,length/2)] if dc is None else [(-length/2,dc-1),(dc+1,length/2)]
 for i,(a,b) in enumerate(intervals):
  angle=math.radians(rot);u=(a+b)/2;col(f'COL_Pedestal_{side}_{i}',(origin[0]+math.cos(angle)*u,origin[1]+math.sin(angle)*u,.375),(b-a,.06,.75),rot,kind='pedestal-edge')
for j,(cx,cy,a0) in enumerate([(PHX-PR,-PHY+PR,-90),(PHX-PR,PHY-PR,0),(-PHX+PR,PHY-PR,90),(-PHX+PR,-PHY+PR,180)]):
 for i in range(5):
  a=math.radians(a0+(i+.5)*18);col(f'COL_Pedestal_Corner_{j}_{i}',(cx+PR*math.cos(a),cy+PR*math.sin(a),.375),(.06,2*(PR+.03)*math.tan(math.radians(9))+.015,.75),math.degrees(a),kind='pedestal-edge')
scene.frame_set(1);bpy.context.view_layer.update()
for leaf in [o for o in scene.objects if o.name.startswith('Door_')]:
 side=leaf['door_side'];pts=[v.co for v in leaf.data.vertices];lo=[min(p[i] for p in pts) for i in range(3)];hi=[max(p[i] for p in pts) for i in range(3)];center=[(lo[i]+hi[i])/2 for i in range(3)];size=[hi[i]-lo[i] for i in range(3)]
 if side=='W':size=[size[1],size[0],size[2]]
 c=col('COL_'+leaf.name,center,size,270 if side=='W' else 0,parent=leaf,kind='door');c['door_panel']=leaf.name
c=col('COL_Floor',(0,0,FLOOR-.01875),(8.625,10.125,.0375),kind='floor');c['shape']='rounded_rect_floor';c['corner_radius']=.7875
for side,center,size in [('W',(-5.4,-1.5,.13125),(1.2285,2,.03)),('S',(0,-6.15,.13125),(2,1.2285,.03))]:
 c=col('COL_Ramp_'+side,center,size,kind='ramp');c['shape']='analytic_ramp';c['rise']=FLOOR;c['run']=1.2
 if side=='W':c.rotation_euler.y=-math.atan2(FLOOR,1.2)
 else:c.rotation_euler.x=math.atan2(FLOOR,1.2)
 c['rotationXYZ_deg']=[math.degrees(a) for a in c.rotation_euler]
for name,loc in [('Anchor_Entrance',(-6.3,-1.5,0)),('Anchor_Entrance_S',(0,-7.05,0)),('Anchor_Interior',(0,0,FLOOR))]:scene.objects[name].location=loc
root['variante']='v005 — ampliado a leste, portas e móveis maiores';root['placement_x']=12.;root['source_v004_sha256']=source_hash;root['baked_scale']=1.;root['scale_applied']=True
for action in list(bpy.data.actions):
 if action.users==0:bpy.data.actions.remove(action)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'export/barracks-v005.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/barracks-v005.blend'))
meshes=[o for o in scene.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
report={'version':'v005','sourceV004SHA256':source_hash,'wallsMapXZ':[10.5,9],'placement':{'x':12,'z':0,'rotationYDeg':-90,'scale':1},'doorWidth':DOOR,'doorHeight':Z(1.95)-Z(.285),'rampWidth':2,'rampRise':FLOOR,'rampRun':1.2,'architectureHeightFactorAboveFloor':1.2,'furnitureFactor':1.1,'furnitureGroups':records,'trianglesBefore':9054,'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len({m.name for o in meshes for m in o.data.materials})}
(OUT/'notas/build-v005.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
if '--render' in sys.argv:
 cam=src.setup_preview(scene);scene.cycles.samples=32;scene.render.resolution_x=1440;scene.render.resolution_percentage=100
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.name='StudioFloor'
 for name,cut,d,target,width in [('frente',False,(-1,0,0),(0,0,1.8),13.5),('tres-quartos',False,(-1,-1,.8),(0,-.3,1.4),16.5),('superior-sem-teto',True,(0,0,1),(0,-.5,.3),16.5)]:
  scene.render.resolution_y=900 if name=='frente' else 1080;scene.objects['Building_Roof'].hide_render=cut;src.aim(cam,d,target,width)
  for ln in ['Preview_Warm1','Preview_Warm2']:scene.objects[ln].data.energy=250 if cut else 0
  scene.render.filepath=str(OUT/'renders'/('v005-'+name+'.png'));bpy.ops.render.render(write_still=True)
