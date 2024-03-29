const crypto = require('crypto');
const AdapterProvider = require('./AdapterProvider.js');

const { ChannelDetector } = require('iobroker.type-detector');

let onlyValidCharactersAndLength = function (name) {
    return name.substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
}

let isRoom = function (payload) {
    return payload && payload._id && payload._id.startsWith('enum.rooms.');
}

let isFunctionality = function (payload) {
    return payload && payload._id && payload._id.startsWith('enum.functions.');
}

let allEnums = async function (adapter) {
    const result = await adapter.getObjectViewAsync('system', 'enum', {});
    return result.rows.map(row => row.value);
}

let parentOf = function (id) {
    const parts = (id || '').split('.');
    parts.pop();
    return parts.join('.');
}

let allObjects = async function (adapter) {
    const states = await adapter.getObjectViewAsync('system', 'state', {});
    const channels = await adapter.getObjectViewAsync('system', 'channel', {});
    const devices = await adapter.getObjectViewAsync('system', 'device', {});
    const enums = await adapter.getObjectViewAsync('system', 'enum', {});

    return states.rows
        .concat(channels.rows)
        .concat(devices.rows)
        .concat(enums.rows)
        .reduce((obj, item) => (
            obj[item.id] = {
                common: item.value?.common,
                type: item.value?.type,
            }, obj), {}
        );
}

const SMART_TYPES = {
    'LIGHT': 'light',
    'SWITCH': 'socket',
    'THERMOSTAT': 'thermostat',
    'SMARTPLUG': 'socket',
    'SMARTLOCK': 'lock',
    'CAMERA': 'camera',
};

const getSmartNameFromObj = (obj, instanceId, noCommon) => {
    if (!obj) {
        return undefined;
    }
    if (!obj.common) {
        return obj.smartName;
    }

    if (!noCommon) {
        return obj.common.smartName;
    }

    return obj.common?.custom && obj.common.custom[instanceId] ?
        obj.common.custom[instanceId].smartName : undefined;
};

const functionalitiesAndRooms = async function (adapter) {
    const enumerations = await allEnums(adapter);
    // skip empty enums (with no members, i.e. states, assigned)
    const notEmptyRoomsAndFunctionalities = enumerations.filter(item => {
        const smartName = getSmartNameFromObj(item, adapter.namespace, adapter.config.noCommon);
        return smartName !== false && smartName !== 'ignore';
    }).filter(item => item?.common?.members?.length);
    // all enums that are of type 'function'
    const functionalities = notEmptyRoomsAndFunctionalities.filter(item => isFunctionality(item));
    // all enums, that are of type 'room'
    const rooms = notEmptyRoomsAndFunctionalities.filter(item => isRoom(item));
    return [functionalities, rooms];
}

let getChannelId = function (id, objects) {
    if (objects[id] && objects[id].type === 'channel') {
        return id;
    }

    if (objects[id] && objects[id].type === 'state') {
        const channelId = parentOf(id);
        if (objects[channelId] && objects[channelId].type === 'channel') {
            return channelId;
        }
        return null;
    }
}

let getDeviceId = function (id, objects) {
    const channelId = getChannelId(id, objects);
    if (channelId) {
        const deviceId = parentOf(channelId);
        if (objects[deviceId] && (objects[deviceId].type === 'device' || objects[deviceId].type === 'channel')) {
            return deviceId;
        }
    }
    return null;
}

