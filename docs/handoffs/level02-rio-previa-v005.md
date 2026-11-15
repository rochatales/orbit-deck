# Level 02 Rio · prévia local da arte v005

Base `e76ff63`, branch `rochatales/level02-rio-morros`. O endereço anterior abria o menu normal, e o mundo do Rio ainda montava a geometria de blockout.

Acesse [Rio v005](http://127.0.0.1:5178/?rio-v005) e escolha **Explorar Rio v005**. O botão entra no desembarque, em Desenvolvimento, com o perfil local ou um perfil temporário se não houver um salvo. A prévia só está disponível no Vite em modo desenvolvimento.

A rota monta `rio-fase01.glb` e `rio-limites-v003.glb` com a água animada e o fundo raso do jogo. Os materiais de praia e mar estáticos dos GLBs saem da montagem para evitar sobreposição. O terreno e os colisores vêm da planta.

Verificação no navegador do Codex: o botão levou ao desembarque, com fachadas, destroços, praia e espuma visíveis. O teste de entrada direta confirma a posição inicial e a preservação dos saves. O aceite visual e de jogabilidade segue com o autor.

A suíte completa passou com 678 testes. `npm run build` e `git diff --check` passaram.

Para reabrir o servidor a partir da worktree:

```sh
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

## Correção de render da praia

A faixa estática `RIO_mapa_21_areia` do GLB abrangia X = 15 a 36 e Z = −54 a 54, com o topo em Y = 0. Ela ocupava o mesmo espaço da malha contínua de praia do jogo, causando a alternância entre as duas superfícies. A prévia agora remove esse lote ao montar a cena. O material compartilhado pelas dunas, pelos canteiros e pelos depósitos de areia continua em uso nesses detalhes.

A praia contínua ganhou variações de tom, marcas de vento, grão com filtragem pela escala em tela e recepção das sombras do cenário. O escurecimento começa antes da onda e persiste depois do recuo. A lâmina rasa começa translúcida e a espuma se divide em trechos irregulares. O ajuste atua no render em tempo real, sobre a mesma planta e o mesmo fundo físico.

A praia foi conferida no navegador ao girar a câmera com Q. Passaram os 679 testes, o build e `git diff --check`. O teste novo verifica que a faixa estática sai da cena enquanto as malhas de areia do píer e da praça e o material compartilhado permanecem. Para revisão, entre em **Explorar Rio v005**, gire a câmera com Q ou C e acompanhe o avanço e recuo da água perto do desembarque. O aceite artístico segue com o autor.

## ARES na areia e estado do level

A ARES oficial (`src/assets/ares-lander/ares-lander.glb`) aparece no ponto existente, em (25,72; 0,012; 47,52) m. A escada permanece alinhada ao desembarque em (25; 0; 43,5) m. Tanto a entrada comum pelo modo Desenvolvimento quanto o atalho da arte v005 usam a nave. Os colisores continuam sendo os volumes simples da ARES. A placa de concreto e suas marcas saem da prévia na montagem, e a área fica coberta pelo material contínuo da praia. No blockout, essas superfícies provisórias também saem da montagem.

As quatro sapatas deixam marcas discretas e os propulsores varrem a areia. Na primeira vista jogável de cada chegada, uma rajada de poeira baixa se espalha e dissipa em até 4,2 segundos, em uma chamada de desenho. A pausa congela o efeito. A nave já está assentada quando o jogador desembarca. Os efeitos de impacto no asfalto do asset original ficam ocultos.

A ARES foi conferida no navegador sobre a praia. Os 681 testes, o build e o diff-check passaram. Os testes abrem o GLB oficial, verificam a altura, a reserva e o acesso à escada, cobrem a remoção seletiva do piso e verificam quando a poeira inicia, pausa e termina. Para avaliar, recarregue a [prévia local](http://127.0.0.1:5178/?rio-v005), entre por **Explorar Rio v005**, observe os primeiros segundos e confira o embarque com E.

| Parte do Rio | Estado nesta branch |
|---|---|
| Exploração e combate | Jogáveis em Desenvolvimento, com patrulhas de teste, quatro hordas, suprimentos e retorno a Marte. |
| Arte, píer e orla | Cenário refinado na prévia v005, incluindo morros, praia, píer quebrado, água animada e caminhada no raso. |
| Chegada | ARES oficial sobre a areia, com poeira e marcas locais. Aceite visual em aberto. |
| Campanha | Rio ainda não é destino da campanha. Extração condicionada a mapa limpo, tela própria de conclusão e retorno após derrota ainda exigem adaptação ao Rio. |
| Próximas entregas | Aceite do autor, uso da arte refinada na entrada padrão e definição dos encontros e da mídia de cabine próprios do Rio. |

As pendências de campanha estão detalhadas no [handoff da consolidação](level02-rio-base-consolidada-2026-11-15.md).

## Iluminação de fim de tarde e passos na areia

O foco frontal e seu mapa de sombras saíram do Rio. A intensidade hemisférica passou de 1,55 para 1,27, e a do sol, de 2,15 para 1,85. O sol ficou mais baixo e quente. A direção e a cor também são usadas para sombrear a praia, a água e o relevo visual das pegadas.

Praia, dunas, areia sobre o calçadão e interior dos canteiros passam a usar o mesmo material em escala de mundo. A umidade altera o tom e o brilho perto da água. A aplicação ocorre na montagem do jogo.

O movimento em solo arenoso tem uma transferência de peso mais marcada, com leve inclinação, balanço e compressão visual do corpo sincronizados com o ciclo dos pés. A poeira usa os contatos já amostrados após a animação. A areia seca gera uma nuvem bege maior; a úmida levanta menos poeira e guarda marcas de sola mais fortes. As pegadas têm cavidade e borda sombreadas, ficam na posição de contato e somem gradualmente em até 36 segundos. A areia da praia e dos canteiros recebe as marcas; o calçadão e os taboados usam o comportamento de piso firme. Na faixa coberta, o contato em água continua responsável pelos respingos.

Verificação no navegador: luz quente sem feixe frontal, areia com grão consistente e trilha de pegadas ao andar perto da ARES. A primeira tentativa revelou um erro ao descartar o lote de pegadas. O lote foi ajustado e o reinício passou no navegador. Para avaliar, retome com **Esc**, caminhe na areia e aproxime a câmera com **+** para ler melhor o relevo. O aceite visual e de jogabilidade é do autor.

Validação final: 684 testes, build e `git diff --check` passaram. Os testes cobrem o enquadramento das marcas na areia, a diferença entre areia seca e úmida, a pausa, a duração das pegadas e o material compartilhado entre praia e canteiros no blockout.
