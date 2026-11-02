"""Blender 5: clipes complementares de facão no mesmo bind do astronauta.
Originais intactos. Não reexporta nem substitui o astronauta v009 aprovado.
Blender -b --factory-startup -P art-source/armas/facao/scripts/preparar_facao.py
"""
import bpy, json, hashlib, math, statistics
from mathutils import Vector
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
REPO=BASE.parents[2]
PLAYER=REPO/'art-source/personagens/explorador-astronauta'
MAP={'Machete_Idle':('Espada_duas_maos_Idle.fbx',True),
     'Machete_Run':('Espada_duas_maps_Run.fbx',True),
     'Machete_Backward':('espada_duas_maos_back_Run.fbx',True),
     'Machete_Slash':('espada_duas_maos_Slash.fbx',False),
     'Machete_Block':('espada_duas_maos_blocking.fbx',True)}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for f in json.loads((BASE/'notas/fontes-v001.json').read_text()):assert sha(BASE/f['copy'])==f['sha256']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.fps=30

def imported(file):
 before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(file));objects=[o for o in bpy.data.objects if o not in before]
 return next(o for o in objects if o.type=='ARMATURE'),next(o for o in objects if o.type=='MESH'),objects

def set_action(arm,action):
 arm.animation_data_create();arm.animation_data.action=action;arm.animation_data.action_slot=action.slots[0]

def curves(action):
 return [fc for layer in action.layers for strip in layer.strips for slot in action.slots for bag in [strip.channelbag(slot)] if bag for fc in bag.fcurves]
master,mesh,_=imported(PLAYER/'mixamo/Idle.fbx');master.name='ExploradorAstronauta';mesh.name='Astronauta_SemMochila'
scene.frame_set(1);bpy.context.view_layer.update();anchor=(master.matrix_world@master.pose.bones['mixamorig:Hips'].head).copy()
ref=json.loads((PLAYER/'notas/f1-v009.json').read_text());K=ref['escala'];origin=ref['ajuste_origem_blender_m']
report={'blender':bpy.app.version_string,'fps':30,'escala':K,'base_glb_sha256':sha(REPO/'src/assets/characters/player/explorador-astronauta.glb'),'base_bind_sha256':sha(PLAYER/'mixamo/Idle.fbx'),'root_motion':'Hips X/Y neutralizados no mundo Blender; altura e rotações preservadas','clipes':[]}
actions={}
for name,(file,loop) in MAP.items():
 arm,_,objects=imported(BASE/'fontes'/file);source=arm.animation_data.action
 assert set(arm.data.bones.keys())==set(master.data.bones.keys()),file
 bind=max(abs(arm.data.bones[n].matrix_local[i][j]-master.data.bones[n].matrix_local[i][j]) for n in master.data.bones.keys() for i in range(4)for j in range(4));assert bind<1e-5,(file,bind)
 start,end=map(int,source.frame_range);poses=[];samples=[]
 # O importador restaura o frame rate gravado no FBX; amostra no tempo original.
 fps=scene.render.fps/scene.render.fps_base
 for frame in range(start,end+1):
  scene.frame_set(frame);bpy.context.view_layer.update();poses.append((arm.matrix_world@arm.pose.bones['mixamorig:Hips'].matrix).copy())
  samples.append({n:(arm.matrix_world@arm.pose.bones['mixamorig:'+n].head)*K for n in ['Hips','LeftToeBase','RightToeBase']})
 action=source.copy();action.name=name;action.use_fake_user=True;set_action(arm,action)
 for frame,world in zip(range(start,end+1),poses):
  scene.frame_set(frame);desired=world.copy();desired.translation.x=anchor.x;desired.translation.y=anchor.y
  local=arm.data.bones['mixamorig:Hips'].matrix_local.inverted()@arm.matrix_world.inverted()@desired
  arm.pose.bones['mixamorig:Hips'].location=local.translation;arm.pose.bones['mixamorig:Hips'].keyframe_insert('location',frame=frame,group='mixamorig:Hips')
 # Export comum a 30 Hz; fontes 60 Hz preservam duração e movimento.
 if abs(fps-30)>1e-5:
  for fc in curves(action):
   for key in fc.keyframe_points:
    for handle in [key.co,key.handle_left,key.handle_right]:handle.x=1+(handle.x-start)*30/fps
 for fc in curves(action):
  for key in fc.keyframe_points:key.interpolation='LINEAR'
 duration=(end-start)/fps;speed=None
 if name in ['Machete_Run','Machete_Backward']:
  sign=-1 if name=='Machete_Backward' else 1;values=[]
  for foot in ['LeftToeBase','RightToeBase']:
   low=min(s[foot].z for s in samples)
   for a,b in zip(samples,samples[1:]):
    v=((b[foot].y-b['Hips'].y)-(a[foot].y-a['Hips'].y))*fps*sign
    if a[foot].z<=low+.025 and b[foot].z<=low+.025 and v>0:values.append(v)
  speed=statistics.median(values) if values else abs(samples[-1]['Hips'].y-samples[0]['Hips'].y)/max(duration,.001)
  assert speed>.1,(name,speed)
 delta=samples[-1]['Hips']-samples[0]['Hips']
 report['clipes'].append({'name':name,'file':file,'source_frames':[start,end],'source_fps':fps,'duration':duration,'loop':loop,'root_original_m':list(delta),'referenceSpeed':speed,'runtime':name!='Machete_Block'})
 actions[name]=action
 for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)
for a in list(bpy.data.actions):
 if a not in actions.values():bpy.data.actions.remove(a)
scene.render.fps=30
set_action(master,actions['Machete_Idle']);master.scale=(K,)*3;master.location=origin;scene.frame_set(1);bpy.context.view_layer.update()
# O runtime usa apenas estas animações; a malha mantém o bind/skin para exportação confiável.
# Material sem texturas evita duplicar o atlas do astronauta já carregado no runtime.
for material in mesh.data.materials:
 if material.use_nodes:
  for node in list(material.node_tree.nodes):
   if node.type=='TEX_IMAGE':material.node_tree.nodes.remove(node)
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':node.inputs['Metallic'].default_value=0;node.inputs['Roughness'].default_value=1
report['palms']={n:list(master.matrix_world@master.pose.bones['mixamorig:'+n].head) for n in ['RightHand','LeftHand']}
bpy.ops.object.select_all(action='DESELECT');master.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=master
out=BASE/'export/explorador-facao-v001.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_anim_slide_to_zero=True,export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=True,export_skins=True)
report['glb']={'file':str(out.relative_to(BASE)),'sha256':sha(out),'bytes':out.stat().st_size}
(BASE/'notas/clipes-v001.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('FACAO_REPORT',json.dumps(report))
