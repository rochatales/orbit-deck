"""Rio v001. Blender 5.1.1 --background --python <este arquivo> [-- --render].
Reconstrói fontes editáveis, kit compartilhado e dois GLBs a partir da planta.
"""
import bpy
import sys
import json
import math
import random
from pathlib import Path
from collections import defaultdict
from mathutils import Vector, Matrix

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ART/'scripts'))
from textures import generate
D = json.loads((ART/'export/layout.json').read_text())
R = random.Random(13112026)
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
S.unit_settings.system = 'METRIC'
S.unit_settings.scale_length = 1
for folder in ['blend','texturas','notas','renders/v001']:
    (ART/folder).mkdir(parents=True,exist_ok=True)

def collection(name):
    c=bpy.data.collections.new(name)
    S.collection.children.link(c)
    return c
SOURCE=collection('01_KIT_LAYOUT_EDITAVEL')
KIT=collection('00_MODULOS_REUTILIZAVEIS')
MAP=collection('02_EXPORT_MAPA')
LIMITS=collection('03_EXPORT_LIMITES')
HELP=collection('04_COLISORES_MARCADORES')
RIG=collection('05_CAMERAS_LUZ_REVISAO')
generate()
M={}
for name,col,tex in [
    ('reboco',(1,1,1),'reboco'),('concreto',(1,1,1),'concreto'),
    ('asfalto',(1,1,1),'asfalto'),('pedra',(1,1,1),'pedra'),
    ('areia',(1,1,1),'areia'),('madeira',(1,1,1),'madeira'),
    ('ferrugem',(1,1,1),'ferrugem'),('folha',(1,1,1),'folha'),
    ('ondas',(1,1,1),'ondas'),('vidro',(.075,.12,.12),None),
    ('metal',(.17,.19,.17),None),('toldo',(.22,.36,.32),None),
    ('faixa',(.65,.60,.44),None),('mar',(.12,.29,.30),None),
    ('espuma',(.66,.75,.65),None)]:
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*col,1)
    bs.inputs['Roughness'].default_value=.9 if name not in ['mar','vidro'] else .45
    if tex:
        t=m.node_tree.nodes.new('ShaderNodeTexImage')
        t.image=bpy.data.images.get('RIO_'+tex)
        t.image.pack()
        t.extension='REPEAT'
        m.node_tree.links.new(t.outputs['Color'],bs.inputs['Base Color'])
    M[name]=m

CACHE={}
MODULES={}
records=[]
category='mapa'
owner='solo'
def mesh(name,verts,faces,mat,uvscale=3,cache=None):
    key=cache
    if key and key in CACHE:
        data=CACHE[key]
    else:
        data=bpy.data.meshes.new(name)
        data.from_pydata(verts,[],faces)
        data.update()
        data.materials.append(M[mat])
        layer=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            axis=max(range(3),key=lambda k:abs(poly.normal[k]))
            axes=[k for k in range(3) if k!=axis]
            for li in poly.loop_indices:
                co=data.vertices[data.loops[li].vertex_index].co
                layer.data[li].uv=(co[axes[0]]/uvscale,co[axes[1]]/uvscale)
        if key:CACHE[key]=data
    o=bpy.data.objects.new(name,data)
    SOURCE.objects.link(o)
    o['familia']=owner
    o['destino']=category
    return o

