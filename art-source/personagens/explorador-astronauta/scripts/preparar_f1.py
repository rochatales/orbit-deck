"""S6.8 F1 v003 / Parada A: Fall sem borda e Death apoiado no piso. Sem runtime.
Blender -b --factory-startup -P art-source/personagens/explorador-astronauta/scripts/preparar_f1.py -- --render
--ingest <pasta> copia somente as fontes de comparação usadas, recusando sobrescrever divergências.
"""
import argparse, hashlib, json, math, shutil, statistics, sys
from pathlib import Path
import bpy
from mathutils import Vector

BASE = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--ingest', type=Path)
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
SOURCES = ['Idle.fbx','Running.fbx','Standard_Run.fbx','Sprint Backward.fbx','Jumping Down.fbx','Jumping_Down.fbx','Death From The Front.fbx','Dying.fbx','Firing_Rifle.fbx','Reloading.fbx','Rifle_Start_Run.fbx','Running Dive Roll.fbx','Rifle Jump.fbx','dash_Jump_Over.fbx']
MAP = {'Idle':('Idle.fbx',True), 'Run':('Running.fbx',True), 'Backward':('Sprint Backward.fbx',True),
       'Fall':('Jumping Down.fbx',False), 'Death':('Death From The Front.fbx',False),
       'Aim_Rifle':('Firing_Rifle.fbx',True), 'Reload_Rifle':('Reloading.fbx',False),
       'Run_Rifle_Start':('Rifle_Start_Run.fbx',False), 'Dash':('dash_Jump_Over.fbx',False), 'Jump_Rifle':('Rifle Jump.fbx',False)}
OUTSIDE = ['Stable Sword Outward Slash.fbx','Standing Melee Attack Downward.fbx','Turn Left 45 Degrees.fbx','Turning.fbx','Walk Forward Left.fbx']
BONES = ['Hips','Head','LeftFoot','RightFoot','LeftToeBase','RightToeBase']
FPS, TARGET = 30, 1.5
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
VERSION='v003'
REPORT_PATH=BASE/f'notas/f1-{VERSION}.json'
previous_renders=json.loads(REPORT_PATH.read_text()).get('renders',[]) if REPORT_PATH.exists() else []
for folder in ['mixamo','notas',f'notas/f1-{VERSION}','export',f'texturas/f1-{VERSION}',f'renders/f1-{VERSION}']:
    (BASE/folder).mkdir(parents=True,exist_ok=True)
if args.ingest:
    sources=[]
    for name in SOURCES:
        source=args.ingest/name; target=BASE/'mixamo'/name
        if target.exists():
            if sha(source)!=sha(target): raise RuntimeError('Fonte já existente diverge: '+name)
        else: shutil.copy2(source,target)
        assert sha(source)==sha(target)
        sources.append(dict(file=name,bytes=target.stat().st_size,sha256=sha(target)))
    (BASE/'mixamo/fontes-sha256.json').write_text(json.dumps({'fonte':str(args.ingest.resolve()),'arquivos':sources},ensure_ascii=False,indent=2)+'\n')
manifest=json.loads((BASE/'mixamo/fontes-sha256.json').read_text())
for item in manifest['arquivos']: assert sha(BASE/'mixamo'/item['file'])==item['sha256']

bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.fps=FPS

def imported(name):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(BASE/'mixamo'/name))
    new=[o for o in bpy.data.objects if o not in before]
    return next(o for o in new if o.type=='ARMATURE'), next(o for o in new if o.type=='MESH'),new

def points(mesh):
    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data=evaluated.to_mesh()
    result=[evaluated.matrix_world@v.co for v in data.vertices]
    evaluated.to_mesh_clear()
    return result

def set_action(arm,action):
    arm.animation_data_create();arm.animation_data.action=action
    arm.animation_data.action_slot=action.slots[0]

def curves(action):
    return [fc for layer in action.layers for strip in layer.strips for slot in action.slots
            for bag in [strip.channelbag(slot)] if bag for fc in bag.fcurves]

