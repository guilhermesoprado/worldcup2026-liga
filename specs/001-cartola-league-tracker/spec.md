# Feature Specification: Cartola League Tracker

**Feature Branch**: `[001-cartola-league-tracker]`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Aplicação para acompanhar uma liga do Cartola da Copa do Mundo com 48 times fixos representando 48 seleções, fase de grupos e mata-mata, visual público sofisticado e área administrativa para sincronização e controle operacional."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acompanhar a competição publicamente (Priority: P1)

Como visitante, eu quero visualizar a fase atual, os grupos, a classificação,
os confrontos e o progresso do torneio para acompanhar a liga como fonte oficial
durante toda a Copa.

**Why this priority**: Esta é a principal entrega de valor do sistema e a razão
mais importante para sua existência.

**Independent Test**: Pode ser testada acessando a área pública e confirmando
que um visitante consegue acompanhar o status atual da competição, navegar pelos
grupos e entender a situação de classificação sem fazer login.

**Acceptance Scenarios**:

1. **Given** que a competição possui fase atual definida, **When** o visitante
abre a página pública, **Then** ele vê a fase atual, o progresso da fase e o
conteúdo oficial correspondente.
2. **Given** que existem 12 grupos com confrontos e classificação,
**When** o visitante seleciona um grupo, **Then** ele vê a tabela daquele grupo
com posições, pontos, vitórias, saldo e pontos pró.
3. **Given** que existem jogos programados ou em andamento, **When** o visitante
abre os resultados da rodada, **Then** ele vê os confrontos da rodada com o
estado correto da rodada e a situação parcial ou oficial aplicável.

---

### User Story 2 - Sincronizar e controlar a competição como administrador (Priority: P2)

Como administrador único da liga, eu quero controlar a sincronização com o
Cartola e monitorar se os dados oficiais e parciais estão corretos para manter o
sistema confiável como fonte oficial da competição.

**Why this priority**: Sem controle administrativo seguro e sem sincronização
confiável, a área pública perde credibilidade.

**Independent Test**: Pode ser testada entrando na área administrativa e
validando que o administrador consegue autenticar, disparar sincronização,
pausar ou retomar o comportamento automático e visualizar o estado operacional.

**Acceptance Scenarios**:

1. **Given** que apenas o administrador possui credenciais válidas,
**When** ele tenta acessar a área administrativa, **Then** o sistema exige
autenticação antes de exibir qualquer controle operacional.
2. **Given** que a sincronização está habilitada, **When** o administrador
altera o intervalo ou pausa a sincronização, **Then** o sistema registra a nova
configuração e passa a respeitá-la nas próximas execuções.
3. **Given** que o administrador suspeita de atraso ou inconsistência,
**When** ele executa uma sincronização manual, **Then** o sistema atualiza os
dados disponíveis e informa o resultado da tentativa.

---

### User Story 3 - Consultar detalhes de um time ou seleção (Priority: P3)

Como visitante, eu quero clicar em um time, cartoleiro ou seleção representada
para ver a escalação e a pontuação correspondente daquela equipe no padrão do
Cartola.

**Why this priority**: Esse detalhe complementa a experiência principal e ajuda
o público a confiar nos resultados exibidos.

**Independent Test**: Pode ser testada acessando a área pública, abrindo o
detalhe de uma equipe e confirmando que a escalação e a pontuação exibidas
correspondem aos dados sincronizados da rodada.

**Acceptance Scenarios**:

1. **Given** que uma equipe possui escalação sincronizada para a rodada,
**When** o visitante abre o detalhe da equipe, **Then** ele vê a escalação e a
pontuação no formato de consulta esperado.
2. **Given** que a rodada ainda está em andamento, **When** o visitante abre o
detalhe da equipe, **Then** ele vê a situação parcial correspondente sem tratar
esse dado como resultado oficial encerrado.

---

### Edge Cases

- O que acontece quando o Cartola indicar rodada em andamento, mas algum time
  ainda não possuir dados parciais completos?
