"""S6.12 / Parada A: variante editável, sem integração ou escala/posição aplicada.
Blender -b --factory-startup -P art-source/quartel/scripts/build_barracks_v002.py -- [--render]
A receita v001 copiada é importada sem chamar main; caminhos originais nunca são usados.
"""
import bpy, bmesh, math, json, pathlib, sys, inspect, struct, zlib
from mathutils import Vector
HERE=pathlib.Path(__file__).resolve().parent
OUT=HERE.parent
sys.path.insert(0,str(HERE))
sys.path.insert(0,str(OUT.parent/'armario-emergencia/scripts'))
import build_barracks as src
from build_emergency_locker import Builder, new_empty, _lin

# A segunda abertura é Sul no asset, Oeste após a orientação proposta Y=-90°.
src.OPENINGS['S']=[o for o in src.OPENINGS['S'] if o[0]!=0]+[(0,src.DOOR_W,src.FLOOR,src.FLOOR+src.DOOR_H)]
scene=src.prepare_scene();scene.name='Quartel_v002';scene.render.fps=30
mats=src.build_materials();root=new_empty('Barracks',collection=scene.collection)
root['variante']='v002 — duas portas e atlas; sem encaixe aprovado'
root['source_commit']='7c6b2cab394b279eee1ccd392f975e94d9802960'
root['scale_applied']=False
wall_builders={s:Builder('Wall_'+s,mats) for s in src.SIDES}
corner_builder=Builder('Wall_Corners',mats)
original_ring=src.ring_band

def split_ring(b,v0,v1,z0,z1,mat,cut=True):
    for side in src.SIDES:
        src.straight_band(wall_builders[side],side,v0,v1,z0,z1,mat,src.OPENINGS[side] if cut else ())
    src.corner_band(corner_builder,v0,v1,z0,z1,mat)
src.ring_band=split_ring
# Separar também a rampa Oeste; não criar vidro sobre o novo vão Sul.
shell_recipe=inspect.getsource(src.build_shell)
shell_recipe=shell_recipe.replace('    # ramp down to the soil', "    old_builder=b\n    b=Builder('Entrance_W_Ramp',mats)\n    # ramp down to the soil")
shell_recipe=shell_recipe.replace('    # small external air-recycling', '    b.finish(parent=root,collection=coll)\n    b=old_builder\n    # small external air-recycling')
shell_ns=src.__dict__.copy()
original_window=src.window
shell_ns['window']=lambda b,side,uc,w,zb,zt: None if side=='S' and uc==0 and zb==src.FLOOR else original_window(b,side,uc,w,zb,zt)
exec(compile(shell_recipe,'<v002:casco-com-duas-portas>','exec'),shell_ns)
shell=shell_ns['build_shell'](mats,root,scene.collection)
src.ring_band=original_ring
for b in [*wall_builders.values(),corner_builder]:b.finish(parent=root,collection=scene.collection)
roof=src.build_roof(mats,root,scene.collection)
# A janela central Sul vira porta; as duas janelas laterais continuam.
# Apenas o conjunto da mesa é deslocado +2,5 m em X para liberar o acesso Sul.
recipe=inspect.getsource(src.build_interior).replace('tx, ty = 0.8, -IY + 1.45','tx, ty = 3.3, -IY + 1.45')
assert 'tx, ty = 3.3' in recipe
ns=src.__dict__.copy();exec(compile(recipe,'<v002:mesa-reposicionada>','exec'),ns)
interior=ns['build_interior'](mats,root,scene.collection,src.load_font())
main_door=src.build_door(mats,root,scene.collection);src.door_action(main_door)
# Reutiliza a geometria original, com a moldura orientada para a fachada Sul.
frame=src.side_frame
src.side_frame=lambda _:frame('S')
second=src.build_door(mats,root,scene.collection);second.name='EntranceDoor_S'
src.side_frame=frame
second.location=(0,0,0);second.keyframe_insert('location',frame=1)
second.location=(src.DOOR_W+.15,0,0);second.keyframe_insert('location',frame=20)
second.animation_data.action.name='Door_S_Open';scene.frame_set(1)
# Mesmas dimensões de batentes/cobertura/status da porta original.
b=Builder('Entrance_S_Frame',mats)
with b.frame(frame('S')):
    top=src.FLOOR+src.DOOR_H
    for s in [-1,1]:b.box((.2,.14,src.DOOR_H+.1),(s*(src.DOOR_W/2+.1),-.06,src.FLOOR+(src.DOOR_H+.1)/2),'Graphite',bevel=.02)
    b.box((src.DOOR_W+.7,.5,.3),(0,-.2,top+.2),'Shell_Warm',bevel=.06)
    b.box((src.DOOR_W+.74,.52,.06),(0,-.2,top+.06),'Graphite')
    b.box((.5,.04,.06),(0,-.46,top+.22),'Glow_Accent')
    b.box((src.DOOR_W,src.T+.1,.03),(0,src.T/2-.02,src.FLOOR+.015),'Metal_Dark')
