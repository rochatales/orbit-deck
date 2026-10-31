"""Blender 5.1.1. Candidato modular, não altera o jogo ou fontes anteriores."""
import bpy,bmesh,sys,math,json,hashlib
sys.dont_write_bytecode=True
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import geometry as g
from geometry import box,cyl,beam,extrude,pipe
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
manifest=[];meshes=[];groups={};colliders=[]
def group(name,role='detail',support=(),state='visivel',operation='both'):
 groups[name]={'start':len(g.parts),'papel':role,'support':list(support),'state':state,'operation':operation}
 return name
def end(name):
 spec=groups[name];objects=g.parts[spec['start']:];assert objects
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 o.location.z-=.15 # finished floor matches current colony ground (0).
 o.location.y+=10.5 # Blender -Y maps to game +Z: center (0,-10.5).
 for key,value in {'id_estavel':name,'papel':spec['papel'],'ambiente':'brand-brain','estado_inicial':spec['state'],'estado_operacao':spec['operation']}.items():o[key]=value
 o['apoiado_em']=json.dumps(spec['support']);o['apoiado_em_todos']='[]'
 meshes.append(o);return o

def col(n,p,h):colliders.append({'id':'COL_CR_'+n,'center':{'x':p[0],'y':p[2]-.15,'z':-p[1]-10.5},'halfExtents':{'x':h[0],'y':h[2],'z':h[1]},'type':'CuboidCollider','proposal':True})
def wallspan(n,p,s):box(n,p,s,10,bev=.025)
def frame(n,p,size,t=1,bev=.015):
 p=Vector(p);thin=0 if size[0]<size[1] else 1;wide=1-thin
 for sign in [-1,1]:
  pos=p.copy();pos.z+=sign*(size[2]/2-.035);dims=list(size);dims[2]=.07;box(n,pos,dims,t,bev=bev)
  pos=p.copy();pos[wide]+=sign*(size[wide]/2-.035);dims=list(size);dims[wide]=.07;dims[2]-=.14;box(n,pos,dims,t,bev=bev)
def front_piece(n,x,w):
 box(n,(x,-3.15,.655),(w,.2,1.01),0,bev=.025)
 box(n,(x,-3.15,2.39),(w,.2,.62),10,bev=.025)
 box(n,(x,-3.15,.16),(w,.23,.24),1,bev=.02)
# Plinth, floor and original tile character: steel/dark warm grid.
group('PIS_Control','floor')
outline=[(-3.5,-2.93),(-3.18,-3.25),(3.18,-3.25),(3.5,-2.93),(3.5,2.93),(3.18,3.25),(-3.18,3.25),(-3.5,2.93)]
# Extruded XY chamfered plinth, via direct mesh (no rectangular corner overhang).
def slab(n,z0,z1,t,outline=outline):
 k=len(outline);v=[(x,y,z) for z in [z0,z1] for x,y in outline];f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);g.finish(o,n,t)
slab('Plinth',0,.12,1);slab('Floor',.12,.15,12)
# Recessed tile joints, not an extra floor material.
for x in range(-3,4):box('TileJoint',(x,0,.153),(.009,6.10,.004),8)
for y in [-2.5,-1.5,-.5,.5,1.5,2.5]:box('TileJoint',(0,y,.153),(6.64,.009,.004),8)
end('PIS_Control');col('Piso',(0,0,.075),(3.5,3.25,.075))
# South facade: preserve existing 2.2 m centered entrance.
group('ARQ_Control_Parede_S','wall')
for x in [-2.2,2.2]:
 front_piece('FrontArmor',x,2.20)
 for xx in [x-.98,x+.98]:box('WindowJamb',(xx,-3.15,1.61),(.13,.2,1.10),0,bev=.015)
 frame('WindowFrame',(x,-3.26,1.62),(1.83,.09,.92),1,bev=.015)
 box('FrontHazard',(x,-3.262,.65),(1.6,.012,.09),7)
 box('ServiceGrille',(x,-3.276,.36),(.9,.025,.23),9)
