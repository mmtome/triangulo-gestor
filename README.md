# Triângulo Gestor

Sistema interno de gestão da produção de conteúdo da **Triângulo Solutions**.
Implementa a especificação de [`../especificacao-gestor-interno.md`](../especificacao-gestor-interno.md)
e nasce já carregado com o **Planejamento de Conteúdo do Instagram — ciclo 1 (agosto/2026)**.

> Cada cliente é um projeto. Cada peça de conteúdo é uma tarefa com o fluxo de
> produção em subtarefas. A equipe enxerga por lista, quadro ou calendário.

---

## Rodando

O banco é **PostgreSQL (Neon)** — o mesmo em dev e em produção. O Prisma aceita
um provider por schema, então manter SQLite local e Postgres em produção faria
os dois divergirem.

```bash
npm install
vercel env pull .env    # traz DATABASE_URL, DATABASE_URL_UNPOOLED e AUTH_SECRET
npm run db:seed         # opcional: recria os dados de exemplo
npm run dev             # http://localhost:3000
```

**Acessos criados pelo seed** (senha `triangulo` para todos):

| E-mail | Papel | Observação |
|---|---|---|
| `matheusmigueltome@gmail.com` | ADMIN | conta principal |
| `socio2@triangulosolutions.com.br` | MEMBER | placeholder — renomeie em *Membros* |
| `social@triangulosolutions.com.br` | MEMBER | placeholder — renomeie em *Membros* |

`npm run db:seed` recria os dados de exemplo do zero (apaga o que existir).
`npm run db:studio` abre o Prisma Studio para inspecionar o banco.

---

## O que já vem carregado

**Projeto "Instagram · Planejamento de Conteúdo"** — 60 tarefas + 72 subtarefas:

- **Seções = as 4 semanas do ciclo** (03–07, 10–14, 17–21, 24–28 de agosto) mais
  *Banco de pautas* e *Publicado*.
- **Tags = os 4 tipos de conteúdo** (ALCANCE, AUTORIDADE, RELACIONAMENTO,
  VENDAS) + formato (REELS, CARROSSEL, STORIES) + os rituais nomeados
  (RAIO-X DE PROCESSO, SEM HYPE, DO PROBLEMA AO LUCRO, PERGUNTA DE ENGENHARIA).
- **12 posts de feed**, cada um com gancho, roteiro, CTA, pilar e métrica-rainha
  na descrição — e o fluxo `DEMANDAR → TRÁFEGO INTERNO → EDIÇÃO → LEGENDA →
  APROVAÇÃO → PUBLICAÇÃO` já aplicado como subtarefas, com prazos calculados
  retroativamente a partir da data de publicação.
- **8 tarefas de stories** (Pergunta de Engenharia às terças, bastidor às quintas).
- **40 pautas** no banco, cada uma tagueada pelo tipo.
- **Uma dependência real:** o caso "Do Problema ao Lucro #01" (28/08) está
  bloqueado pela oferta do Mapa (14/08).
- **Os dois bloqueios do plano** estão escritos na descrição das tarefas
  afetadas: a Creation Story ainda é modelo, e o caso real precisa de número
  fechado.

**Projeto "LinkedIn · Autoridade dos sócios"** — a regra de reaproveitamento do
plano (carrossel de quarta vira post de texto na quinta), com as 4 adaptações
do ciclo.

O **template "Fluxo de Produção"** fica disponível no drawer de qualquer tarefa
nova pelo botão *Aplicar Fluxo de Produção*.

---

## Identidade visual

Tudo travado no **Manual da Marca v1.0** (`../../assets/Manual da Marca.pdf`):

| Token | Valor | Origem |
|---|---|---|
| `brand` | `#CE2B34` | Vermelho Triângulo |
| `ink` | `#0E0E10` | Preto |
| `graphite` | `#17171A` | Grafite |
| `muted` | `#9A9AA2` | Cinza |
| fonte | **Poppins** 300–700 | seção 09 do manual |

O símbolo isométrico oficial está inline em
[`src/components/brand/Logo.tsx`](src/components/brand/Logo.tsx) (herda a cor por
`currentColor`) e também em `public/brand/` para favicon.

> O documento de branding sugeria uma paleta azul-petróleo + âmbar. O Manual da
> Marca v1.0 é posterior e define vermelho + preto — é ele que vale aqui.