b.finish(parent=root,collection=scene.collection)
# Rampa secundária 1,60 × 1,90 m, mesma subida 0,35 m; sem redimensionar casco.
b=Builder('Entrance_S_Ramp',mats)
y0,y1,hw=-src.HY-.4,-src.HY-2,.95
A,B=(-hw,y0,src.FLOOR),(hw,y0,src.FLOOR);C,D=(hw,y1,0),(-hw,y1,0)
src.face(b,[A,B,C,D],'Metal_Dark',(0,-1,4))
src.face(b,[A,D,(-hw,y0,0)],'Metal_Dark',(-1,0,0));src.face(b,[B,C,(hw,y0,0)],'Metal_Dark',(1,0,0))
for i in range(5):
    t=(i+.5)/5;y=y0+(y1-y0)*t;z=src.FLOOR*(1-t)
    b.box((1.7,.06,.02),(0,y,z+.012),'Graphite',rot=(math.degrees(math.atan2(src.FLOOR,1.6)),0,0))
for s in [-1,1]:b.box((.05,1.65,.05),(s*(hw-.03),(y0+y1)/2,src.FLOOR/2+.05),'Metal_Light',rot=(math.degrees(math.atan2(src.FLOOR,1.6)),0,0))
b.finish(parent=root,collection=scene.collection)
for name,loc in [('Anchor_Entrance',(-8.4,0,0)),('Anchor_Entrance_S',(0,-7.4,0)),('Anchor_Interior',(-1,-.6,src.FLOOR))]:new_empty(name,loc,parent=root,collection=scene.collection)

# COL são caixas de referência em empties, sem triângulos ou material no GLB.
# Física futura deve criar cuboides simples, jamais trimesh da arte.
colliders=[]
def col(name,center,size,rot=0,kind='wall',wall=None):
    o=new_empty(name,center,(0,0,rot),parent=root,collection=scene.collection)
    o.empty_display_type='CUBE';o.empty_display_size=1;o.scale=tuple(v/2 for v in size)
    o['shape']='box';o['kind']=kind;o['size_m']=list(size);o['center_m']=list(center);o['rotation_deg']=rot
    if wall:o['wall']=wall
    colliders.append({'name':name,'center':list(center),'size':list(size),'rotationZ':rot,'kind':kind,'wall':wall});return o
for side,(origin,rot,length) in src.SIDES.items():
    ops=[(0,src.DOOR_W)] if side in ['W','S'] else []
    intervals=[(-length/2,length/2)] if not ops else [(-length/2,-src.DOOR_W/2),(src.DOOR_W/2,length/2)]
    for i,(a,c) in enumerate(intervals):
        p=frame(side)@Vector(((a+c)/2,src.T/2,(src.FLOOR+src.WALL_TOP)/2))
        col('COL_'+side+'_'+str(i),p,(c-a,src.T,src.WALL_TOP-src.FLOOR),rot,wall='Wall_'+side)
    if ops:
        h=src.WALL_TOP-src.FLOOR-src.DOOR_H;p=frame(side)@Vector((0,src.T/2,src.WALL_TOP-h/2))
        col('COL_'+side+'_Lintel',p,(src.DOOR_W,src.T,h),rot,wall='Wall_'+side)
