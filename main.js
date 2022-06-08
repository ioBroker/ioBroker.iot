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
const Remote       = require('./lib/remote');
const fs           = require('fs');
const axios        = require('axios');
const packageJSON  = require('./package.json');
const zlib         = require('zlib');
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
let remote         = null;
let device         = null;
let defaultHistory = null;

let connected      = false;
let uuid           = null;
let secret;
let adapter;
let connectStarted;

const NONE = '___none___';
const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;

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
                remote.setLanguage(lang);
            }
            id && remote.updateObject(id, obj);
        },
        stateChange: (id, state) => {
            state && adapter.config.googleHome  && googleHome && googleHome.updateState(id, state);
            state && adapter.config.amazonAlexa && alexaSH3 && alexaSH3.updateState && alexaSH3.updateState(id, state);
            state && adapter.config.yandexAlisa && yandexAlisa && yandexAlisa.updateState && yandexAlisa.updateState(id, state);
            id && remote.updateState(id, state);

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
                if (remote) {
                    remote.destroy();
                    remote = null;
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
            .then(() => {})
            .catch(error => adapter.log.error('Error in main: ' + error.toString())),
    });

    adapter = new utils.Adapter(options);

    // warning: `adapter.log = obj => console.log(obj)` does not implemented. Only adapter.on('log', obj => console.log(obj))
    adapter.on('log', obj =>
        remote.onLog(obj));

    return adapter;
}

