"""Valida escala incorporada, ações e passagem com jogador de tamanho inalterado."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path(__file__).resolve().parents[1];scene=bpy.context.scene;S=.75
scene.frame_set(1);bpy.context.view_layer.update();root=scene.objects['Barracks']
assert tuple(root.scale)==(1,1,1) and root.location.length==0
original=json.loads((OUT/'notas/medidas-v002.json').read_text())
vs=[o for o in root.children if o.type=='MESH'];cols=[o for o in root.children if o.name.startswith('COL_')]
assert len(vs)==13 and len(cols)==33 and len({m.as_pointer() for o in vs for m in o.data.materials})==1
max_error=0
for old in original['objects']:
    if old['type']!='MESH':continue
    o=scene.objects[old['name']];pts=[o.matrix_world@v.co for v in o.data.vertices]
    for i in range(3):
        for key,fn in [('min',min),('max',max)]:max_error=max(max_error,abs(fn(p[i] for p in pts)-old[key][i]*S))
assert max_error<1e-5
bvh={o.name:BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in vs if not o.name.startswith('EntranceDoor')}
def hit(a,b):
    a,b=Vector(a),Vector(b);d=b-a
    return [n for n,tree in bvh.items() if tree.ray_cast(a,d.normalized(),d.length)[0] is not None]
route=[(-6.4*S,0),(-4.4*S,0),(0,0),(0,-5.4*S)];count=0
for a,b in zip(route,route[1:]):
    for h in [.2625+.15,.2625+.65,.2625+1.25]:
        for i in range(8):
            ang=i*math.pi/4;ox,oy=.38*math.cos(ang),.38*math.sin(ang)
            p=(a[0]+ox,a[1]+oy,h);q=(b[0]+ox,b[1]+oy,h)
            assert not hit(p,q),(hit(p,q),p,q)
            count+=1
for name,expected in [('EntranceDoor',(0,-1.0875,0)),('EntranceDoor_S',(1.0875,0,0))]:
    scene.frame_set(20);assert (scene.objects[name].location-Vector(expected)).length<1e-5
scene.frame_set(1);bpy.context.view_layer.update()
col_errors=[]
for suffix,name in [('W','EntranceDoor'),('S','EntranceDoor_S')]:
    o=scene.objects[name];c=scene.objects['COL_Door_'+suffix];p=[o.matrix_world@v.co for v in o.data.vertices]
    q=[c.matrix_world@Vector((a,b,d)) for a in [-1,1] for b in [-1,1] for d in [-1,1]]
    error=max(abs(fn(v[i] for v in p)-fn(v[i] for v in q)) for i in range(3) for fn in [min,max]);assert error<1e-5;col_errors.append(error)
for o in cols:
    assert all(abs(o.scale[i]*2-o['size_m'][i])<1e-5 for i in range(3)),o.name
    assert (o.location-Vector(o['center_m'])).length<1e-5
assert abs(scene.objects['COL_Ramp_W']['rise']-.2625)<1e-8
assert abs(scene.objects['COL_Ramp_W']['run']-1.2)<1e-8
for o in vs:o.data.calc_loop_triangles()
r={'passed':True,'blendSHA256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'scaleBaked':S,'rootScale':[1,1,1],'meshBoundsMaxErrorM':max_error,'triangles':sum(len(o.data.loop_triangles) for o in vs),'materials':1,'meshes':13,'COLnodes':33,'doorCOLAABBErrorsM':col_errors,'doorAnimationTravelM':1.0875,'internalRoute':{'raySamples':count,'bodyRadiusUnscaledM':.38,'bodyTopAboveFloorM':1.25,'passed':True},'limitation':'Amostras geométricas, não validação Rapier ou aceite de jogabilidade.'}
(OUT/'notas/validacao-v003.json').write_text(json.dumps(r,indent=2,ensure_ascii=False)+'\n');print(json.dumps(r,indent=2))
