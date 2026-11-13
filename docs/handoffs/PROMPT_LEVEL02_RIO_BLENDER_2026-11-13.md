# EXODEN · Level 02 · Rio de Janeiro · arte no Blender · 13/11/2026

> Prompt para o agente de arte (Blender 5.1.1 por script e pelo conector do
> Blender). Autor: Tales Rocha. Papel: **construir o cenário do Rio no Blender a
> partir da planta e exportar o GLB**. Aceite visual: só o autor.

## 1. Antes de começar

1. Valem `AGENTS.md` e as regras dos prompts anteriores: sem merge, sem push,
   sem editar plano e quadro, textos em pt-BR.
2. Base: **`claude/level02-rio-blender`**, no commit que contém este prompt. Ela
   parte do blockout jogável do Codex (`rochatales/level02-rio-blockout`,
   `99fa57f`), aprovado pelo autor na prévia.
3. Trabalhe nessa branch ou numa branch filha em worktree própria.
4. Leia antes de mexer:
   - `docs/level-02/BRIEF.md`: decisões do autor e leitura das referências;
   - `docs/handoffs/level02-rio-blockout.md`: o que o blockout entrega e o que
     é provisório;
   - `art-source/rio-fase01/referencias/`: as duas imagens e o croqui do autor.
5. Regras do autor para arte:
   - gerar as imagens em disco e **listar os caminhos**; não anexar renders a
     cada etapa;
   - não apagar nem mover fontes, backups ou arquivos fora do Git;
   - nada vai ao runtime sem pedido do autor.

## 2. O que já existe

- **Planta v0** em `art-source/rio-fase01/export/layout.json`, gerada por
  `scripts/layout.py`. É a fonte única de posições e medidas: faixas (`bands`),
  peças (`parts`), prédios (`buildings`), colisores (`obstacles`), limites
  (`limits`) e deck de pouso.
- **Blockout jogável** em `src/game/rio/`. O visual atual vem de
  `buildRioVisual` (`visual.ts`), chamado em `world.ts`: caixas e cores sólidas.
  A colisão vem só dos dados e **não muda nesta fase**.
- **Modelo de pipeline:** Shanghai. Ver `art-source/shanghai-fase01/scripts/`
  (`build_blender.py`, `textures.py`, `audit_view.py`) e
  `art-source/shanghai-limites/scripts/`. O jogo carrega os GLBs em
  `src/game/shanghai/visual.ts` (`loadPhase01Visual`).
- **Orçamento de referência (Shanghai):** mapa com 55.042 triângulos, 115
  malhas, 15 materiais e 11,1 MB; limites com 28.838 triângulos e 1,5 MB.

## 3. Direção de arte

Orla do Rio em ruínas, tomada pela areia e pela vegetação, em fim de tarde
quente. Estilo low-poly facetado do jogo, lido de longe pela câmera isométrica.

- **Calçadão:** pedras portuguesas em ondas pretas e brancas. É a assinatura do
  level e precisa ler bem na câmera do jogo. Trechos quebrados e cobertos de areia.
- **Prédios:** residenciais dos anos 1940–60, brancos e bege. Varandas,
  cobogós, marquises, térreo comercial com toldos, caixas-d'água no topo.
  Manchas de ferrugem e vegetação nas lajes. Alturas da planta: 6 a 8
  pavimentos na orla e 9 ou 10 no fundo, a 3,3 m por pavimento.
- **Avenida:** asfalto rachado, faixas apagadas, dunas invadindo a pista.
- **Praças do canteiro:** meio-fio, palmeiras, mato alto e areia.
- **Quiosques:** circulares, com deck e escada em espiral, como na referência 1.
- **Praia:** areia com ondulação suave, destroços, postos de salva-vidas de madeira.
- **Mar:** superfície com faixa de espuma na linha d'água.
- **Limites:** morros de granito com mata a oeste e fechando a ponta norte;
  prédios desabados e avenida destruída ao sul.
- **Adereços:** ônibus e carros enferrujados, postes tortos, entulho.

Sem contornos nem pontilhados luminosos nas fachadas: o autor mandou remover
isso dos prédios do jogo. Nenhuma emissão no exterior.

## 4. O que entregar

### 4.1 Construção por script

