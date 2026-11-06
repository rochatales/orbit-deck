"""Engenheiro v001: ingere sem sobrescrever, mede clipes e exporta somente cópias.
Blender -b --factory-startup -P art-source/personagens/engenheiro/scripts/preparar.py -- --ingest <pasta>
"""
import argparse,hashlib,json,math,shutil,sys,statistics
from pathlib import Path
import bpy
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--ingest',type=Path);p.add_argument('--render',action='store_true');args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
FILES=['Low Poly Astronaut-78acc9c1336513cf1664d8c933d81298.fbx','Low Poly Astronaut-c795549d8c248f11fc98ae4c72ab05a2.glb','Acknowledging.fbx','Crouch To Stand.fbx','Shoved Reaction With Spin.fbx','Start Walking.fbx','white_astronaut_Sitting.fbx','white_astronaut_Yelling.fbx']
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
if args.ingest:
 for name in FILES:
  source=args.ingest/name;target=BASE/'fontes'/name
  if target.exists():assert sha(target)==sha(source),name
  else:shutil.copy2(source,target)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.fps=30
imports={}
for name in FILES:
 if not name.endswith('.fbx') or name.startswith('Low Poly'):continue
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(BASE/'fontes'/name))
 objects=list(set(bpy.data.objects)-before);arm=next(o for o in objects if o.type=='ARMATURE');mesh=next(o for o in objects if o.type=='MESH')
 imports[name]=(arm,mesh,arm.animation_data.action)
master,mesh,_=imports['Acknowledging.fbx'];master.name='Engenheiro';mesh.name='Engenheiro_TrajeBranco'
rest={b.name:b.matrix_local.copy()for b in master.data.bones}
for name,(arm,_,_)in imports.items():
 assert set(rest)==set(arm.data.bones.keys()),name
 error=max(abs(arm.data.bones[n].matrix_local[i][j]-rest[n][i][j])for n in rest for i in range(4)for j in range(4))
 assert error<1e-4,(name,error)
def setaction(arm,action):
 arm.animation_data_create();arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0] if action.slots else None
 # No assignment to a nonexistent slot for a newly created action.
def points(obj):
 evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());data=evaluated.to_mesh();out=[evaluated.matrix_world@v.co for v in data.vertices];evaluated.to_mesh_clear();return out
scene.frame_set(1);bpy.context.view_layer.update();v=points(mesh);floor=min(p.z for p in v);height=max(p.z for p in v)-floor;K=2.23/height
anchor=master.matrix_world@master.pose.bones['mixamorig:Hips'].head
# Cache toda a pose antes de escrever qualquer ação de saída.
samples={};measure=[]
for name,(arm,obj,action)in imports.items():
 setaction(arm,action);start,end=map(int,action.frame_range);frames=[]
 for f in range(start,end+1):
  scene.frame_set(f);bpy.context.view_layer.update()
  frames.append({'basis':{b.name:b.matrix_basis.copy()for b in arm.pose.bones},'hips':(arm.matrix_world@arm.pose.bones['mixamorig:Hips'].matrix).copy(),'feet':[(arm.matrix_world@arm.pose.bones['mixamorig:'+n].head)for n in ['LeftFoot','LeftToeBase','RightFoot','RightToeBase']]})
 samples[name]=frames
 measure.append({'file':name,'frames':len(frames),'duration':(len(frames)-1)/30,'root_delta_m':list((frames[-1]['hips'].translation-frames[0]['hips'].translation)*K)})
# Recorte de passada mais próximo de um ciclo, excluindo a arrancada.
w=samples['Start Walking.fbx'];best=None
for a in range(25,52):
 for b in range(a+23,len(w)):
  delta=w[b]['hips'].translation-w[a]['hips'].translation
  if abs(delta.y)*K<.4:continue
  error=sum(((w[a]['feet'][i]-w[a]['hips'].translation)-(w[b]['feet'][i]-w[b]['hips'].translation)).length_squared for i in range(4))
  if best is None or error<best[0]:best=(error,a,b)
_,wa,wb=best
natural=abs(w[wb]['hips'].translation.y-w[wa]['hips'].translation.y)*K/((wb-wa)/30)
clips=[('Idle','Acknowledging.fbx',[0,0]),('Acknowledging','Acknowledging.fbx',None),('Yelling','white_astronaut_Yelling.fbx',None),('Sitting','white_astronaut_Sitting.fbx',None),('CrouchToStand','Crouch To Stand.fbx',None),('CrouchDown','Crouch To Stand.fbx',list(reversed(range(78)))),('Crouch','Crouch To Stand.fbx',list(range(10))+list(range(8,-1,-1))),('ShovedReaction','Shoved Reaction With Spin.fbx',None),('StartWalking','Start Walking.fbx',None),('Walk','Start Walking.fbx',list(range(wa,wb+1)))]
exported=[];rootbone=master.pose.bones['mixamorig:Hips']
for name,file,indices in clips:
 data=samples[file];indices=indices if indices is not None else list(range(len(data)))
 action=bpy.data.actions.new(name);action.use_fake_user=True
 master.animation_data_create();master.animation_data.action=action
 for pb in master.pose.bones:pb.rotation_mode='QUATERNION'
 for frame,index in enumerate(indices,1):
  sample=data[index]
  for pb in master.pose.bones:
   if pb.name=='mixamorig:Hips':
    desired=sample['hips'].copy();desired.translation.x=anchor.x;desired.translation.y=anchor.y
    matrix=master.data.bones[pb.name].matrix_local.inverted()@master.matrix_world.inverted()@desired
   else:matrix=sample['basis'][pb.name]
   loc,rot,scale=matrix.decompose();pb.location=loc;pb.rotation_quaternion=rot;pb.scale=scale
   pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame);pb.keyframe_insert('scale',frame=frame)
  # Não altera os originais: só esta ação derivada recebe o apoio no chão.
  scene.frame_set(frame);bpy.context.view_layer.update();lo=min(p.z for p in points(mesh))
  if lo<floor:
   world=master.matrix_world@rootbone.matrix;world.translation.z+=floor-lo
   local=master.data.bones[rootbone.name].matrix_local.inverted()@master.matrix_world.inverted()@world
   rootbone.location=local.translation;rootbone.keyframe_insert('location',frame=frame)
 exported.append(action)
