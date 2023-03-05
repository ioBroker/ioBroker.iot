const ChannelDetector = require('iobroker.type-detector').ChannelDetector;
const Device = require('./Device');
const DeviceUtils = require('./DeviceUtils');
const directives = require('./Directives')


class DeviceManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = []
        //  this.collectDevices();
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

    async allStates() {
        return new Promise((resolve, reject) => {
            this.adapter.getObjectView('system', 'state', {}, (err, states) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(states.rows)
                }
            })
        });
    }

    async allEnums() {
        return new Promise((resolve, reject) => {
            this.adapter.getObjectView('system', 'enum', {}, (err, enums) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(enums.rows)
                }
            })
        });
    }

    isRoom(payload) {
        return payload && payload._id.match(/^enum\.rooms\./) != null;
    }

    isFunction(payload) {
        return payload && payload._id.match(/^enum\.functions\./) != null;
    }

    async functionsAndRooms() {
        let roomsAndFunctions = await this.allEnums();

        // skip empty enums (with no members, i.e. states, assigned)
        let notEmptyRoomsAndFunctions = roomsAndFunctions.filter(item => item?.value?.common?.members?.length);

        // all enums that are of type 'function'
        let functions = notEmptyRoomsAndFunctions.filter(item => {
            return this.isFunction(item?.value);
        });

        // all enums, that are of type 'room'
        let rooms = notEmptyRoomsAndFunctions.filter(item => !functions.includes(item));

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

    async collectDevices() {

        // let states = await this.allStates();
        // let objects = states.reduce((obj, item) => (obj[item.id] = item.value, obj), {});
        // const detector = new ChannelDetector();
        // const keys = Object.keys(objects);				// For optimization
        // const usedIds = [];                 			// To not allow using of same ID in more than one device
        // const ignoreIndicators = ['UNREACH_STICKY'];    // Ignore indicators by name
        // const supportedTypes = ['button', 'rgb', 'dimmer', 'light'];	// Supported types. Leave it null if you want to get ALL devices.
        // const options = {
        //     objects: objects,
        //     // id: '0_userdata.0',
        //     id: 'alias.0',
        //     _keysOptional: keys,
        //     _usedIdsOptional: usedIds,
        //     ignoreIndicators
        // };
        // let controls = detector.detect(options);
        // if (controls) {
        //     controls = controls.map(control => {
        //         const id = control.states.find(state => state.id).id;
        //         if (id) {
        //             console.log(`In ${options.id} was detected "${control.type}" with following states:`);
        //             control.states.forEach(state => {
        //                 if (state.id) {
        //                     console.log(`    ${state.name} => ${state.id}`);
        //                 }
        //             });

        //             return { control, id };
        //         }
        //     });
        // } else {
        //     console.log(`Nothing found for ${options.id}`);
        // }


        const [functions, rooms] = await this.functionsAndRooms();

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