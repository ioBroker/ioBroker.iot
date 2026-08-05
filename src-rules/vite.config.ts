import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import { federation } from '@module-federation/vite';

const makeShared = pkgs => {
    const result = {};
    pkgs.forEach(packageName => {
        result[packageName] = {
            requiredVersion: '*',
            singleton: true,
        };
    });
    return result;
};

const config = {
    plugins: [
        federation({
            manifest: true,
            name: 'ActionVisu',
            filename: 'customRuleBlocks.js',
            exposes: {
                './ActionVisu': './src/ActionVisu.tsx',
            },
            remotes: {},
            shared: makeShared(['react', '@iobroker/gui-components', 'react-dom']),
        }),
        react(),
        commonjs(),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3000,
    },
    base: './',
    build: {
        target: 'chrome89',
        outDir: './build',
    },
};

export default config;