def box(name,x,y,z,w,h,d,mat,angle=0):
    verts=[(-w/2,-d/2,-h/2),(w/2,-d/2,-h/2),(w/2,d/2,-h/2),(-w/2,d/2,-h/2),
           (-w/2,-d/2,h/2),(w/2,-d/2,h/2),(w/2,d/2,h/2),(-w/2,d/2,h/2)]
    faces=[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    if mat == 'vidro':
        # Vidros são superfícies opacas planas, com leitura pelos caixilhos.
        faces = [(1,2,6,5),(3,0,4,7)] if w < d else [(0,1,5,4),(2,3,7,6)]
    o=mesh(name,verts,faces,mat,cache=('box',w,h,d,mat))
    o.location=(x,-z,y)
    o.rotation_euler.z=angle
    return o

def cyl(name,x,y,z,r,h,mat,n=12,top=None):
    top=r if top is None else top
    verts=[(math.cos(i*math.tau/n)*rr,math.sin(i*math.tau/n)*rr,yy) for rr,yy in [(r,-h/2),(top,h/2)] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,verts,faces,mat,cache=('cyl',r,h,mat,n,top))
    o.location=(x,-z,y)
    return o

def beam(name,a,b,r,mat,n=6):
    a,b=Vector((a[0],-a[2],a[1])),Vector((b[0],-b[2],b[1]))
    o=cyl(name,0,0,0,r,(b-a).length,mat,n)
    o.location=(a+b)/2
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def patch(name,x,z,w,d,h,mat,n=12):
    verts=[(0,0,h)]
    for i in range(n):
        a=i*math.tau/n
        scale=.87+.13*math.sin(i*3.7)
        verts.append((math.cos(a)*w/2*scale,math.sin(a)*d/2*scale,0))
    o=mesh(name,verts,[(0,i+1,(i+1)%n+1) for i in range(n)],mat,cache=('patch',w,d,h,mat,n))
    o.location=(x,-z,.025)
    return o

def floor(rect,mat,y=0):
    x=(rect['minX']+rect['maxX'])/2
    z=(rect['minZ']+rect['maxZ'])/2
    w=rect['maxX']-rect['minX'];d=rect['maxZ']-rect['minZ']
    o=box(rect['id'],x,y-.04,z,w,.08,d,mat)
    o['planta']=rect['id'];o['classe']='piso'
    records.append(dict(id=rect['id'],kind='piso',object=o.name))
    if mat=='ondas':
        for poly in o.data.polygons:
            if poly.normal.z>.9:
                for li in poly.loop_indices:
                    co=o.data.vertices[o.data.loops[li].vertex_index].co
                    o.data.uv_layers.active.data[li].uv=((co.x+w/2)/5,(co.y+d/2)/8)
    return o

def palm(x,z,h=7):
    start=len(SOURCE.objects)
    for i in range(4):
        beam('Palmeira_tronco',(x+.1*i*i,h*i/4,z),(x+.1*(i+1)**2,h*(i+1)/4,z),.15-i*.018,'madeira',7)
    cx=x+1.6
    for j in range(9):
        a=j*math.tau/9
        verts=[]
        for i in range(5):
            t=i/4
            reach=3.0*t
            yy=h+.8*math.sin(t*math.pi)-.75*t
            width=.46*math.sin(t*math.pi)+.025
            for side in [-1,1]:
                verts.append((cx+math.cos(a)*reach+math.sin(a)*width*side,
                              -(z+math.sin(a)*reach-math.cos(a)*width*side),yy))
        mesh('Palmeira_folha',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(4)],'folha')
    remember('palmeira',start,x,z)

def grass(x,z,y=0,scale=1):
    verts=[];faces=[]
    for i in range(5):
        a=i*2.4
        dx,dz=math.cos(a)*.24*scale,math.sin(a)*.24*scale
        off=len(verts)
        verts += [(x-dx,-z+dz,y),(x+dx,-z-dz,y),(x+dx*.8,-z-dz*.8,y+.75*scale)]
        faces += [(off,off+1,off+2),(off+2,off+1,off)]
    return mesh('Mato',verts,faces,'folha')

def remember(name,start,x,z):
    if name not in MODULES:
        MODULES[name]=(list(SOURCE.objects)[start:],x,z)

# Superfícies exatamente na planta; partes sobrepostas usam alturas discretas.
for b in D['bands']:
    if b['id']=='mar':continue
    owner=b['id']
    mat='areia' if owner=='areia' else 'ondas' if owner=='calcadao' else 'concreto' if 'calcada' in owner or 'lote' in owner else 'asfalto'
    floor(dict(b,minZ=-54,maxZ=54),mat)
