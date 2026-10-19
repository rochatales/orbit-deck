"""Caixa de suprimentos v001. Blender 5.1. Metros, +Z acima, frente em -Y (game +Z).
A fonte preserva cada peça. GLB agrupa por material e suporte animado.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[3];ART=ROOT/'art-source/caixa-suprimentos';OUT=ROOT/'src/assets/props/caixa-suprimentos'
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene
sc.unit_settings.system='METRIC';sc.unit_settings.scale_length=1;sc.render.fps=30;sc.frame_start=1;sc.frame_end=73
source=bpy.data.collections.new('01_PECAS_EDITAVEIS');sc.collection.children.link(source)
export=bpy.data.collections.new('02_ASSET_EXPORTAVEL');sc.collection.children.link(export)
studio=bpy.data.collections.new('03_ESTUDIO_NAO_EXPORTAR');sc.collection.children.link(studio)
helpers=bpy.data.collections.new('04_MARCADORES');sc.collection.children.link(helpers)
def move(o,col):
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
def empty(name,loc=(0,0,0),parent=None,col=export):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.location=loc;o.empty_display_size=.1;o['id_estavel']=name;o.parent=parent;return o
root=empty('CRATE_Supply_01');root['papel']='caixa_suprimentos';root['estado_inicial']='fechada'
hinge=empty('LID_Pivot',(0,.48,.86),root);hinge['papel']='tampa'
reveal=empty('VFX_Reveal',(0,0,.84),root);reveal['papel']='revelacao_azul'
latchL=empty('LOCK_Left',(-.51,-.57,.85),root);latchR=empty('LOCK_Right',(.51,-.57,.85),root)
parents=[root,hinge,latchL,latchR,reveal]
def linear(hex):
 vals=[int(hex[i:i+2],16)/255 for i in (1,3,5)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)
CYAN='#39e9ff';mats={}
def material(name,color,metal=0,rough=.6,tex=None,emission=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(color),1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 if emission:p.inputs['Emission Color'].default_value=(*linear(color),1);p.inputs['Emission Strength'].default_value=emission
 if tex:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ART/'texturas'/tex),check_existing=True);t.image.pack();m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
  if name=='VFX_Azul':m.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha'])
 if name=='Aco_Pintado':
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(ART/'texturas/normal.png'));n.image.colorspace_settings.name='Non-Color';n.image.pack()
  nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.28;m.node_tree.links.new(n.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs[0],p.inputs['Normal'])
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ART/'texturas/rugosidade.png'));t.image.colorspace_settings.name='Non-Color';t.image.pack();m.node_tree.links.new(t.outputs['Color'],p.inputs['Roughness'])
 mats[name]=m;return m
steel=material('Aco_Pintado','#46535b',.58,.68,'metal_pintado.png')
edge=material('Aresta_Titanio','#968371',.72,.42)
dark=material('Aco_Escuro','#222d32',.65,.52)
rubber=material('Vedacao_Borracha','#121b1f',.08,.83)
hazard=material('Faixa_Seguranca','#b7662d',.25,.73,'faixas_seguranca.png')
inner=material('Interior_Forrado','#263438',.22,.8)
bolt=material('Parafuso','#ac9a85',.8,.36)
neon=material('Neon_Azul',CYAN,.1,.26,emission=5)
core=material('Luz_Interior',CYAN,0,.32,emission=4)
vfx=material('VFX_Azul',CYAN,0,.6,'revelacao_alpha.png',emission=2.5,alpha=.3);vfx.use_backface_culling=False
white=material('Texto_Tecnico','#b9c1bd',.15,.7)
# Source modeling helpers. All dimensions in metres; transformed origins preserved on parenting.
def parent_world(o,p):
 m=o.matrix_world.copy();o.parent=p;o.matrix_world=m

def uv_project(o):
 mesh=o.data
 if not mesh.uv_layers:mesh.uv_layers.new(name='UVMap')
 uv=mesh.uv_layers.active
 for face in mesh.polygons:
  axis=max(range(3),key=lambda k:abs(face.normal[k]));axes=[k for k in range(3) if k!=axis]
  for li in face.loop_indices:
   co=mesh.vertices[mesh.loops[li].vertex_index].co
   uv.data[li].uv=(co[axes[0]]/1.25+.5,co[axes[1]]/1.25+.5)

def finish(o,name,mat,parent=root,bevel=.015):
 o.name=name;move(o,source);o.data.materials.append(mat);uv_project(o)
 if mat==hazard:
  mesh=o.data;uv=mesh.uv_layers.active
  for face in mesh.polygons:
   if abs(face.normal.y)>.5:
    for li in face.loop_indices:
     co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co.x/o.dimensions.x+.5,co.z/o.dimensions.z+.5)
 if bevel:
  mod=o.modifiers.new('Chanfro_fabricado','BEVEL');mod.width=bevel;mod.segments=1 if bevel>=.04 else 3
  mod=o.modifiers.new('Normais_ponderadas','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
  for f in o.data.polygons:f.use_smooth=bevel<.04
 parent_world(o,parent);o['id_estavel']=name;return o

def box(name,loc,size,mat=steel,bevel=.015,parent=root):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,mat,parent,bevel)

def cyl(name,loc,radius,depth,mat=bolt,axis='Z',verts=12,parent=root):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc);o=bpy.context.object
 if axis=='Y':o.rotation_euler.x=math.pi/2
 if axis=='X':o.rotation_euler.y=math.pi/2
 return finish(o,name,mat,parent,.004)

# Hollow, thick-walled base: visible interior and true gasket; no solid block filling the cavity.
box('Fundo_Estrutural',(0,0,.12),(1.36,1.06,.18),dark,.04)
box('Revestimento_Interior',(0,0,.24),(1.17,.87,.12),inner,.035)
for side in [-1,1]:
 box(f'Parede_Lateral_{side}',(side*.625,0,.52),(.11,1.01,.64),steel,.025)
 box(f'Parede_FrontalTraseira_{side}',(0,side*.48,.52),(1.18,.11,.64),steel,.02)
 box(f'Interior_Amortecedor_{side}',(side*.55,0,.51),(.025,.82,.45),inner,.012)
 # Horizontal side handles, bracketed separately from front control panel.
 for y in [-.22,.22]:box(f'Alca_Base_{side}_{y}',(side*.706,y,.52),(.09,.10,.18),edge,.02)
 box(f'Alca_Pega_{side}',(side*.765,0,.51),(.075,.40,.07),dark,.025)
 for y in [-.30,.30]:
  box(f'Pe_{side}_{y}',(side*.51,y,.04),(.23,.23,.08),rubber,.02)
 for y in [-.47,.47]:
  box(f'Canto_Base_{side}_{y}',(side*.59,y,.49),(.22,.22,.78),steel,.065)
  box(f'Canto_Bumper_{side}_{y}',(side*.59,y,.14),(.24,.24,.17),edge,.04)
  # Orange diagonal warning panels on front/rear faces.
  box(f'Faixa_{side}_{y}',(side*.59,y+(.121 if y>0 else -.121),.46),(.175,.012,.47),hazard,.006)
  cyl(f'Fixacao_{side}_{y}',(side*.59,y+(.133 if y>0 else -.133),.17),.029,.018,bolt,'Y')
  cyl(f'Fixacao_Centro_{side}_{y}',(side*.59,y+(.133 if y>0 else -.133),.72),.024,.014,bolt,'Y')
# Rim rails + seal remain on base when lid opens.
for x in [-.56,.56]:
 box(f'Aro_Lateral_{x}',(x,0,.833),(.055,.93,.045),edge,.01)
 box(f'Vedacao_Lateral_{x}',(x,0,.867),(.035,.92,.016),rubber,.005)
for y in [-.43,.43]:
 box(f'Aro_Frente_{y}',(0,y,.833),(1.12,.055,.045),edge,.01)
 box(f'Vedacao_Frente_{y}',(0,y,.867),(1.1,.035,.016),rubber,.005)
# Front panel, recessed service hatch, horizontal neon bar and dashboard.
box('Painel_Frontal',(0,-.555,.49),(.83,.10,.64),dark,.03)
box('Moldura_Neon',(0,-.615,.70),(.80,.045,.135),edge,.012)
box('Canal_Neon',(0,-.645,.70),(.735,.018,.082),rubber,.007)
box('Neon_Horizontal',(0,-.658,.70),(.69,.016,.043),neon,.008)
box('Painel_Status',(0,-.62,.56),(.68,.035,.12),steel,.009)
for i in range(3):
 box(f'Status_{i}',(-.27+i*.055,-.646,.56),(.025,.012,.027),neon,.003)
for i in range(4):cyl(f'LED_{i}',(.18+(i%2)*.045,-.645,.54+(i//2)*.035),.008,.012,neon,'Y',12)
box('Escotilha_Manutencao',(0,-.62,.34),(.66,.035,.28),steel,.018)
for x in [-.27,.27]:
 for z in [.245,.435]:cyl(f'Parafuso_Painel_{x}_{z}',(x,-.646,z),.014,.012,bolt,'Y',6)
# Slim cyan edge channels.
for x in [-.433,.433]:box(f'Neon_Vertical_{x}',(x,-.609,.51),(.018,.012,.51),neon,.004)
# Lid, top ribs and armored corners, all attached to true rear pivot.
box('Tampa_Casco',(0,0,.985),(1.36,1.08,.23),steel,.065,hinge)
box('Tampa_Face_Superior',(0,0,1.109),(1.05,.90,.025),steel,.025,hinge)
box('Tampa_Interior',(0,0,.867),(1.13,.86,.025),inner,.025,hinge)
for x in [-.48,.48]:
 box(f'Tampa_Nervura_{x}',(x,0,1.137),(.075,1.09,.045),edge,.012,hinge)
 for y in [-.44,.44]:
  box(f'Tampa_Canto_{x}_{y}',(x,y,1.024),(.27,.23,.26),steel,.055,hinge)
  cyl(f'Tampa_Parafuso_{x}_{y}',(x,y,1.16),.027,.015,bolt,'Z',6,hinge)
for x in [-.69,.69]:
 box(f'Tampa_Encaixe_{x}',(x,0,1.04),(.04,.42,.13),dark,.012,hinge)
 box(f'Tampa_Pega_{x}',(x,0,1.12),(.055,.35,.045),edge,.012,hinge)
# Lid handle and inspection badge on front.
box('Tampa_Moldura_Trava',(0,-.562,1.0),(.50,.045,.18),edge,.018,hinge)
box('Tampa_Centro_Trava',(0,-.59,1.0),(.43,.025,.12),steel,.012,hinge)
cyl('Trava_Cilindro',(0,-.621,1.0),.037,.035,dark,'Y',16,hinge)
for x in [-.27,.27]:
 cyl(f'Dobradica_{x}',(x,.51,.86),.045,.21,edge,'X',16)
 cyl(f'Eixo_Dobradica_{x}',(x,.51,.86),.022,.25,dark,'X',16)
for x,pa in [(-.51,latchL),(.51,latchR)]:
 box(f'Fecho_{x}',(x,-.622,.85),(.07,.055,.18),edge,.012,pa)
 box(f'Fecho_Pino_{x}',(x,-.656,.81),(.09,.03,.055),dark,.009,pa)
# Trays and unassigned neutral item packs; they do not grant inventory.
for x in [-.27,.27]:
 box(f'Bandeja_{x}',(x,0,.33),(.45,.67,.08),dark,.02)
 box(f'Conteudo_Provisorio_{x}',(x,.02,.43),(.29,.36,.15),steel,.025)
 box(f'Conteudo_Faixa_{x}',(x,.02,.515),(.11,.38,.015),edge,.003)
for x in [-.48,.48]:box(f'Fita_Luz_Interior_{x}',(x,0,.72),(.02,.72,.025),core,.004)
# Glow veils; scale keys transport the reveal envelope through standard glTF.
for i,a in enumerate([0,math.pi/2,math.pi/4,-math.pi/4]):
 w,h=.83,1.35;v=[(-w/2,0,0),(w/2,0,0),(w*.62,0,h),(-w*.62,0,h)]
 mesh=bpy.data.meshes.new('VFX_Veu');mesh.from_pydata(v,[],[(0,1,2,3)]);mesh.update();uv=mesh.uv_layers.new()
 for k,u in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[k].uv=u
 o=bpy.data.objects.new(f'VFX_Veu_{i}',mesh);source.objects.link(o);o.parent=reveal;o.rotation_euler.z=a;mesh.materials.append(vfx);o['id_estavel']=o.name
# Sparse light motes rise from cavity and settle; no reward assumption.
for i in range(8):
 a=i*2.399;r=.15+(i%3)*.11
 o=box(f'VFX_Particula_{i}',(r*math.cos(a),r*math.sin(a),.95+(i%4)*.14),(.015,.015,.035),neon,.005,reveal)
# Animation keys. E triggers Open once; final open state is held.
def key(o,prop,frame,value):
 setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=frame)
for f,ang in [(1,0),(7,0),(16,-12),(27,-67),(39,-104),(46,-101),(73,-101)]:key(hinge,'rotation_euler',f,(math.radians(ang),0,0))
for o in [latchL,latchR]:
 base=o.location.copy()
 for f,dy,dz in [(1,0,0),(5,0,0),(10,-.045,-.04),(73,-.045,-.04)]:key(o,'location',f,(base.x,base.y+dy,base.z+dz))
for f,k in [(1,.0001),(14,.0001),(23,.5),(32,1),(44,.8),(60,.16),(73,.0001)]:key(reveal,'scale',f,(k,k,k))
# Save all transform tracks under a single Open clip.
for o in [hinge,latchL,latchR,reveal]:
 action=o.animation_data.action;action.name='Open_'+o.name
 track=o.animation_data.nla_tracks.new();track.name='Open';strip=track.strips.new('Open',1,action);strip.action_frame_start=1;strip.action_frame_end=73
 o.animation_data.action=None
# Render-only light follows the same envelope; runtime must recreate the light.
ld=bpy.data.lights.new('Luz_Revelacao_Azul','POINT');ld.color=linear(CYAN);ld.shadow_soft_size=.35
lo=bpy.data.objects.new('Luz_Revelacao_Azul',ld);studio.objects.link(lo);lo.location=(0,-.05,.92)
for f,e in [(1,0),(14,0),(23,70),(32,150),(44,110),(60,35),(73,12)]:ld.energy=e;ld.keyframe_insert('energy',frame=f)
# Technical markers stay out of the visual GLB; data is in manifest.
inter=empty('INTERACT_Crate',(0,-1.1,0),col=helpers);inter['papel']='interacao';inter['raio']=1.8
col=empty('COL_Crate',(0,0,.59),col=helpers);col.empty_display_type='CUBE';col.scale=(.81,.70,.59)
helpers.hide_render=True;helpers.hide_viewport=True
# Build export copies with evaluated bevel/normal geometry, merged by parent and material.
sc.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();groups={}
for o in list(source.objects):
 if o.type!='MESH':continue
 ev=o.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(ev);world=o.matrix_world.copy();par=o.parent
 mesh.transform(par.matrix_world.inverted()@world)
 groups.setdefault((par.name,o.data.materials[0].name),[]).append(mesh)
triangles=0
for (pname,mname),meshes in groups.items():
 vs=[];fs=[];uvs=[];normals=[]
 for mesh in meshes:
  off=len(vs);vs.extend(tuple(v.co) for v in mesh.vertices)
  for poly in mesh.polygons:fs.append(tuple(off+i for i in poly.vertices))
  uvs.extend(tuple(x.uv) for x in mesh.uv_layers.active.data)
  normals.extend(tuple(n.vector) for n in mesh.corner_normals)
 m=bpy.data.meshes.new(pname+'_'+mname);m.from_pydata(vs,[],fs);m.update();uv=m.uv_layers.new()
 for i,u in enumerate(uvs):uv.data[i].uv=u
 for poly in m.polygons:poly.use_smooth=True
 m.normals_split_custom_set(normals);m.materials.append(mats[mname])
 o=bpy.data.objects.new(m.name,m);export.objects.link(o);o.parent=bpy.data.objects[pname];o['id_estavel']=m.name;o['papel']='efeito' if pname=='VFX_Reveal' else 'visual'
 m.calc_loop_triangles();triangles+=len(m.loop_triangles)
source.hide_render=True;source.hide_viewport=True
bpy.ops.object.select_all(action='DESELECT')
for o in export.objects:o.select_set(True)
path=OUT/'caixa-suprimentos-v001.glb'
bpy.ops.export_scene.gltf(filepath=str(path),use_selection=True,export_format='GLB',export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_cameras=False,export_lights=False,export_force_sampling=True,export_anim_slide_to_zero=True)
# Studio framing, backdrop, lights, compositor glow. Display-only, excluded from export.
sc.world=bpy.data.worlds.new('Estudio');sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.16,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Chao_Estudio';move(floor,studio);floor.location.z=-.012;floor.data.materials.append(material('Estudio_Chao','#282e31',.1,.72))
def light(name,loc,power,size,color):
 l=bpy.data.lights.new(name,'AREA');l.energy=power;l.shape='DISK';l.size=size;l.color=linear(color);o=bpy.data.objects.new(name,l);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(1,-3,5),420,4,'#fff0d8');light('Fill',(-3,-1,2.8),220,3,'#c7e7f0');light('Rim',(1,3,3),480,3,'#e7eced')
cam=bpy.data.cameras.new('Camera_Apresentacao');co=bpy.data.objects.new('Camera_Apresentacao',cam);studio.objects.link(co);co.location=(2.8,-3.5,3.0);co.rotation_euler=(Vector((0,0,1.0))-co.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=3.45;sc.camera=co
sc.render.engine='CYCLES';sc.cycles.samples=48;sc.cycles.use_denoising=True;sc.render.resolution_x=1200;sc.render.resolution_y=1000;sc.render.resolution_percentage=100;sc.view_settings.view_transform='AgX'
sc.use_nodes=True
# Blender 5.1 compositor lives in compositing_node_group.
if hasattr(sc,'compositing_node_group'):
 tree=bpy.data.node_groups.new('Compositor_Caixa','CompositorNodeTree');sc.compositing_node_group=tree
 tree.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor');out=tree.nodes.new('NodeGroupOutput')
else:tree=sc.node_tree;tree.nodes.clear();out=tree.nodes.new('CompositorNodeComposite')
rl=tree.nodes.new('CompositorNodeRLayers');glow=tree.nodes.new('CompositorNodeGlare');glow.inputs['Type'].default_value='Fog Glow';glow.inputs['Quality'].default_value='High';glow.inputs['Threshold'].default_value=1.5;glow.inputs['Size'].default_value=.25;glow.inputs['Strength'].default_value=.65
tree.links.new(rl.outputs['Image'],glow.inputs['Image']);tree.links.new(glow.outputs['Image'],out.inputs['Image'])
for marker,f in [('FECHADA',1),('DESTRAVAR',7),('LUZ_AZUL_PICO',32),('ABERTA',73)]:sc.timeline_markers.new(marker,frame=f)
sc['Instrucao']='Tocar animação 1–73: abertura. Runtime: E dentro de 1,8m aciona Open uma vez e mantém pose final. Sem loot persistente nesta entrega.'
sc.frame_set(1)
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  area.spaces.active.overlay.show_extras=False;area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=3.3;area.spaces.active.region_3d.view_location=(0,0,.65)
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'blend/caixa-suprimentos-v001.blend'))
manifest=dict(id='supply-crate-v001',units='metros',forward='+Z no jogo / -Y no Blender',interaction=dict(marker='INTERACT_Crate',position=[0,0,1.1],radius=1.8,trigger='E',clip='Open',loop=False,clampWhenFinished=True),initialState='closed',durationSeconds=2.4,light=dict(color=CYAN,position=[0,.92,.05],timeline=[[0,0],[.433,0],[.733,70],[1.033,150],[1.433,110],[1.966,35],[2.4,12]],blenderUnit='watts; calibrar intensidade three.js, sem equivalência automática'),collision=dict(type='cuboid',center=[0,.59,0],halfExtents=[.81,.59,.70],meshIsCollider=False),nodes=dict(root=root.name,lid=hinge.name,reveal=reveal.name),triangles=triangles,drawMeshes=len(groups),glbBytes=path.stat().st_size,gameplay='Shanghai fase 01: duas caixas, E ou botão próximo, +48 munições de reserva no clarão (0,733 s), uma vez por tentativa. Reiniciar/voltar em nova expedição restaura. Sem inventário persistente.')
(OUT/'manifesto.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
(ART/'notas/asset.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('ASSET',triangles,'triangulos',len(groups),'meshes',path.stat().st_size,'bytes')
for name,frame in [('fechada',1),('revelacao',32),('aberta',73)]:
 sc.frame_set(frame);sc.render.filepath=str(ART/f'renders/{name}.png');bpy.ops.render.render(write_still=True)
