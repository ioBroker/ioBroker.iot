'use strict';
const {Types, ChannelDetector} = require('iobroker.type-detector');
const uuid    = require('uuid').v1;
const textsT  = require('./texts');
const roomsT  = require('./rooms');
const funcsT  = require('./functions');
const axios   = require('axios');
const version = require('../package.json').version;

// Description
// ??

const ignoreIds = [
    /^system\./,
    /^script\./,
];

function replaceInvalidChars(name) {
    name = name.replace(/[^a-zA-Z0-9А-Яа-я_]/g, '_');
    name = name.replace(/Ü/g, 'UE');
    name = name.replace(/Ä/g, 'AE');
    name = name.replace(/Ö/g, 'OE');
    name = name.replace(/ü/g, 'ue');
    name = name.replace(/ä/g, 'ae');
    name = name.replace(/ö/g, 'oe');
    name = name.replace(/ß/g, 'ss');
    return name;
}

const typesMapping = {
    on_off: 'OnOff',
    color_setting: 'RGB',
    'range_unit.percent': 'Brightness',
    'range_unit.temperature.celsius': 'setTargetTemperature',
    'float_temperature_unit.temperature.celsius': 'getActualTemperature',
    'float_temperature_unit.temperature.kelvin': 'getActualTemperature',
    'float_humidity_unit.percent': 'getActualHumidity',
    'bool_motion': 'getMotion',
    'bool_censor': 'getContact',
};

// const URL_STATUS = 'https://alisastatus.iobroker.in/v1/alisaStatus';
const URL_STATUS = 'https://20k0wcmzs4.execute-api.eu-west-1.amazonaws.com/default/alisaStatus';
const PROTOCOL_VERSION = 1;
const RETRY_UNKNOWN_DEVICES_INTERVAL = 10 * 60000; // 10 minutes

class YandexAliceConverter {
    constructor(adapter) {
        this.adapter = adapter;
        this.lang    = 'ru';

        this.types = {
            [Types.socket]:        this._processSocket.bind(this),
            [Types.light]:         this._processLight.bind(this),
            [Types.dimmer]:        this._processDimmer.bind(this),
            [Types.ct]:            this._processCT.bind(this),
            [Types.rgbSingle]:     this._processRGB.bind(this),
            [Types.airCondition]:  this._processAC.bind(this),
            [Types.thermostat]:    this._processAC.bind(this),
            [Types.blind]:         this._processBlinds.bind(this),
            [Types.lock]:          this._processLock.bind(this),
            [Types.vacuumCleaner]: this._processVacuumCleaner.bind(this),
            [Types.gate]:          this._processLock.bind(this),
            // sensors
            [Types.motion]:        this._processMotion.bind(this),
            [Types.door]:          this._processContact.bind(this),
            [Types.window]:        this._processContact.bind(this),
            [Types.temperature]:   this._processTemperature.bind(this),
            [Types.humidity]:      this._processHumidity.bind(this),
        };
        this._entities = [];
        this._entity2ID = {};
        this._ID2entity = {};
    }

    setLanguage(lang) {
        this.lang = lang || 'ru';
    }

    _getSmartName(obj) {
        if (!this.adapter.config.noCommon) {
            return obj && obj.common ? obj.common.smartName || '' : '';
        } else {
            return (obj &&
                obj.common &&
                obj.common.custom &&
                obj.common.custom[this.adapter.namespace] || '') ?
                obj.common.custom[this.adapter.namespace].smartName : '';
        }
    }

    _getObjectName(obj, _lang) {
        _lang = _lang || this.lang;

        let result = this._getSmartName(obj);

        if (!result || (typeof result !== 'object' && typeof result !== 'string')) {
            result = obj && obj.common ? obj.common.name : null;
            result = result || obj._id;
        }

        if (typeof result === 'object') {
            if (result[_lang] || result.en) {
                return result[_lang] || result.en;
            } else {
                // take first not empty value
                const lang = Object.keys(result).find(lang => result[lang]);
                if (result[lang]) {
                    return result[lang];
                } else {
                    return obj._id;
                }
            }
        }

        return result || '';
    }

    _generateName(obj, lang) {
        return this._getObjectName(obj, lang).replace(/[^-._\w0-9А-Яа-яÄÜÖßäöü]/g, '_');
    }

    _addID2entity(id, entity) {
        this._ID2entity[id] = this._ID2entity[id] || [];
        const found = this._ID2entity[id].find(e => e.entity_id === entity.entity_id);
        if (!found) {
            this._ID2entity[id].push(entity);
        }
    }

    // ------------------------------- START OF CONVERTERS ---------------------------------------- //
    _getStateBooleanProperty(entity, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.getId || attribute.setId : undefined;
            const capability = entity.context.properties.find(cap => cap.type === 'devices.properties.bool' && cap.parameters.instance === name);
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: name,
                            value: state.val === 'false' || state.val === '0' ? false : (state.val === 'true' || state.val === true || state.val === 1 || state.val === '1' || !!state.val),
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _getStateFloatProperty(entity, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.getId || attribute.setId : undefined;
            const capability = entity.context.properties.find(cap => cap.type === 'devices.properties.float' && cap.parameters.instance === name);
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: name,
                            value: parseFloat(state.val) || 0,
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _getStateNumber(entity, type, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.getId || attribute.setId : undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === type && cap.parameters.instance === name);
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: name,
                            value: parseFloat(state.val) || 0,
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateNumber(entity, data, type, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.setId || attribute.getId : undefined;
            const capability = data.capabilities.find(cap => cap.type === type && cap.state.instance === name);
            if (capability && capability.state && stateId) {
                if (capability.state.relative) {
                    return this.adapter.getForeignState(stateId, (err, state) => {
                        if (state) {
                            const val = (parseFloat(state.val) || 0) + parseFloat(capability.state.value);
                            this.adapter.setForeignState(stateId, val);
                            capability.state.action_result = {status: 'DONE'};
                            resolve(data);
                        } else {
                            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/concepts/response-codes-docpage/#codes__codes-api
                            capability.state.action_result = {status: 'ERROR', error_code: 'INVALID_VALUE', error_message: 'State has invalid value'};
                            resolve(data);
                        }
                    });
                } else {
                    this.adapter.setForeignState(stateId, parseFloat(capability.state.value));
                    capability.state.action_result = {status: 'DONE'};
                }
            }
            resolve(data);
        });
    }