box('DoorHeader',(0,-3.15,2.53),(2.2,.2,.34),0,bev=.025)
end('ARQ_Control_Parede_S')
for x in [-2.2,2.2]:col('Sul_'+str(x),(x,-3.15,1.4),(1.1,.1,1.3))
# North wall, backend panels and warm structural columns.
group('ARQ_Control_Parede_N','wall')
box('BackBase',(0,3.15,.58),(6.36,.2,.86),0,bev=.025)
box('BackCrown',(0,3.15,2.5),(6.36,.2,.4),10,bev=.025)
for x in [-3.1,-1.7,.0,1.7,3.1]:box('WallRib',(x,3.15,1.5),(.13,.21,2.36),0,bev=.02)
for x in [-2.35,-.85,.85,2.35]:box('Panel',(x,3.15,1.65),(1.37,.19,1.27),10)
end('ARQ_Control_Parede_N');col('Norte',(0,3.15,1.4),(3.18,.1,1.3))
# West panoramic window.
group('ARQ_Control_Parede_O','wall')
for z,h in [(.64,.98),(2.425,.55)]:box('WestArmor',(-3.4,0,z),(.2,5.86,h),10,bev=.02)
for y in [-2.86,-1.8,1.8,2.86]:box('WestRib',(-3.4,y,1.64),(.2,.15,1.33),0,bev=.02)
for y in [-2.37,2.37]:box('WestPanel',(-3.4,y,1.64),(.2,1.10,1.02),10)
frame('PanoramicFrame',(-3.51,0,1.64),(.09,3.65,1.02),1,bev=.015)
# Outside maintenance conduit does not cross an entrance.
for y in [-2.15,2.15]:pipe('Conduit',[(-3.60,y,.1),(-3.60,y,.35),(-3.52,y,.5),(-3.52,y,2.38),(-3.45,y,2.48)],.05,4)
end('ARQ_Control_Parede_O');col('Oeste',(-3.4,0,1.4),(.1,2.93,1.3))
# East door retained even though the illustration only shows the south entrance.
group('ARQ_Control_Parede_L','wall')
for y in [-2.05,2.05]:
 box('EastBase',(3.4,y,.725),(.2,1.9,1.15),10,bev=.025)
 box('EastTop',(3.4,y,2.37),(.2,1.9,.66),10,bev=.025)
 for dy in [-.8075,.8075]:box('EastJamb',(3.4,y+dy,1.67),(.2,.285,.74),0)
 frame('EastWindowFrame',(3.51,y,1.67),(.08,1.33,.75),1,bev=.015)
box('EastHeader',(3.4,0,2.53),(.2,2.2,.34),0,bev=.025)
end('ARQ_Control_Parede_L')
for y in [-2.05,2.05]:col('Leste_'+str(y),(3.4,y,1.4),(.1,.95,1.3))
# Solid 45-degree corner piers close all four diagonal transitions.
group('ARQ_Control_Cantos','wall')
for sx in [-1,1]:
 for sy in [-1,1]:
  section=[(sx*3.5,sy*2.93),(sx*3.18,sy*3.25),(sx*3.08,sy*3.05),(sx*3.30,sy*2.83)]
  def corner(name,z0,z1,t):
   k=4;v=[(x,y,z) for z in [z0,z1] for x,y in section];f=[tuple(range(4)),tuple(range(7,3,-1))]+[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)]
   me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');g.finish(o,name,t)
  corner('ChamferCorner',.15,2.70,0);corner('CornerSkirt',.15,.55,1)
