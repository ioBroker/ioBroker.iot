'use strict';
const request = require('request');
const {
    Types,
    ChannelDetector
} = require('iobroker.type-detector');
// Possible device types: https://developers.google.com/actions/smarthome/traits/
const PROTOCOL_VERSION = 1;
const RETRY_UNKNOWN_DEVICES_INTERVAL = 10 * 60000; // 10 minutes

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


const traitEnum = {
    "action.devices.traits.ArmDisarm": 'arm',
    "action.devices.traits.Brightness": 'brightness',
    "action.devices.traits.CameraStream": 'cameraStream',
    "action.devices.traits.ColorSetting": 'color',
    "action.devices.traits.Dock": 'command',
    "action.devices.traits.FanSpeed": 'fanSped',
    "action.devices.traits.LightEffects": 'command',
    "action.devices.traits.Locator": 'command',
    "action.devices.traits.LockUnlock": 'lock',
    "action.devices.traits.Modes": 'updateModeSettings',
    "action.devices.traits.OnOff": 'on',
    "action.devices.traits.OpenClose": 'openPercent',
    "action.devices.traits.RunCycle": 'currentTotalRemainingTime',
    "action.devices.traits.Scene": 'deactivate',
    "action.devices.traits.StartStop": 'start',
    "action.devices.traits.TemperatureControl": 'temperature',
    "action.devices.traits.TemperatureSetting": 'thermostatTemperatureSetpoint',
    "action.devices.traits.Timer": 'timerRemainingSec',
    "action.devices.traits.Toggles": 'updateToggleSettings',
}

const URL_STATUS = 'https://gstatus.iobroker.in/v1/googleHomeStatus';

const ignoreIds = [
    /^system\./,
    /^script\./,
];

class GoogleHome {
    constructor(adapter, urlKey) {
        this.adapter = adapter;
        this.urlKey = urlKey;
        this.lang = 'de';
        this.agentUserId = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');

        this.smartDevices = {};
        this.enums = [];
        this.usedIds = [];
        this.detector = new ChannelDetector();
        this.urlKeyOk = false;
        this.unknownDevices = {};

        this.tasksTimer = null;



        this.updateDevices();
    }

