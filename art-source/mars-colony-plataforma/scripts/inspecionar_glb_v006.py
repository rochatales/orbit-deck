# Inspeciona o GLB de prévia da v006 direto no JSON (sem Blender) e confronta com o manifesto da fonte.
#   python3 art-source/mars-colony-plataforma/scripts/inspecionar_glb_v006.py
import json
import os
import struct

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.join(ROOT, 'export', 'previa_v006_B3')
b = open(os.path.join(D, 'plataforma_v006_B3_previa.glb'), 'rb').read()
ln = struct.unpack('<I', b[12:16])[0]
j = json.loads(b[20:20 + ln])
man = json.load(open(os.path.join(D, 'manifesto_plataforma_v006_B3.json')))
fonte = {o['nome']: o for o in man['objetos'] + man['marcadores']}
acc = j['accessors']
rep = {'extensoes': j.get('extensionsUsed', []), 'nos': len(j['nodes']), 'malhas': len(j['meshes']),
       'materiais': len(j.get('materials', [])), 'cameras': [c.get('name') for c in j.get('cameras', [])],
       'luzes_no_glb': len(j.get('extensions', {}).get('KHR_lights_punctual', {}).get('lights', []))}
nos = []
for n in j['nodes']:
    e = n.get('extras', {})
    item = {'nome': n.get('name'), 't': n.get('translation'), 'r': n.get('rotation'), 's': n.get('scale'), 'extras': e}
    if 'mesh' in n:
        m = j['meshes'][n['mesh']]
        tri, attrs, mats = 0, set(), []
        for p in m['primitives']:
            attrs |= set(p['attributes'].keys())
            tri += (acc[p['indices']]['count'] if 'indices' in p else acc[p['attributes']['POSITION']]['count']) // 3
            if 'material' in p:
                mats.append(j['materials'][p['material']]['name'])
        item.update({'tri': tri, 'atributos': sorted(attrs), 'mats': sorted(set(mats))})
    nos.append(item)
por_nome = {n['nome']: n for n in nos}
dif = []
for nome, f in fonte.items():
    n = por_nome.get(nome)
    if n is None:
        dif.append((nome, 'ausente no GLB'))
        continue
    if 'triangulos' in f and n.get('tri') != f['triangulos']:
        dif.append((nome, 'triangulos fonte %d glb %s' % (f['triangulos'], n.get('tri'))))
    for k in ('id_estavel', 'papel', 'estado_inicial', 'previa') + (('colisor',) if f['tipo'] == 'MESH' else ()):
        if k not in n['extras']:
            dif.append((nome, 'extra ausente: ' + k))
    if n['extras'].get('id_estavel') != f['id_estavel']:
        dif.append((nome, 'id_estavel diferente'))
    t = n.get('t') or [0, 0, 0]
    if max(abs(a - b_) for a, b_ in zip(t, f['pivo_jogo_xyz'])) > 1e-3:
        dif.append((nome, 'pivô fonte %s glb %s' % (f['pivo_jogo_xyz'], t)))
    if 'materiais' in f and sorted(set(f['materiais'])) != n.get('mats'):
        dif.append((nome, 'materiais fonte %s glb %s' % (sorted(set(f['materiais'])), n.get('mats'))))
ids = [n['extras'].get('id_estavel') for n in nos if 'id_estavel' in n['extras']]
mat = {m['name']: {'alphaMode': m.get('alphaMode', 'OPAQUE'), 'emissive': m.get('emissiveFactor'),
                   'emissive_strength': m.get('extensions', {}).get('KHR_materials_emissive_strength', {}).get('emissiveStrength'),
                   'baseColor': m.get('pbrMetallicRoughness', {}).get('baseColorFactor'),
                   'doubleSided': m.get('doubleSided', False)} for m in j.get('materials', [])}
rep.update({'diferencas_fonte_x_glb': dif,
            'ids_estaveis': {'total': len(ids), 'unicos': len(set(ids)) == len(ids)},
            'nos_COL_no_glb': [n['nome'] for n in nos if str(n['nome']).startswith('COL_')],
            'sem_NORMAL': [n['nome'] for n in nos if 'atributos' in n and 'NORMAL' not in n['atributos']],
            'nos_com_escala_diferente_de_1': [n['nome'] for n in nos if n['s'] and any(abs(v - 1) > 1e-6 for v in n['s'])],
            'triangulos_total_glb': sum(n.get('tri', 0) for n in nos),
            'triangulos_total_fonte': sum(f.get('triangulos', 0) for f in fonte.values()),
            'materiais_detalhe': mat, 'nos': nos})
json.dump(rep, open(os.path.join(D, 'inspecao_glb.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in rep.items() if k not in ('nos', 'materiais_detalhe')}, ensure_ascii=False, indent=1))
print('MATERIAIS', json.dumps({k: (v['alphaMode'], v['emissive_strength']) for k, v in mat.items()}, ensure_ascii=False))
