const Device = require('./Device');
const Helpers = require('./Helpers');
const directives = require('./Alexa/Directives');
const Controls = require('./Controls')
const Logger = require('./Logger');
const Adapter = require('./Adapter');
/** 
 * @class 
 * */
class DeviceManager {
    constructor(adapter, lang) {
        this.adapter = adapter;
        this.lang = lang;
        this.devices = [];
        Adapter.init(adapter);
        this.log = new Logger(this);
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

    toDevice(detectedControls, friendlyName) {
        let controls = []

        // determine the friendlyName
        if (!friendlyName) {
            friendlyName = Helpers.endpointName(detectedControls, this.lang, this.adapter.config.functionFirst, this.adapter.config.concatWord);
        }

        this.log.debug(`merging controls to a device with name ${friendlyName}`)

        detectedControls.forEach(item => {
            const controlName = Object.keys(Controls).find(key => Controls[key].type === item.type);
            if (controlName) {
                controls.push(new Controls[controlName](item));
                this.log.debug(`${controlName} added to ${friendlyName}`)
            } else {
                this.log.debug(`control of type ${item.type} not supported yet. Skipped.`)
            }
        });

        if (controls.length === 0) {
            // the controls are not supported yet...
            return;
        }

        // provision a new device
        let device = new Device({
            id: friendlyName,
            friendlyName: friendlyName,
            controls: controls,
        })

        // add created device to the collected devices
        this.addDevice(device);
    }

    async collectEndpoints() {

        function stringify(smartName, lang) {
            if (typeof smartName === 'object') {
                return smartName[lang] || smartName.en;
            }
            return smartName;
        }

        // collect all iobroker controls in terms of iobroker type detector (https://github.com/ioBroker/ioBroker.type-detector)
        let detectedControls = await Helpers.controls(this.adapter);

        this.log.debug(`type detector found ${detectedControls.length} controls`);

        // Normally every control is a smart device. But due to the iobroker concept of 'rooms and functions'
        // multiple controls might be merged to a single device.

        // as long as not all controls mapped to a device...
        while (detectedControls.length) {
            // take the next control
            let control = detectedControls[0];
            let processedControls = [];
            if (control.room && control.functionality) {
                // controls in the same room with the same functionality
                processedControls = detectedControls.filter(item => item.room?.id == control.room.id && item.functionality?.id == control.functionality.id);
                this.toDevice(processedControls);

            } else {
                if (Helpers.isValidSmartName(control.object.common?.smartName, this.lang)) {
                    // create device
                    this.toDevice([control], stringify(control.object.common?.smartName));
                }

                control.states.filter(item => Helpers.isValidSmartName(item.smartName, this.lang)).forEach(item => {
                    // create device
                    this.toDevice([control], stringify(item.smartName));
                })

                processedControls = [control];
            }

            // remove processed controls
            let objectIds = processedControls.map(item => item.object.id);
            detectedControls = detectedControls.filter(item => !objectIds.includes(item.object.id))
        }

        // done
        this.log.debug(`finished collecting devices`);
    }
}

module.exports = DeviceManager;