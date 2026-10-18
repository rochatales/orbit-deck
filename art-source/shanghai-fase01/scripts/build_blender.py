"""Blender 5.1: gera fonte editável por módulo + exportação agrupada por setor/material."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];ART=ROOT/'art-source/shanghai-fase01'
layout=json.loads((ART/'export/layout.json').read_text());bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
source=bpy.data.collections.new('01_KIT_LAYOUT_EDITAVEL');scene.collection.children.link(source)
exports=bpy.data.collections.new('02_EXPORT_SETORES');scene.collection.children.link(exports)
helpers=bpy.data.collections.new('03_COLISORES_MARCADORES');scene.collection.children.link(helpers)
mats={}
colors={'grama':('#686c4b',None),'terra':('#80715d','entulho'),'asfalto':('#ffffff','asfalto'),'calcada':('#ffffff','calcada'),'concreto':('#ddddcc','concreto'),'terracota':('#bd7056','fachada'),'azul':('#7e9c9d','fachada'),'bege':('#c4b695','fachada'),'entulho':('#ffffff','entulho'),'tijolo':('#9c6650','entulho'),'sombra':('#292c29',None),'vidro':('#344a4b',None),'metal':('#4b5250','concreto'),'faixa':('#c8c7ae',None),'letreiro':('#ffffff','letreiro')}
for name,(col,tex) in colors.items():
 m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True
 bs=m.node_tree.nodes.get('Principled BSDF');c=[int(col[i:i+2],16)/255 for i in (1,3,5)];c=[((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in c]
 bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.88 if name!='vidro' else .48
 if tex:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ART/f'texturas/{tex}.png'));t.image.pack()
  mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*c,1)
  # Bake tint into texture for plain glTF material export (no unsupported node mix).
  if name not in ['asfalto','calcada','entulho','letreiro']:
   image=t.image.copy();image.name=name+'_cor';pix=list(image.pixels)
   for i in range(0,len(pix),4):
    for k in range(3):pix[i+k]*=c[k]**(1/2.2)
   image.pixels[:]=pix;image.pack();t.image=image
  m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
  normpath=ART/f'texturas/{tex}_normal.png'
  if normpath.exists():
   t2=m.node_tree.nodes.new('ShaderNodeTexImage');t2.image=bpy.data.images.load(str(normpath),check_existing=True);t2.image.colorspace_settings.name='Non-Color';t2.image.pack();normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.3;m.node_tree.links.new(t2.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs[0],bs.inputs['Normal'])
 mats[name]=m
# Box faces wound consistently; world X,Z -> Blender X,-Y, height Z.
faceids=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def geo(p):
 w,d,h=p['w'],p['d'],p['h'];a=p['angle'];ca,sa=math.cos(a),math.sin(a)
 verts=[];faces=[];uv=[]
 def vtx(x,y,z):return (p['x']+x*ca+z*sa,-(p['z']-x*sa+z*ca),p['y']+y)
 if p.get('round') or p.get('mound'):
  n=12
  for level,sc,yy in [(0,1,-h/2),(1,.85 if p.get('mound') else 1,h*.1),(2,.37 if p.get('mound') else 1,h/2)]:
   for k in range(n):
    t=k*math.tau/n; factor=(.94+.06*math.sin(k*4)) if p.get('mound') else 1
    verts.append(vtx(math.cos(t)*w/2*sc*factor,yy,math.sin(t)*d/2*sc*factor))
  for level in range(2):
   for k in range(n):faces.append((level*n+k,(level+1)*n+k,(level+1)*n+(k+1)%n,level*n+(k+1)%n))
  faces.append(tuple(reversed(range(2*n,3*n))))
 elif p.get('radius'):
  rad=min(p['radius'],w/2,d/2);ring=[]
  for sx,sz,off in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
   for k in range(9):
    t=math.radians(off+k*90/8);ring.append(((w/2-rad)*sx+rad*math.cos(t),(d/2-rad)*sz+rad*math.sin(t)))
  n=len(ring)
  if p.get('ring'):
   for x,z in ring:verts.append(vtx(x,h/2,z))
   for x,z in ring:
    f=.994;verts.append(vtx(x*f,h/2,z*f))
   for k in range(n):faces.append((k,(k+1)%n,(k+1)%n+n,k+n))
  else:
   verts=[vtx(x,h/2,z) for x,z in ring]+[vtx(x,-h/2,z) for x,z in ring]
   faces=[tuple(reversed(range(n)))]+[(k,k+n,(k+1)%n+n,(k+1)%n) for k in range(n)]
  # orientation fixed below using mesh normals check for top.
  faces=[tuple(reversed(f)) if len(f)==4 and p.get('ring') else f for f in faces]
 else:
  verts=[vtx(x,y,z) for x,y,z in [(-w/2,-h/2,-d/2),(w/2,-h/2,-d/2),(w/2,-h/2,d/2),(-w/2,-h/2,d/2),(-w/2,h/2,-d/2),(w/2,h/2,-d/2),(w/2,h/2,d/2),(-w/2,h/2,d/2)]]
  faces=[tuple(reversed(f)) for f in faceids]
 return verts,faces
batches={};stats={};maxtris=0
for p in layout['parts']:
 vs,fs=geo(p);mat=p['material'];sector=f'{min(2,max(0,int((p["x"]+51)/34)))}{min(2,max(0,int((p["z"]+54)/36)))}'
 # Source objects are full editing granularity. Export grouped without modifiers.
 mesh=bpy.data.meshes.new(p['id']);mesh.from_pydata(vs,[],fs);mesh.update();layer=mesh.uv_layers.new(name='UVMap')
 for poly in mesh.polygons:
  normal=poly.normal;axis=max(range(3),key=lambda k:abs(normal[k]));axes=[k for k in range(3) if k!=axis]
  scale=8 if mat=='asfalto' else 4 if mat=='calcada' else 3
  for li in poly.loop_indices:
   co=mesh.vertices[mesh.loops[li].vertex_index].co;u,v=co[axes[0]]/scale,co[axes[1]]/scale
   if mat=='letreiro':
    u=(co.x-(p['x']-p['w']/2))/p['w'];v=(co.z-(p['y']-p['h']/2))/p['h']
   layer.data[li].uv=(u,v)
 obj=bpy.data.objects.new(p['id'],mesh);source.objects.link(obj);obj.data.materials.append(mats[mat]);obj['id_estavel']=p['id'];obj['papel']='visual'
 batches.setdefault((sector,mat),[]).append(obj)
# Merge copies; sources never destroyed.
for (sector,mat),objs in batches.items():
 verts=[];faces=[];uvs=[]
 for o in objs:
  offset=len(verts);verts.extend(tuple(v.co) for v in o.data.vertices)
  for p in o.data.polygons:faces.append(tuple(offset+i for i in p.vertices));uvs.extend(tuple(o.data.uv_layers.active.data[li].uv) for li in p.loop_indices)
 mesh=bpy.data.meshes.new('SETOR_'+sector+'_'+mat);mesh.from_pydata(verts,[],faces);mesh.update();layer=mesh.uv_layers.new()
 for i,uv in enumerate(uvs):layer.data[i].uv=uv
 obj=bpy.data.objects.new(mesh.name,mesh);exports.objects.link(obj);obj.data.materials.append(mats[mat]);obj['id_estavel']=mesh.name;obj['papel']='visual';mesh.calc_loop_triangles();maxtris+=len(mesh.loop_triangles)
source.hide_render=True;source.hide_viewport=True
for o in layout['obstacles']:
 obj=bpy.data.objects.new(o['id'],None);helpers.objects.link(obj);obj.location=((o['minX']+o['maxX'])/2,-(o['minZ']+o['maxZ'])/2,.75);obj.empty_display_type='CUBE';obj.scale=((o['maxX']-o['minX'])/2,(o['maxZ']-o['minZ'])/2,.75);obj.hide_render=True
for p in layout['spawns']+layout['loot']+[dict(id='INTERACT_Nave',x=0,z=13),dict(id='SPAWN_Desembarque',x=0,z=9.5)]:
 obj=bpy.data.objects.new(p['id'],None);helpers.objects.link(obj);obj.location=(p['x'],-p['z'],0);obj.empty_display_size=.3;obj['id_estavel']=p['id'];obj.hide_render=True
helpers.hide_viewport=True
# Orthographic game camera, actual 18.38/13 elevation, backed off x3.
def camera(name,x,z,angle=math.pi/4):
 data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);data.type='ORTHO';data.ortho_scale=26;target=Vector((x,-z,.55));o.location=target+Vector((math.cos(angle)*18.38*3,-math.sin(angle)*18.38*3,13*3));o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler();return o
scene.camera=camera('CAM_Jogo',0,9.5)
world=bpy.data.worlds.new('Atmosfera');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.61,.54,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
light=bpy.data.lights.new('Sol_quente','SUN');light.energy=2;light.angle=.35;sun=bpy.data.objects.new('Sol_quente',light);scene.collection.objects.link(sun);sun.rotation_euler=(.45,-.4,-.5)
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT')
for o in exports.objects:o.select_set(True)
path=ROOT/'src/assets/shanghai-fase01/shanghai-fase01.glb'
bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,export_format='GLB',export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
scene['autor']='Codex — S6.3, candidato sem aprovação';scene['convencao']='Blender X=x, Y=-z, Z=altura; 1m';scene['triangulos']=maxtris
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'blend/shanghai_fase01_v001.blend'))
(ART/'notas/asset.json').write_text(json.dumps(dict(parts=len(layout['parts']),draws=len(batches),triangles=maxtris,materials=len(mats),glbBytes=path.stat().st_size),indent=2))
print('FINAL',maxtris,'triângulos;',len(batches),'batches;',path.stat().st_size,'bytes')
