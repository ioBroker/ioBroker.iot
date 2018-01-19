/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

var utils         = require(__dirname + '/lib/utils'); // Get common adapter utils
//var IOSocket      = require(utils.appName + '.socketio/lib/socket.js');
var IOSocket      = require(__dirname + '/lib/socket.js'); // temporary
var request       = require('request');
var AlexaSH2      = require(__dirname + '/lib/alexaSmartHomeV2');
var AlexaSH3      = require(__dirname + '/lib/alexaSmartHomeV3');
var AlexaCustom   = require(__dirname + '/lib/alexaCustom');
var socket        = null;
var ioSocket      = null;
var recalcTimeout = null;
var lang          = 'de';
var translate     = false;
var alexaSH2      = null;
var alexaSH3      = null;
var alexaCustom   = null;

var detectDisconnect = null;
var pingTimer     = null;
var connected     = false;
var connectTimer  = null;
//var statesAI      = null;
var uuid          = null;
var pack          = require(__dirname + '/io-package.json');
var alexaDisabled = false;
var googleDisabled = false;

var TEXT_PING_TIMEOUT = 'Ping timeout';

var adapter       = new utils.Adapter({
    name: 'cloud',
    objectChange: function (id, obj) {
        if (ioSocket) {
            ioSocket.send(socket, 'objectChange', id, obj);
        }

        if (id === 'system.config' && obj && !translate) {
            lang = obj.common.language;
            if (lang !== 'en' && lang !== 'de') lang = 'en';
            alexaSH2.setLanguage(lang, false);
            alexaSH3.setLanguage(lang, false);
        }
    },
    stateChange: function (id, state) {
        if (socket) {
            if (id === adapter.namespace + '.services.ifttt' && state && !state.ack) {
                sendDataToIFTTT({
                    id: id,
                    val: state.val,
                    ack: false
                });
            } else {
                if (state && !state.ack) {
                    if (id === adapter.namespace + '.smart.googleDisabled') {
                        googleDisabled = state.val === 'true' || state.val === true;
                        adapter.setState('smart.googleDisabled', googleDisabled, true);
                    } else if (id === adapter.namespace + '.smart.alexaDisabled') {
                        alexaDisabled = state.val === 'true' || state.val === true;
                        adapter.setState('smart.alexaDisabled', alexaDisabled, true);
                    }
                }
                if (ioSocket) {
	                ioSocket.send(socket, 'stateChange', id, state);
	            }
            }
        }
    },
    unload: function (callback) {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        if (detectDisconnect) {
            clearTimeout(detectDisconnect);
            detectDisconnect = null;
        }
        try {
            if (socket) {
                socket.close();
            }
            ioSocket = null;
            callback();
        } catch (e) {
            callback();
        }
    },
    message: function (obj) {
        if (obj) {
            switch (obj.command) {
                case 'update':
                    if (recalcTimeout) clearTimeout(recalcTimeout);

                    recalcTimeout = setTimeout(function () {
                        recalcTimeout = null;
                        alexaSH2.updateDevices(function () {
                            adapter.setState('smart.updates', true, true);
                        });
                        alexaSH3.updateDevices(function () {
                            adapter.setState('smart.updates3', true, true);
                        });
                    }, 1000);
                    break;

                case 'browse':
                    if (obj.callback) {
                        adapter.log.info('Request devices');
                        alexaSH2.updateDevices(function () {
                            adapter.sendTo(obj.from, obj.command, alexaSH2.getDevices(), obj.callback);
                            adapter.setState('smart.updates', false, true);
                        });
                    }
                    break;

                case 'browse3':
                    if (obj.callback) {
                        adapter.log.info('Request V3 devices');
                        alexaSH3.updateDevices(function () {
                            adapter.sendTo(obj.from, obj.command, alexaSH3.getDevices(), obj.callback);
                            adapter.setState('smart.updates3', false, true);
                        });
                    }
                    break;

                case 'enums':
                    if (obj.callback) {
                        adapter.log.info('Request enums');
                        alexaSH2.updateDevices(function () {
                            adapter.sendTo(obj.from, obj.command, alexaSH2.getEnums(), obj.callback);
                            adapter.setState('smart.updates', false, true);
                        });
                    }
                    break;

                case 'ifttt':
                    sendDataToIFTTT(obj.message);
                    break;

                default:
                    adapter.log.warn('Unknown command: ' + obj.command);
                    break;
            }
        }
    },
    ready: function () {
        main();
    }
});

