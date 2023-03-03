//const ChannelDetector = require('iobroker.type-detector');
const Device = require("./Device");
const DeviceUtils = require("./DeviceUtils");

class DeviceAggregator {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = this.collectDevices();

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

    async allRoomsAndFunctions() {
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
        return (payload._id.match(/^enum\.rooms\./) != null);
    }

    isFunction(payload) {
        return (payload._id.match(/^enum\.functions\./) != null);
    }

    async allRoomsAndFunctionsMembers() {
        let roomsAndFunctions = await this.allRoomsAndFunctions();
        let devices = {};

        // skip empty rooms and functions (with no members, i.e. states, assigned)
        let notEmptyRoomsAndFunctions = roomsAndFunctions.filter(roomOrFunction => roomOrFunction?.value?.common?.members?.length);

        notEmptyRoomsAndFunctions.forEach(roomOrFunction => {
            let payload = roomOrFunction?.value;
            let smartName = this.assignedSmartName(payload);

            // take only rooms and functions with a valid smart name

            let isRoom = smartName !== false && this.isRoom(payload);
            let isFunc = smartName !== false && this.isFunction(payload);

            payload.common.members.forEach(element => {
                let roomOrFunctionName = this.roomOrFunctionName(payload, smartName);
                let names = DeviceUtils.extractAllDeviceNames(this.adapter, this.lang, element, true, smartName, roomOrFunctionName, roomOrFunctionName);
                if (names) {
                    if (!devices[element]) {
                        devices[element] = new Device(smartName, this.lang)
                    }
                    if (isRoom) {
                        devices[element].assignRoom(roomOrFunctionName);
                    }
                    if (isFunc) {
                        devices[element].assignFunction(roomOrFunctionName);
                    }
                }
            });
        })
        return devices;
    }


    async collectDevices() {
        let devices = await this.allRoomsAndFunctionsMembers();



        return devices;
    }

}

module.exports = DeviceAggregator;