# Remove instâncias de fonte da seleção/cena; os arquivos de origem continuam intactos.
for name,(arm,obj,action)in imports.items():
 if arm is not master:
  bpy.data.objects.remove(obj,do_unlink=True);bpy.data.objects.remove(arm,do_unlink=True)
for action in list(bpy.data.actions):
 if action not in exported:bpy.data.actions.remove(action)
setaction(master,exported[0]);scene.frame_set(1)
master.scale*=K;master.location.x-=anchor.x*K;master.location.y-=anchor.y*K;master.location.z-=floor*K
# FBX do Mixamo exagera o metal; conserva o traje dielétrico branco e o visor.
for material in mesh.data.materials:
 if material.use_nodes:
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':node.inputs['Metallic'].default_value=0;node.inputs['Roughness'].default_value=.8
# Quatro influências por vértice: contrato do SkinnedMesh/GLTFLoader atual.
weights=[]
for vertex in mesh.data.vertices:
 groups=sorted([(g.group,g.weight)for g in vertex.groups if g.weight>0],key=lambda pair:pair[1],reverse=True)
 total=sum(w for _,w in groups);lost=sum(w for _,w in groups[4:]);weights.append(lost/total if total else 0)
 for group,_ in groups[4:]:mesh.vertex_groups[group].remove([vertex.index])
 kept=sum(w for _,w in groups[:4])
 if kept:
  for group,w in groups[:4]:mesh.vertex_groups[group].add([vertex.index],w/kept,'REPLACE')
textures=[];texture_dir=BASE/'texturas/v001';texture_dir.mkdir(parents=True,exist_ok=True);seen={}
for material in mesh.data.materials:
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  old=node.image
  if old.name not in seen:
   original=list(old.size);space=old.colorspace_settings.name
   if max(old.size)>1024:old.scale(1024,1024)
   path=texture_dir/(old.name.replace('/','_')+'.png');old.filepath_raw=str(path);old.file_format='PNG';old.save()
   own=bpy.data.images.load(str(path),check_existing=False);own.colorspace_settings.name=space;seen[old.name]=own
   textures.append({'file':str(path.relative_to(BASE)),'source_size':original,'size':list(own.size),'sha256':sha(path)})
  node.image=seen[old.name]
bpy.ops.object.select_all(action='DESELECT');master.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=master
out=BASE/'export/engenheiro-v001.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_anim_slide_to_zero=True,export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=True)
manifest={'textures':textures,'weights_top4':{'max_discarded':max(weights),'mean_discarded':statistics.mean(weights)},'version':1,'blender':bpy.app.version_string,'height_m':2.23,'scale':K,'sources':[{'file':name,'sha256':sha(BASE/'fontes'/name),'bytes':(BASE/'fontes'/name).stat().st_size}for name in FILES],'bones':len(rest),'clips':[{'name':a.name,'duration':(a.frame_range[1]-a.frame_range[0])/30}for a in exported],'source_measurements':measure,'walk':{'first_frame':wa+1,'last_frame':wb+1,'speed_m_s':natural,'feet_pose_error_m':math.sqrt(best[0])*K},'root_motion':'Horizontal neutralizado em todas as ações; giro/elevação originais preservados, apoio no piso só nas cópias.','output':{'file':out.name,'bytes':out.stat().st_size,'sha256':sha(out)}}
(BASE/'notas/export-v001.json').write_text(json.dumps(manifest,indent=2));bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'export/engenheiro-v001.blend'))
print('ENGENHEIRO_EXPORT_OK')

if args.render:
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=480;scene.render.resolution_y=560;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.1,.13,1)
 bpy.ops.mesh.primitive_plane_add(size=200);plane=bpy.context.object;plane.name='PisoQA'
 mat=bpy.data.materials.new('Piso');mat.diffuse_color=(.08,.10,.12,1);plane.data.materials.append(mat)
 for loc,power,size in [((3,-4,6),650,5),((-4,-1,3),450,4),((0,4,5),800,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(3,-5,3));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.7;scene.camera=camera
 renders=BASE/'notas/renders';renders.mkdir(exist_ok=True)
 for name,frame in [('Acknowledging',34),('Yelling',100),('Sitting',120),('Crouch',8),('Walk',18),('ShovedReaction',65)]:
  action=next(a for a in exported if a.name==name);setaction(master,action);scene.frame_set(frame);bpy.context.view_layer.update();scene.render.filepath=str(renders/(name+'.png'));bpy.ops.render.render(write_still=True)
