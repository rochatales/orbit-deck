import bpy,json,sys,argparse
from pathlib import Path
from mathutils import Vector
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'fontes');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []);root=args.source
names=['Low Poly Astronaut-78acc9c1336513cf1664d8c933d81298.fbx','Acknowledging.fbx','Crouch To Stand.fbx','Shoved Reaction With Spin.fbx','Start Walking.fbx','white_astronaut_Sitting.fbx','white_astronaut_Yelling.fbx']
report=[]
for name in names:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(root/name))
 arms=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']; meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];arm=arms[0] if arms else None
 action=arm.animation_data.action if arm and arm.animation_data else None
 row={'file':name,'arm':arm.name if arm else None,'bones':len(arm.data.bones) if arm else 0,'bone_names':list(arm.data.bones.keys()) if arm else [],'objects':[o.name for o in meshes],'fps':bpy.context.scene.render.fps,'action':action.name if action else None,'range':list(action.frame_range) if action else None,'arm_scale':list(arm.scale) if arm else []}
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];row['bbox']={'min':[min(p[i]for p in points)for i in range(3)],'max':[max(p[i]for p in points)for i in range(3)]}
 if action:
  samples=[]
  for frame in [int(action.frame_range[0]),int(sum(action.frame_range)/2),int(action.frame_range[1])]:
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();b=arm.pose.bones.get('mixamorig:Hips') or arm.pose.bones[0];samples.append({'frame':frame,'hips':list(arm.matrix_world@b.head)})
  row['samples']=samples
 report.append(row)
Path('art-source/personagens/engenheiro/notas/inspecao-fontes.json').write_text(json.dumps(report,indent=2))
print('INSPECAO_OK')
