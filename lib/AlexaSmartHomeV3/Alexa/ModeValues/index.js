const modes = {};
const modesPath = require('path').join(__dirname);
const excludedNames = ['index', 'Base'];

require('fs')
    .readdirSync(modesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (!excludedNames.includes(name)) {
            modes[name] = require(`./${file}`);
        }
    });

module.exports = modes;