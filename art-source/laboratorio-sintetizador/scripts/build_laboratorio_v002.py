"""Variante de integração: piso sem duplicatas, casca completa e pátio padrão v007.
Lê v001; salva somente v002 nesta worktree. Blender 5.1.
"""
import bpy,bmesh,json,sys,hashlib,math
sys.dont_write_bytecode=True
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; PROJECT=ROOT.parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blend/laboratorio_sintetizador_v001.blend'))
obj=bpy.data.objects['LaboratorySynthesizerMesh']; material=obj.data.materials[0]
# Guarda duas amostras de UV do atlas autoral, sem rebake ou nova textura.
def sample(predicate):
 for f in obj.data.polygons:
  vs=[obj.data.vertices[i].co for i in f.vertices]
  if predicate(vs):
   return tuple(sum(obj.data.uv_layers.active.data[i].uv[k] for i in f.loop_indices)/len(f.loop_indices) for k in range(2))
 raise RuntimeError('Amostra UV ausente')
white=sample(lambda vs:all(abs(v.y-4.775)<1e-4 for v in vs) and max(v.z for v in vs)>3.5)
dark=sample(lambda vs:all(abs(v.y+4.71)<1e-4 for v in vs) and max(v.z for v in vs)>2)
# Piso superior do pedestal e piso interno coincidiam em z=0. Mantém só o interno.
bm=bmesh.new();bm.from_mesh(obj.data)
removed=[]
for f in bm.faces:
 vs=[v.co for v in f.verts]
 if not all(abs(v.z)<1e-6 for v in vs):continue
 xs=[v.x for v in vs];ys=[v.y for v in vs]
 if (min(xs)<-7.29 and max(xs)>7.29) or min(xs)<-7.59 or (min(ys)<-5.74):removed.append(f)
# Patamares externos perdem só a face superior: recebem o mesmo tile do corredor.
assert len(removed)==3,len(removed)
# Conserva a borda de 30 cm do pedestal, sem repetir os 140 m² do interior.
base=next(f for f in removed if min(v.co.x for v in f.verts)<-7.29 and max(v.co.x for v in f.verts)>7.29)
uv_layer=bm.loops.layers.uv.active
uv=tuple(sum(loop[uv_layer].uv[k] for loop in base.loops)/len(base.loops) for k in range(2))
for x0,x1,y0,y1 in [(-7.3,-7,-5.3,5.3),(7,7.3,-5.3,5.3),(-7,7,-5.3,-5),(-7,7,5,5.3)]:
 face=bm.faces.new([bm.verts.new((x,y,0)) for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]])
 for loop in face.loops:loop[uv_layer].uv=uv

bmesh.ops.delete(bm,geom=removed,context='FACES');bm.to_mesh(obj.data);bm.free()

def boxes(name,items):
 verts=[];faces=[];colors=[]
 for (x,y,z),(w,d,h),uv in items:
  k=len(verts);verts += [(x+a*w/2,y+b*d/2,z+c*h/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:faces.append(tuple(k+i for i in f));colors.append(uv)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material)
 layer=mesh.uv_layers.new(name='UVMap')
 for f,uv in zip(mesh.polygons,colors):
  for i in f.loop_indices:layer.data[i].uv=uv
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o
wall=boxes('Building_Walls',[
 ((-3,-4.78,2.245),(7.65,.51,2.71),white),((5,-4.78,2.245),(3.65,.51,2.71),white),
 ((-6.78,-2.85,2.245),(.51,3.95,2.71),white),((-6.78,3.05,2.245),(.51,3.55,2.71),white),
 ((2,-4.78,3.105),(2.5,.49,.99),white),((-6.78,.2,3.105),(.49,2.3,.99),white),
 ((-6.65,-4.65,2.225),(.7,.7,2.75),white)])
roof=boxes('Building_Roof',[
 ((0,.1,3.79),(14.65,10.7,.28),white),
 ((0,-5.25,3.7),(14.65,.12,.18),dark),((0,5.45,3.7),(14.65,.12,.18),dark),
 ((-7.325,.1,3.7),(.12,10.7,.18),dark),((7.325,.1,3.7),(.12,10.7,.18),dark)])
# Importa o tile real sem incorporar o layout antigo ao laboratório.
original=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(PROJECT/'src/assets/colony-v006.glb'))
added=set(bpy.context.scene.objects)-original
reference=next(o for o in added if o.get('colony_name',o.name)=='ARQ_Lab_Piso_Patio')
reference.data=reference.data.copy();reference.data.color_attributes[0].name='Col'
for mat in reference.data.materials:
 for n in mat.node_tree.nodes:
  if n.type=='VERTEX_COLOR':n.layer_name='Col'