function sendDataToIFTTT(obj) {
    if (!obj) {
        return adapter.log.warn('No data to send to IFTTT');
    } else
    if (!adapter.config.iftttKey && (typeof obj !== 'object' || !obj.key)) {
        return adapter.log.warn('No IFTTT key is defined');
    }

    let url;
    let data;
    if (typeof obj !== 'object') {
        url = `https://maker.ifttt.com/trigger/state/with/key/${adapter.config.iftttKey}`;
        data = {
            value1:  adapter.namespace + '.services.ifttt',
            value2: obj
        };
    } else if (obj.event) {
        const event = obj.event;
        const key = obj.key;
        delete obj.event;
        delete obj.key;
        url = `https://maker.ifttt.com/trigger/${event}/with/key/${key || adapter.config.iftttKey}`;
        data = obj
    } else if (obj.val === undefined) {
        return adapter.log.warn('No value is defined');
    } else {
        obj.id = obj.id || (adapter.namespace + '.services.ifttt');
        url = `https://maker.ifttt.com/trigger/state/with/key/${adapter.config.iftttKey}`;
        data = {
            value1: obj.id,
            value2: obj.val,
            value3: obj.ack
        }
    }

    if (url) {
        axios.post(url, data, {
            timeout: 15000,
            validateStatus: status => status < 400
        })
            .then(response => adapter.log.debug(`Response from IFTTT: ${JSON.stringify(response.data)}`))
            .catch(error => {
                if (error.response) {
                    adapter.log.warn(`Response from IFTTT: ${error.response.data ? JSON.stringify(error.response.data) : error.response.status}`);
                } else {
                    adapter.log.warn(`Response from IFTTT: ${error.code}`);
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
        if (event.toLowerCase().includes('duplicate')) {
            // disable adapter
            adapter.log.error(`Two devices are trying to connect with the same iot account. This is not allowed. Stopping`);
            adapter.getForeignObjectAsync('system.adapter.' + adapter.namespace)
                .then(obj => {
                    obj.common.enabled = false;
                    return adapter.setForeignObjectAsync(obj._id, obj);
                });
        }
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

async function readUrlKey() {
    const key = await adapter.getStateAsync('certs.urlKey');

    if (!key || !key.val) {
        throw new Error('Not exists');
    } else {
        return {key: key.val};
    }
}

async function createUrlKey(login, pass) {
    adapter.log.debug('Fetching URL key...');

    let response;
    try {
        response = await axios.get(
            `https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&version=${version}`,
            {
                timeout: 15000,
                validateStatus: status => status < 400
            }
        );
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401) {
                adapter.log.error(`Cannot create URL key because of invalid user or password`);
            }

            throw new Error(error.response.data);
        } else {
            throw error;
        }
    }

    if (response.data && response.data.error) {
        adapter.log.error(`Cannot fetch URL key: ${JSON.stringify(response.data.error)}`);
        throw new Error(response.data);
    } else if (response.data && response.data.key) {
        await adapter.setStateAsync('certs.urlKey', response.data.key, true);
        return {key: response.data.key};
    } else {
        adapter.log.error(`Cannot fetch URL key: ${JSON.stringify(response.data)}`);
        throw new Error(response.data);
    }
}

async function readCertificates() {
    let privateKey;
    let certificate;

    try {
        privateKey  = await adapter.getStateAsync('certs.private');
        certificate = await adapter.getStateAsync('certs.certificate');
    } catch (error) {
        throw new Error('Not exists');
    }

    if (!certificate || !certificate.val || !privateKey || !privateKey.val) {
        throw new Error('Not exists');
    } else {
        return {
            private: decrypt(secret, privateKey.val),
            certificate: decrypt(secret, certificate.val)
        };
    }
}

async function writeKeys(data) {
    await adapter.setStateAsync('certs.private',     encrypt(secret, data.keyPair.PrivateKey), true);
    await adapter.setStateAsync('certs.public',      encrypt(secret, data.keyPair.PublicKey),  true);
    await adapter.setStateAsync('certs.certificate', encrypt(secret, data.certificatePem),     true);
    await adapter.setStateAsync('certs.id',          data.certificateId,                       true);
}

async function fetchCertificates(login, pass, _forceUserCreation) {
    let state;

    state = await adapter.getStateAsync('certs.forceUserCreate');
    let forceUserCreation = state && state.val;

    if (forceUserCreation) {
        await adapter.setStateAsync('certs.forceUserCreate', false, true);
    }

    adapter.log.debug('Fetching certificates...');
    let response;
    try {
        response = await axios.get(
            `https://create-user.iobroker.in/v1/createUser?user=${encodeURIComponent(login)}&pass=${encodeURIComponent(pass)}&forceRecreate=${forceUserCreation}&version=${version}`,
            {
                timeout: 15000,
                validateStatus: status => status < 400
            }
        );
    } catch (error) {
        if (error.response) {
            if (error.response.status === 401) {
                adapter.log.error(`Cannot fetch connection certificates because of invalid user or password`);
            } else {
                adapter.log.error(`Cannot fetch connection certificates: ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(error.response.data);
        } else {
            adapter.log.error(`Cannot fetch connection certificates: ${JSON.stringify(error.code)}`);
            throw error;
        }
    }

    if (response && response.data && response.data.certificates) {
        await writeKeys(response.data.certificates);

        return {
            private:     response.data.certificates.keyPair.PrivateKey,
            certificate: response.data.certificates.certificatePem
        };
    } else {
        adapter.log.error(`Cannot fetch connection certificates: ${JSON.stringify(response.data)}`);
        throw new Error(response.data);
    }
}

function processMessage(type, request, callback) {
    if (request instanceof Buffer) {
        request = request.toString();
    }

    adapter.log.debug('Data: ' + JSON.stringify(request));

    if (!request || !type) {
        return callback && callback({error: 'invalid request'});
    }

    if (type.startsWith('remote')) {
        const start = Date.now();
        return remote.process(request, type)
            .then(response => {
                if (response !== NONE) {
                    adapter.log.debug(`[REMOTE] Response in: ${Date.now() - start}ms (Length: ${Array.isArray(response) ? 'A ' + response.length : JSON.stringify(response).length}) for ${request}`);
                }
                callback(response);
            })
            .catch(err =>
                adapter.log.error('Error in processing of remote request: ' + err.toString()));
    } else
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

        if (adapter.config.allowedServices[0] === '*' || adapter.config.allowedServices.includes(_type)) {
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

async function startDevice(clientId, login, password, retry) {
    retry = retry || 0;
    let certs;

    try {
        certs = await readCertificates();
    } catch (error) {
        if (error.message === 'Not exists') {
            try {
                certs = await fetchCertificates(login, password);
            } catch (error) {

            }
        } else {
            throw error;
        }
    }

    // destroy old device
    await closeDevice();

    if (!certs) {
        return adapter.log.error(`Cannot read connection certificates`);
    }

    try {
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
        remote.registerDevice(device);

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

                processMessage(type, request, async response => {
                    if (adapter.common.loglevel === 'debug' && !type.startsWith('remote')) {
                        adapter.log.debug('Response: ' + JSON.stringify(response));
                    }
                    if (device && response !== NONE) {
                        if (Array.isArray(response)) {
                            try {
                                for (let m = 0; m < response.length; m++) {
                                    const trunk = response[m];
                                    await new Promise((resolve, reject) => device.publish(
                                        `response/${clientId}/${type}`,
                                        typeof trunk !== 'string' ? JSON.stringify(trunk) : trunk,
                                        {qos: 1},
                                        error => {
                                            if (error) {
                                                reject(error);
                                            } else {
                                                resolve();
                                            }
                                        }
                                    ));
                                }
                            } catch (err) {
                                adapter.log.error('[REMOTE] Cannot send packet: ' + err);
                            }
                        } else {
                            adapter.log.debug(`[REMOTE] Send command to 'response/${clientId}/${type}: ${JSON.stringify(response)}`);

                            const msg = JSON.stringify(response);
                            if (msg && msg.length > MAX_IOT_MESSAGE_LENGTH) {
                                let packed = zlib.deflateSync(msg).toString('base64');
                                adapter.log.debug(`[REMOTE] Content was packed from ${msg.length} bytes to ${packed.length} bytes`);
                                if (packed.length > MAX_IOT_MESSAGE_LENGTH) {
                                    adapter.log.warn(`[REMOTE] Content was packed to ${packed.length} bytes which is still near/over the message limit!`);
                                }
                                device.publish(`response/${clientId}/${type}`, packed);
                            } else {
                                // console.log(`Publish to "response/${clientId}/${type}": ${msg}`);
                                device.publish(`response/${clientId}/${type}`, msg);
                            }
                        }
                    }
                });
            }
        });
    } catch (error) {
        if (error && typeof error === 'object' && error.message) {
            adapter.log.error(`Cannot read connection certificates: ${error.message}`);
        } else {
            adapter.log.error(`Cannot read connection certificates: ${JSON.stringify(error)} / ${error && error.toString()}`);
        }

        if ((error === 'timeout' || (error.message && error.message.includes('timeout'))) && retry < 10) {
            setTimeout(() =>
                startDevice(clientId, login, password, retry + 1), 10000);
        }
    }
}

