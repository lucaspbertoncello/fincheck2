# Working on Fincheck 2

Guide for coding agents and contributors. Fincheck 2 is a personal finance app: one user, runs only on a local Windows PC. What it does and how to run it from scratch: [README.md](README.md).

**File and folder naming:** [`docs/naming-and-folders.md`](docs/naming-and-folders.md). It overrides any other document, this one included.

## Packages

| Folder            | Name               | What it is                                                                    |
| ----------------- | ------------------ | ----------------------------------------------------------------------------- |
| `apps/api`        | `@fincheck/api`    | Hono API and jobs, SQLite database (Kysely + better-sqlite3)                  |
| `apps/web`        | `@fincheck/web`    | Front end: Vite, React 19, TanStack Router and Query, Tailwind v4, React Aria |
| `packages/shared` | `@fincheck/shared` | Contract: Zod schemas and types used by both the API and the web app          |
| `packages/ui`     | `@fincheck/ui`     | Design system: tokens, fonts and components (the only package with a barrel)  |

## Environment

- **pnpm 12** (pinned in `packageManager`). If another pnpm is installed, it switches to 12 on its own.
- **Node 26.13.0**, pinned in `.nvmrc`, `engines` and `devEngines`. pnpm downloads this Node for the project and runs every script with it, even if the machine has another one. So run everything through `pnpm` (`pnpm exec node`, never a bare `node`).
- **TypeScript 6.0.3**, not 7: `typescript-eslint` does not support 7 yet.
- Dependency build scripts only run when listed in `allowBuilds` (`pnpm-workspace.yaml`). Never `pnpm install --force`.

## Commands

All from the repository root.

| Command                                                    | What it does                                                                                                                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                             | Installs everything and sets up the Git hooks                                                                                                                                                       |
| `pnpm dev`                                                 | Starts the API (`127.0.0.1:3333`) and the web app (`127.0.0.1:5173`) together                                                                                                                       |
| `pnpm --filter @fincheck/web dev:mocks`                    | Starts only the web app; the Vite server answers `/api` with MSW                                                                                                                                    |
| `pnpm captures <folder>`                                   | Screenshots of every screen and modal (light and dark, 1280, 1440 and 375 px), with mocks and a fixed date; starts and stops its own server on `127.0.0.1`. Details in `apps/web/scripts/captures/` |
| `pnpm check`                                               | The whole pipeline: formatting, lint, types and tests                                                                                                                                               |
| `pnpm format`                                              | Formats everything with Prettier                                                                                                                                                                    |
| `pnpm lint` · `pnpm knip` · `pnpm typecheck` · `pnpm test` | Each pipeline step on its own                                                                                                                                                                       |
| `pnpm --filter <name> test`                                | The tests of a single package (`@fincheck/api`, `@fincheck/web`…)                                                                                                                                   |
| `pnpm --filter @fincheck/web build`                        | Production build of the web app (checks that it bundles; there is no deploy)                                                                                                                        |

## Pipeline

`pnpm check` runs, in this order, and stops at the first error:

1. `prettier --check .`
2. `eslint .` (type-aware)
3. `knip` (unused code, exports and dependencies; configured in `knip.json`)
4. `tsc --noEmit` in each package
5. `vitest run` in each package

Scale it to the change: documentation alone runs no tests; a web-only change skips the API tests. Say in your report what did not run.

What lint blocks (rules in `eslint.config.js`):

