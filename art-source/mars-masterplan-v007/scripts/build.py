"""Blender -b --factory-startup -P art-source/mars-masterplan-v007/scripts/build.py.
Gera fonte v007 e exportação no mesmo sistema de dados do runtime; não salva fontes anteriores.
"""
import bpy, bmesh, json, math, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'art-source/mars-masterplan-v007'
DATA = json.loads((ROOT/'src/world/marsMasterplan.json').read_text())
SOURCE = json.loads((ROOT/'src/assets/colony-v006.manifest.json').read_text())
BASELINE = json.loads((OUT/'notas/fontes-sha256.json').read_text())
for path, digest in BASELINE.items(): assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest() == digest, path
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
parts=[]; colliders=[]; doors=[]; floors=[]

def material(name, color, metallic=0, emission=0, alpha=1):
    m=bpy.data.materials.new(name); m.use_nodes=True
    c=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))
    linear=tuple(((x+.055)/1.055)**2.4 if x>.04045 else x/12.92 for x in c)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear,alpha)
    p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=.62
    p.inputs['Alpha'].default_value=alpha
    if emission:p.inputs['Emission Color'].default_value=(*linear,1);p.inputs['Emission Strength'].default_value=emission
    if alpha<1:m.surface_render_method='DITHERED'
    return m
cream=material('V007_Ceramica','#EAE3D8');green=material('V007_Estrutura','#354E44',.35)
dark=material('V007_Tecnico','#303B40',.45);cyan=material('V007_Ciano','#00E6FF',.2,2)
amber=material('V007_Ambar','#E87A3E',.1,.5);gold=material('V007_AmbarClaro','#F2C94C',.1,.5)
glass=material('V007_Vidro','#9AC9CC',.1,0,.32);solar=material('V007_Solar','#214B66',.45)
soil=material('V007_Terracota','#AA7255')

def tag(o,id,role='structure',owner='',supports=()):
    o.name=id;o['id_estavel']=id;o['colony_name']=id;o['papel']=role;o['ambiente']=owner
    o['apoiado_em']=','.join(supports);o['apoiado_em_todos']='';o['estado_inicial']='visivel'
    parts.append(o);return o

def box(id,x,z,y,w,d,h,mat=cream,role='structure',owner='',supports=(),bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Bordas','BEVEL');m.width=min(bevel,w/4,d/4,h/4);m.segments=3
        o.modifiers.new('Normais','WEIGHTED_NORMAL')
    return tag(o,id,role,owner,supports)

def cylinder(id,x,z,y,r,h,mat=dark,vertices=16,role='detail',owner='',supports=()):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=(x,-z,y))
    o=bpy.context.object;o.data.materials.append(mat);return tag(o,id,role,owner,supports)

def collider(id,x,z,w,d):
    colliders.append(dict(id=id,minX=x-w/2,maxX=x+w/2,minZ=z-d/2,maxZ=z+d/2))

def bounds(a):
    x,z=a['position'].values();w,d=a['size'].values();return dict(minX=x-w/2,maxX=x+w/2,minZ=z-d/2,maxZ=z+d/2)

def join(objs,id,role,owner='',supports=()):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        # Convert modifiers before merging so each bevel preserves its own proportions.
        o.select_set(True);bpy.context.view_layer.objects.active=o
        for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)
    for o in objs:o.select_set(True);parts.remove(o)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
    return tag(bpy.context.object,id,role,owner,supports)

# Reuse only terrain and interior furnishings from the preserved runtime export.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'src/assets/colony-v006.glb'))
# Preserve the original patio tile geometry/colors before removing the old layout.
legacy_tile=next(o for o in bpy.context.scene.objects if o.get('colony_name',o.name)=='ARQ_Lab_Piso_Patio').copy()
legacy_tile.data=legacy_tile.data.copy()
legacy_tile.data.color_attributes[0].name='Col'
for mat in legacy_tile.data.materials:
    for node in mat.node_tree.nodes:
        if node.type=='VERTEX_COLOR':node.layer_name='Col'
