"""Renders de estudo da v002. Não salva nem modifica os .blend preservados."""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'renders/v002';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/hangar_mars_v002.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=4
s.render.resolution_x=1100;s.render.resolution_y=900;s.render.resolution_percentage=100
s.view_settings.view_transform='AgX';s.world.use_nodes=True
s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.24,.29,.33,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.55
mat=bpy.data.materials.new('StudioGround');mat.diffuse_color=(.075,.095,.11,1);mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.075,.095,.11,1);p.inputs['Roughness'].default_value=.85
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));bpy.context.object.data.materials.append(mat)
for name,pos,power,size,col in [('Key',(-6,-8,12),2300,8,(1,.84,.65)),('Fill',(7,-5,8),2400,7,(.64,.84,1)),('Rim',(0,7,10),2600,6,(1,.72,.48)),('Bay',(0,-4,2.4),130,2,(1,.80,.55))]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name='STUDIO_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(name,pos,target,scale):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('01_frente_sul',(0,-19,6),(0,-.9,1.9),12.5)
render('02_tres_quartos_leste',(13,-17,12),(0,-.8,1.8),14.5)
render('03_porta_norte',(1,18,7),(0,1,1.8),12)
# Planta oblíqua com teto ao lado: comprova peça separada, folhas abertas e passagem interior.
roof=bpy.data.objects['TETO_Hangar'];roof.location.x-=11;roof.location.z+=1
for o in bpy.data.objects:
 if not o.name.startswith('D_hangar_'):continue
 o.location.x+=o['slide_x'];o.location.y-=o['slide_z']
render('04_superior_teto_separado',(-4,-.8,28),(-4,-.8,1.0),25)
roof.hide_render=True
render('05_superior_interior',(8,-12,23),(0,-.8,.6),12.5)
