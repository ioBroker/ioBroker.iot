/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const DeviceModule = require('aws-iot-device-sdk').device;
const utils         = require(__dirname + '/lib/utils'); // Get common adapter utils
const AlexaSH2      = require(__dirname + '/lib/alexaSmartHomeV2');
const AlexaSH3      = require(__dirname + '/lib/alexaSmartHomeV3');
const AlexaCustom   = require(__dirname + '/lib/alexaCustom');
const pack          = require(__dirname + '/io-package.json');
const fs            = require('fs');
const request       = require('request');

let recalcTimeout = null;
let lang          = 'de';
let translate     = false;
let alexaSH2      = null;
let alexaSH3      = null;
let alexaCustom   = null;
let device        = null;

let connected     = false;
let uuid          = null;
let alexaDisabled = false;
let googleDisabled = false;
let secret;

let adapter       = new utils.Adapter({
    name: 'iot',
    objectChange: function (id, obj) {
        if (id === 'system.config' && obj && !translate) {
            lang = obj.common.language;
            if (lang !== 'en' && lang !== 'de') lang = 'en';
            alexaSH2.setLanguage(lang, false);
            alexaSH3.setLanguage(lang, false);
        }
    },
    stateChange:  function (id, state) {

    },
    unload:       function (callback) {
        try {
            if (device) {
                device.end();
                device = null;
            }
            callback();
        } catch (e) {
            callback();
        }
    },
    message:      function (obj) {
        if (obj) {
            switch (obj.command) {
                case 'update':
                    if (recalcTimeout) clearTimeout(recalcTimeout);

                    recalcTimeout = setTimeout(() => {
                        recalcTimeout = null;
                        alexaSH2.updateDevices(() => {
                            adapter.setState('smart.updates', true, true);
                        });
                        alexaSH3.updateDevices(() => {
                            adapter.setState('smart.updates3', true, true);
                        });
                    }, 1000);
                    break;

                case 'browse':
                    if (obj.callback) {
                        adapter.log.info('Request devices');
                        alexaSH2.updateDevices(() => {
                            adapter.sendTo(obj.from, obj.command, alexaSH2.getDevices(), obj.callback);
                            adapter.setState('smart.updates', false, true);
                        });
                    }
                    break;

                case 'browse3':
                    if (obj.callback) {
                        adapter.log.info('Request V3 devices');
                        alexaSH3.updateDevices(() => {
                            adapter.sendTo(obj.from, obj.command, alexaSH3.getDevices(), obj.callback);
                            adapter.setState('smart.updates3', false, true);
                        });
                    }
                    break;

                case 'enums':
                    if (obj.callback) {
                        adapter.log.info('Request enums');
                        alexaSH2.updateDevices(() => {
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
    ready: () => main()
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
            adapter.getForeignObject(data.id, (err, obj) => {
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
    let id;
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
        adapter.getForeignObject(id, (err, obj) => {
            if (obj) {
                controlState(id, data, callback);
            } else {
                adapter.getForeignObject(adapter.namespace + '.services.'  + id, (err, obj) => {
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
                        }, () => {
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
    }
}

function onConnect() {
    if (!connected) {
        adapter.log.info('Connection changed: connect');
        connected = true;
        adapter.setState('info.connection', connected, true);
    } else {
        adapter.log.info('Connection not changed: was connected');
    }
}
/*
function connect() {
    socket.on('ifttt', processIfttt);

    socket.on('iftttError', error => adapter.log.error('Error from IFTTT: ' + JSON.stringify(error)));

    socket.on('cloudError', error => adapter.log.error('Cloud says: ' + error));

    socket.on('service', (data, callback) => {
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
            let isCustom = false;
            if (data.name.match(/^custom_/)) {
                data.name = data.name.substring(7);
                isCustom = true;
            }

            if (adapter.config.allowedServices[0] === '*' || adapter.config.allowedServices.indexOf(data.name) !== -1) {
                if (!isCustom && data.name === 'text2command') {
                    if (adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                        adapter.setForeignState('text2command.' + adapter.config.text2command + '.text', decodeURIComponent(data.data), err =>
                            callback && callback({result: err || 'Ok'}));
                    } else {
                        adapter.log.warn('Received service text2command, but instance is not defined');
                        callback && callback({error: 'but instance is not defined'});
                    }
                } else if (!isCustom && data.name === 'simpleApi') {
                    callback && callback({error: 'not implemented'});
                } else if (isCustom) {
                    adapter.getObject('services.custom_' + data.name, (err, obj) => {
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
                            }, err => {
                                if (!err) {
                                    adapter.setState('services.custom_' + data.name, data.data, false, err => callback && callback({result: err || 'Ok'}));
                                } else {
                                    callback && callback({result: err});
                                }
                            });
                        } else {
                            adapter.setState('services.custom_' + data.name, data.data, false, err => callback && callback({result: err || 'Ok'}));
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

    socket.on('error', error => startConnect());

    if (adapter.config.instance) {
        if (adapter.config.instance.substring(0, 'system.adapter.'.length) !== 'system.adapter.') {
            adapter.config.instance = 'system.adapter.' + adapter.config.instance;
        }

        adapter.getForeignObject(adapter.config.instance, (err, obj) => {
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

                initConnect(socket, {apikey: adapter.config.apikey, allowAdmin: adapter.config.allowAdmin, uuid: uuid, version: pack.common.version});
            } else {
                adapter.log.error('Unknown instance ' + adapter.log.instance);
                server = null;
            }
        });

        if (adapter.config.allowAdmin) {
            adapter.getForeignObject(adapter.config.allowAdmin, (err, obj) => {
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
    }
}
*/

function encrypt(key, value) {
    let result = '';
    for(let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function decrypt(key, value) {
    let result = '';
    for(let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function readKeys() {
    return new Promise((resolve, reject) => {
        adapter.getState('certs.private', (err, priv) => {
            if (err || !priv || !priv.val) {
                reject(err || 'Not exists');
            } else {
                adapter.getState('certs.certificate', (err, certificate) => {
                    if (err || !certificate || !certificate.val) {
                        reject(err || 'Not exists');
                    } else {
                        resolve({private: decrypt(secret, priv.val), certificate: decrypt(secret, certificate.val)});
                    }
                });
            }
        });
    });
}

function writeKeys(data) {
    return new Promise((resolve, reject) => {
        adapter.setState('certs.private', encrypt(secret, data.keyPair.PrivateKey), true, err => {
            if (err) {
                reject(err);
            } else {
                adapter.setState('certs.public', encrypt(secret, data.keyPair.PublicKey), true, err => {
                    if (err) {
                        reject(err);
                    } else {
                        adapter.setState('certs.certificate', encrypt(secret, data.certificatePem), true, err => {
                            if (err) {
                                reject(err);
                            } else {
                                adapter.setState('certs.id', data.certificateId, true, err => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(data);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        })
    });
}

function fetchKeys(login, pass) {
    return new Promise((resolve, reject) => {
        let done = false;
        let timeout = setTimeout(() => {
            if (!done)  {
                done = true;
                reject('timeout');
            }
            req.abort();
        }, 15000);

        adapter.log.debug('Fetching keys...');
        let req = request.get(`https://32xdul2s3h.execute-api.eu-west-1.amazonaws.com/default/createUser?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}`, (error, response, body) => {
            clearTimeout(timeout);
            if (error) {
                if (!done)  {
                    done = true;
                    reject(error);
                }
            } else {
                let data;
                try {
                    data = JSON.parse(body)
                } catch (e) {
                    return reject('Cannot parse answer: ' + JSON.stringify(e));
                }
                if (data.error) {
                    adapter.log.error('Cannot fetch keys: ' + JSON.stringify(data.error));
                    reject(data);
                } else if (data.certificates) {
                    writeKeys(data.certificates)
                        .then(() => resolve({private: data.certificates.keyPair.PrivateKey, certificate: data.certificates.certificatePem}));
                } else {
                    adapter.log.error('Cannot fetch keys: ' + JSON.stringify(data));
                    reject(data);
                }
            }
        });
    });
}

function startDevice(clientId, login, password) {
    readKeys()
        .catch(e => {
            if (e === 'Not exists') {
                return fetchKeys(login, password);
            } else {
                throw new Error(e);
            }
        })
        .then(certs => {
            device = new DeviceModule({
                privateKey: new Buffer(certs.private),
                clientCert: new Buffer(certs.certificate),
                caCert:     fs.readFileSync(__dirname + '/keys/root-CA.crt'),
                clientId:   clientId,
                username:   'ioBroker',
                host:       adapter.config.cloudUrl,
                debug:      false
            });

            device.subscribe('command/' + clientId + '/#');
            device.on('connect', onConnect);
            device.on('close', onDisconnect);
            device.on('reconnect', () => adapter.log.debug('reconnect'));
            device.on('offline', () => adapter.log.debug('offline'));
            device.on('error', error => adapter.log.error(JSON.stringify(error)));
            device.on('message', (topic, request) => {
                adapter.log.debug(`Request ${topic}`);
                if (topic.startsWith('command/' + clientId + '/')) {
                    const type = topic.substring(clientId.length + 9);
                    try {
                        request = JSON.parse(request.toString());
                    } catch (e) {
                        return adapter.log.error('Cannot parse request: ' + request);
                    }
                    if (type === 'alexa') {
                        adapter.log.debug(new Date().getTime() + ' ALEXA: ' + JSON.stringify(request));

                        if (request && request.directive) {
                            alexaSH3.process(request, !alexaDisabled, response =>
                                device.publish('response/' + clientId + '/alexa', JSON.stringify(response)));
                        }
                        if (request && !request.header) {
                            alexaCustom.process(request, !alexaDisabled, response =>
                                device.publish('response/' + clientId + '/alexa', JSON.stringify(response)));
                        } else {
                            alexaSH2.process(request, !alexaDisabled, response =>
                                device.publish('response/' + clientId + '/alexa', JSON.stringify(response)));
                        }
                    } else if (type === 'ifttt') {

                    } else {
                        device.publish('response/' + clientId + '/' + type, JSON.stringify({error: 'Unknown service'}));
                    }
                }
            });
        }).catch(e => adapter.log.error(JSON.stringify(e)));
}

function main() {
    adapter.config.pingTimeout = parseInt(adapter.config.pingTimeout, 10) || 5000;
    if (adapter.config.pingTimeout < 3000) {
        adapter.config.pingTimeout = 3000;
    }

    if (adapter.config.deviceOffLevel === undefined) {
        adapter.config.deviceOffLevel = 30;
    }

    adapter.config.deviceOffLevel = parseFloat(adapter.config.deviceOffLevel) || 0;
    adapter.config.concatWord     = (adapter.config.concatWord || '').toString().trim();
    adapter.config.apikey         = (adapter.config.apikey || '').trim();
    adapter.config.replaces       = adapter.config.replaces ? adapter.config.replaces.split(',') : null;
    adapter.config.cloudUrl       = (adapter.config.cloudUrl || '').toString();

    if (adapter.config.replaces) {
        let text = [];
        for (let r = 0; r < adapter.config.replaces.length; r++) {
            text.push('"' + adapter.config.replaces + '"');
        }
        adapter.log.debug('Following strings will be replaced in names: ' + text.join(', '));
    }
    alexaSH2    = new AlexaSH2(adapter);
    alexaSH3    = new AlexaSH3(adapter);
    alexaCustom = new AlexaCustom(adapter);

    adapter.config.allowedServices = (adapter.config.allowedServices || '').split(/[,\s]+/);
    for (let s = 0; s < adapter.config.allowedServices.length; s++) {
        adapter.config.allowedServices[s] = adapter.config.allowedServices[s].trim();
    }

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl = adapter.config.cloudUrl || 'a18wym7vjdl22g.iot.eu-west-1.amazonaws.com';

    if (!adapter.config.login || !adapter.config.pass) {
        adapter.log.error('No cloud credentials found. Please get one on https://iobroker.net');
        return;
    }

    if (adapter.config.iftttKey) {
        adapter.subscribeStates('services.ifttt');
        // create ifttt object
        adapter.getObject('services.ifttt', (err, obj) => {
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

    adapter.getState('smart.alexaDisabled', (err, state) => {
        if (!state || state.val === null || state.val === 'null') {
            // init value with false
            adapter.setState('smart.alexaDisabled', alexaDisabled, true);
        } else {
            alexaDisabled = state.val === true || state.val === 'true';
        }
    });
    adapter.getState('smart.googleDisabled', (err, state) => {
        if (!state || state.val === null || state.val === 'null') {
            // init value with false
            adapter.setState('smart.googleDisabled', googleDisabled, true);
        } else {
            googleDisabled = state.val === true || state.val === 'true';
        }
    });

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl + ' with "' + adapter.config.apikey + '"');
    adapter.getForeignObject('system.config', (err, obj) => {
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

        adapter.getForeignObject('system.meta.uuid', (err, oUuid) => {
            secret = (obj && obj.native && obj.native.secret) || 'Zgfr56gFe87jJOM';
            adapter.config.pass = decrypt(secret, adapter.config.pass);
            if (oUuid && oUuid.native) {
                uuid = oUuid.native.uuid;
            }
            startDevice(adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_'), adapter.config.login, adapter.config.pass);
        });
    });
}