# Imported GLB has evaluated bottom/side faces; only upward faces define the tile pattern.
bm=bmesh.new();bm.from_mesh(legacy_tile.data)
normals=legacy_tile.matrix_world.to_3x3().inverted().transposed()
bmesh.ops.delete(bm,geom=[f for f in bm.faces if (normals@f.normal).z<=1e-6],context='FACES')
bm.to_mesh(legacy_tile.data);bm.free()
internal_floor_material=bpy.data.materials['M_Piso_Interno']
oldparts={p['name']:p for p in SOURCE['parts']}; room_by_old={r['sourceName']:r for r in DATA['rooms']}
old_support_map={}
for name in oldparts:
    for old,r in room_by_old.items():
        if name.startswith('ARQ_'+old+'_'):
            side=next((s for code,s in [('N','north'),('S','south'),('L','east'),('O','west')] if '_Parede_'+code+'_' in name),None)
            if side:old_support_map[name]='W_'+r['id']+'_'+side
reused=[]
for o in list(bpy.context.scene.objects):
    name=o.get('colony_name',o.name)
    if o.type!='MESH' or name not in oldparts:
        bpy.data.objects.remove(o,do_unlink=True);continue
    p=oldparts[name];b=p['bounds'];cx=(b['minX']+b['maxX'])/2;cz=(b['minZ']+b['maxZ'])/2
    if name.startswith('TER_'):
        # Terrain is below paved surfaces near the enlarged east/south footprint.
        if name=='TER_Solo':
            inv=o.matrix_world.inverted()
            for v in o.data.vertices:
                q=o.matrix_world@v.co
                if -21<q.x<22 and -29<-q.y<30 and q.z>-.30:q.z=-.30;v.co=inv@q
        tag(o,name,'terrain');continue
    room=next((r for r in DATA['rooms'] if abs(cx-r['source'][0])<r['source'][2]/2 and abs(cz-r['source'][1])<r['source'][3]/2),None)
    if not name.startswith('PROP_') or not room or 'Lab_Caixa.' in name or 'Balizador' in name or 'Paineis' in name:
        bpy.data.objects.remove(o,do_unlink=True);continue
    ox,oz,ow,od=room['source'];nx,nz=room['position'].values();nw,nd=room['size'].values()
    # Affine plan transform applied consistently to props and their simple collision rectangles.
    transform=Matrix.Translation((nx,-nz,0))@Matrix.Diagonal((nw/ow,nd/od,1,1))@Matrix.Translation((-ox,oz,0))
    o.matrix_world=transform@o.matrix_world
    # Move the complete inherited workshop furniture assembly away from its new west entrance.
    if name=='PROP_Deposito_Mobiliario':o.location.y-=.55
    if name=='PROP_Nodo_Tecnico.08':o.location.y+=.4
    if name=='PROP_Vaso_Protegido.10':o.location.x+=2;o.location.y+=3
    tag(o,name,'furniture',room['id']);reused.append((o,p))
# Retain interior obstacles, discard the old architecture/perimeter collision set.
for i,rect in enumerate(SOURCE['colliders']):
    x0,x1,z0,z1=rect
    for r in DATA['rooms']:
        ox,oz,ow,od=r['source']
        if x0>ox-ow/2+.15 and x1<ox+ow/2-.15 and z0>oz-od/2+.15 and z1<oz+od/2-.15:
            nx,nz=r['position'].values();nw,nd=r['size'].values()
            collider('interior-'+str(i),nx+((x0+x1)/2-ox)*nw/ow+(2 if i==97 else 0),nz+((z0+z1)/2-oz)*nd/od+(.55 if i in [51,52,53] else -.4 if i==118 else -3 if i==97 else 0),(x1-x0)*nw/ow,(z1-z0)*nd/od);break

