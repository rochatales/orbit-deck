# Level 02 Rio · prévia local da arte v005

Base `e76ff63`, branch `rochatales/level02-rio-morros`. O endereço anterior abria o menu normal, e o mundo do Rio ainda montava a geometria de blockout.

Acesse [Rio v005](http://127.0.0.1:5178/?rio-v005) e escolha **Explorar Rio v005**. O botão entra no desembarque, em Desenvolvimento, com o perfil local ou um perfil temporário se não houver um salvo. A prévia só está disponível no Vite em modo desenvolvimento.

A rota monta `rio-fase01.glb` e `rio-limites-v003.glb` com a água animada e o fundo raso do jogo. Os materiais de praia e mar estáticos dos GLBs saem da montagem para evitar sobreposição. O terreno e os colisores vêm da planta. A nave no pouso ainda usa o modelo provisório.

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
