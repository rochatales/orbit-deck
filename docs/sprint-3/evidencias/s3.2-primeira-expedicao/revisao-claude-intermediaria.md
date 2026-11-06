# Confirmação das correções da S3.2 (`add20f2...HEAD`)

**Só R2 e R4 estão encerrados. R1, R3, R5 e R6 ainda têm defeito real**, embora os casos exatos que apontei tenham sido corrigidos. Os 16 testes dos dois arquivos passam, mas nenhum cobre estes quatro caminhos.

Confirmei tudo por rastreio de código, sem reproduzir no jogo, porque só `git diff` e aqueles testes estavam permitidos.

| Item | Situação |
|---|---|
| R1 quota elegível | **Aberto:** falso positivo por estado intermediário |
| R2 retry com Sistema | **Encerrado** |
| R3 retorno a Marte | Caso pedido corrigido; **aberto** por efeito colateral |
| R4 risco na cabine | **Encerrado** |
| R5 entrada e remetente | Remetente e cabine corrigidos; **aberto** depois do briefing |
| R6 hordas | Título e facão corrigidos; **aberto** no aviso |

## Achados remanescentes

**R1 (P2): retirar cobre novo conta o mesmo cobre duas vezes**
- **Onde:** `src/state/useCampaignStore.ts:75-76`, lido em `src/state/useExpeditionStore.ts:187` e `:206`
- **Causa:** `set({ withdrawnCargo })` notifica os assinantes antes de `update` gravar o novo `attemptDelivery`. Nesse instante, `sim.copper` já subiu e o `attemptDelivery` ainda é o antigo.
- **Reprodução:**
  1. Em `expedition-copper`, colete 2 cobres e guarde os 2 no porão.
  2. Retire os 2: a conta dá `2 - 0 + 2 = 4`.
  3. O rádio diz "Já temos cobre suficiente" com só 2 elegíveis, e `copperQuotaAnnounced` impede o aviso correto depois.
- **Origem:** esse defeito já existia em `add20f2`, e eu não o vi na primeira revisão, quando tratei a soma como constante. Os testes só cobrem depósito e retirada de cobre antigo.
- **Correção sugerida:** gravar `saved`, `saveError` e `withdrawnCargo` em um único `set`, com um teste de depositar e retirar.

**R3 (P3): a nova mensagem aparece fora de hora**
- **Onde:** `src/state/useExpeditionStore.ts:154`, exibido por `src/ui/RadioToast.tsx`
- **Em todo retorno:** o toast só aparece depois de desembarcar, então o jogador já em Marte lê "Desembarque para voltar à colônia".
- **Caso inverso:**
  1. Conclua a quota e volte a Marte, ficando em `eden-activation`.
  2. Sem desembarcar, decole para Shanghai e desembarque lá.
  3. Surge "Pousamos em Marte", porque a linha 159 só substitui a mensagem em `expedition-copper`.

**R5 (P3): a orientação continua após o briefing**
- **Onde:** `src/state/useExpeditionStore.ts:109-110`
- **Causa:** a condição usa `edenActive`, não a etapa, e nada troca a mensagem quando o briefing termina.
- **Reprodução:**
  1. Fale com o Engenheiro, recarregue a página e retome. Falar e abrir ESC sem recarregar mostra o mesmo.
  2. Abra ESC: aparece "Última transmissão · Engenheiro: Procure o Engenheiro na Oficina ou no Data Center."
  3. O objetivo já é `Cobre entregue: 0 / 4`, e o Engenheiro manda procurar a si mesmo.

**R6 (P3): o aviso oferece uma ação que a campanha não tem**
- **Onde:** `src/combat/CombatHud.tsx:50`
- **Causa:** o ramo de hordas reutiliza o texto dev "Sobreviva ou reinicie", mas a campanha não tem botão de reiniciar. O teste só confere o início da frase.
- **Reprodução:** em `eden-activation`, fique sem munição antes da última horda. Ao limpar as hordas, "Volte à nave ou repita" também vem do texto dev.

## Faixa do Engenheiro
Retiro minha ressalva sobre a faixa: ela fica no runtime por pedido do autor, e o aceite visual continua pendente com ele. Também não rodei o script colado, então `/tmp/s3-2-review-final.jsonl` não foi gerado, e nada foi editado.