---

## Arquitetura

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Banco | PostgreSQL no Neon, com `directUrl` para as migrations |
| ORM | Prisma 6 |
| Hospedagem | Vercel — deploy automático a cada push na `main` |
| Anexos | Vercel Blob em produção, disco local em dev |
| Auth | Sessão JWT própria (`jose` + `bcryptjs`), cookie httpOnly de 30 dias |
| UI | Tailwind CSS v4 + lucide-react |
| Mutações | Server Actions com validação Zod |
| Drag & drop | `@dnd-kit` (lista, quadro e calendário) |
| Gráficos | Recharts |
| Datas | date-fns, locale pt-BR |

```
src/
├── actions/          Server Actions (task, project, section, comment, tag, …)
├── app/
│   ├── (auth)/login  Login
│   ├── (app)/        Shell autenticado: home, inbox, my-tasks, search, projects
│   └── api/          Detalhe da tarefa (drawer) e uploads
├── components/
│   ├── brand/        Símbolo e wordmark
│   ├── layout/       Sidebar, Topbar, cabeçalho do projeto, criação rápida
│   ├── task/         Drawer, pickers, check, lista simples
│   ├── ui/           Avatar, Modal, Popover
│   └── views/        ListView, BoardView, CalendarView, toolbar, dashboard
├── lib/              db, auth, permissions, dates, ordering, activity, rich…
└── proxy.ts          Proteção de rotas (Next 16 renomeou middleware → proxy)
```

### Decisões que valem saber

**Rank fracionado** (`src/lib/ordering.ts`) — a ordem é uma chave base-62
lexicográfica, então arrastar um item reescreve **uma** linha, não a lista toda.
O comparador é `compareOrder`, nunca `localeCompare`: a colação linguística
ignora caixa e ordenaria `"k"` antes de `"U"`, quebrando o rank e fazendo a tela
renderizar numa ordem diferente da que está gravada.

**Multi-homing** — a tarefa não tem `projectId`. A tabela `TaskProject` liga
tarefa ↔ projeto ↔ seção, então a mesma peça aparece no projeto do cliente e na
fila da pessoa, como no Asana.

**Subtarefa é uma Task com `parentTaskId`** — tem responsável, prazo com hora e
comentários próprios. É o que faz o fluxo de produção funcionar.

**Log de atividade como side-effect das actions** (`src/lib/activity.ts`) — nunca
por trigger de banco, para o texto sair legível ("alterou o prazo para 7 ago, 18:00").

**Fuso fixo em `America/Sao_Paulo`** (`src/lib/dates.ts`) — nunca o fuso da
máquina. O mesmo componente renderiza no servidor (Vercel roda em UTC) e hidrata
no navegador; formatar em horário local faria "18:00" virar "21:00" no HTML do
servidor, quebrando a hidratação e mostrando a hora errada por um instante.
Entradas do usuário passam por `composeDue` (`fromZonedTime`), que devolve o
instante UTC certo em qualquer runtime.

**Invalidação ampla** (`src/lib/revalidate.ts`) — o drawer é global e uma tarefa
vive em vários projetos; invalidar caminhos específicos deixaria listas paralelas
defasadas. Para 1–5 usuários internos, revalidar o layout é o certo e o mais
barato de manter.

---

## Banco de dados

**PostgreSQL no Neon**, provisionado pelo marketplace da Vercel. O schema é o da
seção 4 da spec sem concessões: `enum` e `Json` nativos.

O Neon entrega duas connection strings e as duas importam:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | conexão agrupada (pooled) — é o que a aplicação usa |
| `DATABASE_URL_UNPOOLED` | conexão direta — é o `directUrl` das migrations |

Migrations pelo pooler falham de forma intermitente, por isso o `directUrl` no
`datasource`. As duas variáveis vêm prontas do `vercel env pull`.

Os parsers de `ViewPreference.filters` e `ActivityLog.meta` aceitam objeto **ou**
string. A tolerância é herança da fase SQLite e vale manter: registros gravados
antes da migração continuam legíveis.

### Anexos

Sem disco persistente em serverless, o backend de storage é escolhido em runtime
(`src/lib/storage.ts`):

