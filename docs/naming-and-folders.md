# Nomes de arquivo e organização de pastas

Fincheck 2: app de finanças pessoal, um usuário, roda local no Windows.

Regra do dono para o repositório inteiro, front e back (29/10/2026). Todo agente lê antes de criar ou mover arquivo ou pasta. Quando outro documento disser diferente, este vale.

## Onde já vale

- **Código novo:** nasce neste padrão, em qualquer app ou pacote. O repositório começa agora: não há código antigo a migrar.
- **Idioma:** nomes de arquivo, pasta, classe, tabela e rota em inglês. Documentação e texto da interface em português.
- **Marca †:** depende da stack. Fica provisório até a etapa 0 (ver "A fechar com a stack", no fim).
- **"(exemplo)":** nome inventado para ilustrar. Não existe no repositório.

## Nome de arquivo

1. **Minúsculas com hífen** (kebab-case): `list-transactions.service.ts`, `credit-card.component.tsx` (exemplo). Nada de `PascalCase.tsx`, `camelCase.ts` ou `snake_case`.
2. **Todo arquivo leva o sufixo do tipo, no singular, em qualquer nível de pasta:** `nome.tipo.ts`. Vale direto numa pasta principal (`hooks/use-month-filter.hook.ts`, exemplo) e dentro de subpasta (`hooks/viewport/use-media-query.hook.ts`, exemplo).
3. **Hook começa com `use-`:** `use-invoice-total.hook.ts`, que exporta `useInvoiceTotal` (exemplo). O arquivo e a função dizem a mesma coisa.
4. **O nome diz o que o arquivo faz,** não onde ele está. Serviço e caso de uso começam pelo verbo: `list-transactions.service.ts`, `close-invoice.usecase.ts` (exemplo).
5. **Um assunto por arquivo.** Nunca um hook universal por feature, que junta tudo da tela: cada hook faz uma coisa e tem o próprio arquivo (`use-transaction-form.hook.ts`, `use-month-filter.hook.ts`, exemplo).
6. **A extensão segue o conteúdo:** `.tsx` quando o arquivo tem JSX, `.ts` quando não tem. O sufixo não muda por isso: `dashboard.viewmodel.tsx` ou `dashboard.viewmodel.ts`.
7. **Nomes que a ferramenta exige ficam como a ferramenta quer:** `main.ts`, `main.tsx`, `index.ts` (só no `packages/ui`, ver a regra 7 de Pastas), `vite.config.ts`, `eslint.config.js`, `vitest.config.ts`, `*.d.ts`, `package.json`, arquivo de migração do banco †. Arquivo de estilo, imagem e fonte não leva sufixo de tipo: a extensão já diz o que é (`fincheck.css`, `favicon.svg`, exemplo).

### Nomes dentro do arquivo

O nome do arquivo é kebab-case; o que ele exporta segue a linguagem.

| Arquivo (exemplo)                  | Exporta                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `credit-card.component.tsx`        | `CreditCard`                                               |
| `use-invoice-total.hook.ts`        | `useInvoiceTotal`                                          |
| `list-transactions.service.ts`     | `listTransactions` (front) ou `ListTransactionsService` (back) |
| `close-invoice.usecase.ts`         | `CloseInvoiceUseCase`                                      |
| `money.value-object.ts`            | `Money`                                                    |
| `installment-limits.constant.ts`   | `INSTALLMENT_LIMITS`                                       |

### Sufixos

Um tipo, um sufixo. Tipo que não está na tabela: escolher o nome no singular, em inglês, acrescentar aqui no mesmo commit e avisar o Lucas.

