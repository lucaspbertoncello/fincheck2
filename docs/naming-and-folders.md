# Nomes de arquivo e organização de pastas

Fincheck 2: app de finanças pessoal, um usuário, roda local no Windows.

Regra do dono para o repositório inteiro, front e back (29/10/2026). Todo agente lê antes de criar ou mover arquivo ou pasta. Quando outro documento disser diferente, este vale.

## Onde já vale

- **Código novo:** nasce neste padrão, em qualquer app ou pacote. O repositório começa agora: não há código antigo a migrar.
- **Idioma:** nomes de arquivo, pasta, classe, tabela e rota em inglês. Documentação e texto da interface em português.
- **Marca †:** depende de uma biblioteca ainda não escolhida. Fica provisório até a primeira feature que precisar dela (ver "Fechado com a stack", no fim).
- **"(exemplo)":** nome inventado para ilustrar. Não existe no repositório.

## Nome de arquivo

1. **Minúsculas com hífen** (kebab-case): `list-transactions.service.ts`, `credit-card.component.tsx` (exemplo). Nada de `PascalCase.tsx`, `camelCase.ts` ou `snake_case`.
2. **Todo arquivo leva o sufixo do tipo, no singular, em qualquer nível de pasta:** `nome.tipo.ts`. Vale direto numa pasta principal (`hooks/use-month-filter.hook.ts`, exemplo) e dentro de subpasta (`hooks/viewport/use-media-query.hook.ts`, exemplo).
3. **Hook começa com `use-`:** `use-invoice-total.hook.ts`, que exporta `useInvoiceTotal` (exemplo). O arquivo e a função dizem a mesma coisa.
4. **O nome diz o que o arquivo faz,** não onde ele está. Serviço e caso de uso começam pelo verbo: `list-transactions.service.ts`, `close-invoice.usecase.ts` (exemplo).
5. **Um assunto por arquivo.** Nunca um hook universal por feature, que junta tudo da tela: cada hook faz uma coisa e tem o próprio arquivo (`use-transaction-form.hook.ts`, `use-month-filter.hook.ts`, exemplo).
6. **A extensão segue o conteúdo:** `.tsx` quando o arquivo tem JSX, `.ts` quando não tem. O sufixo não muda por isso: `dashboard.viewmodel.tsx` ou `dashboard.viewmodel.ts`.
7. **Nomes que a ferramenta exige ficam como a ferramenta quer:** `main.ts`, `main.tsx`, `index.ts` (só no `packages/ui`, ver a regra 7 de Pastas), `vite.config.ts`, `eslint.config.js`, `vitest.config.ts`, `*.d.ts`, `package.json`, `tsconfig.json`, `index.html`, o arquivo de migração do banco (ver Sufixos) e o que a ferramenta gera (`*.gen.ts`). Arquivo de estilo, imagem e fonte não leva sufixo de tipo: a extensão já diz o que é (`fincheck.css`, `favicon.svg`, exemplo).

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
| `.route.ts(x)`               | Rota de tela (front). No back, o arquivo que registra no Hono as rotas HTTP de um assunto (`main/http/routes/`) | sim   | sim  |
| `.guard.ts`                  | Guarda de rota, se houver                                                                        | sim   |      |
| `.controller.ts`             | Um arquivo por rota HTTP: valida a entrada com o esquema, chama o caso de uso, monta a resposta  |       | sim  |
| `.middleware.ts`             | Middleware do Hono, roda antes da rota: token local, log de requisição                           |       | sim  |
| `.usecase.ts`                | Caso de uso: orquestra (carrega, chama a entidade, salva, avisa)                                 |       | sim  |
| `.entity.ts`                 | Entidade (classe pura, com a regra do conceito)                                                  |       | sim  |
| `.value-object.ts`           | Objeto de valor (classe imutável, só no back): `Money`                                           |       | sim  |
| `.repository.ts`             | Repositório; só para raiz de agregado                                                            |       | sim  |
| `.item.ts`                   | Entidade ↔ linha do banco (`fromEntity`, `toDomain`)                                             |       | sim  |
| `.service.ts`                | Front: chamada à API. Back: serviço de domínio (regra que não cabe numa entidade nem é caso de uso) | sim   | sim  |
| `.query.ts`                  | Leitura: chave e busca do cache (front) ou consulta direta ao banco, sem montar entidade (back)  | sim   | sim  |
| `.schema.ts`                 | Esquema Zod                                                                                      | sim   | sim  |
| `.type.ts`                   | Só tipos (inclui o `database.type.ts` do Kysely e os tipos de cada tabela)                       | sim   | sim  |
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

