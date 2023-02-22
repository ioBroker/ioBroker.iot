/*!
 * ioBroker gulpfile
 * Date: 2023-02-22
 */
'use strict';

const gulp      = require('gulp');
const fs        = require('fs');
const fileName  = 'words.js';
const EMPTY     = '';
const cp        = require('child_process');

const languages = {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    uk: {},
    'zh-cn': {},
};

function deleteFoldersRecursive(path, exceptions) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = fs.statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                fs.rmdirSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
    }
}

function lang2data(lang, isFlat) {
    let str = isFlat ? '' : '{\n';
    let count = 0;
    for (const w in lang) {
        if (lang.hasOwnProperty(w)) {
            count++;
            if (isFlat) {
                str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
            } else {
                const key = '    "' + w.replace(/"/g, '\\"') + '": ';
                str += key + '"' + lang[w].replace(/"/g, '\\"') + '",\n';
            }
        }
    }
    if (!count)
        return isFlat ? '' : '{\n}';
    if (isFlat) {
        return str;
    } else {
        return str.substring(0, str.length - 2) + '\n}';
    }
}

function readWordJs(src) {
    try {
        let words;
        if (fs.existsSync(src + 'js/' + fileName)) {
            words = fs.readFileSync(src + 'js/' + fileName).toString();
        } else {
            words = fs.readFileSync(src + fileName).toString();
        }
        words = words.substring(words.indexOf('{'), words.length);
        words = words.substring(0, words.lastIndexOf(';'));

        const resultFunc = new Function('return ' + words + ';');

        return resultFunc();
    } catch (e) {
        return null;
    }
}

function padRight(text, totalLength) {
    return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}

function writeWordJs(data, src) {
    let text = '';
    text += '/*global systemDictionary:true */\n';
    text += '\'use strict\';\n\n';
    text += 'systemDictionary = {\n';
    for (const word in data) {
        if (data.hasOwnProperty(word)) {
            text += '    ' + padRight('"' + word.replace(/"/g, '\\"') + '": {', 50);
            let line = '';
            for (const lang in data[word]) {
                if (data[word].hasOwnProperty(lang)) {
                    line += '"' + lang + '": "' + padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50) + ' ';
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '},\n';
        }
    }
    text += '};';
    if (fs.existsSync(src + 'js/' + fileName)) {
        fs.writeFileSync(src + 'js/' + fileName, text);
    } else {
        fs.writeFileSync(src + '' + fileName, text);
    }
}

function words2languages(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const l in langs) {
            if (!langs.hasOwnProperty(l))
                continue;
            const keys = Object.keys(langs[l]);
            keys.sort();
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            if (!fs.existsSync(src + 'i18n/' + l)) {
                fs.mkdirSync(src + 'i18n/' + l);
            }

            fs.writeFileSync(src + 'i18n/' + l + '/translations.json', lang2data(obj));
        }
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}

function words2languagesFlat(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        keys.sort();
        for (const l in langs) {
            if (!langs.hasOwnProperty(l))
                continue;
            const obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll))
                continue;
            if (!fs.existsSync(src + 'i18n/' + ll)) {
                fs.mkdirSync(src + 'i18n/' + ll);
            }

            fs.writeFileSync(src + 'i18n/' + ll + '/flat.txt', lang2data(langs[ll], langs.en));
        }
        fs.writeFileSync(src + 'i18n/flat.txt', keys.join('\n'));
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}

function languagesFlat2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b)
                return 1;
            if (a < b)
                return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB)
                return 1;
            if (posA < posB)
                return -1;
            return 0;
        }
    });
    const keys = fs.readFileSync(src + 'i18n/flat.txt').toString().split('\n');

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt')
            continue;
        const lang = dirs[l];
        const values = fs.readFileSync(`${src}i18n/${lang}/flat.txt`).toString().split('\n');
        langs[lang] = {};
        keys.forEach(function (word, i) {
            langs[lang][word] = values[i];
        });

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1)
                        return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

function languages2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort(function (a, b) {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b)
                return 1;
            if (a < b)
                return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB)
                return 1;
            if (posA < posB)
                return -1;
            return 0;
        }
    });
    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt')
            continue;
        const lang = dirs[l];
        langs[lang] = fs.readFileSync(src + 'i18n/' + lang + '/translations.json').toString();
        langs[lang] = JSON.parse(langs[lang]);
        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w];
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1)
                        return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

//TASKS

gulp.task('adminWords2languages', done => {
    words2languages('./admin/');
    done();
});

gulp.task('adminWords2languagesFlat', done => {
    words2languagesFlat('./admin/');
    done();
});

gulp.task('adminLanguagesFlat2words', done => {
    languagesFlat2words('./admin/');
    done();
});

gulp.task('adminLanguages2words', done => {
    languages2words('./admin/');
    done();
});

gulp.task('clean', done => {
    deleteFoldersRecursive(`${__dirname}/admin`, ['actions.js', 'alexalogo.png', 'blockly.js', 'iot.png']);
    done();
});

function npmInstall() {
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = __dirname.replace(/\\/g, '/') + '/src/';

        const cmd = `npm install -f`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        const exec = require('child_process').exec;
        const child = exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

gulp.task('2-npm', () => {
    if (fs.existsSync(`${__dirname}/src/node_modules`)) {
        return Promise.resolve();
    } else {
        return npmInstall();
    }
});

gulp.task('2-npm-dep', gulp.series('clean', '2-npm'));

function build() {
    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe',
            cwd:   `${__dirname}/src/`
        };

        const version = JSON.parse(fs.readFileSync(__dirname + '/package.json').toString('utf8')).version;
        const data = JSON.parse(fs.readFileSync(__dirname + '/src/package.json').toString('utf8'));
        data.version = version;
        fs.writeFileSync(__dirname + '/src/package.json', JSON.stringify(data, null, 4));

        console.log(options.cwd);

        let script = `${__dirname}/src/node_modules/react-scripts/scripts/build.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/react-scripts/scripts/build.js`;
        }
        if (!fs.existsSync(script)) {
            console.error('Cannot find execution file: ' + script);
            reject('Cannot find execution file: ' + script);
        } else {
            const child = cp.fork(script, [], options);
            child.stdout.on('data', data => console.log(data.toString()));
            child.stderr.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

gulp.task('3-build', () => build());

gulp.task('3-build-dep', gulp.series('2-npm-dep', '3-build'));

gulp.task('5-copy', () =>
    gulp.src(['src/build/*/**', 'src/build/*'])
        .pipe(gulp.dest('admin/')));

gulp.task('5-copy-dep', gulp.series('3-build-dep', '5-copy'));

gulp.task('6-patch', () => new Promise(resolve => {
    if (fs.existsSync(`${__dirname}/admin/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/admin/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.unlinkSync(`${__dirname}/admin/index.html`);
        fs.writeFileSync(`${__dirname}/admin/index_m.html`, code);
    }
    if (fs.existsSync(`${__dirname}/src/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src/build/index.html`).toString('utf8');
        code = code.replace(/<script>var script=document\.createElement\("script"\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.writeFileSync(`${__dirname}/src/build/index.html`, code);
    }
    resolve();
}));

gulp.task('6-patch-dep',  gulp.series('5-copy-dep', '6-patch'));

gulp.task('default', gulp.series('6-patch-dep'));
