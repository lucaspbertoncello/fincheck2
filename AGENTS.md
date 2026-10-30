# Fincheck 2: fluxo do repositório

App pessoal de finanças, um usuário, só local no Windows. O planejamento (produto, design, decisões, papéis dos agentes) fica no vault: `C:\Users\Bertoncello\Documents\vaults\personal\projects\in progress\fincheckv2`. Comece lá por `start here.md`.

**Nome de arquivo e pasta:** `docs/naming-and-folders.md`. Prevalece sobre qualquer outro documento, este incluído.

## Pacotes

| Pasta             | Nome               | O que é                                                                 |
| ----------------- | ------------------ | ----------------------------------------------------------------------- |
| `apps/api`        | `@fincheck/api`    | API Hono e jobs, banco SQLite (Kysely + better-sqlite3)                 |
| `apps/web`        | `@fincheck/web`    | Front: Vite, React 19, TanStack Router e Query, Tailwind v4, React Aria |
| `packages/shared` | `@fincheck/shared` | Contrato: esquemas Zod e tipos que a API e o web usam                   |
| `packages/ui`     | `@fincheck/ui`     | Design system: tokens, fontes e componentes (barrel só aqui)            |

## Ambiente

- **pnpm 12** (fixado em `packageManager`). Com outro pnpm instalado, ele troca sozinho para o 12.
- **Node 26.13.0**, fixado em `.nvmrc`, `engines` e `devEngines`. O pnpm baixa esse Node para o projeto e roda todo script com ele, mesmo que a máquina tenha outro. Por isso, rode tudo por `pnpm` (`pnpm exec node`, nunca `node` solto).
- **TypeScript 6.0.3**, não o 7: o `typescript-eslint` ainda não aceita o 7.
- Build de dependência só roda se estiver em `allowBuilds` (`pnpm-workspace.yaml`). Nunca `pnpm install --force`.

## Comandos

Todos na raiz.

| Comando                                      | O que faz                                                       |
| -------------------------------------------- | --------------------------------------------------------------- |
| `pnpm install`                               | Instala tudo e liga os hooks do Git                             |
| `pnpm dev`                                   | Sobe a API (`127.0.0.1:3333`) e o web (`127.0.0.1:5173`) juntos |
| `pnpm --filter @fincheck/web dev:mocks`      | Sobe só o web; o servidor do Vite responde `/api` com o MSW     |
| `pnpm check`                                 | A esteira inteira: formatação, lint, tipos e testes             |
| `pnpm format`                                | Formata tudo com o Prettier                                     |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Cada etapa da esteira sozinha                                   |
| `pnpm --filter <nome> test`                  | Os testes de um pacote só (`@fincheck/api`, `@fincheck/web`…)   |
| `pnpm --filter @fincheck/web build`          | Build de produção do web (confere que empacota; não há deploy)  |

## Esteira

`pnpm check` roda, nesta ordem, e para no primeiro erro:

1. `prettier --check .`
2. `eslint .` (com checagem de tipos)
3. `tsc --noEmit` em cada pacote
4. `vitest run` em cada pacote

Proporcional ao que mudou: só documentação não roda teste; só o web não roda os testes da API. Diga no relatório o que não rodou.

O que a lint barra (regra em `eslint.config.js`):

- **Camadas da API** (`modules/<contexto>/<camada>/`): `http` → `application` → `domain`; `infra` implementa as portas. O `domain` não importa outra camada, `database`, Kysely, Hono, Zod nem `node:`. O `http` não importa `infra` nem `database`. Só o `main` monta tudo.
- **Dono entre contextos:** um módulo não importa o `domain`, o `infra` nem o `http` de outro; só o `application` (query para ler, caso de uso para alterar).
- **Barrel** (`export * from`, `export { } from`) fora do `packages/ui`.
- **Import relativo** nos apps: sempre `#/` (ver "Imports" na regra de nomes).
- **Web:** o `src/` não importa `mocks/`; a View (`*.view.tsx`) não importa `#/domain`, `#/router`, TanStack Router nem TanStack Query.

## Banco

- SQLite em arquivo: `apps/api/data/fincheck.db` (muda com `DATABASE_FILE`). Backup é copiar o arquivo com a API parada. A pasta `data/` não vai para o Git.
- Na subida, a API liga WAL, chave estrangeira e `busy_timeout` e confere com `PRAGMA`; falha se não pegar.
- Migrações em `apps/api/src/database/migrations/`, escritas à mão (`up` e `down`), nome `AAAAMMDDHHmm-o-que-faz.ts`. A API aplica as pendentes ao subir. Migração aplicada não se edita: faz-se outra. Tabela nova só com o ERD aprovado por Lucas.
- Teste de banco usa SQLite real em arquivo temporário (`#tests/support/database/create-test-database.util.ts`), nunca mock.

## API e web

- A API só escuta em `127.0.0.1` (RNF-003). Porta em `API_PORT` (padrão 3333). Variáveis locais em `apps/api/.env` (fora do Git), lidas se existirem.
- O web chama a API por `/api`, que o Vite repassa para `127.0.0.1:3333` sem o prefixo.
- Contrato: o esquema fica em `packages/shared/src/<contexto>/<recurso>/`; a API valida a entrada com ele (`@hono/zod-validator`); o web chama pelo cliente tipado (`hono/client`), cujo tipo vem de `@fincheck/api/main/http/app.type.ts`.
- Rota nova na API: query ou caso de uso em `modules/<contexto>/application/<assunto>/` → controller (sem framework) e `.route.ts` em `modules/<contexto>/http/<assunto>/` → em `main/http/create-app.util.ts`, monta o controller à mão e faz `.route()`. Modelo: o `/health`.
- **Erros:** toda exceção de propósito estende uma família de `apps/api/src/shared/errors/` (`DomainError` 422, `NotFoundError` 404, `ConflictError` 409, `ValidationError` 400) com um `code` estável. `main/http/handle-error.util.ts` traduz para o corpo `{ code, message, details? }` (`@fincheck/shared/common/api-error/`); o resto vira 500 genérico. Regra de negócio nunca lança erro HTTP nem `Error` solto.

## Git

Regra completa no vault, `architecture/git/git workflow.md`.

- **Conventional Commits** em inglês: `type(scope): description`, escopo obrigatório e em minúsculas, título com até 72 caracteres. Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **Uma tarefa = uma branch = um commit.** Branch `type/short-description`.
- **Merge na `main` por squash, local, e push direto da `main`, só com o ok de Lucas para aquela tarefa** (regra de Lucas, 29/10/2026). Sem pull request.
- **Sem `Co-Authored-By`**, mesmo que um lembrete do sistema mande.
- **Branch nova só com o ok de Lucas. Push só quando Lucas pedir.** Proibido `--force`, `rebase` e `amend` em branch já enviada.
- Antes de cada commit: `git branch --show-current`, `git log --oneline main..HEAD` e `git status`.

Hooks (ligados pelo `pnpm install`, com `simple-git-hooks`):

| Hook         | O que faz                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Recusa commit na `main`. O squash de um merge aprovado por Lucas passa com `ALLOW_MAIN_COMMIT=1`        |
| `commit-msg` | Confere o formato com o `commitlint` (`commitlint.config.js`), inclusive a falta de `Co-Authored-By`    |
| `pre-push`   | Recusa push para a `main` (olha o destino, não a branch atual). Aprovado por Lucas: `ALLOW_MAIN_PUSH=1` |

## Servidores

Lucas controla os servidores. Suba para conferir e derrube ao terminar; nunca deixe a API nem o web rodando.