# Room walls: exact nominal outer faces, segmented around 2.2m doors; no mesh physics.
def walls(room,greenhouse=False):
    id=room['id'];x,z=room['position'].values();w,d=room['size'].values();t=DATA['wallThickness'];dw=DATA['doorWidth']
    for side in ['north','south','east','west']:
        axis='x' if side in ['north','south'] else 'z';length=w if axis=='x' else d
        offset=z+(-d/2 if side=='north' else d/2) if axis=='x' else x+(-w/2 if side=='west' else w/2)
        # Cargo/Food use the same Z=15 door line despite different room centres.
        door_center=.5 if id=='meeting-suite' and side=='east' else (-1.375 if greenhouse and side=='west' else 1.375 if greenhouse and side=='east' else 0)
        segments=[(-length/2,length/2)]
        has_door=side in room['doorSides']
        if has_door:segments=[(-length/2,door_center-dw/2),(door_center+dw/2,length/2)]
        objs=[]
        def piece(label,a,b,y,h,mat=cream):
            c=(a+b)/2;sz=b-a
            px,pz=(x+c,offset) if axis=='x' else (offset,z+c)
            return box(label,px,pz,y,sz if axis=='x' else t,t if axis=='x' else sz,h,mat,bevel=.015)
        for j,(a,b) in enumerate(segments):
            # Side walls shortened at corners to avoid coplanar duplicated end faces.
            if axis=='z':a+=t/2;b-=t/2
            objs.extend([piece('base',a,b,.45,.9,green),piece('panel',a+.018,b-.018,1.65,1.45,glass if greenhouse or not has_door else cream),piece('top',a,b,2.55,.3,green)])
            px,pz=(x+(a+b)/2,offset) if axis=='x' else (offset,z+(a+b)/2)
            collider('wall-'+id+'-'+side+'-'+str(j),px,pz,b-a if axis=='x' else t,t if axis=='x' else b-a)
        if has_door:
            objs.append(piece('lintel',door_center-dw/2,door_center+dw/2,2.55,.3,green))
            px,pz=(x+door_center,offset) if axis=='x' else (offset,z+door_center)
            doorid='D_'+id+'_'+side
            doors.append(dict(id=doorid,x=px,z=pz,axis=axis,width=dw,owner=id))
            for sign,suffix in [(-1,'L'),(1,'R')]:
                lx,lz=(px+sign*dw/4,pz) if axis=='x' else (px,pz+sign*dw/4)
                leaf=box(doorid+'_'+suffix,lx,lz,1.19,dw/2-.015 if axis=='x' else .06,.06 if axis=='x' else dw/2-.015,2.36,glass,'door',id,['W_'+id+'_'+side])
                leaf['slide_x']=sign*(dw/2+.04) if axis=='x' else 0;leaf['slide_z']=sign*(dw/2+.04) if axis=='z' else 0
            box(doorid+'_luz',px,pz,2.73,dw if axis=='x' else .08,.08 if axis=='x' else dw,.045,cyan,'detail',id,['W_'+id+'_'+side])
        join(objs,'W_'+id+'_'+side,'wall',id)
    roof=box('TET_'+id,x,z,2.94,w+.22,d+.22,.28,glass if greenhouse else cream,'roof',id,bevel=.12)
    return roof
for room in DATA['rooms']: walls(room)
greenhouse=next(c for c in DATA['corridors'] if c['kind']=='greenhouse');greenhouse={**greenhouse,'doorSides':['west','east']}
walls(greenhouse,True)
# Five portal frames along the north-south greenhouse axis.
for i in range(5):
    z=17+i*2.75
    for x in [10.5,17.5]:box(f'Estufa_Portico_{i}_{x}',x,z,1.4,.14,.14,2.8,green,'wall','orbit-garden')
    box(f'Estufa_Viga_{i}',14,z,2.78,7,.10,.12,green,'detail','orbit-garden',['TET_orbit-garden'])