for j,((cx,cy),a0) in enumerate(src.CORNERS):
    # Caixas tangentes conservadoras ao arco: excesso radial conservador até 25 mm em segmentos de 18°.
    r=src.R-src.T/2
    for i in range(src.CORNER_SEG):
        a=math.radians(a0+90*(i+.5)/src.CORNER_SEG);tangent=2*src.R*math.sin(math.pi/4/src.CORNER_SEG)+.012
        col(f'COL_Corner_{j}_{i}',(cx+r*math.cos(a),cy+r*math.sin(a),(src.FLOOR+src.WALL_TOP)/2),(src.T+.012,tangent,src.WALL_TOP-src.FLOOR),math.degrees(a),wall='Wall_Corners')
for side in ['W','S']:
    p=frame(side)@Vector((0,-.22,src.FLOOR+src.DOOR_H/2))
    o=col('COL_Door_'+side,p,(src.DOOR_W+.12,.16,src.DOOR_H+.05),src.SIDES[side][1],kind='door');o['movable']=True
floor_col=col('COL_Floor',(0,0,src.FLOOR-.025),(11.5,9.5,.05),kind='floor')
floor_col['shape']='rounded_rect_floor';floor_col['corner_radius']=src.R-src.T
for name,center,size,rot in [('COL_Ramp_W',(-7.2,0,.175),(1.638,1.9,.04),0),('COL_Ramp_S',(0,-6.2,.175),(1.9,1.638,.04),0)]:
    o=col(name,center,size,rot,kind='ramp');o['shape']='analytic_ramp';o['rise']=.35;o['run']=1.6
    if name.endswith('_W'):o.rotation_euler.y=-math.atan2(.35,1.6)
    else:o.rotation_euler.x=math.atan2(.35,1.6)
    o['rotationXYZ_deg']=[math.degrees(a) for a in o.rotation_euler]

