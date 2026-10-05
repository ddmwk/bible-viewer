import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';
export default [{
  ignores: ['dist/**']
}, {
  files: ['**/*.{js,jsx}'],
  ...js.configs.recommended,
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    }
  },
  rules: {
    ...js.configs.recommended.rules,
    'no-unused-vars': ['error', {
      varsIgnorePattern: '^[A-Z_]'
    }]
  }
}, hooks.configs.flat.recommended, refresh.configs.vite, {
  rules: {
    'no-unused-vars': ['error', {
      varsIgnorePattern: '^[A-Z_]',
      argsIgnorePattern: '^[A-Z_]'
    }]
  }
}];