function sendDataToIFTTT(obj) {
    if (!obj) {
        adapter.log.warn('No data to send to IFTTT');
        return;
    }
    if (!adapter.config.iftttKey && (typeof obj !== 'object' || !obj.key)) {
        adapter.log.warn('No IFTTT key is defined');
        return;
    }
    if (typeof obj !== 'object') {
        ioSocket.send(socket, 'ifttt', {
            id:     adapter.namespace + '.services.ifttt',
            key:    adapter.config.iftttKey,
            val:    obj
        });
    } else if (obj.event) {
        ioSocket.send(socket, 'ifttt', {
            event:  obj.event,
            key:    obj.key || adapter.config.iftttKey,
            value1: obj.value1,
            value2: obj.value2,
            value3: obj.value3
        });
    } else {
        if (obj.val === undefined) {
            adapter.log.warn('No value is defined');
            return;
        }
        obj.id = obj.id || (adapter.namespace + '.services.ifttt');
        ioSocket.send(socket, 'ifttt', {
            id:  obj.id,
            key: obj.key || adapter.config.iftttKey,
            val: obj.val,
            ack: obj.ack
        });
    }
}

/*function createAiConnection() {
    var tools  = require(utils.controllerDir + '/lib/tools');
    var fs     = require('fs');
    var config = null;
    var getConfigFileName = tools.getConfigFileName;

    if (fs.existsSync(getConfigFileName())) {
        config = JSON.parse(fs.readFileSync(getConfigFileName()));
        if (!config.states)  config.states  = {type: 'file'};
        if (!config.objects) config.objects = {type: 'file'};
    } else {
        adapter.log.warn('Cannot find ' + getConfigFileName());
        return;
    }
    var States;
    if (config.states && config.states.type) {
        if (config.states.type === 'file') {
            States = require(utils.controllerDir + '/lib/states/statesInMemClient');
        } else if (config.states.type === 'redis') {
            States = require(utils.controllerDir + '/lib/states/statesInRedis');
        } else {
            throw 'Unknown objects type: ' + config.states.type;
        }
    } else {
        States  = require(utils.controllerDir + '/lib/states');
    }

    statesAI = new States({
        namespace:  adapter.namespace + 'ai',
        connection: config.states,
        connected: function () {
            statesAI.subscribe('*');
        },
        logger: adapter.log,
        change: function (id, state) {
            adapter.inputCount++;
            if (typeof id !== 'string' || !id || state === 'null' || !state) {
                return;
            }

            // do not send "system. ..."
            if (id.match(/^system\./)) {
                return;
            }

            if (id.match(/^smartmeter\./) || id.match(/^b-control-em/)) return;

            var type = typeof state.val;

            if (type === 'string') {
                var f = parseFloat(state.val);
                if (f.toString() === state.val) {
                    state.val = f;
                } else if (state.val === 'true') {
                    state.val = true;
                } else if (state.val === 'false') {
                    state.val = false;
                } else {
                    // ignore strings
                    return;
                }
            }

            if (type !== 'number' && type !== 'boolean') {
                return;
            } else if (type === 'boolean') {
                state.val = state.val ? 1 : 0;
            }

            if (connected) {
                // extract additional information about this
                adapter.getForeignObject(id, function (err, obj) {
                    if (obj && obj.common) {
                        if (obj.common.unit === '°C' || obj.common.unit === 'C°' || (obj.common.unit === '%' && obj.common.max !== 1)) {
                            // we do not need exact information
                            state.val = Math.round(state.val);
                        }
                        if (state.from) {
                            state.from = state.from.replace(/^system\.adapter\./, '');
                        }
                        if (!state.ts) {
                            state.ts = new Date().getTime();
                        }

                        if (type)

        //              if (sentStates[id] && sentStates[id].timer) {
        //                  clearTimeout(sentStates[id].timer);
        //              }
        //              sentStates[id] = sentStates[id] || {};
        //              sentStates[id].timer = setTimeout(function (_id, _state))
        //
                        delete state.lc;
                        delete state.q;
                        ioSocket.send(socket, 'ai', id, state);
                    }
                });
            }
        }
    });
}*/

