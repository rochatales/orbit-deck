# Plano de implantação — Explorador astronauta e EDEN androide

Pedido do autor em 31/10/2026. Plano do Claude: nada foi implementado nem copiado para o jogo.
Itens do plano oficial atendidos: **S6.8** (pipeline do elenco ativo), **S6.11** (clipes e tronco
separado para andar atirando), **S6.4** (animações), **S6.2** (arma com pivôs padronizados),
**S6.19a** (Sala da EDEN) e **S7.5/S7.7** (assets arquivados fora da distribuição). O DASH não tem
item no plano: precisa de número novo aprovado pelo autor (proposta: S2.13 ou S3.x de combate).

Vistas dos modelos: `docs/sprint-6/referencias-personagens-2026-10-31/` (frente, lado, costas, 3/4).

## 1. O que chegou

Fonte: `~/Game Development/Horda Survivor/Personagens/3D/`, cada modelo em GLB, FBX, STL e ZIP (OBJ + texturas).

| | Explorador (Orange Lowpoly Astronaut) | EDEN (Futuristic Android Character) |
|---|---|---|
| Malha | 1 malha, **10.000 triângulos**, 7.531 vértices | 1 malha, **10.000 triângulos**, 8.319 vértices |
| Rig / animações | **nenhum** | **nenhum** |
| Material | 1 material, cor + normal 2048² PNG (~7 MB) | 1 material, cor + normal PNG (~8 MB) |
| Tamanho exportado | normalizado a ~0,96 m de altura | normalizado a ~1,0 m de altura |
| Pose | **A-pose**, braços abertos ~35° | braços **colados ao corpo** |
| Proporção | *chibi*: capacete ≈ 1/3 da altura, braços e pernas curtos, mochila | esguia, adulta, saias laterais rígidas, visor com rosto emissivo |

Comparação com o que roda hoje:

| | Hoje | Novo |
|---|---|---|
| Jogador | `explorador-r7.glb`: 29.816 tris, rig Mixamo de 41 ossos, Idle/Run/Backward/Talk/Fall, 6,2 MB | 10.000 tris, sem rig |
| EDEN | `brand-brain.glb`: **292.070 tris**, estático, 20 MB, escala 1,3 | 10.000 tris, sem rig |

Os dois novos são muito mais leves. A troca da EDEN sozinha tira ~282 mil triângulos da colônia.

## 2. Resposta direta: versão de combate

**Recomendação: não modele um segundo personagem. Modele só as armas** (e, se quiser diferença visual,
acessórios de combate soltos). Eu faço o encaixe no Blender, arma por arma.

Por quê:
- **Um corpo, um rig, um conjunto de clipes.** Idle, Run, Backward, DASH e os clipes de mira valem para
  a colônia e para o combate. Dois modelos gerados separadamente nunca saem com a mesma proporção:
  seriam dois rigs, dois pesos de pele, cada clipe conferido duas vezes.
- **A diferença colônia × combate já existe no jogo**: o rifle só aparece em Shanghai (`combat` no
  `Player.tsx`). A versão de combate passa a ser "mesmo corpo + arma no osso da mão + clipes de mira".
- **Acessórios opcionais** (ombreiras, cinto de munição, lanterna no capacete): peças separadas,
  modeladas sobre o corpo em A-pose, presas a um osso (Spine2, Hips) e ligadas só nos mapas de combate.
  Custa uma fração de um personagem novo.

Se ainda assim quiser um corpo de combate completo, ele precisa sair **na mesma A-pose, mesmas
proporções e mesmo tamanho de capacete**, para usar o mesmo esqueleto. Só vale se o visual mudar muito.

### O que eu preciso de você para as armas

1. Uma arma por arquivo (GLB ou FBX), **em escala real** (um rifle tem ~0,9–1,0 m), origem em qualquer lugar.
2. A lista dos tipos e como cada um é segurado: rifle (duas mãos), pistola (uma ou duas), escopeta, pesada etc.
   Hoje o jogo só tem o rifle, ainda como caixa provisória.
3. Lembrete de escala: o explorador tem **1,5 m** no jogo, com braços curtos. Armas longas vão parecer
   maiores do que num humano adulto. Se a arma for estilizada no mesmo *chibi*, o encaixe fica natural.

