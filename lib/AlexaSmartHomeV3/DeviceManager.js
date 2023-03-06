const ChannelDetector = require('iobroker.type-detector').ChannelDetector;
const Device = require('./Device');
const DeviceUtils = require('./DeviceUtils');
const directives = require('./Directives')


class DeviceManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = []
        this.collectDevices();
    }

    assignedSmartName(payload) {
        let smartName = this.adapter.config.noCommon ? payload?.common?.custom[this.adapter.namespace]?.smartName : payload?.common?.smartName;
        return smartName === 'ignore' ? undefined : smartName;
    }

    roomOrFunctionName(payload, smartName) {
        let name = null;

        if (smartName && typeof smartName === 'object') {
            name = smartName[this.lang] || smartName.en;
        }
        name = name || payload?.common?.name;

        // still no name? => generate one from id
        if (!name) {
            // get all id segments
            let parts = payload._id.split('.');
            // skip the first two segments: enum.functions or enum.rooms
            parts.shift();
            parts.shift();
            // start with the 3rd segment
            let start = parts.shift();
            // capitalize the first letter of the 3rd segment and append the rest
            name = start[0].toUpperCase() + start.substring(1) + (parts.length ? '.' : '') + parts.join('.');
        }
        return name;
    }

    async allObjects() {
        const rowsStates = await this.adapter.getObjectViewAsync('system', 'state', {});
        const rowsChannels = await this.adapter.getObjectViewAsync('system', 'channel', {});
        const rowsDevices = await this.adapter.getObjectViewAsync('system', 'device', {});
        const result = {};
        rowsStates.rows.forEach(row => result[row.id] = row.value);
        rowsChannels.rows.forEach(row => result[row.id] = row.value);
        rowsDevices.rows.forEach(row => result[row.id] = row.value);

        return result;
    }

    async allEnums() {
        const result = await this.adapter.getObjectViewAsync('system', 'enum', {});
        return result.rows.map(row => row.value);
    }

    static isRoom(payload) {
        return payload && payload._id && payload._id.startsWith('enum.rooms.');
    }

    static isFunction(payload) {
        return payload && payload._id && payload._id.startsWith('enum.functions.');
    }

    async functionsAndRooms() {
        const roomsAndFunctions = await this.allEnums();

        // skip empty enums (with no members, i.e. states, assigned)
        const notEmptyRoomsAndFunctions = roomsAndFunctions.filter(item => item?.common?.members?.length);

        // all enums that are of type 'function'
        const functions = notEmptyRoomsAndFunctions.filter(item => DeviceManager.isFunction(item));

        // all enums, that are of type 'room'
        const rooms = notEmptyRoomsAndFunctions.filter(item => DeviceManager.isRoom(item));

        return [functions, rooms];
    }


    matchDirective(event) {
        let name = Object.keys(directives).find(key =>
            directives[key].matches(event)
        )

        return name ? new directives[name] : null;
    }

    get knownDevices() {
        return this.devices
    }

    addDevice(device) {
        this.devices.push(device)
    }

    deviceByEndpointId(endpointId) {
        return this.devices.find(device => device.id === endpointId)
    }

    static getChannelId(id, objects) {
        if (objects[id] && objects[id].type === 'channel') {
            return id;
        }

        if (objects[id] && objects[id].type === 'state') {
            const parts = id.split('.');
            parts.pop();
            const channelId = parts.join('.');
            if (objects[channelId] && objects[channelId].type === 'channel') {
                return channelId;
            }
            return null;
        }
    }

    static getDeviceId(id, objects) {
        const channelId = DeviceManager.getChannelId(id, objects);
        if (channelId) {
            const parts = channelId.split('.');
            parts.pop();
            const deviceId = parts.join('.');
            if (objects[deviceId] && (objects[deviceId].type === 'device' || objects[deviceId].type === 'channel')) {
                return deviceId;
            }
        }

        return null;
    }

    static collectIdsFromRoomsAndFunctions(objects, functions, rooms) {
        const ids = [];
        // find states belongs to rooms and functions
        functions.forEach(en => {
            en.common.members.forEach(id => {
                if (objects[id] && !ids.includes(id)) {
                    ids.push(id);
                    /*if (rooms.find(r => r.common.members.includes(id))) {
                        ids.push(id);
                    } else {
                        const channelId = DeviceManager.getChannelId(id, objects);
                        if (channelId && !ids.includes(channelId)) {
                            if (rooms.find(r => r.common.members.includes(channelId))) {
                                ids.push(channelId);
                            } else {
                                const deviceId = DeviceManager.getDeviceId(id, objects);
                                if (deviceId && !ids.includes(deviceId) && rooms.find(r => r.common.members.includes(deviceId))) {
                                    ids.push(deviceId);
                                }
                            }
                        }
                    }*/
                }
            })
        });

        rooms.forEach(en => {
            en.common.members.forEach(id => {
                if (objects[id] && !ids.includes(id)) {
                    const channelId = DeviceManager.getChannelId(id, objects);
                    if (channelId) {
                        if (!ids.includes(channelId)) {
                            const deviceId = DeviceManager.getDeviceId(id, objects);
                            if (deviceId) {
                                if (!ids.includes(deviceId)) {
                                    ids.push(id);
                                }
                            } else {
                                ids.push(id);
                            }
                        }
                    } else {
                        ids.push(id);
                    }

                    /*if (functions.find(f => f.common.members.includes(id))) {
                        ids.push(id);
                    } else {
                        const channelId = DeviceManager.getChannelId(id, objects);
                        if (channelId && !ids.includes(channelId)) {
                            if (functions.find(f => f.common.members.includes(channelId))) {
                                ids.push(id);
                            } else {
                                const deviceId = DeviceManager.getDeviceId(id, objects);
                                if (deviceId && !ids.includes(deviceId) && functions.find(f => f.common.members.includes(deviceId))) {
                                    ids.push(id);
                                }
                            }
                        }
                    }*/
                }
            })
        });

        return ids;
    }

    async collectDevices() {
        let objects = await this.allObjects();
        const [functions, rooms] = await this.functionsAndRooms();
        const ids = DeviceManager.collectIdsFromRoomsAndFunctions(objects, functions, rooms);
        const keys = Object.keys(objects);				// For optimization

        keys.forEach(id => {
            if (objects[id].common.smartName && objects[id].common.smartName !== 'ignore' && !ids.includes(id)) {
                const channelId = DeviceManager.getChannelId(id, objects);
                if (!ids.includes(channelId)) {
                    ids.push(id);
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

        ids.forEach(id => {
            options.id = id;
            let controls = detector.detect(options);
            if (controls) {
                controls = controls.map(control => {
                    // if any detected state has an ID, we can use this control
                    const id = control.states.find(state => state.id).id;
                    if (id) {
                        console.log(`In ${options.id} was detected "${control.type}" with following states:`);
                        control.states
                            .filter(state => state.id)
                            .forEach(state => {
                                console.log(`    ${state.name} => ${state.id}`);
                            });

                        return {control, id};
                    }
                });
            } else {
                console.log(`Nothing found for ${options.id}`);
            }
        });

        let event = {
            "directive": {
                "header": {
                    "namespace": "Alexa.Discovery",
                    "name": "Discover",
                    "messageId": "Unique identifier, preferably a version 4 UUID",
                    "payloadVersion": "3"
                },
                "payload": {
                    "scope": {
                        "type": "BearerToken",
                        "token": "OAuth2.0 bearer token"
                    }
                }
            }
        }

        let directive = this.matchDirective(event);

        if (directive) {
            let response = directive.handle(event, this);
        }

        // Here we try to aggregate different states assigned to functions and rooms to devices. A device have at least one linked state.
        // In terms of Alexa V3 a device is an endpoint featuring multiple capabillities.
        // The aggregation logic is as follows:
        // - states of a function with different roles belong to different devices
        // - states of a function with the same role belong to the same device
        // - the device name is either explicitly set or defined by the function and the room the device is in
        // - putting a state in a room might only affect its name
        // - all states of a room with no function are ignored





        return null;
    }

}

module.exports = DeviceManager;