    _getStateMode(entity, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.getId || attribute.setId: undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.mode' && cap.parameters.instance === name);
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: name,
                            value: attribute.states ? (attribute.states[state.val] || '').toLowerCase() : state.val,
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateMode(entity, data, name) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === name);
            const stateId = attribute ? attribute.setId || attribute.getId : undefined;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.mode' && cap.state.instance === name);
            if (capability && capability.state && stateId) {
                let val = attribute.states ? Object.keys(attribute.states).find(val => attribute.states[val].toLowerCase() === capability.state.value.toLowerCase()) : capability.state.value;
                if (attribute.states && attribute.type === 'number') {
                    val = parseInt(val, 10);
                }
                this.adapter.setForeignState(stateId, val);
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStateRange(entity, name) {
        return this._getStateNumber(entity, 'devices.capabilities.range', name);
    }

    _setStateRange(entity, data, name) {
        return this._setStateNumber(entity, data, 'devices.capabilities.range', name);
    }

    _getStateOnOff(entity) {
        return new Promise(resolve => {
            const stateId = entity.STATE.getId;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: 'on',
                            value: entity.STATE.min !== undefined && entity.STATE.min === state.val ? false : (entity.STATE.max !== undefined && entity.STATE.max === state.val ? true : !!state.val),
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateOnOff(entity, data) {
        return new Promise(resolve => {
            const stateId = entity.STATE.setId;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');
            if (capability && capability.state && stateId) {
                if (entity.STATE.type === 'number') {
                    const value = capability.state.value ? (entity.STATE.max !== undefined ? entity.STATE.max : 100) : (entity.STATE.min !== undefined ? entity.STATE.min : 0);
                    this.adapter.setForeignState(stateId, value);
                    // If number has the same ID as ON/OFF => set in the same answer the new state for dimmer/blind/...
                    /*const numberState = entity.ATTRIBUTES.find(item => item.getId === stateId)
                    if (numberState) {
                        let capability = data.capabilities.find(cap => cap.type === numberState.type);
                        if (!capability) {
                            data.capabilities.push({
                                type: 'devices.capabilities.range',
                                state: {
                                    instance: numberState.attribute,
                                    value: value
                                }
                            });
                        }
                    }*/
                } else {
                    this.adapter.setForeignState(stateId, capability.state.value);
                }
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _setStateLock(entity, data) {
        return new Promise(resolve => {
            const stateId = entity.STATE.setId;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.on_off');

            if (capability && capability.state && stateId) {
                if (capability.state.value && entity.STATE.openId) {
                    this.adapter.setForeignState(entity.STATE.openId, capability.state.value);
                } else {
                    this.adapter.setForeignState(stateId, capability.state.value);
                }
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStateBrightness(entity) {
        return this._getStateRange(entity, 'brightness');
    }

    _setStateBrightness(entity, data) {
        return this._setStateRange(entity, data, 'brightness');
    }

    _getStateCT(entity) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'ct');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        let val = parseInt(state.val);
                        // if (val) {
                        //     val = 1000000/val;
                        // }
                        capability.state = {
                            instance: 'temperature_k',
                            value: val,
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateCT(entity, data) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'ct');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
            if (capability && capability.state && stateId && capability.state.instance === 'temperature_k') {
                let val = parseInt(capability.state.value);
                // if (val) {
                //     val = Math.round(val/1000000);
                // }
                this.adapter.setForeignState(stateId, val);
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStateRGB(entity) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'rgb');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        const val = state.val.replace('#', '');
                        capability.state = {
                            instance: 'rgb',
                            value: parseInt(val, 16),
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateRGB(entity, data) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'rgb');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
            if (capability && capability.state && stateId && capability.state.instance === 'rgb') {
                const val = capability.state.value.toString(16);
                this.adapter.setForeignState(stateId, `#${val}`);
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStateTemperature(entity) {
        return this._getStateRange(entity, 'temperature');
    }

    _setStateTemperature(entity, data) {
        return this._setStateRange(entity, data, 'temperature');
    }

    _getStateThermostat(entity) {
        return this._getStateMode(entity, 'thermostat');
    }

    _setStateThermostat(entity, data) {
        return this._setStateMode(entity, data, 'thermostat');
    }

    _getStateSwing(entity) {
        return this._getStateMode(entity, 'swing');
    }

    _setStateSwing(entity, data) {
        return this._setStateMode(entity, data, 'swing');
    }

    _getStateSpeed(entity) {
        return this._getStateMode(entity, 'fan_speed');
    }

    _setStateSpeed(entity, data) {
        return this._setStateMode(entity, data, 'fan_speed');
    }

    _getStateBlinds(entity) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'open');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.range');
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: 'open',
                            value: state.val === true ? 100 : (state.val === false ? 0 : state.val),
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStateBlinds(entity, data) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'open');
            const stateId = attribute ? attribute.setId || attribute.getId : undefined;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.range');
            if (capability && capability.state && stateId) {
                this.adapter.setForeignState(stateId, capability.state.value);
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStatePause(entity) {
        return new Promise(resolve => {
            const attribute = entity.ATTRIBUTES.find(attr => attr.attribute === 'pause');
            const stateId = attribute ? attribute.getId : undefined;
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.toggle');
            if (capability && stateId) {
                this.adapter.getForeignState(stateId, (err, state) => {
                    if (!err && state) {
                        capability.state = {
                            instance: 'pause',
                            value: state.val === true || state.val === 'true' || state.val === '1' || state.val === 1 || state.val === 'AN' || state.val === 'ON'|| state.val === 'an' || state.val === 'on',
                        };
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _setStatePause(entity, data) {
        return new Promise(resolve => {
            const stateId = entity.STATE.setId;
            const capability = data.capabilities.find(cap => cap.type === 'devices.capabilities.toggle' && cap.state.instance === 'pause');
            if (capability && capability.state && stateId) {
                this.adapter.setForeignState(stateId, capability.state.value === true || capability.state.value === 'true');
                capability.state.action_result = {status: 'DONE'};
            }
            resolve(data);
        });
    }

    _getStateVacuumMode(entity) {
        return this._getStateMode(entity, 'cleanup_mode');
    }

    _setStateVacuumMode(entity, data) {
        return this._setStateMode(entity, data, 'cleanup_mode');
    }

    _getStateVacuumWorkMode(entity) {
        return this._getStateMode(entity, 'work_speed');
    }

    _setStateVacuumWorkMode(entity, data) {
        return this._setStateMode(entity, data, 'work_speed');
    }

    _getStateFloat(entity, name) {
        return this._getStateNumber(entity, 'devices.properties.float', name);
    }


    _processCommon(id, name, room, func, obj, entityType, entity_id) {
        if (!name) {
            if (func && room) {
                name = room + ' ' + func;
            } else {
                name = obj.common.custom[this.adapter.namespace].name || this._generateName(obj);
            }
        }
        const _name = replaceInvalidChars(this._generateName(obj, 'en'));

        const entity = {
            entity_id: entity_id || (entityType + '.' + _name),
            //state: this._iobState2EntityState(obj._id, state.val);
            attributes: {
                friendly_name: name
            },

            // объект описания smart-устройства
            context: {
                id: obj._id,
                type: entityType,
                name: name,
                description: name,
                room: room,
                custom_data: {
                    entity_id: entity_id || (entityType + '.' + _name),
                },
                capabilities: [],
                properties: [],
                device_info: {
                    manufacturer: 'IOBroker',
                    model: entity_id || (entityType + '.' + _name),
                    hw_version: '',
                    sw_version: this.adapter.version
                }
            },

            // доступные команды для управления
            COMMANDS: {},
            ATTRIBUTES: [],
        };

        if (obj.common.unit) {
            entity.attributes.unit_of_measurement = obj.common.unit;
            //entity.attributes.unit_of_measurement_dict = obj.common.unit;
        }

        this._ID2entity[obj._id] = this._ID2entity[obj._id] || [];
        this._ID2entity[obj._id].push(entity);
        this._entity2ID[entity.entity_id] = entity;
        this._entities.push(entity);
        return entity;
    }

    _processSocket(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.switch');

        let state = control.states.find(s => s.id && s.name === 'SET');
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type  = objects[state.id] && objects[state.id].common && objects[state.id].common.type;
            entity.attributes.icon = 'mdi:power-socket-eu';
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        entity.context.capabilities.push({
            type: 'devices.capabilities.on_off',
            retrievable: true,
        });
        entity.COMMANDS.get_state = this._getStateOnOff.bind(this);
        entity.COMMANDS.set_state = this._setStateOnOff.bind(this);
        return entity;
    }

    _processLight(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.light');

        let state = control.states.find(s => s.id && ['ON_SET', 'ON', 'SET'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.type  = objects[state.id] && objects[state.id].common && objects[state.id].common.type;
            entity.STATE.min   = objects[state.id] && objects[state.id].common && objects[state.id].common.min;
            entity.STATE.max   = objects[state.id] && objects[state.id].common && objects[state.id].common.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        entity.context.capabilities.push({
            type: 'devices.capabilities.on_off',
            retrievable: true,
        });
        entity.COMMANDS.get_state = this._getStateOnOff.bind(this);
        entity.COMMANDS.set_state = this._setStateOnOff.bind(this);
        return entity;
    }

    _processDimmer(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.light');

        let state = control.states.find(s => s.id && ['ON_SET', 'ON'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.type  = objects[state.id] && objects[state.id].common && objects[state.id].common.type;
            entity.STATE.min   = objects[state.id] && objects[state.id].common && objects[state.id].common.min;
            entity.STATE.max   = objects[state.id] && objects[state.id].common && objects[state.id].common.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ON_ACTUAL');
        if (state && state.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        let getDimmer;
        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id) {
            getDimmer = state.id;
        }

        state = control.states.find(s => s.id && ['DIMMER', 'SET', 'BRIGHTNESS'].includes(s.name));
        let setDimmer = '';
        if (state && state.id) {
            setDimmer = state.id;
            entity.ATTRIBUTES.push({attribute: 'brightness', getId: getDimmer || setDimmer, setId: setDimmer, type: objects[setDimmer] && objects[setDimmer].common && objects[setDimmer].common.type});
            this._addID2entity(state.id, entity);
        } else if (getDimmer) {
            entity.ATTRIBUTES.push({attribute: 'brightness', getId: getDimmer, setId: null, type: objects[getDimmer] && objects[getDimmer].common && objects[getDimmer].common.type});
            this._addID2entity(state.id, entity);
        }

        // capabilities
        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        if (getDimmer || setDimmer) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: !!getDimmer,
                parameters: {
                    instance: 'brightness',
                    random_access: true,
                    unit: 'unit.percent',
                    range: {
                        min: objects[getDimmer] && objects[getDimmer].common && objects[getDimmer].common.min !== undefined ? objects[getDimmer].common.min : 0,
                        max: objects[getDimmer] && objects[getDimmer].common && objects[getDimmer].common.max !== undefined ? objects[getDimmer].common.max : 100,
                        precision: 1
                    },
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateOnOff(entity)
                .then(() =>
                    this._getStateBrightness(entity));

        entity.COMMANDS.set_state = (entity, data) =>
            this._setStateOnOff(entity, data)
                .then(res =>
                    this._setStateBrightness(entity, res));

        return entity;
    }

    _processCT(id, control, name, room, func, _obj, objects) {
         const entity = this._processDimmer(id, control, name, room, func, _obj);
         const ctState = control.states.find(s => s.id && ['TEMPERATURE'].includes(s.name));
         if (ctState && ctState.id) {
             entity.ATTRIBUTES.push({
                 attribute: 'ct',
                 getId: ctState.id,
                 setId: ctState.id,
                 type: objects[ctState.id] && objects[ctState.id].common && objects[ctState.id].common.type,
                 min: objects[ctState.id] && objects[ctState.id].common && objects[ctState.id].common.min,
                 max: objects[ctState.id] && objects[ctState.id].common && objects[ctState.id].common.max,
             });
             this._addID2entity(ctState.id, entity);

             // capabilities
             entity.context.capabilities.push({
                 type: 'devices.capabilities.color_setting',
                 retrievable: true,
                 parameters: {
                     temperature_k: {
                         min: (objects[ctState.id] && objects[ctState.id].common && objects[ctState.id].common.min) || 2700,
                         max: (objects[ctState.id] && objects[ctState.id].common && objects[ctState.id].common.max) || 9000,
                         precision: 100
                     },
                 },
             });

             const get_state = entity.COMMANDS.get_state;
             const set_state = entity.COMMANDS.set_state;

             entity.COMMANDS.get_state = entity =>
                 get_state(entity)
                     .then(() =>
                        this._getStateCT(entity));

             entity.COMMANDS.set_state = (entity, data) =>
                 set_state(entity, data)
                     .then(data =>
                        this._setStateCT(entity, data));
         }
         return entity;
    }

    _processAC(id, control, name, room, func, _obj, objects) {
        // create main device
        const entity = this._processCommon(id, name, room, func, _obj, control.type === Types.thermostat ? 'devices.types.thermostat' : 'devices.types.thermostat.ac');

        // default action: ON/OFF
        let state = control.states.find(s => s.id && ['POWER', 'ON'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type  = objects[state.id] && objects[state.id].common && objects[state.id].common.type;
            entity.STATE.min   = objects[state.id] && objects[state.id].common && objects[state.id].common.min;
            entity.STATE.max   = objects[state.id] && objects[state.id].common && objects[state.id].common.max;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        // devices.capabilities.range - temperature
        let getTemperature;
        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id) {
            getTemperature = state.id;
        }

        state = control.states.find(s => s.id && ['SET'].includes(s.name));
        let setTemperature = '';
        if (state && state.id) {
            setTemperature = state.id;
            entity.ATTRIBUTES.push({attribute: 'temperature', getId: getTemperature || setTemperature, setId: setTemperature, type: objects[setTemperature] && objects[setTemperature].common && objects[setTemperature].common.type});
            this._addID2entity(state.id, entity);
        } else if (getTemperature) {
            entity.ATTRIBUTES.push({attribute: 'temperature', getId: getTemperature, setId: null, type: objects[getTemperature] && objects[getTemperature].common && objects[getTemperature].common.type});
            this._addID2entity(state.id, entity);
        }

        if (getTemperature || setTemperature) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: true,
                parameters: {
                    instance: 'temperature',
                    random_access: true,
                    unit: 'unit.temperature.celsius',
                    range: {
                        min: objects[setTemperature] && objects[setTemperature].common && objects[setTemperature].common.min !== undefined ? objects[setTemperature].common.min : 12,
                        max: objects[setTemperature] && objects[setTemperature].common && objects[setTemperature].common.max !== undefined ? objects[setTemperature].common.max : 30,
                        precision: 1
                    },
                },
            });
        }

        // devices.capabilities.mode - thermostat
        state = control.states.find(s => s.id && ['MODE'].includes(s.name));
        if (state && state.id) {
            let thermostatId = state.id;
            const states = objects[thermostatId].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'thermostat', getId: thermostatId, setId: thermostatId, states, type: objects[thermostatId] && objects[thermostatId].common && objects[thermostatId].common.type});
            this._addID2entity(state.id, entity);
            const modes = [];
            const values = Object.values(states).map(name => name.toLowerCase());

            values.includes('auto')     && modes.push({value: 'auto'});
            values.includes('cool')     && modes.push({value: 'cool'});
            values.includes('dry')      && modes.push({value: 'dry'});
            values.includes('eco')      && modes.push({value: 'eco'});
            values.includes('fan_only') && modes.push({value: 'fan_only'});
            values.includes('heat')     && modes.push({value: 'heat'});

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: {
                    instance: 'thermostat',
                    modes,
                },
            });
        }

        // devices.capabilities.mode - swing
        state = control.states.find(s => s.id && ['SWING'].includes(s.name));
        if (state && state.id) {
            let swingId = state.id;
            const states = objects[swingId].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'swing', getId: swingId, setId: swingId, states, type: objects[swingId] && objects[swingId].common && objects[swingId].common.type});
            this._addID2entity(state.id, entity);
            const modes = [];
            const values = Object.values(states).map(name => name.toLowerCase());

            values.includes('auto')       && modes.push({value: 'auto'});
            values.includes('horizontal') && modes.push({value: 'horizontal'});
            values.includes('stationary') && modes.push({value: 'stationary'});
            values.includes('vertical')   && modes.push({value: 'vertical'});

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: {
                    instance: 'swing',
                    modes,
                },
            });
        }

        // devices.capabilities.mode - fan_speed
        state = control.states.find(s => s.id && ['SPEED'].includes(s.name));
        if (state && state.id) {
            let fanSpeedId = state.id;
            const states = objects[fanSpeedId].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'fan_speed', getId: fanSpeedId, setId: fanSpeedId, states, type: objects[fanSpeedId] && objects[fanSpeedId].common && objects[fanSpeedId].common.type});
            this._addID2entity(state.id, entity);
            const modes = [];
            const values = Object.values(states).map(name => name.toLowerCase());

            values.includes('auto')   && modes.push({value: 'auto'});
            values.includes('high')   && modes.push({value: 'high'});
            values.includes('low')    && modes.push({value: 'low'});
            values.includes('medium') && modes.push({value: 'medium'});
            values.includes('quiet')  && modes.push({value: 'quiet'});
            values.includes('turbo')  && modes.push({value: 'turbo'});

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: {
                    instance: 'fan_speed',
                    modes,
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateOnOff(entity)
                .then(() => this._getStateTemperature(entity))
                .then(() => this._getStateThermostat(entity))
                .then(() => this._getStateSwing(entity))
                .then(() => this._getStateSpeed(entity));

        entity.COMMANDS.set_state = (entity, data) =>
            this._setStateOnOff(entity, data)
                .then(res => this._setStateTemperature(entity, res))
                .then(res => this._setStateThermostat(entity, res))
                .then(res => this._setStateSwing(entity, res))
                .then(res => this._setStateSpeed(entity, res));

        return entity;
    }

    _processRGB(id, control, name, room, func, _obj, objects) {
        const entity = this._processDimmer(id, control, name, room, func, _obj);

        const rgbState = control.states.find(s => s.id && ['RGB'].includes(s.name));
        if (rgbState && rgbState.id) {
            entity.ATTRIBUTES.push({
                attribute: 'rgb',
                getId: rgbState.id,
                setId: rgbState.id,
                type: objects[rgbState.id] && objects[rgbState.id].common && objects[rgbState.id].common.type,
                min: objects[rgbState.id] && objects[rgbState.id].common && objects[rgbState.id].common.min,
                max: objects[rgbState.id] && objects[rgbState.id].common && objects[rgbState.id].common.max,
            });
            this._addID2entity(rgbState.id, entity);

            // capabilities
            const capability = entity.context.capabilities.find(cap => cap.type === 'devices.capabilities.color_setting');
            if (!capability) {
                entity.context.capabilities.push({
                    type: 'devices.capabilities.color_setting',
                    retrievable: true,
                    parameters: {
                        color_model: 'rgb',
                    },
                });
            } else {
                capability.parameters.color_model = 'rgb';
            }

            const get_state = entity.COMMANDS.get_state;
            const set_state = entity.COMMANDS.set_state;

            entity.COMMANDS.get_state = entity =>
                get_state(entity)
                    .then(() =>
                        this._getStateRGB(entity));

            entity.COMMANDS.set_state = (entity, data) =>
                set_state(entity, data)
                    .then((data) =>
                        this._setStateRGB(entity, data));
        }

        return entity;
    }

    _processBlinds(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.openable.curtain');

        let state = control.states.find(s => s.id && ['SET'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id && objects[state.id] && objects[state.id].common && objects[state.id].common.type === 'boolean') {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type  = 'boolean';
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id && objects[state.id].common.type === 'boolean') {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        state = control.states.find(s => s.id && ['SET'].includes(s.name));
        if (state && state.id && objects[state.id] && objects[state.id].common && objects[state.id].common.type === 'number') {
            const blindId = state.id;
            const attribute = {
                attribute: 'open',
                getId: blindId,
                setId: blindId,
                type: 'number',
                min: objects[state.id].common.min !== undefined ? objects[state.id].common.min : 0,
                max: objects[state.id].common.max !== undefined ? objects[state.id].common.max : 100,
            };
            entity.ATTRIBUTES.push(attribute);
            this._addID2entity(blindId, entity);

            const getState = control.states.find(s => s.id && s.name === 'ACTUAL');
            if (getState && getState.id && objects[getState.id] && objects[getState.id].common && objects[getState.id].common.type === 'number') {
                attribute.getId = getState.id;
                this._addID2entity(getState.id, entity);
            }

            entity.context.capabilities.push({
                type: 'devices.capabilities.range',
                retrievable: true,
                parameters: {
                    instance: 'open',
                    random_access: true,
                    unit: 'unit.percent',
                    range: {
                        min: objects[blindId].common.min !== undefined ? objects[blindId].common.min : 0,
                        max: objects[blindId].common.max !== undefined ? objects[blindId].common.max : 100,
                        precision: 1
                    },
                },
            });

            // Simulate On/Off
            if (!entity.STATE.getId) {
                entity.STATE.setId = state.id;
                entity.STATE.getId = getState ? getState.id : state.id;
                entity.STATE.type  = 'number';
                entity.context.capabilities.push({
                    type: 'devices.capabilities.on_off',
                    retrievable: true,
                });
            }
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateOnOff(entity)
                .then(() => this._getStateBlinds(entity));

        entity.COMMANDS.set_state = (entity, data) =>
            this._setStateOnOff(entity, data)
                .then(res => this._setStateBlinds(entity, res));

        return entity;
    }

    _processLock(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.openable');

        let state = control.states.find(s => s.id && ['SET'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.type  = objects[state.id].common.type;
            entity.STATE.min   = objects[state.id].common.min;
            entity.STATE.max   = objects[state.id].common.max;
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'ACTUAL');
        if (state && state.id) {
            entity.STATE.getId = state.id;
            this._addID2entity(state.id, entity);
        }

        state = control.states.find(s => s.id && s.name === 'OPEN');
        if (state && state.id) {
            entity.STATE.openId = state.id;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateOnOff(entity);

        entity.COMMANDS.set_state = (entity, data) =>
            this._setStateLock(entity, data);

        return entity;
    }

    _processVacuumCleaner(id, control, name, room, func, _obj, objects) {
        // create main device
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.vacuum_cleaner');

        // default action: ON/OFF
        let state = control.states.find(s => s.id && ['POWER'].includes(s.name));
        entity.STATE = {setId: null, getId: null};
        if (state && state.id) {
            entity.STATE.setId = state.id;
            entity.STATE.getId = state.id;
            entity.STATE.type = objects[state.id] && objects[state.id].common && objects[state.id].common.type;
            entity.STATE.min  = objects[state.id] && objects[state.id].common && objects[state.id].common.min;
            entity.STATE.max  = objects[state.id] && objects[state.id].common && objects[state.id].common.max;
            this._addID2entity(state.id, entity);
        }

        // capabilities
        if (entity.STATE.getId) {
            entity.context.capabilities.push({
                type: 'devices.capabilities.on_off',
                retrievable: true,
            });
        }

        // devices.capabilities.mode - cleanup_mode
        state = control.states.find(s => s.id && ['MODE'].includes(s.name));
        if (state && state.id) {
            const states = objects[state.id].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'cleanup_mode', getId: state.id, setId: state.id, states, type: objects[state.id] && objects[state.id].common && objects[state.id].common.type});
            this._addID2entity(state.id, entity);
            const modes = [];
            const values = Object.values(states).map(name => name.toLowerCase());

            values.includes('auto')    && modes.push({value: 'auto'});
            values.includes('eco')     && modes.push({value: 'eco'});
            values.includes('express') && modes.push({value: 'express'});
            values.includes('normal')  && modes.push({value: 'normal'});
            values.includes('quiet')   && modes.push({value: 'quiet'});

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: {
                    instance: 'cleanup_mode',
                    modes,
                },
            });
        }

        // devices.capabilities.mode - work_speed
        state = control.states.find(s => s.id && ['WORK_MODE'].includes(s.name));
        if (state && state.id) {
            const states = objects[state.id].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'work_speed', getId: state.id, setId: state.id, states, type: objects[state.id] && objects[state.id].common && objects[state.id].common.type});
            this._addID2entity(state.id, entity);
            const modes = [];
            const values = Object.values(states).map(name => name.toLowerCase());

            // 0: 'AUTO', 1: 'FAST', 2: 'MEDIUM', 3: 'SLOW', 4: 'TURBO'
            values.includes('auto')   && modes.push({value: 'auto'});
            values.includes('fast')   && modes.push({value: 'fast'});
            values.includes('medium') && modes.push({value: 'medium'});
            values.includes('slow')   && modes.push({value: 'slow'});
            values.includes('turbo')  && modes.push({value: 'turbo'});

            entity.context.capabilities.push({
                type: 'devices.capabilities.mode',
                retrievable: true,
                parameters: {
                    instance: 'work_speed',
                    modes,
                },
            });
        }

        // devices.capabilities.mode - pause
        state = control.states.find(s => s.id && ['PAUSE'].includes(s.name));
        if (state && state.id) {
            const states = objects[state.id].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'pause', getId: state.id, setId: state.id, states, type: objects[state.id] && objects[state.id].common && objects[state.id].common.type});
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.toggle',
                retrievable: true,
                parameters: {
                    instance: 'pause',
                },
            });
        }

        // devices.capabilities.float - water_level
        state = control.states.find(s => s.id && ['WATER'].includes(s.name));
        if (state && state.id) {
            const states = objects[state.id].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'water_level', getId: state.id, states, type: objects[state.id] && objects[state.id].common && objects[state.id].common.type});
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.float',
                retrievable: true,
                parameters: {
                    instance: 'water_level',
                    unit: 'unit.percent'
                },
            });
        }

        // devices.capabilities.float - battery_level
        state = control.states.find(s => s.id && ['BATTERY'].includes(s.name));
        if (state && state.id) {
            const states = objects[state.id].common.states || {};
            entity.ATTRIBUTES.push({attribute: 'battery_level', getId: state.id, states, type: objects[state.id] && objects[state.id].common && objects[state.id].common.type});
            this._addID2entity(state.id, entity);

            entity.context.capabilities.push({
                type: 'devices.capabilities.float',
                retrievable: true,
                parameters: {
                    instance: 'battery_level',
                    unit: 'unit.percent'
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateOnOff(entity)
                .then(() => this._getStateVacuumMode(entity))
                .then(() => this._getStateVacuumWorkMode(entity))
                .then(() => this._getStatePause(entity))
                .then(() => this._getStateFloat(entity, 'water_level'))
                .then(() => this._getStateFloat(entity, 'battery_level'));

        entity.COMMANDS.set_state = (entity, data) =>
            this._setStateOnOff(entity, data)
                .then(res => this._setStatePause(entity, res))
                .then(res => this._setStateVacuumMode(entity, res))
                .then(res => this._setStateVacuumWorkMode(entity, res));

        return entity;
    }

    _processTemperature(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        let state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        entity.STATE = {getId: null};
        const temperatureId = state && state.id;
        if (temperatureId && objects[temperatureId] && objects[temperatureId].common && objects[temperatureId].common.type === 'number') {
            entity.STATE.getId = temperatureId;
            entity.STATE.type  = 'number';
            this._addID2entity(temperatureId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'temperature',
                getId: temperatureId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: {
                    instance: 'temperature',
                    unit: objects[temperatureId].common.unit === '°K' || objects[temperatureId].common.unit === 'K' || objects[temperatureId].common.unit === 'K°' ?
                        'unit.temperature.kelvin' : 'unit.temperature.celsius',
                },
            });
        }

        // humidity
        state = control.states.find(s => s.id && ['SECOND'].includes(s.name));
        const humidityId = state && state.id;
        if (humidityId && objects[humidityId] && objects[humidityId].common && objects[humidityId].common.type === 'number') {
            entity.ATTRIBUTES.push({
                attribute: 'humidity',
                getId: humidityId,
                type: 'number',
            });
            this._addID2entity(humidityId, entity);

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: {
                    instance: 'humidity',
                    unit: 'unit.percent',
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateFloatProperty(entity, 'temperature')
                .then(() => this._getStateFloatProperty(entity, 'humidity'));

        return entity;
    }

    _processHumidity(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        let state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        entity.STATE = {getId: null};
        const humidityId = state && state.id;
        if (humidityId && objects[humidityId] && objects[humidityId].common && objects[humidityId].common.type === 'number') {
            entity.STATE.getId = humidityId;
            entity.STATE.type  = 'number';
            this._addID2entity(humidityId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'humidity',
                getId: humidityId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.float',
                retrievable: true,
                parameters: {
                    instance: 'humidity',
                    unit: 'unit.percent',
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateFloatProperty(entity, 'humidity');

        return entity;
    }

    _processMotion(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        let state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        entity.STATE = {getId: null};
        const motionId = state && state.id;
        if (motionId && objects[motionId] && objects[motionId].common && objects[motionId].common.type === 'boolean') {
            entity.STATE.getId = motionId;
            entity.STATE.type  = 'boolean';
            this._addID2entity(motionId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'motion',
                getId: motionId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.bool',
                retrievable: true,
                parameters: {
                    instance: 'motion',
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateBooleanProperty(entity, 'motion');

        return entity;
    }

    _processContact(id, control, name, room, func, _obj, objects) {
        const entity = this._processCommon(id, name, room, func, _obj, 'devices.types.sensor');

        let state = control.states.find(s => s.id && ['ACTUAL'].includes(s.name));
        entity.STATE = {getId: null};
        const contactId = state && state.id;
        if (contactId && objects[contactId] && objects[contactId].common && objects[contactId].common.type === 'boolean') {
            entity.STATE.getId = contactId;
            entity.STATE.type  = 'boolean';
            this._addID2entity(contactId, entity);

            entity.ATTRIBUTES.push({
                attribute: 'contact',
                getId: contactId,
                type: 'number',
            });

            entity.context.properties.push({
                type: 'devices.properties.bool',
                retrievable: true,
                parameters: {
                    instance: 'contact',
                },
            });
        }

        entity.COMMANDS.get_state = entity =>
            this._getStateBooleanProperty(entity, 'contact');

        return entity;
    }

}

class YandexAlisa {
    constructor(adapter, urlKey) {
        this.adapter = adapter;
        this.lang    = 'ru';
        this.urlKey  = urlKey;
        this.user_id = adapter.config.login.replace(/[^-_:a-zA-Z1-9]/g, '_');

        this.smartDevices = [];
        this.enums   = [];
        this.usedIds = [];
        this.detector = new ChannelDetector();
        this.unknownDevices = {};
        this.rateCalculation = [];

        this.converter = new YandexAliceConverter(adapter);
    }

    _subscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            console.log(`Subscribe ${id}`);
            this.adapter.subscribeForeignStates(id, () => setImmediate(() => this._subscribeAllIds(ids, cb)));
        }
    }

    _unsubscribeAllIds(ids, cb) {
        if (!ids || !ids.length) {
            cb && cb();
        } else {
            const id = ids.shift();
            console.log('Unsubscribe ' + id);
            this.adapter.unsubscribeForeignStates(id, () => setImmediate(() => this._unsubscribeAllIds(ids, cb)));
        }
    }

    unsubscribeAllIds(cb) {
        const ids = [];
        this.smartDevices && this.smartDevices.forEach(device =>
            device.ATTRIBUTES.forEach(item => item && item.getId && !ids.includes(item.getId) && ids.push(item.getId)));

        this.adapter.log.debug(`[ALISA] Unsubscribe ${ids.length} states for Alisa`);
        this._unsubscribeAllIds(ids, () => {
            this.adapter.log.debug(`[ALISA] Unsubscribe done`);
            cb && cb();
        });
    }

    subscribeAllIds(cb) {
        const ids = [];
        this.smartDevices && this.smartDevices.forEach(device =>
            device.ATTRIBUTES.forEach(item => item && item.getId && !ids.includes(item.getId) && ids.push(item.getId)));

        this.adapter.log.debug(`[ALISA] Subscribe ${ids.length} states for Alisa`);

        this._subscribeAllIds(ids, () => {
            this.adapter.log.debug(`[ALISA] Subscribe done`);
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

    setLanguage(_lang) {
        this.lang = _lang || 'ru';
        this.converter.setLanguage(this.lang);
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
                states[id].common.custom[this.adapter.namespace].smartName : null;
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
                objects,
                id,
                _keysOptional:      ids,
                _usedIdsOptional:   this.usedIds
            };
            const controls = this.detector.detect(options);
            if (controls) {
                controls.forEach(control => {
                    if (this.converter.types[control.type]) {
                        const entity = this.converter.types[control.type](id, control, friendlyName, roomName, funcName, objects[id], objects);
                        if (!entity) {
                            return;
                        }

                        const _entity = result.find(e => e.entity_id === entity.entity_id);
                        if (_entity) {
                            console.log('Duplicates found for ' + entity.entity_id);
                            return;
                        }

                        result.push(entity);
                        this.adapter.log.debug(`[ALISA] Created Yandex Alice device: ${entity.entity_id} - ${control.type} - ${id}`);
                    }
                });
            } else {
                console.log(`[ALISA] Nothing found for ${options.id}`);
            }
        } catch (e) {
            this.adapter.log.error('[ALISA] Cannot process "' + id + '": ' + e);
        }
    }

    _readObjects() {
        return new Promise(resolve => {
            this.adapter.getObjectView('system', 'state', {}, (err, _states) => {
                this.adapter.getObjectView('system', 'channel', {}, (err, _channels) => {
                    this.adapter.getObjectView('system', 'device', {}, (err, _devices) => {
                        this.adapter.getObjectView('system', 'enum', {}, (err, _enums) => {
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

    updateDevices(cb) {
        this.unsubscribeAllIds(() => {
            this._updateDevices()
                .then(smartDevices => {
                    this.smartDevices = smartDevices;
                    this.adapter.log.debug(`[ALISA] SmartDevices: ${JSON.stringify(smartDevices)}`);
                    // Check KEY
                    return this.checkUrlKey()
                        .then(() => this.subscribeAllIds(cb))
                        .catch(err => {
                            this.adapter.config.yandexAlisa && this.adapter.log.warn('[ALISA] Invalid URL Pro key. Status auto-update is disabled you can set states but receive states only manually: ' + err);
                            // call cb otherwise frontend get no results
                            cb && cb();
                        });
                });
        });
    }

    getDevices() {
        const result = this.smartDevices.map(device => {
            return {
                name: device.attributes.friendly_name,
                main: {getId: device.STATE.getId, setId: device.STATE.setId},
                attributes: device.ATTRIBUTES ? device.ATTRIBUTES.map(a => {
                    return {name: a.attribute, getId: a.getId, setId: a.setId}
                }) : [],
                actions: device.context.capabilities.length ? device.context.capabilities.map(cap => {
                    const capText = cap.type.replace('devices.capabilities.', '');
                    const capTextUnit = capText + (cap.parameters && cap.parameters.unit ? '_' + cap.parameters.unit : '');
                    if (!typesMapping[capTextUnit]) {
                        this.adapter.log.debug(`[ALISA] No mapping found for ${capTextUnit}`)
                    }

                    return typesMapping[capTextUnit] || capText;
                }) :
                    device.context.properties.map(cap => {
                        const capText = cap.type.replace('devices.properties.', '');
                        const capTextUnit = `${capText}_${cap.parameters.instance}${cap.parameters && cap.parameters.unit ? '_' + cap.parameters.unit : ''}`;
                        if (!typesMapping[capTextUnit]) {
                            this.adapter.log.debug(`[ALISA] No mapping found for ${capTextUnit}`)
                        }

                        return typesMapping[capTextUnit] || capText;
                    }),
                iobID: device.context.id,
                description: device.context.description,
                room: device.context.room,
                func: device.context.type.replace('devices.types.', '').toUpperCase(),
            }
        });
        this.adapter.log.debug(`[ALISA] Devices: ${JSON.stringify(result)}`);
        return result;
    }

    getAll() {
        return this._updateDevices()
            .then(smartDevices => {
                this.smartDevices = smartDevices;
                this.adapter.log.debug(`[ALISA] SmartDevices: ${JSON.stringify(smartDevices)}`);
            });
    }

    _getSmartDeviceData(entity) {
        return new Promise(resolve => {
            if (entity.context) {
                if (entity.COMMANDS && entity.COMMANDS.get_state) {
                    entity.COMMANDS.get_state(entity)
                        .then(() => resolve(entity.context));
                } else {
                    resolve(entity.context);
                }
            } else {
                resolve();
            }
        });
    }

    _getSmartDeviceState(context) {
        const result = {
            id: context.id
        };

    	if (context.capabilities && context.capabilities.length) {
            result.capabilities = context.capabilities.map(c => {
                if (c.state) {
                    return {type: c.type, state: c.state};
                }
            }).filter(c => c);
	    }

    	if (context.properties && context.properties.length) {
            result.properties = context.properties.map(c => {
                if (c.state) {
                    return {type: c.type, state: c.state};
                }
            }).filter(c => c);
        }

    	return result;
    }

    getSmartDevices() {
        return this.getAll().then(() => {
            const result = [];
            this.smartDevices.forEach(entity => {
                result.push(
                    this._getSmartDeviceData(entity)
                );
            });
            return Promise.all(result);
        });
    }

    querySmartDevicesByIds(ids) {
        return new Promise(resolve => {
            const result = [];
            const exists = [];
            this.smartDevices.filter(
            	entity => ids.includes(entity.context.id)
            ).forEach(entity => {
            	exists.push(entity.context.id);
                result.push(
                    this._getSmartDeviceData(entity)
                );
            });
            ids.forEach(id => {
            	if (!exists.includes(id)) {
            		result.push({
                		id: id,
        				error_code: 'DEVICE_NOT_FOUND',
        				error_message: 'Device not found'
                	});
            	}
            });
            resolve(Promise.all(result));
        });
    }

    _updateDevices() {
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

                let result = [];

                let roomNames = {};
                funcs.forEach(funcId => {
                    const func = enums[funcId];
                    if (!func.common || !func.common.members || typeof func.common.members !== 'object' || !func.common.members.length) return;

                    // Get the name of function (with language and if name is empty)
                    let funcName = this.getSmartName(func);
                    funcName = funcName || func.common.name;
                    if (funcName && typeof funcName === 'object') {
                        funcName = funcName[this.lang] || funcName.en;
                    }
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
                                    if (roomName && typeof roomName === 'object') {
                                        roomName = roomName[this.lang] || roomName.en;
                                    }
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

                // scan alias.* and linkeddevices.*
                for (let i = 0; i < ids.length; i++) {
                    if (ids[i] < 'alias.') {
                        continue;
                    }
                    if (ids[i] > 'linkeddevices.\u9999') {
                        break;
                    }

                    if ((ids[i].startsWith('alias.') || ids[i].startsWith('linkeddevices.')) &&
                        objects[ids[i]] &&
                        (objects[ids[i]].type === 'device' || objects[ids[i]].type === 'channel')) {
                        this.processState(ids, objects, ids[i], roomsT(this.lang, 'undefined'), funcsT(this.lang, 'undefined'), result);
                    }
                }

                this.usedIds = null;
                this.keys    = null;

                result.forEach(entity =>
                    this.adapter.log.debug(`[ALISA] ${entity.context.id} => ${entity.context.type} ${entity.context.name}`));

                return result;
            });
    }

    _doSmartDeviceAction(entity, data) {
        return new Promise(resolve => {
            if (entity.COMMANDS && entity.COMMANDS.set_state) {
                entity.COMMANDS.set_state(entity, data)
                    .then(res =>
                        resolve(res));
            } else {
                resolve({
                    id: data.id,
                    action_result: {
                        status: 'ERROR',
                        error_code: 'INVALID_ACTION',
                        error_message: 'Device has not this action'
                    }
                });
            }
        });
    }

    checkUrlKey(forceCheck) {
        const now = Date.now();
        if (this.urlKey && (!this.keyPromise || now - this.keyPromiseTime > 900000)) {
            /* 15 Minutes */
            this.keyPromiseTime = now;
            const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${version}`;
            this.keyPromise = axios.get(url, {validateStatus: status => status === 200})
                .then(response => {
                    this.adapter.log.debug(`[ALISA] CHECK URL reported: ${JSON.stringify(response.data)}`);
                    this.urlKeyOk = true;
                })
                .catch(error => {
                    let errorMessage;
                    if (error.response) {
                        errorMessage = error.response.data || error.response.status;
                    } else if (error.request) {
                        errorMessage = 'No answer';
                    } else {
                        errorMessage = error.message;
                    }
                    this.adapter.config.yandexAlisa && this.adapter.log.error('[ALISA] Url Key error. Alisa Request and Response are working. But device states are not reported automatically. If you have pro license please try to delete iot.0.certs: ' + errorMessage);
                });
        } else {
            this.keyPromise = this.keyPromise || Promise.resolve();
        }

        return this.keyPromise;
    }

    async updateState(id, state) {
        const now = Date.now();
        // Only pro with valid license can update states
        if (!this.urlKeyOk || (this.unknownDevices[id] && now - this.unknownDevices[id] < RETRY_UNKNOWN_DEVICES_INTERVAL)) {
            return;
        }

        if (this.urlKey) {
            let i = 0;
            while (i < this.rateCalculation.length) {
                if (now - this.rateCalculation[i] < 60000) {
                    break;
                }
                i++;
            }
            if (i) {
                if (i < this.rateCalculation.length) {
                    this.rateCalculation.splice(0, i);
                } else {
                    this.rateCalculation = [];
                }
            }

            if (this.rateCalculation.length > 60) {
                return this.adapter.log.warn(`[ALISA] Sending too fast: ${this.rateCalculation.length} in last minute!`);
            }

            this.rateCalculation.push(now);

            this.querySmartDevicesByIds([id])
                .then(devices => {
                    const json = {
                        ts: Date.now() / 100,
                        payload: {
                            user_id: this.user_id,
                            devices: devices.map(d => this._getSmartDeviceState(d)),
                        }
                    };
                    this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(json)}`);
                    const url = `${URL_STATUS}?user=${encodeURIComponent(this.adapter.config.login)}&urlKey=${encodeURIComponent(this.urlKey.key)}&p=${PROTOCOL_VERSION}&v=${version}`;
                    return axios.post(url, json, {validateStatus: status => status === 200})
                        .then(response => {
                            if (this.unknownDevices[id]) {
                                delete this.unknownDevices[id];
                            }
                            this.adapter.log.debug(`[ALISA] Status reported:  ${JSON.stringify(json)}  ${JSON.stringify(response.data)}`);
                        });
                })
                .catch(error => {
                    if (error.response && error.response.status === 404) {
                        this.adapter.log.error(`[ALISA] device ${id} is unknown to alisa`);
                        this.unknownDevices[id] = Date.now();
                    } else if (error.response && error.response.status === 401) {
                        this.adapter.log.error(`[ALISA] auth error: ${JSON.stringify(error.response.body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else if (error.response && error.response.status === 410) {
                        this.adapter.log.error(`[ALISA] invalid protocol version: ${JSON.stringify(error.response.body)}`);
                        this.urlKeyOk = false; // invalidate urlKey
                    } else {
                        let errorMessage;
                        if (error.response) {
                            errorMessage = error.response.data || error.response.status;
                        } else if (error.request) {
                            errorMessage = 'No answer';
                        } else {
                            errorMessage = error.message;
                        }

                        this.adapter.log.error(`[ALISA] Cannot updateState: ${errorMessage}`);
                        this.adapter.log.debug(`[ALISA] ${JSON.stringify(error.response && error.response.body)}`);
                    }
                });
        }
    }

    doAction(deviceData) {
        return new Promise(resolve => {
            const entity = this.smartDevices.find(entity => deviceData.id === entity.context.id);
            entity && resolve(this._doSmartDeviceAction(entity, deviceData));
            resolve();
        });
    }

    process(request, isEnabled, callback) {
        if (!request) {
            this.adapter.log.error('[ALISA] Invalid request: no request!');
            return;
        }

        if (!isEnabled) {
            return callback({error: textsT(this.lang, 'The service deactivated'), errorCode: 500});

        }

        if (!request.alisa) {
            return callback({error: textsT(this.lang, 'missing inputs'), errorCode: 400});
        }

        let result;

        let isWait = false;

        this.adapter.log.debug(`[ALISA] Received ${JSON.stringify(request.alisa)}`);
        // remove first word. It can be changed in the future.
        let url = request.alisa.replace(/^\/[-_\w\d]+\//, '/');
        switch (url) {
            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/check-docpage/
            case '/v1.0':
                result = {};
                break;

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/get-devices-docpage/
            case '/v1.0/user/devices':
                this.getSmartDevices()
                    .then(devices => {
                        result = {
                            request_id: uuid(),
                            payload: {
                                user_id: this.user_id,
                                devices: devices
                            }
                        };
                        this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
                        callback(result);
                        callback = null;
                    });
                isWait = true;
                break;

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/post-devices-query-docpage/
            case '/v1.0/user/devices/query':
                const queryDevices = request.devices || [];
                const ids = [];

                queryDevices.forEach(element =>
                    ids.push(element.id));

                if (ids) {
                    this.querySmartDevicesByIds(ids)
                        .then(devices => {
                            const queryResult = {
                                request_id: uuid(),
                                payload: {
                                    devices: devices.map(d => this._getSmartDeviceState(d))
                                }
                            };
                            if (!devices.length) {
                                queryResult.payload.devices = queryDevices;
                            }
                            result = queryResult;
                            this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
                            callback(result);
                            callback = null;
                        });
                }
                isWait = true;
                break;

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/post-action-docpage/
            case '/v1.0/user/devices/action':
                const actionDevices = request.payload.devices || [];
                const res = [];

                actionDevices.forEach(element =>
                    res.push(this.doAction(element)));

                Promise.all(res).then(devices => {
                    result = {
                        request_id: uuid(),
                        payload: {
                            devices: devices
                        }
                    };
                    this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
                    callback(result);
                    callback = null;
                });
                isWait = true;
                break;

            // https://yandex.ru/dev/dialogs/alice/doc/smart-home/reference/unlink-docpage/
            case '/alisaIot/v1.0/user/unlink':
            	result = {};
            	break;

            default:
                result = {error: textsT(this.lang, 'missing data'), errorCode: 400};
                break;
        }

        if (result) {
            this.adapter.log.debug(`[ALISA] Response: ${JSON.stringify(result)}`);
            callback(result);
            callback = null;
            return true;
        }
        if (isWait) {
            return true;
        }

        if (!isWait && callback) {
            callback({error: textsT(this.lang, 'missing inputs'), errorCode: 400});
        }
    }
}

module.exports = YandexAlisa;