O que eu entrego no Blender, por arma:
- Vazios padronizados: `Grip_R` (empunhadura, vai para o osso RightHand), `Grip_L` (mão de apoio), `Muzzle` (boca do cano).
- Pose de mira do braço por tipo de arma (rifle, pistola, pesada), testada contra o corpo, sem atravessar capacete nem mochila.
- Renders de frente, lado e câmera do jogo.

Regra preservada: **o tiro continua saindo da simulação a 0,85 m da rua** (retícula 0,86). O `Muzzle`
é só visual (clarão e começo do traçador); se a pose deixar o cano visual longe de 0,85 m, a pose é
ajustada, não a regra de tiro.

## 3. Princípios da troca (sem fricção)

- **Contratos intactos:** cápsula de raio 0,32 m e altura 1,25 m, altura visual 1,5 m, controles da
  regra 4 do `AGENTS.md`, tiro a 0,85 m, velocidades 4,2 / 1,2 m/s. A troca é **só visual**.
- **Mesmo esqueleto do jogo:** rig Mixamo de 41 ossos com os mesmos nomes (`mixamorig:*`) e clipes com
  os mesmos nomes (`Idle`, `Run`, `Backward`, `Talk`, `Fall`). O código de locomoção não muda.
- **Troca reversível:** o novo personagem entra como variante, como a r7 entrou
  (`?personagem=…`), comparável no mesmo ponto, câmera e luz. Só vira padrão depois do seu aceite.
- **Paradas A antes de runtime**, como no Hangar e no Quartel: medidas, renders e lista de clipes primeiro.
- **Fontes preservadas** em `art-source/personagens/…`, com SHA-256; nada apagado (regra 6).

## 4. Fases

### F0 · Ingestão (Codex, ~1 tarefa curta)
- Copiar as fontes para `art-source/personagens/explorador-astronauta/` e `art-source/personagens/eden-androide/`
  (`fontes/` com GLB, FBX, OBJ e texturas; `notas/` com SHA-256).
- Preparar no Blender: origem nos pés, frente para +Z do jogo, escala real (explorador **1,5 m**; EDEN a definir, ver F4).
- Texturas: reduzir para **1024²** (cor) e **1024²** (normal) e medir a diferença na câmera do jogo; manter 2048² só se a diferença aparecer.
  Alvo: cada GLB final com rig e clipes **≤ 3 MB**.

### F1 · Rig e clipes do explorador (Parada A obrigatória)
- Auto-rig no Mixamo pela A-pose (já está certa). Conferir no Blender: capacete preso ao `Head`,
  mochila ao `Spine2` (rígida, sem dobrar), luvas com dedos mínimos (polegar + indicador, como hoje).
- Clipes da colônia: `Idle`, `Run`, `Backward`, `Talk`, `Fall`, todos *in place*.
- **Lição do r7:** o Run atual foi feito para 1,6 m/s e roda a 4,2 m/s (~54% de pé deslizando).
  Escolher um clipe de corrida rápida e calibrar a taxa pela passada real do novo corpo, que é mais curto.
- Clipes de combate (S6.11): tronco separado das pernas, para andar atirando:
  `Aim_Rifle` (tronco), `Reload_Rifle`, `Hit`, `Death`; pernas reaproveitam Run/Backward.
- Entrega da Parada A: renders das poses extremas (corrida, recuo, mira, queda), tabela de clipes
  com duração e passada, tamanho do GLB. **Sem runtime.**

### F2 · Armas (eu no Blender, depois Codex no runtime)
- Você entrega as armas (seção 2). Eu monto `art-source/armas/encaixe_armas.blend` com o explorador
  riggado, uma coleção por arma, os vazios `Grip_R`/`Grip_L`/`Muzzle` e a pose de mira por tipo.
- Exporto um GLB por arma (`arma-rifle.glb`…), com os vazios, mais um `manifest` com offsets.
- Runtime (Codex): a arma vira filha do osso `RightHand` pelo `Grip_R`; troca de arma só troca o GLB.
  A caixa provisória do rifle sai. Testes: o `Muzzle` acompanha a mão sem alocar por quadro, e o tiro
  segue a 0,85 m.

### F3 · DASH (precisa das suas decisões antes)
Mecânica nova: muda o contrato de controles da regra 4, então só entra com sua definição.