- Como o sistema se comporta quando a sincronização falhar, atrasar ou retornar
  dados incompletos?
- O que acontece quando dois times empatam em um confronto com diferenca de até
  5,00 pontos?
- Como o sistema deve reagir quando houver empate nos criterios de classificacao
  da fase de grupos ou do mata-mata?
- O que acontece quando a rodada é encerrada oficialmente e o resultado final
  diverge da parcial exibida anteriormente?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir publicamente a fase atual da competição,
  incluindo progresso, classificações, confrontos e transição entre fase de
  grupos e mata-mata.
- **FR-002**: O sistema MUST manter 48 participantes fixos, cada um ligado de
  forma permanente a uma seleção representada e a um time do Cartola.
- **FR-003**: O sistema MUST organizar a fase de grupos em 12 grupos de 4 times
  cada.
- **FR-004**: O sistema MUST registrar em cada confronto de grupo uma vitória,
  empate ou derrota com pontuação de 3, 1 e 0 pontos respectivamente.
- **FR-005**: O sistema MUST considerar empate na fase de grupos quando a
  diferença de pontuação entre as equipes não ultrapassar 5,00 pontos.
- **FR-006**: O sistema MUST aplicar na fase de grupos os critérios de
  desempate nesta ordem: pontos, vitórias, saldo de pontos e pontos pró.
- **FR-007**: O sistema MUST classificar para o mata-mata os dois primeiros de
  cada grupo e os melhores terceiros exigidos pelo formato oficial da Copa.
- **FR-008**: O sistema MUST montar o mata-mata usando o chaveamento oficial da
  Copa, preenchido pelos classificados da liga após a consolidação oficial da
  fase de grupos.
- **FR-009**: O sistema MUST aplicar no mata-mata os critérios de desempate
  nesta ordem: pontos pró, saldo de pontos e melhor campanha na fase de grupos.
- **FR-010**: O sistema MUST exibir durante a rodada em andamento uma visão
  parcial de confrontos, classificação simulada e pontuações parciais para
  acompanhamento.
- **FR-011**: O sistema MUST substituir a visão parcial pela visão oficial assim
  que a rodada for oficializada pelo Cartola.
- **FR-012**: O sistema MUST tratar o Cartola como fonte oficial para pontuação,
  escalações, status da rodada e demais dados sincronizados.
- **FR-012a**: O sistema MUST consultar somente a API oficial da Copa em
  `https://api.copa.cartola.globo.com/` para obter dados externos da
  competição.
- **FR-012b**: O sistema MUST NOT consultar outras APIs do ecossistema Cartola
  como fallback, mesmo quando houver endpoints equivalentes fora da API da
  Copa.
- **FR-013**: O sistema MUST disponibilizar uma área administrativa protegida
  por autenticação para um único administrador.
- **FR-014**: O administrador MUST poder iniciar, pausar, retomar, executar
  manualmente e configurar o intervalo da sincronização interna.
- **FR-015**: O sistema MUST executar sincronização automática enquanto houver
  acesso ao sistema e a configuração operacional permitir esse comportamento.
- **FR-016**: O sistema MUST registrar a data e o resultado da última
  sincronização visível ao administrador.
- **FR-017**: O sistema MUST exibir um ranking público dos jogadores mais
  escalados por rodada, mostrando quantos times da liga escalaram cada jogador.
- **FR-018**: O sistema MUST permitir que o visitante clique em um time,
  cartoleiro ou seleção e acesse o detalhe da escalação e da pontuação
  correspondente.
- **FR-019**: O sistema MUST manter a área pública disponível sem login até o
  fim da edição da competição.
- **FR-020**: O sistema MUST informar de forma compreensível quando dados
  parciais, oficiais ou detalhes de equipe estiverem temporariamente
  indisponíveis.

### External Integrations and Sync Rules *(mandatory when data comes from third parties)*

