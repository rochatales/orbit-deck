"""Mede fonte/variante sem salvar ou alterar o .blend de entrada.
blender -b <blend> -P <script> -- <json de saída>
"""
import bpy, json, sys, pathlib
from mathutils import Vector

def bounds(obj):
    pts=[obj.matrix_world @ v.co for v in obj.data.vertices]
    lo=[min(v[i] for v in pts) for i in range(3)];hi=[max(v[i] for v in pts) for i in range(3)]
    return {'min':lo,'max':hi,'size':[hi[i]-lo[i] for i in range(3)]}
rows=[]
for o in sorted(bpy.context.scene.objects,key=lambda x:x.name):
    row={'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'location':list(o.location),'hideRender':o.hide_render}
    if o.type=='MESH':
        o.data.calc_loop_triangles();row.update(bounds(o));row['triangles']=len(o.data.loop_triangles)
        row['materials']=[m.name for m in o.data.materials if m]
    rows.append(row)
meshes=[r for r in rows if r['type']=='MESH']; visual=[r for r in meshes if not r['name'].startswith('COL_')]; noGround=[r for r in visual if r['name']!='Ground']
def union(rs):
    return {'min':[min(r['min'][i] for r in rs) for i in range(3)],'max':[max(r['max'][i] for r in rs) for i in range(3)]}
report={'blenderVersion':bpy.app.version_string,'sourceFile':pathlib.Path(bpy.data.filepath).name,'axes':'Blender: X leste, Y norte, Z cima. glTF/Three: x=X, y=Z, z=-Y.', 'visualTriangles':sum(r['triangles'] for r in visual),'visualTrianglesNoGround':sum(r['triangles'] for r in noGround),'colliderTriangles':sum(r['triangles'] for r in meshes if r['name'].startswith('COL_')),'visualMaterialCount':len(set(m for r in visual for m in r['materials'])),'visualBoundsNoGround':union(noGround),'objects':rows}
path=pathlib.Path(sys.argv[sys.argv.index('--')+1]);path.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='objects'},indent=2));print('\n'.join(f"{r['name']}: {r.get('size','')}" for r in rows))
