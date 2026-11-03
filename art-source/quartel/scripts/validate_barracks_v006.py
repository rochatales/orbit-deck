"""Valida fonte preservada, exterior idêntico, COL internos e o novo vão/slide."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path(__file__).resolve().parents[1];scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
source=OUT/'blend/barracks-v005.blend';report=json.loads((OUT/'notas/build-v006.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest()==report['sourceV005SHA256']
keep=[o.name for o in scene.objects if o.type=='MESH' and o.name not in ['Building_Interior','Bathroom_Walls','Bathroom_Frame'] and not o.name.startswith('Door_Bathroom')]
with bpy.data.libraries.load(str(source),link=False) as (before,after):after.objects=[name for name in before.objects if name in keep]
for copy in after.objects:
 current=scene.objects.get(copy.name.split('.')[0]);assert current and current!=copy
 assert len(current.data.vertices)==len(copy.data.vertices)
 assert all((a.co-b.co).length<1e-7 for a,b in zip(current.data.vertices,copy.data.vertices)),current.name
visual=[o for o in scene.objects if o.type=='MESH'];static=[o for o in visual if not o.name.startswith('Door_')]
trees={o.name:BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in static}
rays=0
for u in [-.58,-.3,0,.3,.58]:
 for height in [.1,.5,1.2,1.9]:
  start=Vector((2.9+u,.7,.2625+height));direction=Vector((0,.65,0))
  assert not [name for name,tree in trees.items() if tree.ray_cast(start,direction.normalized(),direction.length)[0] is not None],(u,height)
  rays+=1
# Referências internas foram medidas da geometria, apenas estendidas até o piso quando necessário.
col_error=0
for record in report['collidersAdded']:
 collider=scene.objects[record['id']];points=[collider.matrix_world@Vector((x,y,z)) for x in [-1,1] for y in [-1,1] for z in [-1,1]]
 for axis in range(3):
  col_error=max(col_error,abs(min(p[axis] for p in points)-record['min'][axis]),abs(max(p[axis] for p in points)-record['max'][axis]))
assert col_error<1e-6,col_error
leaf_error=0;samples=0
for frame in range(1,21):
 scene.frame_set(frame);bpy.context.view_layer.update()
 for leaf in [o for o in visual if o.name.startswith('Door_Bathroom')]:
  points=[leaf.matrix_world@v.co for v in leaf.data.vertices];collider=next(o for o in leaf.children if o.name.startswith('COL_'));corners=[collider.matrix_world@Vector((x,y,z)) for x in [-1,1] for y in [-1,1] for z in [-1,1]]
  leaf_error=max(leaf_error,max(abs(fn(p[i] for p in points)-fn(p[i] for p in corners)) for fn in [min,max] for i in range(3)))
  assert max(p.y for p in points)<1.05,'folha fora do plano da parede (mínimo Y=1,08)'
  if frame==20:assert max(p.x for p in points)<2.3
  samples+=1
assert leaf_error<1e-6,leaf_error
scene.frame_set(1)
for obj in visual:obj.data.calc_loop_triangles()
result={'passed':True,'blendSHA256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'sourceV005SHA256':report['sourceV005SHA256'],'unchangedExteriorMeshes':keep,'interiorCOLChecked':len(report['collidersAdded']),'COLMaxErrorM':col_error,'doorCOLMaxErrorM':leaf_error,'freeOpeningRaySamples':rays,'bathroomLeafSweepSamples':samples,'bathroomDoorWidth':1.2,'bathroomDoorHeight':2,'triangles':sum(len(o.data.loop_triangles) for o in visual),'materials':len({m.name for o in visual for m in o.data.materials})}
(OUT/'notas/validacao-v006.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps(result,indent=2))
