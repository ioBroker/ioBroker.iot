const CracoEsbuildPlugin = require('craco-esbuild');
const { ProvidePlugin } = require('webpack');
const cracoModuleFederation = require('@iobroker/adapter-react-v5/craco-module-federation');

module.exports = {
    plugins: [
        { plugin: CracoEsbuildPlugin },
        { plugin: cracoModuleFederation, options: { useNamedChunkIds: true } }],
    webpack: {
        output: {
            publicPath: 'auto',
        },
        plugins: [
            new ProvidePlugin({
                React: 'react',
            }),
        ],
        configure: webpackConfig => {
            webpackConfig.output.publicPath = 'auto';
            return webpackConfig;
        },
    },
};
