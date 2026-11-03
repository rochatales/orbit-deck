"""Pavimento plano da colônia: tile real do corredor; sem plataformas dos prédios."""
import bpy, bmesh, sys, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'scripts'))
import colony_floor_geometry as tile
ART=ROOT/'art-source/predios-colonia-v001'
buildings=json.loads((ROOT/'src/assets/buildings/colony-buildings-v001.json').read_text())
original=json.loads((ROOT/'src/assets/colony-v007.manifest.json').read_text())
replaced={r for b in buildings for r in b['replaces']}
# União do pavimento original substituído + extensões efetivamente caminháveis.
areas=[{k:a[k] for k in ['minX','maxX','minZ','maxZ']} for a in original['walkableAreas'] if a['id'] in replaced]
areas += [b['floor'] for b in buildings]
areas += [dict(minX=5.3,maxX=8.5,minZ=10.5,maxZ=16.9),dict(minX=5.3,maxX=15.8,minZ=14.9,maxZ=17.8)]
areas=[{k:round(v,6) for k,v in a.items()} for a in areas]
interiors=[{k:round(v,6) for k,v in b['floor'].items()} for b in buildings]
inside=lambda x,z,rects:any(r['minX']<x<r['maxX'] and r['minZ']<z<r['maxZ'] for r in rects)
xs=sorted({r[k] for r in areas+interiors for k in ['minX','maxX']})
zs=sorted({r[k] for r in areas+interiors for k in ['minZ','maxZ']})
cells=[]
for x0,x1 in zip(xs,xs[1:]):
 for z0,z1 in zip(zs,zs[1:]):
  if inside((x0+x1)/2,(z0+z1)/2,areas):cells.append((x0,x1,z0,z1,inside((x0+x1)/2,(z0+z1)/2,interiors)))
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
source=ROOT/'src/assets/colony-v006.glb'
bpy.ops.import_scene.gltf(filepath=str(source));bpy.context.view_layer.update()
reference=bpy.data.objects[tile.REFERENCE]
world=reference.matrix_world.copy();reference.parent=None;reference.matrix_world=world
col=reference.data.color_attributes.active_color
if col.name!='Col':
 old=col.name;col.name='Col'
 for m in reference.data.materials:
  if m and m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='VERTEX_COLOR':n.layer_name='Col'
    if n.type=='ATTRIBUTE' and n.attribute_name==old:n.attribute_name='Col'
for o in list(bpy.data.objects):
 if o!=reference:bpy.data.objects.remove(o,do_unlink=True)
objects=[]
for clean in [False,True]:
 verts=[];faces=[]
 for x0,x1,z0,z1,c in cells:
  if c!=clean:continue
  start=len(verts);verts.extend([(x0,-z0,0),(x0,-z1,0),(x1,-z1,0),(x1,-z0,0)]);faces.append(tuple(range(start,start+4)))
 me=bpy.data.meshes.new('Pavimento');me.from_pydata(verts,[],faces);me.materials.append(reference.data.materials[0]);me.update()
 obj=bpy.data.objects.new('ColonyFloor_Clean' if clean else 'ColonyFloor_Exterior',me);bpy.context.collection.objects.link(obj)
 tile.FLOORS=(obj.name,)
 selected_reference=reference
 reference_name=tile.REFERENCE
 if clean:
  # O tile é uma peça fechada: projetar também seu fundo duplica a cobertura
  # em Z=0 e cria z-fighting. O interior usa apenas as faces voltadas para cima.
  selected_reference=reference.copy();selected_reference.data=reference.data.copy()
  bpy.context.collection.objects.link(selected_reference);selected_reference.name='TileInterior_SomenteTopo'
  bm=bmesh.new();bm.from_mesh(selected_reference.data)
  normal_matrix=selected_reference.matrix_world.to_3x3().inverted().transposed()
  lower=[f for f in bm.faces if (normal_matrix@f.normal).z<=1e-6]
  bmesh.ops.delete(bm,geom=lower,context='FACES');bm.to_mesh(selected_reference.data);bm.free()
  tile.REFERENCE=selected_reference.name
 tile.tile_external_floors([obj,selected_reference])
 tile.REFERENCE=reference_name
 obj['tile_referencia']=reference_name
 if clean:
  # Mesma geometria de placas/chanfros/juntas. Só retira poeira/desgaste da cor.
  for entry in obj.data.color_attributes['Col'].data:
   entry.color=(*((.107023105,.102241732,.086500458) if entry.color[0]<.16 else (.275,.259,.220)),1)
 obj['piso_compartilhado']=True;obj['limpo']=clean;objects.append(obj)
for o in bpy.context.scene.objects:o.select_set(False)
for o in objects:o.select_set(True)
out=ART/'export/colony-shared-floor-v001.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True)
(ROOT/'src/assets/buildings/colony-shared-floor-v001.glb').write_bytes(out.read_bytes())
for o in objects:o.data.calc_loop_triangles()
report=dict(areas=areas,interiors=interiors,cells=[list(c[:4]) for c in cells],tile='ARQ_Lab_Piso_Patio',source='src/assets/colony-v006.glb',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sha256=hashlib.sha256(out.read_bytes()).hexdigest(),cleanColors=[[.107023105,.102241732,.086500458],[.275,.259,.220]],height=0,interiorLayers=1,interiorTopOnly=True,triangles=sum(len(o.data.loop_triangles) for o in objects))
(ROOT/'src/assets/buildings/colony-shared-floor-v001.json').write_text(json.dumps(report,indent=2)+'\n')
(ART/'notas/piso-compartilhado-v001.json').write_text(json.dumps(report,indent=2)+'\n')
