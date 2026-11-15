"""Auditoria geométrica da fonte e dos dois GLBs, sem depender do runtime."""
import bpy
import json
import hashlib
import struct
import math
from pathlib import Path
from mathutils import Vector

ART=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bounds(objects):
    points=[o.matrix_basis@Vector(c) for o in objects for c in o.bound_box]
    return dict(minX=min(p.x for p in points),maxX=max(p.x for p in points),
                minZ=min(-p.y for p in points),maxZ=max(-p.y for p in points),
                minY=min(p.z for p in points),maxY=max(p.z for p in points))
def overlap(a,b):
    return a['minX']<b['maxX']-.001 and a['maxX']>b['minX']+.001 and a['minZ']<b['maxZ']-.001 and a['maxZ']>b['minZ']+.001
def glb(path):
    raw=path.read_bytes()
    magic,version,total=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and version==2 and total==len(raw)
    length=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+length])
    primitives=[p for m in doc.get('meshes',[]) for p in m['primitives']]
    binary_start=20+length+8
    export_delta=0.0
    for node in doc.get('nodes',[]):
        assert node.get('extras',{}).get('papel')=='visual'
        assert not any(k in node for k in ['matrix','translation','rotation','scale'])
        obj=bpy.data.objects[node['name']]
        expected=bounds([obj])
        actual=[]
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            accessor=doc['accessors'][primitive['attributes']['POSITION']]
            assert accessor['componentType']==5126 and accessor['type']=='VEC3'
            view=doc['bufferViews'][accessor['bufferView']]
            offset=binary_start+view.get('byteOffset',0)+accessor.get('byteOffset',0)
            stride=view.get('byteStride',12)
            actual.extend(struct.unpack_from('<3f',raw,offset+i*stride) for i in range(accessor['count']))
        assert all(math.isfinite(v) for xyz in actual for v in xyz)
        for axis,letter in enumerate('XYZ'):
            for prefix,fn in [('min',min),('max',max)]:
                delta=abs(fn(p[axis] for p in actual)-expected[prefix+letter])
                export_delta=max(export_delta,delta)
                assert delta<.0001, (node['name'],prefix+letter,delta)
    tris=sum(doc['accessors'][p['indices']]['count']//3 for p in primitives)
    assert all(p.get('mode',4)==4 for p in primitives)
    assert all(not n.get('name','').startswith(('COL_','Reserva_','SPAWN_')) for n in doc.get('nodes',[]))
    assert all(sum(m.get('emissiveFactor',[0,0,0]))==0 for m in doc.get('materials',[]))
    assert all('uri' not in image for image in doc.get('images',[]))
    return dict(triangulos=tris,malhas=len(doc['meshes']),materiais=len(doc.get('materials',[])),
                bytes=len(raw),sha256=digest(path),max_desvio_exportacao_m=export_delta,primitivas=len(primitives),nodes=len(doc.get('nodes',[])))

# Teto do mapa ampliado pelo autor em 14/11/2026 para o passe de destruição (Shanghai: 55.042).
MAP_TRIANGLE_LIMIT=72000
def audit(write_report=True):
    bpy.context.view_layer.update()
    d=json.loads((ART/'export/layout.json').read_text())
    source=list(bpy.data.collections['01_KIT_LAYOUT_EDITAVEL'].objects)
    errors=[];elements=[]
    for b in d['buildings']:
        bb=bounds([o for o in source if o.get('familia')==b['id']])
        expected=dict(minX=b['x']-b['w']/2,maxX=b['x']+b['w']/2,minZ=b['z']-b['d']/2,maxZ=b['z']+b['d']/2,maxY=b['height'])
        deviations={key:abs(bb[key]-value) for key,value in expected.items()}
        if max(deviations.values())>.05:errors.append(dict(id=b['id'],desvios=deviations))
        elements.append(dict(id=b['id'],bounds=bb,desvios=deviations))
    rects=[dict(b,minZ=-54,maxZ=54) for b in d['bands'] if b['id']!='mar']
    rects += [p for p in d['parts'] if p['kind'] in ['praca','quiosque','deck'] or p['id'].startswith('travessa')]
    for p in rects:
        matches=[o for o in source if o.get('planta')==p['id']]
        if not matches:errors.append(dict(id=p['id'],erro='Piso ausente'));continue
        bb=bounds(matches)
        delta={key:abs(bb[key]-p[key]) for key in ['minX','maxX','minZ','maxZ']}
        if max(delta.values())>.05:errors.append(dict(id=p['id'],desvios=delta))
        elements.append(dict(id=p['id'],bounds=bb,desvios=delta))
        if p.get('kind') == 'quiosque':
            allbb=bounds([o for o in source if o.get('familia')==p['id']])
            if any(allbb[k]<p[k]-.05 for k in ['minX','minZ']) or any(allbb[k]>p[k]+.05 for k in ['maxX','maxZ']):
                errors.append(dict(id=p['id'],erro='Quiosque ultrapassa deck',bounds=allbb))
    deck=next(p for p in d['parts'] if p['kind']=='deck')
    roads=[p for p in d['parts'] if p['id'].startswith('travessa')]
    roads += [dict(b,minZ=-54,maxZ=54) for b in d['bands'] if b['id'] in ['rua_fundo','pista_cidade','pista_praia']]
    land_violations=[];water_violations=[];road_violations=[]
    # Testa envelopes reais por peça. Decalques <= 5 cm são acabamento.
    # Copas acima de 3 m podem sombrear as vias, sem fechar a circulação.
    # v002: destroços e píer só valem dentro das peças declaradas na planta.
    props={p['id']:next(c for c in d['obstacles'] if c['source']==p['id']) for p in d.get('props',[])}
    pier=[p for p in d['parts'] if p['kind']=='pier']
    pier_box=dict(minX=min(p['minX'] for p in pier),maxX=max(p['maxX'] for p in pier),minZ=pier[0]['minZ'],maxZ=pier[0]['maxZ']) if pier else None
    prop_violations=[];pier_violations=[]
    for o in source:
        bb=bounds([o])
        if o.get('prop') in props:
            c=props[o['prop']]
            if any(bb[k]<c[k]-.05 for k in ['minX','minZ']) or any(bb[k]>c[k]+.05 for k in ['maxX','maxZ']) or bb['maxY']>c['maxY']+.05:
                prop_violations.append(o.name+' @ '+o['prop'])
            continue
        if o.get('familia')=='Pier_Morro':
            if any(bb[k]<pier_box[k]-.05 for k in ['minX','minZ']) or any(bb[k]>pier_box[k]+.05 for k in ['maxX','maxZ']):
                pier_violations.append(o.name)
            continue
        if bb['maxY']>.05 and (overlap(bb,deck) or overlap(bb,d['landingReservation'])):
            land_violations.append(o.name)
        if o['destino']=='mapa' and bb['maxX']>36.05:water_violations.append(o.name)
        if bb['maxY']>.2 and bb['minY']<3 and any(overlap(bb,r) for r in roads):
            road_violations.append(o.name)
    if land_violations:errors.append(dict(deck=land_violations))
    if water_violations:errors.append(dict(agua=water_violations))
    if road_violations:errors.append(dict(vias=road_violations))
    if prop_violations:errors.append(dict(destrocos_fora_do_colisor=prop_violations))
    if pier_violations:errors.append(dict(pier_fora_da_planta=pier_violations))
    for p in d.get('props',[]):
        if not any(o.get('prop')==p['id'] for o in source):errors.append(dict(id=p['id'],erro='Destroço da planta sem arte'))
    if pier and not any(o.get('familia')=='Pier_Morro' for o in source):errors.append(dict(erro='Píer ausente'))
    assets={name:glb(ART/'export'/name) for name in ['rio-fase01.glb','rio-limites-v002.glb']}
    # Verifica a geometria exportada corresponde às coleções selecionadas.
    for name,col in [('rio-fase01.glb','02_EXPORT_MAPA'),('rio-limites-v002.glb','03_EXPORT_LIMITES')]:
        triangles=0
        for o in bpy.data.collections[col].objects:
            o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
        if triangles!=assets[name]['triangulos']:errors.append(dict(exportacao=name,fonte=triangles,glb=assets[name]['triangulos']))
    budget={name:dict(triangulos_delta=a['triangulos']-limit,bytes_delta=a['bytes']-size)
            for name,a,limit,size in [(n,assets[n],MAP_TRIANGLE_LIMIT if n=='rio-fase01.glb' else 28838,11100000 if n=='rio-fase01.glb' else 1500000) for n in assets]}
    report=dict(blender=bpy.app.version_string,tolerancia_m=.05,planta_sha256=digest(ART/'export/layout.json'),
                fonte_sha256=digest(ART/'blend/rio_fase01_v005.blend'),assets=assets,orcamento=budget,
                elementos=elements,erros=errors,deck_livre=not land_violations,terra_dentro_x36=not water_violations,
                teto_triangulos_mapa=MAP_TRIANGLE_LIMIT,referencia_shanghai_triangulos=55042,vias_livres=not road_violations,destrocos_no_colisor=not prop_violations,pier_na_planta=not pier_violations,emissao_exterior=0,
                texturas=json.loads((ART/'texturas/manifesto.json').read_text()),
                criterio='Envelope de cada peça na fonte editável. Copas acima de 3 m e acabamento até 5 cm liberados sobre vias. Escada/quiosque contidos no deck da planta. Alturas de prédios incluem caixa de água. Destroços da planta v1 liberados nas vias só dentro do próprio colisor; píer liberado sobre o mar só dentro das peças Pier_*.')
    if write_report:(ART/'notas/rio-fase01-v005.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('AUDITORIA',json.dumps(dict(assets=assets,erros=errors),ensure_ascii=False))
    if errors:raise RuntimeError('Auditoria contra a planta falhou')
    if any(v['triangulos_delta']>0 or v['bytes_delta']>0 for v in budget.values()):
        raise RuntimeError('Orçamento excedido, consultar notas antes de seguir')
    return report
if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ART/'blend/rio_fase01_v005.blend'))
    audit()
