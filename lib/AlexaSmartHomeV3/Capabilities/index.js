const capabilities = {};
const capabilitiesPath = require('path').join(__dirname);

require('fs')
    .readdirSync(capabilitiesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (name !== 'index' && name !== 'Base') {
            capabilities[name] = require(`./${file}`);
        }
    });

module.exports = capabilities;