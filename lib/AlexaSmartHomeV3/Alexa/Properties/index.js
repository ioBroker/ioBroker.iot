const properties = {};
const propertiesPath = require('path').join(__dirname);
const excludedNames = ['index'];

require('fs')
    .readdirSync(propertiesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (!excludedNames.includes(name)) {
            properties[name] = require(`./${file}`);
        }
    });

module.exports = properties;