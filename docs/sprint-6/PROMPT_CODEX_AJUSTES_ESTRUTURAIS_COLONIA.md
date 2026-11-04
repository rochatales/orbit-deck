# Prompt para o Codex — S6.12: ajustes estruturais na colônia

```text
Tarefa: S6.12, ajustes estruturais de Laboratório, Meeting Room e Data Center, pedido do autor em 04/11/2026.
Só correções visuais: sem mudar implantação, portas, colisores, câmera, física, controles ou cabine da aeronave.

Base: claude/s6.12-oficina-colonia @ 23a8def (local, sem push; já traz a Oficina, as cascas e a ala leste).
Branch: rochatales/s6.12-ajustes-estruturais-colonia, worktree própria.
Leia antes: AGENTS.md, docs/handoffs/s6.12-oficina-colonia.md, art-source/predios-colonia-v001/README.md.
Referências do autor, com marcações em vermelho, em docs/sprint-6/referencias-ajustes-colonia/:
01-laboratorio.png, 02-meeting-room.png, 03-data-center.webp. Abra as três antes de começar.

Problemas pedidos

A. Laboratório, glitch (setas em 01-laboratorio.png)
   Pontos: circunferência da porta do sintetizador, os quatro cantos da faixa amarela e preta no chão e o
   canto alto da parede. É "aquele glitch que sempre acontece", segundo o autor.
   Pistas a confirmar, sem assumir:
   - MAT_Laboratorio_Atlas_2K não está na lista de src/scene/marsColony/buildingAtlasSampling.ts; os outros
     atlas têm mipmaps desligados exatamente por misturarem tiles nas arestas finas;
   - faces coplanares na faixa do chão e no anel do sintetizador (LaboratorySynthesizerMesh, em laboratorio-v002.glb).
   Reproduza antes de corrigir, ande e gire a câmera com Q/C, e registre a causa real no handoff.

B. Laboratório, haste que sobra quando a parede some (marcada com "x" em 01-laboratorio.png)
   Causa provável, introduzida pelo Claude: em art-source/predios-colonia-v001/scripts/casca_ala_leste.py, o friso
   `plan.layer(fixed, side, 0, .02, 3.5, 3.54, TRIM)` está em Casca_Fixa. Essa peça não acompanha a abertura das
   paredes (Building_Walls). A linha fina continua no ar quando o jogador entra.
   Correção esperada: mover o friso para Casca_Parede ou retirá-lo. Confira todos os lados, inclusive o canto marcado.

C. Meeting Room (02-meeting-room.png)
   Os quatro elementos do telhado marcados com "x" continuam visíveis com o jogador dentro. Devem sumir junto com o
   teto. Identifique onde estão. Pista: há peças na altura do teto fora de Building_Roof, por exemplo em Interior.

D. Data Center, placa legada (03-data-center.webp)
   Há uma placa antiga "DATA CENTER" colada ao lado da placa nova. Retire só a antiga. A placa padrão e a etiqueta
   DC ficam como estão.

E. Data Center, estrutura legada do telhado
   Ao entrar, com o teto ficando transparente, aparece uma estrutura antiga que some depois, fora de tempo. Retire
   esses elementos. Pista: há peças em Interior até 3,13 m, acima da parede. Investigue também se algo do
   masterplan v007 (sala `editorial`) sobra na cópia montada ou tem fade próprio.

Regras
- Fontes do autor em art-source/predios-colonia-v001/originais/ ficam intactas. Corrija pelos scripts derivados
  (padronizar.py, casca_ala_leste.py) e regenere as saídas. Rode manifesto.mjs só se a geometria dos COL mudar;
  os manifestos dos prédios aprovados devem continuar iguais.
- Depois de C, D e E, varra os cinco prédios novos e as cascas (Meeting Room, Data Center, Cafeteria, Oficina,
  Quartel, Laboratório): nada acima da parede pode ficar fora do teto, e nada pode ficar no ar com o teto aberto.
  Corrija só o que for desse mesmo problema; o resto vai como pendência no handoff.
- Não altere Hangar, Control Room nem a EDEN sem necessidade comprovada. tests/control-room-runtime.test.mjs protege
  o visual aprovado por hash.
- Não mexa em src/ui/ShipCockpit.tsx nem no fluxo de viagem: o autor está decidindo a tela de navegação.
- Sem alocação em useFrame. Colisão só por cuboides simples.

Entrega
- Teste automatizado que falhe na versão antiga para B, C, D e E: lendo o GLB montado, com Building_Roof oculto e
  paredes abertas, nenhuma peça fica acima do limite do prédio. Para A, teste a causa encontrada (exemplo:
  atlas do Laboratório sem mipmap).
- Renders em disco, não anexados, antes e depois de cada ponto.
- npm test, npm run build e git diff --check 23a8def HEAD verdes.
- Prévia local para o autor, com a porta informada no handoff.
- Handoff em docs/handoffs/s6.12-ajustes-estruturais-colonia.md: causa de cada ponto, arquivos, verificação e
  roteiro curto para o autor. Em especial: entrar e sair do Laboratório, da Meeting Room e do Data Center, olhando o
  telhado durante a transição.
Sem push, sem merge. Aceite visual é do autor.
```
