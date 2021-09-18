/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const DeviceModule = require('aws-iot-device-sdk').device;
const utils        = require('@iobroker/adapter-core'); // Get common adapter utils
const AlexaSH2     = require('./lib/alexaSmartHomeV2');
const AlexaSH3     = require('./lib/alexaSmartHomeV3');
const AlexaCustom  = require('./lib/alexaCustom');
const AlexaCustomBlood = require('./lib/alexaCustomBlood');
const GoogleHome   = require('./lib/googleHome');
const YandexAlisa  = require('./lib/alisa');
const fs           = require('fs');
const request      = require('request');
const packageJSON  = require('./package.json')
const version      = packageJSON.version;
// @ts-ignore
const adapterName  = packageJSON.name.split('.').pop();

let recalcTimeout  = null;
let lang           = 'de';
let translate      = false;
let alexaSH2       = null;
let alexaSH3       = null;
let googleHome     = null;
let alexaCustom    = null;
let alexaCustomBlood = null;
let yandexAlisa    = null;
let device         = null;
let defaultHistory = null;

let connected      = false;
let uuid           = null;
let secret;
let adapter;
let connectStarted;

function startAdapter(options) {
    options = options || {};

    Object.assign(options, {
        name: adapterName,
        objectChange: (id, obj) => {
            if (id === 'system.config' && obj && !translate) {
                lang = obj.common.language;

                if (lang !== 'en' && lang !== 'de' && lang !== 'ru') {
                    lang = 'en';
                }
                defaultHistory= obj.common.defaultHistory;

                alexaSH2         && alexaSH2.setLanguage(lang);
                alexaSH3         && alexaSH3.setLanguage(lang);
                yandexAlisa      && yandexAlisa.setLanguage(lang);
                alexaCustom      && alexaCustom.setLanguage(lang);
                alexaCustomBlood && alexaCustomBlood.setLanguage(lang, defaultHistory);
                googleHome       && googleHome.setLanguage(lang);
            }
        },
        stateChange: (id, state) => {
            state && adapter.config.googleHome  && googleHome && googleHome.updateState(id, state);
            state && adapter.config.amazonAlexa && alexaSH3 && alexaSH3.updateState && alexaSH3.updateState(id, state);
            state && adapter.config.yandexAlisa && yandexAlisa && yandexAlisa.updateState && yandexAlisa.updateState(id, state);

            if (id === adapter.namespace + '.smart.lastResponse' && state && !state.ack) {
                alexaCustom && alexaCustom.setResponse(state.val);
            }
        },
        unload: callback => {
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
        message: obj => {
            if (obj) {
                switch (obj.command) {
                    case 'update':
                        recalcTimeout && clearTimeout(recalcTimeout);

                        recalcTimeout = setTimeout(() => {
                            recalcTimeout = null;
                            alexaSH2 && alexaSH2.updateDevices(obj.message, analyseAddedId =>
                                adapter.setState('smart.updatesResult', analyseAddedId || '', true, () => {
                                    adapter.log.debug('Devices updated!');
                                    adapter.setState('smart.updates', true, true);
                                }));

                            alexaSH3 && alexaSH3.updateDevices(obj.message, analyseAddedId =>
                                adapter.setState('smart.updatesResult', analyseAddedId || '', true, () =>
                                    adapter.setState('smart.updates3', true, true)));

                            googleHome && googleHome.updateDevices(analyseAddedId =>
                                adapter.setState('smart.updatesResult', analyseAddedId || '', true, () => {
                                    adapter.log.debug('GH Devices updated!');
                                    adapter.setState('smart.updatesGH', true, true);
                                }));
                        }, 1000);
                        break;

                    case 'browse':
                        if (obj.callback) {
                            adapter.log.info('Request devices');
                            if (alexaSH2) {
                                alexaSH2.updateDevices(() => {
                                    adapter.sendTo(obj.from, obj.command, alexaSH2.getDevices(), obj.callback);
                                    adapter.setState('smart.updates', false, true);
                                });
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'browse3':
                        if (obj.callback) {
                            adapter.log.info('Request V3 devices');
                            if (alexaSH3) {
                                alexaSH3.updateDevices(() => {
                                    adapter.sendTo(obj.from, obj.command, alexaSH3.getDevices(), obj.callback);
                                    adapter.setState('smart.updates3', false, true);
                                });
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'browseGH':
                        if (obj.callback) {
                            adapter.log.info('Request google home devices');
                            if (googleHome) {
                                googleHome.updateDevices(() => {
                                    adapter.sendTo(obj.from, obj.command, googleHome.getDevices(), obj.callback);
                                    adapter.setState('smart.updatesGH', false, true);
                                });
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'browseAlisa':
                        if (obj.callback) {
                            adapter.log.info('Request Yandex Alice devices');
                            if (yandexAlisa) {
                                yandexAlisa.updateDevices(() => {
                                    adapter.sendTo(obj.from, obj.command, yandexAlisa.getDevices(), obj.callback);
                                    adapter.setState('smart.updatesYA', false, true);
                                });
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'enums':
                        if (obj.callback) {
                            adapter.log.info('Request enums');
                            if (alexaSH2) {
                                alexaSH2.updateDevices(() => {
                                    adapter.sendTo(obj.from, obj.command, alexaSH2.getEnums(), obj.callback);
                                    adapter.setState('smart.updates', false, true);
                                });
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'private':
                        if (typeof obj.message !== 'object') {
                            try {
                                obj.message = JSON.parse(obj.message);
                            } catch (e) {
                                adapter.log.error('Cannot parse object: ' + e);
                                obj.callback && adapter.sendTo(obj.from, obj.command, {error: 'Invalid message format: cannot parse object'}, obj.callback);
                                return;
                            }
                        }
                        processMessage(obj.message.type, obj.message.request, response =>
                            obj.callback && adapter.sendTo(obj.from, obj.command, response, obj.callback));

                        break;

                    case 'ifttt':
                        sendDataToIFTTT(obj.message);
                        break;

                    case 'alexaCustomResponse':
                        alexaCustom && alexaCustom.setResponse(obj.message);
                        break;

                    case 'debug':
                        alexaSH2.getDebug(data =>
                            adapter.sendTo(obj.from, obj.command, data, obj.callback));
                        break;

                    default:
                        adapter.log.warn('Unknown command: ' + obj.command);
                        break;
                }
            }
        },
        ready: () => main()
    });

    adapter = new utils.Adapter(options);

    return adapter;
}

function sendDataToIFTTT(obj) {
    if (!obj) {
        adapter.log.warn('No data to send to IFTTT');
        return;
    }
    if (!adapter.config.iftttKey && (typeof obj !== 'object' || !obj.key)) {
        adapter.log.warn('No IFTTT key is defined');
        return;
    }
    let options;
    if (typeof obj !== 'object') {
        options = {
            uri: `https://maker.ifttt.com/trigger/state/with/key/${adapter.config.iftttKey}`,
            method: 'POST',
            json: {
                value1:  adapter.namespace + '.services.ifttt',
                value2: obj
            }
        };
    } else if (obj.event) {
        const event = obj.event;
        const key = obj.key;
        delete obj.event;
        delete obj.key;
        options = {
            uri: `https://maker.ifttt.com/trigger/${event}/with/key/${key || adapter.config.iftttKey}`,
            method: 'POST',
            json: obj
        };
    } else {
        if (obj.val === undefined) {
            adapter.log.warn('No value is defined');
            return;
        }
        obj.id = obj.id || (adapter.namespace + '.services.ifttt');
        options = {
            uri: `https://maker.ifttt.com/trigger/state/with/key/${adapter.config.iftttKey}`,
            method: 'POST',
            json: {
                value1: obj.id,
                value2: obj.val,
                value3: obj.ack
            }
        };
    }
    if (options) {
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                adapter.log.debug(`Response from IFTTT: ${JSON.stringify(body)}`);
            } else {
                adapter.log.warn(`Response from IFTTT: ${error ? JSON.stringify(error) : response && response.statusCode}`);
            }
        });
    } else {
        adapter.log.warn(`Invalid request to IFTTT: ${JSON.stringify(obj)}`);
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
                const newId = `${adapter.namespace}.services.${id}`;
                adapter.getForeignObject(newId, (err, obj) => {
                    if (!obj) {
                        // create state
                        adapter.setObjectNotExists('services.' + id,
                            {
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
                            },
                            () => controlState(newId, data, callback)
                        );
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
    const now = Date.now();
    if (now - connectStarted < 500) {
        adapter.log.warn('Looks like your connection certificates are invalid. Please renew them via configuration dialog.');
    }
    if (typeof event === 'string') {
        adapter.log.info(`Connection changed: ${event}`);
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

function encrypt(key, value) {
    let result = '';
    for(let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return 'base64:' + Buffer.from(result).toString('base64');
}

function decrypt(key, value) {
    if (value.startsWith('base64:')) {
        try {
            value = Buffer.from(value.substring(7), 'base64').toString('ascii')
        } catch (e) {
            adapter.log.error(`Cannot decrypt key: ${e}`);
        }
    }

    let result = '';
    for(let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}

function readUrlKey() {
    return new Promise((resolve, reject) => {
        adapter.getState('certs.urlKey', (err, key) => {
            if (err || !key || !key.val) {
                reject(err || 'Not exists');
            } else {
                resolve({key: key.val});
            }
        });
    });
}

function createUrlKey(login, pass) {
    return new Promise((resolve, reject) => {
        let req;
        let timeout = setTimeout(() => {
            if (timeout)  {
                timeout = null;
                req && req.abort();
                reject('timeout');
            }
        }, 15000);

        adapter.log.debug('Fetching URL key...');
        req = request.get(`https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&version=${version}`, (error, response, body) => {
            req = null;
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                if (error) {
                    reject(error);
                } else {
                    let data;
                    try {
                        data = JSON.parse(body)
                    } catch (e) {
                        return reject(`Cannot parse URL key answer: ${JSON.stringify(e)}`);
                    }
                    if (data.error) {
                        adapter.log.error(`Cannot fetch URL key: ${JSON.stringify(data.error)}`);
                        reject(data);
                    } else if (data.key) {
                        writeUrlKey(data.key)
                            .then(() => resolve(data.key));
                    } else {
                        adapter.log.error(`Cannot fetch URL key: ${JSON.stringify(data)}`);
                        reject(data);
                    }
                }
            }
        });
    });
}

function writeUrlKey(key) {
    return adapter.setStateAsync('certs.urlKey', key, true);
}

function readKeys() {
    let privateKey;
    return adapter.getStateAsync('certs.private')
        .then(priv => {
            if (!priv || !priv.val) {
                return Promise.reject('Not exists');
            } else {
                privateKey = priv.val;
                return adapter.getStateAsync('certs.certificate');
            }
        })
        .then(certificate => {
            if (!certificate || !certificate.val) {
                return Promise.reject('Not exists');
            } else {
                return {
                    private: decrypt(secret, privateKey),
                    certificate: decrypt(secret, certificate.val)
                };
            }
        });
}

function writeKeys(data) {
    return          adapter.setStateAsync('certs.private',     encrypt(secret, data.keyPair.PrivateKey), true)
        .then(() => adapter.setStateAsync('certs.public',      encrypt(secret, data.keyPair.PublicKey),  true))
        .then(() => adapter.setStateAsync('certs.certificate', encrypt(secret, data.certificatePem),     true))
        .then(() => adapter.setStateAsync('certs.id',          data.certificateId,                               true));
}

function fetchKeys(login, pass, _forceUserCreation) {
    return adapter.getStateAsync('certs.forceUserCreate')
        .then(state => {
            let forceUserCreation = state && state.val;

            return new Promise((resolve, reject) => {
                let req;
                let timeout = setTimeout(() => {
                    if (!timeout) {
                        timeout = null;
                        req && req.abort();
                        reject('timeout');
                    }
                }, 15000);

                // erase flag, if user must be created anew, but remember the state
                forceUserCreation && adapter.setState('certs.forceUserCreate', false, true);

                adapter.log.debug('Fetching keys...');
                req = request.get(`https://create-user.iobroker.in/v1/createUser?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&forceRecreate=${forceUserCreation}&version=${version}`, (error, response, body) => {
                    req = null;
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                        if (error) {
                            reject(error);
                        } else {
                            let data;
                            try {
                                data = JSON.parse(body)
                            } catch (e) {
                                return reject(`Cannot parse answer: ${JSON.stringify(e)}`);
                            }
                            if (data.error) {
                                adapter.log.error(`Cannot fetch keys: ${JSON.stringify(data.error)}`);
                                reject(data);
                            } else if (data.certificates) {
                                writeKeys(data.certificates)
                                    .then(() => resolve({
                                        private:     data.certificates.keyPair.PrivateKey,
                                        certificate: data.certificates.certificatePem
                                    }));
                            } else {
                                adapter.log.error(`Cannot fetch keys: ${JSON.stringify(data)}`);
                                reject(data);
                            }
                        }
                    }
                });
            });
        });
}

function processMessage(type, request, callback) {
    if (request instanceof Buffer) {
        request = request.toString();
    }

    adapter.log.debug('Data: ' + JSON.stringify(request));

    if (!request || !type) {
        return callback && callback({error: 'invalid request'});
    }

    if (type.startsWith('nightscout')) {
        if (adapter.config.nightscout) {
            adapter.getForeignStateAsync(`system.adapter.nightscout.${adapter.config.nightscout}.alive`)
                .then(state => {
                    if (state && state.val) {
                        adapter.sendTo('nightscout.' + adapter.config.nightscout, 'send', request, response => {
                            adapter.log.debug(`Response from nightscout.${adapter.config.nightscout}: ${JSON.stringify(response)}`);
                            // try to parse JSON
                            if (typeof response === 'string' && (response[0] === '{' || response[0] === '[')) {
                                try {
                                    response = JSON.parse(response);
                                } catch (e) {

                                }
                            }

                            callback && callback(response);
                        });
                    } else {
                        callback && callback({error: `nightscout.${adapter.config.nightscout} is offline`});
                    }
                });
        } else {
            callback({error: 'Service is disabled'});
        }
    } else if (type.startsWith('alexa')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error('Cannot parse request: ' + request);
                return callback && callback({error: 'Cannot parse request'});
            }
        }

        adapter.log.debug(`${Date.now()} ALEXA: ${JSON.stringify(request)}`);

        if (request && request.directive) {
            if (alexaSH3) {
                alexaSH3.process(request, adapter.config.amazonAlexa, response => callback(response));
            } else {
                callback({error: 'Service is disabled'});
            }
        } else
        if (request && !request.header) {
            if (request && request.session && request.session.application && alexaCustomBlood && request.session.application.applicationId === alexaCustomBlood.getAppId()) {
                if (alexaCustomBlood) {
                    alexaCustomBlood.process(request, adapter.config.amazonAlexaBlood, response => callback(response));
                } else {
                    callback({error: 'Service is disabled'});
                }
            } else {
                if (alexaCustom) {
                    alexaCustom.process(request, adapter.config.amazonAlexa, response => callback(response));
                } else {
                    callback({error: 'Service is disabled'});
                }
            }
        } else {
            if (alexaSH2) {
                alexaSH2.process(request, adapter.config.amazonAlexa, response => callback(response));
            } else {
                callback({error: 'Service is disabled'});
            }
        }
    } else if (type.startsWith('ifttt')) {
        try {
            if (typeof request === 'object') {
                request = JSON.stringify(request);
            } else {
                request = request.toString();
            }
        } catch (e) {
            adapter.log.error('Cannot parse request: ' + request);
            return callback && callback({error: 'Cannot parse request'});
        }

        processIfttt(request, response => callback(response));
    } else if (type.startsWith('ghome')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error('Cannot parse request: ' + request);
                return callback && callback({error: 'Cannot parse request'});
            }
        }

        if (googleHome) {
            googleHome.process(request, adapter.config.googleHome, response => callback(response));
        } else {
            callback({error: 'Service is disabled'});
        }
    } else if (type.startsWith('alisa')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error('Cannot parse request: ' + request);
                return callback && callback({error: 'Cannot parse request'});
            }
        }

        adapter.log.debug(`${Date.now()} ALISA: ${JSON.stringify(request)}`);
        if (yandexAlisa) {
            yandexAlisa.process(request, adapter.config.yandexAlisa, response => callback(response));
        } else {
            callback({error: 'Service is disabled'});
        }
    } else {
        let isCustom = false;
        let _type = type;
        if (_type.match(/^custom_/)) {
            _type = _type.substring(7);
            isCustom = true;
        }

        if (adapter.config.allowedServices[0] === '*' || adapter.config.allowedServices.indexOf(_type) !== -1) {
            if (typeof request === 'object') {
                request = JSON.stringify(request);
            } else {
                request = request.toString();
            }

            if (type.startsWith('text2command')) {
                if (adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                    adapter.setForeignState(`text2command.${adapter.config.text2command}.text`, request,
                        err => callback({result: err || 'Ok'}));
                } else {
                    adapter.log.warn('Received service text2command, but instance is not defined');
                    callback({result: 'but instance is not defined'});
                }
            } else if (type.startsWith('simpleApi')) {
                callback({result: 'not implemented'});
            } else if (isCustom) {
                adapter.getObject('services.custom_' + _type, (err, obj) => {
                    if (!obj) {
                        adapter.setObjectNotExists('services.custom_' + _type, {
                            _id: `${adapter.namespace}.services.custom_${_type}`,
                            type: 'state',
                            common: {
                                name: 'Service for ' + _type,
                                write: false,
                                read: true,
                                type: 'mixed',
                                role: 'value'
                            },
                            native: {}
                        }, err => {
                            if (!err) {
                                adapter.setState('services.custom_' + _type, request, true, err =>
                                    callback({result: err || 'Ok'}));
                            } else {
                                adapter.log.error(`Cannot control ${'.services.custom_' + _type}: ${JSON.stringify(err)}`);
                                callback({error: err});
                            }
                        });
                    } else {
                        adapter.setState('services.custom_' + _type, request, true, err =>
                            callback({result: err || 'Ok'}));
                    }
                });
            } else {
                adapter.log.warn(`Received service "${type}", but it is not allowed`);
                callback({error: 'not allowed'});
            }
        } else {
            adapter.log.warn(`Received service "${type}", but it is not found in whitelist`);
            callback({error: 'Unknown service'});
        }
    }
}

function closeDevice() {
    return new Promise(resolve => {
        if (device) {
            try {
                device.end(true, () => {
                    device = null;
                    resolve();
                });
            } catch (e) {
                device = null;
                resolve();
            }
        } else {
            resolve();
        }
    });
}

function startDevice(clientId, login, password, retry) {
    retry = retry || 0;
    let certs;
    return readKeys()
        .catch(e => {
            if (e === 'Not exists') {
                return fetchKeys(login, password);
            } else {
                throw new Error(e);
            }
        })
        .then(_certs => {
            certs = _certs;
            return readUrlKey();
        })
        .catch(e => {
            if (e === 'Not exists') {
                return createUrlKey(login, password);
            } else {
                throw new Error(e && e.error ? e.error : e);
            }
        })
        .then(key => {
            adapter.log.debug(`URL key is ${JSON.stringify(key)}, clientId: ${clientId}`);

            // destroy old device
            return closeDevice();
        })
        .then(() => {
            connectStarted = Date.now();
            device = new DeviceModule({
                privateKey: Buffer.from(certs.private),
                clientCert: Buffer.from(certs.certificate),
                caCert:     fs.readFileSync(__dirname + '/keys/root-CA.crt'),
                clientId,
                username:   'ioBroker',
                host:       adapter.config.cloudUrl,
                debug:      !!adapter.config.debug,
                baseReconnectTimeMs: 5000,
                keepalive:  60
            });

            device.subscribe(`command/${clientId}/#`);
            device.on('connect', onConnect);
            device.on('close', onDisconnect);
            device.on('reconnect', () => adapter.log.debug('reconnect'));
            device.on('offline', () => adapter.log.debug('offline'));
            device.on('error', error => {
                const errorTxt = (error && error.message && JSON.stringify(error.message)) || JSON.stringify(error);
                adapter.log.error(`Error by device connection: ${errorTxt}`);

                // restart iot device if DNS cannot be resolved
                if (errorTxt.includes('EAI_AGAIN')) {
                    adapter.log.error(`DNS name of ${adapter.config.cloudUrl} cannot be resolved: connection will be retried in 10 seconds.`);
                    setTimeout(() =>
                        startDevice(clientId, login, password), 10000);
                }
            });

            device.on('message', (topic, request) => {
                adapter.log.debug(`Request ${topic}`);
                if (topic.startsWith(`command/${clientId}/`)) {
                    let type = topic.substring(clientId.length + 9);

                    processMessage(type, request, response => {
                        if (adapter.common.loglevel === 'debug') {
                            adapter.log.debug('Response: ' + JSON.stringify(response));
                        }
                        device && device.publish(`response/${clientId}/${type}`, JSON.stringify(response))
                    });
                }
            });
        }).catch(e => {
            if (e && typeof e === 'object' && e.message) {
                adapter.log.error(`Cannot read keys: ${e.message}`);
            } else {
                adapter.log.error(`Cannot read keys: ${JSON.stringify(e)} / ${e && e.toString()}`);
            }

            if (e === 'timeout' && retry < 10) {
                setTimeout(() =>
                    startDevice(clientId, login, password, retry + 1), 10000);
            }
        });
}

function updateNightscoutSecret() {
    return new Promise(resolve => {
        if (!adapter.config.nightscout) {
            return resolve();
        }
        const email = adapter.config.login.replace(/[^\w\d-_]/g, '_');
        const secret = adapter.config.nightscoutPass;
        const apiSecret = email + (secret ? '-' + secret : '');
        const URL = `https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(adapter.config.login)}&pass=${encodeURIComponent(adapter.config.pass)}&apisecret=${encodeURIComponent(apiSecret)}`;
        request(URL, (error, response, body) => {
            if (error) {
                adapter.log.warn('Cannot update api-secret: ' + error);
            } else {
                try {
                    body = JSON.parse(body)
                } catch (e) {
                }
                if (body.error) {
                    adapter.log.error('Api-Secret cannot be updated: ' + body.error);
                } else {
                    adapter.log.debug('Api-Secret updated: ' + JSON.stringify(body));
                }
            }
            resolve();
        });
    });
}

function main() {
    if (adapter.config.googleHome === undefined) {
        adapter.config.googleHome = false;
    }

    if (adapter.config.amazonAlexa === undefined) {
        adapter.config.amazonAlexa = true;
    }

    if (adapter.config.yandexAlisa === undefined) {
        adapter.config.yandexAlisa = false;
    }

    adapter.config.pingTimeout = parseInt(adapter.config.pingTimeout, 10) || 5000;
    if (adapter.config.pingTimeout < 3000) {
        adapter.config.pingTimeout = 3000;
    }

    if (adapter.config.deviceOffLevel === undefined) {
        adapter.config.deviceOffLevel = 30;
    }

    if (adapter.config.login !== (adapter.config.login || '').trim().toLowerCase()) {
        adapter.log.error('Please write your login only in lowercase!');
    }
    if (!adapter.config.login || !adapter.config.pass) {
        return adapter.log.error('No cloud credentials found. Please get one on https://iobroker.pro');
    }

    adapter.config.deviceOffLevel = parseFloat(adapter.config.deviceOffLevel) || 0;
    adapter.config.concatWord     = (adapter.config.concatWord || '').toString().trim();
    adapter.config.apikey         = (adapter.config.apikey || '').trim();
    adapter.config.replaces       = adapter.config.replaces ? adapter.config.replaces.split(',') : null;
    adapter.config.cloudUrl       = (adapter.config.cloudUrl || '').toString();
    adapter.config.nightscout     = adapter.config.nightscout || '';

    if (adapter.config.replaces) {
        let text = [];
        for (let r = 0; r < adapter.config.replaces.length; r++) {
            text.push(`"${adapter.config.replaces}"`);
        }
        adapter.log.debug('Following strings will be replaced in names: ' + text.join(', '));
    }
    if (adapter.config.amazonAlexa) {
        alexaSH2    = new AlexaSH2(adapter);
        alexaSH3    = new AlexaSH3(adapter);
        alexaCustom = new AlexaCustom(adapter);
    }
    if (adapter.config.amazonAlexaBlood) {
        alexaCustomBlood = new AlexaCustomBlood(adapter);
    }
    if (adapter.config.yandexAlisa) {
        yandexAlisa = new YandexAlisa(adapter);
    }
    let systemConfig;
    // read URL keys from server
    readUrlKey()
        .then(key => {
            if (adapter.config.googleHome) {
                googleHome = new GoogleHome(adapter, key);
            }// no else
            if (false && adapter.config.yandexAlisa) {
                yandexAlisa = new YandexAlisa(adapter, key);
            }
        })
        .catch(err => {
            let promise;
            if (adapter.config.googleHome || adapter.config.yandexAlisa) {
                promise = createUrlKey(adapter.config.login, adapter.config.pass)
            }

            if (adapter.config.googleHome) {
                // create keys automatically if they do not exist
                if (err === 'Not exists') {
                    return promise
                        .then(key => googleHome = new GoogleHome(adapter, key))
                        .catch(err => adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`));
                } else {
                    adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`);
                }
            }// no else
            if (adapter.config.yandexAlisa) {
                // create keys automatically if they do not exist
                if (err === 'Not exists') {
                    return promise
                        .then(key => yandexAlisa = new YandexAlisa(adapter, key))
                        .catch(err => adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`));
                } else {
                    adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`);
                }
            }
        })
        .then(() => {
            adapter.config.allowedServices = (adapter.config.allowedServices || '').split(/[,\s]+/);
            for (let s = 0; s < adapter.config.allowedServices.length; s++) {
                adapter.config.allowedServices[s] = adapter.config.allowedServices[s].trim();
            }

            adapter.setState('info.connection', false, true);
            adapter.config.cloudUrl = adapter.config.cloudUrl || 'a18wym7vjdl22g.iot.eu-west-1.amazonaws.com';

            if (!adapter.config.login || !adapter.config.pass) {
                return adapter.log.error('No cloud credentials found. Please get one on https://iobroker.pro');
            }

            if (adapter.config.iftttKey) {
                adapter.subscribeStates('services.ifttt');
                // create ifttt object
                adapter.getObject('services.ifttt', (err, obj) => {
                    if (!obj) {
                        adapter.setObjectNotExists('services.ifttt', {
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

            adapter.log.info('Connecting with ' + adapter.config.cloudUrl);
            return adapter.getForeignObjectAsync('system.config');
        })
        .then(obj => {
            if (!obj) {
                adapter.log.warn('Object system.config not found. Please check your installation!');
                obj = {
                    common: {}
                };
            }
            systemConfig = obj;

            if (adapter.config.language) {
                translate = true;
                lang = adapter.config.language;
            } else {
                lang = obj.common.language;
            }

            if (lang !== 'en' && lang !== 'de' && lang !== 'ru') {
                lang = 'en';
            }

            defaultHistory = obj.common.defaultHistory;

            adapter.config.amazonAlexa && alexaSH2 && alexaSH2.setLanguage(lang, translate);
            adapter.config.amazonAlexa && alexaSH2 && alexaSH2.updateDevices();

            adapter.config.amazonAlexa && alexaSH3 && alexaSH3.setLanguage(lang, translate);
            adapter.config.amazonAlexa && alexaSH3 && alexaSH3.updateDevices();

            adapter.config.googleHome && googleHome && googleHome.setLanguage(lang, translate);
            adapter.config.googleHome && googleHome && googleHome.updateDevices();

            yandexAlisa && yandexAlisa.setLanguage(lang, translate);
            yandexAlisa && yandexAlisa.updateDevices();

            alexaCustom && alexaCustom.setLanguage(lang, translate);
            alexaCustomBlood && alexaCustomBlood.setSettings(lang, defaultHistory);

            return adapter.getForeignObjectAsync('system.meta.uuid');
        })
        .then(oUuid => {
            secret = (systemConfig && systemConfig.native && systemConfig.native.secret) || 'Zgfr56gFe87jJOM';
            adapter.config.pass = decrypt(secret, adapter.config.pass);

            // check password
            if (adapter.config.pass.length < 8 || !adapter.config.pass.match(/[a-z]/) || !adapter.config.pass.match(/[A-Z]/) || !adapter.config.pass.match(/\d/)) {
                return adapter.log.error('The password must be at least 8 characters long and have numbers, upper and lower case letters. Please change the password in the profile https://iobroker.pro/accountProfile.');
            }

            if (oUuid && oUuid.native) {
                uuid = oUuid.native.uuid;
            }
            return updateNightscoutSecret();
        })
        .then(() =>
            startDevice(adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_'), adapter.config.login, adapter.config.pass));
}

// If started as allInOne mode => return function to create instance
// @ts-ignore
if (module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