- `BLOB_READ_WRITE_TOKEN` presente → **Vercel Blob**
- ausente → `./uploads` no disco local (dev e VPS)

Para habilitar anexos em produção, crie um Blob store no painel da Vercel
(*Storage › Blob*); o token é injetado automaticamente e nada no código muda.

---

## Onde está cada seção da spec

| Spec | Implementação |
|---|---|
| 4 — Modelo de dados | `prisma/schema.prisma` |
| 5.1 Login | `src/app/(auth)/login/` |
| 5.2 Sidebar + topbar | `src/components/layout/Sidebar.tsx`, `Topbar.tsx` |
| 5.3 Página inicial | `src/app/(app)/home/page.tsx` |
| 5.4 Minhas tarefas | `src/app/(app)/my-tasks/page.tsx` |
| 5.5 Caixa de entrada | `src/app/(app)/inbox/` + `InboxFeed.tsx` |
| 5.6 Cabeçalho do projeto | `src/components/layout/ProjectHeader.tsx` |
| 5.7 Visão Lista | `src/components/views/ListView.tsx` |
| 5.8 Visão Quadro | `src/components/views/BoardView.tsx` |
| 5.9 Visão Calendário | `src/components/views/CalendarView.tsx` |
| 5.10 Drawer da tarefa | `src/components/task/TaskDrawer.tsx` |
| 5.11 Visão geral | `src/app/(app)/projects/[projectId]/overview/` |
| 5.12 Painel | `.../dashboard/` + `DashboardCharts.tsx` |
| 5.13 Busca global | `src/app/(app)/search/page.tsx` |
| 5.14 Template de fluxo | `applySubtaskTemplate` em `src/actions/task.ts` |
| 6 — Contratos das actions | `src/actions/` |
| 7 — Regras de negócio | `src/lib/dates.ts`, `permissions.ts`, `activity.ts` |
| 8 — Design | `src/app/globals.css` |

---

## Divergências conscientes da spec

Três, todas por redução de risco — e nenhuma cria dívida de dados:

1. **Auth própria em vez de Auth.js v5 beta.** ~80 linhas de `jose` + `bcryptjs`
   cobrem exatamente o que a spec pede (credentials, sessão de 30 dias) sem a
   superfície de configuração de uma dependência em beta.

2. **Editor de texto próprio em vez de Tiptap** (`src/lib/rich.ts`). Descrições e
   comentários são guardados em **plain text** — legível no banco, fácil de
   buscar, sem risco de HTML injetado — e a exibição aplica `**negrito**`,
   `_itálico_`, listas, links e menções. Trocar por um editor rico depois não
   exige migração: basta passar a guardar HTML e remover o render.

3. **Server Actions + `router.refresh()` em vez de TanStack Query.** O optimistic
   update que importa (concluir tarefa, mover card) está implementado com estado
   local; a camada de cache extra não se pagava para 1–5 usuários.

## Fora do MVP (roadmap, conforme seção 2.2 da spec)

Cronograma/Gantt, automações, campos personalizados, portfólios, metas,
formulários, convidados externos, tempo real por websocket. Além desses, ficaram
para depois: reordenação de **seções** por drag (renomear e excluir já funcionam)
e o painel com widgets configuráveis — o painel atual tem 4 cartões fixos e
2 gráficos.

---

## Deploy

Hospedado na **Vercel**, ligado a este repositório: todo push na `main` publica.

Variáveis já configuradas no projeto:

| Variável | Origem |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | integração Neon |
| `AUTH_SECRET` | gerado com `crypto.randomBytes(32)` |
| `BLOB_READ_WRITE_TOKEN` | opcional — crie um Blob store para habilitar anexos |

O `build` roda `prisma generate` antes do `next build`, então o client é gerado
com o schema atual a cada deploy.

**Migrations não rodam sozinhas no deploy** — de propósito. Aplicar mudança de
schema durante o build de um projeto compartilhado é uma boa forma de derrubar
produção no meio de um deploy. O fluxo é aplicar antes, com o banco à mão:

```bash
npx prisma migrate deploy
```

### Alternativa self-hosted

Para 5 usuários internos um VPS de ~US$6/mês também resolve: `npm run build &&
npm start`, com um volume persistente em `./uploads` — sem o token do Blob, o
storage volta para o disco automaticamente.
