/*!
 * ioBroker tasks file for tasks like build, clean, etc.
 * Date: 2025-05-31
 */
'use strict';

const { existsSync, renameSync, copyFileSync } = require('node:fs');
const { buildReact, copyFiles, deleteFoldersRecursive, npmInstall, patchHtmlFile } = require('@iobroker/build-tools');

function copyBackend() {
    copyFileSync(`${__dirname}/src/lib/alexaSmartHomeV2.js`, `${__dirname}/build-backend/lib/alexaSmartHomeV2.js`);
    copyFileSync(`${__dirname}/src/lib/alisa.js`, `${__dirname}/build-backend/lib/alisa.js`);
    copyFileSync(`${__dirname}/src/lib/googleHome.js`, `${__dirname}/build-backend/lib/googleHome.js`);
}

function cleanRules() {
    deleteFoldersRecursive(`${__dirname}/admin/rules`);
    deleteFoldersRecursive(`${__dirname}/src-rules/build`);
}

function copyRules() {
    copyFiles(
        ['src-rules/build/**/*', '!src-rules/build/index.html', '!src-rules/build/mf-manifest.json'],
        'admin/rules',
    );
    copyFiles(['src-rules/src/i18n/*.json'], 'admin/rules/i18n');
}

function clean() {
    deleteFoldersRecursive(`${__dirname}/admin`, [
        'actions.js',
        'alexalogo.png',
        'blockly.js',
        'iot.png',
        'iot.svg',
        'rules',
    ]);
}
if (process.argv.find(arg => arg === '--rules-0-clean')) {
    cleanRules();
} else if (process.argv.find(arg => arg === '--rules-1-npm')) {
    npmInstall('./src-rules/').catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--rules-2-compile')) {
    buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, vite: true }).catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--rules-3-copy')) {
    copyRules();
} else if (process.argv.find(arg => arg === '--rules-build')) {
    cleanRules();
    npmInstall('./src-rules/')
        .then(() => buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, vite: true }))
        .then(() => copyRules())
        .catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--0-clean')) {
    clean();
} else if (process.argv.find(arg => arg === '--1-npm')) {
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmInstall('./src-admin/').catch(error => console.error(error));
    }
} else if (process.argv.find(arg => arg === '--2-build')) {
    buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, vite: true }).catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--3-copy')) {
    copyFiles(['src-admin/build/*/**', 'src-admin/build/*'], 'admin/');
} else if (process.argv.find(arg => arg === '--4-patch')) {
    patchHtmlFile(`${__dirname}/admin/index.html`).then(() =>
        patchHtmlFile(`${__dirname}/src-admin/build/index.html`)
            .then(() => {
                if (existsSync(`${__dirname}/admin/index.html`)) {
                    renameSync(`${__dirname}/admin/index.html`, `${__dirname}/admin/index_m.html`);
                }
            })
            .catch(error => console.error(error)),
    );
} else if (process.argv.find(arg => arg === '--build-admin')) {
    clean();
    let npmPromise;
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmPromise = npmInstall('./src-admin/').catch(error => console.error(error));
    } else {
        npmPromise = Promise.resolve();
    }
    npmPromise
        .then(() => buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, vite: true }))
        .then(() => copyFiles(['src-admin/build/**/*', 'src/build/*'], 'admin/'))
        .then(() => patchHtmlFile(`${__dirname}/admin/index.html`))
        .then(() => {
            if (existsSync(`${__dirname}/admin/index.html`)) {
                renameSync(`${__dirname}/admin/index.html`, `${__dirname}/admin/index_m.html`);
            }
        })
        .catch(error => console.error(error));
} else if (process.argv.includes('--backend')) {
    copyBackend();
} else {
    clean();
    let installPromise;
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        installPromise = npmInstall('./src-admin/').catch(error => console.error(error));
    } else {
        installPromise = Promise.resolve();
    }
    installPromise
        .then(() => buildReact(`${__dirname}/src-admin/`, { rootDir: __dirname, vite: true }))
        .then(() => copyFiles(['src-admin/build/**/*', 'src-admin/build/*'], 'admin/'))
        .then(() => patchHtmlFile(`${__dirname}/admin/index.html`))
        .then(() => {
            if (existsSync(`${__dirname}/admin/index.html`)) {
                renameSync(`${__dirname}/admin/index.html`, `${__dirname}/admin/index_m.html`);
            }
        })
        .then(() => cleanRules())
        .then(() => npmInstall('./src-rules/'))
        .then(() => buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, vite: true }))
        .then(() => copyRules());
}