| Sufixo                       | O que é                                                                                          | Front | Back |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ----- | ---- |
| `.component.tsx`             | Componente visual                                                                                | sim   |      |
| `.hook.ts`                   | Hook do React; o nome começa com `use-`. No back não existe (não usar para gancho de servidor)   | sim   |      |
| `.view.tsx`                  | View do MVVM: desenha as props e emite ações                                                     | sim   |      |
| `.viewmodel.ts(x)`           | ViewModel do MVVM: adapta estado e navegação para a View                                         | sim   |      |
| `.model.ts`                  | Model do MVVM: junta os hooks do domínio e os da tela                                            | sim   |      |
| `.page.tsx`                  | Página consumida por uma rota                                                                    | sim   |      |
| `.route.ts(x)`               | Rota de tela (front). No back, só se a stack pedir um arquivo que registra as rotas de um assunto † | sim   | sim† |
| `.guard.ts`                  | Guarda de rota, se houver                                                                        | sim   |      |
| `.controller.ts`             | Um arquivo por rota HTTP: valida a entrada com o esquema, chama o caso de uso, monta a resposta  |       | sim  |
| `.middleware.ts`             | Peça que roda antes da rota: token local, log de requisição †                                    |       | sim† |
| `.plugin.ts`                 | Plugin do servidor (só se for Fastify) †                                                         |       | sim† |
| `.usecase.ts`                | Caso de uso: orquestra (carrega, chama a entidade, salva, avisa)                                 |       | sim  |
| `.entity.ts`                 | Entidade (classe pura, com a regra do conceito)                                                  |       | sim  |
| `.value-object.ts`           | Objeto de valor (classe imutável, só no back): `Money`                                           |       | sim  |
| `.repository.ts`             | Repositório; só para raiz de agregado                                                            |       | sim  |
| `.item.ts`                   | Entidade ↔ linha do banco (`fromEntity`, `toDomain`)                                             |       | sim  |
| `.table.ts`                  | Tabela em código (só se a camada de banco for Drizzle) †                                         |       | sim† |
| `.service.ts`                | Front: chamada à API. Back: serviço de domínio (regra que não cabe numa entidade nem é caso de uso) | sim   | sim  |
| `.query.ts`                  | Leitura: chave e busca do cache (front) ou consulta direta ao banco, sem montar entidade (back)  | sim   | sim  |
| `.schema.ts`                 | Esquema Zod                                                                                      | sim   | sim  |
| `.type.ts`                   | Só tipos (inclui o `database.type.ts` do Kysely †)                                               | sim   | sim  |
| `.constant.ts`               | Valores fixos                                                                                    | sim   | sim  |
| `.util.ts`                   | Função auxiliar sem estado; uma função por arquivo                                               | sim   | sim  |
| `.rule.ts`                   | Regra de negócio que não depende de tela (front, em `domain`)                                    | sim   |      |
| `.columns.tsx`               | Colunas de uma tabela, se a tabela usar biblioteca de colunas †                                  | sim†  |      |
| `.context.ts`                | Contexto do React                                                                                | sim   |      |
| `.store.ts`                  | Estado guardado no navegador †                                                                   | sim†  |      |
| `.mock.ts`                   | Rota de rede simulada (MSW), derivada dos esquemas do `packages/shared`                          | sim   |      |
| `.script.ts`                 | Script que se roda à mão (`scripts/`)                                                            | sim   | sim  |
| `.error.ts`                  | Erro tipado                                                                                      | sim   | sim  |
| `.event.ts`                  | Evento de domínio, quando houver                                                                 |       | sim  |
| `.interface.ts`              | Porta: contrato que a aplicação define e a infra cumpre (relógio, calendário, notificador)       |       | sim  |
| `.gateway.ts`                | Adaptador de um serviço externo (Pluggy, Telegram)                                               |       | sim  |
| `.translator.ts`             | Camada anticorrupção: traduz o dado do serviço externo para o modelo do domínio (proposta)       |       | sim  |
| `.client.ts`                 | Cliente de baixo nível: HTTP do serviço externo, conexão com o SQLite                            |       | sim  |
| `.schedule.ts`               | Quando as tarefas de um assunto rodam sozinhas, pelo relógio, dentro da API (`main/schedules/`)  |       | sim  |
| `.test.ts(x)`                | Teste                                                                                            | sim   | sim  |