# Atlas de paleta: 128², 8×8 células; UV por face no centro da célula.
# Base sRGB; ORM não-cor; emissão sRGB com força global 4 e valores por célula.
texdir=OUT/'export/texturas-v002';texdir.mkdir(exist_ok=True)
def srgb(v):return 12.92*v if v<=.0031308 else 1.055*v**(1/2.4)-.055
names=list(src.MATERIALS);N=128;CELL=16
base=bytearray(N*N*4);orm=bytearray(N*N*4);emi=bytearray(N*N*4)
for y in range(N):
    for x in range(N):
        i=(y//CELL)*8+x//CELL
        colhex,rough,metal,e,strength=src.MATERIALS[names[i]] if i<len(names) else ('#FFFFFF',.8,0,None,0)
        rgb=[int(colhex[k:k+2],16) for k in [1,3,5]]
        em=[round(srgb(max(0,min(1,v*strength/4)))*255) for v in _lin(e)[:3]] if e else [0,0,0]
        off=(y*N+x)*4;base[off:off+4]=bytes(rgb+[255]);orm[off:off+4]=bytes([255,round(rough*255),round(metal*255),255]);emi[off:off+4]=bytes(em+[255])
def png(path,pixels):
    def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    raw=b''.join(b'\0'+pixels[y*N*4:(y+1)*N*4] for y in range(N))
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',N,N,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
for name,pix in [('basecolor',base),('orm',orm),('emission',emi)]:png(texdir/(name+'.png'),pix)
mat=bpy.data.materials.new('Quartel_Paleta_Emissivo_v002');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Emission Strength'].default_value=4
images=[]
for name in ['basecolor','orm','emission']:
    im=bpy.data.images.load(str(texdir/(name+'.png')),check_existing=True);im.colorspace_settings.name='Non-Color' if name=='orm' else 'sRGB';im.pack();images.append(im)
    n=nodes.new('ShaderNodeTexImage');n.image=im;n.interpolation='Closest';n.label=name
    if name=='basecolor':links.new(n.outputs['Color'],p.inputs['Base Color'])
    elif name=='emission':links.new(n.outputs['Color'],p.inputs['Emission Color'])
    else:
        sep=nodes.new('ShaderNodeSeparateColor');links.new(n.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
visual=[o for o in root.children if o.type=='MESH']
pre_atlas_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in visual)
pre_atlas_materials=len({m.name for o in visual for m in o.data.materials})
for o in visual:
    uv=o.data.uv_layers.new(name='PaletteUV')
    for face in o.data.polygons:
        name=o.data.materials[face.material_index].name;i=names.index(name)
        u=(i%8+.5)/8;v=1-(i//8+.5)/8
        for loop in face.loop_indices:uv.data[loop].uv=(u,v)
        face.material_index=0
    o.data.materials.clear();o.data.materials.append(mat)
scene.frame_set(1);bpy.context.view_layer.update()
# Excluir outras cenas padrão da sessão nova, sem tocar em arquivos-fonte.
for other in list(bpy.data.scenes):
    if other!=scene:bpy.data.scenes.remove(other)
# Preservar contrato das duas portas no export, raiz sem transform de encaixe.
for o in root.children:
    if o.type=='MESH':o.data.calc_loop_triangles()
for record in colliders:
    helper=scene.objects[record['name']]
    record['shape']=helper['shape']
    record['rotationXYZ_deg']=[math.degrees(a) for a in helper.rotation_euler]
report={'variant':'v002','sourceSHA':root['source_commit'],'scale':[1,1,1],'rotationApplied':False,'Ground':False,'materialsBeforeAtlas':pre_atlas_materials,'trianglesBeforeAtlas':pre_atlas_triangles,'materials':1,'triangles':sum(len(o.data.loop_triangles) for o in visual),'colliders':colliders,'changes':['segunda porta Sul (Oeste após rotação proposta)','janela Sul central retirada','mesa deslocada +2,5 m X local','Wall_S/E/N/W e Wall_Corners próprios','COL_* em caixas/metadados sem malha','atlas de paleta + ORM + emissivo; Ground omitido'],'palette':{n:{'cell':i,'hex':src.MATERIALS[n][0],'roughness':src.MATERIALS[n][1],'metallic':src.MATERIALS[n][2],'emission':src.MATERIALS[n][3],'strength':src.MATERIALS[n][4]} for i,n in enumerate(names)}}
(OUT/'notas/build-v002.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'export/barracks-v002.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=False)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blend/barracks-v002.blend'))
print('V002:',report['triangles'],'triângulos, 1 material,',len(colliders),'COL vazios')

if '--render' in sys.argv:
    # Estúdio de render separado e posterior à exportação/salvamento do asset.
    cam=src.setup_preview(scene);scene.cycles.samples=32
    scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
    ground=bpy.data.materials.new('Studio_Sand');ground.diffuse_color=(*_lin('#A67F66')[:3],1)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));studio=bpy.context.object;studio.name='StudioFloor';studio.data.materials.append(ground)
    for name,cut,d,target,scale in [('frente',False,(-1,0,0),(-.4,-.8,2.1),14.5),('tres-quartos',False,(-1,-1,.8),(-.5,-.4,1.3),19),('superior-sem-teto',True,(0,0,1),(-.5,-.8,.5),19)]:
        scene.render.resolution_y=900 if name=='frente' else 1080
        roof.hide_render=cut;src.aim(cam,d,target,scale)
        for ln in ['Preview_Warm1','Preview_Warm2']:scene.objects[ln].data.energy=450 if cut else 0
        scene.render.filepath=str(OUT/'renders'/('v002-'+name+'.png'));bpy.ops.render.render(write_still=True)
