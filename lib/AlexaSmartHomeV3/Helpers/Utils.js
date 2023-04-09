const ChannelDetector = require('iobroker.type-detector').ChannelDetector;

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

    let objects = states.rows
        .concat(channels.rows)
        .concat(devices.rows)
        .reduce((obj, item) => (
            obj[item.id] = {
                common: item.value?.common,
                type: item.value?.type,
            }, obj), {}
        );

    return objects;
}

let functionalitiesAndRooms = async function (adapter) {
    const enumerations = await allEnums(adapter);
    // skip empty enums (with no members, i.e. states, assigned)
    const notEmptyRoomsAndFunctionalities = enumerations.filter(item => item?.common?.members?.length);
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
        const channelId = parentOf(id)
        if (objects[channelId] && objects[channelId].type === 'channel') {
            return channelId;
        }
        return null;
    }
}

let getDeviceId = function (id, objects) {
    const channelId = getChannelId(id, objects);
    if (channelId) {
        const deviceId = parentOf(channelId)
        if (objects[deviceId] && (objects[deviceId].type === 'device' || objects[deviceId].type === 'channel')) {
            return deviceId;
        }
    }
    return null;
}

module.exports = {

    /**
     * Checks whether the provided value is a valid smart name.
     * @param {*} smartName The value to check
     * @param {String} [lang='en'] Configured language
     * @returns {Boolean} True if a valid smart name, false - otherwise.
     */
    isValidSmartName: function (smartName, lang) {
        let name = smartName;
        if (smartName && typeof smartName === 'object') {
            name = smartName[lang] || smartName.en;
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
     * Inspects all objects (states, channels and devices) and tries to identify so called 'controls'
     *
     * To identify the controls the ioBroker type detector library is used (https://github.com/ioBroker/ioBroker.type-detector).
     * @async
     * @param adapter The iot adapter instance
     * @returns {Promise<Array>} An array containing the detected controls
     */
    controls: async function (adapter) {
        // here we collect ids to inspect
        const list = [];

        // fetch all objects (states, channels and devices in terms of iobroker)
        let devicesObject = await allObjects(adapter);
        // fetch all defined rooms and functions (enumerations)
        const [functionalities, rooms] = await functionalitiesAndRooms(adapter);

        // every member of a function enumeration is added to the list of ids to inspect
        functionalities.forEach(functionEnumItem => {
            functionEnumItem.common.members.forEach(id => {
                if (devicesObject[id] && !list.includes(id)) {
                    list.push(id);
                }
            })
        });

        // a member of a room enumeration is only added if neither its parent (channel) nor its grandparent (device) is in
        rooms.forEach(roomEnumItem => {
            roomEnumItem.common.members.forEach(id => {
                if (devicesObject[id] && !list.includes(id)) {
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
        const keys = Object.keys(devicesObject);

        // if a state has got a smart name directly assigned and neither itself nor its channel is in the list, add its id to the inspection list
        keys.forEach(id => {
            // if (!list.includes(id) && devicesObject[id].common?.smartName && devicesObject[id].common?.smartName !== 'ignore') {
            if (!list.includes(id) && this.isValidSmartName(devicesObject[id].common?.smartName)) {
                const channelId = getChannelId(id, devicesObject);
                if (!list.includes(channelId)) {
                    list.push(id);
                }
            }
        });

        // initialize iobroker type detector
        const detector = new ChannelDetector();
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

        let detectedControls = [];

        // go other the list of ids to inspect and collect the detected controls
        list.forEach(id => {
            options.id = id;
            let controls = detector.detect(options);
            if (controls) {
                controls = controls.forEach(control => {
                    // if any detected state has an ID, we can use this control
                    if (control.states.find(state => state.id)) {
                        // console.log(`In ${id} was detected "${control.type}" with the following states:`);

                        // remove all unassigned control register
                        control.states = control.states.filter(s => s.id);

                        // take all smartNames if any
                        control.states.forEach(s => s.smartName = devicesObject[s.id]?.common?.smartName);

                        // find out the room the found control is in
                        let room = rooms.find(room => room?.common?.members.includes(id))

                        // find out the functionality the found control assigned to
                        let functionality = functionalities.find(functionality => functionality?.common?.members.includes(id))

                        control.object = {
                            id: id,
                            type: devicesObject[id].type,
                            common: devicesObject[id].common
                        }
                        control.room = room ? {
                            id: room._id,
                            common: room.common
                        } : undefined;
                        control.functionality = functionality ? {
                            id: functionality._id,
                            common: functionality.common
                        } : undefined;

                        detectedControls.push(control)
                    }
                });
            } else {
                // console.log(`Nothing found for ${id}`);
            }
        });

        return detectedControls;
    },
    /**
     * 
     * @param {*} controls - list of controls to be merged to a device
     * @param {*} lang - configured language
     * @param {*} funcNameFirst - indicates whether the Function enum name should come before the Room enum name
     * @param {*} concatenation - configured concatenation word
     * @returns 
     */
    endpointName: function (controls, lang, funcNameFirst, concatenation) {

        let name = null;
        let control = controls[0]
        // friendlyName for a single control: smartName or combination of room and functionality names
        if (controls.length === 1) {
            // first, try to take the object's smart name
            name = control.object?.common?.smartName;

            // if there is no luck yet, take the first one found in states
            if (!name) {
                name = control.states.find(s => s.smartName)?.smartName;
            }

            if (this.isValidSmartName(name, lang)) {
                if (typeof name === 'object') {
                    name = name[lang] || name.en;
                }
                return onlyValidCharactersAndLength(name);
            }

            // if we're here, then there is no smart name for a single control found => proceed with room/functionality names
        }

        // friendlyName for a single control with no smart name or a set of controls: only a combination of room and functionality names
        let roomName = control.room?.common?.name;
        if (roomName) {
            let translateRoomName = false;
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

            let funcName = control.functionality?.common?.name || '';
            if (funcName !== '') {
                let translateFunctionalityName = false;
                if (typeof funcName === 'object') {
                    funcName = funcName[lang] || funcName.en;
                    translateFunctionalityName = lang && lang !== 'en' && !funcName[lang];
                } else {
                    translateFunctionalityName = true;
                }
                if (translateFunctionalityName) {
                    let funcsTranslator = require('../../functions.js');
                    funcName = funcsTranslator(lang, funcName)
                }
            }


            if (concatenation && roomName && funcName) {
                concatenation = ' ' + concatenation + ' ';
            } else {
                concatenation = ' ';
            }
            name = `${funcNameFirst ? funcName : roomName}${concatenation}${funcNameFirst ? roomName : funcName}`;
            name = name.trim();

        } else {
            // just take the object's name
            name = control.object?.common?.name;
            if (typeof name === 'object') {
                name = name[lang] || name.en;
            }

            if (!name) {
                // ouch!... that's unexpected take the object id as name
                // name = 'PleaseGiveMeAName';
                name = control.object.id;
            }
        }

        return onlyValidCharactersAndLength(name);
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
     * @returns Denormalized value in the range min..max
     */
    denormalize_0_100: function (normalized, min, max) {
        return min >= max || normalized < 0 || normalized > 100 ? undefined : Math.round(normalized / 100 * (max - min) + min)
    },
    /**
     * Returns distinct objects in a list based on values of the provided property name
     * @param {Array} list - list of objects
     * @param {string} propertyName - name of the property to build distinct values on
     * @returns {Array} List containing at most one element per property value
     */
    distinctByPropertyName: function (list, propertyName) {
        let map = new Map();
        for (const item of list) {
            map.set(item[propertyName], item);
        }
        return Array.from(map.values());
    },
    className: function (thisToString) {
        let classNameRegEx = /(?:\S+\s+){1}([a-zA-Z_$][0-9a-zA-Z_$]*)/;
        return classNameRegEx.exec(thisToString)[1];
    },
    /**
     * Updates the provided value if required to fit it into the range 0..100
     * @param {Number} value 
     * @returns 
     */
    ensureValueInRange_0_100: function (value) {
        return Math.max(0, Math.min(100, value));
    }
}