- **Migração do banco †:** o arquivo fica em `apps/api/migrations/` e leva o nome que a ferramenta de banco exige. É exceção à regra 1.
- **Fora da tabela de propósito:** `.fictitious.ts` (o front constrói sobre o contrato aprovado, com `.mock.ts`) e `.worker.ts` (as tarefas do relógio chamam o caso de uso direto; não há fila).

## Pastas

1. **Nome de pasta em minúsculas com hífen, sem sufixo:** `side-panel/`, `credit-cards/` (exemplo).
2. **Pasta principal é a pasta de um tipo,** no plural: `components/`, `hooks/`, `services/`, `controllers/`, `usecases/`. Dentro dela, todo arquivo tem o sufixo desse tipo.
3. **Subpasta é por assunto:** `components/table/`, `hooks/viewport/`, `controllers/transactions/` (exemplo). O nome diz o que a pessoa procura, não a técnica (`table/`, e não `composed/`).
4. **Quando criar subpasta:**
   - a pasta passou de uns 8 arquivos e há uma separação clara por assunto; ou
   - um grupo de arquivos só faz sentido junto (o componente, o hook e a função que só ele usa).
5. **Quando não criar:** pasta para um arquivo só, a não ser quando a estrutura pede (um contexto novo, que vai crescer). Separação sem critério claro também não vale: na dúvida, menos pastas.
6. **O que só um assunto usa mora na pasta dele.** Só sobe para a pasta comum (`utils/`, `hooks/`) o que é usado por mais de um assunto. Funções auxiliares ficam em `utils/`, nunca em `lib/` ou `helpers/`.
7. **Barrel (`index.ts` que reexporta) só no `packages/ui`.** Ali cada pasta de assunto tem um `index.ts`, a porta pública dela, que só reexporta o que é público. **Em todo o resto é proibido:** `apps/web`, `apps/api` e `packages/shared` não têm `index.ts` nem arquivo que reexporta, e o import aponta para o arquivo de verdade (`@/domain/transactions/transactions/hooks/use-transactions.hook`, exemplo). A lint barra `export * from` e `export { … } from`.

## Testes

- **Pasta `tests/` na raiz do app ou pacote, espelhando o `src/`.** O teste de `src/components/table/data-table.component.tsx` é `tests/components/table/data-table.component.test.tsx` (exemplo).
- **Sufixo `.test.ts(x)`.**
- **O teste importa pelo atalho do projeto** (`@/` nos apps, `@ui/` no `packages/ui`), nunca por caminho relativo. O apoio de teste vem por `@tests/` (`@tests/support/...`).
- **Apoio de teste** (configuração, fábricas de dado, utilitários) em `tests/support/`. Configuração inicial: `tests/setup.ts`.
- **No back,** dentro de `tests/` ficam `unit/`, `integration/` e `e2e/`, e cada uma espelha o `src/`, com o contexto e o assunto. O apoio também vai por contexto e assunto: `support/transactions/transactions/create-test-transaction.util.ts` (exemplo). Fora de contexto, só `support/app/` (subir a API) e `support/database/` (o banco de teste).
- **Os testes do front** ficam em `tests/` do `apps/web`, nunca ao lado do código. Um padrão só para o repositório inteiro.

## Modelos de pasta

### App de front (`apps/web`) (exemplo)

