import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        languageOptions: {
            parserOptions: {
                allowDefaultProject: {
                    allow: ['*.js', '*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
                project: './tsconfig.json',
            },
        },
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
        },
    },
    {
        ignores: [
            'build-backend/**/*',
            'lib/AlexaSmartHomeV3/*.js',
            'admin/**/*',
            'lib/AlexaSmartHomeV3/*.js',
            'test/**/*',
            'src-admin/**/*',
            'src-rules/**/*'
        ],
    },
];
