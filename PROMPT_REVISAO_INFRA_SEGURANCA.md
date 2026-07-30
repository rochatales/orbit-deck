# Prompt — Revisão Completa de Infraestrutura, Segurança e Pontos de Falha (MCP Office)

> Cole o bloco abaixo para um agente/revisor. Ele já vem com o contexto do stack real do projeto.

---

## Contexto do projeto

Você está revisando o **MCP Office**: um protótipo 3D jogável que transforma um workspace de IA em experiência de jogo. Stack:

- **Frontend:** React 18 + TypeScript, Three.js / `@react-three/fiber` / `drei` / `rapier` (física), `zustand` (estado), `framer-motion`, build com **Vite 4**.
- **Backend:** servidor local **Fastify 5** (TypeScript, `tsx`), rodando em `127.0.0.1:3001`, com `@fastify/cors`. Atua como ponte entre o frontend 3D e serviços MCP.
- **Rotas:** `/api/health`, `/api/clients`, `/api/clients/:slug`, `/api/mcp/:npcId/actions/:actionId`, `/api/smart-lab/chat`.
- **Serviços:** `clientDiscovery`, `smartLabService`, `brandBrainService`, `editorialService`, `mcpRouter`.
- **Segredos:** carregados via `.env` (ignorado no git). Assets pesados (`.glb`, `.png`) versionados.

O projeto é um protótipo em desenvolvimento, mas trate-o como se fosse evoluir para produção.

## Sua tarefa

Faça uma **revisão completa** cobrindo três frentes: **(1) infraestrutura, (2) segurança, (3) pontos de falha**. Inspecione o código real antes de afirmar qualquer coisa — não suponha valores ausentes. Para cada achado, cite arquivo e linha.

### 1. Infraestrutura

- Configuração de build e dev (Vite, `tsconfig`, scripts `dev`/`build`/`preview`), reprodutibilidade do ambiente e consistência de gerenciador de pacotes (há `pnpm-lock.yaml` na raiz e `package-lock.json` no `server/` — apontar divergência).
- Boot do servidor Fastify: binding (`127.0.0.1`), porta fixa `3001`, logging, tratamento de erro no `bootstrap`, ausência de graceful shutdown.
- Estratégia de configuração: uso de `.env`, variáveis hardcoded (porta, host, origens CORS), separação dev/prod, ausência de validação de env na inicialização.
- Gestão de assets: `.glb`/`.png` grandes no repositório, impacto no tamanho do repo, ausência de Git LFS/CDN.
- Observabilidade: logs, health check, ausência de métricas, tracing e alertas.
- Estado de deploy: não há Dockerfile, CI/CD, nem pipeline — avaliar o que falta para empacotar e publicar com segurança.

### 2. Segurança

- **CORS:** lista de origens fixa em localhost — avaliar risco ao ir para produção e configuração de credenciais/headers.
- **Autenticação e autorização:** as rotas parecem abertas. Identifique endpoints sem authN/authZ, especialmente `/api/mcp/:npcId/actions/:actionId` e `/api/smart-lab/chat`.
- **Validação de entrada:** confira `isValidNpcId`/`isValidActionId` e a validação de `:slug`, body de POST e payloads de chat. Procure injeção, path traversal (ex.: `clientSlug` virando caminho de arquivo) e prompt injection no smart-lab.
- **Exposição de segredos:** chaves/API tokens em `.env`, logs ou respostas; risco de vazamento via mensagens de erro detalhadas.
- **Camada MCP:** o `mcpRouter` executa ações em serviços — avalie superfície de ataque, ações que tocam sistema de arquivos ou serviços externos, e falta de rate limiting/timeouts.
- **Dependências:** rode/equivalente a `npm audit`; aponte versões vulneráveis e pinadas de forma inconsistente.
- **Headers de segurança:** ausência de `helmet`/equivalente, CSP, e proteção contra payloads grandes (body limit).
- **Frontend:** uso de `dangerouslySetInnerHTML`, dados não sanitizados renderizados em UI/UI3D, e segredos embutidos no bundle Vite (variáveis `VITE_*` são públicas).

### 3. Pontos de falha

- **Single points of failure:** servidor único na porta fixa, sem retry/circuit breaker entre frontend↔backend↔serviços MCP.
- **Resiliência:** o que acontece se um serviço MCP demora, falha ou retorna erro? Há timeout, fallback, mensagem ao jogador?
- **Race conditions e estado:** consistência do estado `zustand` vs. respostas assíncronas do servidor; ações disparadas em duplicidade.
- **Recursos:** falta de body/upload limits, possível exaustão de memória ao carregar `.glb` grandes, vazamento de recursos Three.js (geometrias/texturas não descartadas).
- **Erros não tratados:** promessas sem catch, `process.exit(1)` engolindo contexto, ausência de boundary de erro no React.
- **Degradação graciosa:** comportamento quando backend está offline — o jogo trava, mostra tela em branco, ou degrada bem?

## Formato da saída

Para cada achado, entregue:

1. **Título curto** + **categoria** (Infra / Segurança / Falha).
2. **Severidade:** Crítico / Alto / Médio / Baixo (justifique impacto × probabilidade).
3. **Localização:** arquivo e linha(s).
4. **Descrição** do problema e cenário de exploração/quebra.
5. **Recomendação** concreta e acionável (com snippet quando ajudar).

Ao final, inclua:

- **Resumo executivo** (3–5 linhas) com o estado geral de risco.
- **Tabela de priorização** ordenada por severidade.
- **Quick wins** (correções de baixo esforço e alto impacto).
- **Roadmap de hardening** para levar o protótipo a produção (auth, secrets, CI/CD, containerização, observabilidade).

Seja específico e baseado em evidência do código. Não invente vulnerabilidades nem confirme segurança sem ter inspecionado o trecho relevante.
