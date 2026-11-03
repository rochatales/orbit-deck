"""Variantes v002: fontes intactas, kit de porta copiado da Control Room ativa."""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Matrix, Vector
ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / 'art-source/predios-colonia-v001'
OUT = ART / 'export'
REF = ROOT / 'src/assets/control-room/control-room-v002.glb'
placements = {'meeting-room': (0, 0, -math.pi/2), 'data-center': (-12.5, 0, math.pi/2), 'cafeteria': (11.5, 11.7, -math.pi/2)}
labels = {'meeting-room': ('MEETING ROOM', 'MR'), 'data-center': ('DATA CENTER', 'DC'), 'cafeteria': ('CAFETERIA', 'CF')}

def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
clear()
bpy.ops.import_scene.gltf(filepath=str(REF))
bpy.context.view_layer.update()
# Bake a cópia das peças efetivamente usadas no jogo, sem recriar o desenho.
kit = {}
for name in ['ARQ_Control_Portal_S', 'PROP_Control_Status_S', 'D_Control_S_A', 'D_Control_S_B']:
    o = bpy.data.objects.get(name)
    if not o: raise RuntimeError(name)
    data = o.data.copy(); data.transform(o.matrix_world)
    data.transform(Matrix.Translation((0, -7.325, 0)))
    data.use_fake_user = True
    kit[name] = data
atlas = bpy.data.materials['MAT_Control_Atlas_2K']
atlas.use_fake_user = True
ref_hash = digest(REF)