for p in D['parts']:
    owner=p['id']
    if p['kind']=='quadra':floor(p,'concreto',.04)
    elif p['id'].startswith('travessa'):
        floor(p,'concreto',.012)
        floor(dict(p,id=p['id']+'_asfalto',minZ=p['minZ']+2,maxZ=p['maxZ']-2),'asfalto',.02)
    elif p['kind']=='praca':
        floor(p,'concreto',.12)
        floor(dict(p,id=p['id']+'_jardim',minX=p['minX']+.28,maxX=p['maxX']-.28,minZ=p['minZ']+.3,maxZ=p['maxZ']-.3),'areia',.13)
        for z in range(math.ceil(p['minZ'])+5,math.floor(p['maxZ'])-3,9):
            palm(-.5,z,6.5+R.random()*1.5)
            for j in range(7):grass(R.uniform(-1.9,2.9),z+R.uniform(-2,2),.14,R.uniform(.5,1))
        start=len(SOURCE.objects)
        z=(p['minZ']+p['maxZ'])/2
        for y in [.48,1.0]:
            box('Banco_ripas',2,y,z,.48,.12,1.7,'madeira')
        for zz in [z-.6,z+.6]:box('Banco_pes',2,.27,zz,.4,.5,.12,'metal')
        remember('banco',start,2,z)
    elif p['kind']=='deck':
        floor(p,'concreto',.02)
        # Pintura embutida no piso, reserva livre para ARES.
        for x in [20,30]:box('Pouso_marca',x,.028,46.5,.12,.012,13,'faixa')
        for z in [40,53]:box('Pouso_marca',25,.028,z,10,.012,.12,'faixa')

# Fachadas articuladas dentro dos envelopes fechados, sem pilotis caminháveis.
for b in D['buildings']:
    owner=b['id']
    x,z,w,d,h=b['x'],b['z'],b['w'],b['d'],b['height']
    start=len(SOURCE.objects)
    core=box(owner,x,(h-1.8)/2,z,w-1.3,h-1.8,d-1.3,'reboco')
    core['planta']=owner;core['classe']='predio'
    records.append(dict(id=owner,kind='predio',family=owner))
    for level in range(b['floors']):
        module_start=len(SOURCE.objects)
        base=level*3.3
        last=level==b['floors']-1
        wy=base+(.78 if last else 1.65)
        wh=.84 if last else 1.65
        box('Cornija',x,base+.1,z,w,.20,d,'concreto')
        for side in [-1,1]:
            fx=x+side*(w/2-.12)
            for j in range(max(2,int((d-2)/3.1))):
                fz=z-d/2+2.1+j*3.1
                if level==0:
                    box('Loja_porta',fx,1.45,fz,.08,2.55,2.1,'madeira')
                    aw=box('Toldo',fx-side*.35,2.8,fz,.72,.10,2.5,'toldo' if j%2 else 'ferrugem')
                    aw.rotation_euler.y=side*.16
                else:
                    box('Janela_fundo',fx-side*.25,wy,fz,.1,wh,1.8,'vidro')
                    for dz in [-.93,.93]:box('Caixilho',fx-side*.17,wy,fz+dz,.10,wh+.15,.055,'madeira')
                    box('Peitoril',fx-side*.12,base+(.30 if last else .75),fz,.24,.14,2.1,'concreto')
                    if side==1 and j%2==0:
                        box('Varanda',fx-side*.25,base+.25,fz,.72,.18,2.6,'concreto')
                        box('Varanda_guarda',fx,base+.85,fz,.08,1.0,2.6,'ferrugem')
                        box('Varanda_abertura',fx+.045,base+.92,fz,.015,.62,2.1,'vidro')
        for side in [-1,1]:
            fz=z+side*(d/2-.12)
            for j in range(max(2,int((w-2)/3.1))):
                fx=x-w/2+2+j*3.1
                box('Janela_lateral',fx,wy,fz-side*.23,1.5,wh,.1,'vidro')
                for dx in [-.79,.79]:box('Caixilho',fx+dx,wy,fz-side*.17,.06,wh+.15,.1,'madeira')
        if level>0:
            # Cobogó central na fachada principal, painéis vazados de leitura ampla.
            fx=x+w/2-.05
            for k in range(2 if last else 4):
                box('Cobogo_horizontal',fx,base+.45+k*.6,z,.08,.13,1.2,'concreto')
            for dz in [-.55,0,.55]:box('Cobogo_vertical',fx,base+(.75 if last else 1.3),z+dz,.08,1.0 if last else 2,.10,'concreto')
        remember(('terreo_' if level==0 else 'pavimento_tipo_')+b['row'],module_start,x,z)
    module_start=len(SOURCE.objects)
    # Cobertura técnica incluída na altura total da planta.
    box('Cobertura_laje',x,h-1.75,z,w,.18,d,'concreto')
    for side in [-1,1]:
        box('Platibanda',x+side*(w/2-.12),h-1.35,z,.24,.8,d,'reboco')
        box('Platibanda',x,h-1.35,z+side*(d/2-.12),w-.48,.8,.24,'reboco')
    box('Casa_dagua',x-1,h-.95,z,3.0,1.7,3.3,'reboco')
    box('Tampa_dagua',x-1,h-.05,z,3.2,.1,3.5,'concreto')
    for j in range(9):
        grass(x+w/2-.6,z+R.uniform(-d/2+1,d/2-1),h-1.6,.8)
    for k in range(5):
        fz=z+R.uniform(-d/2+1,d/2-1)
        box('Hera_pendente',x+w/2-.03,h-2.4-R.random(),fz,.04,1.6+R.random(),.28+R.random()*.4,'folha')
    remember('cobertura_'+b['row'],module_start,x,z)
    remember('fachada_'+b['row'],start,x,z)