async function updateNightscoutSecret() {
    if (!adapter.config.nightscout) {
        return;
    }

    const email = adapter.config.login.replace(/[^\w\d-_]/g, '_');
    const secret = adapter.config.nightscoutPass;
    const apiSecret = email + (secret ? '-' + secret : '');
    const URL = `https://generate-key.iobroker.in/v1/generateUrlKey?user=${encodeURIComponent(adapter.config.login)}&pass=${encodeURIComponent(adapter.config.pass)}&apisecret=${encodeURIComponent(apiSecret)}`;
    let response;

    try {
        response = await axios.get(
            URL,
            {
                timeout: 15000,
                validateStatus: status => status < 400
            }
        );
        if (response.data.error) {
            adapter.log.error('Api-Secret cannot be updated: ' + response.data.error);
        } else {
            adapter.log.debug('Api-Secret updated: ' + JSON.stringify(response.data));
        }
    } catch (error) {
        if (error.response) {
            adapter.log.warn(`Cannot update api-secret: ${error.response.data ? JSON.stringify(error.response.data) : error.response.status}`);
        } else {
            adapter.log.warn(`Cannot update api-secret: ${error.code}`);
        }
    }
}

async function main() {
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

    let systemConfig = await adapter.getForeignObjectAsync('system.config');
    if (!systemConfig) {
        adapter.log.warn('Object system.config not found. Please check your installation!');
        systemConfig = {common: {}};
    }

    const oUuid = await adapter.getForeignObjectAsync('system.meta.uuid');

    secret = (systemConfig && systemConfig.native && systemConfig.native.secret) || 'Zgfr56gFe87jJOM';

    adapter.config.pass           = decrypt(secret, adapter.config.pass);
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

    remote = new Remote(adapter, adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_'));

    adapter.config.allowedServices = (adapter.config.allowedServices || '')
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(s => s);

    adapter.setState('info.connection', false, true);
    adapter.config.cloudUrl = adapter.config.cloudUrl || 'a18wym7vjdl22g.iot.eu-west-1.amazonaws.com';

    if (!adapter.config.login || !adapter.config.pass) {
        return adapter.log.error('No cloud credentials found. Please get one on https://iobroker.pro');
    }

    if (adapter.config.iftttKey) {
        await adapter.subscribeStatesAsync('services.ifttt');
        // create ifttt object
        const iftttObj = await adapter.getObjectAsync('.services.ifttt');
        if (!iftttObj) {
            await adapter.setObjectNotExistsAsync('services.ifttt', {
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
    }

    await adapter.subscribeStatesAsync('smart.*');

    adapter.log.info('Connecting with ' + adapter.config.cloudUrl);

    if (adapter.config.language) {
        translate = true;
        lang = adapter.config.language;
    } else {
        lang = systemConfig.common.language;
    }

    if (lang !== 'en' && lang !== 'de' && lang !== 'ru') {
        lang = 'en';
    }

    defaultHistory = systemConfig.common.defaultHistory;

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

    remote.setLanguage(lang);
    // check password
    if (adapter.config.pass.length < 8 || !adapter.config.pass.match(/[a-z]/) || !adapter.config.pass.match(/[A-Z]/) || !adapter.config.pass.match(/\d/)) {
        return adapter.log.error('The password must be at least 8 characters long and have numbers, upper and lower case letters. Please change the password in the profile https://iobroker.pro/accountProfile.');
    }

    if (oUuid && oUuid.native) {
        uuid = oUuid.native.uuid;
    }

    await updateNightscoutSecret();

    // user will be created here
    await startDevice(adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_'), adapter.config.login, adapter.config.pass);

    // after the user created we can try to generate URL key
    // read URL keys from server
    let key;
    try {
        key = await readUrlKey();
    } catch (error) {
        if (adapter.config.googleHome ||
            adapter.config.yandexAlisa ||
            adapter.config.allowedServices.length ||
            adapter.config.iftttKey
        ) {
            try {
                key = await createUrlKey(adapter.config.login, adapter.config.pass);
            } catch (err) {
                return adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`);
            }
        }
    }

    if (adapter.config.googleHome) {
        googleHome = new GoogleHome(adapter, key);
    }// no else
    if (adapter.config.yandexAlisa) {
        yandexAlisa = new YandexAlisa(adapter, key);
    }

}

// If started as allInOne mode => return function to create instance
// @ts-ignore
if (module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
