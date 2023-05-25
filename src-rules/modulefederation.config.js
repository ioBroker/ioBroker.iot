const makeShared = pkgs => {
    const result = {};
    pkgs.forEach(
        packageName => {
            result[packageName] = {
                requiredVersion: '*',
                singleton: true,
            };
        },
    );
    return result;
};

module.exports = {
    name: 'ActionVisu',
    filename: 'customRuleBlocks.js',
    exposes: {
        './ActionVisu': './src/ActionVisu.jsx',
    },
    shared: makeShared([
        'react', '@iobroker/adapter-react-v5', 'react-dom', 'prop-types'
    ])
};