# Quiosque com balcão térreo, terraço, escada helicoidal e guarda-corpo.
for p in D['parts']:
    if p['kind']!='quiosque':continue
    owner=p['id'];start=len(SOURCE.objects)
    x=(p['minX']+p['maxX'])/2;z=(p['minZ']+p['maxZ'])/2
    floor(p,'madeira',.08)
    cyl('Quiosque_base',x,.3,z,2.6,.44,'concreto',24)
    cyl('Quiosque_nucleo',x,1.65,z,2.38,2.7,'reboco',24)
    for i in range(12):
        a=i*math.tau/12
        xx,zz=x+math.cos(a)*2.4,z+math.sin(a)*2.4
        o=box('Quiosque_janela',xx,1.9,zz,.08,1.05,.85,'vidro',-a)
    cyl('Quiosque_terraco',x,3.1,z,2.6,.22,'concreto',24)
    cyl('Quiosque_teto',x,5.2,z,2.3,.18,'concreto',24)
    for i in range(12):
        a=i*math.tau/12
        xx,zz=x+math.cos(a)*2.2,z+math.sin(a)*2.2
        beam('Quiosque_coluna',(xx,3.2,zz),(xx,5.15,zz),.045,'metal')
        b=a+math.tau/12
        beam('Quiosque_guarda',(xx,4.05,zz),(x+math.cos(b)*2.2,4.05,z+math.sin(b)*2.2),.035,'ferrugem')
    # Escada no prolongamento longitudinal do deck, dentro da planta.
    sx,sz=x,z+4.55
    cyl('Escada_eixo',sx,1.6,sz,.09,3.15,'metal',8)
    for i in range(18):
        a=i*math.tau/18
        xx,zz=sx+.65*math.cos(a),sz+.65*math.sin(a)
        box('Escada_degrau',xx,.16+i*.17,zz,1.22,.1,.36,'madeira',-a)
        beam('Escada_balaustre',(sx+1.18*math.cos(a),.2+i*.17,sz+1.18*math.sin(a)),
             (sx+1.18*math.cos(a),1+i*.17,sz+1.18*math.sin(a)),.025,'metal')
    box('Escada_patamar',x+.5,3.15,z+3.45,1.2,.18,2.0,'madeira')
    for dx in [-.1,1.1]:
        beam('Patamar_guarda',(x+dx,4.05,z+2.7),(x+dx,4.05,z+4.3),.035,'metal')
    remember('quiosque',start,x,z)

