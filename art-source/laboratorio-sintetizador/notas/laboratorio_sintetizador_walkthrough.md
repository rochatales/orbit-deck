# Laboratório com Máquina Sintetizadora de Diamantes — Horda Survivor

Apresentação técnica e artística do modelo 3D low-poly do **Laboratório Científico Modular com Máquina Sintetizadora de Diamantes** centralizada, modelado e texturizado no Blender 5.1 via MPC Blender Scripting a partir dos estudos conceituais aprovados.

---

## 1. Comparação Direta: Conceito 2D vs Render 3D

````carousel
![Comparação Referência Conceitual vs Render 3D](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_comparacao_referencia_x_3d.png)
<!-- slide -->
![Vista Isométrica 3/4 do Laboratório com Corte 90°](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_04_3q.png)
<!-- slide -->
![Visão em Perspectiva de Gameplay Real do Horda Survivor](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_jogo_zoom_maximo.png)
````

---

## 2. Orçamento Geométrico e Especificações Técnicas

| Métrica | Obtido | Orçamento Alvo | Status |
|---|---|---|---|
| **Triângulos** | **7.382** | `<= 15.000` | **Aprovado** (`49,2%` do limite) |
| **Faces Poligonais** | **3.527** | — | Malha unificada 100% manifold |
| **Vértices** | **4.453** | — | Otimizado para runtime WebGL/Three.js |
| **Draw Calls** | **1 único** | 1 material / 1 malha | **Aprovado** |
| **Dimensões do Laboratório** | `15,5 m × 11,8 m × 4,0 m` | Planta 14x10 m (corte 90°) | **Aprovado** |
| **Dimensões da Máquina** | `3,3 m × 2,5 m × 2,4 m` | Baia técnica 6x5 m | **Aprovado** |
| **Rig & Ossos** | **9 ossos** | Rig funcional de maquinário e portas | **Aprovado** |
| **Animações NLA** | **4 sequências** | Embutidas no `.glb` | **Aprovado** |

---

## 3. Pranchas de Validação e Topologia

````carousel
![Prancha Turnaround 2x2 - 4 Vistas Principais](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_turnaround_2x2_vistas.png)
<!-- slide -->
![Prancha Wireframe 4 Vistas - Densidade Poligonal Low-Poly](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_wireframe_4_vistas.png)
<!-- slide -->
![Vista Frontal Alinhada ao Visor e Diamante](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_01_front.png)
````

---

## 4. Quatro Animações do Maquinário e Portas

````carousel
![Folha dos 4 Modos Operacionais Animados](/Users/rochatales/.gemini/antigravity/brain/822c7358-95ae-408d-9dda-a127ef654ba3/lab_4_animacoes_3d.png)
<!-- slide -->
```yaml
# Ações NLA Configuradas no Armature:
1. Idle_Ready:
   - Levitação suave e rotação lenta do diamante central
   - Pulsação orgânica dos arcos de plasma ciano
   - Respiração operacional do circuito elétrico
2. Synthesizing:
   - Rotação acelerada com escala do cristal de diamante
   - Compressão simultânea das hastes e pistões hidráulicos
   - Descarga energética de plasma ciano de alta voltagem
3. Drawer_Dispense:
   - Deslizamento frontal da gaveta de coleta metálica (0,42 m)
   - Revelação do diamante sintetizado no berço
   - Retração suave e travamento do compartimento
4. Standby_PowerDown:
   - Fechamento e travamento das portas de serviço e airlock
   - Acomodação em repouso do diamante na cavidade
   - Redução dos emissores para baixa intensidade
```
````

---

## 5. Arquivos e Entregáveis do Projeto

- **Cena Master Blender:** [`art-source/laboratorio-sintetizador/blend/laboratorio_sintetizador_v001.blend`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/blend/laboratorio_sintetizador_v001.blend)
- **Ativo Runtime Otimizado:** [`art-source/laboratorio-sintetizador/export/laboratorio_sintetizador_v001.glb`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/export/laboratorio_sintetizador_v001.glb) (1,92 MB)
- **Atlas PBR 2K:** [`art-source/laboratorio-sintetizador/texturas/`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/texturas/)
- **Script de Construção Procedural:** [`art-source/laboratorio-sintetizador/scripts/build_laboratorio.py`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/scripts/build_laboratorio.py)
- **Script de Renderização de Estúdio:** [`art-source/laboratorio-sintetizador/scripts/render_laboratorio.py`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/scripts/render_laboratorio.py)
- **Relatório Técnico Detalhado:** [`art-source/laboratorio-sintetizador/RELATORIO.md`](file:///Users/rochatales/Automations/game-workplace/art-source/laboratorio-sintetizador/RELATORIO.md)
