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
let urlKey         = '';

let connected      = false;
let uuid           = null;
let secret;
let adapter;
let connectStarted;

const NONE = '___none___';
const MAX_IOT_MESSAGE_LENGTH = 127 * 1024;
const SPECIAL_ADAPTERS = ['netatmo'];
const ALLOWED_SERVICES = SPECIAL_ADAPTERS.concat(['text2command']);

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
            // if it is an instance
            if (id.startsWith('system.adapter.')) {
                // try to find it in special adapters
                const adpr = SPECIAL_ADAPTERS.find(a => id.startsWith(`system.adapter.${a}.`));
                // if found and it is really instance
                if (adpr && id.match(/\.\d+$/)) {
                    // update state
                    setTimeout(async () => await createStateForAdapter(adpr), 1000);
                }

                return;
            }
            alexaSH3.handleObjectChange(id, obj);

            id && remote.updateObject(id, obj);
        },
        stateChange: (id, state) => {
            state && adapter.config.googleHome  && googleHome && googleHome.updateState(id, state);
            state && adapter.config.amazonAlexa && alexaSH3 && alexaSH3.handleStateUpdate(id, state);
            state && adapter.config.yandexAlisa && yandexAlisa && yandexAlisa.updateState && yandexAlisa.updateState(id, state);
            id && remote.updateState(id, state);

            if (id === `${adapter.namespace}.smart.lastResponse` && state && !state.ack) {
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
        message: async obj => {
            if (obj) {
                switch (obj.command) {
                    case 'update':
                        recalcTimeout && clearTimeout(recalcTimeout);

                        recalcTimeout = setTimeout(async () => {
                            recalcTimeout = null;
                            alexaSH2 && alexaSH2.updateDevices(obj.message, async analyseAddedId => {
                                await adapter.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                                adapter.log.debug('Devices updated!');
                                await adapter.setStateAsync('smart.updates', true, true);
                            });

                            // alexaSH3 && alexaSH3.updateDevices(obj.message, async analyseAddedId => {
                            //     await adapter.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                            //     await adapter.setStateAsync('smart.updates3', true, true);
                            // });
                            if (alexaSH3) {
                                await alexaSH3.updateDevices();
                                await adapter.setStateAsync('smart.updates3', true, true);
                            }

                            googleHome && googleHome.updateDevices(async analyseAddedId => {
                                await adapter.setStateAsync('smart.updatesResult', analyseAddedId || '', true);
                                adapter.log.debug('GH Devices updated!');
                                await adapter.setStateAsync('smart.updatesGH', true, true);
                            });
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
                                adapter.sendTo(obj.from, obj.command, alexaSH3.getDevices(), obj.callback);
                                await adapter.setStateAsync('smart.updates3', false, true);
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

                    case 'alexaCustomKnownDevices':
                        // Admin UI can request the known/discoveredAlexa devices used via Custom skill
                        // Allow setting the rooms of the devices and store in adapter config
                        // Restart adapter after change - or we also add a set message to the config
                        if (obj.callback) {
                            adapter.log.info('Request Alexa Custom known devices');
                            if (alexaCustom) {
                                const devices = alexaCustom.getKnownDevices();
                                adapter.sendTo(obj.from, obj.command, devices, obj.callback);
                            } else {
                                adapter.sendTo(obj.from, obj.command, {error: 'not activated'}, obj.callback);
                            }
                        }
                        break;

                    case 'alexaCustomKnownUsers':
                        // Admin UI can request the known/discoveredAlexa users used via Custom skill
                        // Allow setting the names of the users and store in adapter config
                        // Restart adapter after change - or we also add a set message to the config
                        if (obj.callback) {
                            adapter.log.info('Request Alexa Custom known users');
                            if (alexaCustom) {
                                const users = alexaCustom.getKnownUsers();
                                adapter.sendTo(obj.from, obj.command, users, obj.callback);
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
                                adapter.log.error(`Cannot parse object: ${e}`);
                                obj.callback && adapter.sendTo(obj.from, obj.command, {error: 'Invalid message format: cannot parse object'}, obj.callback);
                                return;
                            }
                        }
                        const response = await processMessage(obj.message.type, obj.message.request);
                        obj.callback && adapter.sendTo(obj.from, obj.command, response, obj.callback);

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

                    case 'getServiceEndpoint':
                        if (obj.callback) {
                            if (!urlKey) {
                                try {
                                    urlKey = await readUrlKey();
                                } catch (error) {
                                    try {
                                        urlKey = await createUrlKey(adapter.config.login, adapter.config.pass);
                                    } catch (err) {
                                        return obj.callback && adapter.sendTo(obj.from, obj.command, {error: `Cannot get urlKey: ${err.toString()}`}, obj.callback);
                                    }
                                }
                            }

                            const result = {url: `https://service.iobroker.in/v1/iotService?key=${urlKey.key}&user=${encodeURIComponent(adapter.config.login)}`};
                            let serviceName = typeof obj.message === 'string' ? obj.message : obj.message && obj.message.serviceName;
                            if (serviceName) {
                                result.url += `&service=${encodeURIComponent(serviceName)}`;
                                result.stateID = `${adapter.namespace}.services.${serviceName}`
                            }
                            if (obj.message && obj.message.data) {
                                result.data += `&data=${typeof obj.message.data === 'object' ? JSON.stringify(obj.message.data) : obj.message.data}`;
                            }
                            // check if the service name is in the white list
                            if (serviceName &&
                                adapter.config.allowedServices[0] !== '*' &&
                                !adapter.config.allowedServices.includes(serviceName.replace(/^custom_/, '')) &&
                                !ALLOWED_SERVICES.includes(serviceName)
                            ) {
                                result.warning = 'Service name is not in white list';
                                adapter.log.warn(`Service "${serviceName}" is not in allowed services list`);
                            }

                            obj.callback && adapter.sendTo(obj.from, obj.command, result, obj.callback);
                        }
                        break;

                    default:
                        adapter.log.warn(`Unknown command: ${obj.command}`);
                        break;
                }
            }
        },
        ready: () => main()
            .then(() => {})
            .catch(error => {
                adapter.log.error(`Error in main: ${error.toString()}`);
            }),
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
            value1: `${adapter.namespace}.services.ifttt`,
            value2: obj,
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
        obj.id = obj.id || `${adapter.namespace}.services.ifttt`;
        url = `https://maker.ifttt.com/trigger/state/with/key/${adapter.config.iftttKey}`;
        data = {
            value1: obj.id,
            value2: obj.val,
            value3: obj.ack,
        }
    }

    if (url) {
        axios.post(url, data, {
            timeout: 15000,
            validateStatus: status => status < 400,
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

async function controlState(id, data) {
    id = id || 'services.ifttt';

    if (typeof data === 'object') {
        if (data.id) {
            if (data.id === `${adapter.namespace}.services.ifttt`) {
                data.ack = true;
            }
            if (data.val === undefined) {
                throw new Error('No value set');
            }
            const obj = await adapter.getForeignObjectAsync(data.id);
            if (!obj || !obj.common) {
                throw new Error(`Unknown ID: ${data.id}`);
            } else {
                if (typeof data.val === 'string') data.val = data.val.replace(/^@ifttt\s?/, '');
                if (obj.common.type === 'boolean') {
                    data.val = data.val === true || data.val === 'true' || data.val === 'on' || data.val === 'ON' || data.val === 1 || data.val === '1';
                } else if (obj.common.type === 'number') {
                    data.val = parseFloat(data.val);
                }

                await adapter.setForeignStateAsync(data.id, data.val, data.ack);
            }
        } else if (data.val !== undefined) {
            if (typeof data.val === 'string') {
                data.val = data.val.replace(/^@ifttt\s?/, '');
            }
            await adapter.setStateAsync(id, data.val, data.ack !== undefined ? data.ack : true);
        } else {
            if (typeof data === 'string') {
                data = data.replace(/^@ifttt\s?/, '');
            }
            await adapter.setStateAsync(id, JSON.stringify(data), true);
        }
    } else {
        if (typeof data === 'string') {
            data = data.replace(/^@ifttt\s?/, '');
        }
        await adapter.setStateAsync(id, data, true);
    }
}

async function processIfttt(data) {
    adapter.log.debug(`Received IFTTT object: ${data}`);
    let id;
    if (typeof data === 'object' && data.id && data.data !== undefined) {
        id = data.id;
        if (typeof data.data === 'string' && data.data[0] === '{') {
            try {
                data = JSON.parse(data.data);
            } catch (e) {
                adapter.log.debug(`Cannot parse: ${data.data}`);
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
                adapter.log.debug(`Cannot parse: ${data}`);
            }
        }
    }

    if (id) {
        let obj = await adapter.getForeignObjectAsync(id);
        if (!obj) {
            const newId = `${adapter.namespace}.services.${id}`;
            obj = await adapter.getForeignObjectAsync(newId);
            if (!obj) {
                // create state
                await adapter.setObjectNotExistsAsync(`services.${id}`,
                    {
                        type: 'state',
                        common: {
                            name: 'IFTTT value',
                            write: false,
                            role: 'state',
                            read: true,
                            type: 'mixed',
                            desc: 'Custom state',
                        },
                        native: {},
                    });
                id = newId;
            }
        }
    }

    return controlState(id || null, data);
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

function onConnect(clientId) {
    if (!connected) {
        adapter.log.info(`Connection changed: connect "${clientId}"`);
        connected = true;
        adapter.setState('info.connection', connected, true);
        // setTimeout(() => {
        //     device.publish(`response/${clientId}/stateChange`, JSON.stringify({alive: true}), {qos: 0}, (error, result) => {
        //         console.log(`Published alive: ${result}, ${error}`);
        //     });
        // }, 2000);
    } else {
        adapter.log.info('Connection not changed: was connected');
    }
}

function encrypt(key, value) {
    let result = '';
    for(let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return `base64:${Buffer.from(result).toString('base64')}`;
}

function decrypt(key, value) {
    if (value.startsWith('base64:')) {
        try {
            value = Buffer.from(value.substring(7), 'base64').toString('ascii');
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
                validateStatus: status => status < 400,
            },
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

function sendToAsync(instance, command, request) {
    return new Promise(resolve => adapter.sendTo(instance, command, request, response => {
        adapter.log.debug(`Response from ${instance}: ${JSON.stringify(response)}`);
        // try to parse JSON
        if (typeof response === 'string' && (response[0] === '{' || response[0] === '[')) {
            try {
                response = JSON.parse(response);
            } catch (e) {

            }
        }
        resolve(response);
    }));
}

async function processMessage(type, request) {
    if (request instanceof Buffer) {
        request = request.toString();
    }

    adapter.log.debug(`Data: ${JSON.stringify(request)}`);

    if (!request || !type) {
        return { error: 'invalid request' };
    }

    if (type.startsWith('remote')) {
        const start = Date.now();
        return remote.process(request, type)
            .then(response => {
                if (response !== NONE) {
                    adapter.log.debug(`[REMOTE] Response in: ${Date.now() - start}ms (Length: ${Array.isArray(response) ? `A ${response.length}` : JSON.stringify(response).length}) for ${request}`);
                }
                return response;
            })
            .catch(err => adapter.log.error(`Error in processing of remote request: ${err.toString()}`));
    } else if (type.startsWith('nightscout')) {
        if (adapter.config.nightscout) {
            let state = await adapter.getForeignStateAsync(`system.adapter.nightscout.${adapter.config.nightscout}.alive`);
            if (state && state.val) {
                return sendToAsync(`nightscout.${adapter.config.nightscout}`, 'send', request);
            } else {
                return { error: `nightscout.${adapter.config.nightscout} is offline` };
            }
        } else {
            return { error: 'Service is disabled' };
        }
    } else if (type.startsWith('alexa')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error(`Cannot parse request: ${request}`);
                return { error: 'Cannot parse request' };
            }
        }

        adapter.log.debug(`${Date.now()} ALEXA: ${JSON.stringify(request)}`);

        if (request && request.directive) {
            if (alexaSH3) {
                return await alexaSH3.process(request);
            } else {
                return { error: 'Service is disabled' };
            }
        } else if (request && request.error) {
            // answer from alexa3 events cloud actually just show it in log
            if (request.error.includes('You have no iobroker.iot license')) {
                // pause for 30 minutes send of the events
                alexaSH3 && alexaSH3.pauseEvents();
            }
            adapter.log.error(`Error from Alexa events cloud: ${request.error}`);
        } else
        if (request && !request.header) {
            if (request && request.session && request.session.application && alexaCustomBlood && request.session.application.applicationId === alexaCustomBlood.getAppId()) {
                if (alexaCustomBlood) {
                    return alexaCustomBlood.process(request, adapter.config.amazonAlexaBlood);
                } else {
                    return { error: 'Service is disabled' };
                }
            } else {
                if (alexaCustom) {
                    return alexaCustom.process(request, adapter.config.amazonAlexa);
                } else {
                    return { error: 'Service is disabled' };
                }
            }
        } else {
            if (alexaSH2) {
                return alexaSH2.process(request, adapter.config.amazonAlexa);
            } else {
                return { error: 'Service is disabled' };
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
            adapter.log.error(`Cannot parse request: ${request}`);
            return { error: 'Cannot parse request' };
        }

        return processIfttt(request);
    } else if (type.startsWith('ghome')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error(`Cannot parse request: ${request}`);
                return { error: 'Cannot parse request' };
            }
        }

        if (googleHome) {
            return googleHome.process(request, adapter.config.googleHome);
        } else {
            return { error: 'Service is disabled' };
        }
    } else if (type.startsWith('alisa')) {
        if (typeof request === 'string') {
            try {
                request = JSON.parse(request);
            } catch (e) {
                adapter.log.error(`Cannot parse request: ${request}`);
                return { error: 'Cannot parse request' };
            }
        }

        adapter.log.debug(`${Date.now()} ALISA: ${JSON.stringify(request)}`);
        if (yandexAlisa) {
            return yandexAlisa.process(request, adapter.config.yandexAlisa);
        } else {
            return { error: 'Service is disabled' };
        }
    } else {
        let isCustom = false;
        let _type = type;
        if (_type.match(/^custom_/)) {
            _type = _type.substring(7);
            isCustom = true;
        }

        if (adapter.config.allowedServices[0] === '*' || (adapter.config.allowedServices.includes(_type) || ALLOWED_SERVICES.includes(_type))) {
            if (typeof request === 'object') {
                request = JSON.stringify(request);
            } else {
                request = request.toString();
            }

            if (SPECIAL_ADAPTERS.includes(_type)) {
                try {
                    await adapter.setStateAsync(`services.${_type}`, request, true);
                } catch (err) {
                    return { result: err };
                }

                return { result: 'Ok' };
            } else if (type.startsWith('text2command')) {
                if (adapter.config.text2command !== undefined && adapter.config.text2command !== '') {
                    try {
                        await adapter.setForeignStateAsync(`text2command.${adapter.config.text2command}.text`, request);
                    } catch (err) {
                        return { result: err };
                    }
                    return { result: 'Ok' };
                } else {
                    adapter.log.warn('Received service text2command, but instance is not defined');
                    return { result: 'but instance is not defined' };
                }
            } else if (type.startsWith('simpleApi')) {
                return { result: 'not implemented' };
            } else if (isCustom) {
                let obj;
                try {
                    obj = await adapter.getObjectAsync(`services.custom_${_type}`);
                } catch (e) {
                    adapter.log.error(`Cannot get object services.custom_${_type}: ${e}`);
                }

                if (!obj) {
                    try {
                        await adapter.setObjectNotExistsAsync(`services.custom_${_type}`, {
                            _id: `${adapter.namespace}.services.custom_${_type}`,
                            type: 'state',
                            common: {
                                name: `Service for ${_type}`,
                                write: false,
                                read: true,
                                type: 'mixed',
                                role: 'value',
                            },
                            native: {},
                        });
                        await adapter.setStateAsync(`services.custom_${_type}`, request, true);
                    } catch (err) {
                        adapter.log.error(`Cannot control .services.custom_${_type}: ${JSON.stringify(err)}`);
                        return { error: err };
                    }
                } else {
                    await adapter.setStateAsync(`services.custom_${_type}`, request, true);
                    return { result: 'Ok' };
                }
            } else {
                adapter.log.warn(`Received service "${type}", but it is not allowed`);
                return { error: 'not allowed' };
            }
        } else {
            adapter.log.warn(`Received service "${type}", but it is not found in whitelist`);
            return { error: 'Unknown service' };
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
            caCert:     fs.readFileSync(`${__dirname}/keys/root-CA.crt`),
            clientId,
            username:   'ioBroker',
            host:       adapter.config.cloudUrl,
            debug:      !!adapter.config.debug,
            baseReconnectTimeMs: 5000,
            keepalive:  60,
        });
        remote.registerDevice(device);

        device.subscribe(`command/${clientId}/#`);
        device.on('connect', () => onConnect(clientId));
        device.on('close', onDisconnect);
        device.on('reconnect', () => adapter.log.debug('reconnect'));
        device.on('offline', () => adapter.log.debug('offline'));
        device.on('error', error => {
            const errorTxt = (error && error.message && JSON.stringify(error.message)) || JSON.stringify(error);
            adapter.log.error(`Error by device connection: ${errorTxt}`);

            // restart the iot device if DNS cannot be resolved
            if (errorTxt.includes('EAI_AGAIN')) {
                adapter.log.error(`DNS name of ${adapter.config.cloudUrl} cannot be resolved: connection will be retried in 10 seconds.`);
                setTimeout(() =>
                    startDevice(clientId, login, password), 10000);
            }
        });

        device.on('message', async (topic, request) => {
            adapter.log.debug(`Request ${topic}`);
            if (topic.startsWith(`command/${clientId}/`)) {
                let type = topic.substring(clientId.length + 9);

                try {
                    const response = await processMessage(type, request);

                    if (adapter.common.loglevel === 'debug' && !type.startsWith('remote')) {
                        adapter.log.debug(`Response: ${JSON.stringify(response)}`);
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
                                adapter.log.error(`[REMOTE] Cannot send packet: ${err}`);
                            }
                        } else {
                            adapter.log.debug(`[REMOTE] Send response to 'response/${clientId}/${type}: ${JSON.stringify(response)}`);

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
                } catch (error) {
                    adapter.log.debug(`Error processing request ${topic}`);
                    adapter.log.debug(`${error}`);
                }
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
    const apiSecret = email + (secret ? `-${secret}` : '');
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
            adapter.log.error(`Api-Secret cannot be updated: ${response.data.error}`);
        } else {
            adapter.log.debug(`Api-Secret updated: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        if (error.response) {
            adapter.log.warn(`Cannot update api-secret: ${error.response.data ? JSON.stringify(error.response.data) : error.response.status}`);
        } else {
            adapter.log.warn(`Cannot update api-secret: ${error.code}`);
        }
    }
}

async function createStateForAdapter(adapterName) {
    // find any instance of this adapter
    const instances = await adapter.getObjectViewAsync('system', 'instance', {startkey: `system.adapter.${adapterName}.`, endkey: `system.adapter.${adapterName}.\u9999`});
    if (instances && instances.rows && instances.rows.length) {
        let obj;
        try {
            obj = await adapter.getObjectAsync(`service.${adapterName}`);
        } catch (e) {
            // ignore
        }
        if (!obj) {
            try {
                await adapter.setForeignObjectAsync(`${adapter.namespace}.services.${adapterName}`, {
                    type: 'state',
                    common: {
                        name: `Service for ${adapterName}`,
                        write: false,
                        read: true,
                        type: 'mixed',
                        role: 'value',
                    },
                    native: {},
                });
            } catch (e) {
                // ignore
            }
        }
    } else {
        try {
            // delete if object exists
            const obj = await adapter.getObjectAsync(`service.${adapterName}`);
            if (obj) {
                await adapter.delObjectAsync(`service.${adapterName}`);
            }
        } catch (e) {
            // ignore
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

    // create service state for netatmo if any instance exists
    for (let a = 0; a < SPECIAL_ADAPTERS.length; a++) {
        await createStateForAdapter(SPECIAL_ADAPTERS[a]);
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
        adapter.log.debug(`Following strings will be replaced in names: ${text.join(', ')}`);
    }
    if (adapter.config.amazonAlexa) {
        alexaSH2    = new AlexaSH2(adapter);
        // alexaSH3    = new AlexaSH3(adapter);
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
                _id: `${adapter.namespace}.services.ifttt`,
                type: 'state',
                common: {
                    name: 'IFTTT value',
                    write: true,
                    role: 'state',
                    read: true,
                    type: 'mixed',
                    desc: 'All written data will be sent to IFTTT. If no state specified all requests from IFTTT will be saved here',
                },
                native: {},
            });
        }
    }

    // detect netatmo creation
    await adapter.subscribeForeignObjectsAsync('system.adapter.*');

    await adapter.subscribeStatesAsync('smart.*');

    adapter.log.info(`Connecting with ${adapter.config.cloudUrl}`);

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

    // adapter.config.amazonAlexa && alexaSH3 && alexaSH3.setLanguage(lang, translate);
    // adapter.config.amazonAlexa && alexaSH3 && alexaSH3.updateDevices();

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

    const iotClientId = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');
    // user will be created here
    await startDevice(iotClientId, adapter.config.login, adapter.config.pass);

    // after the user created, we can try to generate URL key
    // read URL keys from server
    try {
        urlKey = await readUrlKey();
    } catch (error) {
        if (adapter.config.googleHome ||
            adapter.config.yandexAlisa ||
            adapter.config.allowedServices.length ||
            adapter.config.iftttKey
        ) {
            try {
                urlKey = await createUrlKey(adapter.config.login, adapter.config.pass);
            } catch (err) {
                return adapter.log.error(`Cannot read URL key: ${typeof err === 'object' ? JSON.stringify(err) : err}`);
            }
        }
    }

    if (adapter.config.amazonAlexa) {
        alexaSH3 = new AlexaSH3({
            adapter: adapter,
            iotClientId: iotClientId,
            iotDevice: device,
        });
        alexaSH3.setLanguage(lang);
        await alexaSH3.updateDevices();
    }

    if (adapter.config.googleHome) {
        googleHome = new GoogleHome(adapter, urlKey);
    }// no else
    if (adapter.config.yandexAlisa) {
        yandexAlisa = new YandexAlisa(adapter, urlKey);
    }

    googleHome && googleHome.setLanguage(lang, translate);
    googleHome && googleHome.updateDevices();

    yandexAlisa && yandexAlisa.setLanguage(lang, translate);
    yandexAlisa && yandexAlisa.updateDevices();
}

// If started as allInOne mode => return function to create instance
// @ts-ignore
if (module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