- **API layers** (`modules/<context>/<layer>/`): `http` → `application` → `domain`; `infra` implements the ports. `domain` imports no other layer, nor `database`, Kysely, Hono, Zod or `node:`. `http` imports neither `infra` nor `database`. Only `main` wires everything together.
- **Ownership between contexts:** a module never imports another module's `domain`, `infra` or `http`; only its `application` (a query to read, a use case to change).
- **Barrels** (`export * from`, `export { } from`) outside `packages/ui`.
- **Relative imports** in the apps: always `#/` (see "Imports" in the naming guide).
- **Web:** `src/` does not import `mocks/`; a View (`*.view.tsx`) does not import `#/domain`, `#/router`, TanStack Router or TanStack Query.
- **Web boundaries** (`fincheck/web-boundaries`): a feature does not import another feature; inside a feature, a screen does not import what lives inside another screen (only that screen's root file); `shared/` and `domain/` do not import features. Details in the naming guide.
- **`packages/ui` only draws:** it does not import `@fincheck/shared` or TanStack.

## Database

- SQLite in a single file: `apps/api/data/fincheck.db` (override with `DATABASE_FILE`). A backup is a copy of that file with the API stopped. The `data/` folder is not in Git.
- On startup, the API turns on WAL, foreign keys and `busy_timeout`, checks them with `PRAGMA`, and fails if any of them did not take.
- Migrations live in `apps/api/src/database/migrations/`, written by hand (`up` and `down`), named `YYYYMMDDHHmm-what-it-does.ts`. The API applies pending ones on startup. An applied migration is never edited: write a new one.
- Database tests use real SQLite in a temporary file (`#tests/support/database/create-test-database.util.ts`), never a mock.

## API and web

- The API only listens on `127.0.0.1`. Port in `API_PORT` (default 3333). Local variables go in `apps/api/.env` (not in Git), read when present.
- **Local token:** every route except `GET /health` requires the `X-Fincheck-Token` header (missing or wrong: 401 `LOCAL_TOKEN_INVALID`). The API reads the token from `LOCAL_TOKEN` or from the `local-token` file in the data folder (`apps/api/data/`, not in Git); with neither, it generates a random one and writes it there.
- The web app calls the API through `/api`, which Vite forwards to `127.0.0.1:<API_PORT>` without the prefix and **with `X-Fincheck-Token`**: the proxy reads the token the same way the API does (`LOCAL_TOKEN` or the `local-token` file next to the database, on every request), so the browser never holds it. The proxy only forwards requests whose `Host` is `127.0.0.1:5173` or `localhost:5173` and whose `Origin`, when present, is the same origin; anything else gets a 403 before reaching the API (CSRF, DNS rebinding). `dev:mocks` does not go through the proxy and accepts requests without a token.
- **Contract:** the schema lives in `packages/shared/src/<context>/<resource>/`. The API validates input with it (`validateRequest`, in `shared/http/`, which throws `ValidationError`); the web app calls through a thin client (`apiRequest`, in `apps/web/src/shared/api/`) that validates body, query and response with the same schemas. There is no `hono/client`: one path, and one error type (`ApiError`).
- **New API route:** a query or use case in `modules/<context>/application/<topic>/` → a framework-free controller and a `.route.ts` in `modules/<context>/http/<topic>/` → in `main/http/create-app.util.ts`, build the controller by hand and mount it with `.route()`. Use `/health` as the template.
- **Errors:** every intentional exception extends a family in `apps/api/src/shared/errors/` (`DomainError` 422, `NotFoundError` 404, `ConflictError` 409, `ValidationError` 400) with a stable `code`. `main/http/handle-error.util.ts` turns it into the body `{ code, message, details? }` (`@fincheck/shared/common/api-error/`); anything else becomes a generic 500. Business rules never throw an HTTP error or a bare `Error`.

## Git

- **Conventional Commits** in English: `type(scope): description`, scope required and lower-case, subject up to 72 characters. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **One task = one branch = one commit.** Branch name: `type/short-description`.
- The branch reaches `main` through a local squash merge, and `main` is pushed directly. There are no pull requests.
- No `Co-Authored-By` trailers.
- No `--force`, `rebase` or `amend` on a branch that was already pushed.
- Before each commit: `git branch --show-current`, `git log --oneline main..HEAD` and `git status`.

Hooks (set up by `pnpm install`, with `simple-git-hooks`):

| Hook         | What it does                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Refuses commits on `main`. The squash of an approved merge passes with `ALLOW_MAIN_COMMIT=1`                   |
| `commit-msg` | Checks the format with `commitlint` (`commitlint.config.js`), including the absence of `Co-Authored-By`        |
| `pre-push`   | Refuses pushes to `main` (it checks the target, not the current branch). An approved push: `ALLOW_MAIN_PUSH=1` |