# Material do atlas original: tile 12 = Floor_Grey, 13 = juntas, 1 = grafite.
def tile_uv(mesh, tile):
    uv = mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    # O atlas Blender importado está em glTF; coordenadas corrigidas na reexportação.
    u = (tile % 4 + .5) / 4
    v = 1 - (tile // 4 + .5) / 4
    for loop in uv.data: loop.uv = (u, v)
    mesh.materials.clear(); mesh.materials.append(atlas)
    for p in mesh.polygons: p.material_index = 0

def mesh_obj(name, verts, faces, tile, parent=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); tile_uv(me, tile)
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if parent: o.parent = parent
    return o

def box(name, center, size, tile, parent=None, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center); o = bpy.context.object; o.name = name
    o.scale = size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('Chanfro', 'BEVEL'); m.width = bevel; m.segments = 1
        bpy.ops.object.modifier_apply(modifier=m.name)
    tile_uv(o.data, tile)
    if parent: o.parent = parent
    return o

def clip(poly, axis, edge, sign):
    out=[]
    for i,a in enumerate(poly):
        b=poly[(i+1)%len(poly)];da=(a[axis]-edge)*sign;db=(b[axis]-edge)*sign
        if da>=-1e-9:out.append(a)
        if da*db < -1e-12:
            t=da/(da-db);out.append(tuple(a[k]+(b[k]-a[k])*t for k in range(3)))
    return out

def joints(top, placement, parent):
    # Grade de mundo comum: X múltiplos de 1,25; Z = 0,75 + múltiplos de 1,50.
    x,z,angle=placement
    transform=Matrix.Translation((x,-z,0)) @ Matrix.Rotation(angle,4,'Z')
    inverse=transform.inverted()
    verts=[];faces=[]
    world=[[tuple(transform@Vector(v)) for v in poly] for poly in top]
    for axis,period,phase in [(0,1.25,0),(1,1.5,.75)]:
        lo=min(v[axis] for poly in world for v in poly);hi=max(v[axis] for poly in world for v in poly)
        for i in range(math.floor((lo-phase)/period),math.ceil((hi-phase)/period)+1):
            edge=phase+i*period
            for poly in world:
                clipped=clip(clip(poly,axis,edge-.015,1),axis,edge+.015,-1)
                if len(clipped)<3:continue
                points=[inverse@Vector(v) for v in clipped]
                start=len(verts);verts.extend([(p.x,p.y,p.z+.002) for p in points]);faces.append(tuple(range(start,len(verts))))
    if faces:mesh_obj('Juntas_125x150_30mm',verts,faces,13,parent)

def floor_standard(o, placement):
    # Mantém a silhueta original; remove a paleta e malha de juntas antigas por UV/material uniforme.
    tile_uv(o.data,12)
    top=[]
    for p in o.data.polygons:
        if p.normal.z>.9:
            points=[tuple(o.matrix_world@o.data.vertices[i].co) for i in p.vertices]
            if max(v[2] for v in points)-min(v[2] for v in points)<1e-5:top.append(points)
    joints(top,placement,o)

report=[]
for id,placement in placements.items():
    clear()
    source=ART/'originais'/f'{id}.glb'
    bpy.ops.import_scene.gltf(filepath=str(source));bpy.context.view_layer.update()
    root=next(o for o in bpy.data.objects if o.parent is None)
    floor=bpy.data.objects['Building_Floor'];pad=bpy.data.objects['Building_Pad']
    # Suprime a duplicação coplanar da base sob o piso; geometria fonte fica intocada.
    for o in [floor,pad]:floor_standard(o,placement)
    doors=[]
    for side,axis,sign in [('South',1,-1),('East',0,1)]:
        old=bpy.data.objects.get('Door_'+side)
        if not old:continue
        bpy.context.view_layer.update()
        leaf=bpy.data.objects['Door'+side[0]+'_LeafL']
        points=[leaf.matrix_world@v.co for v in leaf.data.vertices]
        normal=Vector((0,-1,0)) if side=='South' else Vector((1,0,0))
        tangent=Vector((1,0,0)) if side=='South' else Vector((0,1,0))
        # Plano real da folha na fonte; conserva largura útil de 1,70 m.
        center=Vector((0,0,0)); center[axis]=sum((min(v[axis] for v in points),max(v[axis] for v in points)))/2
        for child in list(old.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
        bpy.data.objects.remove(old,do_unlink=True)
        # Retira só componentes soltos do antigo portal/letreiro, nunca a casca lateral.
        wall=bpy.data.objects['Wall_'+side[0]]
        bm=bmesh.new();bm.from_mesh(wall.data);seen=set();remove=[]
        for v in bm.verts:
            if v in seen:continue
            todo=[v];seen.add(v);component=[]
            while todo:
                a=todo.pop();component.append(a)
                for e in a.link_edges:
                    b=e.other_vert(a)
                    if b not in seen:seen.add(b);todo.append(b)
            pts=[wall.matrix_world@v.co for v in component]
            if all(abs(p.dot(tangent))<1.56 and abs((p-center).dot(normal))<1.1 and -.02<=p.z<2.8 for p in pts):remove.extend(component)
        bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(wall.data);bm.free()
        group=bpy.data.objects.new('Door_'+side,None);bpy.context.collection.objects.link(group);group.parent=root;group.location=center
        # Sul da referência olha -Y; Leste precisa de +90° em Blender.
        group.rotation_euler.z=math.pi/2 if side=='East' else 0
        leaves=[]
        for suffix,key in [('L','D_Control_S_A'),('R','D_Control_S_B')]:
            data=kit[key].copy();data.use_fake_user=False
            # Normaliza centro da folha e largura; duas folhas com mesmo desenho do EDEN.
            sx=-1 if suffix=='L' else 1
            data.transform(Matrix.Translation((-sx*.535,0,0)))
            data.transform(Matrix.Diagonal((.84/1.055,1,1,1)))
            o=bpy.data.objects.new('Door'+side[0]+'_Leaf'+suffix,data);bpy.context.collection.objects.link(o);o.parent=group;o.location.x=sx*.43
            col=bpy.data.objects.new('COL_Door'+side[0]+'_'+suffix,None);bpy.context.collection.objects.link(col);col.parent=o;col.location=(0,0,1.1);col.scale=(.42,.065,1.1);col.empty_display_type='CUBE';col.empty_display_size=.2
            for action_name,start,end in [('Open',sx*.43,sx*1.39)]:
                o.animation_data_clear();o.location.x=start;o.keyframe_insert(data_path='location',frame=0);o.location.x=end;o.keyframe_insert(data_path='location',frame=24)
                action=o.animation_data.action
                for layer in action.layers:
                    for strip in layer.strips:
                        for bag in strip.channelbags:
                            for curve in bag.fcurves:
                                for key in curve.keyframe_points:key.interpolation='LINEAR'
                action.name=f'Door{side}_{action_name}_{suffix}'
                track=o.animation_data.nla_tracks.new();track.name=f'Door{side}_{action_name}';track.strips.new(track.name,0,action)
                o.animation_data.action=None
            o.location.x=sx*.43;leaves.append(o)
        for key in ['ARQ_Control_Portal_S','PROP_Control_Status_S']:
            data=kit[key].copy();data.use_fake_user=False;data.transform(Matrix.Diagonal((1.7/2.2,1,1,1)))
            o=bpy.data.objects.new('Padrao_'+key+'_'+side,data);bpy.context.collection.objects.link(o);o.parent=group
        doors.append({'side':side,'plane':[center.x,center.y,center.z],'removed_vertices':len(remove),'motion':'sliding','width':1.7})
    # Letreiro no mesmo acabamento da Control Room: quadro creme, grafite e tag de latão.
    front=next(d for d in doors if d['side']=='South')['plane'][1]
    roof=bpy.data.objects['Building_Roof']
    board=bpy.data.objects.new('Letreiro_Padrao',None);bpy.context.collection.objects.link(board);board.parent=roof
    for x,width,tile in [(-.38,2.65,0),(1.45,.86,2)]:box('Placa',(x,front-.85,3.1),(width,.24,.36),tile,board,.025)
    for text,x,width in [(labels[id][0],-.38,2.48),(labels[id][1],1.45,.7)]:
        bpy.ops.object.text_add(location=(x,front-.98,3.1));o=bpy.context.object;o.name='Texto_'+text;o.data.body=text;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=.20;o.data.extrude=.002;o.rotation_euler=(math.pi/2,0,0)
        bpy.ops.object.convert(target='MESH');bpy.context.view_layer.update()
        if o.dimensions.x>width:o.scale.x*=width/o.dimensions.x
        tile_uv(o.data,1);o.parent=board
    for x in [-1.25,1.25]:box('Suporte_Letreiro',(x,front-.76,2.76),(.055,.08,.45),1,board)
    bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=24;bpy.context.scene.frame_set(0)
    # Ações antigas referem-se aos pivôs retirados e não entram no arquivo selecionado.
    for o in bpy.context.scene.objects:o.select_set(True)
    target=OUT/f'{id}-v002.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_yup=True,export_extras=True)
    (ROOT/'src/assets/buildings'/f'{id}.glb').write_bytes(target.read_bytes())
    report.append({'id':id,'source_sha256':digest(source),'sha256':digest(target),'bytes':target.stat().st_size,'reference_sha256':ref_hash,'doors':doors,'floor':{'tile_m':[1.25,1.5],'joint_m':.03,'world_aligned':True},'label':labels[id][0]})
(ART/'notas/padronizacao-v002.json').write_text(json.dumps(report,indent=2)+'\n')