function pingConnection() {
    if (!detectDisconnect) {
        if (connected && ioSocket) {
            // cannot use "ping" because reserved by socket.io
            ioSocket.send('pingg');

            detectDisconnect = setTimeout(function () {
                detectDisconnect = null;
                adapter.log.error(TEXT_PING_TIMEOUT);
                onDisconnect(TEXT_PING_TIMEOUT);
            }, adapter.config.pingTimeout);
        }
    }
}

function checkPing() {
    if (connected) {
        if (!pingTimer) {
            pingTimer = setInterval(pingConnection, 30000);
        }
    } else {
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        if (detectDisconnect) {
            clearTimeout(detectDisconnect);
            detectDisconnect = null;
        }
    }
}

function controlState(id, data, callback) {
    id = id || 'services.ifttt';

    if (typeof data === 'object') {
        if (data.id) {
            if (data.id === adapter.namespace + '.services.ifttt') {
                data.ack = true;
            }
            if (data.val === undefined) {
                callback && callback('No value set');
                return;
            }
            adapter.getForeignObject(data.id, function (err, obj) {
                if (!obj || !obj.common) {
                    callback && callback('Unknown ID: ' + data.id);
                } else {
                    if (typeof data.val === 'string') data.val = data.val.replace(/^@ifttt\s?/, '');
                    if (obj.common.type === 'boolean') {
                        data.val = data.val === true || data.val === 'true' || data.val === 'on' || data.val === 'ON' || data.val === 1 || data.val === '1';
                    } else if (obj.common.type === 'number') {
                        data.val = parseFloat(data.val);
                    }

                    adapter.setForeignState(data.id, data.val, data.ack, callback);
                }
            });
        } else if (data.val !== undefined) {
            if (typeof data.val === 'string') data.val = data.val.replace(/^@ifttt\s?/, '');
            adapter.setState(id, data.val, data.ack !== undefined ? data.ack : true, callback);
        } else {
            if (typeof data === 'string') data = data.replace(/^@ifttt\s?/, '');
            adapter.setState(id, JSON.stringify(data), true, callback);
        }
    } else {
        if (typeof data === 'string') data = data.replace(/^@ifttt\s?/, '');
        adapter.setState(id, data, true, callback);
    }
}

function processIfttt(data, callback) {
    adapter.log.debug('Received IFTTT object: ' + data);
    var id;
    if (typeof data === 'object' && data.id && data.data !== undefined) {
        id = data.id;
        if (typeof data.data === 'string' && data.data[0] === '{') {
            try {
                data = JSON.parse(data.data);
            } catch (e) {
                adapter.log.debug('Cannot parse: ' + data.data);
            }
        } else {
            data = data.data;
        }
    } else {
        if (typeof data === 'string' && data[0] === '{') {
            try {
                data = JSON.parse(data);

                if (typeof data.id === 'string') {
                    id = data.id;
                    if (data.data) {
                        data = data.data;
                    }
                }

            } catch (e) {
                adapter.log.debug('Cannot parse: ' + data);
            }
        }
    }

    if (id) {
        adapter.getForeignObject(id, function (err, obj) {
            if (obj) {
                controlState(id, data, callback);
            } else {
                adapter.getForeignObject(adapter.namespace + '.services.'  + id, function (err, obj) {
                    if (!obj) {
                        // create state
                        adapter.setObject('services.' + id, {
                            type: 'state',
                            common: {
                                name: 'IFTTT value',
                                write: false,
                                role: 'state',
                                read: true,
                                type: 'mixed',
                                desc: 'Custom state'
                            },
                            native: {}
                        }, function () {
                            controlState(adapter.namespace + '.services.'  + id, data, callback);
                        });
                    } else {
                        controlState(obj._id, data, callback);
                    }
                });
            }
        });
    } else {
        controlState(null, data, callback);
    }
}