    checkUrlKey(forceCheck) {
        return new Promise((resolve, reject) => {
            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&v=${PROTOCOL_VERSION}`;
            request.get({
                method: 'GET',
                url
            }, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    this.adapter.log.debug(`[GHOME] CHECK URL reported: ${JSON.stringify(body)}`);
                    this.urlKeyOk = true;
                    resolve();
                } else {
                    this.adapter.config.googleHome && this.adapter.log.error('[GHOME] Cannot report device state: ' + (error || body.error || body));
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

    _unsubscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            console.log('Subscribe ' + id);
            this.adapter.unsubscribeForeignStates(id, () => setImmediate(() => this._unsubscribeAllIds(ids, cb)));
        }
    }

    unsubscribeAllIds(cb) {
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
        this.adapter.log.debug(`[GHOME] Unsubscribe ${ids.length} states for google home`);
        this._unsubscribeAllIds(ids, () => {
            this.adapter.log.debug(`[GHOME] Unsubscribe done`);
            cb && cb();
        });
    }

    subscribeAllIds(cb) {
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
        this.adapter.log.debug(`[GHOME] Subscribe ${ids.length} states for google home`);
        this._subscribeAllIds(ids, () => {
            this.adapter.log.debug(`[GHOME] Subscribe done`);
            cb && cb();
        });
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
            name = name[this.lang] || name['en'];
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
            if (func) {
                pos = _name.indexOf(func.toLowerCase());
                if (pos !== -1) {
                    name = name.substring(0, pos) + name.substring(pos + room.length + 1);
                }
            }
            name = name.replace(/\s\s/g).replace(/\s\s/g).trim();
        }
        return name;
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
            return states[id] && states[id].common ? states[id].common.smartName : null;
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

        let smartName = this.getSmartName(objects, id);

        if (!smartName || smartName === 'ignore' || smartName === false) {
            return;
        }

        let friendlyName = ""
        if (typeof smartName === 'object' && smartName) {
            friendlyName = smartName[this.lang] || smartName.en;
        }


        result[id] = {};
        if (typeof smartName === 'object' && smartName) {
            result[id].type = smartName.ghType;
            if (smartName.ghTraits) {
                result[id].traits = smartName.ghTraits
                result[id].displayTraits = [smartName.ghTraits[0]];
            }
        }



        const friendlyNamesArray = friendlyName.replace(/, /g, ',').split(",");



        result[id].name = {
                defaultNames: [objects[id].common ? objects[id].common.name : ""],
                name: friendlyNamesArray[0],
                nicknames: friendlyNamesArray
            },
            result[id].willReportState = true,
            result[id].roomHint = roomName || '',
            result[id].deviceInfo = {
                manufacturer: 'ioBroker',
                model: id.split('.')[0],
            },

            result[id].id = id
        result[id].customData = {
            get_on: id
        };
        if (objects[id].common && objects[id].common.write) {
            result[id].customData["set_on"] = id;

        }
        if (this.smartNames[friendlyName] && this.smartNames[friendlyName].roomHint === roomName) {
            if (smartName.ghTraits && Array.isArray(smartName.ghTraits)) {
                const command = traitEnum[smartName.ghTraits[0]]
                const orgId = this.smartNames[friendlyName].id
                result[orgId].traits.push(smartName.ghTraits[0]);
                result[orgId].customData["set_" + command] = id;
                result[orgId].customData["get_" + command] = id;
                result[id].merged = true;

            }


        } else {
            this.smartNames[friendlyName] = result[id];
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
                            resolve({
                                objects,
                                enums
                            });
                        });
                    });
                });
            });
        });
    }

    updateDevices(cb) {
        this.unsubscribeAllIds(() => {
            this._updateDevices()
                .then(smartDevices => {
                    this.smartDevices = smartDevices;
                    // Check KEY
                    this.checkUrlKey()
                        .then(() => this.subscribeAllIds(cb))
                        .catch(err => this.adapter.config.googleHome && this.adapter.log.warn('[GHOME] Invalid URL key. Status update is disabled: ' + err));
                });
        });
    }

    getDevices() {
        const result = Object.keys(this.smartDevices)
            .filter(device => {
                if (this.smartDevices[device].name) {
                    return true;
                }
                return false;
            })
            .map(device => {
                return this.smartDevices[device];
            });
        return result;
    }

    _updateDevices() {
        return this._readObjects()
            .then(data => {
                const {
                    objects,
                    enums
                } = data;
                let ids = Object.keys(objects);

                this.enums = [];
                this.smartDevices = {};
                this.smartNames = {};
                this.enums = [];
                this.usedIds = [];
                this.keys = [];

                ids.sort();

                // Build overlap from rooms and functions
                let rooms = [];
                let allRooms = [];
                let funcs = [];
                let smartName;
                Object.keys(enums).forEach(id => {
                    smartName = this.getSmartName(enums[id]);
                    if (id.match(/^enum\.rooms\./)) {
                        allRooms.push(id);
                        if (smartName !== 'ignore' && smartName !== false) {
                            rooms.push(id);
                        }
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

                //find smartnames without room or func
                Object.keys(objects).forEach(id => {
                    smartName = this.getSmartName(objects[id]);
                    if (smartName && smartName !== 'ignore' && smartName !== false) {
                        let roomHint = ""
                        //find room
                        allRooms.forEach(roomId => {
                            const room = enums[roomId];
                            if (!room.common || !room.common.members || !room.common.members.length) return;

                            // If state or channel is in some room and in some function
                            const pos = room.common.members.indexOf(id);
                            if (pos !== -1) {
                                // Get the name of function (with language and if name is empty)
                                let roomName = this.getSmartName(room);
                                roomName = roomName || room.common.name;
                                if (roomName && typeof roomName === 'object') roomName = roomName[this.lang] || roomName.en;
                                if (!roomName) {
                                    roomName = roomId.substring('enum.rooms.'.length);
                                    roomName = roomName[0].toUpperCase() + roomName.substring(1);
                                }
                                roomHint = roomName;
                            }
                        });
                        this.processState(ids, objects, id, roomHint, "", result);
                    }
                });
                this.usedIds = null;
                this.keys = null;

                Object.keys(result).forEach(id => this.adapter.log.debug(`[GHOME] ${id} => ${result[id].type}`));

                return result;
            });
    }

    updateState(id, state) {
        const now = Date.now();
        // Only pro with valid license can update states
        if (!this.urlKeyOk || (this.unknownDevices[id] && now - this.unknownDevices[id] < RETRY_UNKNOWN_DEVICES_INTERVAL)) { // 10 minutes
            return;
        }

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
            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&v=${PROTOCOL_VERSION}`;
            request.post({
                method: 'POST',
                url,
                json
            }, (error, response, body) => {
                if (!error && response.statusCode === 200) {
                    if (this.unknownDevices[id]) {
                        delete this.unknownDevices[id];
                    }
                    this.adapter.log.debug(`[GHOME] Status reported: ${JSON.stringify(body)}`);
                } else {
                    if (response.statusCode === 404) {
                        this.adapter.log.error(`[GHOME] device ${id} is unknown to google home`);
                        this.unknownDevices[id] = Date.now();
                    } else if (response.statusCode === 401) {
                        this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else if (response.statusCode === 410) {
                        this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else {
                        this.adapter.log.error('[GHOME] Cannot updateState: ' + (error || body.error || body));
                    }
                }
            });
        }
    }

    updateStates(json) {
        if (!this.urlKeyOk || !this.urlKey) {
            return;
        }

        if (!json) {
            json = {};
            for (const devId in this.smartDevices) {
                if (this.smartDevices.hasOwnProperty(devId)) {
                    const custom = this.smartDevices[devId].customData;
                    for (const attr in custom) {
                        if (custom.hasOwnProperty(attr) && attr.startsWith('get_')) {
                            const _attr = attr.substring(4);
                            json[devId] = json[devId] || {};
                            json[devId][_attr] = {
                                id: custom[attr]
                            };
                        }
                    }
                }
            }
        }

        for (let devId in json) {
            if (!json.hasOwnProperty(devId)) continue;
            for (let attr in json[devId]) {
                if (!json[devId].hasOwnProperty(attr)) continue;

                if (typeof json[devId][attr] === 'object' && json[devId][attr].id) {
                    this.adapter.getForeignState(json[devId][attr].id, (err, state) => {
                        state = state || {
                            val: false
                        };
                        if (attr === 'on') {
                            json[devId][attr] = state.val === 1 || state.val === '1' || state.val === 'true' || state.val === 'ON' || state.val === 'on' || state.val === true || (typeof state.val === 'number' && state.val > 0);
                        } else {
                            json[devId][attr] = state.val;
                        }
                    });

                    return;
                }
            }
        }

        const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&v=${PROTOCOL_VERSION}`;
        request.post({
            method: 'POST',
            url,
            json
        }, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                Object.keys(this.unknownDevices).forEach(id => {
                    if (this.unknownDevices[id]) {
                        delete this.unknownDevices[id];
                    }
                });

                this.adapter.log.debug(`[GHOME] Status reported: ${JSON.stringify(body)}`);
            } else {
                if (response.statusCode === 404) {
                    this.adapter.log.error(`[GHOME] devices are unknown to google home`);
                    Object.keys(this.unknownDevices).forEach(id => this.unknownDevices[id] = Date.now());
                } else if (response.statusCode === 401) {
                    this.adapter.log.error(`[GHOME] auth error: ${JSON.stringify(body)}`);
                    this.urlKeyOk = false; // invalidate urlKey
                } else if (response.statusCode === 410) {
                    this.adapter.log.error(`[GHOME] invalid protocol version: ${JSON.stringify(body)}`);
                    this.urlKeyOk = false; // invalidate urlKey
                } else {
                    this.adapter.log.error('[GHOME] Cannot updateState: ' + (error || body.error || body));
                }
            }
        });
    }


    // https://developers.google.com/actions/smarthome/create#request
    sync(requestId) {

        let devices = []
        const devicesTemp = Object.keys(this.smartDevices).map(id => {
            if (!this.smartDevices[id].merged) {

                const dev = JSON.parse(JSON.stringify(this.smartDevices[id]));
                delete dev.displayTraits;
                // not yet active
                // dev.willReportState = this.urlKeyOk;
                devices.push(dev)
                return dev;
            }
            return null;
        });

        if (devices.length === 0) {
            this.adapter.log.warn('[GHOME] No devices defined. Did you add not sensor or indicate states to rooms and enums?')
        }

        this.tasksTimer && clearTimeout(this.tasksTimer);
        this.tasksTimer = setTimeout(() => this.updateStates(), 3000);


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

            if (task.cmd === 'action.devices.commands.SetToggles') {
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
                        results[task.devId] = {
                            error
                        };
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
                this.adapter.log.error('[GHOME] Invalid parameter commands - NULL');
                resolve({
                    error: 'Invalid parameter'
                });
            }

            const tasks = [];
            commands.forEach(command => {
                command.execution.forEach(execute => {
                    console.log(`${execute.command} => ${execute.params.on}`);

                    command.devices.forEach(dev => {
                        if (this.smartDevices[dev.id]) {
                            const attrs = this.smartDevices[dev.id].customData;

                            if (execute.command === 'action.devices.commands.SetToggles') {
                                if (attrs['set_on']) {
                                    tasks.push({
                                        id: attrs['set_on'],
                                        cmd: execute.command,
                                        param: 'on',
                                        devId: dev.id
                                    });
                                }
                            } else {
                                Object.keys(execute.params).forEach(param => {
                                    if (attrs['set_' + param]) {
                                        tasks.push({
                                            id: attrs['set_' + param],
                                            val: execute.params[param],
                                            param,
                                            devId: dev.id
                                        });
                                    }
                                });
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

    process(request, isEnabled, callback) {
        if (!request) {
            this.adapter.log.error('[GHOME] Invalid request: no request!');
            return;
        }

        if (!isEnabled) {
            if (this.lang === 'en') {
                callback({
                    error: 'The service deactivated',
                    errorCode: 501
                });
            } else if (this.lang === 'ru') {
                callback({
                    error: 'Сервис отключен',
                    errorCode: 501
                });
            } else {
                callback({
                    error: 'Der service ist deaktiviert',
                    errorCode: 501
                });
            }

            return;
        }

        if (!request.inputs) {
            if (this.lang === 'en') {
                callback({
                    error: 'missing inputs',
                    errorCode: 401
                });
            } else if (this.lang === 'ru') {
                callback({
                    error: 'Неправильные параметры',
                    errorCode: 401
                });
            } else {
                callback({
                    error: 'Falsche Parameter',
                    errorCode: 401
                });
            }
            return;
        }

        let result;

        let isWait = false;

        request.inputs.find(input => {
            let intent = input.intent;
            if (!intent) {
                if (this.lang === 'en') {
                    callback({
                        error: 'missing inputs',
                        errorCode: 401
                    });
                } else if (this.lang === 'ru') {
                    callback({
                        error: 'Неправильные параметры',
                        errorCode: 401
                    });
                } else {
                    callback({
                        error: 'Falsche Parameter',
                        errorCode: 401
                    });
                }
                return true;
            }

            this.adapter.log.debug(`[GHOME] Received ${intent}`);

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
                            this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(response)}`);
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
                            this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(response)}`);
                            callback(response);
                            callback = null;
                        });
                    break;

                case 'action.devices.DISCONNECT':
                    this.adapter.log.info('[GHOME] Google home unlinked!');
                    // sync
                    result = {};
                    break;

                default:
                    result = {
                        error: 'missing intent',
                        errorCode: 401
                    };
                    break;
            }

            if (result) {
                this.adapter.log.debug(`[GHOME] Response on ${intent}: ${JSON.stringify(result)}`);
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
                callback({
                    error: 'missing inputs',
                    errorCode: 401
                });
            } else if (this.lang === 'ru') {
                callback({
                    error: 'Неправильные параметры',
                    errorCode: 401
                });
            } else {
                callback({
                    error: 'Falsche Parameter',
                    errorCode: 401
                });
            }
        }
    }
}

module.exports = GoogleHome;