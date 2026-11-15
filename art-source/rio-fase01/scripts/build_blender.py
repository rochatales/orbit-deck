"""Rio v005 (planta v2 + morros refinados v004 + transição costeira, areia molhada e mar raso v005).
Blender 5.1.1 --background --python <este arquivo> [-- --render].
Reconstrói fontes editáveis, kit compartilhado e GLBs a partir da planta, preservando v001..v004.
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
import morros
import agua_costeira
D = json.loads((ART/'export/layout.json').read_text())
R = random.Random(13112026)
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
S.unit_settings.system = 'METRIC'
S.unit_settings.scale_length = 1
REV='v005'
for folder in ['blend','texturas','notas','renders/'+REV]:
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
    ('espuma',(.66,.75,.65),None),('fenda',(.03,.03,.028),None)]:
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
    if b['ruin']:
        # Ruína: pavimentos de cima desabaram. Paredes irregulares até a altura da planta e laje caída.
        top=h-1.8
        box('Ruina_laje',x,top+.09,z,w-.4,.18,d-.4,'concreto')
        stubs=[(x-w/2+.2,z,.4,d),(x+w/2-.2,z-d*.2,.4,d*.5),(x,z-d/2+.2,w*.6,.4),(x-w*.15,z+d/2-.2,w*.55,.4)]
        for k,(sx,sz,sw,sd) in enumerate(stubs):
            sh=1.8 if k==0 else R.uniform(.5,1.5)
            box('Ruina_parede',sx,top+sh/2,sz,sw,sh,sd,'reboco')
        slab=box('Ruina_laje_caida',x+w*.12,top+.6,z+d*.12,w*.5,.2,d*.4,'concreto',R.uniform(-.3,.3))
        slab.rotation_euler.x=R.uniform(.05,.08);slab.rotation_euler.y=R.uniform(-.08,-.05)
        for k in range(7):
            o=box('Ruina_bloco',x+R.uniform(-w/2+1.5,w/2-1.5),top+R.uniform(.3,.6),z+R.uniform(-d/2+1.5,d/2-1.5),R.uniform(.7,1.6),R.uniform(.4,.9),R.uniform(.7,1.6),'pedra',R.random()*3)
        for k in range(6):
            fx,fz=x+R.uniform(-w/2+.6,w/2-.6),z+R.uniform(-d/2+.6,d/2-.6)
            beam('Ferragem',(fx,top+.1,fz),(fx+R.uniform(-.25,.25),top+R.uniform(.9,1.7),fz+R.uniform(-.25,.25)),.035,'ferrugem',4)
        for j in range(8):grass(x+R.uniform(-w/2+1,w/2-1),z+R.uniform(-d/2+1,d/2-1),top+.18,R.uniform(.6,1))
        remember('ruina_topo',len(SOURCE.objects)-28,x,z)
    else:
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
for x,z in [(11,-44),(13,-21),(11,9),(14,31),(8,36),(-8,-26),(-32,30),(6,-18),(-5,8),(9,24),(-35,-30),(5,-46),(-7,46),(12,-2),(-33,40)]:
    owner='Areia_invasora';start=len(SOURCE.objects)
    patch('Duna_rasa',x,z,R.uniform(3.8,6.5),R.uniform(6,11),.012,'areia')
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
# ---- v002: píer quebrado junto ao morro, destroços com colisor da planta e dano aparente ----
def strip(name,points,mat='fenda'):
    """Fita em ziguezague a partir de pares (esquerda, direita) já em coordenadas do Blender."""
    verts=[v for pair in points for v in pair]
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)]
    return mesh(name,verts,faces,mat)

def crack(x,z,length,ang,width=.2,y=.034):
    pts=[];n=5
    for i in range(n+1):
        t=i/n-.5
        off=R.uniform(-.38,.38) if 0<i<n else 0
        px=x+math.cos(ang)*t*length-math.sin(ang)*off
        pz=z+math.sin(ang)*t*length+math.cos(ang)*off
        half=width*(.3+math.sin(i/n*math.pi))/2
        nx,nz=-math.sin(ang)*half,math.cos(ang)*half
        pts.append(((px+nx,-(pz+nz),y),(px-nx,-(pz-nz),y)))
    return strip('Rachadura_piso',pts)

def wall_crack(fx,fz,y0,y1,along_z=True,width=.3):
    """Rachadura vertical numa fachada; a fita fica 2 cm fora do reboco, dentro do envelope."""
    pts=[];n=6
    for i in range(n+1):
        yy=y0+(y1-y0)*i/n
        off=R.uniform(-.55,.55) if 0<i<n else 0
        half=width*(.25+math.sin(i/n*math.pi))/2
        if along_z:pts.append(((fx,-(fz+off+half),yy),(fx,-(fz+off-half),yy)))
        else:pts.append(((fx+off+half,-fz,yy),(fx+off-half,-fz,yy)))
    return strip('Rachadura_fachada',pts)

def wreck(p):
    """Carcaça da planta: o envelope girado cabe no colisor alinhado aos eixos."""
    start=len(SOURCE.objects)
    a=math.radians(p['yaw'])+(math.pi/2 if p['axis']=='x' else 0)
    w,d,h=p['w'],p['length'],p['height']
    def place(name,lx,y,lz,bw,bh,bd,mat):
        gx=p['x']+lx*math.cos(a)+lz*math.sin(a)
        gz=p['z']-lx*math.sin(a)+lz*math.cos(a)
        return box(name,gx,y,gz,bw,bh,bd,mat,a)
    bus=p['kind']=='onibus'
    place('Carcaca',0,.68,0,w,.92,d,'ferrugem')
    place('Carcaca_cabine',0,1.14+(h-1.14)/2,-d*.04 if bus else d*.06,w*.92,h-1.14,d*(.9 if bus else .5),'ferrugem')
    for side in [-1,1]:
        place('Carcaca_vidro',side*w*.462,1.14+(h-1.14)*.55,-d*.04 if bus else d*.06,.03,(h-1.14)*.5,d*(.8 if bus else .4),'fenda')
        for k,lz in enumerate([-d*.3,d*.3]):
            # Uma roda arriada por veículo: pneu deitado ao lado da carcaça.
            if side==1 and k==0 and not bus:
                o=cyl('Roda_solta',0,.11,0,.36,.2,'metal',6)
                o.location=(p['x']+(w*.3)*math.cos(a)+lz*math.sin(a),-(p['z']-(w*.3)*math.sin(a)+lz*math.cos(a)),.36)
                continue
            o=cyl('Roda',0,0,0,.36,.2,'metal',6)
            lx=side*(w/2-.13)
            o.location=(p['x']+lx*math.cos(a)+lz*math.sin(a),-(p['z']-lx*math.sin(a)+lz*math.cos(a)),.36)
            o.rotation_euler=(0,math.pi/2,a)
    for o in list(SOURCE.objects)[start:]:o['prop']=p['id']
    remember('carcaca_'+p['kind'],start,p['x'],p['z'])

def rubble(p):
    start=len(SOURCE.objects)
    w,d,h=p['w'],p['d'],p['height']
    big=w*d>=14
    for k in range(6+int(w*d/4) if big else 6):
        bw,bd=(R.uniform(.7,1.7),R.uniform(.7,1.8)) if big else (R.uniform(.5,1.1),R.uniform(.5,1.2))
        reach=math.hypot(bw,bd)/2+.05
        bh=R.uniform(.3,h*.55)
        px=p['x']+R.uniform(-(w/2-reach),w/2-reach)
        pz=p['z']+R.uniform(-(d/2-reach),d/2-reach)
        box('Entulho_bloco',px,bh/2+(h-bh-.05)*R.random()*(.6 if k<3 else 0),pz,bw,bh,bd,'pedra' if k%2 else 'concreto',R.random()*3)
    # Laje caída apoiada no monte, sempre dentro do colisor.
    sw,sd=min(w-.9,2.6),min(d-.9,3.0)
    slab=box('Entulho_laje',p['x'],h*.5,p['z'],sw*.8,.16,sd*.8,'concreto',R.uniform(-.3,.3))
    slab.rotation_euler.x=R.uniform(-.2,.2);slab.rotation_euler.y=R.uniform(.12,.3)
    if big:
        # Segunda laje e pedaço de parede de pé nos desabamentos grandes.
        s2=box('Entulho_laje',p['x'],h*.32,p['z']+R.uniform(-.4,.4),sw*.65,.18,sd*.65,'concreto',R.uniform(-.2,.2))
        s2.rotation_euler.x=R.uniform(-.25,-.12);s2.rotation_euler.y=R.uniform(-.3,-.15)
        box('Entulho_parede',p['x'],h*.5,p['z'],min(.35,w-1.2),h-.1,min(sd*.8,d-1.6),'reboco',0)
    for k in range(6 if big else 2):
        beam('Entulho_vergalhao',(p['x']+R.uniform(-.4,.4),h*.5,p['z']+R.uniform(-.4,.4)),
             (p['x']+R.uniform(-.5,.5),h-.06,p['z']+R.uniform(-.5,.5)),.03,'ferrugem',4)
    for o in list(SOURCE.objects)[start:]:o['prop']=p['id']
    remember('entulho',start,p['x'],p['z'])

for p in D['props']:
    owner=p['id']
    rubble(p) if p['kind']=='entulho' else wreck(p)

# Píer: rampa na areia, tablado andável até X = 46 e ponta desabada fora de alcance.
owner='Pier_Morro'
PIER={q['id']:q for q in D['parts'] if q['kind']=='pier'}
ramp,deckp,tip=PIER['Pier_Rampa'],PIER['Pier_Tablado'],PIER['Pier_Ponta_Caida']
pz0,pz1=deckp['minZ'],deckp['maxZ'];pzc=(pz0+pz1)/2
start=len(SOURCE.objects)
o=box('Pier_rampa',(ramp['minX']+ramp['maxX'])/2,.03,pzc,ramp['maxX']-ramp['minX'],.06,pz1-pz0,'concreto')
o['planta']='Pier_Rampa'
for xx,zz in [(29.5,-48.6),(32.5,-51.6),(34.6,-49.2)]:patch('Pier_areia',xx,zz,2.6,2.2,.03,'areia',8)
crack(31,-50.4,4.5,.5,.22,.07);crack(34,-49,3,2.2,.18,.07)
for zz in [pz0+.45,pz1-.45]:
    box('Pier_longarina',(deckp['minX']+deckp['maxX'])/2,-.16,zz,deckp['maxX']-deckp['minX'],.3,.34,'madeira')
board=.92
for i in range(int((deckp['maxX']-deckp['minX'])/board)):
    cx=deckp['minX']+board*(i+.5)
    sunk=i in (3,6,9)
    # Tábua afundada continua fechando o vão: a colisão do tablado é contínua.
    o=box('Pier_tabua',cx,-.03 if sunk else .045,pzc+(R.uniform(-.04,.04) if sunk else 0),board-.07,.09,pz1-pz0-.12,'madeira')
    if sunk:o.rotation_euler.x=R.uniform(-.035,.035)
for cx in [37.2,41.2,45.2]:
    for zz in [pz0+.42,pz1-.42]:cyl('Pier_pilar',cx,-1.15,zz,.26,2.2,'concreto',8)
# Guarda-corpo incompleto: falta no trecho final para o vão ficar evidente.
for side,zz in [(-1,pz0+.16),(1,pz1-.16)]:
    posts=[36.4,38.6,40.8,43.0] if side<0 else [36.4,38.6,43.0,45.2]
    for cx in posts:beam('Pier_montante',(cx,.08,zz),(cx+R.uniform(-.12,.12),1.02,zz),.05,'metal',4)
    for a,b in zip(posts,posts[1:]):
        if b-a>2.3:continue
        beam('Pier_corrimao',(a,.98,zz),(b,.98 if R.random()>.4 else .55,zz),.035,'ferrugem',4)
# Ponta desabada: lajes inclinadas e meio submersas, pilares isolados.
for cx,zz,rx,ry,rz,yy in [(47.3,-51.2,.12,.42,.2,-.18),(49.0,-48.7,-.2,-.3,-.5,-.34),(49.5,-51.3,.3,.15,.6,-.42)]:
    o=box('Pier_laje_caida',cx,yy,zz,1.7,.14,2.2,'madeira');o.rotation_euler=(rx,ry,rz)
for cx,zz,top in [(48.2,pz0+.5,.5),(49.6,pz1-.6,.15)]:cyl('Pier_pilar_isolado',cx,top-1.1,zz,.26,2.2,'concreto',8)
beam('Pier_viga_caida',(46.1,.02,pz1-.9),(48.3,-.5,pz1-1.6),.11,'madeira',4)
box('Pier_borda_quebrada',45.86,.045,pzc+.9,.22,.09,2.6,'madeira',.22)
remember('pier',start,deckp['minX'],pzc)

# Pistas rachadas: fendas, buracos e placas levantadas até 19 cm, sem fechar a circulação.
owner='Dano_vias'
LANES=[(-9,-3),(4,10),(-38,-31)]
for i in range(34):
    x0,x1=LANES[i%3]
    crack(R.uniform(x0+.9,x1-.9),R.uniform(-51,51),R.uniform(4,9),R.uniform(0,math.pi),R.uniform(.3,.75))
for z0,z1 in [(29,37),(-5,3),(-39,-31)]:
    for k in range(6):crack(R.uniform(-48,-12),R.uniform(z0+.9,z1-.9),R.uniform(4,9),R.uniform(-.5,.5),R.uniform(.3,.7))
for i in range(12):
    x0,x1=LANES[i%3]
    patch('Buraco',R.uniform(x0+1,x1-1),R.uniform(-50,50),R.uniform(1.1,2.4),R.uniform(1,2),.006,'fenda',7).location.z=.03
for i in range(10):
    x0,x1=LANES[i%3]
    o=box('Placa_levantada',R.uniform(x0+1.2,x1-1.2),.07,R.uniform(-50,50),R.uniform(1.2,2.0),.09,R.uniform(1.0,1.8),'asfalto',R.random()*3)
    o.rotation_euler.x=R.uniform(-.035,.035);o.rotation_euler.y=R.uniform(-.035,.035)
for i in range(8):crack(R.uniform(10.6,14.4),R.uniform(-50,36),R.uniform(1.6,3.4),R.uniform(.9,2.2),.2,.03)
for i in range(26):
    lane=LANES[i%3]
    # Mato nas sarjetas, do lado de fora das pistas.
    gz=R.uniform(-52,52)
    # Fora dos cruzamentos: as travessas também são vias livres.
    while any(z0-1<gz<z1+1 for z0,z1 in [(27,39),(-7,5),(-41,-29)]):gz=R.uniform(-52,52)
    grass(R.choice([lane[0]-.3,lane[1]+.3]),gz,.02,R.uniform(.35,.7))

# v003: crateras largas, campos de detritos rasos (até 19 cm) e postes caídos sobre as pistas.
for i in range(9):
    x0,x1=LANES[i%3];cx,cz=R.uniform(x0+1.6,x1-1.6),R.uniform(-48,48)
    patch('Cratera',cx,cz,R.uniform(3,4.6),R.uniform(3,5),.008,'fenda',9).location.z=.028
    patch('Cratera_borda',cx+.3,cz-.2,R.uniform(1.6,2.4),R.uniform(1.6,2.6),.05,'pedra',7).location.z=.04
for i in range(150):
    x0,x1=LANES[i%3] if i%4 else (10,15)
    o=box('Detrito',R.uniform(x0+.3,x1-.3),.07,R.uniform(-52,52),R.uniform(.25,.7),R.uniform(.08,.13),R.uniform(.25,.8),'pedra' if i%3 else 'concreto',R.random()*3)
for i in range(60):
    o=box('Detrito_travessa',R.uniform(-49,-11),.07,R.choice([(29.5,36.5),(-4.5,2.5),(-38.5,-31.5)])[0]+R.uniform(0,7),R.uniform(.25,.7),R.uniform(.08,.13),R.uniform(.25,.8),'pedra',R.random()*3)
for cx,cz,ang in [(7,-26,.4),(-6,24,-.5),(-34.5,2,.3),(7,14,-.2),(-6,-38,.6),(12.5,-30,1.2)]:
    dx,dz=math.cos(ang)*3.1,math.sin(ang)*3.1
    beam('Poste_caido',(cx-dx,.085,cz-dz),(cx+dx,.085,cz+dz),.075,'metal')
for cx,cz,ang in [(1,-40,.7),(27,6,2.1),(1,40,-.9),(30,-30,.4)]:
    dx,dz=math.cos(ang)*3,math.sin(ang)*3
    beam('Palmeira_caida',(cx-dx,.2,cz-dz),(cx+dx,.16,cz+dz),.15,'madeira',7)
    for j in range(5):grass(cx+dx*.7+R.uniform(-.3,.3),cz+dz*.7+R.uniform(-.3,.3),.05,1.2)
# Prédios rachados, com fachada aberta ou canto desabado. Tudo dentro do envelope da planta.
for b in D['buildings']:
    owner=b['id']
    x,z,w,d,h=b['x'],b['z'],b['w'],b['d'],b['height']
    east=x+w/2-.015
    for k in range(6):
        y0=R.uniform(.4,h*.45)
        wall_crack(east,z+R.uniform(-d/2+1.5,d/2-1.5),y0,min(h-2.2,y0+R.uniform(6,14)),True,R.uniform(.45,.9))
    for k in range(3):
        # Mancha de fuligem e ferrugem escorrendo, fina e dentro do envelope.
        sh=R.uniform(2.5,max(2.6,min(9,h-5)));box('Mancha',east-.012,R.uniform(sh/2+1,max(sh/2+1.01,h-2.4-sh/2)),z+R.uniform(-d/2+2,d/2-2),.024,sh,R.uniform(1,2.4),'ferrugem')
    for side in [-1,1]:
        y0=R.uniform(1,h*.4)
        for k in range(2):wall_crack(x+R.uniform(-w/2+1.5,w/2-1.5),z+side*(d/2-.015),y0,min(h-2.2,y0+R.uniform(5,11)),False,R.uniform(.4,.8))
    if b['damage']=='fachada_aberta':
        # Rombo de três pavimentos na fachada principal: interior escuro, lajes expostas e ferragem.
        cz=z+R.uniform(-d/2+5.5,d/2-5.5);base=3.3*R.randint(1,max(1,b['floors']-5))
        for k,(dz,hh,ww) in enumerate([(0,11.5,6.2),(-3.4,7.4,3.0),(3.2,9.0,3.4)]):
            box('Rombo',east-.03,base+hh/2+(.6 if k else 0),cz+dz,.06,hh,ww,'fenda')
        for k in range(3):
            slab=box('Laje_exposta',east-.5,base+3.3*k+.1,cz+R.uniform(-.6,.6),.9,.16,R.uniform(2.6,4),'concreto')
            slab.rotation_euler.y=R.uniform(.05,.2)
            for j in range(2):
                fz=cz+R.uniform(-1.6,1.6)
                beam('Ferragem',(east-.12,base+3.3*k+.2,fz),(east-.02,base+3.3*k-R.uniform(.6,1.3),fz+R.uniform(-.3,.3)),.03,'ferrugem',4)
    if b['damage']=='canto_desabado':
        # Canto alto arrancado: recortes escuros nas duas faces, laje pendente e ferragem.
        cs=1 if b['z']<0 else -1
        top=h-1.9;drop=R.uniform(6,9)
        cornerz=z+cs*(d/2-.015)
        for k,(hh,ww) in enumerate([(drop,3.4),(drop*.62,2.0),(drop*.34,1.6)]):
            off=sum([3.4,2.0,1.6][:k])
            box('Canto_recorte',east-.03,top-hh/2,z+cs*(d/2-ww/2-off)-cs*.02,.06,hh,ww,'fenda')
            box('Canto_recorte',x+w/2-ww/2-off-.02,top-hh/2,cornerz-cs*.03,ww,hh,.06,'fenda')
        slab=box('Canto_laje',east-1.0,top-drop*.55,z+cs*(d/2-1.6),1.6,.18,2.6,'concreto')
        slab.rotation_euler.x=cs*.22;slab.rotation_euler.y=.2
        for j in range(4):
            fz=z+cs*(d/2-R.uniform(.5,3))
            beam('Ferragem',(east-.1,top-R.uniform(.4,drop*.5),fz),(east-.02,top-drop*.5-R.uniform(.5,1.4),fz),.03,'ferrugem',4)
    for k in range(4):
        fz=z+R.uniform(-d/2+1,d/2-1)
        box('Hera_fachada',east-.02,R.uniform(2.5,h*.6),fz,.04,R.uniform(2,4.5),R.uniform(.5,1.1),'folha')
owner='solo'
# Faixas de trânsito fragmentadas, sem material emissivo.
for x in [-6,7]:
    for z in range(-50,52,7):box('Faixa_apagada',x,.008,z,.12,.012,2.4,'faixa')
# Limites de granito costeiro e mata atlântica integrada (v004, isolado em morros.py).
category='limites'
# Avança o gerador aleatório principal exatamente pelo mesmo número de chamadas da v003
# para que Limite_Sul_Escombros e Limite_Leste_Mar permaneçam 100% idênticos.
for _ in range(7):
    R.random();R.random()
    for _ in range(35):R.uniform(.24,.45);R.random()
for _ in range(6):
    R.random();R.random()
    for _ in range(35):R.uniform(.24,.45);R.random()
for _ in range(2):
    for _ in range(35):R.uniform(.24,.45);R.random()
morros.build_morros(SOURCE, M, MODULES, include_vegetation=('--clay-only' not in sys.argv))
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
# Transição costeira contínua (v005): areia úmida/molhada na praia (X <= 36) +
# fundo submerso, água rasa, água profunda e espuma orgânica com vazios internos (X >= 36).
agua_costeira.build_coastal_transition(SOURCE, M, MODULES)
records.append(dict(id='Mar',kind='piso',object='Mar'))
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
    verts=[];faces=[];uvs=[];smooth_flags=[];sharp_edges=set()
    for o in objects:
        off=len(verts)
        verts.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        if o.get('morro_refinado'):
            for e in o.data.edges:
                if e.use_edge_sharp:
                    v0,v1=off+e.vertices[0],off+e.vertices[1]
                    sharp_edges.add((min(v0,v1),max(v0,v1)))
        for poly in o.data.polygons:
            faces.append(tuple(off+i for i in poly.vertices))
            smooth_flags.append(bool(o.get('morro_refinado') and poly.use_smooth))
            uvs.extend(tuple(o.data.uv_layers.active.data[li].uv) for li in poly.loop_indices)
    data=bpy.data.meshes.new(f'RIO_{dest}_{sector}_{mat}')
    data.from_pydata(verts,[],faces);data.update()
    if any(smooth_flags):
        for poly,sm in zip(data.polygons,smooth_flags):
            poly.use_smooth=sm
        for e in data.edges:
            v0,v1=e.vertices[0],e.vertices[1]
            if (min(v0,v1),max(v0,v1)) in sharp_edges:
                e.use_edge_sharp=True
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
S.camera['referencia_enquadramento']='notas/planta-v2-camera.svg; 7 px/m; cabeçalho 30 px'
# Vista adicional sem corte das cotas altas, para inspeção geral da arte.
camera('CAM_Geral',(-8,10,0),210)
camera('CAM_Topo',(-8,0,0),260,True)
for name,target,scale in [
    ('Calcadao',(14,0,9),24),('Predio',(-20,12,16),47),
    ('Quiosque',(18.75,2,17.5),21),('Praca',(.5,2,-.5),34),
    ('Deck',(25,0,47),27),('Morro',(-56,12,-15),48),
    ('Escombros',(-7,3,61),36),('Linha_dagua',(35,0,1),23),
    ('Pier',(40,1,-50),28),('Pier_ponta',(47,0,-50),15),
    ('Avenida',(-3,2,-12),46),('Rua_fundo',(-34,2,14),40)]:
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
for c,filename in [(MAP,'rio-fase01.glb'),(LIMITS,'rio-limites-v002.glb'),(LIMITS,'rio-limites-v003.glb')]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in c.objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ART/'export'/filename),use_selection=True,export_format='GLB',
        export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
S.camera=bpy.data.objects['CAM_Jogo']
# Preserva quaisquer .blend1 já existentes em regenerações automáticas.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/f'blend/rio_fase01_{REV}.blend'))
(ART/'notas/elementos.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
import audit_view
audit_view.audit()
if '--render' in sys.argv:
    for o in RIG.objects:
        if o.type!='CAMERA':continue
        S.camera=o
        S.render.filepath=str(ART/'renders'/REV/(o.name[4:].lower()+'.png'))
        bpy.ops.render.render(write_still=True)
print('RIO_CONCLUIDO')