```text
apps/web/
├─ src/
│  ├─ main.tsx
│  ├─ router/
│  │  ├─ routes/                  root.route.tsx · transactions.route.tsx · invoices.route.tsx
│  │  ├─ components/              route-error.component.tsx
│  │  └─ create-router.util.tsx · router-context.type.ts
│  ├─ pages/                      uma página por rota, na área da feature: transactions/transaction-list.page.tsx
│  ├─ features/
│  │  ├─ planning/                dashboard/ · projection/ · month-comparison/
│  │  ├─ transactions/            transaction-list/ · transaction-edit/ · installment-plan/
│  │  ├─ invoices/                invoice-list/ · invoice-detail/
│  │  ├─ accounts/ · recurrences/ · bills/ · categorization/
│  │  ├─ sync/                    sync-status/
│  │  └─ settings/                telegram/ · backup/ · preferences/
│  ├─ domain/
│  │  └─ transactions/transactions/
│  │     ├─ queries/              transactions.query.ts
│  │     ├─ services/             list-transactions.service.ts · edit-transaction.service.ts
│  │     ├─ hooks/                use-transactions.hook.ts
│  │     └─ rules/                transaction-provenance.rule.ts
│  └─ shared/
│     ├─ api/                     http-client.service.ts · api.error.ts
│     ├─ components/<assunto>/    o que é do negócio e várias telas usam: money/money-text.component.tsx
│     ├─ layouts/                 application/ · com subpastas pela parte da casca
│     ├─ hooks/ · constants/ · types/ · utils/
│     └─ config/ · providers/
├─ mocks/                         rotas simuladas (MSW), só do dev e dos testes; o app não as importa
│  └─ transactions/transactions/  transactions.mock.ts
└─ tests/                         o mesmo desenho do src/, com .test.ts(x)
   ├─ pages/<contexto>/           os testes de tela inteira: transactions/transaction-list.test.tsx
   ├─ support/                    apoios de teste, importados por @tests/support/…
   └─ setup.ts
```

**Por dentro de uma feature** (`features/transactions/transaction-list/`, exemplo):

- **Na raiz, só os três arquivos do MVVM:** `transaction-list.model.ts`, `transaction-list.viewmodel.tsx`, `transaction-list.view.tsx`.
- **O resto vai para a pasta do tipo, só se houver arquivo:** `components/`, `hooks/`, `constants/`, `types/`, `utils/`, `schemas/`, `stores/`.
- **`components/` com mais de uns 8 arquivos ganha subpastas pela parte da tela:** `table/`, `filters/`, `dialogs/`. O que mais de uma parte usa fica na raiz de `components/`.
- **Estados ficam sempre juntos em `components/states/`:** carregando, vazio, erro e não encontrado.
- **Tela dentro de tela vira subpasta com o próprio MVVM:** `transaction-edit/original-from-bank/original-from-bank.view.tsx` (exemplo).
- **No `domain`:** `domain/<contexto>/<assunto>/` com `queries/ services/ hooks/ rules/`, só as que têm arquivo. A regra de negócio solta vai para `rules/`. `utils/` fica só com efeito na tela ou formato de arquivo.
- **A View não importa** `domain`, `router` nem a biblioteca de cache (a lint barra). Quem liga é o ViewModel.
- **Sem dado fictício dentro do app.** O front constrói sobre o contrato aprovado, com as rotas simuladas de `mocks/`, derivadas dos esquemas do `packages/shared`, em paralelo à API. Nada em `src/` importa `mocks/`.

### Pacote de interface (`packages/ui`) (exemplo)

```text
packages/ui/
├─ src/
│  ├─ styles/                     fincheck.css
│  ├─ components/
│  │  ├─ actions/                 button.component.tsx · index.ts
│  │  ├─ table/                   data-table.component.tsx · page-range.util.ts · index.ts
│  │  └─ states/                  skeleton.component.tsx · empty-state.component.tsx · index.ts
│  ├─ hooks/
│  │  └─ viewport/                use-media-query.hook.ts · index.ts
│  └─ utils/                      class-names.util.ts
└─ tests/
   └─ components/table/           data-table.component.test.tsx
```

### App de back (`apps/api`)

**Toda pasta de camada se divide em contexto e assunto: `<camada>/<contexto>/<assunto>/<arquivo>`, desde o primeiro arquivo,** sem esperar a pasta passar de 8. Vale para `controllers`, `usecases`, `entities`, `value-objects`, `errors`, `services`, `queries`, `events` e, no banco, `items`, `repositories`, `uow` e os tipos das tabelas. O mesmo assunto tem o mesmo nome em todas as camadas: `controllers/invoices/invoices/close-invoice.controller.ts`, `usecases/invoices/invoices/close-invoice.usecase.ts`, `errors/invoices/invoices/invoice-already-closed.error.ts` (exemplo).