# Circulation is open by author request (25/10): floor only between buildings.
# No tunnel shell, rings, freestanding doors, lintels or corridor colliders.

# Roof landmarks named in the masterplan, with complete support chains.
def rooftop(room,kind):
    id=room['id'];x,z=room['position'].values();r='TET_'+id
    if kind in ['hub','eden']:
        cylinder('Claraboia_Base_'+id,x,z,3.15,1.6,.22,green,8,'detail',id,[r])
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=1,location=(x,-z,3.2))
        o=bpy.context.object;o.scale=(1.45,1.45,.9 if kind=='eden' else .30);o.data.materials.append(amber if kind=='eden' else cyan)
        if kind=='eden':
            o.data.materials.append(gold)
            for p in o.data.polygons:p.material_index=p.index%2
        tag(o,'Cupula_'+id,'detail',id,[r])
    elif kind=='lab':cylinder('Escotilha_Lab',x+2.5,z,3.17,.66,.22,dark,24,'detail',id,[r])
    elif kind=='data':
        box('Claraboia_Linear',x-1.8,z,3.10,.5,4,.04,cyan,'detail',id,[r])
        for dz in [-1.4,1.4]:box('Escotilha_Data_'+str(dz),x+1.7,z+dz,3.2,.85,.85,.22,dark,'detail',id,[r])
    elif kind=='quarters':
        o=box('Tubulacao_Diagonal',x,z,3.22,.20,5,.22,green,'detail',id,[r]);o.rotation_euler.z=.55
        for dx,dz in [(-1.7,-1.7),(1.7,1.7)]:cylinder('No_Quarters_'+str(dx),x+dx,z+dz,3.2,.25,.22,dark,12,'detail',id,[r])
    elif kind=='war':
        cylinder('Antena_Eixo',x,z,3.5,.16,.8,green,16,'detail',id,[r])
        # Dish surface of revolution; pivot retained for runtime rotation.
        verts=[(0,0,0)]+[(rr*math.cos(a*math.tau/24),rr*math.sin(a*math.tau/24),.3*rr*rr) for rr in [.35,.7,1.05] for a in range(24)]
        faces=[(0,1+i,1+(i+1)%24) for i in range(24)]
        for ring in range(2):
            for i in range(24):a=1+ring*24+i;b=1+ring*24+(i+1)%24;faces.append((a,b,b+24,a+24))
        mesh=bpy.data.meshes.new('Parabola');mesh.from_pydata(verts,[],faces);mesh.materials.append(cream)
        o=bpy.data.objects.new('Antena_Parabolica',mesh);bpy.context.collection.objects.link(o);o.location=(x,-z,3.85);o.rotation_euler.x=.55;tag(o,o.name,'dish',id,[r])
        s=o.modifiers.new('Espessura','SOLIDIFY');s.thickness=.04
    elif kind=='workshop':
        box('Exaustor_Base',x,z-.9,3.18,4,.8,.18,dark,'detail',id,[r])
        for i in range(14):box('Grelha_'+str(i),x-1.8+i*.27,z-.9,3.31,.08,.74,.06,green,'detail',id,[r])
        box('Caixa_Tecnica_Oficina',x+1.6,z+1.3,3.25,1.2,.9,.35,dark,'detail',id,[r])
    elif kind=='cargo':
        for i in range(5):box('Claraboia_Carga_'+str(i),x-2.4+i*1.2,z,3.11,1.05,.65,.06,cyan,'detail',id,[r])
for r,kind in zip(DATA['rooms'],['hub','eden','lab','data','quarters','war','workshop','cargo','food']):rooftop(r,kind)

# Rebind retained wall mounted props explicitly, never silently drop a dependency.
known={o.name for o in parts}
for o,p in reused:
    for key in ['apoiado_em','apoiado_em_todos']:
        ids=[old_support_map.get(s,s) for s in p[key]]
        assert all(s in known for s in ids),(o.name,ids)
        o[key]=','.join(ids)

