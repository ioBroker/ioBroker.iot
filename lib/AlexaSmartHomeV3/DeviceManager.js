const Device = require('./Devices/Device');
const Helpers = require('./Helpers');
const directives = require('./Alexa/Directives');
const CapabilityFactory = require('./CapabilityFactory');
/** 
 * @class 
 * */
class DeviceManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = []
        this.collectEndpoints();
    }

    matchDirective(event) {
        let name = Object.keys(directives).find(key =>
            directives[key].matches(event)
        )

        return name ? new directives[name] : null;
    }

    get endpoints() {
        return this.devices
    }

    endpointById(id) {
        return this.devices.find(device => device.id === id)
    }

    addDevice(device) {
        this.devices.push(device)
    }

    async collectEndpoints() {
        // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
        let controls = await Helpers.controls(this.adapter);

        // Normally every control is a smart device. But, due to the iobroker concept of 'rooms and functions'
        // multiple controls are merged as a single device.
        // The following logic performs the mapping of controls to devices:
        // - first, controls located in the same room and having the same functinality are merged to a single device
        // - then, controls located in the same room with no functionality are merged to a single device
        // - finally, each control with no room and no functionality represents a separate device

        // as long as not all controls mapped to device...
        while (controls.length) {
            // take the next control
            let control = controls.shift();

            // if there is no room assigned...
            if (!control.room) {
                // first determine wether we can map the control to a set of supported Alexa capabilities
                let capabilities = CapabilityFactory.map([control]);

                if (capabilities.length === 0) {
                    // the control not supported yet...
                    continue;
                }
                // determine the friendlyName
                let friendlyName = Helpers.endpointName(control, this.lang, this.adapter.config.functionFirst, this.adapter.config.concatWord);
                // provision a new device
                let device = new Device({
                    id: friendlyName,
                    friendlyName: friendlyName,
                    capabilities: capabilities,
                    displayCategories: ['LIGHT'],
                    adapter: this.adapter,
                })

                this.addDevice(device);
            } else { // if it's in a room
                // find all the other controls in the same room
                let inTheSameRoom = controls.filter(c => c.room?.id == control.room.id);

            }

        }

    }

}

module.exports = DeviceManager;