const ChannelDetector = require('iobroker.type-detector').ChannelDetector;

let isValidSmartName = function (smartName) {
    let name = null;
    if (smartName && typeof smartName === 'object') {
        name = smartName.en;
    }
    return name !== null && name !== 'ignore' && name !== false;
}

let isRoom = function (payload) {
    return payload && payload._id && payload._id.startsWith('enum.rooms.');
}

let isFunction = function (payload) {
    return payload && payload._id && payload._id.startsWith('enum.functions.');
}

let allEnums = async function (adapter) {
    const result = await adapter.getObjectViewAsync('system', 'enum', {});
    return result.rows.map(row => row.value);
}

let parentOf = function (id) {
    const parts = id.split('.');
    parts.pop();
    return parts.join('.');
}

let allObjects = async function (adapter) {
    const states = await adapter.getObjectViewAsync('system', 'state', {});
    const channels = await adapter.getObjectViewAsync('system', 'channel', {});
    const devices = await adapter.getObjectViewAsync('system', 'device', {});

    let objects = states.rows.concat(channels.rows).concat(devices.rows).reduce((obj, item) =>
    (
        obj[item.id] = {
            common: item.value?.common,
            type: item.type,
        },
        obj), {});

    return objects;
}

let functionsAndRooms = async function (adapter) {
    const roomsAndFunctions = await allEnums(adapter);
    // skip empty enums (with no members, i.e. states, assigned)
    const notEmptyRoomsAndFunctions = roomsAndFunctions.filter(item => item?.common?.members?.length);
    // all enums that are of type 'function'
    const functions = notEmptyRoomsAndFunctions.filter(item => isFunction(item));
    // all enums, that are of type 'room'
    const rooms = notEmptyRoomsAndFunctions.filter(item => isRoom(item));
    return [functions, rooms];
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
     * Check a value for validity or return a default.
     * @param value The value being checked
     * @param defaultValue A default value if the passed value is not valid
     * @returns {*} The passed value if valid otherwise the default value.
     */
    defaultIfNullOrEmpty: function (value, defaultValue) {
        if (value === undefined || (typeof value === 'object' && Object.keys(value).length === 0) || value === "")
            return defaultValue;

        return value;
    },

    potentialDevices: async function (adapter) {
        const list = [];

        let objects = await allObjects(adapter);
        const [functions, rooms] = await functionsAndRooms(adapter);

        // every member of a function is added to the resulting list
        functions.forEach(functionContainer => {
            functionContainer.common.members.forEach(id => {
                if (objects[id] && !list.includes(id)) {
                    list.push(id);
                }
            })
        });

        // a member of a room is only added if neither its parent (channel) nor its grand parent (device) is in
        rooms.forEach(roomContainer => {
            roomContainer.common.members.forEach(id => {
                if (objects[id] && !list.includes(id)) {
                    const channelId = getChannelId(id, objects);
                    if (channelId) {
                        if (!list.includes(channelId)) {
                            const deviceId = getDeviceId(id, objects);
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

        const keys = Object.keys(objects);

        keys.forEach(id => {
            if (objects[id].common.smartName && objects[id].common.smartName !== 'ignore' && !list.includes(id)) {
                const channelId = getChannelId(id, objects);
                if (!list.includes(channelId)) {
                    list.push(id);
                }
            }
        });

        const detector = new ChannelDetector();
        const usedIds = [];                 			// To not allow using of same ID in more than one device
        const ignoreIndicators = ['UNREACH_STICKY'];    // Ignore indicators by name
        // const allowedTypes = ['button', 'rgb', 'dimmer', 'light'];	// Supported types. Leave it null if you want to get ALL devices.
        const excludedTypes = ['info'];
        const options = {
            objects,
            _keysOptional: keys,
            _usedIdsOptional: usedIds,
            ignoreIndicators,
            // allowedTypes,
            excludedTypes,
        };

        list.forEach(id => {
            options.id = id;
            let controls = detector.detect(options);
            if (controls) {
                controls = controls.forEach(control => {
                    // if any detected state has an ID, we can use this control
                    // const id = control.states.find(state => state.id).id;
                    if (control.states.find(state => state.id)) {
                        console.log(`In ${id} was detected "${control.type}" with the following states:`);
                        control.states
                            //.filter(state => state.id)
                            .forEach(state => {
                                console.log(`    ${state.name} => ${state.id}`);
                            });

                        // find out the rooms the found device is in
                        objects[id].rooms = []
                        rooms.forEach(room => {
                            if (room?.common?.members.includes(id)) {
                                objects[id].rooms.push(room)
                            }
                        });

                        for (const room of objects[id].rooms) {
                            console.log(`${id} is in ${room.common.name.en}`);
                        }
                    }
                });
            } else {
                console.log(`Nothing found for ${id}`);
                // we're not interested in this object any more
                delete objects[id]
            }
        });

        // remove objects that are not recognized as a device
        keys.forEach(key => {
            if (!list.includes(key)) {
                delete objects[key];
            }
        })

        return objects;
    }

    // extractAllDeviceNames: function (adapter, lang, id, translate, smartName, roomName, functionName) {

    //     if (!isValidSmartName(smartName)) {
    //         return null;
    //     }

    //     let names = {}

    //     if (roomName && typeof roomName === 'object') {
    //         names.roomName = roomName[lang] || roomName.en;
    //     } else {
    //         names.roomName = roomName
    //     }

    //     if (functionName && typeof functionName === 'object') {
    //         names.functionName = functionName[lang] || functionName.en;
    //     } else {
    //         names.functionName = functionName
    //     }

    //     let friendlyName = smartName;

    //     // due to historical reasons, the smartName might be an object, containing among other things, also byON name, friendly name and smart type
    //     if (smartName && typeof smartName === 'object') {
    //         names.byON = smartName.byON;
    //         names.smartType = smartName.smartType;
    //         friendlyName = smartName[lang] || smartName.en;
    //     }

    //     // generate a default friendly name if none
    //     if (!friendlyName) {
    //         if (names.roomName) {
    //             // translate room and function names to generate friendly name
    //             if (translate) {
    //                 let translateRooms = require('../rooms.js');
    //                 let translateFunctions = require('../functions.js');
    //                 names.roomName = translateRooms(lang, names.roomName);
    //                 names.functionName = translateFunctions(lang, names.functionName);
    //             }

    //             if (adapter.config.functionFirst) {
    //                 friendlyName = `${names.functionName}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${names.roomName}`;
    //             } else {
    //                 friendlyName = `${names.roomName}${adapter.config.concatWord ? ' ' + adapter.config.concatWord : ''} ${names.functionName}`;
    //             }
    //         } else {
    //             friendlyName = 'not implemented yet';
    //             // TODO
    //             // // if no room name defined, just take a name of state as friendlyName
    //             // friendlyName = states[id].common.name;
    //             // if (adapter.config.replaces) {
    //             //     for (let r = 0; r < adapter.config.replaces.length; r++) {
    //             //         friendlyName = friendlyName.replace(adapter.config.replaces[r], '');
    //             //     }
    //             // }
    //         }

    //         names.friendlyNames = [friendlyName];
    //         names.nameModified = false;
    //     } else if (translate) {
    //         let translateDevices = require('../devices.js');
    //         friendlyName = translateDevices(lang, friendlyName);
    //         names.nameModified = true;
    //         names.friendlyNames = friendlyName.split(',');
    //     } else {
    //         names.friendlyNames = friendlyName.split(',');
    //         names.nameModified = true;
    //     }

    //     // Friendly names may be max 127 bytes long and could have only specified set of chars
    //     for (let i = names.friendlyNames.length - 1; i >= 0; i--) {
    //         names.friendlyNames[i] = (names.friendlyNames[i] || '').trim();
    //         if (!names.friendlyNames[i]) {
    //             names.friendlyNames.splice(i, 1);
    //         } else {
    //             // friendlyName may not be longer than 128
    //             names.friendlyNames[i] = names.friendlyNames[i].substring(0, 128).replace(/[^.a-zA-Z0-9äÄüÜöÖßÉéÈèÀàÂâÊêÙùÛûÇçÎîËëÏïŸÿÔôŒœãõìòáíóú]+/g, ' ');
    //         }
    //     }

    //     // if no one valid friendly name => cancel processing 
    //     if (!names.friendlyNames[0]) {
    //         adapter.log.warn(`[ALEXA-V3] State ${id} doesn't suit as a smart device. No freindly name could be determined.`);
    //         return null;
    //     }

    //     return names;
    // }
}