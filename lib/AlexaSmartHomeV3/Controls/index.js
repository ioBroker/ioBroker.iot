const controls = {};
const capabilitiesPath = require('path').join(__dirname);
const excludedNames = ['index', 'Control'];
require('fs')
    .readdirSync(capabilitiesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (!excludedNames.includes(name)) {
            controls[name] = require(`./${file}`);
        }
    });

module.exports = controls;