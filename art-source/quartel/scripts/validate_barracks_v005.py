"""Conferência Blender da v005: vãos, folhas/COL, proporções e origem preservada."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path(__file__).resolve().parents[1];scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
root=scene.objects['Barracks'];assert tuple(root.scale)==(1,1,1);assert root.location.length==0
visual=[o for o in scene.objects if o.type=='MESH'];static=[o for o in visual if not o.name.startswith('Door_')]
trees={o.name:BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in static}
def ray(a,b):
 a,b=Vector(a),Vector(b);d=b-a
 return [name for name,tree in trees.items() if tree.ray_cast(a,d.normalized(),d.length)[0] is not None]
def point(side,u,v,z):return (u,-5.25+v,z) if side=='S' else (-4.5+v,-1.5-u,z)
rays=0
for side in ['W','S']:
 for u in [-.88,-.4,0,.4,.88]:
  for z in [.31,.6,1.2,2.23]:assert not ray(point(side,u,-.6,z),point(side,u,.3,z)),(side,u,z);rays+=1
# Caixas conservadoras das paredes ficam nos mesmos planos das fachadas.
for side in ['W','S']:
 for u in [-.88,0,.88]:
  p=Vector(point(side,u,.09375,1.2));hits=[]
  for obj in scene.objects:
   if obj.name.startswith('COL_'+side+'_'):
    local=obj.matrix_world.inverted()@p
    if max(abs(n) for n in local)<=1.00001:hits.append(obj.name)
  assert not hits,(side,u,hits)
leaf_samples=0;error_max=0;pocket=1.115*1.8/1.4;window=1.4775
for frame in range(1,21):
 scene.frame_set(frame);bpy.context.view_layer.update()
 for leaf in [o for o in visual if o.name.startswith('Door_')]:
  side=leaf['door_side'];pts=[leaf.matrix_world@v.co for v in leaf.data.vertices]
  us=[p.x if side=='S' else -(p.y+1.5) for p in pts]
  assert max(abs(u) for u in us)<=pocket+1e-5
  collider=next(o for o in leaf.children if o.name.startswith('COL_'));corners=[collider.matrix_world@Vector((x,y,z)) for x in [-1,1] for y in [-1,1] for z in [-1,1]]
  error=max(abs(fn(p[i] for p in pts)-fn(p[i] for p in corners)) for fn in [min,max] for i in range(3));error_max=max(error_max,error);assert error<1e-5
  if frame==20:assert min(us)>.9 or max(us)<-.9
  leaf_samples+=1
assert pocket<window
scene.frame_set(1);bpy.context.view_layer.update()
for obj in visual:obj.data.calc_loop_triangles()
build=json.loads((OUT/'notas/build-v005.json').read_text())
for group in build['furnitureGroups']:
 for before,after in zip(group['sizeBefore'],group['sizeAfter']):assert abs(after-before*1.1)<2e-6,(group['name'],before,after)
source=OUT/'blend/barracks-v004.blend';assert hashlib.sha256(source.read_bytes()).hexdigest()==build['sourceV004SHA256']
report={'passed':True,'blendSHA256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'sourceV004SHA256':build['sourceV004SHA256'],'triangles':sum(len(o.data.loop_triangles) for o in visual),'materials':len({m.name for o in visual for m in o.data.materials}),'freeOpeningRaySamples':rays,'leafSweepSamples':leaf_samples,'leafCOLMaxErrorM':error_max,'telescopicPocketMaxU':pocket,'windowHoodMinU':window,'windowGapM':window-pocket,'furnitureGroupsChecked':len(build['furnitureGroups']),'furnitureFactor':1.1,'rootScale':[1,1,1]}
(OUT/'notas/validacao-v005.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print(json.dumps(report,indent=2))