module.exports = {
    parseISOString(dateTimeAsISOString) {
        const b = dateTimeAsISOString.split(/\D+/);
        return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
    },

    configuredRangeOrDefault(state) {
        if (state.common?.type === 'boolean') {
            return { min: false, max: true };
        }
        const configuredMin = state.common?.min;
        const configuredMax = state.common?.max;
        const min = configuredMin === undefined || isNaN(configuredMin) ? 0   : parseFloat(configuredMin);
        const max = configuredMax === undefined || isNaN(configuredMax) ? 100 : parseFloat(configuredMax);

        return { min, max };
    },

    currentHour: function () {
        const datetime = new Date();
        datetime.setMinutes(0);
        datetime.setSeconds(0);
        return datetime;
    },

    isToday: function (datetime) {
        const today = new Date()
        return datetime.getDate() === today.getDate() &&
            datetime.getMonth() === today.getMonth() &&
            datetime.getFullYear() === today.getFullYear();
    },

    isCurrentHour: function (datetime) {
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - datetime.getTime()) / 3.6e6;
        return diffInHours < 1;
    },

    endpointId: function (id) {
        // even more restrictive than Alexa documents
        const regex = /^[A-Za-z0-9\-_]{1,256}$/g;
        id = id.replace(/\s/g, '_');
        if (!regex.test(id)) {
            const hash = crypto.createHash('sha256').update(id).digest('hex');
            id = `${hash}#${id.replace(/[^A-Za-z0-9\-_]+/g, '-')}`.substring(0, 256);
        }

        return id;
    },

    onlyValidCharactersAndLengthForFriendlyName: function (name) {
        return name.substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
    },

    stringify: function (smartName, lang) {
        if (typeof smartName === 'object') {
            return smartName[lang] || smartName.en;
        }
        return this.onlyValidCharactersAndLengthForFriendlyName(smartName);
    },

    friendlyNameByRoomAndFunctionName: function (control, lang, replaces) {
        const funcNameFirst = AdapterProvider.get().config.functionFirst;
        let concatenation = AdapterProvider.get().config.concatWord;
        let name;

        let roomName = control.room?.common?.name;
        let translateRoomName;
        if (typeof roomName === 'object') {
            roomName = roomName[lang] || roomName.en;
            // try to translate from en to any other language
            translateRoomName = lang && lang !== 'en' && !roomName[lang];
        } else {
            // always try to translate room names provided as a non-object type
            translateRoomName = true;
        }

        if (translateRoomName) {
            let roomsTranslator = require('../../rooms.js');
            roomName = roomsTranslator(lang, roomName)
        }

        let funcName = control.functionality?.common?.name;
        let translateFunctionalityName;
        if (typeof funcName === 'object') {
            funcName = funcName[lang] || funcName.en;
            translateFunctionalityName = lang && lang !== 'en' && !funcName[lang];
        } else {
            translateFunctionalityName = true;
        }
        if (translateFunctionalityName) {
            let funcsTranslator = require('../../functions.js');
            funcName = funcsTranslator(lang, funcName);
        }

        concatenation = concatenation ? ` ${concatenation} ` : ' ';

        name = `${funcNameFirst ? funcName : roomName}${concatenation}${funcNameFirst ? roomName : funcName}`;
        name = name.trim();

        return this.onlyValidCharactersAndLengthForFriendlyName(name);
    },
    /**
     * Checks whether the provided value is a valid smart name.
     * @param {*} smartName The value to check
     * @param {String} [lang='en'] Configured language
     * @returns {Boolean} True if a valid smart name, false - otherwise.
     */
    isValidSmartName: function (smartName, lang) {
        let name = smartName;
        if (smartName === false || smartName === 'ignore') {
            return false;
        }
        if (smartName && typeof smartName === 'object') {
            name = smartName[lang] || smartName.en || smartName.de;
        }
        return ![null, undefined, 'ignore', false].includes(name);
    },
    /**
     * Checks a value for validity or returns a default.
     * @param value The value being checked
     * @param defaultValue A default value if the passed value is not valid
     * @returns {*} The passed value if valid otherwise the default value.
     */
    defaultIfNullOrEmpty: function (value, defaultValue) {
        if (value === undefined || (typeof value === 'object' && Object.keys(value).length === 0) || value === "")
            return defaultValue;

        return value;
    },
    /**
     * Inspects all objects (states, channels and devices) and tries to identify so-called 'controls'
     *
     * To identify the controls, the ioBroker type detector library is used (https://github.com/ioBroker/ioBroker.type-detector).
     * @async
     * @param adapter The iot adapter instance
     * @param lang language
     * @returns {Promise<Array>} An array containing the detected controls
     */
    controls: async function (adapter, lang) {
        // here we collect ids to inspect
        const list = [];

        // fetch all objects (states, channels and devices in terms of iobroker)
        let devicesObject = await allObjects(adapter);
        // fetch all defined rooms and functions (enumerations)
        const [functionalities, rooms] = await functionalitiesAndRooms(adapter);

        // every member of a function enumeration is added to the list of ids to inspect
        functionalities.forEach(functionEnumItem => {
            functionEnumItem.common.members.forEach(id => {
                const smartName = getSmartNameFromObj(devicesObject[id], adapter.namespace, adapter.config.noCommon);

                if (devicesObject[id] &&
                    devicesObject[id].common &&
                    (devicesObject[id].type === 'state' || devicesObject[id].type === 'channel' || devicesObject[id].type === 'device') &&
                    !list.includes(id) &&
                    smartName !== false && // if the device is not disabled
                    smartName !== 'ignore'
                ) {
                    list.push(id);
                }
            })
        });

        // a member of a room enumeration is only added if neither its parent (channel) nor its grandparent (device) is in
        rooms.forEach(roomEnumItem => {
            roomEnumItem.common.members.forEach(id => {
                const smartName = getSmartNameFromObj(devicesObject[id], adapter.namespace, adapter.config.noCommon);
                if (devicesObject[id] &&
                    devicesObject[id].common &&
                    (devicesObject[id].type === 'state' || devicesObject[id].type === 'channel' || devicesObject[id].type === 'device') &&
                    !list.includes(id) &&
                    smartName !== false && // if the device is not disabled
                    smartName !== 'ignore'
                ) {
                    const channelId = getChannelId(id, devicesObject);
                    if (channelId) {
                        if (!list.includes(channelId)) {
                            const deviceId = getDeviceId(id, devicesObject);
                            if (deviceId) {
                                if (!list.includes(deviceId)) {
                                    list.push(id);
                                }
                            } else {
                                list.push(id);
                            }
                        }
                    } else {
                        list.push(id);
                    }
                }
            })
        });

        // all ids, i.e. ids of all iobroker states/channels/devices
        const keys = Object.keys(devicesObject).sort();

        const idsWithSmartName = [];
        // if a state has got a smart name directly assigned and neither itself nor its channel is in the list, add its id to the inspection list
        // and process it first
        keys.forEach(id => {
            const smartName = devicesObject[id] && getSmartNameFromObj(devicesObject[id], adapter.namespace, adapter.config.noCommon);
            if (this.isValidSmartName(smartName, lang) &&
                devicesObject[id].common &&
                (devicesObject[id].type === 'state' || devicesObject[id].type === 'channel' || devicesObject[id].type === 'device')
            ) {
                idsWithSmartName.push(id);
            }
        });

        // collect first all smart names and remove them from the auto-groups
        let detectedControls = [];
        const detector = new ChannelDetector();

        const patterns = detector.getPatterns();
        // process states with defined smartName
        for (let s = 0; s < idsWithSmartName.length; s++) {
            const id = idsWithSmartName[s];
            const common = devicesObject[id].common;
            const smartName = getSmartNameFromObj(devicesObject[id], adapter.namespace, adapter.config.noCommon);
            // try to convert the state to typeDetector format
            // "smartName": {
            //    "de": "Rote Lampe",
            //    "smartType": "LIGHT", // optional
            //    "byON": 80            // optional
            //  }
            if (!smartName.smartType) {
                // by default,
                // all booleans are sockets
                // all numbers are dimmer
                // string is not possible to control
                if (common.type === 'boolean' || common.type === 'mixed') { // we will write boolean
                    smartName.smartType = 'socket';
                } else if (common.type === 'number') {
                    smartName.smartType = 'dimmer';
                } else {
                    smartName.smartType = 'socket';
                }
            }
            // convert alexa2 smartType to alexa 3
            if (SMART_TYPES[smartName.smartType]) {
                smartName.smartType = SMART_TYPES[smartName.smartType];
            }
            // try to simulate typeDetector format
            if (patterns[smartName.smartType]) {
                const control = JSON.parse(JSON.stringify(patterns[smartName.smartType]));
                // find first required
                const state = control.states.find(state => state.required);
                if (state) {
                    state.id = id;
                    // process control
                    // remove all unassigned control register
                    control.states = control.states.filter(s => s.id);

                    // take all smartNames if any
                    control.states.forEach(s => {
                        s.smartName = getSmartNameFromObj(devicesObject[s.id], adapter.namespace, adapter.config.noCommon);
                        s.common = {
                            min: devicesObject[s.id]?.common?.min,
                            max: devicesObject[s.id]?.common?.max,
                            type: devicesObject[s.id]?.common?.type,
                            states: devicesObject[s.id]?.common?.states,
                            role: devicesObject[s.id]?.common?.role,
                            name: devicesObject[s.id]?.common?.name,
                        };
                    });

                    devicesObject[id].common.smartName = smartName;

                    control.object = {
                        id,
                        type: devicesObject[id].type,
                        common: devicesObject[id].common,
                        autoDetected: false,
                        toggle: smartName?.toggle,
                    };

                    // remove id from the groups
                    let pos = list.indexOf(id);
                    if (pos !== -1) {
                        list.splice(pos, 1);
                    }
                    const channelId = getChannelId(id, devicesObject);
                    pos = list.indexOf(channelId);
                    if (pos !== -1) {
                        list.splice(pos, 1);
                    }

                    const name = smartName[lang] || smartName.en || smartName.de;
                    control.groupNames = name.split(',').map(n => n.trim());

                    adapter.log.debug(`[ALEXA3] added ${id} with smartName as "${smartName.smartType}"`);
                    detectedControls.push(control);
                } else {
                    // ignored
                    adapter.log.debug(`[ALEXA3] Ignored state ${id} with smartName ${JSON.stringify(smartName)} and type ${common.type}`);
                }
            } else {
                // ignored
                adapter.log.debug(`[ALEXA3] Ignored state ${id} with smartName ${JSON.stringify(smartName)} and type ${common.type}`);
            }
        }

        // initialize iobroker type detector
        const usedIds = [];
        const ignoreIndicators = ['UNREACH_STICKY'];    // Ignore indicators by name
        const excludedTypes = ['info'];
        const options = {
            objects: devicesObject,
            _keysOptional: keys,
            _usedIdsOptional: usedIds,
            ignoreIndicators,
            excludedTypes,
        };

        // go other the list of ids to inspect and collect the detected controls
        list.forEach(id => {
            options.id = id;
            let controls = detector.detect(options);
            if (controls) {
                controls.forEach(control => {
                    // if any detected state has an ID, we can use this control
                    if (control.states.find(state => state.id)) {
                        // console.log(`In ${id} was detected "${control.type}" with the following states:`);

                        // remove all unassigned control register
                        control.states = control.states.filter(s => s.id);

                        // take all smartNames if any
                        control.states.forEach(s => {
                            s.smartName = getSmartNameFromObj(devicesObject[s.id], adapter.namespace, adapter.config.noCommon);
                            s.common = {
                                min: devicesObject[s.id]?.common?.min,
                                max: devicesObject[s.id]?.common?.max,
                                type: devicesObject[s.id]?.common?.type,
                                states: devicesObject[s.id]?.common?.states,
                                role: devicesObject[s.id]?.common?.role,
                                name: devicesObject[s.id]?.common?.name,
                            };
                        });

                        // find out the room the found control is in
                        let room = rooms.find(room => room?.common?.members.includes(id))

                        // find out the functionality the found control assigned to
                        let functionality = functionalities.find(functionality => functionality?.common?.members.includes(id))

                        const smartName = getSmartNameFromObj(devicesObject[id], adapter.namespace, adapter.config.noCommon);
                        control.object = {
                            id,
                            type: devicesObject[id].type,
                            common: {
                                min: devicesObject[id].common?.min,
                                max: devicesObject[id].common?.max,
                                type: devicesObject[id].common?.type,
                                states: devicesObject[id].common?.states,
                                role: devicesObject[id].common?.role,
                                name: devicesObject[id].common?.name,
                                smartName,
                            },
                            autoDetected: true,
                            toggle: smartName?.toggle,
                        };

                        control.room = room ? {
                            id: room._id,
                            common: room.common
                        } : undefined;

                        control.functionality = functionality ? {
                            id: functionality._id,
                            common: functionality.common,
                        } : undefined;

                        detectedControls.push(control);
                    }
                });
            } else {
                // console.log(`Nothing found for ${id}`);
            }
        });

        return detectedControls;
    },

    /**
     * Normalizes any provided value with observed min and max to the range 0..100
     * @param {number} value - value to be normalized
     * @param {number} min - min observed (possible) value
     * @param {number} max - max observed (possible) value
     * @returns Normalized value in the range 0..100 or undefined on invalid input
     */
    normalize_0_100: function (value, min, max) {
        return min >= max || value < min || value > max ? undefined : Math.round((value - min) / (max - min) * 100)
    },

    /**
     * Denormalizes any provided value from range 0..100 to the min..max range
     * @param {number} normalized - normalized value
     * @param {number} min - min observed (possible) value
     * @param {number} max - max observed (possible) value
     * @returns Denormalized value in the range min-max
     */
    denormalize_0_100: function (normalized, min, max) {
        return min >= max || normalized < 0 || normalized > 100 ? undefined : Math.round(normalized / 100 * (max - min) + min)
    },
    /**
     * Returns distinct objects in a list based on values of the provided property name
     * @param {Array} list - list of objects
     * @param {string} propertyName - name of the property to build distinct values on
     * @param {boolean} combineValues - if the values should be combined and not just overwritten
     * @returns {Array} List containing at most one element per property value
     */
    distinctByPropertyName: function (list, propertyName, combineValues) {
        let map = new Map();
        for (const item of list) {
            if (map.has(item[propertyName]) && combineValues) {
                const existing = map.get(item[propertyName]);
                if (existing.value === 'ON' || existing.value === 'OFF') {
                    if (item.value === 'ON') {
                        existing.value = item.value;
                    }
                } else if (isFinite(existing.value) && isFinite(item.value)) {
                    existing.value = Math.max(existing.value, item.value);
                }
                continue;
            }
            map.set(item[propertyName], item);
        }
        return Array.from(map.values());
    },
    className: function (thisToString) {
        let classNameRegEx = /\S+\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
        return classNameRegEx.exec(thisToString)[1];
    },
    /**
     * Updates the provided value if required to fit it into the range 0..100
     * @param {Number} value
     * @returns
     */
    ensureValueInRange_0_100: function (value) {
        return this.ensureValueInRange(value, 0, 100);
    },
    /**
     * Updates the provided value if required to fit it into the range min..max
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @returns
     */
    ensureValueInRange: function (value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    firstLower: function (input) {
        return input && input[0].toLowerCase() + input.slice(1) || input;
    },

    closestFromList: function (target, list) {
        return list.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
    },

    asEnum: function (values) {
        const enumeration = {};
        let i = 0;
        for (const value of values) {
            enumeration[enumeration[i] = value] = i;
            i++;
        }
        return enumeration;
    }
}