# Props respeitam os corredores da planta. Carros e ônibus ficam no fechamento sul.
def vehicle(x,z,bus=False):
    start=len(SOURCE.objects)
    w,d,h=(2.5,8.2,2.65) if bus else (1.8,3.9,1.05)
    box('Veiculo_carroceria',x,.65,z,w,1.1,d,'ferrugem')
    box('Veiculo_cabine',x,1.2+h*.25,z,w*.9,h*.5,d*.72,'ferrugem')
    for side in [-1,1]:
        for j in range(6 if bus else 2):
            zz=z-d*.32+j*d*.64/(5 if bus else 1)
            box('Veiculo_vidro',x+side*w*.455,1.4+h*.17,zz,.035,h*.27,.82 if bus else .7,'vidro')
        for zz in [z-d*.31,z+d*.31]:
            o=cyl('Roda',x+side*w*.49,.43,zz,.43,.22,'metal',10)
            o.rotation_euler.y=math.pi/2
    for zz in [z-d*.5,z+d*.5]:box('Para_choque',x,.4,zz,w,.18,.14,'metal')
    remember('onibus' if bus else 'carro',start,x,z)

def lifeguard(x,z):
    start=len(SOURCE.objects)
    for dx in [-.85,.85]:
        for dz in [-.85,.85]:beam('Posto_perna',(x+dx,0,z+dz),(x+dx,2.2,z+dz),.09,'madeira')
    box('Posto_deck',x,2.1,z,2.4,.18,2.4,'madeira')
    box('Posto_cabine',x,2.9,z,1.8,1.5,1.8,'madeira')
    box('Posto_janela',x+.91,3.05,z,.03,.7,1.35,'vidro')
    box('Posto_teto',x,3.75,z,2.3,.18,2.3,'ferrugem')
    for i in range(7):box('Posto_escada',x+3.1-i*.30,.22+i*.27,z,.3,.12,1,'madeira')
    remember('posto_salva_vidas',start,x,z)
for x,z in [(29,-18),(29,26)]:owner='Posto';lifeguard(x,z)
for z in [-48,-22,5,29]:
    owner='Poste';start=len(SOURCE.objects)
    beam('Poste',(10.25,0,z),(10.45,6.5,z),.075,'metal')
    beam('Poste_braco',(10.45,6.5,z),(11.65,6.5,z),.055,'metal')
    box('Poste_luminaria',11.65,6.45,z,.55,.14,.28,'metal')
    remember('poste',start,10.25,z)
# Dunas rasas são revestimento visual, até 5 cm sobre vias e calçadão.
for x,z in [(11,-44),(13,-21),(11,9),(14,31),(8,36),(-8,-26),(-32,30)]:
    owner='Areia_invasora';start=len(SOURCE.objects)
    patch('Duna_rasa',x,z,3.8,6,.012,'areia')
    remember('duna',start,x,z)
for z in [-39,-12,22,34]:
    owner='Calcadao_quebrado'
    patch('Pedras_soltas',14,z,2.5,2.1,.012,'concreto',7)
    patch('Areia_sobre_pedras',14.5,z+.3,1.8,2.7,.019,'areia',9)
for i in range(42):
    x,z=R.uniform(24,34.5),R.uniform(-50,37)
    owner='Praia_vegetacao'
    grass(x,z,0,R.uniform(.3,.9))
    if i%3==0:
        box('Destroco_praia',x,.09,z,.12,.14,R.uniform(.4,1.2),'madeira',R.random()*3)
# Faixas de trânsito fragmentadas, sem material emissivo.
for x in [-6,7]:
    for z in range(-50,52,7):box('Faixa_apagada',x,.008,z,.12,.012,2.4,'faixa')
# Limites de granito facetado com vegetação em copas irregulares.
category='limites'
def rock(x,z,w,d,h):
    start=len(SOURCE.objects)
    verts=[];n=9
    for level,sc,yy in [(0,1,0),(1,.91,h*.3),(2,.66,h*.78),(3,.29,h)]:
        for i in range(n):
            a=i*math.tau/n
            factor=.88+.12*math.sin(i*2.7+level)
            verts.append((x+math.cos(a)*w/2*sc*factor,-z+math.sin(a)*d/2*sc*factor,yy))
    faces=[tuple(reversed(range(n))),tuple(range(3*n,4*n))]
    faces += [(l*n+i,l*n+(i+1)%n,(l+1)*n+(i+1)%n,(l+1)*n+i) for l in range(3) for i in range(n)]
    mesh('Granito',verts,faces,'pedra')
    for i in range(35):
        a=i*2.4
        radial=R.uniform(.24,.45)
        xx=x+math.cos(a)*w*radial;zz=z+math.sin(a)*d*radial
        yy=h*(1.10-1.8*radial)+1.4
        cyl('Copa_morro',xx,yy,zz,2.1+R.random()*1.5,3.5,'folha',7,top=.8)
    remember('rocha_morro',start,x,z)
