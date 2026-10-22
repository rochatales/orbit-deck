"""Deck aprovado derivado para piso plano do piloto; fonte preservada."""
import bpy, json, hashlib, struct
from pathlib import Path
from collections import defaultdict
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[3]
ART=ROOT/'art-source/ares-mars-runtime'
SOURCE=ART/'referencias/mars_launchpad_aprovado_63634bd.blend'
OUT=ROOT/'src/assets/ares-mars'
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=hashfile(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
staging=bpy.data.collections.new('MARTE_DECK_RUNTIME');bpy.context.scene.collection.children.link(staging)
groups=defaultdict(list);pieces=[];omitted=[]
for obj in list(bpy.data.collections['05_DECK_Octogonal'].objects):
 if obj.type!='MESH':continue
 if obj.name.startswith(('Conexao_', 'Deck_Acesso_Degrau')):
  omitted.append(obj.name);continue
 ev=obj.evaluated_get(deps);mesh=ev.to_mesh().copy();ev.to_mesh_clear()
 mesh.transform(Matrix.Translation((0,0,-.455))@obj.matrix_world);mesh.calc_loop_triangles()
 assert len(mesh.materials)==1
 new=bpy.data.objects.new('TMP_'+obj.name,mesh);staging.objects.link(new)
 groups[mesh.materials[0].name].append(new)
 pieces.append(dict(nome=obj.name,triangulos=len(mesh.loop_triangles)))
# Acesso do piloto é plano: substitui degraus/ligação longa por uma passarela
# de 4 m x 2,4 m, do piso existente (Z=25) até o octógono (Z=27,4).
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,6.8,-.06))
connector=bpy.context.object;connector.name='Deck_Conexao_Runtime';connector.dimensions=(4,2.4,.12)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
mat=bpy.data.materials['Deck_Aco'] if 'Deck_Aco' in bpy.data.materials else next(o.data.materials[0] for os in groups.values() for o in os if 'Deck_Superficie' in o.name)
connector.data.materials.append(mat);groups[mat.name].append(connector)
connector.data.calc_loop_triangles();pieces.append(dict(nome=connector.name,triangulos=len(connector.data.loop_triangles)))
output=[]
for i,(name,objects) in enumerate(sorted(groups.items())):
 mat=objects[0].data.materials[0];p=mat.node_tree.nodes.get('Principled BSDF')
 for socket in ('Base Color','Normal'):
  for link in list(p.inputs[socket].links):mat.node_tree.links.remove(link)
 p.inputs['Base Color'].default_value=mat.diffuse_color
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=bpy.context.object
 obj.name=f'MARTE_DECK_{i:02d}';obj['id_estavel']=obj.name;obj['conjunto']='deck';obj['emissivo']=p.inputs['Emission Strength'].default_value>0
 output.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in output:obj.select_set(True)
target=OUT/'deck-mars.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_lights=False,export_cameras=False,export_animations=False)
b=target.read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
tri=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
assert tri==sum(p['triangulos'] for p in pieces)
assert hashfile(SOURCE)==before
report=dict(fonte_commit='63634bd',fonte_sha256=before,glb_sha256=hashfile(target),bytes=len(b),triangulos=tri,malhas=len(g['meshes']),materiais=len(g['materials']),pecas=pieces,omitidas=omitted,ajustes={'altura_m':-.455,'conexao_plana_m':[4,2.4],'octogono_m':[12,12]},sem_fisica=True)
(OUT/'manifesto.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('DECK_RUNTIME',json.dumps({k:v for k,v in report.items() if k not in ('pecas','omitidas')}))
