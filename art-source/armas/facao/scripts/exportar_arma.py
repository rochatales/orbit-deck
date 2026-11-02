"""Export isolado da fonte glTF do autor, marcadores de pega e ícone 3D.
Blender -b --factory-startup -P art-source/armas/facao/scripts/exportar_arma.py
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
source=BASE/'fontes/Sci-fi Energy Sword-f13f5e9ef449e19e4a0074055bc7bd6c.glb'
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.data.objects if o.type=='MESH']
# Cópia de runtime conserva modelo e material; originais permanecem byte a byte.
for obj in meshes:
 for material in obj.data.materials:
  if not material.use_nodes:continue
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':node.inputs['Metallic'].default_value=0;node.inputs['Roughness'].default_value=1
root=bpy.data.objects.new('Facao',None);bpy.context.collection.objects.link(root)
for obj in list(bpy.context.scene.objects):
 if obj!=root and obj.parent is None:obj.parent=root
for name,p in [('Grip_R',(0,0,.21)),('Grip_L',(0,0,.39)),('Tip',(0,0,-.50))]:
 marker=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(marker);marker.parent=root;marker.location=p
bpy.ops.object.select_all(action='SELECT')
out=BASE/'export/facao-v001.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
root.rotation_euler[1]=math.pi
# Ícone do próprio asset: fundo transparente, luz de estúdio, sem alterar o modelo.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('StudioWorld');scene.world.color=(.35,.35,.35)
cam_data=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',cam_data);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(1,-3,1);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=1.3
for p,power,size in [((1,-3,3),300,4),((-2,-1,1),200,3)]:
 data=bpy.data.lights.new('Studio','AREA');data.energy=power;data.shape='DISK';data.size=size;obj=bpy.data.objects.new('Studio',data);scene.collection.objects.link(obj);obj.location=p;obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(BASE/'export/facao-icon-v001.png');bpy.ops.render.render(write_still=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(BASE/'notas/arma-v001.json').write_text(json.dumps({'source':str(source.relative_to(BASE)),'source_sha256':sha(source),'glb_sha256':sha(out),'icon_sha256':sha(BASE/'export/facao-icon-v001.png'),'length_m':1.002528,'markers':{'Grip_R':[0,.21,0],'Grip_L':[0,.39,0],'Tip':[0,-.5,0]}},indent=2)+'\n')
