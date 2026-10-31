"""Renders de estudo, nunca salva sobre a fonte. Estúdio fora da exportação."""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/control_room_v001.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=4;s.render.resolution_x=1000;s.render.resolution_y=900;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.22,.26,.28,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.5
asset=list(bpy.context.scene.objects);parts={o.name:o for o in asset};origin=Vector((0,10.5,0))
def material(n,col):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*col,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8;return m
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,10.5,-.025));bpy.context.object.data.materials.append(material('STUDIO_Ground',(.14,.105,.08)))
for name,p,power,size,col in [('Key',(-5,-7,11),2100,8,(1,.85,.67)),('Fill',(7,-3,7),1400,7,(.7,.85,1)),('Rim',(-1,6,9),1800,6,(1,.75,.55)),('Interior',(0,0,2.5),45,3,(.5,.9,1))]:
 bpy.ops.object.light_add(type='AREA',location=origin+Vector(p));o=bpy.context.object;o.name='STUDIO_'+name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(origin+Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera;camera.data.type='ORTHO'
def render(name,p,target=(0,0,1.4),scale=11):
 camera.location=origin+Vector(p);camera.rotation_euler=(origin+Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale;s.render.filepath=str(ROOT/'renders'/f'{name}.png');bpy.ops.render.render(write_still=True)
def state(roof=True,interaction=False,doors=True):
 for o in asset:
  hidden=(not roof and (o.get('papel')=='roof' or 'TET_Control' in o.get('apoiado_em',''))) or (o.get('estado_operacao')=='interaction' and not interaction) or (o.get('papel')=='door' and not doors)
  o.hide_render=hidden
state()
for name,p in [('01_front',(0,-18,1.55)),('02_side',(18,0,1.55)),('03_back',(0,18,1.55)),('04_exterior',(-10,-13,10)),('05_top',(0,0,20))]:render(name,p)
state(False,False,False);render('06_interior_sem_teto',(10,-13,17),scale=10.4)
# Diagnostic cutaway only, not a proposed runtime wall cut.
for name in ['ARQ_Control_Parede_S','ARQ_Control_Parede_O','ARQ_Control_Portal_S','PROP_Control_Status_S','ARQ_Control_Cantos','VID_Control']:parts[name].hide_render=True
render('07_maquete_interior',(-10,-13,11),scale=10.4)
state(False,True,False);render('08_interacao',(5,-10,8),scale=8)
# Floor plan, open doors, overhead shows circulation; no fabricated game screenshot.
state(False,False,False);render('09_planta',(0,0,20),(0,0,0),9)
# Maximum camera zoom at 1000x900: width44/depth54, cameraFit*3.25.
state(True);render('10_camera_jogo_estudo',(13,-13,13.55),(0,0,.55),(900/(min(1000/35.2,900/35.1)*3.25))*(1000/900))
# Wireframe of production geometry.
wire=material('QA_Wire',(.6,.67,.7));n=wire.node_tree.nodes;l=wire.node_tree.links;p=n.get('Principled BSDF');w=n.new('ShaderNodeWireframe');w.use_pixel_size=True;w.inputs['Size'].default_value=.7;mix=n.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.58,.68,.7,1);mix.inputs[2].default_value=(.01,.02,.03,1);l.new(w.outputs[0],mix.inputs[0]);l.new(mix.outputs[0],p.inputs['Base Color'])
original={o.name:list(o.data.materials) for o in asset if o.type=='MESH'}
for o in asset:
 if o.type=='MESH':o.data.materials.clear();o.data.materials.append(wire)
state(True);render('11_wireframe',(-10,-13,10))
for o in asset:
 if o.type=='MESH':
  o.data.materials.clear()
  for m in original[o.name]:o.data.materials.append(m)
# Actual legacy room from GLB, filtered by stable IDs in its manifest.
for o in asset:o.hide_render=True
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(REPO/'src/assets/colony-v007.glb'));added=[o for o in bpy.data.objects if o not in before]
legacy=json.loads((REPO/'src/assets/colony-v007.manifest.json').read_text());ids={p['id'] for p in legacy['parts'] if p.get('ambiente')=='brand-brain'}
for o in added:
 sid=o.get('id_estavel',o.name);o.hide_render=sid not in ids
render('12_sala_anterior',(-10,-13,10))
for o in added:
 if o.get('papel')=='roof' or o.name.startswith('T_') or o.name.startswith('TET_'):o.hide_render=True
render('13_anterior_interior',(10,-13,17),scale=10.4)
print('RENDERS CONCLUÍDOS — fonte não modificada')
