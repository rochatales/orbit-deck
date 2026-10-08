# Revisão de gameplay incorporada ao Horda Survivor

Data: 29/09/2026. Status: decisões de planejamento incorporadas; novos itens ainda não implementados.

Plano de execução e status de cada tarefa: [Sprints do protótipo Shanghai](HORDA_SURVIVOR_PLANO_SPRINTS_PROTOTIPO.md). Este documento explica a seleção; não cria outra numeração de sprints.

## Origem e limites

Fonte consultada: `docs/GAMEPLAY_REVIEW_SPRINTS.md`, revisão v1.0 de 29/09/2026, no worktree `claude/project-review-gameplay-improvements-1a5676`. A análise usa o commit `99ab0d7` e descreve o antigo MCP Office. O documento original foi mantido intacto no worktree de origem.

A autorização atual é incorporar ao planejamento o que melhora o novo jogo, preservando o piloto. Esta entrega altera apenas documentos. Execução futura deve manter o ciclo Marte → Shanghai → loot → retorno → primeira máquina, respeitando jogabilidade → estética → texturas. Não reabre sprints concluídos para reconstruir o produto anterior.

## Decisões incorporadas

| Tema da revisão | Decisão para o novo projeto | Tarefas |
| --- | --- | --- |
| Posição por frame / renders | Concluir migração dos consumidores ativos para dados mutáveis e medir o resultado. Não recriar consumidores MCP removidos | S2.9–S2.10 |
| Jitter de física/câmera | Experimento comparável com interpolação e passo fixo, adotado conforme evidência técnica e teste do autor | S2.11 |
| Sensação do movimento | Priorizar o controle definido pelo autor (07/10/2026): W corre e S recua na direção do cursor, sem deslocamento lateral; registrar ajustes de aceleração/parada | S2.12 |
| Feedback de combate | Sons e sinais visuais de tiro, recarga, dano, investida e dispositivos, com pausa, mute e limites de recursos | S3.10–S3.11 |
| Navegação de inimigos | Evoluir a grade existente e testar barreiras; navmesh só com necessidade demonstrada | S3.12; backlog |
| Pontos de interesse | Recursos obrigatórios, nave e laboratório claramente reconhecíveis, sem depender só de cor | S4.10 |
| Coreografia/interações | EDEN por eventos e rádio; interação imediata, sem deslocamento automático obrigatório ou gesto que atrase a coleta | S4.11 |
| Testes e manutenção | Usar os testes existentes, acrescentar CI/lint incremental e verificar recursos após ciclos repetidos | S5.9–S5.10 |
| Impacto da construção | Feedback simples e máquina visível no laboratório, integrado ao estado salvo | S5.11 |
| Topologia, rig e materiais | Otimizar elenco ativo e corrigir materiais editáveis preservando originais e animações | S6.8–S6.9 |
| Biblioteca de animações | Catálogo de combate/locomoção, incluindo recuo e laterais; compartilhar entre rigs compatíveis, animais separados quando necessário | S6.10–S6.11 |
| Mapa autorado | Provar kit modular em um trecho, preservar rotas/colisões e expandir apenas após validação | S6.12–S6.13 |
| Compressão, luz, efeitos e presets | Pipeline verificado, qualidade escalável e orçamentos medidos; efeitos opcionais com leitura de combate preservada | S7.7–S7.10 |

## O que mudou desde a base analisada

- O runtime antigo foi arquivado; apenas player e EDEN permanecem como GLBs ativos. O total desses modelos no build registrado no Sprint 1 é aproximadamente 51,42 MB, não os cerca de 150 MB do elenco antigo. Ainda há oportunidade de otimização.
- Existem 20 testes automatizados registrados após o ajuste de movimento do Sprint 2. A afirmação histórica de ausência de testes não descreve a implementação atual.
- Os inimigos já têm navegação por grade com obstáculos. Ausência de navmesh não significa ausência de navegação.
- Dados de robôs/disparos ficam na simulação mutável; a posição do jogador ainda exige revisão dos consumidores ativos. A melhoria não deve ser declarada completa com base apenas na remoção de assinaturas da UI principal.
- O perfil lê a cor salva, mas isso não comprova aplicação visual adequada em um GLB com material/textura baked. O aceite visual de materiais entra em S6.9.
- Não existe exigência atual de mobile, seis humanoides, reuniões, missões editoriais ou integração com backend MCP.

## Critérios para não desestabilizar o piloto

1. Preservar a versão funcional e os assets-fonte antes de substituir comportamento/arte. Mudanças pequenas, com comparação e caminho de reversão; não executar limpeza destrutiva como pré-requisito.
2. Manter saves e regras de viagem, morte, loot e fabricação. Novos efeitos, modelos e configurações visuais não concedem nem retiram recursos.
3. Reutilizar a stack e os testes atuais. Adicionar ferramenta apenas para uma tarefa concreta; a lista de bibliotecas do documento original não é uma lista de instalação.
4. Para interpolação, colisão e mapas, validar equivalência de movimento, tiros, alcance de interação e navegação antes de substituir o comportamento atual.
5. Não migrar todos os mapas, rigs, materiais e dependências num único sprint. Nenhuma retopologia ou biblioteca completa de animações bloqueia as hordas do protótipo.
6. O autor realiza testes visuais e avalia sensação dos controles. O agente entrega verificações automatizadas, medições disponíveis e roteiro. Itens sem verificação ficam explicitamente pendentes.

## Adiados ou descartados

- **Após o piloto:** gamepad/remapeamento, touch/mobile, minimapa completo, NPCs ambientais representando crescimento da colônia, navmesh para mapas maiores e upgrades maiores de stack.
- **Não incorporar:** reuniões no beacon, entrega editorial Mister → Max, estados de agentes MCP, decoração temática dos cinco departamentos e retopologia de seis personagens que não integram o jogo atual.
- **Não impor:** rig universal também para animais; prazo fixo de duas semanas por sprint; meta mobile antes de definir dispositivos; troca de engine; biblioteca genérica de animação com dezenas de clipes sem uso.
- **Não executar como limpeza:** apagar backups/arte ou reescrever histórico Git para adotar LFS. Fontes continuam preservadas.
- **Não adotar automaticamente:** timestep variável, remoção de limites caminháveis sem colisores equivalentes, pós-processamento pesado, hit-stop global e movimento automático para pontos de interação.

## Aceite

O plano principal contém as tarefas novas desmarcadas e mantém o núcleo já entregue identificado. O sucesso desta incorporação é orientar melhorias concretas sem mudar o recorte da primeira máquina ou declarar trabalho planejado como executado.
