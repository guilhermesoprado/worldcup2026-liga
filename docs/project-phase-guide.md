# Guia de fases, telas e regras de alteração

Este documento é referência obrigatória antes de qualquer alteração no projeto. Ele registra o estado atual da experiência pública/admin e define o que está congelado.

## Regra principal

A fase de grupos está concluída e congelada.

Não altere páginas, serviços, componentes, estilos ou dados que mudem comportamento, visual, navegação, classificação, rodadas, confrontos, escalações ou regras da fase de grupos, a menos que o usuário peça explicitamente uma alteração na fase de grupos.

Quando uma alteração for necessária em componente compartilhado, a mudança deve ser escopada para a fase alvo. Exemplo: se mexer em `MatchCards` para a segunda fase, use prop ou seletor específico para não alterar a visualização da fase de grupos.

## Escopo protegido da fase de grupos

Considere protegidos por padrão:

- `app/(public)/fase-de-grupos/page.tsx`
- `app/(public)/confrontos/page.tsx`
- `app/(public)/grupos/[groupId]/page.tsx`
- `app/(public)/jogadores-mais-escalados/page.tsx`
- `app/(public)/classificacao-geral/page.tsx`, quando a mudança afetar a classificação final da fase de grupos
- `src/server/services/public-overview.service.ts`
- `src/server/services/matches-view.service.ts`, quando `phase === "groups"`
- `src/server/services/group-view.service.ts`
- `src/server/services/most-picked.service.ts`
- `src/components/public/GroupSelector.tsx`
- `src/components/public/RoundSelector.tsx`
- `src/components/public/StandingsTable.tsx`
- `src/domain/participants/static-league-data.ts`, na parte de grupos/confrontos da fase de grupos
- estilos em `app/globals.css` que afetam `.public-home` sem seletor específico de nova fase

Alterações nesses arquivos só são permitidas se:

1. O usuário pedir explicitamente para alterar a fase de grupos; ou
2. A alteração for comprovadamente neutra para fase de grupos; ou
3. A alteração estiver escopada por rota/classe/prop de outra fase.

## Estado atual das rotas públicas

### `/`

Tela principal atual. Ela delega para a página de segunda fase.

Arquivo: `app/(public)/page.tsx`

Padrão esperado:

- Não voltar a apontar para fase de grupos sem pedido explícito.
- A tela inicial agora acompanha a competição a partir da segunda fase.

### `/segunda-fase`

Tela pública da segunda fase.

Arquivo: `app/(public)/segunda-fase/page.tsx`

Estado atual:

- Usa `PublicReadinessService`.
- Filtra `snapshot.matches` com `match.phase === "round_of_32"`.
- Renderiza `PhaseHero` com título `Segunda Fase`.
- Link da seta esquerda volta para `/fase-de-grupos`.
- Seta direita fica desabilitada enquanto não houver próxima fase implementada.
- Renderiza `MatchCards` com `showBadge={false}`, para não exibir `round_of_32`.
- Se não houver confrontos, exibe `EmptyState`.

Padrão visual:

- Deve reutilizar o visual de cards públicos do projeto.
- Em desktop, quando não há pontuação, o placar da segunda fase deve aparecer como `- x -` lado a lado.
- Mobile deve preservar o layout responsivo existente dos cards.
- Quando houver pontuação, deve usar as mesmas regras de visualização de vencedor/perdedor/empate dos cards de confronto.

### `/fase-de-grupos`

Tela congelada da fase de grupos.

Arquivo: `app/(public)/fase-de-grupos/page.tsx`

Estado atual:

- Mostra `PhaseHero` da fase de grupos.
- Tem navegação de grupos via `GroupSelector`.
- Mostra classificação do grupo ativo com `StandingsTable`.
- Mostra confrontos somente até a 3ª rodada.
- O link `ver todos os confrontos` envia para `/confrontos?round=<rodada>`.
- O link `ver classificação geral` envia para `/classificacao-geral`.
- Usa `MatchCards` com badge de grupo ativo.
- Mostra jogadores mais escalados da rodada.

Não alterar sem autorização explícita.

### `/confrontos`

Tela congelada de todos os confrontos da fase de grupos.

Arquivo: `app/(public)/confrontos/page.tsx`

Estado atual:

- Usa `MatchesViewService.getMatches("groups", round)`.
- Mostra somente rodadas da fase de grupos, até a 3ª rodada.
- `voltar ao painel` aponta para `/fase-de-grupos`.
- Usa `RoundSelector` e `MatchCards`.