end('ARQ_Control_Cantos')
# Separate glazing material (one shared teal alpha material); physical walls use simple boxes.
group('VID_Control','detail',('ARQ_Control_Parede_S','ARQ_Control_Parede_O','ARQ_Control_Parede_L'))
for x in [-2.2,2.2]:box('Glass',(x,-3.272,1.62),(1.65,.025,.75),14,bev=.06)
box('Glass',(-3.52,0,1.64),(.025,3.44,.84),14,bev=.06)
for y in [-2.05,2.05]:box('Glass',(3.522,y,1.67),(.025,1.15,.57),14,bev=.05)
end('VID_Control')
# Static door leaves, separate for editing. No sliding pocket or opening mechanism is claimed.
for side in ['S','L']:
 group('ARQ_Control_Portal_'+side,'wall')
 for sx in [-1,1]:
  if side=='S':p=(sx*1.15,-3.27,1.33);size=(.16,.24,2.35)
  else:p=(3.51,sx*1.15,1.33);size=(.24,.16,2.35)
  box('Portal',p,size,1,bev=.045)
 if side=='S':box('PortalTop',(0,-3.27,2.47),(2.42,.24,.18),1,bev=.04)
 else:box('PortalTop',(3.51,0,2.47),(.24,2.42,.18),1,bev=.04)
 end('ARQ_Control_Portal_'+side)
 for sx in [-1,1]:
  leaf='D_Control_'+side+('_A' if sx<0 else '_B')
  group(leaf,'door')
  if side=='S':p=(sx*.535,-3.15,1.25);size=(1.055,.09,2.20)
  else:p=(3.4,sx*.535,1.25);size=(.09,1.055,2.20)
  box('DoorLeaf',p,size,1,bev=.055)
  if side=='S':box('DoorPanel',(sx*.535,-3.205,1.24),(.91,.025,2.02),0,bev=.04)
  else:box('DoorPanel',(3.455,sx*.535,1.24),(.025,.91,2.02),0,bev=.04)
  if side=='S':box('DoorGlazing',(sx*.535,-3.225,1.75),(.5,.025,.48),14,bev=.05)
  else:box('DoorGlazing',(3.475,sx*.535,1.75),(.025,.5,.48),14,bev=.05)
  end(leaf)
 group('PROP_Control_Status_'+side,'detail',('ARQ_Control_Portal_'+side,))
 if side=='S':box('Status',(0,-3.398,2.49),(.53,.025,.055),5)
 else:box('Status',(3.638,0,2.49),(.025,.53,.055),5)
 end('PROP_Control_Status_'+side)
# Roof shell with chamfered rim, warm stripe and separate roof attachments.
group('TET_Control','roof')
slab('RoofSill',2.70,2.84,2);slab('Roof',2.84,3.10,0)
for x in [-2.25,0,2.25]:box('RoofSeam',(x,0,3.103),(.014,5.85,.008),1)
for y in [-2.85,2.85]:box('RoofRail',(0,y,3.13),(6.05,.10,.12),0,bev=.02)
for x in [-3.1,3.1]:box('RoofRail',(x,0,3.13),(.10,5.55,.12),0,bev=.02)
end('TET_Control')
group('PROP_Control_Telhado','detail',('TET_Control',))
box('Ventilation',(-1.65,1.0,3.2),(1.25,.75,.18),4,bev=.05)
for x in [-1.95,-1.4]:
 cyl('Vent_Rim',(x,1,3.29),(x,1,3.35),.21,1,verts=12)
 for i in range(4):box('Vent_Louvre',(x-.13+i*.085,1,3.357),(.025,.27,.015),4)
cyl('AntennaFoot',(2.1,1.5,3.1),(2.1,1.5,3.30),.14,1)
cyl('Antenna',(2.1,1.5,3.3),(2.1,1.5,4.2),.025,4)
cyl('AntennaTip',(2.1,1.5,4.2),(2.1,1.5,4.28),.05,2)
for z in [3.5,3.75]:beam('AntennaCross',(1.95,1.5,z),(2.25,1.5,z),.025,4)
# Roof signage is real geometry; short labels keep triangle count modest.
def text(n,body,p,rot,size,t):
 bpy.ops.object.text_add(location=p,rotation=rot);o=bpy.context.object;o.name=n;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.001;o.data.resolution_u=1
 bpy.ops.object.convert(target='MESH');g.finish(bpy.context.object,n,t)
box('ControlSign',(0,-2.87,3.20),(2.05,.25,.32),0,bev=.04)
text('CONTROL','CONTROL',(0,-2.997,3.12),(math.pi/2,0,0),.23,1)
box('EdenSign',(1.70,-2.87,3.20),(.84,.25,.32),2,bev=.04)
text('EDEN','EDEN',(1.70,-2.997,3.12),(math.pi/2,0,0),.16,1)
end('PROP_Control_Telhado')
group('TET_Control_Luminarias','detail',('TET_Control',))
for x in [-1.5,1.5]:
 box('LightHousing',(x,0,2.67),(.18,3.8,.12),1,bev=.02)
 box('LightDiffuser',(x,0,2.60),(.13,3.65,.025),5)
