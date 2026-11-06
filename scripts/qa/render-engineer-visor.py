"""Renderiza as poses exportadas do rig real por render-engineer-visor.mjs. Não salva .blend/GLB."""
import bpy, json
from pathlib import Path
from mathutils import Vector
root=Path.cwd();out=root/'docs/sprint-3/evidencias/s3.2-primeira-expedicao'
data=json.loads((out/'engineer-visor-poses.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=640;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
suit=bpy.data.materials.new('Traje original');suit.use_nodes=True
tex=suit.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/'art-source/personagens/engenheiro/texturas/v001/base_color.png'))
bsdf=suit.node_tree.nodes.get('Principled BSDF');suit.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.8
materials={'suit':suit}
for name,strength in [('stripe',3),('halo',.3)]:
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear();o=n.new('ShaderNodeOutputMaterial');e=n.new('ShaderNodeEmission');e.inputs[0].default_value=(.07036,.65837,1,1);e.inputs[1].default_value=strength
 if name=='halo':
  mix=n.new('ShaderNodeMixShader');mix.inputs[0].default_value=.14;t=n.new('ShaderNodeBsdfTransparent');m.node_tree.links.new(t.outputs[0],mix.inputs[1]);m.node_tree.links.new(e.outputs[0],mix.inputs[2]);m.node_tree.links.new(mix.outputs[0],o.inputs[0])
 else:m.node_tree.links.new(e.outputs[0],o.inputs[0])
 materials[name]=m
for p,power,size in [((2,-3,4),400,4),((-3,-1,2),250,3),((0,3,3),300,3)]:
 bpy.ops.object.light_add(type='AREA',location=p);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=1.8;scene.camera=camera
scene.render.image_settings.file_format='PNG'
for pose in data['poses']:
 objects=[]
 for item in pose['meshes']:
  a=item['positions'];verts=[(a[i],-a[i+2],a[i+1])for i in range(0,len(a),3)];idx=item['indices'];faces=[idx[i:i+3]for i in range(0,len(idx),3)]
  mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(item['name'],mesh);scene.collection.objects.link(obj);objects.append(obj);mesh.materials.append(materials[item['material']])
  if item['uv']:
   uv=mesh.uv_layers.new();a=item['uv']
   for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index*2],1-a[loop.vertex_index*2+1])
 target=Vector((0,0,(pose['bounds'][0][1]+pose['bounds'][1][1])/2))
 for name,offset in [('frente',(0,-4,.05)),('perfil',(4,0,.05))]:
  camera.location=target+Vector(offset);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f"engenheiro-faixa-{pose['animation'].lower()}-{name}.png");bpy.ops.render.render(write_still=True)
 for obj in objects:mesh=obj.data;bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