- **Contexto:** os da tabela abaixo, os mesmos do `packages/shared`.
- **Assunto:** o que a pessoa procura, no plural e em kebab-case. Nunca a técnica (`helpers/`, `common/`, `misc/`).
- **Nunca arquivo solto na pasta do contexto.** O que mais de um assunto usa fica no assunto dono do conceito.
- **Ficam fora da regra, e só estes:**
  - `application/interfaces/` (portas: relógio, calendário, notificador, sem contexto);
  - `application/value-objects/money.value-object.ts` (a base de dinheiro que todo contexto usa);
  - `application/errors/application.error.ts`;
  - `infra/clients/` (um cliente por serviço externo: SQLite, Pluggy, Telegram);
  - `infra/database/database.type.ts` (junta os tipos das tabelas) †;
  - `apps/api/migrations/` †;
  - `main/main.ts`, `main/http/` (token local, log de requisição), `main/schedules/` (um arquivo por assunto que tem tarefa no relógio);
  - `shared/config/`;
  - `tests/support/app/` e `tests/support/database/`.
- **`shared/` segue a mesma regra:** `shared/schemas/transactions/transactions/transaction-id-param.schema.ts`, `shared/constants/invoices/invoices/closing-day.constant.ts`, `shared/utils/transactions/installments/split-cents.util.ts` (exemplo). Na raiz do tipo fica só a base que todo contexto usa e que não é de assunto nenhum: `utils/with-timeout.util.ts` (exemplo).
- **Dono entre contextos:** um contexto nunca lê nem grava a tabela de outro. Ele pede ao dono: uma `query` para ler, um caso de uso do dono para alterar. Escrita que cruza contextos passa por um caso de uso só, com unidade de trabalho (`uow/`). A lint barra, pelo caminho da pasta, importar repositório, item ou `uow` de outro contexto.
- **Repositório só por raiz de agregado.** Contexto simples (categorias, tags) usa caso de uso e `query`, sem entidade nem repositório de agregado.
- **Assunto novo** só quando nenhum da tabela abaixo serve; ele entra na tabela no mesmo commit.
- **Padrão de código da classe** (dos repositórios de back do dono; onde divergem, vale o template, que é mais novo):
  - os tipos de uma classe ficam em `export namespace <Classe>` logo abaixo dela: `Input` e `Output` no caso de uso, `Body`, `Query` e `Response` no controller, `Attributes` na entidade;
  - o construtor da entidade recebe os atributos e gera o id quando falta;
  - entidade ↔ linha do banco só no `.item.ts` (`fromEntity`, `toDomain`);
  - uma função auxiliar por `.util.ts`; nenhum tipo nem função solta no meio de um arquivo;
  - erro de regra é classe tipada (`.error.ts`), nunca erro HTTP dentro da regra de negócio.

**Contextos e assuntos (proposta, a confirmar na primeira modelagem de cada contexto):**

