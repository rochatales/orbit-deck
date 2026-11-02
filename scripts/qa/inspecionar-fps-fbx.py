"""Blender -b --factory-startup -P scripts/qa/inspecionar-fps-fbx.py.
Somente leitura: consulta metadados originais sem importar/reexportar o modelo.
"""
import hashlib, json
from pathlib import Path
from io_scene_fbx import parse_fbx

base = Path(__file__).resolve().parents[2] / 'art-source/personagens/explorador-astronauta/mixamo'
report = []
for filename in ['Breathing_Idle.fbx', 'Walking_Backwards.fbx', 'Rifle _Run_final.fbx', 'Reloading.fbx']:
    source = base / filename
    tree, version = parse_fbx.parse(str(source))
    settings = next(node for node in tree.elems if node.id == b'GlobalSettings')
    properties = next(node for node in settings.elems if node.id == b'Properties70')
    data = {node.props[0].decode(): node.props[-1] for node in properties.elems
            if node.id == b'P' and node.props[0] in [b'TimeMode', b'CustomFrameRate']}
    report.append({'file': filename, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), **data})
print('FPS_FONTES ' + json.dumps(report, indent=2))
