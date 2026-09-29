# Sprint 2 — Validação manual

Status: **pendente com o responsável pelo projeto**. Implementação e testes automatizados concluídos; aprovação visual e sensação dos controles ainda não registradas.

Abrir http://127.0.0.1:5178/. Se a aba estava aberta, atualizar. Usar a página normal do jogo, não a fixture `/tests/browser-smoke.html`.

## Preparação

- [ ] Em Marte, caminhar ao deck ao sul e embarcar com **E**.
- [ ] Escolher **1 robô** na cabine e decolar para Shanghai.
- [ ] Desembarcar. O combate começa quando o explorador está a pé; não começa dentro da cabine.

## Roteiro — aproximadamente 10 a 15 minutos

| Teste | Ação | Resultado esperado |
| --- | --- | --- |
| Movimento e mira | Orientar com o mouse, usar W/S e A/D; repetir olhando em outra direção e girar a câmera com Q/C | W avança na direção do olhar; S recua; A/D deslocam para os lados do personagem sem girá-lo sozinhos; Shift corre |
| Rifle | Clicar uma vez, depois segurar o botão esquerdo sobre um robô | Disparos manuais, munição diminuindo e indicação de acerto; 3 acertos eliminam um robô |
| Recarga | Disparar algumas vezes e apertar R; tentar atirar durante a recarga | Recarga de cerca de 1,5 s; disparos bloqueados durante ela; pente até 24, descontando da reserva |
| Munição finita | Após limpar a área, esvaziar um pente e tentar atirar sem recarregar | Sem tiro com pente vazio; aviso para usar R; reserva não aumenta sozinha |
| Cobertura | Atrair um robô para trás de um prédio e disparar na direção dele | Prédio bloqueia tiro e dano; não confundir as caixas baixas de futuros recursos com cobertura, pois são apenas marcadores |
| Navegação | Contornar um prédio e observar o perseguidor; testar ficar perto de uma parede | Robô contorna o obstáculo sem atravessá-lo; encostar na parede não deve interromper a perseguição |
| Dano e morte | Deixar robôs encostarem até a vida acabar | Dano de 15 por contato, intervalo global de aproximadamente 0,8 s; feedback vermelho e tela de derrota com HP zero |
| Reinício | Na derrota, clicar Tentar novamente | Retorno à rampa de Shanghai com 100 HP, 24/96 balas, contador zerado e robôs restaurados; nenhum tiro antigo permanece |
| Pausa | Apertar Esc durante perseguição e durante recarga; aguardar e retomar | Jogador, inimigos, disparos e recarga congelam; não há dano acumulado ao retomar |
| Troca de janela | Segurar movimento/tiro e trocar de janela; voltar | Pausa automática. Ao retomar, nenhum movimento ou tiro fica preso sem novo comando |
| Mais inimigos | Ao vencer ou morrer, selecionar 3 e depois 5 robôs e reiniciar | Contagem corresponde ao encontro; os robôs continuam navegando; HUD, mira e resposta continuam legíveis e fluidos |
| Viagem preservada | Voltar à nave, embarcar, retornar a Marte e desembarcar | Hub e deck continuam funcionando; sem inimigos ou combate em Marte |

## O que avaliar visualmente

- [ ] Mira corresponde ao alvo e o rifle aponta na direção correta, inclusive com Q/C girando a câmera.
- [ ] É fácil distinguir jogador, inimigos e obstáculos.
- [ ] Disparo, acerto e dano têm feedback perceptível.
- [ ] HUD, rádio e botões não prejudicam a área de combate na resolução usada.
- [ ] A câmera acompanha sem atrapalhar mira e movimentação.
- [ ] Robôs não ficam presos indefinidamente, sobrepostos ou atravessando paredes.
- [ ] Não há travamentos perceptíveis, especialmente com 5 robôs.

## Feedback de jogabilidade

Registrar se o movimento está pesado/leve, mira intuitiva/difícil, robôs lentos/rápidos, dano fraco/forte e encontro fácil/difícil. Os valores são iniciais, não um balanceamento final.

Para cada problema: **teste, quantidade de robôs, ação realizada, resultado observado e resultado esperado**. Informar navegador/resolução e, se possível, vídeo ou captura.

## Fora do escopo desta validação

Ondas, minas, barreiras, animais, loot, extração obrigatória e construção da máquina ainda não existem. Robôs, rifle, cenário e animações são provisórios. A volta a Marte permanece livre; os encontros não concedem recompensas. Atualizar a página retorna ao hub e não salva a tentativa em Shanghai.

## Ajuste de direcionais após feedback

Movimento agora relativo ao olhar, em ambos os mapas. Validar especialmente recuo e deslocamento lateral sem giro involuntário, e W seguindo a nova orientação após mover o mouse. A câmera não define a frente do personagem. Testes visuais permanecem com o responsável.
