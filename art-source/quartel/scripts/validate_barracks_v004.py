"""Blender: invariantes fora dos acessos, vãos livres e sweep das portas telescópicas."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path(__file__).resolve().parents[1];source=OUT/'blend/barracks-v003.blend'
# Lê coordenadas de controle da fonte em biblioteca temporária, sem salvar fonte.
with bpy.data.libraries.load(str(source),link=False) as (before,after):after.objects=[n for n in before.objects if n in ['Building_Roof','Building_Interior','Wall_N','Wall_E','Wall_Corners']]
scene=bpy.context.scene;root=scene.objects['Barracks'];scene.frame_set(1);bpy.context.view_layer.update()
for copy in after.objects:
 original=scene.objects.get(copy.name.split('.')[0]);assert original and original!=copy
 assert len(original.data.vertices)==len(copy.data.vertices)
 assert all((a.co-b.co).length<1e-7 for a,b in zip(original.data.vertices,copy.data.vertices)),original.name
visual=[o for o in scene.objects if o.type=='MESH'];static=[o for o in visual if not o.name.startswith('Door_')]
trees={o.name:BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in static}
def ray(a,b):
 a,b=Vector(a),Vector(b);d=b-a
 return [name for name,tree in trees.items() if tree.ray_cast(a,d.normalized(),d.length)[0] is not None]
def frame(side,u,v,z):return (u,-3.75+v,z) if side=='S' else (-4.5+v,-u,z)
checks=0
for side in ['W','S']:
 for u in [-.68,-.4,0,.4,.68]:
  for h in [.31,.6,1.2,1.9]:assert not ray(frame(side,u,-.4,h),frame(side,u,.35,h)),(side,u,h);checks+=1
# Durante todo o recolhimento: folhas mantêm u <=1,115 (janelas >=1,1775).
leaf_count=0;max_col_error=0
for frame_number in range(1,21):
 scene.frame_set(frame_number);bpy.context.view_layer.update()
 for leaf in [o for o in visual if o.name.startswith('Door_')]:
  side=leaf['door_side'];pts=[leaf.matrix_world@v.co for v in leaf.data.vertices]
  us=[p.x if side=='S' else -p.y for p in pts];assert max(abs(u) for u in us)<=1.11501
  c=next(o for o in leaf.children if o.name.startswith('COL_'));cp=[c.matrix_world@Vector((x,y,z)) for x in [-1,1] for y in [-1,1] for z in [-1,1]]
  error=max(abs(fn(p[i] for p in pts)-fn(p[i] for p in cp)) for i in range(3) for fn in [min,max]);max_col_error=max(max_col_error,error);assert error<1e-5
  if frame_number==20:assert min(us)>.7 or max(us)<-.7,leaf.name
  leaf_count+=1
scene.frame_set(1)
for o in visual:o.data.calc_loop_triangles()
report={'passed':True,'blendSHA256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'sourceV003SHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'unchangedGeometry':['Building_Roof','Building_Interior','Wall_N','Wall_E','Wall_Corners'],'freeOpeningRaySamples':checks,'leafSweepSamples':leaf_count,'leafCOLMaxErrorM':max_col_error,'pocketMaxU':1.115,'windowHoodMinU':1.1775,'windowGapM':.0625,'triangles':sum(len(o.data.loop_triangles) for o in visual),'materials':1,'doorWidth':1.4,'doorHeightAboveThreshold':1.665,'rampWidth':1.6,'rampRise':.2625,'rampRun':1.2}
(OUT/'notas/validacao-v004.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print(json.dumps(report,indent=2))
