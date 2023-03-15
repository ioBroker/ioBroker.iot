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

        // The following logic performs the mapping of controls to endpoints:
        // - first, controls located in the same room and having the same functinality are merged to a single endpoint
        // - then, controls located in the same room with no functionality are merged to a single endpoint
        // - finally, each control with no room and no functionality represents a separate endpoint

        // as long as not all controls mapped to endpoints...
        while (controls.length) {
            // take the next control
            let control = controls.shift();

            // if there is no room assigned...
            if (!control.room) {
                // first determine the friendlyName by looking at the object of the control
                let capabilities = CapabilityFactory.map([control]);

                if (capabilities.length === 0) {
                    // not supported yet
                    continue;
                }
                let friendlyName = Helpers.endpointName(control, this.lang, this.adapter.config.functionFirst, this.adapter.config.concatWord);
                // map it to a separate endpoint
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