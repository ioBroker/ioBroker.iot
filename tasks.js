/*!
 * ioBroker tasks file for tasks like build, clean, etc.
 * Date: 2024-09-16
 */
'use strict';

const { existsSync, renameSync } = require('node:fs');
const { buildReact, copyFiles, deleteFoldersRecursive, npmInstall, patchHtmlFile } = require('@iobroker/build-tools');

function cleanRules() {
    deleteFoldersRecursive(`${__dirname}/admin/rules`);
    deleteFoldersRecursive(`${__dirname}/src-rules/build`);
}

function copyRules() {
    copyFiles(['src-rules/build/*.js'], 'admin/rules');
    copyFiles(['src-rules/build/*.map'], 'admin/rules');
    copyFiles(['src-rules/build/asset-manifest.json'], 'admin/rules');
    copyFiles(
        [
            'src-rules/build/static/**/*',
            '!src-rules/build/static/media/*.svg',
            '!src-rules/build/static/media/*.txt',
            '!src-rules/build/static/js/vendors*.js',
            '!src-rules/build/static/js/vendors*.map',
        ],
        'admin/rules/static',
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
    buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, craco: true }).catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--rules-3-copy')) {
    copyRules();
} else if (process.argv.find(arg => arg === '--rules-build')) {
    cleanRules();
    npmInstall('./src-rules/')
        .then(() => buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, craco: true }))
        .then(() => copyRules())
        .catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--0-clean')) {
    clean();
} else if (process.argv.find(arg => arg === '--1-npm')) {
    if (!existsSync(`${__dirname}/src/node_modules`)) {
        npmInstall('./src/').catch(error => console.error(error));
    }
} else if (process.argv.find(arg => arg === '--2-build')) {
    buildReact(`${__dirname}/src/`, { rootDir: __dirname, vite: true }).catch(error => console.error(error));
} else if (process.argv.find(arg => arg === '--3-copy')) {
    copyFiles(['src/build/*/**', 'src/build/*'], 'admin/');
} else if (process.argv.find(arg => arg === '--4-patch')) {
    patchHtmlFile(`${__dirname}/admin/index.html`).then(() =>
        patchHtmlFile(`${__dirname}/src/build/index.html`)
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
    if (!existsSync(`${__dirname}/src/node_modules`)) {
        npmPromise = npmInstall('./src/').catch(error => console.error(error));
    } else {
        npmPromise = Promise.resolve();
    }
    npmPromise
        .then(() => buildReact(`${__dirname}/src/`, { rootDir: __dirname, vite: true }))
        .then(() => copyFiles(['src/build/*/**', 'src/build/*'], 'admin/'))
        .then(() => patchHtmlFile(`${__dirname}/admin/index.html`))
        .then(() => {
            if (existsSync(`${__dirname}/admin/index.html`)) {
                renameSync(`${__dirname}/admin/index.html`, `${__dirname}/admin/index_m.html`);
            }
        })
        .catch(error => console.error(error));
} else {
    clean();
    let installPromise;
    if (!existsSync(`${__dirname}/src/node_modules`)) {
        installPromise = npmInstall('./src/').catch(error => console.error(error));
    } else {
        installPromise = Promise.resolve();
    }
    installPromise
        .then(() => buildReact(`${__dirname}/src/`, { rootDir: __dirname, vite: true }))
        .then(() => copyFiles(['src/build/*/**', 'src/build/*'], 'admin/'))
        .then(() => patchHtmlFile(`${__dirname}/admin/index.html`))
        .then(() => {
            if (existsSync(`${__dirname}/admin/index.html`)) {
                renameSync(`${__dirname}/admin/index.html`, `${__dirname}/admin/index_m.html`);
            }
        })
        .then(() => cleanRules())
        .then(() => npmInstall('./src-rules/'))
        .then(() => buildReact(`${__dirname}/src-rules/`, { rootDir: __dirname, craco: true }))
        .then(() => copyRules());
}
