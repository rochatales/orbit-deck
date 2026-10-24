"""Deriva nave/impacto do estudo aprovado, sem editar o .blend ou o mapa ativo.
Agrupa peças estáticas por material para reduzir draw calls; sem deck ou ruínas.
"""
import bpy, json, hashlib, struct
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/ares-shanghai-runtime'
SOURCE = ART / 'referencias/shanghai_ares_aprovado_e31162a.blend'
OUT = ROOT / 'src/assets/ares-lander'
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before = digest(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.view_layer.update()
deps = bpy.context.evaluated_depsgraph_get()
groups = defaultdict(list)
pieces = []
source_ids = set()
staging = bpy.data.collections.new('ARES_RUNTIME')
bpy.context.scene.collection.children.link(staging)

for obj in list(bpy.context.scene.objects):
    cols = [c.name for c in obj.users_collection]
    is_ship = any(n.startswith(('01_', '02_', '03_', '04_')) for n in cols)
    is_impact = '12_IMPACTO_Fraturas' in cols
    if not (is_ship or is_impact) or obj.type not in {'MESH', 'CURVE', 'FONT'}:
        continue
    sid = obj['id_estavel']
    assert sid not in source_ids
    source_ids.add(sid)
    ev = obj.evaluated_get(deps)
    mesh = ev.to_mesh().copy()
    ev.to_mesh_clear()
    mesh.transform(obj.matrix_world)
    mesh.calc_loop_triangles()
    # Todos os efeitos do estudo usam um material por peça.
    assert len(mesh.materials) == 1, obj.name
    mat = mesh.materials[0]
    positions = [v.co for v in mesh.vertices]
    bounds = [min(v[i] for v in positions) for i in range(3)] + [max(v[i] for v in positions) for i in range(3)]
    role = 'nave' if is_ship else 'impacto'
    # Holograma e emissivos não projetam uma sombra sólida no acesso.
    shader = mat.node_tree.nodes.get('Principled BSDF')
    emissive = shader.inputs['Emission Strength'].default_value > 0
    key = (role, mat.name, emissive)
    new = bpy.data.objects.new('TMP_' + sid, mesh)
    staging.objects.link(new)
    groups[key].append(new)
    pieces.append(dict(id=sid, nome=obj.name, conjunto=role, triangulos=len(mesh.loop_triangles), limites_blender=bounds))

# Microrelevo procedural não é exportável. A fuligem mantém COLOR_0 + alpha.
for mat in {o.data.materials[0] for obs in groups.values() for o in obs}:
    p = mat.node_tree.nodes.get('Principled BSDF')
    if mat.name != 'SH_Carbone_Diffus':
        for socket in ('Base Color', 'Normal'):
            for link in list(p.inputs[socket].links): mat.node_tree.links.remove(link)
        p.inputs['Base Color'].default_value = mat.diffuse_color

output = []
for index, ((role, material, emissive), objects) in enumerate(sorted(groups.items())):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = f'ARES_{role}_{index:02d}'
    merged['id_estavel'] = merged.name
    merged['conjunto'] = role
    merged['emissivo'] = emissive
    merged['material_fonte'] = material
    output.append(merged)

bpy.ops.object.select_all(action='DESELECT')
for obj in output: obj.select_set(True)
target = OUT / 'ares-lander.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
    export_apply=True, export_extras=True, export_yup=True, export_lights=False,
    export_cameras=False, export_animations=False)
raw = target.read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+size])
triangles = sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
assert triangles == sum(p['triangulos'] for p in pieces)
assert sum(p['triangulos'] for p in pieces if p['conjunto']=='nave') == 98202
assert not gltf.get('animations') and not gltf.get('cameras')
assert digest(SOURCE) == before
report = dict(fonte_commit='e31162a', fonte_sha256=before, glb_sha256=digest(target),
    bytes=len(raw), triangulos=triangles, pecas_fonte=len(pieces),
    malhas=len(gltf['meshes']), materiais=len(gltf['materials']), sem_deck=True,
    sem_luzes=True, sem_fisica=True, pecas=pieces)
(OUT/'manifesto.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('ARES_RUNTIME',json.dumps({k:v for k,v in report.items() if k!='pecas'}))
