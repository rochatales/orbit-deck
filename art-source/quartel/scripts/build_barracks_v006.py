"""v006: colisores internos simples e porta automática do banheiro, vão 1,20 × 2 m.
Lê v005 preservada. Implantação e dimensões externas continuam inalteradas.
"""
import bpy,bmesh,sys,math,json,hashlib,inspect
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;OUT=HERE.parent
sys.path.insert(0,str(HERE));sys.path.insert(0,str(OUT.parent/'armario-emergencia/scripts'))
import build_barracks as src
from build_emergency_locker import new_empty,Builder
source=OUT/'blend/barracks-v005.blend';source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.name='Quartel_v006';scene.frame_set(1);bpy.context.view_layer.update()
root=scene.objects['Barracks'];atlas=scene.objects['Building_Roof'].data.materials[0];FLOOR=.2625
palette=json.loads((OUT/'notas/build-v002.json').read_text())['palette'];mats=src.build_materials();colliders=[];counts={}
def prepare_mesh(obj,scale=1):
 for vertex in obj.data.vertices:vertex.co*=scale
 uv=obj.data.uv_layers.new(name='PaletteUV')
 for face in obj.data.polygons:
  cell=palette[obj.data.materials[face.material_index].name]['cell']
  for i in face.loop_indices:uv.data[i].uv=((cell%8+.5)/8,1-(cell//8+.5)/8)
  face.material_index=0
 obj.data.materials.clear();obj.data.materials.append(atlas);obj.data.update()
def components(vertices):
 remaining=set(vertices);parts=[]
 while remaining:
  vertex=remaining.pop();part={vertex};stack=[vertex]
  while stack:
   current=stack.pop()
   for edge in current.link_edges:
    other=edge.other_vert(current)
    if other in remaining:remaining.remove(other);part.add(other);stack.append(other)
  parts.append(part)
 return sorted(parts,key=lambda part:tuple(sum(v.co[i] for v in part)/len(part) for i in range(3)))
def bounds(points):
 return [min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]
def col_box(name,points,kind='furniture',bottom=FLOOR,parent=root):
 lo,hi=bounds(points);geometry_bounds={'min':lo[:],'max':hi[:]}
 if bottom is not None:lo[2]=bottom
 center=[(lo[i]+hi[i])/2 for i in range(3)];size=[hi[i]-lo[i] for i in range(3)]
 assert min(size)>0,(name,size)
 obj=new_empty(name,center,parent=parent,collection=scene.collection);obj.empty_display_type='CUBE';obj.empty_display_size=1;obj.scale=tuple(s/2 for s in size)
 obj['shape']='box';obj['kind']=kind;obj['size_m']=size;obj['center_m']=center
 colliders.append({'id':name,'kind':kind,'geometryBounds':geometry_bounds,'min':lo,'max':hi})
 return obj
def capture_walls(obj):
 bm=bmesh.new();bm.from_mesh(obj.data)
 for i,part in enumerate(components(bm.verts)):
  lo,hi=bounds([v.co for v in part])
  if hi[2]-lo[2]>.1:col_box('COL_Bathroom_Wall_'+str(i),[v.co for v in part],kind='interior-wall',bottom=None)
 bm.free()
def capture_colliders(b,vertices,name):
 pts=[v.co*.75 for v in vertices];counts[name]=counts.get(name,0)+1;index=counts[name]
 if name in ['beliche','armário','sanitário','pia e espelho','armário lateral']:
  label={'beliche':'Bed','armário':'Locker','sanitário':'Toilet','pia e espelho':'Sink','armário lateral':'Cabinet'}[name]
  col_box(f'COL_Interior_{label}_{index}',pts)
 elif name=='mesa e bancos':
  for part in components(vertices):
   material=b.slots[next(iter(part)).link_faces[0].material_index];physical=[v.co*.75 for v in part];lo,hi=bounds(physical)
   if material in ['Wood','Metal_Light'] and hi[0]-lo[0]>1:
    label='Bench' if material=='Wood' else 'Table';counts[label]=counts.get(label,0)+1
    col_box(f'COL_Interior_{label}_{counts[label]}',physical)
 elif name=='entrada e nichos':
  sections={'BenchAndShelves':[],'EntryCabinet':[]}
  for part in components(vertices):
   physical=[v.co*.75 for v in part];lo,hi=bounds(physical);cy=(lo[1]+hi[1])/2
   if hi[2]<FLOOR+.06:continue
   if cy<-2.44:sections['BenchAndShelves']+=physical
   elif cy>-.60:sections['EntryCabinet']+=physical
  for label,physical in sections.items():col_box('COL_Interior_'+label,physical)
 elif name=='chuveiro':
  for part in components(vertices):
   physical=[v.co*.75 for v in part];lo,hi=bounds(physical)
   if hi[2]-lo[2]>.8 and hi[0]-lo[0]<.1:col_box('COL_Interior_ShowerGlass',physical)
   elif hi[0]-lo[0]>.8:col_box('COL_Interior_ShowerTray',physical,kind='support',bottom=None)
# Interior gerado novamente da receita, com móveis crescidos como conjuntos inteiros.
bpy.data.objects.remove(scene.objects['Building_Interior'],do_unlink=True)
src.HY=7.;src.IY=6.75;src.WALL_TOP=2.8275/.75
mats=src.build_materials();palette=json.loads((OUT/'notas/build-v002.json').read_text())['palette']
records=[]
def mark(b):return set(b.bm.verts)
def grow(b,before,pivot,shift=(0,0,0),name='móvel'):
 pivot=Vector(pivot);shift=Vector(shift);verts=set(b.bm.verts)-before
 size_before=[max(v.co[i] for v in verts)-min(v.co[i] for v in verts) for i in range(3)]
 for v in verts:v.co=pivot+(v.co-pivot)*1.1+shift
 size_after=[max(v.co[i] for v in verts)-min(v.co[i] for v in verts) for i in range(3)]
 records.append({'name':name,'scale':1.1,'vertices':len(verts),'sizeBefore':[s*.75 for s in size_before],'sizeAfter':[s*.75 for s in size_after]})
 capture_colliders(b,verts,name)
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
# Retira a folha fixa original; amplia o vão e separa paredes para inspeção.
recipe=recipe.replace('    # --- NE sanitation compartment', "    interior_builder=b; b=Builder('Bathroom_Walls',mats)\n    # --- NE sanitation compartment")
recipe=recipe.replace('dz = FLOOR + 2.3','dz = FLOOR + 2.0/.75').replace('d0, d1 = 3.0, 3.85','d0, d1 = (2.9-.6)/.75, (2.9+.6)/.75')
start=recipe.index('    b.box((d1 - d0 - 0.04')
end=recipe.index('    for k in range(2)',start)
recipe=recipe[:start]+recipe[end:]
recipe=recipe.replace('    # toilet, sink + mirror, shower', "    walls=b.finish(parent=root,collection=coll); prepare_mesh(walls,.75); capture_walls(walls); b=interior_builder; saved=mark(b)\n    # toilet, sink + mirror, shower")
recipe=recipe.replace("grow(b,saved,(IX,py+.62,FLOOR),name='chuveiro')", "grow(b,saved,(IX,py+.62,FLOOR),(0,.8,0),name='chuveiro')")
ns=src.__dict__.copy();ns.update(mark=mark,grow=grow,bunk=bunk,locker=locker,prepare_mesh=prepare_mesh,capture_walls=capture_walls)
exec(compile(recipe,'<v006:interior-com-colisores>','exec'),ns)
interior=ns['build_interior'](mats,root,scene.collection,src.load_font());prepare_mesh(interior,.75)
# Folhas telescópicas internas: recolhem sobre a face externa da divisória, sem cruzá-la.
frame=Builder('Bathroom_Frame',mats)
for x in [2.2625,3.5375]:frame.box((.075,.06,2.075),(x,1.065,FLOOR+1.0375),'Graphite',bevel=.008)
frame.box((1.35,.06,.075),(2.9,1.065,FLOOR+2.0375),'Graphite',bevel=.008)
frame.box((.18,.025,.035),(2.9,1.02,FLOOR+2.12),'Glow_Accent')
src.label(frame,src.load_font(),'SANITÁRIO',.09,(2.9,1.04,FLOOR+2.25),'Graphite')
prepare_mesh(frame.finish(parent=root,collection=scene.collection))
for index,(center,opened,depth) in enumerate([(2.6,1.92,1.0225),(3.2,1.94,.95)]):
 b=Builder('Door_Bathroom_'+str(index),mats)
 b.box((.62,.05,2.02),(center,depth,FLOOR+1),'Locker_Grey',bevel=.012)
 b.box((.54,.012,1.83),(center,depth-.029,FLOOR+1),'Metal_Light',bevel=.004)
 b.box((.12,.016,.025),(center,depth-.04,FLOOR+1.81),'Glow_Accent')
 b.box((.025,.03,.16),(center+.18,depth-.044,FLOOR+.95),'Graphite')
 leaf=b.finish(parent=root,collection=scene.collection);prepare_mesh(leaf);leaf['door_side']='bathroom'
 collider=col_box('COL_'+leaf.name,[v.co for v in leaf.data.vertices],kind='door',bottom=None,parent=leaf);collider['door_panel']=leaf.name
 leaf.keyframe_insert('location',frame=1);leaf.location.x=opened-center;leaf.keyframe_insert('location',frame=20)
 a=leaf.animation_data.action;track=leaf.animation_data.nla_tracks.new();track.name='Bathroom_Open';strip=track.strips.new('Bathroom_Open',1,a);strip.name='Bathroom_Open';leaf.animation_data.action=None
scene.frame_set(1);bpy.context.view_layer.update();root['variante']='v006 — colisores internos e porta automática do banheiro';root['source_v005_sha256']=source_hash
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'export/barracks-v006.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/barracks-v006.blend'))
meshes=[o for o in scene.objects if o.type=='MESH']
for obj in meshes:obj.data.calc_loop_triangles()
report={'version':'v006','base':'f1d53f1','sourceV005SHA256':source_hash,'trianglesBefore':9078,'triangles':sum(len(o.data.loop_triangles) for o in meshes),'materials':len({m.name for o in meshes for m in o.data.materials}),'bathroomDoor':{'widthBefore':.6375,'width':1.2,'height':2,'worldCenter':{'x':13.125,'z':2.9},'clip':'Bathroom_Open','panels':2},'showerShiftM':.6,'collidersAdded':colliders}
(OUT/'notas/build-v006.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
if '--render' in sys.argv:
 cam=src.setup_preview(scene);scene.cycles.samples=32;scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));bpy.context.object.name='StudioFloor';scene.objects['Building_Roof'].hide_render=True
 for light in ['Preview_Warm1','Preview_Warm2']:scene.objects[light].data.energy=250
 for name,d,target,width,opened in [('superior-sem-teto',(0,0,1),(0,-.5,.3),16.5,False),('banheiro-fechado',(-.5,-1,1),(2.8,2.2,1.1),7.5,False),('banheiro-aberto',(-.5,-1,1),(2.8,2.2,1.1),7.5,True)]:
  if opened:
   for i,delta in [(0,-.68),(1,-1.26)]:
    leaf=scene.objects['Door_Bathroom_'+str(i)];leaf.animation_data.nla_tracks[0].mute=True;leaf.location.x=delta
   bpy.context.view_layer.update()
  src.aim(cam,d,target,width);scene.render.filepath=str(OUT/'renders'/('v006-'+name+'.png'));bpy.ops.render.render(write_still=True)
