const controls = {};
const controlsPath = require('path').join(__dirname);
const excludedNames = ['index', 'Control'];

require('fs')
    .readdirSync(controlsPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (!excludedNames.includes(name)) {
            controls[name] = require(`./${file}`);
        }
    });

module.exports = controls;