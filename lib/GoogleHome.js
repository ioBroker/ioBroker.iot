'use strict';
const request = require('request');
const {Types, ChannelDetector} = require('iobroker.type-detector');
// Possible device types: https://developers.google.com/actions/smarthome/traits/


// Possible traits: https://developers.google.com/actions/smarthome/traits/
// - action.devices.traits.TemperatureSetting
// - action.devices.traits.OnOff
// - action.devices.traits.Toggles
// - action.devices.traits.Modes
// - action.devices.traits.FanSpeed

// - action.devices.traits.Brightness
// - action.devices.traits.ColorTemperature
// - action.devices.traits.ColorSpectrum

// - action.devices.traits.CameraStream

// - action.devices.traits.StartStop
// - action.devices.traits.RunCycle

// - action.devices.traits.Scene

// - action.devices.traits.Dock

const URL_STATUS = 'https://gstatus.iobroker.in/v1/googleHomeStatus';

const ignoreIds = [
    /^system\./,
    /^script\./,
];

class GoogleHome {
    constructor(adapter, urlKey) {
        this.adapter = adapter;
        this.urlKey = urlKey;
        this.lang    = 'de';
        this.agentUserId = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');

        this.smartDevices = {};
        this.enums   = [];
        this.usedIds = [];
        this.detector = new ChannelDetector();
        this.urlKeyOk = false;

        this.converter = {
            [Types.socket]: this.processSocket.bind(this),
            [Types.light]: this.processLight.bind(this),
            [Types.dimmer]: this.processDimmer.bind(this)
        };

        this.getDevices()
            .then(smartDevices =>
            {
                this.smartDevices = smartDevices;
                // Check KEY
                this.checkUrlKey()
                    .then(() => this.subscribeAllIds())
                    .catch(err => this.adapter.log.warn('Invalid URL key. Status update is disabled: ' + err));


            });
    }

