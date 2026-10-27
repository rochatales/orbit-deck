"""v004 parte da v003: somente acessos, rampas e referências COL; demais malhas intactas.
Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v004.py -- [--render]
"""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent;OUT=HERE.parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(OUT.parent/'armario-emergencia/scripts'))
import build_barracks as src
from build_emergency_locker import Builder,new_empty
source=OUT/'blend/barracks-v003.blend';digest=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.name='Quartel_v004';scene.frame_set(1)
root=scene.objects['Barracks'];atlas=scene.objects['Building_Roof'].data.materials[0]
palette=json.loads((OUT/'notas/build-v002.json').read_text())['palette'];mats=src.build_materials()
# Remove só os componentes conexos da moldura Oeste antiga, jamais plinto/janelas.
shell=scene.objects['Building_Shell'];bm=bmesh.new();bm.from_mesh(shell.data);pending=set(bm.verts);removed=0
while pending:
 seed=pending.pop();component={seed};stack=[seed]
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   n=e.other_vert(v)
   if n in pending:pending.remove(n);component.add(n);stack.append(n)
 lo=[min(v.co[i] for v in component) for i in range(3)];hi=[max(v.co[i] for v in component) for i in range(3)]
 if lo[0]>-5.01 and hi[0]<-4.19 and lo[1]>-1.11 and hi[1]<1.11 and lo[2]>.15:
  bmesh.ops.delete(bm,geom=list(component),context='VERTS');removed+=1
assert removed>=8,removed
bm.to_mesh(shell.data);bm.free()
for name in ['EntranceDoor','EntranceDoor_S','Entrance_S_Frame','COL_Door_W','COL_Door_S']:
 o=scene.objects.get(name)
 if o:bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):
 if a.users==0:bpy.data.actions.remove(a)
# Alarga os vértices do vão nas duas paredes; cap/cornija e janelas não mudam.
for side,axis in [('S',0),('W',1)]:
 wall=scene.objects['Wall_'+side];count=0
 for v in wall.data.vertices:
  if abs(abs(v.co[axis])-.4875)<1e-5:v.co[axis]=math.copysign(.7,v.co[axis]);count+=1
 assert count>=8,(side,count)
 wall.data.update()
 # Atualiza jambas e lintel das referências, preservando altura.
 for o in list(root.children):
  if o.name.startswith('COL_'+side+'_'):
   uhalf=(3.525 if side=='S' else 2.775)
   if o.name.endswith('Lintel'):width=1.4;u=0
   else:
    sign=-1 if o.name.endswith('_0') else 1;width=uhalf-.7;u=sign*(uhalf+.7)/2
   # COL em frame da fachada; caixa local X é tangente.
   origin=Vector((0,-3.75,0)) if side=='S' else Vector((-4.5,0,0))
   rot=0 if side=='S' else math.radians(270)
   p=origin+Vector((math.cos(rot)*u-math.sin(rot)*.09375,math.sin(rot)*u+math.cos(rot)*.09375,o.location.z))
   o.location=p;o.scale.x=width/2;o['size_m']=[width,o['size_m'][1],o['size_m'][2]];o['center_m']=list(p)

