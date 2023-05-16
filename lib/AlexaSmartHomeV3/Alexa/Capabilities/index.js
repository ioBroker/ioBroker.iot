const capabilities = {};
const capabilitiesPath = require('path').join(__dirname);
const excludedNames = ['index', 'Base'];

require('fs')
    .readdirSync(capabilitiesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (!excludedNames.includes(name)) {
            capabilities[name] = require(`./${file}`);
        }
    });

module.exports = capabilities;