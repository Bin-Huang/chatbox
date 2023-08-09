module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],

    // plugins: ['@typescript-eslint'],
    rules: {
        // A temporary hack related to IDE not resolving correct package.json
        'import/no-extraneous-dependencies': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/jsx-filename-extension': 'off',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'import/no-import-module-exports': 'off',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-extra-semi': 'off',
    },
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
    },
}
