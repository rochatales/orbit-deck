import bpy, math
from mathutils import Vector
parts=[]
catalog=[]
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