master,mesh,_=imported('Idle.fbx')
master.name='ExploradorAstronauta';mesh.name='Astronauta_SemMochila'
idle_source=master.animation_data.action
scene.frame_set(1);bpy.context.view_layer.update()
raw_points=points(mesh)
raw_height=max(p.z for p in raw_points)-min(p.z for p in raw_points)
K=TARGET/raw_height
anchor=master.matrix_world@master.pose.bones['mixamorig:Hips'].head
floor=min(p.z for p in raw_points)
rest={b.name:[list(row)for row in b.matrix_local]for b in master.data.bones}
assert len(rest)==57 and all(n.startswith('mixamorig:')for n in rest)
assert master.pose.bones['mixamorig:Hips'].parent is None
report={'base':'983da4a','base_original':'96d8ea5','versao':VERSION,
        'anterior':{'glb':'export/explorador-astronauta-rig-v002.glb','sha256':sha(BASE/'export/explorador-astronauta-rig-v002.glb'),'notas':'notas/f1-v002.json'},
        'preservados':[{'glb':f'export/explorador-astronauta-rig-{v}.glb','sha256':sha(BASE/f'export/explorador-astronauta-rig-{v}.glb'),'notas':f'notas/f1-{v}.json'} for v in ['v001','v002']],
        'escala_referencia_coordenacao':1.6714,
        'decisao_escala':'Mantida a escala do Idle v001 para preservar as outras oito ações. Root fonte medido no Hips em mundo Blender, antes de aplicar K.',
        'blender':bpy.app.version_string,'fps':FPS,'altura_idle_fonte_m':raw_height,
        'escala':K,'alvo_m':TARGET,'origem':'piso sob Idle quadro 1; quadril projetado em X/Z=0',
        'eixos':'Blender frente -Y, Z cima; glTF frente +Z, Y cima; rotação importada do armature mantida',
        'ossos':list(rest),'triangulos':sum(len(p.vertices)-2 for p in mesh.data.polygons),'fontes':manifest,
        'comparacoes':[], 'clipes':[], 'fora_do_escopo':OUTSIDE,
        'escolhas':{'Run':'Running: apoio do pé mais rápido e taxa menor que Standard_Run para 4,2 m/s.', 'Fall':'Jumping Down (com espaço): retorno dos dois pés mais próximo do piso e menor deslocamento horizontal que Jumping_Down.', 'Death':'Death From The Front: 3,433 s, queda natural com elevação suave autorizada na v003.'},
        'faltam':['Talk','Hit','Idle armado em loop','Corrida armada em loop','Recuo armado em loop'],
        'metodo_passada':'ToeBase com dois extremos do intervalo a <=1 cm da altura mínima desse pé; componente de recuo do pé relativo ao Hips, na direção de apoio; mediana das velocidades a 30 Hz. Passada efetiva = mediana × duração. Taxa = velocidade de jogo / mediana. Excursão geométrica por pé também registrada.',
        'root_motion':'Remove horizontal do Hips em todas as ações; Dash, Fall e Death recebem elevação suave; Fall também neutraliza o desnível vertical de borda. Preserva rotações e as outras oito ações da v002. Guarda trajetória original escalada e distância para F3; nenhum deslocamento de gameplay implementado.'}