owner='Limite_Oeste_Morro'
for z in range(-46,55,16):rock(-62-R.random()*2,z,22,25,21+R.random()*17)
owner='Limite_Norte_Morro_Escombros'
for x in range(-43,36,15):rock(x,-65-R.random()*2,25,22,13+R.random()*18)
owner='Limite_Sul_Escombros'
for i,x in enumerate(range(-47,34,8)):
    start=len(SOURCE.objects)
    height=R.uniform(1.4,3.4)
    box('Ruina_base',x,height/2,62,6,height,8,'concreto')
    wall=box('Ruina_parede',x-2,height+1,63,.5,R.uniform(2.7,6),R.uniform(3,7),'reboco')
    wall.rotation_euler.y=R.uniform(-.25,.25)
    slab=box('Ruina_laje',x,height+.4,60,R.uniform(4,7),.35,R.uniform(3,6),'concreto')
    slab.rotation_euler=(R.uniform(-.18,.18),R.uniform(.15,.6),R.uniform(-.2,.2))
    for k in range(5):
        o=box('Entulho',x+R.uniform(-3,3),R.uniform(.25,.7),R.uniform(55.8,59),R.uniform(.5,1.3),.6,R.uniform(.5,1.4),'pedra')
        o.rotation_euler=(R.random()*.4,R.random()*.4,R.random()*2)
    remember('escombro',start,x,62)
vehicle(-7,59,True);vehicle(10,59);vehicle(-33,59)
owner='Limite_Leste_Mar'
# Mar e espuma ficam integralmente em X >= 36.
floor(dict(id='Mar',minX=36,maxX=51,minZ=-54,maxZ=54),'mar',-.045)
for i in range(108):
    z=-53.5+i
    x=36.55+.1*math.sin(i*.8)
    patch('Espuma',x,z,.6+.2*math.sin(i),1.4,.005,'espuma',8)
    if i%3==0:
        patch('Onda_externa',38+.3*math.sin(i),z,.12,2.3,.008,'espuma',6)
# Kit de amostras com dados compartilhados, oculto da exportação e renderização.
for name,(objects,x,z) in MODULES.items():
    c=bpy.data.collections.new('MOD_'+name);KIT.children.link(c)
    for original in objects:
        o=original.copy();o.data=original.data
        c.objects.link(o)
        o.location-=Vector((x,-z,0))
KIT.hide_viewport=True;KIT.hide_render=True

# Agrupa cópias por setor e material; mantém o kit editável.
bpy.context.view_layer.update()
batches=defaultdict(list)
for o in SOURCE.objects:
    co=o.matrix_world.translation
    sector=f'{min(2,max(0,int((co.x+51)/34)))}{min(2,max(0,int((-co.y+54)/36)))}'
    batches[(o['destino'],sector,o.data.materials[0].name)].append(o)
for (dest,sector,mat),objects in sorted(batches.items()):
    verts=[];faces=[];uvs=[]
    for o in objects:
        off=len(verts)
        verts.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for poly in o.data.polygons:
            faces.append(tuple(off+i for i in poly.vertices))
            uvs.extend(tuple(o.data.uv_layers.active.data[li].uv) for li in poly.loop_indices)
    data=bpy.data.meshes.new(f'RIO_{dest}_{sector}_{mat}')
    data.from_pydata(verts,[],faces);data.update()
    layer=data.uv_layers.new()
    for i,uv in enumerate(uvs):layer.data[i].uv=uv
    data.materials.append(M[mat])
    o=bpy.data.objects.new(data.name,data)
    (MAP if dest=='mapa' else LIMITS).objects.link(o)
    o['id_estavel']=o.name;o['papel']='visual'
