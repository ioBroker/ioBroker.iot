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

    toDevice(controls) {
        // first determine wether we can map the control to a set of supported Alexa capabilities
        let capabilities = CapabilityFactory.map(controls);

        if (capabilities.length === 0) {
            // the control not supported yet...
            return;
        }
        // determine the friendlyName
        let friendlyName = Helpers.endpointName(controls, this.lang, this.adapter.config.functionFirst, this.adapter.config.concatWord);
        // provision a new device
        let device = new Device({
            id: friendlyName,
            friendlyName: friendlyName,
            capabilities: capabilities,
            displayCategories: ['LIGHT'],
            adapter: this.adapter,
        })

        // add created device to the collected devices
        this.addDevice(device);
    }

    async collectEndpoints() {
        // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
        let controls = await Helpers.controls(this.adapter);

        // Normally every control is a smart device. But due to the iobroker concept of 'rooms and functions'
        // multiple controls are merged to a single device.
        // The following logic performs the mapping of controls to devices:
        // - first, controls located in the same room and having the same functinality are merged to a single device
        // - then, controls located in the same room with no functionality are merged to a single device
        // - finally, each control with no room and no functionality represents a separate device

        // as long as not all controls mapped to a device...
        while (controls.length) {
            let controlsInTheSameRoom = [];
            let functionalitiesInTheRoom = [];
            // take the next control
            let control = controls[0];

            // if there is no room assigned...
            if (!control.room) {
                // the control is to map to a separate device
                controlsInTheSameRoom = [control];
                functionalitiesInTheRoom = [(control.functionality || {}).id];
            } else { // if it's in a room
                // find all the controls in the same room
                controlsInTheSameRoom = controls.filter(item => item.room?.id == control.room.id);
                // find all available functionalities in this room
                functionalitiesInTheRoom = Array.from(new Set(controlsInTheSameRoom.map(item => (item.functionality || {}).id)));
            }

            functionalitiesInTheRoom.forEach(f => {
                const controlsToMerge = controlsInTheSameRoom.filter(item => (item.functionality || {}).id === f);
                // convert to device
                this.toDevice(controlsToMerge)

                // remove processed controls
                let objectIds = controlsToMerge.map(item => item.object.id);
                controls = controls.filter(item => !objectIds.includes(item.object.id))

                // controls = controls.filter((value, index, self) => {
                //     if (objectIds.includes(value.object.id)) {
                //         self.splice(index, 1);
                //         return false;
                //     }
                //     return true;
                // })

            })
        }

        // done
    }
}

module.exports = DeviceManager;