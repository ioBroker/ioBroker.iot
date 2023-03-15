const directives = {};
const directivesPath = require('path').join(__dirname);

require('fs')
    .readdirSync(directivesPath)
    .forEach((file) => {
        const name = file.replace(/\.js$/, '');
        if (name !== 'index' && name !== 'Base') {
            directives[name] = require(`./${file}`);
        }
    });

module.exports = directives;