bm=bmesh.new();bm.from_mesh(reference.data);norm=reference.matrix_world.to_3x3().inverted().transposed()
bmesh.ops.delete(bm,geom=[f for f in bm.faces if (norm@f.normal).z<=1e-6],context='FACES');bm.to_mesh(reference.data);bm.free()
manifest=json.loads((PROJECT/'src/assets/laboratorio/laboratorio-v001.manifest.json').read_text())
rects=manifest['connectors']+manifest['areas'][1:]
# União retangular exata: patamares e conectores nunca duplicam superfície.
main=manifest['areas'][0]
xs=sorted(set(x for r in rects+[main] for x in [r['minX'],r['maxX']]))
zs=sorted(set(x for r in rects+[main] for x in [r['minZ'],r['maxZ']]))
vv=[];ff=[]
for a,b in zip(xs,xs[1:]):
 for c,d in zip(zs,zs[1:]):
  if not any(r['minX']<(a+b)/2<r['maxX'] and r['minZ']<(c+d)/2<r['maxZ'] for r in rects):continue
  if main['minX']<(a+b)/2<main['maxX'] and main['minZ']<(c+d)/2<main['maxZ']:continue
  k=len(vv);vv.extend([(a,-c,0),(a,-d,0),(b,-d,0),(b,-c,0)]);ff.append(tuple(range(k,k+4)))
mesh=bpy.data.meshes.new('PavimentoLaboratorio');mesh.from_pydata(vv,[],ff);mesh.materials.append(material)
paving=bpy.data.objects.new('LaboratorioPavimento',mesh);bpy.context.collection.objects.link(paving)
sys.path.insert(0,str(PROJECT/'scripts'));import colony_floor_geometry as tiles
tiles.FLOORS=(paving.name,);reference.name=tiles.REFERENCE;tiles.tile_external_floors([paving,reference])
for v in paving.data.vertices:v.co-=Vector((13.5,12.5,0))
for o in added:bpy.data.objects.remove(o,do_unlink=True)
# UVs/imagens atlas são as originais. Grupos estáticos continuam no esqueleto original.
roof['runtime_role']='roof';wall['runtime_role']='walls';paving['runtime_role']='walkway'
bpy.context.scene.frame_set(1)
for o in bpy.context.scene.objects:o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blend/laboratorio_sintetizador_v002.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'export/laboratorio_sintetizador_v002.glb'),export_format='GLB',export_animations=True,export_nla_strips=True,export_extras=True)
export=ROOT/'export/laboratorio_sintetizador_v002.glb'
(PROJECT/'src/assets/laboratorio/laboratorio-v002.glb').write_bytes(export.read_bytes())
# O corredor aberto EDEN/Lab continua caminhável por toda a faixa pavimentada.
manifest['removedAreas']=[id for id in manifest['removedAreas'] if id!='open-eden-lab-circulation']
manifest['version']='v002';manifest['sourceSha256']=hashlib.sha256(export.read_bytes()).hexdigest()
manifest['floorCutAreas']=[manifest['areas'][0]]+rects
manifest['roofArea']={'minX':6.975,'maxX':20.275,'minZ':-17.275,'maxZ':-7.975}
for c in manifest['staticCuboids']:
 if c['id'] in ['LAB_COL_SouthWestWall','LAB_COL_SouthEastWall','LAB_COL_WestSouthWall','LAB_COL_WestNorthWall','LAB_COL_CornerSW']:
  c['position']['y']=1.8;c['halfExtents'][1]=1.8;c['bounds']['minY']=0;c['bounds']['maxY']=3.6
 if c['id'].endswith('Lintel'):
  c['position']['y']=2.995;c['halfExtents'][1]=.605;c['bounds']['minY']=2.39;c['bounds']['maxY']=3.6
counts={}
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.data.calc_loop_triangles();counts[o.name]=len(o.data.loop_triangles)
manifest['triangles']=sum(counts.values());manifest['pavingTriangles']=counts[paving.name];manifest['materials']=2
(PROJECT/'src/assets/laboratorio/laboratorio-v002.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
report={'variant':'v002','removedCoplanarFaces':len(removed),'triangles':counts,'materials':2,'sha256':manifest['sourceSha256'],'roofArea':manifest['roofArea'],'tiles':{'source':tiles.REFERENCE,'tile':[1.25,1.5],'joint':.03}}
(ROOT/'notas/validacao-v002.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