def frame(side):return Matrix.Translation(Vector((0,-3.75,0) if side=='S' else (-4.5,0,0)))@Matrix.Rotation(0 if side=='S' else math.radians(270),4,'Z')
def finish(b,parent=root):
 o=b.finish(parent=parent,collection=scene.collection);uv=o.data.uv_layers.new(name='PaletteUV')
 for p in o.data.polygons:
  i=palette[o.data.materials[p.material_index].name]['cell']
  for k in p.loop_indices:uv.data[k].uv=((i%8+.5)/8,1-(i//8+.5)/8)
  p.material_index=0
 o.data.materials.clear();o.data.materials.append(atlas);return o

def col(name,center,size,rot=0,parent=root,kind='wall'):
 o=new_empty(name,center,(0,0,rot),parent=parent,collection=scene.collection);o.empty_display_type='CUBE';o.empty_display_size=1;o.scale=tuple(v/2 for v in size)
 o['shape']='box';o['kind']=kind;o['size_m']=list(size);o['center_m']=list(center);return o
panels=[]
for side,groupname,action in [('W','EntranceDoor','Door_Open'),('S','EntranceDoor_S','Door_S_Open')]:
 f=frame(side);b=Builder('Entrance_'+side+'_Frame',mats)
 with b.frame(f):
  for sign in [-1,1]:b.box((.15,.105,1.7625),(sign*.775,-.045,1.14375),'Graphite',bevel=.015)
  b.box((1.925,.375,.225),(0,-.15,2.10),'Shell_Warm',bevel=.045)
  b.box((1.955,.39,.045),(0,-.15,1.995),'Graphite')
  b.box((.375,.03,.045),(0,-.345,2.115),'Glow_Accent')
  b.box((1.4,.2625,.0225),(0,.07875,.27375),'Metal_Dark')
  b.box((.165,.0375,.24),(1.015,-.0225,1.20),'Metal_Dark',bevel=.0075)
  b.box((.09,.045,.06),(1.015,-.03,1.2525),'Glow_Screen')
 finish(b)
 group=new_empty(groupname,parent=root,collection=scene.collection)
 # Duas folhas telescópicas por lado: bolsão termina em |u|=1,115,
 # antes da marquise das janelas (|u|>=1,1775). Nada cruza janela/quina.
 for sign,label in [(-1,'L'),(1,'R')]:
  for layer,start in [(0,.525),(1,.175)]:
   u=sign*start;depth=-.18 if layer==0 else -.255;name=f'Door_{side}_{label}{layer}'
   b=Builder(name,mats)
   with b.frame(f):
    b.box((.38,.06,1.725),(u,depth,1.10625),'Shell_Warm',bevel=.01)
    b.box((.32,.015,1.47),(u,depth-.038,1.10625),'Shell_Ivory',bevel=.005)
    b.box((.13,.018,.35),(u,depth-.05,1.425),'Glass')
    b.box((.025,.02,.65),(u+sign*.125,depth-.055,1.10625),'Glow_Accent')
    b.box((.32,.02,.09),(u,depth-.05,.4875),'Graphite')
   leaf=finish(b,group);leaf['door_side']=side;leaf['slide_u']=sign*(.925-start)
   local=[f.inverted()@v.co for v in leaf.data.vertices]
   lo=[min(v[i] for v in local) for i in range(3)];hi=[max(v[i] for v in local) for i in range(3)]
   center=f@Vector(tuple((lo[i]+hi[i])/2 for i in range(3)));size=tuple(hi[i]-lo[i] for i in range(3))
   c=col('COL_'+name,center,size,0 if side=='S' else 270,parent=leaf,kind='door');c['door_panel']=name
   leaf.keyframe_insert('location',frame=1)
   leaf.location=f.to_3x3()@Vector((leaf['slide_u'],0,0));leaf.keyframe_insert('location',frame=20)
   # Um único action por portal, com slots independentes por folha.
   if layer==0 and sign==-1:shared=leaf.animation_data.action;shared.name=action
   else:
    # Garante clipes por portal via exportação NLA agrupada abaixo.
    leaf.animation_data.action.name=action+'_'+label+str(layer)
   panels.append(leaf)
 # Agrupa tracks pelo nome NLA: exportado como Door_Open / Door_S_Open.
 for leaf in panels[-4:]:
  a=leaf.animation_data.action;track=leaf.animation_data.nla_tracks.new();track.name=action;strip=track.strips.new(action,1,a);strip.name=action;leaf.animation_data.action=None
# Rampas: só largura, corrida e subida preservadas.
for side,axis in [('W',1),('S',0)]:
 ramp=scene.objects['Entrance_'+side+'_Ramp']
 for v in ramp.data.vertices:v.co[axis]*=1.6/1.425
 ramp.data.update();c=scene.objects['COL_Ramp_'+side];size=list(c['size_m']);size[axis]=1.6;c['size_m']=size;c.scale[axis]=.8
# Borda física: caixas derivadas do plinto, não uma alteração visual do casco.
# Topo 0,75 m impede autostep mesmo com apoio desejado 0,2625 + offset 0,06.
HX,HY,R=4.8375,4.0875,1.3125;curbs=[]
for side,length,origin,rot in [('S',2*(HX-R),(0,-HY),0),('N',2*(HX-R),(0,HY),180),('W',2*(HY-R),(-HX,0),270),('E',2*(HY-R),(HX,0),90)]:
 intervals=[(-length/2,-.8),(.8,length/2)] if side in ['W','S'] else [(-length/2,length/2)]
 for i,(a,b) in enumerate(intervals):
  angle=math.radians(rot);u=(a+b)/2;p=(origin[0]+math.cos(angle)*u,origin[1]+math.sin(angle)*u,.375)
  curbs.append(col(f'COL_Pedestal_{side}_{i}',p,(b-a,.06,.75),rot,kind='pedestal-edge'))
for j,(cx,cy,a0) in enumerate([(HX-R,-HY+R,-90),(HX-R,HY-R,0),(-HX+R,HY-R,90),(-HX+R,-HY+R,180)]):
 for i in range(5):
  a=math.radians(a0+(i+.5)*18);curbs.append(col(f'COL_Pedestal_Corner_{j}_{i}',(cx+R*math.cos(a),cy+R*math.sin(a),.375),(.06,2*(R+.03)*math.tan(math.radians(9))+.015,.75),math.degrees(a),kind='pedestal-edge'))
scene.frame_set(1);bpy.context.view_layer.update();root['variante']='v004 — vãos 1,40 m, telescópicas, rampas 1,60 m';root['source_v003_sha256']=digest
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'export/barracks-v004.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/barracks-v004.blend'))
meshes=[o for o in scene.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
report={'variant':'v004','sourceV003SHA256':digest,'sourceTriangles':8278,'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len({m.name for o in meshes for m in o.data.materials}),'doorWidth':1.4,'doorUsefulHeight':1.665,'rampWidth':1.6,'rampRun':1.2,'rampRise':.2625,'removedWestFrameComponents':removed,'telescopicPocketMaxU':1.115,'windowHoodMinU':1.1775,'pedestalColliderHeight':.75,'pedestalColliderReason':'autostep 0,26 + apoio desejado 0,2625 + offset 0,06; borda bloqueada sem mudar controller'}
(OUT/'notas/build-v004.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
if '--render' in sys.argv:
 cam=src.setup_preview(scene);scene.cycles.samples=32;scene.render.resolution_x=1440;scene.render.resolution_percentage=100
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.name='StudioFloor'
 for name,cut,d,target,width in [('frente',False,(-1,0,0),(-.3,-.6,1.575),10.875),('tres-quartos',False,(-1,-1,.8),(-.375,-.3,.975),14.25),('superior-sem-teto',True,(0,0,1),(-.375,-.6,.375),14.25)]:
  scene.render.resolution_y=900 if name=='frente' else 1080;scene.objects['Building_Roof'].hide_render=cut;src.aim(cam,d,target,width)
  for ln in ['Preview_Warm1','Preview_Warm2']:scene.objects[ln].data.energy=250 if cut else 0
  scene.render.filepath=str(OUT/'renders'/('v004-'+name+'.png'));bpy.ops.render.render(write_still=True)
