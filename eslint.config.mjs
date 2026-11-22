import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
    { ignores: ['**/node_modules/**', '**/dist/**'] },
    js.configs.recommended,
    {
        files: ['app/server/**/*.js', 'ecosystem.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
    {
        files: ['app/server/test/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.node },
        },
    },
    {
        files: ['app/client/**/*.{js,jsx}'],
        plugins: { react, 'react-hooks': reactHooks },
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.browser },
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,
            'react/prop-types': 'off',
        },
    },
    {
        files: ['app/client/*.config.{js,cjs}'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
        },
    },
    prettier,
];
