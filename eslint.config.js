import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Rules from docs/naming-and-folders.md: layers and context ownership in apps/api, barrels only in
// packages/ui, the MVVM View and feature boundaries in apps/web, packages/ui that only draws, and
// the `#/` alias instead of relative imports in apps.

const API_SOURCE = /apps[\\/]api[\\/]src[\\/](.+)$/;
const MODULE_LAYERS = new Set(['domain', 'application', 'infra', 'http']);

// Which layer a path inside apps/api/src belongs to (`modules/<context>/<layer>/…`, or the
// top-level `shared`, `database`, `main`), and its context when it is inside a module.
const describeApiPath = (path) => {
  const [area, context, layer] = path.split(/[\\/]/);
  if (area === 'modules') {
    return { kind: MODULE_LAYERS.has(layer) ? layer : 'unknown', context };
  }
  return { kind: area, context: undefined };
};

// The dependency points inward: http → application → domain; infra implements the ports.
const ALLOWED_LAYERS = {
  domain: ['domain', 'shared'],
  application: ['domain', 'application', 'shared', 'database'],
  infra: ['domain', 'application', 'infra', 'shared', 'database'],
  http: ['domain', 'application', 'http', 'shared'],
  shared: ['shared'],
  database: ['database', 'shared'],
  main: ['domain', 'application', 'infra', 'http', 'shared', 'database', 'main'],
};

const FORBIDDEN_PACKAGES = {
  domain: /^(hono|@hono\/|kysely|better-sqlite3|zod|node:)/,
  application: /^(hono|@hono\/|better-sqlite3)/,
  http: /^(kysely|better-sqlite3)/,
  shared: /^(hono|@hono\/|kysely|better-sqlite3)/,
};

const apiBoundaries = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      relative: 'Use the `#/` alias instead of a relative import.',
      layer: 'Layer `{{from}}` cannot import from layer `{{to}}`.',
      package: 'Layer `{{from}}` cannot import `{{source}}`.',
      context:
        'Module `{{from}}` cannot import the `{{layer}}` of module `{{to}}`; read through its query and change through its use case.',
    },
  },
  create(context) {
    const match = API_SOURCE.exec(context.filename);
    if (!match) return {};
    const from = describeApiPath(match[1]);

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (source.startsWith('.')) {
          context.report({ node, messageId: 'relative' });
          return;
        }
        if (!source.startsWith('#/')) {
          if (FORBIDDEN_PACKAGES[from.kind]?.test(source)) {
            context.report({ node, messageId: 'package', data: { from: from.kind, source } });
          }
          return;
        }

        const to = describeApiPath(source.slice(2));
        if (!ALLOWED_LAYERS[from.kind]?.includes(to.kind)) {
          context.report({ node, messageId: 'layer', data: { from: from.kind, to: to.kind } });
          return;
        }
        const crossModule = from.context && to.context && from.context !== to.context;
        if (crossModule && to.kind !== 'application') {
          context.report({
            node,
            messageId: 'context',
            data: { from: from.context, to: to.context, layer: to.kind },
          });
        }
      },
    };
  },
};

const WEB_SOURCE = /apps[\\/]web[\\/]src[\\/](.+)$/;
// Folders of a feature context (`features/<context>/<type>/`) that every screen of that context
// shares. Any other folder under the context is a screen.
const CONTEXT_TYPE_FOLDERS = new Set([
  'components',
  'hooks',
  'constants',
  'types',
  'utils',
  'schemas',
  'stores',
]);

// A feature never reaches into another feature. Across contexts, nothing at all: what two contexts
// use goes up to `shared/` (or `domain/` when it is a rule). Inside one context, a screen uses the
// context folders (`hooks/`, `utils/`…) and may compose another screen only through a file at the
// root of that screen (its viewmodel or entry component), never through its internals.
// `shared/` and `domain/` never import a feature.
const webBoundaries = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      context:
        'Feature `{{from}}` cannot import from feature `{{to}}`; move what both use to `shared/` (or `domain/` for a rule).',
      screen:
        'Screen `{{from}}` cannot import the internals of screen `{{to}}`; move what both use to the context folders, or compose through a file at the root of `{{to}}`.',
      layer:
        '`{{from}}` cannot import a feature; features depend on `shared/` and `domain/`, not the reverse.',
    },
  },
  create(context) {
    const match = WEB_SOURCE.exec(context.filename);
    if (!match) return {};
    const [area, fromContext, fromScreen] = match[1].split(/[\\/]/);

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!source.startsWith('#/features/')) return;
        if (area === 'shared' || area === 'domain') {
          context.report({ node, messageId: 'layer', data: { from: area } });
          return;
        }
        if (area !== 'features') return;

        const [toContext, toScreen, ...rest] = source.slice('#/features/'.length).split('/');
        if (toContext !== fromContext) {
          context.report({
            node,
            messageId: 'context',
            data: { from: fromContext, to: toContext },
          });
          return;
        }
        const sameScreen = toScreen === fromScreen;
        const contextFolder = CONTEXT_TYPE_FOLDERS.has(toScreen);
        const screenRoot = rest.length === 1;
        if (!sameScreen && !contextFolder && !screenRoot) {
          context.report({
            node,
            messageId: 'screen',
            data: { from: `${fromContext}/${fromScreen}`, to: `${toContext}/${toScreen}` },
          });
        }
      },
    };
  },
};

const fincheck = { rules: { 'api-boundaries': apiBoundaries, 'web-boundaries': webBoundaries } };

const RELATIVE_IMPORTS = {
  group: ['./*', '../*'],
  message: 'Use the `#/` alias instead of a relative import.',
};
const MOCKS_FROM_SOURCE = {
  group: ['#mocks/*', '**/mocks/*'],
  message: 'The app never imports the network mocks.',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.claude/**',
      'apps/web/src/router/route-tree.gen.ts',
      'apps/web/public/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // Type-only namespaces are the project pattern; erasableSyntaxOnly already blocks runtime ones.
      '@typescript-eslint/no-namespace': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Barrels exist only in packages/ui. Import the real file.',
        },
        {
          selector: 'ExportNamedDeclaration[source]',
          message: 'Barrels exist only in packages/ui. Import the real file.',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/ui/src/**/index.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    plugins: { fincheck },
    rules: { 'fincheck/api-boundaries': 'error' },
  },
  {
    files: ['apps/api/tests/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [RELATIVE_IMPORTS] }] },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/web/{tests,mocks}/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [RELATIVE_IMPORTS] }] },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { fincheck },
    rules: {
      'no-restricted-imports': ['error', { patterns: [RELATIVE_IMPORTS, MOCKS_FROM_SOURCE] }],
      // Warning until the structural cleanup removes the existing cases; then it becomes an error.
      'fincheck/web-boundaries': 'warn',
    },
  },
  {
    // The design system only draws: no contract, no data cache, no router.
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fincheck/shared', '@fincheck/shared/*', '@tanstack/*'],
              message:
                'packages/ui only draws: it receives data and texts ready by props, without the contract, cache or router.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.view.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            RELATIVE_IMPORTS,
            MOCKS_FROM_SOURCE,
            {
              group: [
                '#/domain/*',
                '#/router/*',
                '@tanstack/react-query',
                '@tanstack/react-router',
              ],
              message: 'The View only draws props and emits actions; the ViewModel wires the rest.',
            },
          ],
        },
      ],
    },
  },
);
