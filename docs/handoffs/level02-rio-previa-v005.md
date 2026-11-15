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