- **Migração do banco:** escrita à mão para o migrator do Kysely, em `apps/api/src/database/migrations/`, com o nome `AAAAMMDDHHmm-o-que-faz.ts` (`202611051430-create-transactions.ts`, exemplo). O carimbo de data dá a ordem; ela exporta `up` e `down`. É exceção à regra 2 (sem sufixo de tipo). Migração aplicada não se edita: faz-se outra.
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
7. **Barrel (`index.ts` que reexporta) só no `packages/ui`.** Ali cada pasta de assunto tem um `index.ts`, a porta pública dela, que só reexporta o que é público. **Em todo o resto é proibido:** `apps/web`, `apps/api` e `packages/shared` não têm `index.ts` nem arquivo que reexporta, e o import aponta para o arquivo de verdade (`#/domain/transactions/transactions/hooks/use-transactions.hook.ts`, exemplo). A lint barra `export * from` e `export { … } from`.

## Imports

- **Atalho `#/` em todo app e pacote:** aponta para o `src/` do próprio pacote, pelo campo `imports` do `package.json` (`"#/*": "./src/*"`). O apoio de teste vem por `#tests/` (`"#tests/*": "./tests/*"`). Sem `@/` nem `paths` no tsconfig: o Node roda o TypeScript da API direto e ignora o `paths`, e o web lê o código da API para o tipo do cliente; o `#/` resolve certo nos dois casos.
- **O import nomeia o arquivo com a extensão:** `#/database/sqlite.client.ts`, `#/pages/home/home.page.tsx`. É o que o Node exige.
- **Nos apps, nada de caminho relativo** (`./`, `../`): sempre `#/`. A lint barra. No `packages/shared`, dentro do pacote, caminho relativo (`./health.schema.ts`).
- **Entre pacotes,** pelo nome do pacote e o caminho do arquivo a partir do `src/`: `@fincheck/shared/system/health/health.type.ts`. O `packages/ui` é a exceção: importa-se pela porta pública (`@fincheck/ui`) e o CSS por `@fincheck/ui/styles/fincheck.css`.
- **O web nunca importa `mocks/`** (atalho `#mocks/`); só o `vite.config.ts` liga o MSW, no modo de mocks, pelo servidor de desenvolvimento. A lint barra o resto.

## Testes

- **Pasta `tests/` na raiz do app ou pacote, espelhando o `src/`.** O teste de `src/components/table/data-table.component.tsx` é `tests/components/table/data-table.component.test.tsx` (exemplo).
- **Sufixo `.test.ts(x)`.**
- **O teste importa pelo atalho do pacote** (`#/`), nunca por caminho relativo. O apoio de teste vem por `#tests/` (`#tests/support/...`).
- **Apoio de teste** (configuração, fábricas de dado, utilitários) em `tests/support/`. Configuração inicial: `tests/setup.ts`.
- **No back,** dentro de `tests/` ficam `unit/`, `integration/` e `e2e/`, e cada uma espelha o `src/` (`integration/modules/health/http/health/health.route.test.ts`). O apoio vai por módulo e assunto: `support/transactions/transaction/create-test-transaction.util.ts` (exemplo). Fora de contexto, só `support/app/` (subir a API) e `support/database/` (o banco de teste).
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
   ├─ support/                    apoios de teste, importados por #tests/support/…
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

### Reuso e fronteiras no front (05/11/2026)

Regra de Lucas depois da auditoria do código: cópias entre telas, telas usando peças de outras por dentro e regra de negócio no `packages/ui`. A lint barra o que dá para barrar; o resto é conferido na revisão.

