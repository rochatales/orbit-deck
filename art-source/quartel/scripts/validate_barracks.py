"""Confere contratos e amostras geométricas do .blend v002, sem salvar.
Blender -b art-source/quartel/blend/barracks-v002.blend -P <este script>
"""
import bpy, json, math, pathlib, hashlib
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=pathlib.Path(__file__).resolve().parents[1]
scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
root=scene.objects['Barracks'];roof=scene.objects['Building_Roof'];interior=scene.objects['Building_Interior']
assert roof!=interior and roof.parent==root and interior.parent==root
assert list(root.scale)==[1,1,1] and root.location.length<1e-8 and root.rotation_euler.to_matrix().is_identity
assert not scene.objects.get('Ground')
visual=[o for o in root.children if o.type=='MESH']
assert len({m.as_pointer() for o in visual for m in o.data.materials})==1
col=[o for o in root.children if o.name.startswith('COL_')]
assert len(col)==33 and all(o.type=='EMPTY' for o in col)
BVH={o.name:BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]) for o in visual}
def hit(names,a,b):
    a,b=Vector(a),Vector(b);d=b-a
    return [n for n in names if BVH[n].ray_cast(a,d.normalized(),d.length)[0] is not None]
def in_col(o,p):
    q=o.matrix_world.inverted()@Vector(p)
    return max(abs(v) for v in q)<=1.0001
sides={'S':((0,-5,0),0,9.4),'E':((6,0,0),90,7.4),'N':((0,5,0),180,9.4),'W':((-6,0,0),270,7.4)}
def world(side,u,v,h):
    origin,angle,_=sides[side];a=math.radians(angle)
    return (origin[0]+math.cos(a)*u-math.sin(a)*v,origin[1]+math.sin(a)*u+math.cos(a)*v,h)
checks=[];count=0
for side,(_,_,length) in sides.items():
    wall=scene.objects['Wall_'+side]
    cs=[o for o in col if o.get('wall')==wall.name]
    for h in [1.35,2.9]:
        for i in range(int(length*10)+1):
            u=-length/2+.025+i*(length-.05)/int(length*10)
            expected=not(side in ['W','S'] and abs(u)<.65 and h<2.6)
            actual=bool(hit([wall.name],world(side,u,-.2,h),world(side,u,.45,h)))
            physical=any(in_col(o,world(side,u,.125,h)) for o in cs)
            assert actual==expected,(side,u,h,actual,expected)
            assert physical==expected,(side,u,h,physical,expected)
            count+=1
checks.append({'name':'paredes retas e vãos: Wall vs COL','samples':count,'passed':True})
# Vãos livres de geometria estática e COL de paredes em toda a altura útil.
static=[o.name for o in visual if not o.name.startswith('EntranceDoor')]
count=0
for side in ['W','S']:
    for u in [-.62,-.3,0,.3,.62]:
        for h in [.45,1.0,1.6,2.5]:
            a,b=world(side,u,-.55,h),world(side,u,.48,h)
            assert not hit(static,a,b),(side,u,h,hit(static,a,b))
            assert not any(in_col(o,world(side,u,.125,h)) for o in col if o.get('kind')=='wall')
            count+=1
checks.append({'name':'dois vãos de 1,30 m: sem vidro/parede/props estáticos bloqueando','samples':count,'passed':True})
# Arcos: todos os pontos amostrados no núcleo da parede cobertos por caixas.
count=0
for j,((cx,cy),a0) in enumerate([((4.7,-3.7),-90),((4.7,3.7),0),((-4.7,3.7),90),((-4.7,-3.7),180)]):
    cs=[o for o in col if o.name.startswith('COL_Corner_'+str(j)+'_')]
    for i in range(91):
        a=math.radians(a0+i)
        for r in [1.075,1.175,1.275]:
            p=(cx+r*math.cos(a),cy+r*math.sin(a),1.4)
            assert any(in_col(o,p) for o in cs),(j,i,r)
            count+=1
checks.append({'name':'cantos: cobertura conservadora por caixas tangentes','samples':count,'passed':True,'radialExcessMaxM':.025})
# Caixa da folha coincide com o AABB de toda a malha; material/ação próprios.
for suffix,name in [('W','EntranceDoor'),('S','EntranceDoor_S')]:
    o=scene.objects[name];c=scene.objects['COL_Door_'+suffix]
    vs=[o.matrix_world@v.co for v in o.data.vertices]
    cs=[c.matrix_world@Vector((a,b,d)) for a in [-1,1] for b in [-1,1] for d in [-1,1]]
    error=max(abs(f(v[i] for v in vs)-f(v[i] for v in cs)) for i in range(3) for f in [min,max])
    assert error<1e-5,(name,error)
    checks.append({'name':'COL da folha '+suffix,'aabbErrorMaxM':error,'passed':True})
# Caminho interno proposto, com portas abertas; amostragem de raios ao redor do corpo.
route=[(-6.4,0),(-4.4,0),(0,0),(0,-5.4)]
count=0
for a,b in zip(route,route[1:]):
    for h in [.5,1.0,1.55]:
        for i in range(8):
            ang=i*math.pi/4;ox,oy=.38*math.cos(ang),.38*math.sin(ang)
            p=(a[0]+ox,a[1]+oy,h);q=(b[0]+ox,b[1]+oy,h)
            assert not hit(static,p,q),('rota interna',hit(static,p,q),p,q)
            count+=1
checks.append({'name':'rota interna entre portas: raios, raio de referência 0,38 m','samples':count,'passed':True,'limitation':'Amostragem de geometria, não ensaio Rapier ou aceite de jogabilidade.'})
report={'blendSHA256':hashlib.sha256(pathlib.Path(bpy.data.filepath).read_bytes()).hexdigest(),'passed':True,'checks':checks,'visualMeshCount':len(visual),'materials':1,'COLnodes':len(col),'roofNode':roof.name,'interiorNode':interior.name,'limitations':['COL_* são empties/metadados, não colliders instalados no jogo.','COL de janelas bloqueiam o vidro; molduras/rodapés decorativos ficam fora do núcleo de parede.','COL_Floor é referência rounded_rect_floor; rampas analytic_ramp. Nada cria física nesta entrega.','Teto separado confirmado; paredes internas pertencem a Building_Interior e ficam visíveis no corte de teto.']}
(OUT/'notas/validacao-v002.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print(json.dumps(report,indent=2,ensure_ascii=False))
