// Git rules from AGENTS.md: Conventional Commits with a required lower-case scope,
// a subject of 72 characters at most, and no Co-Authored-By trailer.
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'no-co-author': ({ raw }) => [
          !/^co-authored-by:/im.test(raw ?? ''),
          'Co-Authored-By is not allowed in this repository',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'refactor', 'test', 'chore']],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
    'no-co-author': [2, 'always'],
  },
};