| Decisão | Sugestão para começar |
|---|---|
| Tecla | **Espaço** (Shift fica livre para correr no futuro) |
| Onde vale | **Só em combate**; na colônia, não |
| Direção | Para onde o corpo anda: com W, rumo ao cursor; com S, para trás; parado, rumo ao cursor |
| Distância e duração | **3,5 m em 0,22 s** |
| Recarga | **1,2 s**, indicada na HUD |
| Invulnerabilidade | **Nenhuma** no começo; avaliar 0,15 s depois de jogar |
| Contra a aranha | Serve para sair da faixa da investida; não atravessa inimigos |
| Durante o dash | Não atira nem recarrega; recarga em andamento continua |
| Paredes | Para na parede, sem atravessar (mesmo controller do Rapier) |

- Rig: clipe `Dash` *in place* (impulso ou rolamento curto), ~0,3 s, no mesmo esqueleto. Como o corpo
  é único (seção 2), o Dash vale para o explorador com ou sem arma.
- Simulação: o deslocamento é do controller, não do clipe; sem alocação no passo; pausa congela o dash.
- Testes: distância, recarga, parede, pausa no meio, dash contra investida, W+S neutros.

### F4 · Substituição da EDEN
- **Pose:** os braços colados ao corpo atrapalham o auto-rig. Abrir os braços para A-pose no Blender
  antes do Mixamo (ou rig manual).
- **Saias laterais:** o Mixamo não cria ossos para elas. Pesar cada painel 100% no osso da coxa do
  mesmo lado com um pouco de `Hips`, ou deixar rígidas no `Hips`. Conferir num passo largo.
- **Animação mínima:** `Idle` (respiração e flutuação leve), `Talk` (gesto curto), `Point` (aponta o
  mapa ou o deck). Ela fica no centro de controle, não caminha; isso cabe num rig simples.
- **Rosto no visor:** o sorriso emissivo pode ganhar expressões depois, trocando a textura do visor.
  Não faz parte desta troca.
- **Altura:** hoje a EDEN é desenhada com escala 1,3 sobre um pedestal. Sugestão: **1,8 m** (o explorador
  tem 1,5 m), sobre um pedestal holográfico de 0,15 m.
- Runtime: trocar `EDEN_CHARACTER_ASSET` (`brand-brain.glb`) pelo novo GLB, com `materialProfile: 'preservar'`.
  Falas, interação E e posição continuam iguais. Entra junto com a nova sala (F5) ou antes, na sala atual.

### F5 · Estudo do novo Centro de Controle (Parada A, sem runtime)
Sala atual: **"EDEN · Centro de controle"**, id `brand-brain`, centro (0; −10,5), **7 × 6,5 m**,
portas sul (praça) e leste (conector para o Laboratório). Vizinhos e limites:

- **Norte:** o limite do mapa de Marte está em z = −15; sobra **1,25 m** atrás da sala.
- **Leste:** conector EDEN–Laboratório (x 3,5 a 6,5) e o Laboratório a partir de x = 6,5.
- **Sul:** conector norte e a praça (circulação aberta em z ≈ −5,6).
- **Oeste:** campo solar centrado em (−14,5; −10,5); o espaço entre ele e a sala precisa ser medido.

Programa da sala:
- EDEN sobre pedestal ao fundo.
- Mesa holográfica com o mapa da missão.
- 3 a 4 consoles em arco.
- Portas de **1,8 m**, como as do quartel.
- Ponto de conversa com E a até 1,8 m da EDEN.
- Circulação livre de 1,4 m.

Tamanho-alvo: **~10 × 8 m**, perto do quartel (10,5 × 9). Opções que o Codex deve medir e desenhar em planta:

| Opção | Como | Custo |
|---|---|---|
| A · Crescer para oeste | Centro vai para x ≈ −1,5; ocupa parte do espaço até o campo solar | Pode exigir afastar o campo solar; mantém as portas sul e leste |
| B · Crescer para norte | Estende o limite do mapa (z −15 → ~−18) e o chão | Mexe nos limites de Marte e na câmera; mais espaço livre |
| C · Mesmo tamanho | Só refaz o interior para caber a EDEN e a mesa | Sem obra no mapa; sala apertada |

Como no Hangar e no Quartel: entregar planta com a sala antiga tracejada, vizinhos, rotas e medidas,
mais renders de bloqueio com a EDEN nova na escala certa. Isto **é** a S6.19a (prova de estilo na Sala
da EDEN): o estudo deve seguir o [plano de atmosfera 2,5D](PLANO_ATMOSFERA_2_5D.md).

