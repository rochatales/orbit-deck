"""Compare evaluated world vertices before/after glTF import, all clip samples."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];source=ROOT/'blend/hangar_mars_v002.blend';glb=ROOT/'export/hangar_mars_v002.glb'
bpy.ops.wm.open_mainfile(filepath=str(source));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];mesh=bpy.data.objects['HangarMesh'];arm=bpy.data.objects['HangarArmature']
clips={'Idle':60,'CraneWork':48,'RampOpenClose':40,'AlertPulse':36}
def snapshot(obj):
 bpy.context.view_layer.update()
 ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();p=[ev.matrix_world@v.co for v in me.vertices];ev.to_mesh_clear();return p
reference={}; source_actions={}; matrices={}
for name,end in clips.items():
 for t in arm.animation_data.nla_tracks:t.mute=True
 arm.animation_data.action=bpy.data.actions[name]
 arm.animation_data.action_slot=bpy.data.actions[name].slots[0]
 reference[name]={}
 for f in sorted(set([1,end,*range(1,end+1,4)])):
  bpy.context.scene.frame_set(f);reference[name][f]=[p for o in meshes for p in snapshot(o)];matrices[name,f]={b.name:[list(row) for row in b.matrix] for b in arm.pose.bones}
for t in arm.animation_data.nla_tracks:t.mute=True
# Save original rigid group names/counts, verify normalization.
weights=[sum(g.weight for g in v.groups) for v in mesh.data.vertices];assert all(abs(w-1)<1e-6 for w in weights)
original_bones=[b.name for b in arm.data.bones]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(glb));bpy.context.scene.render.fps=30
imported=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)];assert len(imported)==2;all_imported=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name in {'HangarMesh','TETO_Hangar','D_hangar_north_L','D_hangar_north_R','D_hangar_east_L','D_hangar_east_R'}];im=imported[0];ia=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');assert sorted(original_bones)==sorted(b.name for b in ia.data.bones)
# glTF importer creates an action slot and a muted NLA track per animation.
tracks={t.name:t for t in ia.animation_data.nla_tracks};results={}
from mathutils.kdtree import KDTree
for name,frames in reference.items():
 matching=[t for t in tracks.values() if name in t.name];assert len(matching)==1,(name,list(tracks))
 if ia.animation_data.action:ia.animation_data.action=None
 for t in tracks.values():t.mute=t!=matching[0]
 max_error=0;minimum_z=100
 for f,ref in frames.items():
  bpy.context.scene.frame_set(f);points=[p for o in all_imported for p in snapshot(o)];tree=KDTree(len(ref))
  for i,p in enumerate(ref):tree.insert(p,i)
  tree.balance();reverse=KDTree(len(points))
  for i,p in enumerate(points):reverse.insert(p,i)
  reverse.balance()
  error=max(max(tree.find(p)[2] for p in points),max(reverse.find(p)[2] for p in ref));max_error=max(max_error,error)
  minimum_z=min(minimum_z,min(p.z for p in points))
 results[name]={'max_vertex_distance_m':max_error,'sampled_frames':len(frames),'minimum_z_m':minimum_z}
 assert max_error<.0002,(name,max_error)
 assert minimum_z>=-.01,(name,minimum_z) # Peças baixas da rampa: tolerância de até 1 cm no chão.
results['weights_normalized']=True;results['bone_count']=len(original_bones);results['imported_meshes']=len(imported)
results['sha256']={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [source,glb]}
(ROOT/'notas/roundtrip_v002.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