| Contexto         | Assuntos                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`       | `accounts` (contas) · `credit-cards` (cartões) · `wallets` (carteira manual, dinheiro em espécie) · `institutions` (bancos pré-cadastrados)              |
| `transactions`   | `transactions` (lançamentos) · `installments` (parcelas) · `transfers` (transferências) · `friend-debts` (dívida com amigo) · `provenance` (procedência e original do banco, com a edição do usuário protegida da sincronização) |
| `invoices`       | `invoices` (faturas: competência e caixa, fechamento) · `invoice-payments` (pagamento da fatura)                                                         |
| `recurrences`    | `recurrences` (modelos) · `occurrences` (execuções e confirmação automática) · `matching` (casar lançamento com recorrência) · `business-days` (dia útil, feriado) |
| `bills`          | `bills` (contas a pagar e a receber) · `settlements` (baixa)                                                                                              |
| `categorization` | `categories` · `tags` · `rules` (regras de categorização) · `suggestions` (sugestão de regra ao recategorizar)                                           |
| `planning`       | `dashboard` · `projection` (projeção do mês) · `month-comparison` (mês a mês) · `free-balance` (o quanto ainda pode gastar)                              |
| `alerts`         | `alerts` (o que avisar e quando) · `telegram` (o canal)                                                                                                   |
| `sync`           | `pluggy` (adaptador e camada anticorrupção) · `connections` (conexões bancárias) · `runs` (execuções da sincronização)                                    |
| `backup`         | `backups` (cópia diária do arquivo do banco) · `restores`                                                                                                 |
| `settings`       | `preferences` · `credentials` (segredos das integrações)                                                                                                  |

```text
apps/api/                                                          (exemplo)
├─ migrations/                            † arquivos da ferramenta de banco
├─ src/
│  ├─ application/
│  │  ├─ interfaces/                      clock.interface.ts · calendar.interface.ts · notifier.interface.ts
│  │  ├─ controllers/transactions/transactions/   list-transactions.controller.ts · edit-transaction.controller.ts
│  │  ├─ usecases/invoices/invoices/      close-invoice.usecase.ts
│  │  ├─ entities/invoices/invoices/      invoice.entity.ts
│  │  ├─ value-objects/                   money.value-object.ts
│  │  ├─ services/transactions/installments/   split-installments.service.ts
│  │  ├─ queries/planning/dashboard/      month-summary.query.ts
│  │  ├─ events/ · mesma divisão, quando houver
│  │  └─ errors/                          application.error.ts · invoices/invoices/invoice-already-closed.error.ts
│  ├─ infra/
│  │  ├─ clients/                         sqlite.client.ts · pluggy.client.ts · telegram.client.ts
│  │  ├─ gateways/sync/pluggy/            pluggy.gateway.ts · pluggy-transaction.translator.ts
│  │  ├─ gateways/alerts/telegram/        telegram.gateway.ts
│  │  └─ database/
│  │     ├─ database.type.ts              †
│  │     ├─ types/transactions/transactions/    transactions-table.type.ts †
│  │     ├─ items/transactions/transactions/    transaction.item.ts
│  │     ├─ repositories/invoices/invoices/     invoice.repository.ts
│  │     └─ uow/transactions/installments/      create-installment-plan.uow.ts
│  ├─ main/
│  │  ├─ main.ts
│  │  ├─ http/                            middlewares/local-token.middleware.ts · request-log.middleware.ts †
│  │  └─ schedules/                       sync-pluggy.schedule.ts · telegram-alerts.schedule.ts · daily-backup.schedule.ts
│  └─ shared/                             config/ · e, por contexto e assunto: constants/ · schemas/ · utils/
└─ tests/                                 unit/ · integration/ · e2e/, cada uma com o mesmo caminho do src/
   ├─ unit/application/usecases/invoices/invoices/            close-invoice.usecase.test.ts
   ├─ integration/application/controllers/transactions/transactions/   list-transactions.controller.test.ts
   └─ support/                            app/ · database/ · e, por contexto e assunto: transactions/transactions/create-test-transaction.util.ts