1. **Procurar antes de criar.** Antes de criar componente, hook ou util, procurar no `packages/ui` (a porta `packages/ui/src/index.ts`), no `apps/web/src/shared/` e no `apps/web/src/domain/`. Existe e serve: usar. Existe quase igual: ajustar o que existe, sem criar outro. Nada de cópia.
2. **Uma feature não importa arquivo de outra feature.** O que duas features usam sobe para `shared/` (ou para `domain/`, se for regra) no mesmo commit. Dentro de uma feature (`features/<contexto>/`), as telas dividem as pastas do contexto (`components/`, `hooks/`, `utils/`…) e uma tela só usa outra pelo arquivo da raiz dela (o viewmodel ou o componente de entrada), nunca pelo que está dentro. `shared/` e `domain/` não importam feature. A lint barra (`fincheck/web-boundaries`).
3. **O `packages/ui` só desenha.** Sem regra de negócio, sem texto de erro de domínio, sem o contrato (`@fincheck/shared`), sem cache nem rota: recebe pronto por prop. A lint barra os imports.
4. **Regra de dinheiro, data e sinal mora no `domain`:** `apps/web/src/domain/<contexto>/<assunto>/rules/`, uma regra por `.rule.ts`, com teste. Inclui sinal de receita e despesa, divisão de valor e "hoje" no fuso de São Paulo quando é regra; formato de exibição fica em `shared/utils/`.
5. **Nada sem uso.** Sem export, arquivo, componente, tipo ou dependência que ninguém usa. Export que só o teste usa não é export: o teste passa pela porta pública. A esteira confere (`pnpm knip`).

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

**Por contexto primeiro (módulo), depois camada, depois assunto: `modules/<contexto>/<camada>/<assunto>/<arquivo>`,** desde o primeiro arquivo (`modules/invoices/domain/invoice/invoice.entity.ts`, exemplo). Decidido pelo PM em 29/10/2026, no lugar de `<camada>/<contexto>/<assunto>/`.

