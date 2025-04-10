import globals from 'globals';
import js from '@eslint/js';
import tsEsLint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tsEsLint.config(
    js.configs.recommended,
    tsEsLint.configs.recommendedTypeChecked,
    prettierRecommended,
    {
        rules: {
            curly: ['error', 'all'],
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                // ...globals.mocha,
            },
            sourceType: 'module',
            parserOptions: {
                project: 'tsconfig.json',
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    }
);