```

- Pasta de camada vazia leva um `.gitkeep`.
- As tarefas do relógio (sincronizar o Pluggy, avisar no Telegram, backup diário) moram na API. Cada `.schedule.ts` só diz quando e chama o caso de uso. A API sobe com o Windows.
- A API só escuta em `127.0.0.1` e confere um token local (`local-token.middleware.ts`). Não há login, permissão nem auditoria.

### Pacote de contrato (`packages/shared`)

Uma pasta por recurso, no singular, agrupada por contexto, os mesmos do back, mais `common`.

```text
packages/shared/                                                   (exemplo)
├─ src/
│  ├─ common/         money · api-error · pagination · date
│  ├─ accounts/       account · credit-card · wallet · institution
│  ├─ transactions/   transaction · installment · transfer · friend-debt
│  ├─ invoices/       invoice · invoice-payment
│  ├─ recurrences/    recurrence · occurrence
│  ├─ bills/          bill
│  ├─ categorization/ category · tag · rule
│  ├─ planning/       dashboard · projection · month-comparison
│  ├─ alerts/         alert
│  ├─ sync/           sync-run · connection
│  ├─ backup/         backup
│  └─ settings/       preference
└─ tests/             o mesmo caminho de src
```

Dentro da pasta do recurso, um arquivo por papel:

| Arquivo                 | O que tem                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<recurso>.schema.ts`   | Os esquemas Zod do recurso                                                                                                                                                                            |
| `<recurso>.type.ts`     | `export namespace <Recurso>` só com tipos, inferidos com `z.infer`. A forma do próprio recurso é `<Recurso>.Dto`; o resto perde o prefixo: `Transaction.Status`, `Transaction.ListParams`, `Transaction.CreateRequest` (exemplo) |
| `<recurso>.constant.ts` | Listas e limites fixos, em MAIÚSCULAS                                                                                                                                                                 |
| `<função>.util.ts`      | Uma função pura por arquivo, com o nome dela (`format-money.util.ts` exporta `formatMoney`, exemplo)                                                                                                  |

- **Sem classe:** a entidade e o `Money` com comportamento ficam no back. O `shared` diz a forma; o back diz a regra.
- **Sem código de framework** (servidor, React, banco) no `shared`.
- **Namespace só com tipo:** nenhum valor dentro de namespace.
- **Dinheiro:** inteiro em centavos. Data: instante em UTC e data do negócio `YYYY-MM-DD`, fuso America/Sao_Paulo. Os esquemas disso moram em `common/`.
- **Import:** os apps importam o arquivo de verdade, `@fincheck/shared/transactions/transaction/transaction.type` (exemplo). Dentro do pacote, caminho relativo.

## Antes de criar um arquivo ou pasta

1. Qual o tipo? O sufixo sai da tabela.
2. Já existe a pasta principal desse tipo onde ele vai? Se não, criar no plural.
3. A pasta tem mais de uns 8 arquivos e uma separação clara? Criar a subpasta do assunto e levar para ela o que for do assunto.
4. Só um assunto usa o arquivo? Ele mora na pasta desse assunto.
5. O teste vai em `tests/`, no mesmo caminho.
6. **No back:** o arquivo vai em `<camada>/<contexto>/<assunto>/`, com o assunto da tabela de "App de back". Nunca solto na pasta do contexto.

## A fechar com a stack

Decide-se na etapa 0, uma decisão por vez, com o Lucas. Até lá, o que tem † fica provisório.

| Item                          | Pergunta                                                           | Opções e recomendação                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ferramenta de monorepo        | Só workspaces ou também orquestrador de tarefas?                   | **pnpm workspaces (recomendado).** pnpm + Turborepo: exagero para 4 pacotes.                                                                                                                  |
| Sufixos que dependem do back  | Fastify e Hono não têm `.module`, `.pipe`, `.filter`. O que usar?  | **Recomendado:** `.controller.ts` por rota, `.middleware.ts` para o que roda antes da rota e `.plugin.ts` só no Fastify. Não usar `.hook.ts` no back: é do React no front. NestJS (não recomendado) manteria `.module`, `.filter`, `.interceptor`, `.decorator`, `.pipe`. |
| Camada de banco               | Kysely ou Drizzle?                                                 | **Kysely (recomendação da pesquisa):** sem `.table.ts`; tabelas como tipos em `database.type.ts` (junta os tipos por contexto e assunto) e `migrations/`. Drizzle: `.table.ts` por tabela. A recomendação segue a decisão da stack. |
| Lint e formatação             | ESLint + Prettier ou Biome?                                        | **ESLint + Prettier (recomendado):** as regras de camada, de barrel e de fronteira entre contextos precisam de plugins do ESLint. Biome: um binário só, mas sem essas regras.                  |
| Runtime e versões exatas      | Qual Node, quais versões, extensão nos imports do `shared`?        | Etapa 0. Nada aqui assume versão.                                                                                                                                                              |