# One tiled floor mesh: disjoint rectangles from exact union, preventing overlapping coplanar floors.
areas=DATA['rooms']+DATA['corridors'];rects=[bounds(a) for a in areas];floors=[dict(id=a['id'],**b) for a,b in zip(areas,rects)]
xs=sorted(set([v for b in rects for v in (b['minX'],b['maxX'])]+list(range(-21,22))))
zs=sorted(set([v for b in rects for v in (b['minZ'],b['maxZ'])]+list(range(-15,29))))
verts=[];faces=[];colors=[];surface_cells=[]
for xi,(x0,x1) in enumerate(zip(xs,xs[1:])):
 for zi,(z0,z1) in enumerate(zip(zs,zs[1:])):
    x=(x0+x1)/2;z=(z0+z1)/2
    hits=[i for i,b in enumerate(rects) if b['minX']<x<b['maxX'] and b['minZ']<z<b['maxZ']]
    if not hits:continue
    if -2 < x < 2 and 25 < z < 27:continue # acesso já pavimentado pelo ARES aprovado
    k=len(verts);verts.extend([(x0,-z0,0),(x0,-z1,0),(x1,-z1,0),(x1,-z0,0)]);faces.append(tuple(range(k,k+4)))
    kind=next((a.get('kind') for a in areas if a.get('kind')=='road' and bounds(a)['minX']<x<bounds(a)['maxX'] and bounds(a)['minZ']<z<bounds(a)['maxZ']),None)
    colors.append(0 if kind=='road' else (xi+zi*3)%4);surface_cells.append([x0,x1,z0,z1])
# Interior retains its original material. Exterior repeats the exact prior patio tile
# (1.25 x 1.50 m, 30 mm joints, original vertex dust colors), clipped to the new floor.
sys.path.insert(0,str(ROOT/'scripts'))
import colony_floor_geometry as legacy_floor
legacy_tile.name=legacy_floor.REFERENCE
for inside in [False,True]:
    selected=[i for i,(x0,x1,z0,z1) in enumerate(surface_cells)
        if any(bounds(r)['minX']<(x0+x1)/2<bounds(r)['maxX'] and bounds(r)['minZ']<(z0+z1)/2<bounds(r)['maxZ'] for r in DATA['rooms'])==inside]
    mesh=bpy.data.meshes.new('PavimentoInterior' if inside else 'PavimentoExterno')
    vv=[];ff=[]
    for i in selected:
        k=len(vv);vv.extend(verts[v] for v in faces[i]);ff.append(tuple(range(k,k+4)))
    mesh.from_pydata(vv,[],ff);mesh.materials.append(internal_floor_material)
    floor=bpy.data.objects.new('PISO_v007_Interno' if inside else 'PISO_v007_Externo',mesh);bpy.context.collection.objects.link(floor)
    tag(floor,floor.name,'floor')
    if not inside:
        legacy_floor.FLOORS=(floor.name,)
        legacy_floor.tile_external_floors([floor,legacy_tile])

