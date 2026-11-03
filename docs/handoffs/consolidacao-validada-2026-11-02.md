# Consolidação da versão validada — 02/11/2026

O autor aprovou no jogo a ponta **`f8655f10a968e0a2f2988d7241a2bab2a0b40860`**
(“Está ótimo assim”) e pediu consolidar todas as alterações aprovadas, com merge
e push, conforme o fluxo combinado neste chat. Esta autorização específica rege
a integração; nenhuma entrega futura foi iniciada.

## Linhas reunidas

- Base de integração local: **`b54162c359ad539db34e25f6bc61c6184a87e58a`**,
  branch `rochatales/horda-survivor`, nove commits documentais após `720527d`.
- Linha completa aprovada: `rochatales/s6.8-explorador-astronauta` em **`f8655f1`**.
- Branch/worktree isolada: `rochatales/consolidacao-validada-2026-11-02`, criada
  sobre `b54162c`, em
  `/Users/rochatales/.codex/worktrees/consolidacao-validada-2026-11-02/game-workplace`.
- Merge autorizado por `git merge --no-ff --no-commit f8655f1`; único conflito em
  `docs/SPRINT_STATUS.md`. Preservados os registros dos dois lados, atualizando
  o resumo atual, as referências de base e os aceites. Sem rebase/cherry-pick,
  squash, limpeza, sobrescrita de arte ou remoção de worktrees.

**A árvore integrada fora de `docs/` é idêntica à versão aprovada `f8655f1`.**
A consolidação só acrescenta/atualiza documentação e mantém ambos os históricos.
As dependências já instaladas da linha aprovada foram reutilizadas por symlink;
`pnpm-lock.yaml`, versões de bibliotecas e arquivos de runtime são os mesmos.

Merge concluído: **`8a04be81cd7c43278367be1d79690819bc48788c`**, com pais
`b54162c` e `f8655f1`. Os registros posteriores são documentais.

## Escopo aprovado neste bate-bola

- Astronauta padrão, rifle laser, PBR corrigido e alternativas reversíveis r7/atual.
  Export v009 com clipes autorados, corrida armada sem degrau e física preservada.
- Colônia: Breathing_Idle / Standard_Run / Walking_Backwards, rifle na cintura,
  sem Dash. Shanghai: corrida Rifle _Run_final, mira/recarga e Dash por Espaço.
- Mochila equipada, neon suave com listras legíveis, posição/rotação/apoio
  refinados e aproximação final de 2 cm em `4236ab4`.
- Colônia v007 com estufa, Quartel, Laboratório, Hangar e Control Room acabados;
  EDEN usa somente a projeção do pedestal; Sandwind e iluminação da linha atual.
- Suavização de transições/sombras e investigação da vibração. O preview aprovado
  usa **`?interp=1`**; a interpolação **continua opcional**, sem mudança do padrão
  previamente decidido. Passo físico continua fixo.
- Cursor com quatro chevrons, abertura/fechamento por captura sob o inimigo,
  cor âmbar e continuidade durante Dash (`46b6105`, `8bb4b9e`).
- Barras de vida para os quatro tipos e marcador vermelho sobre a vítima
  (`15690f8`); foco do rifle com alcance **26 m**, intensidade 80 (`f8655f1`).
- A linha também conserva as entregas anteriores já aprovadas: combate S2.12,
  recursos, quatro tipos, investida da aranha de 280 HP, recuperação de grupo,
  áudio e hordas **13/26/32/44**, total **115**.

O aceite é **do autor**. Não foi feita nova conferência no jogo pelo agente.
Os escopos completos dos itens futuros e medições específicas da S2.9 continuam
pendentes; não são encerrados por este aceite da composição atual. Não houve
nova revisão externa do conjunto atribuída ao Claude nesta consolidação.

## Verificação

**396/396 testes**, build e diff-check verdes na worktree integrada; somente o
aviso preexistente de chunk no build.
Comandos principais: `npm test`, `npm run build`, `git diff --check`,
`git diff --check 96d8ea5 HEAD` e comparação da árvore integrada com `f8655f1`
para confirmar que somente a documentação mudou.

O diff completo contra `b54162c` revelou sete linhas de contexto vazias de um
patch histórico (`candidato-nao-aplicado.patch`), cujo espaço inicial é parte
obrigatória do formato. O patch foi preservado byte a byte; uma regra local de
atributos desliga apenas `blank-at-eol` para esse arquivo, mantendo o check do
restante do repositório. Não se alterou conteúdo de código ou arte.

## Publicação e referência futura

Destinos autorizados em `origin` (`git@github.com:rochatales/orbit-deck.git`):

- `rochatales/s6.8-explorador-astronauta`: ponta aprovada `f8655f1`.
- `rochatales/consolidacao-validada-2026-11-02`: merge desta consolidação.
- **`rochatales/horda-survivor`**: mesma ponta consolidada, integração publicada.

A primeira tentativa de enviar o histórico inteiro caiu por conexão SSH
(“Broken pipe”), sem criar refs no remoto. A retomada usa checkpoints históricos
por fast-forward apenas na branch de consolidação; depois publica as três refs
finais por push atômico. Sem force e sem reescrita; `main` não é alterada. Para nova tarefa:

```bash
git fetch origin
git rev-parse origin/rochatales/horda-survivor
```

Fixar o SHA retornado como base. O checkout principal continua em `b54162c`,
com alterações locais/rastreio parcial e espelhos de arte do autor. Não foi
editado nem avançado: seus arquivos sem rastreio poderiam bloquear um checkout
ou ser sobrescritos. A branch local `rochatales/horda-survivor` permanece nessa
base antiga **deliberadamente**, e não deve ser usada como base nova enquanto
o autor não decidir como reconciliar esse checkout. A cópia consolidada está
na worktree isolada e na integração remota acima.

A prévia existente na porta **4186** continua servindo exatamente o runtime
aprovado `f8655f1`; esta consolidação não muda o comportamento do jogo.

## Fluxo para os próximos ajustes

Implementar, rodar checks técnicos e entregar URL do servidor. **O autor testa
no jogo** e devolve os ajustes/aceite; o agente não faz QA visual. Consolidação,
merge e push somente quando o autor pedir, como nesta entrega.