SOURCE.hide_render=True;SOURCE.hide_viewport=True

for p in D['obstacles']+D['limitColliders']+[dict(D['landingReservation'],id='Reserva_pouso')]:
    o=bpy.data.objects.new(p['id'],None);HELP.objects.link(o)
    o.empty_display_type='CUBE'
    o.location=((p['minX']+p['maxX'])/2,-(p['minZ']+p['maxZ'])/2,1)
    o.scale=((p['maxX']-p['minX'])/2,(p['maxZ']-p['minZ'])/2,1)
for p in D['spawns']+[dict(D['exit'],id='Desembarque')]:
    o=bpy.data.objects.new(p['id'],None);HELP.objects.link(o)
    o.location=(p['x'],-p['z'],0);o.empty_display_type='ARROWS'
HELP.hide_render=True;HELP.hide_viewport=True

def camera(name,target,scale,top=False):
    data=bpy.data.cameras.new(name);data.type='ORTHO';data.ortho_scale=scale;data.clip_end=1000
    o=bpy.data.objects.new(name,data);RIG.objects.link(o)
    t=Vector((target[0],-target[2],target[1]))
    o.location=t+(Vector((0,0,200)) if top else Vector((120,-120,120)))
    o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
    return o
# Mesmos limites de projeção, escala e margem da prancha SVG (7 px/m).
# O cabeçalho de 30 px desloca o centro vertical da área útil em 15 px.
S.camera=camera('CAM_Jogo',(-10.625,0,-2.625),1361/7)
S.camera['referencia_enquadramento']='notas/planta-v0-camera.svg; 7 px/m; cabeçalho 30 px'
# Vista adicional sem corte das cotas altas, para inspeção geral da arte.
camera('CAM_Geral',(-8,10,0),210)
camera('CAM_Topo',(-8,0,0),260,True)
for name,target,scale in [
    ('Calcadao',(14,0,9),24),('Predio',(-20,12,16),47),
    ('Quiosque',(18.75,2,17.5),21),('Praca',(.5,2,-.5),34),
    ('Deck',(25,0,47),27),('Morro',(-56,12,-15),48),
    ('Escombros',(-7,3,61),36),('Linha_dagua',(35,0,1),23)]:
    cam=camera('CAM_'+name,target,scale)
    if name=='Morro':
        t=Vector((-62,15,15))
        cam.location=t+Vector((-120,-80,100))
        cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Fim_de_tarde');S.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.72,.78,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.7
light=bpy.data.lights.new('Sol_fim_de_tarde','SUN');light.energy=2.8;light.angle=.12;light.color=(1,.83,.62)
sun=bpy.data.objects.new(light.name,light);RIG.objects.link(sun);sun.rotation_euler=(.45,-.5,-.7)
S.render.engine='CYCLES';S.cycles.samples=24;S.cycles.use_denoising=True
S.render.resolution_x=1361;S.render.resolution_y=851;S.render.resolution_percentage=100
S.view_settings.view_transform='AgX'
S.render.image_settings.file_format='PNG'
S['convencao']='Blender X=x, Y=-z, Z=altura; GLB X=x, Y=altura, Z=z; metros'
S['planta_sha256']=__import__('hashlib').sha256((ART/'export/layout.json').read_bytes()).hexdigest()
for c,filename in [(MAP,'rio-fase01.glb'),(LIMITS,'rio-limites-v001.glb')]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in c.objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ART/'export'/filename),use_selection=True,export_format='GLB',
        export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
S.camera=bpy.data.objects['CAM_Jogo']
# Preserva quaisquer .blend1 já existentes em regenerações automáticas.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'blend/rio_fase01_v001.blend'))
(ART/'notas/elementos.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
import audit_view
audit_view.audit()
if '--render' in sys.argv:
    for o in RIG.objects:
        if o.type!='CAMERA':continue
        S.camera=o
        S.render.filepath=str(ART/'renders/v001'/(o.name[4:].lower()+'.png'))
        bpy.ops.render.render(write_still=True)
print('RIO_CONCLUIDO')
