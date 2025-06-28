import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        files: ['**/*.js'],
        // allow to use e.g. @typedef in js files
        rules: {
            'jsdoc/check-tag-names': ['warn', { typed: false }],
        },
    },
];
