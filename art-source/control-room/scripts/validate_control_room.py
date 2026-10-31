"""Blender roundtrip, IDs, world-space geometry and roof metadata."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'blend/control_room_v001.blend';glb=ROOT/'export/control_room_v001.glb';man=json.loads((ROOT/'export/manifesto_control_room_v001.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(src));objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
def capture(o):return [o.matrix_world@v.co for v in o.data.vertices]
surfaces={o['id_estavel']:BVHTree.FromPolygons(capture(o),[tuple(p.vertices) for p in o.data.polygons]) for o in objects}
normal_sources={}
for o in objects:
 matrix=o.matrix_world.to_3x3().inverted().transposed();pairs=[]
 for loop in o.data.loops:pairs.append((o.matrix_world@o.data.vertices[loop.vertex_index].co,(matrix@o.data.corner_normals[loop.index].vector).normalized()))
 normal_sources[o['id_estavel']]=pairs
source={o['id_estavel']:capture(o) for o in objects};normals={o['id_estavel']:[p.normal.copy() for p in o.data.polygons] for o in objects};source_tri=sum(len(o.data.loop_triangles) for o in objects)
assert len(source)==len(objects)
for o in objects:
 assert o.hide_get()==(o.get('estado_inicial')=='oculto')
 assert o.hide_render==(o.get('estado_inicial')=='oculto')
 assert all(math.isfinite(c) for v in o.data.vertices for c in v.co)
 assert all(p.area>1e-10 for p in o.data.polygons),(o.name,'degenerate face')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(glb));imported={o['id_estavel']:o for o in bpy.context.scene.objects if o.type=='MESH'}
assert set(imported)==set(source)
results={};maximum=0;vertices=0
for part in man['parts']:
 sid=part['id'];o=imported[sid];a=source[sid];b=capture(o);dist=0
 for first,second in [(a,b),(b,a)]:
  tree=KDTree(len(first))
  for i,p in enumerate(first):tree.insert(p,i)
  tree.balance();dist=max(dist,max(tree.find(p)[2] for p in second))
 assert dist<.0002,(sid,dist)
 for field in ['papel','estado_inicial','estado_operacao','ambiente']:assert o[field]==part[field]
 for field in ['apoiado_em','apoiado_em_todos']:
  assert json.loads(o[field])==part[field]
  for support in part[field]:assert support in imported
 o.data.calc_loop_triangles();assert len(o.data.loop_triangles)==part['triangles']
 assert all(abs(v-1)<1e-6 for v in o.scale),(sid,list(o.scale))
 results[sid]={'max_bidirectional_error_m':dist,'triangles':len(o.data.loop_triangles)};maximum=max(maximum,dist);vertices+=len(b)
roof={'TET_Control'};hidden=roof.copy()
while True:
 extra={p['id'] for p in man['parts'] if set(p['apoiado_em'])&hidden} - hidden
 if not extra:break
 hidden |=extra
assert {'PROP_Control_Telhado','TET_Control_Luminarias'}<=hidden
assert not any(p['papel']=='wall' and p['id'] in hidden for p in man['parts'])
# Exported normals: check finite unit length, and geometric orientation against source face normals via nearest surface.
normal_deviation=0
for sid,o in imported.items():
 matrix=o.matrix_world.to_3x3().inverted().transposed();pairs=normal_sources[sid];tree=KDTree(len(pairs))
 for i,(pos,n) in enumerate(pairs):tree.insert(pos,i)
 tree.balance()
 for loop in o.data.loops:
  pos=o.matrix_world@o.data.vertices[loop.vertex_index].co;normal=(matrix@o.data.corner_normals[loop.index].vector).normalized()
  matches=tree.find_range(pos,.00001);assert matches
  best=max(normal.dot(pairs[i][1]) for _,i,_ in matches)
  normal_deviation=max(normal_deviation,math.degrees(math.acos(max(-1,min(1,best)))))
 assert all(math.isfinite(c) for p in o.data.polygons for c in p.normal)
 assert all(p.area>1e-10 for p in o.data.polygons)
assert normal_deviation<.1,normal_deviation
report={'objects':len(imported),'triangles':sum(p['triangles'] for p in man['parts']),'max_error_m':maximum,'parts':results,'roof_hidden_ids':sorted(hidden),'wall_cut':False,'max_geometric_normal_deviation_degrees':normal_deviation,'normals':'Split corner normals matched by world vertex position; finite, no zero-area faces','sha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [src,glb,ROOT/'export/manifesto_control_room_v001.json']}}
(ROOT/'notas/roundtrip.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['objects','triangles','max_error_m','roof_hidden_ids']},indent=2))