### F6 · Limpeza dos 3D obsoletos (com sua aprovação, item por item)
Regra 6: nada é apagado. O que sai do jogo vai para `archive/` com `git mv`, no mesmo padrão do MCP
Office, e deixa de ser importado. Arquivos não rastreados seus não são tocados.

| Item | Tamanho | Situação | Ação proposta | Quando |
|---|---|---|---|---|
| `blender/fbx_for_mixamo/` (brand-brain, designer, editorial, narration, player, social-media) | ~134 MB | MCP Office / primeiro player | `archive/personagens-legado/` | Já |
| `blender/rigged/` (narration-*, player-rigged-*, player.fbx) | ~280 MB | MCP Office / primeiro player | `archive/personagens-legado/` | Já |
| `blender/scripts/__pycache__/` | — | Cache rastreado por engano | Tirar do Git e pôr no `.gitignore` | Já |
| `player-main-transformed.glb`, `social-media-transformed.glb` (raiz) | 3,4 MB | Sobras de otimização | `archive/personagens-legado/` | Já |
| `src/assets/characters/player/player-main.glb` | 29 MB, 290 mil tris | Só para comparação (`?personagem=atual`) | Arquivar; a comparação passa a ser r7 × novo | Depois do aceite do novo explorador |
| `src/assets/characters/player/explorador-r7.glb` | 6,2 MB | Jogador atual | Arquivar | Depois do aceite do novo explorador |
| `src/assets/characters/npcs/brand-brain.glb` | 20 MB, 292 mil tris | EDEN atual | Arquivar | Depois do aceite da nova EDEN |

Liberação total prevista: **~470 MB** fora do runtime e da distribuição (S7.5). `archive/` não
entra no build, mas continua no histórico do Git. Encolher o repositório de verdade exigiria reescrever
o histórico, o que é proibido; fica fora deste plano.

## 5. Ordem e quem faz

| # | Tarefa | Quem | Depende de | Parada |
|---|---|---|---|---|
| 1 | Decisões abaixo | Autor | — | — |
| 2 | F0 ingestão + F1 rig do explorador | Codex (`rochatales/s6.8-explorador-astronauta`) | Fechamento da Sprint 2 | Parada A: renders e clipes |
| 3 | Armas modeladas | Autor | Lista de tipos | — |
| 4 | F2 encaixe das armas no Blender | Claude (`claude/s6.2-encaixe-armas`) | 2 (rig) e 3 | Renders por arma |
| 5 | Runtime do explorador + armas | Codex | 2 e 4 | Aceite do autor |
| 6 | F3 DASH | Codex | 5 e decisões do DASH | Aceite do autor |
| 7 | F4 rig da EDEN | Codex (`rochatales/s6.8-eden-androide`) | — (paralelo ao 2) | Parada A |
| 8 | F5 estudo do centro de controle | Codex (`rochatales/s6.19a-centro-controle`) | 7, para a escala | Parada A: planta |
| 9 | F6 limpeza, primeira leva | Codex (`rochatales/s7.5-limpeza-3d`) | Sua aprovação da tabela | Revisão do Claude |
| 10 | F6 limpeza, segunda leva | Codex | Aceites 5 e 7 | Revisão do Claude |

Os itens 2 e 7 (pipeline e rigs) podem correr juntos: não tocam os mesmos arquivos. Os itens 5, 6 e 8
mexem em código do jogador e da colônia; entram um por vez, sobre a base consolidada.

Base: a ponta consolidada depois do fechamento da Sprint 2 (hoje `f1d53f1`, do Quartel). Nenhuma tarefa
desta lista deve começar antes do aceite 6.5/S2.9, para não misturar personagem novo com o teste de fechamento.

## 6. Decisões que preciso de você

1. **Versão de combate:** só armas (recomendado), armas + acessórios, ou corpo de combate completo?
2. **Armas:** quais tipos e como cada um é segurado.
3. **DASH:** confirmar ou ajustar a tabela da F3 e aprovar um número de item no plano.
4. **EDEN:** altura (sugestão 1,8 m) e se ela flutua ou fica de pé no pedestal.
5. **Centro de controle:** opção A, B ou C para o Codex aprofundar, ou deixar o Codex medir as três.
6. **Limpeza:** aprovar a primeira leva da tabela F6.
7. **Texturas:** aceitar 1024² se a diferença não aparecer na câmera do jogo.