- `art-source/rio-fase01/scripts/build_blender.py`: lê `export/layout.json` e
  monta a cena. Rodar de novo regenera tudo. Nada posicionado à mão que o script
  não saiba refazer.
- Coleções no molde de Shanghai: kit editável por módulo, exportação por setor
  e material, e colisores e marcadores só de conferência.
- Unidades em metros, escala 1, eixos do jogo (X/Z no plano, Y para cima no GLB).
- `blend/rio_fase01_v001.blend` salvo pelo script.

### 4.2 Kit modular

Peças reutilizadas por instância, para caber no orçamento:

- módulo de fachada da orla (térreo, pavimento-tipo, cobertura) e variações;
- calçadão em ondas (módulo que repete sem emenda visível);
- quiosque, posto de salva-vidas, palmeira, duna, banco, poste;
- ônibus e carro enferrujados;
- rochas e trechos de morro; blocos de escombro.

### 4.3 Texturas

- Atlas por família de material, como em Shanghai. O padrão das ondas do
  calçadão pode ser textura própria, com repetição.
- Sem mipmaps misturando blocos de cores diferentes nas bordas: esse defeito já
  apareceu nos atlas antigos.
- Registrar tamanho e origem de cada textura. Texturas geradas por script ficam
  em `texturas/`.

### 4.4 Exportação

- `export/rio-fase01.glb` (mapa) e `export/rio-limites-v001.glb` (morros, mar e
  escombros), separados como em Shanghai.
- Meta de orçamento: ficar na faixa de Shanghai. Se passar, registrar quanto e
  por quê antes de seguir.
- A malha **nunca** é colisor. Nenhum nó de colisão entra no GLB do jogo.

### 4.5 Conferência contra a planta

- Script de auditoria (`audit_view.py` de Shanghai como molde): cada prédio,
  quiosque, praça, faixa e o deck dentro da tolerância da planta (proposta:
  5 cm). O deck e a reserva de pouso ficam livres de malha acima do piso.
- Nenhuma peça atravessa a linha d'água de colisão (X = 36) de modo a parecer
  caminhável, e nenhuma invade ruas e travessas.
- Resultado em `notas/rio-fase01-v001.json`: triângulos, malhas, materiais,
  tamanho dos arquivos, SHA-256 e desvios da planta.

### 4.6 Renders de revisão

Em `renders/v001/`, só em disco:

- vista na câmera do jogo (ortográfica, azimute π/4, elevação de 35,26°), no
  mesmo enquadramento de `notas/planta-v0-camera.svg`;
- vista de cima;
- aproximações: calçadão, um prédio da orla, quiosque, praça, deck, morro,
  escombros e linha d'água.

Listar os caminhos no handoff.

## 5. Fora desta fase

- Trocar o blockout pelo GLB no jogo. É a etapa seguinte, com pedido do autor:
  `world.ts` passa a carregar o GLB no lugar de `buildRioVisual`, como
  `loadPhase01Visual` faz em Shanghai.
- Mudar a planta. Se a arte pedir ajuste de medida, registrar no handoff; a
  planta só muda pelo `layout.py`, com os testes de `tests/rio-layout.test.mjs`
  e a cópia do runtime atualizados juntos.
- Inimigos do Rio, luz final do jogo, áudio e mídia da cabine.
- Pilotis caminháveis e becos: seguem como decisão aberta do autor no brief.

## 6. Decisões que o autor ainda deve dar

1. Térreos fechados ou pilotis caminháveis nos prédios da orla.
2. Um prédio por quadra (como no croqui) ou dois com beco.
3. Largura do mar: 15 m hoje.
4. Altura final dos prédios, depois de ver o primeiro render na câmera do jogo.

Na falta de resposta, seguir a planta atual e deixar os módulos fáceis de trocar.

## 7. Critério de conclusão

- `build_blender.py` roda do zero no Blender 5.1.1 e reproduz o `.blend` e os GLBs.
- Auditoria contra a planta sem desvios acima da tolerância.
- `npm test`, `npm run build` e `git diff --check` verdes (nada em `src/` muda).
- Handoff em `docs/handoffs/level02-rio-blender.md` com base, arquivos, números
  do orçamento, caminhos dos renders, o que ficou provisório e um roteiro para o
  autor abrir o `.blend` e conferir.
- Parar ao fim e pedir o aceite visual do autor. O agente não aprova a arte.
