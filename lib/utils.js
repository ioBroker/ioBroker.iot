'use strict';

var controllerDir;
var appName;

function getAppName() {
    var parts = __dirname.replace(/\\/g, '/').split('/');
    return parts[parts.length - 2].split('.')[0];
}

// Get js-controller directory to load libs
function getControllerDir(isInstall) {
    // Find the js-controller location
    var possibilities = [
        appName.toLowerCase() + '.js-controller',
        appName + '.js-controller'
    ];

    /** @type {string} */
    var controllerPath;
    for (var i = 0; i < possibilities.length; i++) {
        try {
            controllerPath = require.resolve(possibilities[i]);
            break;
        } catch (e) { /* not found */ }
    }

    if (!controllerPath) {
        if (!isInstall) {
            console.log('Cannot find js-controller');
            process.exit(10);
        } else {
            process.exit();
        }
        return null; // inactive
    } else {
        var parts = controllerPath.split(/[\\\/]/g);
        parts.pop();
        return parts.join('/');
    }
}

// Read controller configuration file
function getConfig() {
    var fs = require('fs');
    if (fs.existsSync(controllerDir + '/conf/' + appName + '.json')) {
        return JSON.parse(fs.readFileSync(controllerDir + '/conf/' + appName + '.json', 'utf8'));
    } else if (fs.existsSync(controllerDir + '/conf/' + appName.toLowerCase() + '.json')) {
        return JSON.parse(fs.readFileSync(controllerDir + '/conf/' + appName.toLowerCase() + '.json', 'utf8'));
    } else {
        throw new Error('Cannot find ' + controllerDir + '/conf/' + appName + '.json');
    }
}
appName       = getAppName();
controllerDir = getControllerDir(typeof process !== 'undefined' && process.argv && process.argv.indexOf('--install') !== -1);

exports.controllerDir = controllerDir;
exports.getConfig =     getConfig;
exports.Adapter =       require(controllerDir + '/lib/adapter.js');
exports.appName =       appName;