end('TET_Control_Luminarias')
# Central command machine: controls face south (-Y), projection above the rear pedestal.
group('PROP_Control_Console','furniture')
box('ConsoleBase',(0,0,.24),(1.45,1.32,.18),1,bev=.10)
box('Pedestal',(0,0,.65),(1.16,1.10,.77),0,bev=.12)
box('FrontSalmon',(0,-.56,.65),(.61,.025,.58),2,bev=.02)
for x in [-.42,.42]:box('PedestalRail',(x,-.565,.64),(.07,.025,.62),1)
# Slanted slab rotated +X: its front edge is lower for standing use.
o=box('ControlDeck',(0,-.43,1.06),(1.35,.77,.13),1,bev=.045);o.rotation_euler.x=math.radians(18)
o=box('Display',(0,-.35,1.16),(1.08,.42,.025),5,bev=.02);o.rotation_euler.x=math.radians(18)
for x in [-.43,-.22,0,.22,.43]:
 o=box('PhysicalControl',(x,-.70,1.053),(.12,.11,.032),4,bev=.015);o.rotation_euler.x=math.radians(18)
for x in [-.42,-.2,.02,.24]:box('StatusBar',(x,-.59,.82),(.09,.01,.025),5)
box('RearPedestal',(0,.36,1.05),(1.12,.42,.27),0,bev=.07)
end('PROP_Control_Console');col('Console',(0,-.03,.72),(.75,.80,.57))
group('PROP_Control_EDEN_Emissor','furniture')
cyl('EmitterHousing',(0,.36,1.185),(0,.36,1.235),.30,1,verts=24)
cyl('EmitterAperture',(0,.36,1.238),(0,.36,1.25),.23,5,verts=24)
end('PROP_Control_EDEN_Emissor')
group('PROP_Control_EDEN_Projecao','detail',('PROP_Control_EDEN_Emissor',))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.21,location=(0,.36,1.94));g.finish(bpy.context.object,'EdenCore',5)
for z,r,tilt in [(1.60,.35,0),(1.76,.55,.12),(2.07,.58,-.13),(2.20,.43,.15)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.011,major_segments=40,minor_segments=4,location=(0,.36,z),rotation=(tilt,0,0));g.finish(bpy.context.object,'TelemetryRing',5)
for i in range(8):
 a=i*math.tau/8;box('TelemetryGlyph',(.59*math.cos(a),.36+.59*math.sin(a),1.95),(.025,.025,.055),5)
end('PROP_Control_EDEN_Projecao')
# Extra state-specific light geometry, hidden via metadata, not glTF object visibility.
group('PROP_Control_Interacao','detail',('PROP_Control_Console',),'oculto','interaction')
for x in [-.57,.57]:box('InteractionGuide',(x,-.73,1.11),(.045,.07,.025),5)
end('PROP_Control_Interacao')
# Perimeter equipment leaves central floor clear.
group('PROP_Control_Rack','furniture')
box('ServerRack',(-2.54,2.57,1.12),(.74,.78,1.94),1,bev=.055)
for z in [.45,.72,.99,1.26,1.53,1.80]:
 box('ServerDrawer',(-2.54,2.16,z),(.61,.025,.21),9,bev=.015)
 for x in [-2.77,-2.65]:box('Telemetry', (x,2.137,z),(.055,.012,.025),5)
for z in [.35,1.95]:box('RackRail',(-2.54,2.13,z),(.62,.04,.055),4)
end('PROP_Control_Rack');col('Rack',(-2.54,2.57,1.12),(.40,.49,.97))
group('PROP_Control_Consoles_N','furniture')
box('WallConsole',(1.2,2.65,.65),(2.30,.70,1.00),0,bev=.045)
for x in [.42,1.2,1.98]:
 box('MonitorSupport',(x,2.34,1.18),(.14,.09,.14),1)
 o=box('PeripheralScreen',(x,2.32,1.40),(.64,.11,.39),1,bev=.025);o.rotation_euler.x=math.radians(18)
 o=box('PeripheralGlass',(x,2.253,1.41),(.54,.02,.29),5,bev=.015);o.rotation_euler.x=math.radians(18)
 box('PeripheralKeys',(x,2.19,1.16),(.49,.22,.03),4)
