# Cartola da Copa do Mundo - Liga

Aplicacao full-stack em Next.js para acompanhar uma liga do Cartola baseada na
tabela da Copa do Mundo com 48 participantes fixos, fase de grupos e mata-mata.

## Ambiente

1. Copie `.env.example` para `.env.local`.
2. Instale dependencias com `npm install`.
3. Para ambiente local com Docker, suba o Supabase com `npm run supabase:start`.
4. Preencha em `.env.local` as variaveis do Cartola e ajuste o admin se desejar.

## Supabase local com Docker

O projeto esta preparado para desenvolvimento local usando o stack oficial do
Supabase em Docker.

Valores padrao locais:

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`
- `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`
- banco Postgres em `127.0.0.1:54322`
- Studio em `http://127.0.0.1:54323`

Scripts uteis:

- `npm run supabase:start`: sobe o stack local e aplica migrations/seed
- `npm run supabase:status`: mostra URLs e chaves do ambiente local
- `npm run supabase:reset`: recria o banco local do zero
- `npm run supabase:stop`: desliga os containers locais

Separacao local x producao:

- local: use as chaves locais geradas pelo `supabase start`
- producao: substitua por URL e chaves reais do projeto hospedado
- nunca reutilize as chaves locais em producao

## Scripts

- `npm run dev`: sobe a aplicacao local
- `npm run supabase:start`: sobe o Supabase local com Docker
- `npm run lint`: valida o codigo
- `npm run test`: executa os testes unitarios
- `npm run test:e2e`: executa os testes E2E

## Arquitetura

- `app/`: rotas publicas, admin e endpoints HTTP
- `src/domain/`: regras de classificacao, mata-mata e sync
- `src/server/`: servicos, auth e repositorios
- `src/lib/cartola/`: cliente e mapeadores da API da Copa do Cartola
- `supabase/`: migrations e seed inicial

## Regra de Integracao Oficial

- A aplicacao deve consultar somente a API oficial da Copa:
  `https://api.copa.cartola.globo.com/`
- Nao deve existir fallback para outras APIs do ecossistema Cartola.
- Se a API da Copa estiver fora do ar, instavel ou incompleta, o sistema nao
  deve tentar buscar dados em outra origem do Cartola.
- Nesses casos, o comportamento esperado e manter o ultimo estado confiavel ja
  documentado e aguardar a volta da API oficial da Copa ou uma nova tentativa
  manual do administrador.