# Exterior grid zones: cyan dashed demarcation, open road across B, five crates in NE of A.
for zone in [c for c in DATA['corridors'] if c['kind']=='zone']:
    b=bounds(zone);id=zone['id']
    # Grid is raised 3mm above the shared pavement; no second coplanar surface.
    for x in range(math.ceil(b['minX']),math.ceil(b['maxX'])):
        if id=='build-zone-b' and abs(x)<2:continue
        box('Grade_'+id+'_x'+str(x),x,(b['minZ']+b['maxZ'])/2,.003,.018,b['maxZ']-b['minZ'],.003,soil,'marking',bevel=0)
    for z in range(math.ceil(b['minZ']),math.ceil(b['maxZ'])):
        ranges=[(b['minX'],-2),(2,b['maxX'])] if id=='build-zone-b' else [(b['minX'],b['maxX'])]
        for j,(a,bb) in enumerate(ranges):
            cuts=[(gx-.009,gx+.009) for gx in range(math.ceil(b['minX']),math.ceil(b['maxX'])) if not (id=='build-zone-b' and abs(gx)<2)]
            spans=[(a,bb)]
            for lo,hi in cuts:
                spans=[piece for start,end in spans for piece in ([(start,min(lo,end))] if start<lo else [])+([(max(hi,start),end)] if end>hi else []) if piece[1]-piece[0]>1e-6]
            for k,(start,end) in enumerate(spans):box(f'Grade_{id}_z{z}_{j}_{k}',(start+end)/2,z,.003,end-start,.018,.003,soil,'marking',bevel=0)
    for axis in ['x','z']:
        lo,hi=(b['minX'],b['maxX']) if axis=='x' else (b['minZ'],b['maxZ'])
        for i in range(math.ceil((hi-lo)/.8)):
            v=lo+.35+i*.8
            if v>hi-.35:continue
            if id=='build-zone-b' and axis=='x' and abs(v)<2.3:continue
            for sign in [0,1]:
                x,z=(v,[b['minZ'],b['maxZ']][sign]) if axis=='x' else ([b['minX'],b['maxX']][sign],v)
                box(f'Demarcacao_{id}_{axis}_{i}_{sign}',x,z,.012,.4 if axis=='x' else .045,.045 if axis=='x' else .4,.012,cyan,'marking',bevel=0)
for i in range(5):
    x=16.2+i*.85;z=-9.8
    box('Suprimentos_A_'+str(i),x,z,.36,.65,.65,.72,cream,'prop');collider('caixa-a-'+str(i),x,z,.65,.65)
for x in [15.5,18,20.5]:box('Cerca_Poste_'+str(x),x,-10.5,.6,.12,.12,1.2,green,'prop');collider('cerca-'+str(x),x,-10.5,.12,.12)
box('Cerca_Norte',18,-10.5,.9,5,.06,.4,green,'prop');collider('cerca-norte',18,-10.5,5,.1)
for row in range(2):
 for col in range(5):
    x=-14.5+(col-2)*1.95;z=-10.5+(row-.5)*2.35
    o=box(f'Solar_{row}_{col}',x,z,1.0,1.7,1.8,.12,green,'solar');o.rotation_euler.x=.25
    p=box(f'Placa_{row}_{col}',x,z-.018,1.075,1.55,1.65,.02,solar,'detail',supports=[o.name]);p.rotation_euler.x=.25
    for dx in [-.6,.6]:box(f'Solar_Pe_{row}_{col}_{dx}',x+dx,z,.42,.08,.1,.84,green,'detail',supports=[o.name])
# Cables stay below soles, no artificial collision barriers to solar maintenance.
box('Cabo_Solar_EDEN',-8.95,-10.5,.045,10.9,.10,.09,dark,'detail')
box('Cabo_Solar_Data',-14.5,-4,.045,.1,10.6,.09,dark,'detail')
box('Cabo_Data_Entrada',-13.975,0,.045,.95,.10,.09,dark,'detail')

# Join grid cells by zone, retaining disjoint paint surfaces at crossings.
for cid in ['build-zone-a','build-zone-b']:
    grid=[o for o in parts if o.name.startswith('Grade_'+cid)]
    join(grid,'Grade_'+cid,'marking')
# Remove hidden downward caps exactly on the pavement plane; do not leave coplanar internal bottoms.
for o in list(parts):
    if o['papel'] in ['terrain','floor','furniture']:continue
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bm=bmesh.new();bm.from_mesh(o.data)
    hidden=[f for f in bm.faces if f.normal.z<-.999 and all(abs((o.matrix_world@v.co).z)<1e-5 for v in f.verts)]
    bmesh.ops.delete(bm,geom=hidden,context='FACES');bm.to_mesh(o.data);bm.free()

