# Hangar marciano — v001

Candidato de modelagem e rig, S6.12. Base da tarefa: `4f821fe` (Greenhouse); branch `rochatales/s6.12-hangar-mars`. Sem merge e sem alteração do runtime. A referência do autor orienta o asset; avaliação artística e jogabilidade pertencem ao autor.

## Entrega

- Blender 5.1.1, gerado por Python headless. Não havia MCP Blender exposto nesta sessão.
- **8.596 triângulos** no GLB, abaixo do limite de **10.000** do pedido direto (prioritário sobre os 12.000 do anexo).
- Uma malha skinned `HangarMesh`, um material `MAT_Hangar_Atlas_2K`, uma primitive glTF. Uma submissão por passe; sombras e outros passes podem gerar chamadas adicionais.
- Atlas 2048 × 2048: basecolor, ORM (R=AO, G=roughness, B=metallic), normal e emission. Texturas procedurais originais, sem dependência externa. PNGs também incorporados ao GLB e ao `.blend`.
- 11 ossos: os oito solicitados, mais `Portal_Shutter` e `Cable_L/R`. Os cabos mudam de comprimento durante o içamento; os demais componentes têm pesos rígidos normalizados.
- `Idle` 1–60; `CraneWork` 1–48; `RampOpenClose` 1–40; `AlertPulse` 1–36; 30 fps. Os extremos repetem o repouso para permitir loops.

## Construção

Casco com cobertura inclinada e canal corrugado, painéis e rebites, saia ferrugem, pórtico, sinalizadores, coletores simétricos, geradores laterais com tomadas circulares, guindaste amarelo e chassi de esteiras interno. Riscos, poeira leve e costuras menores ficam no atlas. O desgaste é mais discreto que o conceito para preservar a leitura à distância.

Corpo nominal: 8,4 × 6,4 m, altura aproximada de 4,6 m; a rampa avança 2,2 m. As tubulações e carenagens externas ultrapassam a largura nominal. Dimensão total exata e caixas propostas estão em `notas/build_report.json`.

A rampa de 2,2 m não fecharia sozinha a entrada mais alta. Uma folha superior retrátil completa o fechamento. A animação de alerta aciona os exaustores mecanicamente: não há animação de intensidade luminosa no glTF. As emissões permanecem constantes e qualquer pulso luminoso precisa ser implementado no runtime.

## Coordenadas e integração futura

Blender: X largura, Y profundidade, Z vertical, frente em -Y. Exportação glTF Y-up: frente em +Z. Origem no centro do edifício, ao nível do solo. Posição definitiva na colônia não foi presumida; nenhum prédio existente foi substituído.

As caixas `COL_*` são propostas externas no relatório, não geometria exportada. Rampas/piso, paredes e pilares requerem CuboidCollider. O fechamento exigirá sincronizar as caixas móveis de porta/rampa e o bloqueio de interação. Tubos, veículo e equipamentos laterais precisam de envelopes adicionais ou ficar fora da circulação na implantação. A malha visual nunca deve virar colisor.

A unificação em uma malha é adequada ao contrato pedido, mas **não oferece objetos de teto separados para a S6.12**. Se o Hangar se tornar um ambiente caminhável com corte do teto, deve-se preparar uma variante modular ou um mecanismo específico de ocultação antes de integrar. Não foi aplicado corte de paredes nem alteração global de visibilidade.

## Verificação

`tests/hangar-asset.test.mjs` lê o GLB real: contagem, primitive única, material, rig, pesos, quatro animações distintas com movimento e duração, mapas 2K externos e embutidos e ausência de colisores visuais. `validate_hangar.py` reimporta em cena limpa a 30 fps e compara nos dois sentidos os vértices avaliados em 50 poses com as ações da fonte. Tolerância de 0,2 mm; valores medidos e hashes em `notas/roundtrip_report.json`. A forma auxiliar Icosphere criada pelo importador para exibir ossos não é um mesh do GLB nem parte do asset.

Comparação da fonte usa ações explicitamente vinculadas ao slot do rig. As trilhas NLA da fonte ficam silenciadas por padrão, para abrir em repouso. Ative apenas a trilha desejada ou selecione a ação correspondente no Action Editor.

Os renders são todos do `.blend` final. `jogo_zoom_maximo.png` é **um estudo renderizado no Blender**, não captura de runtime: reproduz a direção ortográfica `(13,-13,13)` e escala máxima de `CameraRig`, `cameraFit` e limites de Marte 44 × 54 m, para viewport 800 × 720. Iluminação e tone mapping são de estúdio; aparência no jogo ainda precisa de comparação real. O cenário/fundo e as luzes de estúdio não entram no GLB.

## Reprodução

1. Python com Pillow/numpy: `scripts/make_atlas.py`.
2. Blender headless: `--factory-startup --python scripts/build_hangar.py`.
3. Blender headless: `--factory-startup --python scripts/validate_hangar.py`.
4. Blender headless: `--factory-startup --python scripts/render_hangar.py`.
5. Python com Pillow: `scripts/compose_sheets.py`.

Os scripts resolvem caminhos relativamente ao próprio diretório. A referência externa só é necessária para recriar sua cópia JPG; não afeta a modelagem. O diretório de saída é exclusivo deste asset. Não executar reconstrução sobre uma revisão editada manualmente: faça uma cópia versionada primeiro.

## Revisão cruzada

Claude revisou o commit inicial `64e4f15` contra `4f821fe`. Foram corrigidos: folha superior saliente (agora totalmente abaixo de Z=4,30 no repouso); referencial das curvas transportado continuamente para evitar torção dos tubos/ganchos; balanço dos ganchos e cabos pelo eixo horizontal no Idle; comparação geométrica bidirecional e limite inferior de Z; validação das imagens embutidas, modo TRIANGLES, ossos auxiliares e distinção dos quatro clipes; continuidade e mesma altura dos colisores propostos do piso/rampa. Confirmação da revisão registrada no handoff.
