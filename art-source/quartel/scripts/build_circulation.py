"""Fecha duas lacunas dos corredores do quartel com o tile exato do v007.
Derivado do GLB v006 preservado e do mesmo gerador de pisos; não altera o quartel.
"""
import bpy,bmesh,json,sys,hashlib
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(PROJECT/'src/assets/colony-v006.glb'))
reference=next(o for o in bpy.context.scene.objects if o.get('colony_name',o.name)=='ARQ_Lab_Piso_Patio')
reference.data=reference.data.copy();reference.data.color_attributes[0].name='Col'
for mat in reference.data.materials:
 for n in mat.node_tree.nodes:
  if n.type=='VERTEX_COLOR':n.layer_name='Col'
bm=bmesh.new();bm.from_mesh(reference.data);norm=reference.matrix_world.to_3x3().inverted().transposed()
bmesh.ops.delete(bm,geom=[f for f in bm.faces if (norm@f.normal).z<=1e-6],context='FACES');bm.to_mesh(reference.data);bm.free()
for o in list(bpy.context.scene.objects):
 if o!=reference:bpy.data.objects.remove(o,do_unlink=True)
areas=[{'id':'quartel-northeast-circulation','minX':14.5,'maxX':15.5,'minZ':-5.8,'maxZ':-4.8375}, {'id':'quartel-southeast-circulation','minX':13.75,'maxX':15.5,'minZ':4.8375,'maxZ':5.75}]
v=[];f=[]
for b in areas:
 k=len(v);v.extend([(b['minX'],-b['minZ'],0),(b['minX'],-b['maxZ'],0),(b['maxX'],-b['maxZ'],0),(b['maxX'],-b['minZ'],0)]);f.append(tuple(range(k,k+4)))
mesh=bpy.data.meshes.new('QuartelCirculation');mesh.from_pydata(v,[],f);mesh.materials.append(reference.data.materials[0]);floor=bpy.data.objects.new('QuartelCirculation',mesh);bpy.context.collection.objects.link(floor)
sys.path.insert(0,str(PROJECT/'scripts'));import colony_floor_geometry as tiles
tiles.FLOORS=(floor.name,);reference.name=tiles.REFERENCE;tiles.tile_external_floors([floor,reference]);bpy.data.objects.remove(reference,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'export/quartel-circulation-v001.glb'),export_format='GLB',export_extras=True)
blob=(ROOT/'export/quartel-circulation-v001.glb').read_bytes();(PROJECT/'src/assets/quartel/quartel-circulation-v001.glb').write_bytes(blob)
floor.data.calc_loop_triangles()
report={'areas':areas,'triangles':len(floor.data.loop_triangles),'areaM2':sum((b['maxX']-b['minX'])*(b['maxZ']-b['minZ']) for b in areas),'sha256':hashlib.sha256(blob).hexdigest(),'reference':tiles.REFERENCE,'tile':[1.25,1.5],'joint':.03}
text=json.dumps(report,indent=2)+'\n';(PROJECT/'src/assets/quartel/quartel-circulation-v001.manifest.json').write_text(text);(ROOT/'notas/circulation-v001.json').write_text(text);print(text)