    checkUrlKey() {
        return new Promise((resolve, reject) => {
            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}`;
            request.get({
                method: 'GET',
                url
            }, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    this.adapter.log.debug(`CHECK URL reported: ${JSON.stringify(body)}`);
                    this.urlKeyOk = true;
                    resolve();
                } else {
                    this.adapter.log.error('Cannot report device state: ' + error);
                    reject(error || body);
                }
            });
        });
    }

    _subscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            console.log('Subscribe ' + id);
            this.adapter.subscribeForeignStates(id, () => setImmediate(() => this._subscribeAllIds(ids, cb)));
        }
    }

    subscribeAllIds() {
        const ids = [];
        for (const devId in this.smartDevices) {
            if (this.smartDevices.hasOwnProperty(devId)) {
                const custom = this.smartDevices[devId].customData;
                for (const attr in custom) {
                    if (custom.hasOwnProperty(attr) && attr.startsWith('get_') && ids.indexOf(custom[attr]) === -1) {
                        ids.push(custom[attr]);
                    }
                }
            }
        }
        this.adapter.log.debug(`Subscribe ${ids.length} states for google home`);
        this._subscribeAllIds(ids, () =>
            this.adapter.log.debug(`Subscribe done`));
    }

    getObjectName(obj) {
        let name = '';
        // extract from smartName the name
        if (this.adapter.config.noCommon) {
            if (obj.common &&
                obj.common.custom &&
                obj.common.custom[this.adapter.namespace] &&
                obj.common.custom[this.adapter.namespace].smartName &&
                obj.common.custom[this.adapter.namespace].smartName !== 'ignore') {
                name = obj.common.custom[this.adapter.namespace].smartName;
            }
        } else {
            if (obj.common &&
                obj.common.smartName &&
                obj.common.smartName !== 'ignore') {
                name = obj.common.smartName;
            }
        }

        // if no smart name found, get the normal key
        if (!name && obj && obj.common && obj.common.name) {
            name = obj.common.name;
        }

        if (name && typeof name === 'object') {
            name = name[this.lang] || name.en;
        }

        if (!name && obj) {
            name = obj._id.split('.').pop();
        }

        return name;
    }

    checkName(name, obj, room, func) {
        if (!name) {
            name = name || this.getObjectName(obj);
            name = name.replace(/[^a-zA-ZöäüßÖÄÜа-яА-Я0-9]/g, ' ');
            const _name = name.toLowerCase();
            let pos;
            if (room) {
                pos = _name.indexOf(room.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length + 1);
                }
            }
            if (func){
                pos = _name.indexOf(func.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length + 1);
                }
            }
            name = name.replace(/\s\s/g).replace(/\s\s/g).trim();
        }
        return name;
    }

    processSocket(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.OUTLET',
            traits: [
                'action.devices.traits.OnOff',
                'action.devices.traits.Toggles'
            ],
            name: {
                defaultNames: [room + 'steckdose'],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on
            },
            id
        };
    }

    processLight(id, control, name, room, func, obj) {
        const setOnOffState = control.states.find(state => state.name === 'SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;

        const traits = [
            'action.devices.traits.OnOff',
            'action.devices.traits.Toggles'
        ];
        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            name: {
                defaultNames: [room + 'licht'],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on
            },
            id
        };
    }

    processDimmer(id, control, name, room, func, obj) {
        const setBrightnessState = control.states.find(state => state.name === 'SET' && state.id);
        const set_brightness = setBrightnessState && setBrightnessState.id;

        const getBrightnessState = control.states.find(state => state.name === 'ACTUAL' && state.id);
        const get_brightness = (getBrightnessState && getBrightnessState.id) || set_brightness;

        const setOnOffState = control.states.find(state => state.name === 'ON_SET' && state.id);
        const set_on = setOnOffState && setOnOffState.id;

        const getOnOffState = control.states.find(state => state.name === 'ON_ACTUAL' && state.id);
        const get_on = (getOnOffState && getOnOffState.id) || set_on;


        const traits = [];

        if (set_on) {
            traits.push('action.devices.traits.OnOff');
            traits.push('action.devices.traits.Toggles');
        }
        if (set_brightness) {
            traits.push('action.devices.traits.Brightness');
        }

        name = this.checkName(name, obj, room, func);

        return {
            type: 'action.devices.types.LIGHT',
            traits,
            name: {
                defaultNames: [room + 'licht'],
                name: this.getObjectName(obj) || name,
                nicknames: [name]
            },
            willReportState: true,
            roomHint: room || '',
            deviceInfo: {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },
            customData: {
                set_on,
                get_on,
                set_brightness,
                get_brightness
            },
            id
        };
    }

    setLanguage(_lang) {
        this.lang = _lang || 'de';
    }

    getSmartName(states, id) {
        if (!id) {
            if (!this.adapter.config.noCommon) {
                return states.common.smartName;
            } else {
                return (states &&
                    states.common &&
                    states.common.custom &&
                    states.common.custom[this.adapter.namespace]) ?
                    states.common.custom[this.adapter.namespace].smartName : undefined;
            }
        } else
        if (!this.adapter.config.noCommon) {
            return states[id].common.smartName;
        } else {
            return (states[id] &&
                states[id].common &&
                states[id].common.custom &&
                states[id].common.custom[this.adapter.namespace]) ?
                states[id].common.custom[this.adapter.namespace].smartName || null : null;
        }
    }

    processState(ids, objects, id, roomName, funcName, result) {
        if (!id) {
            return;
        }

        let friendlyName = this.getSmartName(objects, id);
        if (typeof friendlyName === 'object' && friendlyName) {
            friendlyName = friendlyName[this.lang] || friendlyName.en;
        }

        if (friendlyName === 'ignore' || friendlyName === false) {
            return;
        }

        if (!friendlyName && !roomName && !funcName) {
            return;
        }

        try {
            // try to detect device
            const options = {
                objects:            objects,
                id:                 id,
                _keysOptional:      ids,
                _usedIdsOptional:   this.usedIds
            };
            const controls = this.detector.detect(options);
            if (controls) {
                controls.forEach(control => {
                    if (this.converter[control.type]) {
                        result[id] = this.converter[control.type](id, control, friendlyName, roomName, funcName, objects[id]);
                    }
                });
            } else {
                console.log(`Nothing found for ${options.id}`);
            }
        } catch (e) {
            this.adapter.log.error('Cannot process "' + id + '": ' + e);
        }
    }

    _readObjects() {
        return new Promise(resolve => {
            this.adapter.objects.getObjectView('system', 'state', {}, (err, _states) => {
                this.adapter.objects.getObjectView('system', 'channel', {}, (err, _channels) => {
                    this.adapter.objects.getObjectView('system', 'device', {}, (err, _devices) => {
                        this.adapter.objects.getObjectView('system', 'enum', {}, (err, _enums) => {
                            const objects = {};
                            const enums = {};
                            if (_devices && _devices.rows) {
                                for (let i = 0; i < _devices.rows.length; i++) {
                                    if (_devices.rows[i].value && _devices.rows[i].value._id && !ignoreIds.find(reg => reg.test(_devices.rows[i].value._id))) {
                                        objects[_devices.rows[i].value._id] = _devices.rows[i].value;
                                    }
                                }
                            }
                            if (_channels && _channels.rows) {
                                for (let i = 0; i < _channels.rows.length; i++) {
                                    if (_channels.rows[i].value && _channels.rows[i].value._id && !ignoreIds.find(reg => reg.test(_channels.rows[i].value._id))) {
                                        objects[_channels.rows[i].value._id] = _channels.rows[i].value;
                                    }
                                }
                            }
                            if (_states && _states.rows) {
                                for (let i = 0; i < _states.rows.length; i++) {
                                    if (_states.rows[i].value && _states.rows[i].value._id && !ignoreIds.find(reg => reg.test(_states.rows[i].value._id))) {
                                        objects[_states.rows[i].value._id] = _states.rows[i].value;
                                    }
                                }
                            }
                            if (_enums && _enums.rows) {
                                for (let i = 0; i < _enums.rows.length; i++) {
                                    if (_enums.rows[i].value && _enums.rows[i].value._id) {
                                        enums[_enums.rows[i].value._id] = _enums.rows[i].value;
                                        objects[_enums.rows[i].value._id] = _enums.rows[i].value;
                                    }
                                }
                            }
                            resolve({objects, enums});
                        });
                    });
                });
            });
        });
    }

    getDevices() {
        return this._readObjects()
            .then(data => {
                const {objects, enums} = data;
                let ids      = Object.keys(objects);

                this.enums   = [];
                this.smartDevices = {};
                this.enums   = [];
                this.usedIds = [];
                this.keys    = [];

                ids.sort();

                // Build overlap from rooms and functions
                let rooms = [];
                let funcs = [];
                let smartName;
                Object.keys(enums).forEach(id => {
                    smartName = this.getSmartName(enums[id]);
                    if (id.match(/^enum\.rooms\./)     && smartName !== 'ignore' && smartName !== false) {
                        rooms.push(id);
                    } else
                    if (id.match(/^enum\.functions\./) && smartName !== 'ignore' && smartName !== false) {
                        funcs.push(id);
                    }
                });

                let result = {};
                let roomNames = {};
                funcs.forEach(funcId => {
                    const func = enums[funcId];
                    if (!func.common || !func.common.members || typeof func.common.members !== 'object' || !func.common.members.length) return;

                    // Get the name of function (with language and if name is empty)
                    let funcName = this.getSmartName(func);
                    funcName = funcName || func.common.name;
                    if (funcName && typeof funcName === 'object') funcName = funcName[this.lang] || funcName.en;
                    if (!funcName) {
                        funcName = funcId.substring('enum.functions.'.length);
                        funcName = funcName[0].toUpperCase() + funcName.substring(1);
                    }

                    func.common.members.forEach(id => {
                        rooms.forEach(roomId => {
                            const room = enums[roomId];
                            if (!room.common || !room.common.members || typeof func.common.members !== 'object' || !room.common.members.length) return;

                            // If state or channel is in some room and in some function
                            const pos = room.common.members.indexOf(id);
                            if (pos !== -1) {
                                // find name for room if not found earlier
                                if (!roomNames[roomId]) {
                                    // Get the name of function (with language and if name is empty)
                                    let roomName = this.getSmartName(room);
                                    roomName = roomName || room.common.name;
                                    if (roomName && typeof roomName === 'object') roomName = roomName[this.lang] || roomName.en;
                                    if (!roomName) {
                                        roomName = roomId.substring('enum.rooms.'.length);
                                        roomName = roomName[0].toUpperCase() + roomName.substring(1);
                                    }
                                    roomNames[roomId] = roomName;
                                }

                                this.processState(ids, objects, id, roomNames[roomId], funcName, result);
                            }
                        });
                    });
                });

                this.usedIds = null;
                this.keys    = null;

                Object.keys(result).forEach(id => this.adapter.log.debug(`${id} => ${result[id].type}`));

                return result;
            });
    }

    updateState(id, state) {
        // Only pro with valid license can update states
        if (!this.urlKeyOk) return;

        const json = {};
        let found = false;
        for (const devId in this.smartDevices) {
            if (this.smartDevices.hasOwnProperty(devId)) {
                const custom = this.smartDevices[devId].customData;
                for (const attr in custom) {
                    if (custom.hasOwnProperty(attr) && custom[attr] === id && attr.startsWith('get_')) {
                        const _attr = attr.substring(4);
                        json[devId] = json[devId] || {};

                        if (_attr === 'on') {
                            json[devId][_attr] = state.val === 1 || state.val === '1' || state.val === 'true' || state.val === 'ON' || state.val === 'on' || state.val === true || (typeof state.val === 'number' && state.val > 0);
                        } else {
                            json[devId][_attr] = state.val;
                        }
                        found = true;
                    }
                }
            }
        }

        if (found && this.urlKey) {
            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}`;
            request.post({
                method: 'POST',
                url,
                json
            }, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    this.adapter.log.debug(`Status reported: ${JSON.stringify(body)}`);
                } else {
                    this.adapter.log.error('Cannot report device state: ' + error);
                }
            });
        }
    }

    // https://developers.google.com/actions/smarthome/create#request
    sync(requestId) {
        const devices = Object.keys(this.smartDevices).map(id => {
            const dev = JSON.parse(JSON.stringify(this.smartDevices[id]));
            // not yet active
            // dev.willReportState = this.urlKeyOk;
            return dev;
        });

        return {
            requestId,
            payload: {
                agentUserId: this.agentUserId,
                devices: devices
            }
        };
    }

    getStates(ids, callback, states) {
        states = states || {};
        if (!ids || !ids.length) {
            callback(states);
        } else {
            const id = ids.shift();
            this.adapter.getForeignState(id, (err, state) => {
                states[id] = state && state.val;
                setImmediate(() => this.getStates(ids, callback, states));
            });
        }
    }

    // possible responses
    query(requestId, devices) {
        return new Promise(resolve => {
            const responseDev = {};
            const ids = [];

            devices.forEach(dev => {
                if (this.smartDevices[dev.id]) {
                    const attrs = this.smartDevices[dev.id].customData;
                    Object.keys(attrs).forEach(attr => attr.startsWith('get_') && ids.indexOf(attrs[attr]) === -1 && ids.push(attrs[attr]));
                }
            });
            this.getStates(ids, states => {
                devices.forEach(dev => {
                    if (this.smartDevices[dev.id]) {
                        responseDev[dev.id] = {
                            online: true
                        };
                        const attrs = this.smartDevices[dev.id].customData;
                        Object.keys(attrs).forEach(attr => {
                            if (attr.startsWith('get_')) {
                                responseDev[dev.id][attr.substring(4)] = states[attrs[attr]];
                            }
                        });
                    } else {
                        responseDev[dev.id] = {
                            online: false
                        }
                    }

                    /*responseDev[dev.id] = {
                        on: true,
                        online: true,

                        brightness: 44,
                        color: {
                            name: 'soft white',
                            temperature: 2700
                        }
                    }*/
                });
                resolve({
                    requestId,
                    payload: {
                        devices: responseDev
                    }
                });
            });
        });
    }

    setStates(tasks, callback, results) {
        results = results || {};
        if (!tasks || !tasks.length) {
            callback(results);
        } else {
            const task = tasks.shift();

            if (task.cmd === 'action.devices.commands.Toggle') {
                this.adapter.getForeignState(task.id, task.val, (error, state) => {
                    if (!error) {
                        const val = !(state && state.val);
                        this.adapter.setForeignState(task.id, val, error => {
                            results[task.devId] = results[task.devId] || {};
                            results[task.devId][task.param] = val;
                            if (error) {
                                results[task.devId].error = error;
                            }
                            setImmediate(() => this.setStates(tasks, callback, results));
                        });
                    } else {
                        results[task.devId] = {error};
                        setImmediate(() => this.setStates(tasks, callback, results));
                    }
                });
            } else {
                this.adapter.setForeignState(task.id, task.val, error => {
                    results[task.devId] = results[task.devId] || {};
                    results[task.devId][task.param] = task.val;

                    if (error) {
                        results[task.devId].error = error;
                    }
                    setImmediate(() => this.setStates(tasks, callback, results));
                });
            }
        }
    }

    execute(requestId, commands) {
        return new Promise(resolve => {
            if (!commands) {
                this.adapter.log.error('Invalid parameter commands - NULL');
                resolve({error: 'Invalid parameter'});
            }

            const tasks = [];
            commands.forEach(command => {
                command.execution.forEach(execute => {
                    console.log(`${execute.command} => ${execute.params.on}`);

                    command.devices.forEach(dev => {
                        if (this.smartDevices[dev.id]) {
                            const attrs = this.smartDevices[dev.id].customData;

                            if (execute.command === 'action.devices.commands.BrightnessAbsolute' ||
                                execute.command === 'action.devices.commands.OnOff') {
                                Object.keys(execute.params).forEach(param => {
                                    if (attrs['set_' + param]) {
                                        tasks.push({id: attrs['set_' + param], val: execute.params[param], param, devId: dev.id});
                                    }
                                });
                            } else if (execute.command === 'action.devices.commands.Toggle') {
                                if (attrs['set_on']) {
                                    tasks.push({id: attrs['set_on'], cmd: execute.command, param: 'on', devId: dev.id});
                                }
                            }
                        }
                    });
                });
            });

            this.setStates(tasks, results => {
                const responseCommands = Object.keys(results).map(devId => {
                    if (results[devId].error) {
                        return {
                            ids: [devId],
                            status: 'ERROR',
                            errorCode: results[devId].error
                        }
                    } else {
                        if (results[devId].online === undefined) {
                            results[devId].online = true;
                        }
                        return {
                            ids: [devId],
                            status: 'SUCCESS',
                            states: results[devId]
                        }
                    }
                });

                resolve({
                    requestId,
                    payload: {
                        commands: responseCommands
                    }
                });
            });
        });
    }

    process (request, isEnabled, callback) {
        if (!request) {
            this.adapter.log.error('Invalid request: no request!');
            return;
        }

        if (!isEnabled) {
            if (this.lang === 'en') {
                callback({error: 'The service deactivated', errorCode: 501});
            } else if (this.lang === 'ru') {
                callback({error: 'Сервис отключен', errorCode: 501});
            } else {
                callback({error: 'Der service ist deaktiviert', errorCode: 501});
            }

            return;
        }

        if (!request.inputs) {
            if (this.lang === 'en') {
                callback({error: 'missing inputs', errorCode: 401});
            } else if (this.lang === 'ru') {
                callback({error: 'Неправильные параметры', errorCode: 401});
            } else {
                callback({error: 'Falsche Parameter', errorCode: 401});
            }
            return;
        }

        let result;

        let isWait = false;

        request.inputs.find(input => {
            let intent = input.intent;
            if (!intent) {
                if (this.lang === 'en') {
                    callback({error: 'missing inputs', errorCode: 401});
                } else if (this.lang === 'ru') {
                    callback({error: 'Неправильные параметры', errorCode: 401});
                } else {
                    callback({error: 'Falsche Parameter', errorCode: 401});
                }
                return true;
            }

            this.adapter.log.debug(`Received ${intent}`);

            switch (intent) {
                case 'action.devices.SYNC':

                    /**
                     * request:
                     * {
                     *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *  "inputs": [{
                     *      "intent": "action.devices.SYNC",
                     *  }]
                     * }
                     */
                    // sync
                    result = this.sync(request.requestId);
                    break;

                case 'action.devices.QUERY':
                    isWait = true;
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *       "intent": "action.devices.QUERY",
                     *       "payload": {
                     *          "devices": [{
                     *            "id": "123",
                     *            "customData": {
                     *              "fooValue": 12,
                     *              "barValue": true,
                     *              "bazValue": "alpaca sauce"
                     *            }
                     *          }, {
                     *            "id": "234",
                     *            "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *            }
                     *          }]
                     *       }
                     *   }]
                     * }
                     */

                    // async
                    this.query(request.requestId, input.payload.devices)
                        .then(response => {
                            this.adapter.log.debug(`Response on ${intent}: ${JSON.stringify(response)}`);
                            callback(response);
                            callback = null;
                        });
                    break;

                case 'action.devices.EXECUTE':
                    isWait = true;
                    /**
                     * request:
                     * {
                     *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
                     *   "inputs": [{
                     *     "intent": "action.devices.EXECUTE",
                     *     "payload": {
                     *       "commands": [{
                     *         "devices": [{
                     *           "id": "123",
                     *           "customData": {
                     *             "fooValue": 12,
                     *             "barValue": true,
                     *             "bazValue": "alpaca sauce"
                     *           }
                     *         }, {
                     *           "id": "234",
                     *           "customData": {
                     *              "fooValue": 74,
                     *              "barValue": false,
                     *              "bazValue": "sheep dip"
                     *           }
                     *         }],
                     *         "execution": [{
                     *           "command": "action.devices.commands.OnOff",
                     *           "params": {
                     *             "on": true
                     *           }
                     *         }]
                     *       }]
                     *     }
                     *   }]
                     * }
                     */

                    // async
                    this.execute(request.requestId, input.payload.commands)
                        .then(response => {
                            this.adapter.log.debug(`Response on ${intent}: ${JSON.stringify(response)}`);
                            callback(response);
                            callback = null;
                        });
                    break;

                case 'action.devices.DISCONNECT':
                    this.adapter.log.info('Google home unlinked!');
                    // sync
                    result = {};
                    break;

                default:
                    result = {error: 'missing intent', errorCode: 401};
                    break;
            }

            if (result) {
                this.adapter.log.debug(`Response on ${intent}: ${JSON.stringify(result)}`);
                callback(result);
                callback = null;
                return true;
            }
            if (isWait) {
                return true;
            }
        });

        if (!isWait && callback) {
            if (this.lang === 'en') {
                callback({error: 'missing inputs', errorCode: 401});
            } else if (this.lang === 'ru') {
                callback({error: 'Неправильные параметры', errorCode: 401});
            } else {
                callback({error: 'Falsche Parameter', errorCode: 401});
            }
        }
    }
}

module.exports = GoogleHome;