function onDisconnect(event) {
    if (typeof event === 'string') {
        adapter.log.info('Connection changed: ' + event);
    } else {
        adapter.log.info('Connection changed: disconnect');
    }
    if (connected) {
        adapter.log.info('Connection lost');
        connected = false;
        adapter.setState('info.connection', false, true);

        // clear ping timers
        checkPing();

        if (adapter.config.restartOnDisconnect || event === TEXT_PING_TIMEOUT) {
            setTimeout(function () {
                process.exit(-100); // simulate scheduled restart
            }, 10000);
        }
    }
}

function onConnect() {
    if (!connected) {
        adapter.log.info('Connection changed: connect');
        connected = true;
        adapter.setState('info.connection', connected, true);
        checkPing();
    } else {
        adapter.log.info('Connection not changed: was connected');
    }
}

function onCloudConnect() {
    adapter.log.info('User accessed from cloud');
    adapter.setState('info.userOnCloud', true, true);
}

function onCloudDisconnect() {
    adapter.log.info('User disconnected from cloud');
    adapter.setState('info.userOnCloud', false, true);
}

function connect() {
    if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
    }

    if (socket) {
        socket.close();
    }

    adapter.config.cloudUrl = (adapter.config.cloudUrl || '').toString();

    if (adapter.config.apikey && adapter.config.apikey.match(/^@pro_/)) {
        if (adapter.config.cloudUrl.indexOf('https://iobroker.pro:')  === -1 &&
            adapter.config.cloudUrl.indexOf('https://iobroker.info:') === -1) {
            adapter.config.cloudUrl = 'https://iobroker.pro:10555';
        }
    } else {
        adapter.config.allowAdmin = false;
    }

    socket = require('socket.io-client')(adapter.config.cloudUrl || 'https://iobroker.net:10555', {
        transports:           ['websocket'],
        reconnection:         !adapter.config.restartOnDisconnect,
        rejectUnauthorized:   !adapter.config.allowSelfSignedCertificate,
        reconnectionDelay:    8000,
        timeout:              parseInt(adapter.config.connectionTimeout, 10) || 10000,
        reconnectionDelayMax: 30000
    });

    socket.on('connect_error', function (error) {
      adapter.log.error('Error while connecting to cloud: ' + error);
    });

    // cannot use "pong" because reserved by socket.io
    socket.on('pongg', function (error) {
        clearTimeout(detectDisconnect);
        detectDisconnect = null;
    });

    var server      = 'http://localhost:8082';
    var adminServer = 'http://localhost:8081';

    socket.on('html', function (url, cb) {
        if (url.match(/^\/admin\//)) {
            if (adminServer && adapter.config.allowAdmin) {
                url = url.substring(6);
                request({url: adminServer + url, encoding: null}, function (error, response, body) {
                    cb(error, response ? response.statusCode : 501, response ? response.headers : [], body);
                });
            } else {
                cb('Enable admin in cloud settings. And only pro.', 404, [], 'Enable admin in cloud settings. And only pro.');
            }
        } else if (adminServer && adapter.config.allowAdmin && url.match(/^\/adapter\/|^\/lib\/js\/ace-|^\/lib\/js\/cron\/|^\/lib\/js\/jqGrid\//)) {
            request({url: adminServer + url, encoding: null}, function (error, response, body) {
                cb(error, response ? response.statusCode : 501, response ? response.headers : [], body);
            });
        } else if (server) {
            request({url: server + url, encoding: null}, function (error, response, body) {
                cb(error, response ? response.statusCode : 501, response ? response.headers : [], body);
            });
        } else {
            cb('Admin or Web are inactive.', 404, [], 'Admin or Web are inactive.');
        }
    });

    socket.on('alexa', function (request, callback) {
        adapter.log.debug(new Date().getTime() + ' ALEXA: ' + JSON.stringify(request));

        if (request && request.directive) {
            alexaSH3.process(request, !alexaDisabled, callback);
        } if (request && !request.header) {
            alexaCustom.process(request, !alexaDisabled, callback);
        } else {
            alexaSH2.process(request, !alexaDisabled, callback);
        }
    });

    socket.on('ifttt', processIfttt);

    socket.on('iftttError', function (error) {
        adapter.log.error('Error from IFTTT: ' + JSON.stringify(error));
    });

    socket.on('cloudError', function (error) {
        adapter.log.error('Cloud says: ' + error);
    });

    socket.on('service', function (data, callback) {
        adapter.log.debug('service: ' + JSON.stringify(data));
        // supported services:
        // - text2command
        // - simpleApi
        // - custom, e.g. torque
        if (!data || !data.name) {
            callback && callback({error: 'no name'});
        } else
        if (data.name === 'ifttt' && adapter.config.iftttKey) {
            processIfttt(data.data, callback);
        } else {
            var isCustom = false;
            if (data.name.match(/^custom_/)) {
                data.name = data.name.substring(7);
                isCustom = true;
            }

            if (adapter.config.allowedServices[0] === '*' || adapter.config.allowedServices.indexOf(data.name) !== -1) {
                if (!isCustom && data.name === 'text2command') {
                    if (adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                        adapter.setForeginState('text2command.' + adapter.config.text2command + '.text', decodeURIComponent(data.data), function (err) {
                            callback && callback({result: err || 'Ok'});
                        });
                    } else {
                        adapter.log.warn('Received service text2command, but instance is not defined');
                        callback && callback({error: 'but instance is not defined'});
                    }
                } else if (!isCustom && data.name === 'simpleApi') {
                    callback && callback({error: 'not implemented'});
                } else if (isCustom) {
                    adapter.getObject('services.custom_' + data.name, function (err, obj) {
                        if (!obj) {
                            adapter.setObject('services.custom_' + data.name, {
                                _id: adapter.namespace + '.services.custom_' + data.name,
                                type: 'state',
                                common: {
                                    name: 'Service for ' + data.name,
                                    write: false,
                                    read: true,
                                    type: 'mixed',
                                    role: 'value'
                                },
                                native: {}
                            }, function (err) {
                                if (!err) {
                                    adapter.setState('services.custom_' + data.name, data.data, false, function (err) {
                                        callback && callback({result: err || 'Ok'});
                                    });
                                } else {
                                    callback && callback({result: err});
                                }
                            });
                        } else {
                            adapter.setState('services.custom_' + data.name, data.data, false, function (err) {
                                callback && callback({result: err || 'Ok'});
                            });
                        }
                    });
                } else {
                    callback && callback({error: 'not allowed'});
                }
            } else {
                adapter.log.warn('Received service "' + data.name + '", but it is not found in whitelist');
                callback && callback({error: 'blocked'});
            }
        }
    });

    if (adapter.config.instance) {
        if (adapter.config.instance.substring(0, 'system.adapter.'.length) !== 'system.adapter.') {
            adapter.config.instance = 'system.adapter.' + adapter.config.instance;
        }

        adapter.getForeignObject(adapter.config.instance, function (err, obj) {
            if (obj && obj.common && obj.native) {
                if (obj.common.auth) {
                    adapter.log.error('Cannot activate web for cloud, because authentication is enabled. Please create extra instance for cloud');
                    server = '';
                    return;
                }

                server = 'http' + (obj.native.secure ? 's' : '')  + '://';
                // todo if run on other host
                server += (!obj.native.bind || obj.native.bind === '0.0.0.0') ? '127.0.0.1' : obj.native.bind;
                server += ':' + obj.native.port;

                ioSocket = new IOSocket(socket, {apikey: adapter.config.apikey, allowAdmin: adapter.config.allowAdmin, uuid: uuid, version: pack.common.version}, adapter);

                ioSocket.on('connect',         onConnect);
                ioSocket.on('disconnect',      onDisconnect);
                ioSocket.on('cloudConnect',    onCloudConnect);
                ioSocket.on('cloudDisconnect', onCloudDisconnect);
            } else {
                adapter.log.error('Unknown instance ' + adapter.log.instance);
                server = null;
            }
        });

        if (adapter.config.allowAdmin) {
            adapter.getForeignObject(adapter.config.allowAdmin, function (err, obj) {
                if (obj && obj.common && obj.native) {
                    if (obj.common.auth) {
                        adapter.log.error('Cannot activate admin for cloud, because authentication is enabled. Please create extra instance for cloud');
                        server = '';
                        return;
                    }
                    adminServer = 'http' + (obj.native.secure ? 's' : '') + '://';
                    // todo if run on other host
                    adminServer += (!obj.native.bind || obj.native.bind === '0.0.0.0') ? '127.0.0.1' : obj.native.bind;
                    adminServer += ':' + obj.native.port;
                } else {
                    adminServer = null;
                    adapter.log.error('Unknown instance ' + adapter.config.allowAdmin);
                }
            });
        }
    } else {
        ioSocket = new IOSocket(socket, {apikey: adapter.config.apikey, uuid: uuid, version: pack.common.version}, adapter);

        ioSocket.on('connect',          onConnect);
        ioSocket.on('disconnect',       onDisconnect);
        ioSocket.on('cloudConnect',     onCloudConnect);
        ioSocket.on('cloudDisconnect',  onCloudDisconnect);
    }
}

function main() {
    adapter.config.pingTimeout = parseInt(adapter.config.pingTimeout, 10) || 5000;
    if (adapter.config.pingTimeout < 3000) {
        adapter.config.pingTimeout = 3000;
    }

    if (adapter.config.deviceOffLevel === undefined) adapter.config.deviceOffLevel = 30;
    adapter.config.deviceOffLevel = parseFloat(adapter.config.deviceOffLevel) || 0;
    adapter.config.concatWord = (adapter.config.concatWord || '').toString().trim();
    adapter.config.apikey = (adapter.config.apikey || '').trim();
    adapter.config.replaces = adapter.config.replaces ? adapter.config.replaces.split(',') : null;
    if (adapter.config.replaces) {
        var text = [];
        for (var r = 0; r < adapter.config.replaces.length; r++) {
            text.push('"' + adapter.config.replaces + '"');
        }
        adapter.log.debug('Following strings will be replaced in names: ' + text.join(', '));
    }
    alexaSH2    = new AlexaSH2(adapter);
    alexaSH3    = new AlexaSH3(adapter);
    alexaCustom = new AlexaCustom(adapter);

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    adapter.getForeignObject('system.config', function (err, obj) {
        if (adapter.config.language) {
            translate = true;
            lang = adapter.config.language;
        } else {
            lang = obj.common.language;
        }
        if (lang !== 'en' && lang !== 'de' && lang !== 'ru') lang = 'en';
        alexaSH2.setLanguage(lang, translate);
        alexaSH2.updateDevices();
        alexaSH3.setLanguage(lang, translate);
        alexaSH3.updateDevices();
        alexaCustom.setLanguage(lang);
    });

    //if (adapter.config.allowAI && false) {
    //    createAiConnection();
    //}

    adapter.config.allowedServices = (adapter.config.allowedServices || '').split(',');
    for (var s = 0; s < adapter.config.allowedServices.length; s++) {
        adapter.config.allowedServices[s] = adapter.config.allowedServices[s].trim();
    }

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl = adapter.config.cloudUrl || 'https://iobroker.net:10555';

    if (!adapter.config.apikey) {
        adapter.log.error('No api-key found. Please get one on https://iobroker.net');
        return;
    }

    if (adapter.config.iftttKey) {
        adapter.subscribeStates('services.ifttt');
        // create ifttt object
        adapter.getObject('services.ifttt', function (err, obj) {
            if (!obj) {
                adapter.setObject('services.ifttt', {
                    _id: adapter.namespace + '.services.ifttt',
                    type: 'state',
                    common: {
                        name: 'IFTTT value',
                        write: true,
                        role: 'state',
                        read: true,
                        type: 'mixed',
                        desc: 'All written data will be sent to IFTTT. If no state specified all requests from IFTTT will be saved here'
                    },
                    native: {}
                });
            }
        });
    }

    adapter.subscribeStates('smart.*');

    adapter.getState('smart.alexaDisabled', function (err, state) {
        if (!state || state.val === null || state.val === 'null') {
            // init value with false
            adapter.setState('smart.alexaDisabled', alexaDisabled, true);
        } else {
            alexaDisabled = state.val === true || state.val === 'true';
        }
    });
    adapter.getState('smart.googleDisabled', function (err, state) {
        if (!state || state.val === null || state.val === 'null') {
            // init value with false
            adapter.setState('smart.googleDisabled', googleDisabled, true);
        } else {
            googleDisabled = state.val === true || state.val === 'true';
        }
    });

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');

    adapter.getForeignObject('system.meta.uuid', function (err, obj) {
        if (obj && obj.native) {
            uuid = obj.native.uuid;
        }
        connect();
    });
}