# Stable IDs and supports verified before export; hidden collider collection is authoring-only.
known={o.name for o in parts};assert len(known)==len(parts)
for o in parts:
 for key in ['apoiado_em','apoiado_em_todos']:
    assert all(s in known for s in o[key].split(',') if s),(o.name,key,o[key])
col=bpy.data.collections.new('COL_CANDIDATO');bpy.context.scene.collection.children.link(col)
for c in colliders:
    o=box('COL_'+c['id'],(c['minX']+c['maxX'])/2,(c['minZ']+c['maxZ'])/2,.75,c['maxX']-c['minX'],c['maxZ']-c['minZ'],1.5,dark,'collider',bevel=0)
    parts.remove(o)
    for old in list(o.users_collection):old.objects.unlink(o)
    col.objects.link(o);o['rect_jogo']=','.join(str(c[k]) for k in ['minX','maxX','minZ','maxZ']);o.hide_render=True;o.hide_set(True);o.display_type='WIRE'
col.hide_render=True
bpy.context.view_layer.update()
manifest_parts=[]
for o in parts:
    b=[o.matrix_world@Vector(p) for p in o.bound_box]
    manifest_parts.append(dict(id=o['id_estavel'],name=o.name,papel=o['papel'],ambiente=o['ambiente'],estado_inicial=o['estado_inicial'],
        apoiado_em=[s for s in o['apoiado_em'].split(',') if s],apoiado_em_todos=[s for s in o['apoiado_em_todos'].split(',') if s],
        bounds=dict(minX=min(p.x for p in b),maxX=max(p.x for p in b),minY=min(p.z for p in b),maxY=max(p.z for p in b),minZ=min(-p.y for p in b),maxZ=max(-p.y for p in b))))
manifest=dict(version='v007',layoutSha256=hashlib.sha256((ROOT/'src/world/marsMasterplan.json').read_bytes()).hexdigest(),parts=manifest_parts,colliders=colliders,walkableAreas=floors,doors=doors,floorCells=surface_cells,sharedFloorCoverage=[dict(id='ARES-acesso',minX=-2,maxX=2,minZ=25,maxZ=27)])
(ROOT/'src/assets/colony-v007.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'src/assets/colony-v007.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False)
# Approved ship/deck are contextual references in the Blender file, never duplicated in colony GLB.
for filename,pos in [('src/assets/ares-lander/ares-lander.glb',(.72,-33.52,.012)),('src/assets/ares-mars/deck-mars.glb',(0,-33,0))]:
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/filename))
    added=set(bpy.data.objects)-before
    for o in added:
        if o.parent is None:o.location+=Vector(pos)
        o.name='REF_ARES_'+o.name
        if o.get('conjunto')=='impacto':o.hide_render=True;o.hide_set(True)
bpy.ops.object.camera_add(location=(48,-68,65));cam=bpy.context.object;cam.rotation_euler=((Vector((0,-8,0))-cam.location).to_track_quat('-Z','Y').to_euler());cam.data.type='ORTHO';cam.data.ortho_scale=65;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='SUN',location=(0,0,30));bpy.context.object.rotation_euler=(.5,-.4,-.4);bpy.context.object.data.energy=2
bpy.context.scene.world=bpy.data.worlds.new('Marte');bpy.context.scene.world.color=(.25,.22,.2)
for screen in bpy.data.screens:
 for area in screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=60;area.spaces.active.region_3d.view_location=(0,-9,0)
bpy.ops.object.select_all(action='DESELECT');bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/mars_colony_masterplan_v007_aberto.blend'))
for path,digest in BASELINE.items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest,path
print('MASTERPLAN_OK',len(parts),'peças',len(colliders),'colisores',len(surface_cells),'células disjuntas')