| Pasta de `src/`                   | O que tem                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/<contexto>/domain/`      | Entidades ricas, objetos de valor, erros de domínio (`.error.ts`), interfaces de repositório (portas)                                                              |
| `modules/<contexto>/application/` | Casos de uso, queries (leitura direta com Kysely, sem entidade) e as portas que o caso de uso precisa                                                             |
| `modules/<contexto>/infra/`       | Repositórios Kysely, `.item.ts`, gateways e translators (Pluggy, Telegram)                                                                                              |
| `modules/<contexto>/http/`        | Controllers (sem framework: recebem e devolvem dado) e o `.route.ts` que registra as rotas no Hono                                                               |
| `shared/`                         | Núcleo compartilhado: `errors/`, `config/`, `money/`, `date/` (`BusinessDate`, `Month`), `clock/`, `calendar/`, `text/`, `id/`, `local-token/`, `unit-of-work/` (a porta) e `http/` (o validador; só `http` e `main` importam) |
| `database/`                       | Conexão (`sqlite.client.ts`), `database.type.ts` (junta os tipos das tabelas), `tables/<contexto>/<tabela>-table.type.ts` (o tipo de cada tabela; o dono é a pasta), `unit-of-work/` (implementação Kysely), `migrate-to-latest.util.ts` e `migrations/` |
| `main/`                           | `main.ts` (sobe tudo), `http/` (`create-app.util.ts` monta os controllers à mão e as rotas; `app.type.ts`; `handle-error.util.ts`; `middlewares/`) e `schedules/` |

- **A dependência aponta para dentro:** `http` → `application` → `domain`; `infra` implementa as portas do `domain` e do `application`. O `domain` não importa Kysely, Hono, Zod nem `node:`. Só o `main` monta tudo (injeção à mão, sem container). A lint barra.
- **Dono entre contextos:** um módulo não importa o `domain`, o `infra` nem o `http` de outro. Lê pela query do outro e altera pelo caso de uso do dono (os dois em `application`). Escrita que cruza contextos passa por um caso de uso só, com unidade de trabalho. A lint barra.
- **Pasta só existe quando tem arquivo.** Contexto simples (categorias) tem entidade e caso de uso, sem camada vazia. Sem barramento de eventos e sem CQRS separado.
- **Assunto:** o que a pessoa procura, em kebab-case, no singular dentro do módulo (`invoice/`, `invoice-payment/`). Nunca a técnica (`helpers/`, `common/`, `misc/`). Nunca arquivo solto na pasta da camada.
- **Erros:** toda exceção de propósito estende `shared/errors/application.error.ts` por uma família (`DomainError` 422, `NotFoundError` 404, `ConflictError` 409, `ValidationError` 400), com `code` estável em MAIÚSCULAS (`INVOICE_ALREADY_CLOSED`). Cada contexto declara os seus em `domain/<assunto>/`. A regra de negócio nunca lança erro HTTP nem `Error` solto. Um handler só, `main/http/handle-error.util.ts`, traduz para o status e o corpo `{ code, message, details? }` (esquema em `packages/shared/src/common/api-error/`); erro desconhecido vira 500 genérico.
- **Repositório só por raiz de agregado.**
- **Padrão de código da classe** (dos repositórios de back do dono; onde divergem, vale o template, que é mais novo):
  - os tipos de uma classe ficam em `export namespace <Classe>` logo abaixo dela: `Input` e `Output` no caso de uso, `Body`, `Query` e `Response` no controller, `Attributes` na entidade;
  - o construtor da entidade recebe os atributos e gera o id quando falta;
  - entidade ↔ linha do banco só no `.item.ts` (`fromEntity`, `toDomain`);
  - uma função auxiliar por `.util.ts`; nenhum tipo nem função solta no meio de um arquivo;
  - campo da classe declarado e atribuído no construtor (o Node não aceita `constructor(private x)`).

**Contextos e assuntos (proposta, a confirmar na primeira modelagem de cada contexto):**

| Contexto       | Assuntos                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `accounts`     | `account` · `credit-card` · `wallet` (carteira manual) · `institution` (bancos pré-cadastrados)              |
| `transactions` | `transaction` · `installment-plan` (compra parcelada) · `account-balance` e `account-deletion` (o que `accounts` pede) · `card-invoice` e `invoice-payment` (o que `invoices` pede) · `occurrence-payment` e `subscription-charge` (o que `recurrences` pede) · `category-rule-history` e `category-usage` (o que `categories` pede). Ainda sem arquivo: `transfer`, `friend-debt`, `provenance` |
| `invoices`     | `invoice` (competência e caixa, fechamento) · `invoice-payment`                                               |
| `recurrences`  | `recurrence` · `occurrence` · `occurrence-payment` · `matching` · `subscription` (o dia útil e o feriado moram em `shared/calendar`) |
| `bills`        | `bill` (contas a pagar e a receber) · `settlement` (baixa)                                                    |
| `categories`   | `category` · `tag` · `rule` (regra de categorização) · `suggestion`                                           |
| `dashboard`    | `summary` · `projection` (projeção do mês) · `month-comparison` · `free-balance` (o quanto ainda pode gastar) |
| `sync`         | `pluggy` (adaptador e camada anticorrupção) · `connection` · `run`                                            |
| `backup`       | `backup` (cópia diária do arquivo) · `restore`                                                                |
| `health`       | `health` (`GET /health`, estado da API e do banco). Técnico, sem regra de negócio                             |

- **`alerts`:** não existe no MVP. Telegram e notificações são fase 2 (`product/business rules/alerts.md`, no vault); o contexto nasce na fase 2.
- **`settings`:** não é contexto do back. A tela de Configurações só junta o que é de outros: a pasta de backup é do `backup`, as conexões e o consentimento são do `sync`, e o tema é só do front.

```text
apps/api/                                                          (exemplo)
├─ src/
│  ├─ modules/
│  │  ├─ invoices/
│  │  │  ├─ domain/invoice/          invoice.entity.ts · invoice-already-closed.error.ts · invoice-repository.interface.ts
│  │  │  ├─ application/invoice/     close-invoice.usecase.ts · list-invoices.query.ts
│  │  │  ├─ infra/invoice/           invoice.repository.ts · invoice.item.ts
│  │  │  └─ http/invoice/            close-invoice.controller.ts · invoice.route.ts
│  │  ├─ sync/infra/pluggy/          pluggy.client.ts · pluggy.gateway.ts · pluggy-transaction.translator.ts
│  │  └─ health/                     application/health/check-database.query.ts · http/health/get-health.controller.ts · health.route.ts
│  ├─ shared/                        errors/ · config/ · money/ · date/ · clock/ · calendar/ · text/ · id/ · local-token/ · unit-of-work/ · http/
│  ├─ database/                      sqlite.client.ts · database.type.ts · tables/invoices/invoices-table.type.ts · unit-of-work/ · migrate-to-latest.util.ts · migrations/202611051430-create-invoices.ts
│  └─ main/                          main.ts · http/ (create-app.util.ts · app.type.ts · handle-error.util.ts · middlewares/) · schedules/
└─ tests/                            unit/ · integration/ · e2e/, cada uma com o mesmo caminho do src/
   ├─ unit/modules/invoices/domain/invoice/       invoice.entity.test.ts
   ├─ integration/modules/health/http/health/     health.route.test.ts
   └─ support/                       app/ · database/ · e, por módulo e assunto: invoices/invoice/create-test-invoice.util.ts · shared/clock/ (o relógio fixo)
