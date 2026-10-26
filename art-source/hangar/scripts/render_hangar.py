"""Studio renders from the saved final source. Never saves over the .blend."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/hangar_mars_v001.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=4
s.render.resolution_x=800;s.render.resolution_y=720;s.render.resolution_percentage=100
s.view_settings.view_transform='AgX';s.world.color=(.17,.17,.17)
world=s.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.24,.29,.33,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.45
mesh=bpy.data.objects['HangarMesh'];arm=bpy.data.objects['HangarArmature']
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8;return m
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));ground=bpy.context.object;ground.name='STUDIO_Floor';ground.data.materials.append(mat('StudioSlate',(.095,.12,.14)))
for name,pos,power,size,col in [('Key',(-6,-8,12),2300,8,(1,.84,.65)),('Fill',(7,-5,8),1900,7,(.64,.84,1)),('Rim',(0,7,10),2600,6,(1,.72,.48)),('Bay',(0,-4,2.4),75,2,(1,.80,.55))]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name='STUDIO_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='STUDIO_Camera';s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=13.4
views=[('01_front',(0,-19,2.15),(0,-.7,2.15)),('02_side',(19,0,2.15),(0,-.7,2.15)),('03_back',(0,19,2.15),(0,-.7,2.15)),('04_3q',(-12,-16,11),(0,-.9,1.7))]
def render(name,pos,target,scale=13.4):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.filepath=str(ROOT/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)
if '--hero' in sys.argv:
 render(*views[3]);sys.exit()
for v in views:render(*v)
# Wireframe overlay of the actual production topology (quads plus triangles).
wire=bpy.data.materials.new('QA_Wire');wire.use_nodes=True;n=wire.node_tree.nodes;l=wire.node_tree.links;p=n.get('Principled BSDF');wf=n.new('ShaderNodeWireframe');wf.use_pixel_size=True;wf.inputs['Size'].default_value=.75;mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.55,.67,.69,1);mix.inputs[2].default_value=(.01,.025,.03,1);l.new(wf.outputs[0],mix.inputs[0]);l.new(mix.outputs[0],p.inputs['Base Color']);p.inputs['Roughness'].default_value=.8
original=mesh.data.materials[0];mesh.data.materials[0]=wire
for n,pos,target in views:render('wf_'+n,pos,target)
mesh.data.materials[0]=original
for clip,frames in [('Idle',[1,16,31,46]),('CraneWork',[1,13,25,37]),('RampOpenClose',[1,11,20,40]),('AlertPulse',[1,10,19,28])]:
 for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!=clip
 for f in frames:s.frame_set(f);render(f'anim_{clip}_{f:03}',*views[3][1:])
for tr in arm.animation_data.nla_tracks:tr.mute=True
s.frame_set(1)
# CameraRig angle = atan(13/18.38); max zoom calibrated to colony bounds in report.
render('jogo_zoom_maximo',(13,-13,13.55),(0,0,.55),(900/(min(1000/35.2,900/35.1)*3.25))*(1000/900))
