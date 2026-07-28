module.exports = {
  root: true,
  extends: ['eslint:recommended', 'eslint-config-prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prettier/prettier': 'error',
  },
};
