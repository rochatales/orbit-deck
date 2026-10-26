"""Hangar S6.12: Blender 5.1, geometria rígida skinned, atlas unificado.
Execute: blender -b --factory-startup --python scripts/build_hangar.py
Atlas: scripts/make_atlas.py (Python + Pillow/numpy), antes deste arquivo.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
parts=[]; catalog=[]
# Pivôs globais; ossos locais seguem Z, portanto rotação X da rampa é inequívoca.
pivots={'Root':(0,0,0),'Hull_Main':(0,0,0),'Access_Ramp':(0,-3.22,.16),
 'Crane_Bridge':(0,-.9,2.95),'Crane_Trolley_L':(-1.35,-.9,2.95),
 'Crane_Hook_L':(-1.35,-.9,2.7),'Crane_Hook_R':(1.25,-.9,2.7),
 'Cooling_Fans':(0,0,4),'Portal_Shutter':(0,-3.05,3.7)}
parents={'Hull_Main':'Root','Access_Ramp':'Root','Crane_Bridge':'Hull_Main',
 'Crane_Trolley_L':'Crane_Bridge','Crane_Hook_L':'Crane_Trolley_L',
 'Crane_Hook_R':'Crane_Bridge','Cooling_Fans':'Hull_Main','Portal_Shutter':'Hull_Main'}
# Tiles: creme, grafite, ferrugem, amarelo, aço, ciano, âmbar, hazard,
# escuro, corrugado, creme painel, ferrugem painel, piso, borracha, vidro, placa.
def finish(o,name,tile=0,bone='Hull_Main',bevel=0):
 o.name=name; bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Arestas chanfradas','BEVEL'); m.width=bevel;m.segments=1
  bpy.ops.object.modifier_apply(modifier=m.name)
 mesh=o.data; uv=mesh.uv_layers.active or mesh.uv_layers.new(name='AtlasUV')
 # Projeção planar por face; margem ampla evita sangramento no mipmap.
 for p in mesh.polygons:
  n=p.normal; axis=max(range(3),key=lambda k:abs(n[k])); axes=[k for k in range(3) if k!=axis]
  coords=[mesh.vertices[mesh.loops[l].vertex_index].co for l in p.loop_indices]
  mn=[min(v[k] for v in coords) for k in axes]; mx=[max(v[k] for v in coords) for k in axes]
  for l,v in zip(p.loop_indices,coords):
   u=(v[axes[0]]-mn[0])/max(mx[0]-mn[0],1e-8); w=(v[axes[1]]-mn[1])/max(mx[1]-mn[1],1e-8)
   uv.data[l].uv=((tile%4+.035+.93*u)/4,(3-tile//4+.035+.93*w)/4)
 g=o.vertex_groups.new(name=bone); g.add(list(range(len(mesh.vertices))),1,'REPLACE')
 parts.append(o);catalog.append({'piece':name,'bone':bone,'tile':tile})
 return o

def box(n,p,s,t=0,b='Hull_Main',bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
 return finish(o,n,t,b,bev)
def cyl(n,a,c,r,t=4,b='Hull_Main',verts=8):
 a=Vector(a);c=Vector(c);d=c-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d.length,location=(a+c)/2)
 o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,n,t,b)
def beam(n,a,c,w,t=1,b='Hull_Main'):
 a=Vector(a);c=Vector(c);d=c-a;o=box(n,(a+c)/2,(w,w,d.length),t,b);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def extrude(n,section,y0,y1,t=0,b='Hull_Main'):
 # section X/Z counter-clockwise. Closed volume with proper facing.
 v=[(x,y0,z) for x,z in section]+[(x,y1,z) for x,z in section]; k=len(section)
 f=[tuple(range(k)),tuple(range(2*k-1,k-1,-1))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o)
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 # Recalculate outside so asymmetric winding never produces missing sides.
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 return finish(o,n,t,b)

def pipe(n,points,r=.10,t=4,b='Hull_Main',flanges=True):
 # Single swept 8-sided elbowed tube; no overlapping cylinders at elbows.
 pts=[Vector(p) for p in points];verts=[];faces=[];rings=8;previous_tangent=None;previous_u=None
 for i,p in enumerate(pts):
  tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();ref=Vector((1,0,0))
  if abs(tangent.dot(ref))>.9:ref=Vector((0,1,0))
  u=(previous_tangent.rotation_difference(tangent)@previous_u).normalized() if previous_tangent is not None else tangent.cross(ref).normalized()
  v=tangent.cross(u).normalized();previous_tangent=tangent.copy();previous_u=u.copy()
  verts.extend([p+r*(u*math.cos(j*2*math.pi/rings)+v*math.sin(j*2*math.pi/rings)) for j in range(rings)])
 for i in range(len(pts)-1):
  for j in range(rings): faces.append((i*rings+j,i*rings+(j+1)%rings,(i+1)*rings+(j+1)%rings,(i+1)*rings+j))
 faces.extend([tuple(reversed(range(rings))),tuple((len(pts)-1)*rings+j for j in range(rings))])
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);finish(o,n,t,b)
 if flanges:
  for i in [1,len(pts)-2]:
   p=pts[i];d=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()*.045;cyl(n+'_flange',p-d,p+d,r*1.3,1,b)

# Piso e paredes sem bloco maciço tapando a baia.
box('Floor',(0,0,.08),(8.05,6.44,.16),12,bev=.06)
for s in [-1,1]:
 extrude('Base_Skirt',[(s*3.83,.16),(s*4.12,.16),(s*4.12,1.57),(s*3.83,1.57)],-2.65,2.65,11)
 box('Hull_Side',(s*4.05,0,2.3),(.28,5.35,1.4),10,bev=.055)
 # Full longitudinal slopes and flat shoulder plates, separated by real seams.
 for j in range(4):
  y0=-3.04+j*1.52; y1=y0+1.505
  extrude('Roof_Slope',[(s*4.2,2.98),(s*4.2,3.15),(s*2.9,4.42),(s*2.78,4.3)],y0,y1,10)
  box('Roof_Shoulder',(s*1.96,(y0+y1)/2,4.365),(1.67,1.505,.13),10,bev=.04)
  cyl('Roof_Rivet',(s*2.62,y0+.2,4.43),(s*2.62,y0+.2,4.46),.035,4,verts=6)
 box('Belt_Trim',(s*4.21,0,1.61),(.15,5.35,.20),1,bev=.035)
 # Front/rear chamfer corner buttresses.
 for y in [-2.88,2.88]:
  box('Corner_Upper',(s*3.87,y,2.33),(.6,.64,1.26),0,bev=.065)
  o=box('Corner_Armor',(s*3.87,y,.88),(.6,.64,1.45),2,bev=.08)
  o=box('Corner_Hazard',(s*3.94,y,1.63),(.62,.64,.16),7,bev=.025)
  for z in [.45,1.25]: cyl('Corner_Bolt',(s*4.22,y,z),(s*4.25,y,z),.055,4,verts=6)
 # Central side cooler with two circular turbine recesses.
 box('Side_Cooler',(s*4.39,0,.78),(.53,1.65,1.17),1,bev=.09)
 for y in [-.42,.42]:
  cyl('Intake_Rim',(s*4.68,y,.7),(s*4.74,y,.7),.25,4,verts=12)
  cyl('Intake_Dark',(s*4.745,y,.7),(s*4.76,y,.7),.195,8,verts=12)
  cyl('Intake_Hub',(s*4.77,y,.7),(s*4.79,y,.7),.07,4,verts=8)
  for k in range(3):
   o=box('Fan_Blade',(s*4.77,y,.7),(.025,.32,.045),4);o.rotation_euler.x=k*math.pi/3
 box('Telemetry_Frame',(s*4.24,0,2.12),(.25,1.35,.42),1,bev=.04)
 box('Telemetry_Display',(s*4.38,0,2.12),(.025,1.08,.14),5)
 for y in [-1.72,-1.27,1.27,1.72]:
  pipe('Coolant_Down',[(s*4.55,y,.10),(s*4.55,y,.32),(s*4.38,y,.50),(s*4.38,y,2.35),(s*4.25,y,2.52),(s*4.10,y,2.52)],.11)
 pipe('Telemetry_U',[(s*4.4,-.88,1.65),(s*4.4,-.88,2.47),(s*4.4,-.70,2.65),(s*4.4,.70,2.65),(s*4.4,.88,2.47),(s*4.4,.88,1.65)],.09)
 # Sloped roof vents.
 for y in [-1.85,0,1.85]:
  o=box('Vent_Foot',(s*3.47,y,3.93),(.60,.65 if y else .95,.12),1,bev=.035);o.rotation_euler.y=s*math.pi/4
  for dy in ([-.19,.19] if y==0 else [0]):
   a=(s*3.47,y+dy,4.0);end=(s*3.57,y+dy,4.10)
   cyl('Vent_Rim',a,end,.16,4,'Cooling_Fans',8)
   cyl('Vent_Core',end,(s*3.58,y+dy,4.11),.11,8,'Cooling_Fans',8)
 # Interior girders and maintenance lamps.
 for y in [-2.3,.2,2.5]:
  box('Bay_Pillar',(s*3.72,y,1.7),(.14,.18,3.15),1)
  box('Bay_Light',(s*3.61,y,2.65),(.04,.35,.11),6)
box('Back_Base',(0,3.05,.85),(7.5,.3,1.5),11,bev=.06)
extrude('Back_Hull',[(-3.75,1.6),(3.75,1.6),(3.75,3.3),(2.8,4.35),(-2.8,4.35),(-3.75,3.3)],2.99,3.16,10)
box('Back_Inspection',(0,3.32,2.25),(2.1,.15,1.05),1,bev=.05)
for x in [-.7,0,.7]:box('Back_Vent',(x,3.41,2.25),(.4,.04,.72),9)
# Corrugated roof spine, recessed between cream shoulders.
box('Roof_Spine',(0,0,4.25),(2.15,6.15,.12),9)
for j in range(35):box('Spine_Rib',(0,-2.95+j*.173,4.34),(2.05,.055,.065),1)
for s in [-1,1]:
 for y in [-2.8,-.95,.95,2.8]:box('Spine_Clamp',(s*1.10,y,4.47),(.25,.16,.14),4,bev=.025)
# Front: outer shoulders and trapezoidal opening.
for s in [-1,1]:
 extrude('Front_Pier',[(s*2.65,.15),(s*3.75,.15),(s*3.75,3.43),(s*2.78,4.30),(s*1.9,4.30),(s*1.9,3.70),(s*2.65,2.8)],-3.17,-2.91,10)
 box('Pier_Rust',(s*3.35,-3.20,.85),(.8,.11,1.36),11)
 box('Portal_Post',(s*2.64,-3.28,1.48),(.35,.42,2.66),1,bev=.05)
 beam('Portal_Diagonal',(s*2.64,-3.28,2.8),(s*2.0,-3.28,3.55),.35,1)
 box('Post_Hazard',(s*2.64,-3.505,.58),(.27,.025,.77),7)
 for z,t in [(.30,5),(.61,5),(1.0,6)]:
  cyl('Beacon_Base',(s*2.64,-3.52,z),(s*2.64,-3.6,z),.115,1)
  cyl('Beacon_Lens',(s*2.64,-3.605,z),(s*2.64,-3.64,z),.075,t)
extrude('Front_Upper',[(-2.8,3.45),(2.8,3.45),(2.8,4.35),(-2.8,4.35)],-3.15,-2.93,10)
box('Portal_Header',(0,-3.28,3.55),(4.1,.42,.35),1,bev=.05)
box('Header_Hazard',(0,-3.505,3.52),(3.82,.025,.16),7)
box('Floodlight_Housing',(0,-3.24,4.04),(1.05,.55,.48),1,bev=.08)
for x in [-.23,.23]:
 cyl('Floodlight_Rim',(x,-3.54,4.04),(x,-3.62,4.04),.18,4,verts=12)
 cyl('Floodlight_Lens',(x,-3.63,4.04),(x,-3.65,4.04),.132,6,verts=12)
# Upper shutter closes the remaining height: ramp is only 2.2 m long.
box('Upper_Shutter',(0,-3.0,3.75),(4.75,.12,1.10),9,'Portal_Shutter')
# Ramp is initially flat with top at .16 m; pivot on threshold, bevel edges.
box('Access_Ramp',(0,-4.32,.08),(4.9,2.2,.16),12,'Access_Ramp',.045)
for x in [-2.40,2.40]:box('Ramp_Edge',(x,-4.32,.19),(.12,2.15,.12),1,'Access_Ramp',.025)
box('Threshold_Hazard',(0,-3.33,.167),(4.55,.20,.013),7,'Access_Ramp')
for x in [-1.6,0,1.6]:box('Ramp_Seam',(x,-4.36,.168),(.014,1.79,.012),8,'Access_Ramp')
for x in [-2.28,2.28]:
 for y,t in [(-3.55,5),(-5.12,6)]:
  cyl('Ramp_Beacon',(x,y,.24),(x,y,.34),.10,1,'Access_Ramp')
  cyl('Ramp_Lens',(x,y,.34),(x,y,.41),.075,t,'Access_Ramp')
for x in [-3.15,-3.55]:
 cyl('Small_Drum',(x,-3.65,0),(x,-3.65,.32),.15,4)
 cyl('Drum_Cap',(x,-3.65,.32),(x,-3.65,.35),.16,1)
# Crane rails, truss bridge and running trolley. Cables scale locally when hoisting.
for x in [-3.3,3.3]:box('Crane_Rail',(x,0,2.95),(.17,5.6,.19),3)
for z in [2.93,3.35]:box('Crane_Chord',(0,-.90,z),(6.5,.15,.12),3,'Crane_Bridge')
for x in [-3,-2,-1,0,1,2]:
 beam('Truss_X',(x,-.90,2.95),(x+1,-.90,3.32),.07,3,'Crane_Bridge')
 beam('Truss_X',(x,-.90,3.32),(x+1,-.90,2.95),.07,3,'Crane_Bridge')
box('Trolley',(-1.35,-.90,2.79),(.65,.48,.26),3,'Crane_Trolley_L',.045)
# Hook cable is weighted to a dedicated extension bone; moving hook does not float cable.
for label,x in [('L',-1.35),('R',1.25)]:
 bn='Crane_Hook_'+label
 cable='Cable_'+label;pivots[cable]=(x,-.90,2.70);parents[cable]='Crane_Trolley_L' if label=='L' else 'Crane_Bridge'
 cyl('Hoist_Cable',(x,-.90,2.70),(x,-.90,1.74),.025,1,cable,6)
 box('Hook_Block',(x,-.90,1.73),(.25,.22,.28),3,bn, .03)
 pipe('Hook',[(x,-.90,1.65),(x,-.90,1.40),(x+.09,-.90,1.32),(x+.20,-.90,1.36),(x+.22,-.90,1.46)],.052,3,bn,False)
box('Suspended_Load',(-1.24,-.90,1.12),(.6,.46,.43),3,'Crane_Hook_L',.045)
# Track vehicle on starboard side inside bay.
for x in [1.25,2.55]:
 box('Vehicle_Track',(x,1.15,.42),(.48,2.6,.55),8,bev=.13)
 for y in [.25,.7,1.15,1.6,2.05]:
  cyl('Roadwheel',(x-.25,y,.42),(x+.25,y,.42),.19,1,verts=8)
 for y in [.05,.4,.75,1.1,1.45,1.8,2.15]:box('Track_Tread',(x,y,.705),(.51,.065,.04),4)
box('Vehicle_Body',(1.9,1.15,.88),(1.25,2.10,.52),1,bev=.13)
box('Vehicle_Hood',(1.9,.60,1.23),(1.12,.75,.22),4,bev=.05)
box('Vehicle_Cab',(1.9,1.63,1.27),(.95,.72,.4),1,bev=.07)
box('Vehicle_Windshield',(1.9,1.255,1.32),(.68,.018,.21),14)
for x in [1.5,2.3]:box('Vehicle_Light',(x,.08,.96),(.14,.03,.10),6)
# Floor lane markings, inspection plates and bolts.
for x in [-2.95,2.95]:box('Floor_Hazard',(x,.15,.168),(.15,5.2,.014),7)
for s in [-1,1]:
 for y in [-2.2,2.2]:
  box('Service_Hatch',(s*4.235,y,.94),(.045,.55,.45),1,bev=.02)
  for dy in [-.19,.19]:cyl('Hatch_Bolt',(s*4.26,y+dy,1.08),(s*4.28,y+dy,1.08),.035,4,verts=6)
# Unified mesh, preserving groups per rigid component.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='HangarMesh'
bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
# Atlas material including packed ORM and actual normal map.
mat=bpy.data.materials.new('MAT_Hangar_Atlas_2K');mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;p=n.get('Principled BSDF')
for kind in ['basecolor','orm','normal','emission']:
 im=bpy.data.images.load(str(ROOT/'texturas'/('hangar_'+kind+'.png')));im.colorspace_settings.name='sRGB' if kind in ['basecolor','emission'] else 'Non-Color'
 tex=n.new('ShaderNodeTexImage');tex.image=im;tex.label=kind;tex.location=(-600,-['basecolor','orm','normal','emission'].index(kind)*250)
 if kind=='basecolor':l.new(tex.outputs['Color'],p.inputs['Base Color'])
 elif kind=='emission':l.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=2.5
 elif kind=='normal':nm=n.new('ShaderNodeNormalMap');l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
 else:
  sep=n.new('ShaderNodeSeparateColor');l.new(tex.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
  # glTF exporter recognizes AO input via this named group.
  ng=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');ng.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');gn=n.new('ShaderNodeGroup');gn.node_tree=ng;l.new(sep.outputs['Red'],gn.inputs['Occlusion'])
mesh.data.materials.clear();mesh.data.materials.append(mat)
for poly in mesh.data.polygons:poly.material_index=0
# Rig with all components 100% rigid weights; no bone scaling of the hull.
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('HangarRig');arm=bpy.data.objects.new('HangarArmature',armdata);bpy.context.collection.objects.link(arm);arm.select_set(True);bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
for name,point in pivots.items():
 b=armdata.edit_bones.new(name);b.head=point;b.tail=Vector(point)+Vector((0,0,.3))
for name,parent in parents.items():armdata.edit_bones[name].parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');mesh.parent=arm;m=mesh.modifiers.new('Rigid machinery','ARMATURE');m.object=arm
for b in arm.pose.bones:b.rotation_mode='XYZ'
clips={'Idle':60,'CraneWork':48,'RampOpenClose':40,'AlertPulse':36};arm.animation_data_create()
for clip,end in clips.items():
 action=bpy.data.actions.new(clip);arm.animation_data.action=action
 for f in range(1,end+1):
  phase=(f-1)/(end-1)*math.tau
  for b in arm.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
  pb=arm.pose.bones
  if clip=='Idle':
   for side in ['L','R']:
    sway=math.sin(phase)*.035
    pb['Crane_Hook_'+side].rotation_euler.x=sway
    pb['Cable_'+side].rotation_euler.x=sway
   pb['Cooling_Fans'].location.y=math.sin(phase*2)*.004
  elif clip=='CraneWork':
   pb['Crane_Trolley_L'].location.x=.45*math.sin(phase)
   pb['Crane_Bridge'].location.z=.28*math.sin(phase) # local Z is world -Y for default vertical bone
   for side,sg in [('L',1),('R',-1)]:
    lift=.22*(1-math.cos(phase))*sg
    # Default edit bone along Z: pose local Y maps to world Z.
    pb['Crane_Hook_'+side].location.y=lift;pb['Cable_'+side].scale.y=(.96-lift)/.96
  elif clip=='RampOpenClose':
   close=math.sin(math.pi*(f-1)/(end-1))**2
   # local X = world X. Negative rotation raises the forward (-Y) ramp.
   pb['Access_Ramp'].rotation_euler.x=-math.pi/2*close
   pb['Portal_Shutter'].location.y=-.83*close
  else:
   pb['Cooling_Fans'].location.y=.06*math.sin(phase)**2
   pb['Crane_Bridge'].location.z=.025*math.sin(phase)*math.sin(phase/2)
  for b in arm.pose.bones:
   for prop in ['location','rotation_euler','scale']:b.keyframe_insert(prop,frame=f,group=b.name)
 track=arm.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action);strip.influence=1;track.mute=True
arm.animation_data.action=None
for b in arm.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=60;scene.frame_set(1)
mesh.data.calc_loop_triangles();tri=len(mesh.data.loop_triangles)
assert tri<=10000, f'Triangle budget exceeded: {tri}'
# Collider proposals only: coordinates in Blender Z-up; never exported as render mesh.
colliders=[{'name':'COL_Hangar_'+name,'center':p,'halfExtents':h} for name,p,h in [
 ('Wall_Left',[-4,0,1.6],[.2,3.15,1.6]),('Wall_Right',[4,0,1.6],[.2,3.15,1.6]),('Wall_Back',[0,3.05,1.6],[4.1,.2,1.6]),
 ('Pillar_Left',[-3.3,-3.1,1.6],[.8,.25,1.6]),('Pillar_Right',[3.3,-3.1,1.6],[.8,.25,1.6]),('Floor',[0,0,.08],[4.05,3.22,.08]),('Ramp',[0,-4.32,.08],[2.45,1.1,.08])]]
report={'triangles':tri,'vertices':len(mesh.data.vertices),'renderMesh':'HangarMesh','materials':[mat.name], 'pieces':len(parts),'bones':list(pivots),'clips':clips,'fps':30,'colliders_proposed':colliders,'coordinateSystem':'Blender Z up, front -Y. glTF: Y up, front +Z.','dimensions_model':list(mesh.dimensions),'components':catalog,'notes':['Upper_Shutter closes the upper bay while the 2.2 m ramp closes the lower opening.','Extra Cable_L/R bones keep cable length connected during hoisting.','One primitive is one draw submission per pass, not including shadow passes.']}
(ROOT/'notas/build_report.json').write_text(json.dumps(report,indent=2))
# Pack a portable .blend; export ONLY asset (no studio, cameras, collision proposals).
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blend/hangar_mars_v001.blend'))
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);arm.select_set(True);bpy.context.view_layer.objects.active=arm
# NLA mode exports muted named strips as independent clips.
for tr in arm.animation_data.nla_tracks:tr.mute=False
bpy.ops.export_scene.gltf(filepath=str(ROOT/'export/hangar_mars_v001.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_yup=True,export_extras=True)
print('HANGAR REPORT',tri,'triangles',len(parts),'components')
