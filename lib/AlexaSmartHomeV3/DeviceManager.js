const Device = require('./Device');
const Helpers = require('./Helpers');
const directives = require('./Directives');

class DeviceManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = []
        //this.collectDevices();
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

        let objects = await Helpers.devices(this.adapter);

        return objects;
    }

}

module.exports = DeviceManager;