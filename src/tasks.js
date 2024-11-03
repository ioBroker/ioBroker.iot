/**
 * Copyright 2018-2024 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
const { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync } = require('node:fs');

const dir = `${__dirname}/src/i18n/`;

if (process.argv.includes('--i18n=>flat')) {
    const files = readdirSync(dir).filter(name => name.match(/\.json$/));
    const index = {};
    const langs = [];
    files.forEach(file => {
        const lang = file.replace(/\.json$/, '');
        langs.push(lang);
        const text = require(dir + file);

        for (const id in text) {
            if (text.hasOwnProperty(id)) {
                index[id] = index[id] || {};
                index[id][lang] = text[id] === undefined ? id : text[id];
            }
        }
    });

    const keys = Object.keys(index);
    keys.sort();

    if (!existsSync(`${dir}/flat/`)) {
        mkdirSync(`${dir}/flat/`);
    }

    langs.forEach(lang => {
        const words = [];
        keys.forEach(key => words.push(index[key][lang]));
        writeFileSync(`${dir}/flat/${lang}.txt`, words.join('\n'));
    });
    writeFileSync(`${dir}/flat/index.txt`, keys.join('\n'));
}

if (process.argv.includes('--flat=>i18n')) {
    if (!existsSync(`${dir}/flat/`)) {
        console.error(`${dir}/flat/ directory not found`);
        return;
    }
    const keys = readFileSync(`${dir}/flat/index.txt`)
        .toString()
        .split(/[\r\n]/);
    while (!keys[keys.length - 1]) keys.splice(keys.length - 1, 1);

    const files = readdirSync(`${dir}/flat/`).filter(name => name.match(/\.txt$/) && name !== 'index.txt');
    const index = {};
    const langs = [];
    files.forEach(file => {
        const lang = file.replace(/\.txt$/, '');
        langs.push(lang);
        const lines = readFileSync(`${dir}/flat/${file}`)
            .toString()
            .split(/[\r\n]/);
        lines.forEach((word, i) => {
            index[keys[i]] = index[keys[i]] || {};
            index[keys[i]][lang] = word;
        });
    });
    langs.forEach(lang => {
        const words = {};
        keys.forEach((key, line) => {
            if (!index[key]) {
                console.log(`No word ${key}, ${lang}, line: ${line}`);
            }
            words[key] = index[key][lang];
        });
        writeFileSync(`${dir}/${lang}.json`, JSON.stringify(words, null, 2));
    });
}
