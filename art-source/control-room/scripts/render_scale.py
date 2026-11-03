"""Escala com o Explorador r7 ativo por padrão; referência só no render."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/control_room_v001.blend'));s=bpy.context.scene
for o in list(s.objects):
 o.hide_render=o.get('papel') in ['roof','door'] or 'TET_Control' in o.get('apoiado_em','') or o.get('estado_inicial')=='oculto' or o.name in ['ARQ_Control_Parede_S','ARQ_Control_Parede_O','ARQ_Control_Portal_S','PROP_Control_Status_S','ARQ_Control_Cantos','VID_Control']
before=set(bpy.data.objects);player=REPO/'src/assets/characters/player/explorador-r7.glb';bpy.ops.import_scene.gltf(filepath=str(player));added=[o for o in bpy.data.objects if o not in before]
bpy.ops.object.empty_add();root=bpy.context.object;root.name='REF_Explorador_R7'
for o in added:
 if not o.parent:o.parent=root
 if o.type=='ARMATURE':
  o.animation_data.action=None
  for t in o.animation_data.nla_tracks:t.mute='Idle' not in t.name
render_meshes=[o for o in added if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
for o in added:
 if o.type=='MESH' and o not in render_meshes:o.hide_render=True
root.scale=(.857,)*3;s.frame_set(1);bpy.context.view_layer.update()
pts=[]
for o in render_meshes:
 ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();pts += [ev.matrix_world@v.co for v in me.vertices];ev.to_mesh_clear()
height=max(v.z for v in pts)-min(v.z for v in pts);assert 1.4<height<1.6,height
root.location=(0,8.9,-min(v.z for v in pts));bpy.context.view_layer.update()
s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=4;s.render.resolution_x=1000;s.render.resolution_y=900;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[1].default_value=.65
for pos,power,size in [((-5,3,10),2000,8),((7,5,8),1600,6),((0,16,9),1700,6)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,10.5,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=100,location=(0,10.5,-.16));bpy.ops.object.camera_add(location=(-10,-2.5,11));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=10.4;cam.rotation_euler=(Vector((0,10.5,1.2))-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=str(ROOT/'renders/14_escala_explorador.png');bpy.ops.render.render(write_still=True)
(ROOT/'notas/escala_explorador.json').write_text(json.dumps({'source':str(player.relative_to(REPO)),'sha256':hashlib.sha256(player.read_bytes()).hexdigest(),'scale':.857,'evaluated_idle_height_m':height,'included_in_control_room_export':False},indent=2));print('ALTURA R7',height)
