"""Blender -b --factory-startup -P <este script>; fonte preservada, somente Backpack exportado."""
import bpy, hashlib, json
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / 'fontes/player_backpack.blend'
OUTPUT = BASE / 'export/backpack-v001.glb'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
source_hash = sha(SOURCE)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
root = bpy.data.objects.get('Backpack')
if root is None:
    raise RuntimeError('Fonte sem o grupo Backpack')
objects = [root, *root.children_recursive]
meshes = [obj for obj in objects if obj.type == 'MESH']
if len(meshes) != 4:
    raise RuntimeError('Esperadas as quatro partes da mochila')
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bounds = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
triangles = 0
for obj in meshes:
    mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)
    obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB', use_selection=True,
    export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
assert sha(SOURCE) == source_hash
report = {
    'source': 'fontes/player_backpack.blend', 'source_sha256': source_hash,
    'output': 'export/backpack-v001.glb', 'sha256': sha(OUTPUT), 'bytes': OUTPUT.stat().st_size,
    'objects': [obj.name for obj in objects], 'triangles': triangles,
    'bounds_blender': {key: [op(v[i] for v in bounds) for i in range(3)] for key, op in [('min', min), ('max', max)]},
    'runtime': 'src/assets/characters/player/backpack.glb',
    'selection': 'Backpack e quatro meshes filhos; Cube, Camera e Light excluídos sem alterar a fonte',
}
(BASE / 'notas/export-v001.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
