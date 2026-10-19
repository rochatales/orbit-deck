# Corte pelo plano near da câmera real do jogo (CameraRig.tsx: alvo + 18,38 m horizontal, 13,55 m de altura, ortográfica,
# near 0,1). Para pontos caminháveis do mapa (grade de 2 m) e giro de 5 em 5°, conta quando algum vértice de uma peça alta
# da plataforma fica atrás do plano near e dentro do quadro (zoom inicial): a peça aparece cortada, com o interior à mostra.
# É um efeito do runtime (câmera perto demais), não do modelo; registrado para a integração. Não salva o .blend.
#   Blender -b <arquivo.blend> -P scripts/corte_near_v006.py -- <camada> <saida.json>
import bpy
import json
import math
import os
import sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
args = sys.argv[sys.argv.index('--') + 1:]
LAYER, SAIDA = args[0], args[1]
sc = bpy.context.scene
ALTO = ('Foguete', 'Torre', 'Mastro', 'Braco', 'Passarela', 'Umbilical')
ORTHO = 1920 / (min(1920 / max(35, 44 * 0.8), 1080 / max(26, 54 * 0.65)) * 1.6)
HW, HH = ORTHO / 2, ORTHO / 2 * 1080 / 1920
vl = sc.view_layers[LAYER]
if vl.depsgraph is None:
    vl.update()
dg = vl.depsgraph
dg.update()
pts = []
for o in vl.objects:
    if o.type != 'MESH' or not o.name.startswith('PLAT_') or not any(k in o.name for k in ALTO):
        continue
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    vs = np.array([(ev.matrix_world @ v.co)[:] for v in me.vertices])
    ev.to_mesh_clear()
    if len(vs) > 600:
        vs = vs[np.linspace(0, len(vs) - 1, 600).astype(int)]
    pts.append(vs)
P = np.concatenate(pts)
GJ = np.stack([P[:, 0], -P[:, 1], P[:, 2]], 1)            # coordenadas do jogo: x, z, altura
PIL = json.load(open(os.path.join(ROOT, 'notas', 'piloto_mundo_marte.json')))
OBS = [(o['minX'], o['maxX'], o['minZ'], o['maxZ']) for o in PIL['obstacles']]


def livre(x, z):
    if not any(a['minX'] <= x <= a['maxX'] and a['minZ'] <= z <= a['maxZ'] for a in PIL['walkableAreas']):
        return False
    return not any(max(r[0] - x, 0, x - r[1]) ** 2 + max(r[2] - z, 0, z - r[3]) ** 2 < 0.36 ** 2 for r in OBS)


B = PIL['bounds']
amostras = [(x, z) for x in np.arange(B['minX'], B['maxX'] + 0.1, 2.0) for z in np.arange(B['minZ'], B['maxZ'] + 0.1, 2.0) if livre(x, z)]
ACESSO = [(0.0, 19 + 0.5 * i) for i in range(29)]
res, por_ponto = {}, []
for nome, lista in (('mapa_caminhavel_2m', amostras), ('acesso_x0_z19_33', ACESSO)):
    n_pares = n_corte = 0
    pontos_com_corte = 0
    for (x, z) in lista:
        alvo = np.array([x, z, 0.55])
        k = 0
        for g in range(0, 360, 5):
            a = math.radians(g)
            off = np.array([math.cos(a) * 18.38, math.sin(a) * 18.38, 13.55])
            cam = alvo + off
            f = -off / np.linalg.norm(off)                  # direção de visão
            up = np.array([0.0, 0.0, 1.0]) - f * f[2]
            up /= np.linalg.norm(up)
            rt = np.cross(f, up)
            d = GJ - cam
            prof = d @ f
            u, v = d @ rt, d @ up
            atras = (prof < 0.1) & (np.abs(u) < HW) & (np.abs(v) < HH)
            n_pares += 1
            if atras.any():
                n_corte += 1
                k += 1
        if k:
            pontos_com_corte += 1
            if nome == 'acesso_x0_z19_33':
                por_ponto.append({'x': x, 'z': z, 'graus_com_corte': 5 * k})
    res[nome] = {'pontos': len(lista), 'pontos_com_corte_em_algum_angulo': pontos_com_corte,
                 'pares_ponto_angulo': n_pares, 'pares_com_corte': n_corte, 'fracao_pares_com_corte': round(n_corte / n_pares, 4)}
res['acesso_por_ponto'] = por_ponto
res['nota'] = ('Corte = vértice de peça alta (foguete, torre, mastro, braço, passarelas, umbilicais) atrás do plano near e dentro do '
               'quadro. Some com a câmera recuada na mesma direção (enquadramento ortográfico idêntico).')
json.dump(res, open(SAIDA, 'w'), ensure_ascii=False, indent=1)
print('CORTE_OK', LAYER, json.dumps({k: v for k, v in res.items() if k not in ('acesso_por_ponto', 'nota')}, ensure_ascii=False))
print('CORTE_ACESSO', json.dumps(por_ponto))