end('PROP_Control_Consoles_N');col('Consoles_N',(1.20,2.56,.92),(1.2,.49,.77))
group('PROP_Control_Telas','detail',('ARQ_Control_Parede_N','ARQ_Control_Parede_O'))
box('MainWallDisplay',(1.22,3.025,2.07),(2.8,.045,.72),1,bev=.015)
box('MainWallGlass',(1.22,2.992,2.07),(2.61,.02,.54),14,bev=.04)
box('SideTerminal',(-3.245,1.10,1.40),(.13,.82,.52),1,bev=.04)
box('SideTerminalScreen',(-3.17,1.10,1.42),(.025,.66,.35),5)
end('PROP_Control_Telas')
group('PROP_Control_Conduites','detail',('ARQ_Control_Parede_N',))
for x in [-2.9,2.9]:
 pipe('WallConduit',[(x,2.96,.18),(x,2.96,.40),(x,2.97,1.25),(x,2.97,2.55)],.024,1)
 for z in [.45,1.3,2.1]:box('CableClamp',(x,2.92,z),(.10,.06,.045),2)
end('PROP_Control_Conduites')
# Shared 2K atlas PBR + teal glazing material.
def material(name,glass=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 for kind in ['basecolor','orm','normal','emission']:
  im=bpy.data.images.get('control_'+kind+'.png') or bpy.data.images.load(str(ROOT/'texturas'/('control_'+kind+'.png')));im.colorspace_settings.name='sRGB' if kind in ['basecolor','emission'] else 'Non-Color';tex=n.new('ShaderNodeTexImage');tex.image=im
  if kind=='basecolor':l.new(tex.outputs['Color'],p.inputs['Base Color'])
  elif kind=='normal':nm=n.new('ShaderNodeNormalMap');l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
  elif kind=='orm':
   sep=n.new('ShaderNodeSeparateColor');l.new(tex.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
  else:l.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=2.5
 if glass:
  p.inputs['Alpha'].default_value=.38;p.inputs['Roughness'].default_value=.12;m.surface_render_method='DITHERED';m.diffuse_color=(.08,.3,.32,.38)
 return m
opaque=material('MAT_Control_Atlas_2K');glass=material('MAT_Control_Vidro',True)
for o in meshes:
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
 bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.000001)
 flat=[f for f in bm.faces if f.calc_area()<1e-10]
 if flat:bmesh.ops.delete(bm,geom=flat,context='FACES_ONLY')
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bm.to_mesh(o.data);bm.free();o.data.update()
 o.data.materials.clear();o.data.materials.append(glass if o.name=='VID_Control' else opaque)
 for p in o.data.polygons:p.material_index=0
 o.data.calc_loop_triangles()
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v) for v in o.bound_box]
 bounds={'minX':min(v.x for v in pts),'maxX':max(v.x for v in pts),'minY':min(v.z for v in pts),'maxY':max(v.z for v in pts),'minZ':min(-v.y for v in pts),'maxZ':max(-v.y for v in pts)}
 spec=groups[o.name]
 manifest.append({'id':o.name,'name':o.name,'papel':spec['papel'],'ambiente':'brand-brain','estado_inicial':spec['state'],'estado_operacao':spec['operation'],'apoiado_em':spec['support'],'apoiado_em_todos':[],'bounds':bounds,'triangles':len(o.data.loop_triangles)})
tri=sum(p['triangles'] for p in manifest);assert tri<=10000,tri
report={'version':'control-room-v001','base':'f1756c4','position':{'x':0,'z':-10.5},'size':{'width':7,'depth':6.5},'entrances':['south','east'],'parts':manifest,'triangles':tri,'materials':2,'colliders_proposed':colliders,'interaction':{'id':'INTERACT_Control_EDEN','position':{'x':0,'y':0,'z':-8.9},'existingAction':'openEden','existingRadius':2.7},'states':['idle','interaction'],'statesRuntimeOnly':True}
(ROOT/'export/manifesto_control_room_v001.json').write_text(json.dumps(report,indent=2))
# Clean opening: no rig, select console and frame architecture in Material Preview.
bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=bpy.data.objects['PROP_Control_Console']
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=12;area.spaces.active.region_3d.view_location=(0,10.5,1.4);area.spaces.active.region_3d.view_rotation=Vector((10,-13,10)).to_track_quat('Z','Y')
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.data.objects['PROP_Control_Interacao'].hide_set(True)
bpy.data.objects['PROP_Control_Interacao'].hide_render=True
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blend/control_room_v001.blend'))
for o in meshes:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'export/control_room_v001.glb'),use_selection=True,export_format='GLB',export_yup=True,export_extras=True,export_animations=False)
print('CONTROL ROOM:',tri,'triangles;',len(meshes),'objects')