```

- As tarefas do relógio (sincronizar o Pluggy, avisar no Telegram, backup diário) moram na API, em `main/schedules/`. Cada `.schedule.ts` só diz quando e chama o caso de uso. A API sobe com o Windows.
- A API só escuta em `127.0.0.1` e confere um token local (`main/http/middlewares/local-token.middleware.ts`). Não há login, permissão nem auditoria.

### Pacote de contrato (`packages/shared`)

Uma pasta por recurso, no singular, agrupada por contexto, os mesmos módulos do back, mais `common`.

```text
packages/shared/                                                   (exemplo)
├─ src/
│  ├─ common/         api-error (existe) · money · pagination · date
│  ├─ health/         health (existe)
│  ├─ accounts/       account · credit-card · wallet · institution
│  ├─ transactions/   transaction · installment · transfer · friend-debt
│  ├─ invoices/       invoice · invoice-payment
│  ├─ recurrences/    recurrence · occurrence
│  ├─ bills/          bill
│  ├─ categories/     category · tag · rule
│  ├─ dashboard/      summary · projection · month-comparison
│  ├─ sync/           run · connection
│  └─ backup/         backup
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
- **Import:** os apps importam o arquivo de verdade, com a extensão: `@fincheck/shared/transactions/transaction/transaction.type.ts` (exemplo). O pacote não tem build: o Node e o Vite leem o TypeScript direto. Dentro do pacote, caminho relativo, também com a extensão.

## Antes de criar um arquivo ou pasta

1. Qual o tipo? O sufixo sai da tabela.
2. Já existe a pasta principal desse tipo onde ele vai? Se não, criar no plural.
3. A pasta tem mais de uns 8 arquivos e uma separação clara? Criar a subpasta do assunto e levar para ela o que for do assunto.
4. Só um assunto usa o arquivo? Ele mora na pasta desse assunto.
5. O teste vai em `tests/`, no mesmo caminho.
6. **No back:** o arquivo vai em `modules/<contexto>/<camada>/<assunto>/`, com o contexto e o assunto da tabela de "App de back". Nunca solto na pasta da camada.

## Fechado com a stack

Etapa 0 (29/10/2026). A stack está no vault (`architecture/stack.md`); os comandos e versões, no `AGENTS.md`.

| Item                       | Fechado                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo                   | pnpm workspaces, sem orquestrador de tarefas.                                                                                                                   |
| Sufixos do back (Hono)     | `.controller.ts` por rota (sem framework: recebe e devolve dado), `.route.ts` registra as rotas de um assunto no Hono, `.middleware.ts` roda antes da rota. Sem `.plugin.ts`, `.module`, `.pipe`, `.filter`. `.hook.ts` só no front. |
| Camada de banco (Kysely)   | Sem `.table.ts`: cada tabela é um tipo (`<tabela>-table.type.ts`) em `src/database/tables/<contexto dono>/`, juntado em `src/database/database.type.ts` (fora do `infra/` do módulo porque a lint barra `database` importando `modules/*/infra`; o `database.type.ts` precisa alcançar todos). Migração escrita à mão, nome na seção Sufixos. |
| Lint e formatação          | ESLint + Prettier. A lint barra: a camada errada (`http` → `application` → `domain`; o domínio não importa Kysely, Hono, Zod nem `node:`), o `domain`, o `infra` e o `http` de outro módulo, barrel fora do `packages/ui`, import relativo nos apps, `mocks/` no `src/` do web, na View, `domain`, `router` e as bibliotecas de rota e cache, uma feature do web importando outra por dentro, e o `packages/ui` importando o contrato, o cache ou a rota. |
| Runtime e imports          | Node 26, que roda o TypeScript direto (só sintaxe apagável: sem `enum`, sem `namespace` com valor, sem propriedade no parâmetro do construtor). Imports na seção Imports. |

**Ainda em aberto (marca †):** `.columns.tsx` (biblioteca de tabela) e `.store.ts` (estado no navegador). Fecham na primeira feature que precisar deles.