Não alterar sem autorização explícita.

### `/classificacao-geral`

Tela de classificação geral da fase de grupos.

Arquivo: `app/(public)/classificacao-geral/page.tsx`

Estado atual:

- Calcula classificação final por grupo a partir de `snapshot.standingsByGroup`.
- Considera 1º e 2º de cada grupo como classificados diretos.
- Considera os terceiros colocados e ordena os 8 melhores por:
  - pontos;
  - vitórias;
  - saldo de pontos;
  - pontos feitos;
  - nome do time.
- Tem abas `Classificados`, `Desclassificados` e `Melhores terceiros`.
- `voltar ao painel` aponta para `/fase-de-grupos`.
- Aplica cores de classificação:
  - direto: verde/acento;
  - melhor terceiro: dourado/laranja;
  - eliminado: vermelho.

Não alterar sem autorização explícita, exceto se a alteração for estritamente para novas fases e não mudar a classificação da fase de grupos.

### `/times/[teamId]`

Tela pública de time escalado.

Arquivo: `app/(public)/times/[teamId]/page.tsx`

Componente principal: `src/components/public/TeamDetailView.tsx`

Estado atual:

- Tem modos `Campo` e `Lista`.
- Mostra titulares, reservas, capitão, reserva de luxo e pontuação.
- Quando reserva entra, ele aparece em campo com seta de entrada.
- O reserva também aparece no banco com seta de entrada.
- O titular substituído aparece no banco com seta de saída.
- A legenda explica capitão, reserva de luxo, entrou e saiu.

Não alterar comportamento de rodadas da fase de grupos sem pedido explícito.

## Componentes públicos principais

### `PhaseHero`

Arquivo: `src/components/public/PhaseHero.tsx`

Uso:

- Cabeçalho de fase.
- Mostra título central e setas de navegação de fase.
- Atualmente ignora progresso visual mesmo recebendo `completedMatches` e `totalMatches`.

Ao alterar:

- Preserve navegações existentes.
- Não reintroduza texto como `Fase atual` sem pedido explícito.

### `MatchCards`

Arquivo: `src/components/public/MatchCards.tsx`

Uso:

- Cards de confronto reutilizados por fase de grupos, todos confrontos e segunda fase.

Regras atuais:

- `showBadge` controla exibição do badge superior.
- Grupo exibe badge `Grupo X`.
- Segunda fase usa `showBadge={false}`.
- Score disponível quando `homePoints` e `awayPoints` não são `null`.
- Diferença de até 5 pontos é tratada visualmente como empate.
- Diferença acima de 5 marca vencedor/perdedor.
- `scheduled` não mostra links `ver time`.
- `partial` mostra ponto de ao vivo.

Ao alterar:

- Nunca altere comportamento global do `MatchCards` se o pedido for só para uma fase.
- Use props ou seletores escopados.

### `StandingsTable`

Arquivo: `src/components/public/StandingsTable.tsx`

Uso:

- Tabela da fase de grupos.
- Aplica linhas por `statusLabel`: `qualified`, `in_contention`, `eliminated`.

Protegido por padrão porque pertence à fase de grupos.

## Segunda fase e geração dos 16 avos

Arquivos principais:

- `src/server/services/second-phase.service.ts`
- `src/domain/knockout/bracket-matrix.ts`
- `src/domain/knockout/fill-bracket.ts`
- `app/api/admin/second-phase/route.ts`
- `src/components/admin/AdminSecondPhaseControls.tsx`

Estado atual:

- Fase persistida como `round_of_32`.
- Rodada externa da segunda fase: `4`.
- Botão administrativo gera/substitui confrontos via `/api/admin/second-phase`.
- Se já houver confrontos, o admin recebe confirmação antes de substituir.
- A geração usa a rodada oficial mais recente da fase de grupos como fonte.
- A geração persiste confrontos com `state: "scheduled"` e pontos nulos.

Sync e regra obrigatoria para mata-mata:

- A partir da segunda fase, toda nova fase criada deve entrar no mesmo ciclo operacional de sync: `status_mercado = 2` computa parcial da `rodada_atual`; quando a `rodada_atual` avanca e `status_mercado = 1`, a rodada anterior vira oficial.
- Fases mata-mata devem processar os confrontos ja persistidos em `matches`, em vez de gerar confrontos por templates da fase de grupos.
- Fases mata-mata nao podem terminar empatadas. O vencedor deve ser decidido por:
  1. maior pontuacao no confronto;
  2. se a pontuacao do confronto for igual, maior total pontuado no campeonato;
  3. se o total do campeonato tambem for igual, melhor campanha na fase de grupos usando os mesmos criterios da classificacao: pontos, vitorias, saldo de pontos e pontos feitos;
  4. se ainda houver igualdade, melhor posicao na fase de grupos;
  5. fallback deterministico apenas para garantir que sempre exista um vencedor persistivel.
- Ao criar proximas fases, preserve esse comportamento por padrao e apenas acrescente a geracao/rota da nova fase. Nao recrie regras paralelas de pontuacao, oficializacao ou desempate.

Chaveamento:

- 1º e 2º colocados usam matriz fixa em `roundOf32Matrix`.
- Os 8 melhores terceiros são ranqueados por `rankBestThirds`.
- Terceiros são alocados aleatoriamente em slots compatíveis com grupos elegíveis via backtracking.

Confrontos diretos fixos atuais:

- Jogo 73: A2 x B2
- Jogo 75: F1 x C2
- Jogo 76: C1 x F2
- Jogo 78: E2 x I2
- Jogo 83: K2 x L2
- Jogo 84: H1 x J2
- Jogo 86: J1 x H2
- Jogo 88: D2 x G2

Demais jogos recebem um terceiro elegível conforme matriz:

- Jogo 74: E1 x 3º de A/B/C/D/F
- Jogo 77: I1 x 3º de C/D/F/G/H
- Jogo 79: A1 x 3º de C/E/F/H/I
- Jogo 80: L1 x 3º de E/H/I/J/K
- Jogo 81: D1 x 3º de B/E/F/I/J
- Jogo 82: G1 x 3º de A/E/H/I/J
- Jogo 85: B1 x 3º de E/F/G/I/J
- Jogo 87: K1 x 3º de D/E/I/J/L

## Padrões visuais atuais

Arquivo principal: `app/globals.css`

Base pública:

- Wrapper público: `.public-home`.
- Fundo principal: `--public-bg: #051424`.
- Superfícies: `--public-surface` e `--public-surface-soft`.
- Texto principal: `--public-text`.
- Texto suave: `--public-muted`.
- Títulos: `--public-title`.
- Acento principal: `--public-accent: #00e1ab`.
- Sucesso: `--public-success`.
- Alerta/dourado: `--public-warning` e `--public-gold`.
- Perigo: `--public-danger`.

Direção visual:

- Tema escuro esportivo premium.
- Cartões com bordas sutis e superfícies azuladas.
- Verde/acento para classificação, vencedor e ação ativa.
- Dourado/laranja para terceiros, empate e destaques de disputa.
- Vermelho suave para eliminado/perdedor.

Responsividade:

- Desktop usa cards em grid e placar central.
- Mobile reorganiza `MatchCards` com `display: contents` no placar e áreas específicas para home, score, separador, score e away.
- Não altere mobile se o pedido for apenas desktop.

## Como trabalhar daqui para frente

1. Leia este documento antes de modificar código.
2. Identifique se o pedido toca fase de grupos.
3. Se tocar fase de grupos e o usuário não autorizou explicitamente, não altere.
4. Para novas fases, crie rotas/componentes/serviços novos ou escopados.
5. Quando reutilizar componente compartilhado, preserve comportamento existente por padrão.
6. Antes de finalizar alterações de frontend, valide pelo menos TypeScript e, quando houver ajuste visual, teste em viewport desktop e mobile se aplicável.

## Checklist de proteção antes de editar

- A alteração mexe em `/fase-de-grupos`, `/confrontos`, `/classificacao-geral`, `/grupos/[groupId]` ou `/jogadores-mais-escalados`?
- A alteração muda serviço usado pela fase de grupos?
- A alteração muda CSS global `.public-home` sem escopo de fase?
- A alteração muda `MatchCards`, `PhaseHero`, `StandingsTable`, `GroupSelector` ou `RoundSelector`?
- A alteração pode modificar rodadas 1, 2 ou 3?
- A alteração pode modificar os resultados/classificação já finalizados?

Se qualquer resposta for sim, pare e só prossiga se o usuário tiver autorizado explicitamente a mudança na fase de grupos.