actions={}
original_fall_locations=[]
for name in SOURCES:
    if name=='Idle.fbx': arm,source,objects=master,idle_source,[]
    else:
        arm,_,objects=imported(name);source=arm.animation_data.action
        assert set(arm.data.bones.keys())==set(rest),name
        difference=max(abs(arm.data.bones[n].matrix_local[i][j]-rest[n][i][j])for n in rest for i in range(4)for j in range(4))
        assert difference<1e-5,(name,'bind diverge',difference)
    start,end=map(int,source.frame_range)
    samples=[];poses=[]
    for frame in range(start,end+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        samples.append({'frame':frame,**{n:list((arm.matrix_world@arm.pose.bones['mixamorig:'+n].head)*K)for n in BONES}})
        poses.append((arm.matrix_world@arm.pose.bones['mixamorig:Hips'].matrix).copy())
    horizontal=sum(math.hypot(b['Hips'][0]-a['Hips'][0],b['Hips'][1]-a['Hips'][1])for a,b in zip(samples,samples[1:]))
    delta=[samples[-1]['Hips'][i]-samples[0]['Hips'][i]for i in range(3)]
    duration=(end-start)/FPS
    info={'fonte':name,'quadros':[start,end],'quantidade_quadros':end-start+1,'duracao_s':duration,
          'root_fonte_delta_xyz_blender_m':[v/K for v in delta],'root_fonte_horizontal_reta_m':math.hypot(delta[0],delta[1])/K,'root_original_delta_xyz_blender_m':delta,'root_original_horizontal_reta_m':math.hypot(delta[0],delta[1]),'root_original_horizontal_percurso_m':horizontal,
          'passada':None,'taxa_sugerida':None}
    if name in ['Running.fbx','Standard_Run.fbx','Sprint Backward.fbx']:
        sign=-1 if 'Backward' in name else 1
        velocities=[];excursions={};support={}
        for side in ['LeftToeBase','RightToeBase']:
            low=min(s[side][2]for s in samples);values=[]
            excursion=[s[side][1]-s['Hips'][1]for s in samples]
            for a,b in zip(samples,samples[1:]):
                v=((b[side][1]-b['Hips'][1])-(a[side][1]-a['Hips'][1]))*FPS*sign
                if a[side][2]<=low+.01 and b[side][2]<=low+.01 and v>0:values.append(v)
            velocities.extend(values);excursions[side]=max(excursion)-min(excursion);support[side]={'intervalos':len(values),'mediana_m_s':statistics.median(values)}
        natural=statistics.median(velocities);target=1.2 if sign<0 else 4.2
        info['passada']={'efetiva_m':natural*duration,'excursao_geometrica_por_pe_m':excursions,'velocidade_apoio_mediana_m_s':natural,'apoios':support,'alvo_m_s':target,'taxa_pelo_root_para_comparacao':target/(abs(delta[1])/duration)}
        info['taxa_sugerida']=target/natural
    report['comparacoes'].append(info)
    clip=next((c for c,(file,_)in MAP.items()if file==name),None)
    if clip:
        action=source.copy();action.name=clip;action.use_fake_user=True;set_action(arm,action)
        for frame,world in zip(range(start,end+1),poses):
            scene.frame_set(frame)
            desired=world.copy();desired.translation.x=anchor.x;desired.translation.y=anchor.y
            if clip=='Fall':
                original_fall_locations.append((arm.data.bones['mixamorig:Hips'].matrix_local.inverted()@arm.matrix_world.inverted()@desired).translation.copy())
                desired.translation=Vector((anchor.x,anchor.y,anchor.z))
            local=arm.data.bones['mixamorig:Hips'].matrix_local.inverted()@arm.matrix_world.inverted()@desired
            arm.pose.bones['mixamorig:Hips'].location=local.translation
            arm.pose.bones['mixamorig:Hips'].keyframe_insert('location',frame=frame,group='mixamorig:Hips')
        for fc in curves(action):
            for key in fc.keyframe_points:key.interpolation='LINEAR'
        # Evita uma interpolação Bezier reintroduzir deriva entre chaves constantes.
        info={**info,'clipe':clip,'loop':MAP[clip][1]}
        report['clipes'].append(info);actions[clip]=action
        info['trajetoria']=f'notas/f1-{VERSION}/trajetoria-{clip}.json'
        (BASE/info['trajetoria']).write_text(json.dumps(samples,indent=2)+'\n')
    if arm==master:set_action(master,idle_source)
    else:
        for obj in objects:bpy.data.objects.remove(obj,do_unlink=True)
# Elevação suave em unidades finais, antes de escalar o master.
# O mesmo cálculo da v002 mantém o Dash idêntico; Fall parte do anchor sem a borda.
hips=master.pose.bones['mixamorig:Hips']
vertical=(master.data.bones['mixamorig:Hips'].matrix_local.inverted().to_3x3()
          @ master.matrix_world.inverted().to_3x3() @ Vector((0,0,1/K)))
vertical_indices=[i for i in range(3) if abs(vertical[i])>1e-7]
assert len(vertical_indices)==1,('Canal vertical não alinhado',list(vertical))
vertical_index=vertical_indices[0]
def window(values,i): return values[max(0,i-1):min(len(values),i+2)]
def protected_digest(action):
    data=sorted((fc.data_path,fc.array_index,[(list(k.co),k.interpolation) for k in fc.keyframe_points])
                for fc in curves(action) if not(fc.data_path=='pose.bones["mixamorig:Hips"].location' and fc.array_index==vertical_index))
    return hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
def correct_height(clip,frame_count,contact_limit):
    set_action(master,actions[clip]);item=next(c for c in report['clipes']if c['clipe']==clip)
    assert item['quadros']==[1,frame_count]
    before_min=[];before_locations=[];hip_base=[]
    for frame in range(1,frame_count+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        before_min.append(min(p.z for p in points(mesh))*K-floor*K)
        before_locations.append(hips.location.copy())
        hip_base.append((master.matrix_world@hips.head).z*K-floor*K)
    deficits=[-z if z<-.01 else 0. for z in before_min]
    dilated=[max(window(deficits,i)) for i in range(frame_count)]
    lifts=[statistics.mean(window(dilated,i)) for i in range(frame_count)]
    protected_before=protected_digest(actions[clip])
    for frame in range(1,frame_count+1):
        scene.frame_set(frame);hips.location=before_locations[frame-1]+vertical*lifts[frame-1]
        hips.keyframe_insert('location',index=vertical_index,frame=frame,group='mixamorig:Hips')
    protected_after=protected_digest(actions[clip])
    assert protected_before==protected_after,(clip,'Curvas fora do canal vertical foram alteradas')
    original=json.loads((BASE/item['trajetoria']).read_text())
    profile=[]
    for frame in range(1,frame_count+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        after=min(p.z for p in points(mesh))*K-floor*K
        profile.append({'quadro':frame,'min_z_antes_m':before_min[frame-1],'falta_m':deficits[frame-1],
                        'max_janela_m':dilated[frame-1],'elevacao_aplicada_m':lifts[frame-1],'min_z_depois_m':after,
                        'quadril_z_original_m':original[frame-1]['Hips'][2]-floor*K,'quadril_z_base_m':hip_base[frame-1]})
    assert min(p['min_z_depois_m']for p in profile)>=-.01,(clip,'Penetração')
    contact_heights=[p['min_z_depois_m']for p in profile if p['min_z_antes_m']<0]
    assert max(contact_heights)<=contact_limit,(clip,'Flutuação induzida',max(contact_heights))
    if clip=='Fall':assert max(p['min_z_depois_m']for p in profile)<=.25
    data={'fonte':item['fonte'],'metodo':'falta abaixo de -1 cm; máximo ±1 quadro; média ±1 quadro (janelas disponíveis nas bordas)',
        'base_vertical':'anchor.z do Idle; desnível da borda removido' if clip=='Fall' else 'queda/salto natural preservado',
        'perfil':profile,'elevacao_maxima_aplicada_m':max(lifts),'quadros_elevados':[i+1 for i,v in enumerate(lifts)if v>1e-8],
        'min_z_antes_m':min(before_min),'max_z_min_antes_m':max(before_min),
        'min_z_depois_m':min(p['min_z_depois_m']for p in profile),'max_z_min_depois_m':max(p['min_z_depois_m']for p in profile),
        'max_altura_sobre_solo_em_quadros_antes_negativos_m':max(contact_heights),
        'canal_local_vertical':vertical_index,'vetor_local_por_metro_mundo':list(vertical),
        'curvas_protegidas_sha256_antes':protected_before,'curvas_protegidas_sha256_depois':protected_after}
    return data,before_locations
report['dash_altura'],dash_before=correct_height('Dash',39,.12)
report['fall_altura'],fall_before=correct_height('Fall',81,.08)
report['death_altura'],death_before=correct_height('Death',104,.06)

# Exporta apenas as dez ações selecionadas, sem reaproveitar ou alterar FBX originais.
for action in list(bpy.data.actions):
    if action not in actions.values():bpy.data.actions.remove(action)
set_action(master,actions['Idle']);master.scale=(K,)*3
master.location=(-anchor.x*K,-anchor.y*K,-floor*K)
scene.frame_set(1);bpy.context.view_layer.update()
report['ajuste_origem_blender_m']=list(master.location)
idle_points=points(mesh)
report['idle_export_m']={'min': [min(p[i]for p in idle_points)for i in range(3)],'max':[max(p[i]for p in idle_points)for i in range(3)]}
report['texturas']=[]
for material in mesh.data.materials:
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            im=node.image;original=list(im.size);color_space=im.colorspace_settings.name
            im.scale(1024,1024)
            # FBX contém packed_file de 2048²: pack() sozinho reutilizaria os bytes antigos.
            # Salva e recarrega outra imagem para garantir pixels/bytes finais de 1024².
            reference=BASE/f'texturas/f1-{VERSION}'/f'{im.name}.png'
            im.filepath_raw=str(reference);im.file_format='PNG';im.save()
            color='base_color' in im.name
            destination=reference
            if color:
                destination=reference.with_suffix('.jpg');im.filepath_raw=str(destination);im.file_format='JPEG'
                scene.render.image_settings.quality=90;im.save(quality=90)
            exported_image=bpy.data.images.load(str(destination),check_existing=False)
            exported_image.colorspace_settings.name=color_space;exported_image.pack();node.image=exported_image
            assert tuple(exported_image.size)==(1024,1024)
            report['texturas'].append({'nome':im.name,'original':original,'export':[1024,1024],'formato':'JPEG qualidade 90' if color else 'PNG sem perdas','arquivo':str(destination.relative_to(BASE)),'sha256':sha(destination),'bytes':destination.stat().st_size,'referencia_png':str(reference.relative_to(BASE))})
report['mascara_tronco']=[b.name for b in master.data.bones if b.name=='mixamorig:Spine' or any(p.name=='mixamorig:Spine'for p in b.parent_recursive)]
report['mascara_pernas']=[n for n in rest if n not in report['mascara_tronco']]
report['observacao_mascara']='Ações completas preservadas; nomes de ossos separados para futuro filtro de tronco/pernas S6.11, sem mixer/runtime nesta parada.'
# Mede envelope e deriva após neutralizar o deslocamento horizontal.
for item in report['clipes']:
    set_action(master,actions[item['clipe']]);lo=[math.inf]*3;hi=[-math.inf]*3;positions=[];lowest=math.inf;lowest_frame=1
    for frame in range(item['quadros'][0],item['quadros'][1]+1):
        scene.frame_set(frame);bpy.context.view_layer.update()
        positions.append(master.matrix_world@master.pose.bones['mixamorig:Hips'].head)
        for p in points(mesh):
            if p.z<lowest:lowest=p.z;lowest_frame=frame
            for i in range(3):lo[i]=min(lo[i],p[i]);hi[i]=max(hi[i],p[i])
    item['envelope_blender_m']={'min':lo,'max':hi};item['menor_piso']={'quadro':lowest_frame,'min_m':lowest}
    item['deriva_horizontal_quadril_m']=max(math.hypot(p.x-positions[0].x,p.y-positions[0].y)for p in positions)
    item['altura_quadril_min_max_m']=[min(p.z for p in positions),max(p.z for p in positions)]
set_action(master,actions['Idle']);scene.frame_set(1);bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT');master.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=master
output=BASE/f'export/explorador-astronauta-rig-{VERSION}.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=True,
 export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_anim_slide_to_zero=True,
 export_force_sampling=True,export_frame_range=False,export_optimize_animation_size=True,export_image_format='AUTO',export_skins=True)
report['glb']={'arquivo':str(output.relative_to(BASE)),'bytes':output.stat().st_size,'sha256':sha(output),'alvo_bytes':3000000}
report['renders']=previous_renders
if args.render:
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    world=bpy.data.worlds.new('Estudio_F1');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.23,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
    for name,position,power,size in [('Principal',(3,-4,5),450,4),('Preenchimento',(-3,-2,3),200,3),('Recorte',(0,3,4),350,3)]:
        light=bpy.data.objects.new(name,bpy.data.lights.new(name,'AREA'));scene.collection.objects.link(light);light.location=position;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,.8))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0));ground=bpy.context.object;ground.name='Piso_Estudio'
    mat=bpy.data.materials.new('Cinza_Estudio');mat.diffuse_color=(.12,.14,.17,1);ground.data.materials.append(mat)
    camera=bpy.data.objects.new('Camera_F1',bpy.data.cameras.new('Camera_F1'));scene.collection.objects.link(camera);scene.camera=camera;camera.data.type='ORTHO'
    report['renders']=[]
    # Comparativos de Fall usam a ação original v002 (ainda com a borda).
    # As cópias são criadas depois do export para não adicionar ações ao GLB.
    before_actions={}
    for clip,locations in [('Fall',original_fall_locations),('Death',death_before)]:
        action=actions[clip].copy();action.name=clip+'Antes_Correcao';set_action(master,action)
        for frame,location in enumerate(locations,1):
            scene.frame_set(frame);hips.location=location
            hips.keyframe_insert('location',frame=frame,group='mixamorig:Hips')
        before_actions[clip]=action
    for clip,frames in [('Fall',[1,7,46,80]),('Death',[87,104])]:
        for frame in frames:
            for state,action in [('antes',before_actions[clip]),('depois',actions[clip])]:
                set_action(master,action);scene.frame_set(frame);bpy.context.view_layer.update()
                center=Vector((0,0,1.05));camera.data.ortho_scale=2.8
                for view,offset in [('frente',(0,-6,.25)),('lado',(-6,0,.25))]:
                    camera.location=center+Vector(offset);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
                    path=BASE/f'renders/f1-{VERSION}/{clip}-q{frame:03d}-{state}-{view}.png'
                    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
                    report['renders'].append({'clipe':clip,'quadro':frame,'estado':state,'base_antes':'v002','vista':view,'arquivo':str(path.relative_to(BASE)),'escala_ortografica':camera.data.ortho_scale,'sha256':sha(path)})
report['script_sha256']=sha(__file__)
REPORT_PATH.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('F1_FINAL',json.dumps({'glb':report['glb'],'altura':raw_height,'escala':K,'clipes':list(actions)},ensure_ascii=False))