- **Source of Truth**: O Cartola é a fonte autoritativa para pontuação,
  escalações, status das rodadas e dados das equipes; o sistema da liga é a
  fonte autoritativa para regras próprias da competição e exibição oficial da
  tabela da liga.
- **Official Integration Boundary**: A integração externa deve usar somente
  `https://api.copa.cartola.globo.com/`. O sistema não deve consultar outra API
  do Cartola para complementar, substituir ou recuperar dados da competição.
- **Live vs Official State**: Enquanto a rodada estiver em andamento, o sistema
  exibe dados parciais para acompanhamento; após a oficialização da rodada pelo
  Cartola, o sistema passa a exibir o resultado oficial consolidado como estado
  oficial da competição.
- **Refresh Model**: A sincronização é interna e configurável pelo
  administrador, com atualização automática enquanto houver acesso ao sistema e
  sincronização manual como fallback oficial.
- **Fallback Behavior**: Quando a API oficial da Copa estiver indisponível,
  incompleta ou atrasada, o sistema preserva o último estado confiável,
  identifica que a atualização mais recente não foi concluída e permite nova
  tentativa manual pelo administrador, sem consultar outra API do Cartola.
- **Secrets and Access**: O acesso à integração depende de credenciais e token
  protegidos, utilizados apenas em operações administrativas e de sincronização
  no ambiente seguro do sistema.

### Key Entities *(include if feature involves data)*

- **Participante**: Representa um cartoleiro fixo da liga, com nome, seleção
  representada, time do Cartola e identificador externo da equipe.
- **Grupo**: Representa um dos 12 grupos da fase inicial, com quatro
  participantes, tabela de classificação e confrontos associados.
- **Confronto**: Representa um jogo entre dois participantes em uma rodada,
  contendo fase, placar parcial ou oficial, resultado, status e impacto na
  classificação.
- **Rodada**: Representa um ciclo de pontuação da liga, com status, janela de
  apuração, sincronizações realizadas e distinção entre estado parcial e final.
- **Classificação**: Representa a posição consolidada de um participante dentro
  do grupo ou da fase eliminatória, incluindo pontos, vitórias, saldo e pontos
  pró.
- **Escalacao da Equipe**: Representa os jogadores usados por um participante em
  determinada rodada, com pontuação parcial ou oficial correspondente.
- **Jogador Mais Escalado**: Representa o agregado por rodada de um atleta
  escolhido por múltiplos participantes, incluindo total de escalações na liga.
- **Configuracao de Sincronizacao**: Representa o estado operacional definido
  pelo administrador, incluindo intervalo, modo ativo ou pausado e último
  resultado conhecido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um visitante consegue identificar a fase atual da competição, o
  grupo desejado e os confrontos da rodada em até 3 minutos na primeira visita.
- **SC-002**: 100% dos confrontos exibidos em uma rodada oficializada refletem o
  resultado oficial consolidado do Cartola e as regras próprias da liga.
- **SC-003**: O administrador consegue autenticar e executar uma sincronização
  manual completa em até 2 minutos.
- **SC-004**: O sistema exibe claramente se um dado está parcial, oficial ou
  temporariamente indisponível em todos os fluxos principais de acompanhamento.
- **SC-005**: Um visitante consegue abrir o detalhe de qualquer equipe exibida
  na tabela ou nos confrontos em até 2 cliques.

## Assumptions

- O torneio terá apenas uma edição ativa e não precisa suportar múltiplas
  temporadas simultâneas.
- Os 48 participantes já estão definidos antes do início da competição e não
  serão trocados durante a edição.
- Os dados fornecidos pelo Cartola serão suficientes para identificar rodada,
  pontuação parcial ou oficial, escalações e o vínculo de cada time da liga com
  seu time externo correspondente.
- O sistema não precisa oferecer cadastro público, perfis sociais, comentários
  ou edição colaborativa.
- Quando a origem externa não permitir atualização contínua sem acesso ao
  sistema, o comportamento automático será considerado satisfeito com atualização
  durante uso ativo e fallback manual do administrador.
