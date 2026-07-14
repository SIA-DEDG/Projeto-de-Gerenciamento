# SIA — Sistema de Gerenciamento

Plataforma interna de gestão de diretorias: projetos, atividades (tasks), eventos, faltas/afastamentos e feedback, com controle de acesso por papel e por diretoria. Construída como monorepo com API REST em Express/Prisma e frontend em Next.js (App Router).

> Domínio de negócio em português (BR) — a aplicação organiza o trabalho em **Diretorias** (departamentos/boards), cada uma com seus próprios usuários, projetos, atividades, eventos e afastamentos.

---

## Sumário

- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [API](#api)
- [Autenticação e autorização](#autenticação-e-autorização)
- [Armazenamento de arquivos](#armazenamento-de-arquivos)
- [Frontend](#frontend)
- [Docker / ambientes](#docker--ambientes)
- [Testes](#testes)
- [Convenção de commits](#convenção-de-commits)
- [Roadmap / débito técnico conhecido](#roadmap--débito-técnico-conhecido)

---

## Stack

**Backend** (`backend-express/`)

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22, TypeScript |
| Framework HTTP | Express 5 |
| ORM | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`) sobre PostgreSQL |
| Autenticação | JWT (`jsonwebtoken`) + hashing `argon2` |
| Validação | `zod` |
| Documentação de API | `swagger-jsdoc` + `swagger-ui-express` (OpenAPI 3.0) |
| Storage de arquivos | Supabase Storage (`@supabase/supabase-js`) |
| Dev tooling | `tsx` (watch mode), `tsc` (build) |

**Frontend** (`frontend-next/`)

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14.2 (App Router), React 18 |
| Linguagem | TypeScript |
| Estilo | CSS Modules (sem Tailwind) |
| Drag & drop | `@dnd-kit` (Kanban) |
| Editor de texto rico | `@tiptap/react` |
| Gráficos | `chart.js` + `react-chartjs-2` |
| Import/export planilhas | `xlsx` |
| Ícones | `lucide-react` |
| Storage/API externas | `@supabase/supabase-js` |
| Testes | Jest + Testing Library |

**Infra**

- PostgreSQL 16 (via Docker Compose)
- Supabase (Storage, e opcionalmente Auth/DB gerenciado)
- Deploy do frontend preparado para Vercel (`vercel.json`)

---

## Arquitetura

```
┌──────────────────┐        REST/JSON (JWT Bearer)        ┌───────────────────────┐
│  frontend-next    │ ────────────────────────────────────▶│   backend-express      │
│  (Next.js 14 App  │ ◀────────────────────────────────────│   (Express 5 + Prisma) │
│   Router, React)  │                                       └───────────┬───────────┘
└──────────────────┘                                                   │
        │                                                               │ SQL (pg)
        │  upload/download direto de arquivos                          ▼
        ▼                                                     ┌──────────────────┐
┌──────────────────┐                                          │   PostgreSQL 16    │
│  Supabase Storage │◀─────────────────────────────────────── │  (Docker / gerenc.)│
│  (anexos, atas)   │        assinatura de URLs (backend)     └──────────────────┘
└──────────────────┘
```

- O backend expõe uma API REST versionada por recurso sob `/api/*`, com Swagger em `/api/docs`.
- O frontend é um App Router "shell" autenticado: rotas públicas (`/login`, `/redefinir-senha`) e um grupo de rotas protegido `(app)` com `AuthGuard`.
- Toda persistência de domínio passa pelo Prisma; arquivos (anexos de tarefas/projetos, atas de reunião) vivem no Supabase Storage, com URLs assinadas geradas pelo backend (`src/lib/storage.ts`).
- Um middleware dedicado (`snake-case.middleware.ts`) converte automaticamente entre `camelCase` (contrato JS/JSON) e `snake_case` (convenção de colunas no Postgres), mantendo o schema Prisma e o payload da API desacoplados da convenção de nomenclatura do banco.

---

## Modelo de dados

Schema definido em [`backend-express/prisma/schema.prisma`](backend-express/prisma/schema.prisma), PostgreSQL como provider. Sem enums nativos do banco — campos de status/papel/prioridade são `String` com valores controlados na camada de aplicação (zod).

### Entidades principais

- **Directoria** — unidade organizacional raiz. Tem `slug` único, cor, flag `active` e `autoArchiveDays` (dias para auto-arquivamento de atividades concluídas). É o "tenant" lógico de todo o resto: projetos, tarefas, eventos, afastamentos e usuários pertencem a uma diretoria.
- **User** — `username` único, senha com hash Argon2, `role` (`Admin` | `Diretor` | `Gerente` | `Funcionario`), flag `mustChangePassword` (força troca no primeiro acesso), vinculado a uma `Directoria`.
- **Project** — projeto com categoria, prazo, status executivo, objetivo/escopo/resumo, dono (`owner`) e lista de responsáveis (`ProjectResponsible`, N:N com User), anexos.
- **Task** — atividade vinculada a um projeto e a uma diretoria, com categoria, status, prioridade (default `Média`), prazo, responsável principal (`responsible`), co-responsáveis (`TaskCoResponsible`, N:N), colaboradores externos, evidências de conclusão (`evidences`), pins por usuário (`TaskPin`) e flag `archived`. Indexada por `archived`, `directoriaId`, `category`, `responsibleId`, `status` para as views de listagem/kanban.
- **Event** — evento/reunião com tipo, período (`startDate`/`endDate`/`startTime`), participantes (`EventResponsible`), ata (`minutesFilePath`) e anexos.
- **Absence** — afastamento/falta com período, justificativa, arquivo comprobatório e `approvalStatus` (`pendente` e demais estados de aprovação).
- **Feedback** — feedback de usuário com tipo, severidade, status, imagens, resposta institucional, upvotes (`FeedbackUpvote`) e comentários encadeados (`FeedbackComment`, com `parentId` para respostas).
- **ActivityLog** — trilha de auditoria (quem fez o quê, quando, em qual diretoria), indexada por data/tipo de entidade/usuário/diretoria — alimenta a tela de **Logs**.

### Observações de design

- Tabela `_sqlx_migrations` presente no schema é resquício de um backend anterior (provavelmente Rust/sqlx, confirmado pelo `.gitignore` que ainda ignora `/backend/target` e `/backend/.env`); não é usada pela aplicação atual.
- O client do Prisma é gerado com **output customizado** em `src/generated/prisma` (não no `node_modules/.prisma` padrão) e fica versionado no repositório.

---

## Estrutura de pastas

```
Projeto-de-Gerenciamento/
├── backend-express/
│   ├── src/
│   │   ├── app.ts                  # composição do Express (middlewares + rotas)
│   │   ├── server.ts               # bootstrap/listen
│   │   ├── config/                 # env.ts (zod), swagger.ts (OpenAPI)
│   │   ├── generated/prisma/       # Prisma Client gerado (custom output)
│   │   ├── lib/                    # logger, prisma client, storage (Supabase)
│   │   ├── middleware/             # auth, error handler, snake/camel case bridge
│   │   └── modules/                # 1 módulo por domínio (controller/routes/schema/service)
│   │       ├── auth/  users/  tasks/  projects/  absences/
│   │       └── events/  feedback/  logs/  diretorias/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── Dockerfile
├── frontend-next/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/  redefinir-senha/         # rotas públicas
│   │   │   └── (app)/                            # shell autenticado (AuthGuard)
│   │   │       ├── admin/{diretorias,registro,usuarios}
│   │   │       ├── projetos/  eventos/  faltas/  feedback/
│   │   │       ├── dashboards/  equipe/  arquivadas/
│   │   │       ├── minhas-atividades/  configuracoes/  logs/
│   │   │       └── page.tsx                        # home
│   │   ├── components/            # UI compartilhada (Kanban, modais, calendário, etc.)
│   │   ├── context/                # TabsContext
│   │   ├── hooks/                  # useTaskBoard, useToast, useUnsavedGuard
│   │   ├── lib/                    # api client, auth, supabase, utils
│   │   └── types/
│   └── Dockerfile
├── supabase/
│   └── config.toml                 # config local do Supabase CLI (Storage)
├── docker-compose.yml               # Postgres + backend (ambiente "default")
├── docker-compose.dev.yml           # Postgres isolado para dev
├── docker-compose.main.yml          # Postgres isolado para "main"/produção
└── .env.example
```

Cada módulo do backend segue o mesmo padrão em 4 arquivos:
`*.routes.ts` (rotas + doc Swagger via JSDoc) → `*.controller.ts` (HTTP) → `*.service.ts` (regra de negócio/Prisma) → `*.schema.ts` (validação zod).

Cada página do frontend segue o padrão `page.tsx` (Server Component, roteamento) delegando para `_view.tsx` (Client Component com a lógica/estado da tela).

---

## Como rodar localmente

Pré-requisitos: **Node.js 22+**, **Docker** (para o Postgres), acesso a um projeto Supabase (para Storage).

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/SIA-DEDG/Projeto-de-Gerenciamento.git
cd Projeto-de-Gerenciamento

# 2. Subir o Postgres local
docker compose -f docker-compose.dev.yml up -d

# 3. Backend
cd backend-express
cp .env.example .env         # ajuste DATABASE_URL, JWT_SECRET, SUPABASE_*
npm install
npm run db:generate          # gera o Prisma Client
npm run db:deploy            # aplica as migrations
npm run dev                  # http://localhost:8080 (Swagger em /api/docs)

# 4. Frontend (em outro terminal)
cd ../frontend-next
npm install
# defina NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 em .env.local
npm run dev                  # http://localhost:3000
```

Login inicial: usuário/senha definidos por `ADMIN_USERNAME`/`ADMIN_PASSWORD` no `.env` do backend (seed/bootstrap de admin).

---

## Variáveis de ambiente

### `backend-express/.env`

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | connection string PostgreSQL |
| `JWT_SECRET` | sim | segredo para assinatura dos tokens JWT |
| `PORT` | não (default `8080`) | porta HTTP do Express |
| `NODE_ENV` | não (default `development`) | `development` \| `production` \| `test` |
| `ADMIN_USERNAME` | não (default `admin`) | usuário admin de bootstrap |
| `ADMIN_PASSWORD` | não | senha do admin de bootstrap |
| `SUPABASE_URL` | não | URL do projeto Supabase (Storage) |
| `SUPABASE_SERVICE_KEY` | não | service role key do Supabase |
| `SHADOW_DATABASE_URL` | dev | banco shadow usado pelo Prisma Migrate em dev |

### `frontend-next/.env.local`

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | URL base da API (ex.: `http://localhost:8080`) |

> Nenhum arquivo `.env` real é versionado — apenas `.env.example`. Nunca commitar segredos.

---

## Banco de dados e migrations

Migrations gerenciadas pelo **Prisma Migrate**, em `backend-express/prisma/migrations/`.

```bash
npm run db:migrate          # cria + aplica migration em dev (nome interativo)
npm run db:migrate:create   # cria migration sem aplicar
npm run db:deploy           # aplica migrations pendentes (usado em CI/produção)
npm run db:status           # mostra estado das migrations
npm run db:studio           # abre o Prisma Studio
```

Em produção/Docker, o container do backend roda `npx prisma migrate deploy` automaticamente antes de subir o servidor (ver `docker-compose.yml`).

---

## API

Especificação OpenAPI 3.0 servida em runtime:

- **Swagger UI**: `GET /api/docs`
- **JSON bruto**: `GET /api/docs.json`

Todas as rotas exigem `Authorization: Bearer <token>`, exceto `POST /api/auth/login`.

| Recurso | Base path | Descrição |
|---|---|---|
| Auth | `/api/auth` | login, registro (gerentes+), troca de senha |
| Users | `/api/users` | listagem, edição de perfil, papéis, reset de senha |
| Projects | `/api/projects` | CRUD de projetos, anexos |
| Tasks | `/api/tasks` | CRUD de atividades, criação em lote, arquivamento, pin, anexos |
| Events | `/api/events` | CRUD de eventos, ata de reunião, anexos |
| Absences | `/api/absences` | CRUD de afastamentos, aprovação |
| Feedback | `/api/feedback` | CRUD de feedback, upvote, comentários encadeados |
| Diretorias | `/api/diretorias` | CRUD de diretorias, membros, auto-arquivamento |
| Logs | `/api/logs` | consulta e limpeza da trilha de auditoria |

Consulte o Swagger para o contrato exato de request/response de cada endpoint (os JSDoc que o alimentam vivem junto de cada `*.routes.ts`, mantendo rota e documentação sempre juntas).

---

## Autenticação e autorização

- **Autenticação**: JWT assinado com `JWT_SECRET`, payload `{ sub, username, role, directoriaId, exp }`. Middleware `authenticate` valida o token em toda rota protegida.
- **Autorização por papel** (`src/middleware/auth.middleware.ts`):
  - `requireAdmin` → apenas `Admin`
  - `requireManager` → `Admin`, `Diretor`, `Gerente`
  - `requireFuncionario`/padrão → qualquer usuário autenticado (`Funcionario` para cima)
- **Multi-tenant por diretoria**: a maior parte das entidades carrega `directoriaId`; o service layer filtra/valida acesso cruzado entre diretorias (ver histórico de commits `fix(sync)`, `feat(diretorias): envolve varias diretorias externas`).
- **Troca de senha obrigatória**: novos usuários nascem com `mustChangePassword = true` e senha temporária no formato `Sia<hex>!`.

---

## Armazenamento de arquivos

Anexos de tarefas/projetos e atas de eventos são enviados para o **Supabase Storage**:

- Backend (`src/lib/storage.ts`) sanitiza a chave do arquivo para ASCII, faz upload/remoção e gera **URLs assinadas** sob demanda (nunca expõe a service key ao cliente).
- Frontend (`src/lib/supabase.ts`) consome essas URLs assinadas para download/preview, preservando o nome original do arquivo (inclusive com acentos) na exibição.
- Fluxo de remoção: o registro no banco é removido antes do arquivo físico, com fallback amigável (404) caso o arquivo já não exista.

---

## Frontend

- **Next.js 14 App Router**, com separação clara entre rota pública (`login`, `redefinir-senha`) e grupo de rotas protegido `(app)` guardado por `AuthGuard`.
- **Módulos de tela**: Projetos (kanban com `@dnd-kit`), Eventos, Faltas, Feedback (com comentários e upvote), Dashboards (Chart.js), Equipe, Logs, Configurações, área administrativa (`admin/diretorias`, `admin/usuarios`, `admin/registro`).
- **Padrões de UI reutilizáveis**: modais de confirmação/edição (`ConfirmModal`, `TaskDetailModal`, `ProjectModal`, `EvidenceModal`, `TeamModal`, `SettingsModal`), calendário (`Calendario`, `MonthCalendar`, `TaskCalendarView`), editor de texto rico (`RichTextEditor` via Tiptap), sistema de toasts (`useToast`/`ToastContainer`) e guarda de alterações não salvas (`useUnsavedGuard`).
- **Sem Tailwind** — estilização via CSS Modules por página/componente.
- Deploy preparado para **Vercel** (`vercel.json`), consumindo a API via `NEXT_PUBLIC_BACKEND_URL`.

---

## Docker / ambientes

Três arquivos de compose para cenários distintos — hoje só o `docker-compose.yml` "default" tem o serviço de `backend` ativo; os demais são scaffolding de banco isolado por ambiente (os serviços de app estão comentados, prontos para ativar):

| Arquivo | Serviços ativos | Uso |
|---|---|---|
| `docker-compose.yml` | `postgres` (porta `5431`) + `backend` (porta `8080`) | ambiente "default" ponta a ponta |
| `docker-compose.dev.yml` | `postgres` (`sia_gestor_gab`, porta `5431`) | banco isolado para desenvolvimento local |
| `docker-compose.main.yml` | `postgres` (`sia_gestor`, porta `5432`) | banco isolado tipo "produção" |

```bash
docker compose up -d                    # sobe Postgres + backend (ambiente default)
docker compose -f docker-compose.dev.yml up -d   # só Postgres, para rodar backend/frontend via npm run dev
```

Dockerfiles multi-stage:
- `backend-express/Dockerfile`: `node:22-alpine`, gera o Prisma Client e compila TS no build stage; runtime só com deps de produção.
- `frontend-next/Dockerfile`: `node:20-alpine`, build arg `NEXT_PUBLIC_BACKEND_URL`, `next build` + `next start`.

---

## Testes

Frontend com Jest + Testing Library:

```bash
cd frontend-next
npm test              # roda a suíte uma vez
npm run test:watch    # modo watch
npm run test:coverage # com cobertura
```

Cobertura atual concentrada em `src/lib/__tests__` (api, auth, utils, useRefetchOnFocus) e componentes-chave como `KanbanCard`.

> O backend ainda não possui suíte de testes automatizados — candidato natural para próxima contribuição (ver Roadmap).

---

## Convenção de commits

Segue [Conventional Commits](https://www.conventionalcommits.org/), com descrições em português e escopo por domínio:

```
feat(atividade): herda membros/diretorias do projeto p/ escolher responsavel
fix(storage): sanitiza chave do bucket para ASCII, corrige upload/download com acento
style(kanban): ajusta tamanho do pin do card (17->14)
test: corrige suites desatualizadas (statusClass e KanbanCard)
```

Tipos usados: `feat`, `fix`, `style`, `test`. Escopos comuns: `atividade(s)`, `projetos`, `diretorias`, `anexos`, `auth`, `storage`, `sync`, `forms`, `kanban`.

---

## Roadmap / débito técnico conhecido

- Sem testes automatizados no backend (`backend-express`).
- Sem CI configurado (`.github/workflows` inexistente) — build, lint e testes ainda rodam apenas localmente.
- Serviço `frontend` comentado nos `docker-compose.*.yml` — subir o frontend hoje depende de `npm run dev`/`next start` fora do compose.
- Tabela `_sqlx_migrations` no schema Prisma é resquício de um backend anterior e pode ser removida após confirmação de que não há dependência residual.
- Sem `LICENSE` definido no repositório.
