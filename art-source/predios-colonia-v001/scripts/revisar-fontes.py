"""Leitura das cópias Blender; nunca salva/reexporta cenas do autor."""
import bpy, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = []
for name in ['data_center.blend', 'meeting_room.blend', 'cafeteria.blend']:
    bpy.ops.wm.open_mainfile(filepath=str(root / 'originais' / name))
    out.append({'file': name, 'objects': len(bpy.data.objects),
                'colliders': [{'name': o.name, 'display': o.empty_display_type,
                               'size': o.empty_display_size}
                              for o in bpy.data.objects if o.name.startswith('COL_')][:3],
                'actions': [a.name for a in bpy.data.actions]})
(root / 'notas' / 'revisao-blend.json').write_text(json.dumps(out, indent=2) + '\n')
