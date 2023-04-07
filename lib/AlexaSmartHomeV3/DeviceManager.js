const Device = require('./Device');
const Helpers = require('./Helpers');
const Directives = require('./Alexa/Directives');
const Controls = require('./Controls')
const Logger = require('./Logger');
const AdapterProvider = require('./AdapterProvider');
const AlexaResponse = require('./Alexa/AlexaResponse');
/** 
 * @class 
 * */
class DeviceManager {
    /**
     * Creates a Device Manager.
     * @constructor
     * @param {Object} opts - The object to initialitze the device manager.
     * @param {Object} [opts.iotDevice] - The object representing AWS IoT device.
     * @param {string} [opts.iotClientId] - Unique identifier of the AWS IoT device.
     */
    constructor(options) {
        options = Helpers.defaultIfNullOrEmpty(options, {});
        this.lang = 'en';
        this.iotDevice = options.iotDevice;
        this.iotClientId = options.iotClientId;
        this.devices = [];
        this.log = new Logger(this);        
    }

    get language() {
        return this.lang;
    }

    set language(value) {
        this.lang = value;
    }

    matchDirective(event) {
        let name = Object.keys(Directives).find(key =>
            Directives[key].matches(event)
        )

        return name ? new Directives[name] : null;
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
            friendlyName = Helpers.endpointName(detectedControls, this.lang, AdapterProvider.get().config.functionFirst, AdapterProvider.get().config.concatWord);
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
        let detectedControls = await Helpers.controls(AdapterProvider.get());

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
        this.log.debug(`finished collecting devices. there is/are ${this.devices.length} device(s) in total`);
        let logMessage = '';
        for (const device of this.devices) {
            logMessage += `${device.toString()}`;
        }
        this.log.debug(logMessage);
    }

    publishStateChange(stateChange) {
        return this.publish(`response/${this.iotClientId}/stateChange`, stateChange);
    }

    publish(topic, message) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        }
        setTimeout(() => {
            this.log.silly(`publishing ${message} to topic ${topic}`);
            this.iotDevice.publish(topic, message, { qos: 0 }, (error, result) => {
                //this.log.silly(`publishing result: ${result}, ${error}`);
            });
        }, 100);
    }

    async handleAlexaEvent(event) {
        let response;
        let directive = this.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, this);
        } else {
            let device = this.endpointById(event?.directive?.endpoint?.endpointId)
            if (device) {
                response = await device.handle(event);
                if (!AlexaResponse.isErrorResponse(response)) {
                    // TODO: report state change via voice interaction
                }
            } else {
                response = AlexaResponse.directiveNotSupported().get();
            }
        }

        return response;
    }

    async handleStateUpdate(id, state) {
        if (!state.ack) {
            this.log.silly(`ignoring state change event for ${id} due to state.ack == ${state.ack}`)
            return;
        }

        let notFound = true;

        for (const device of this.devices) {

            const supported = device.controls.flatMap(item => item.supported).find(item => item.stateProxy.getId === id);

            if (supported) {
                notFound = false;
                if (supported.stateProxy.currentValue === state.val) {
                    this.log.silly(`ignoring state change event for ${id} due to the same value`);
                } else {
                    supported.stateProxy.currentValue = state.val;
                    // fire state change report to Alexa
                    const event = Directives.ChangeReport.get(device.id, supported.capability.propertyName, true);
                    const directive = this.matchDirective(event);
                    if (directive) {
                        const stateChange = await directive.handle(event, this);
                        this.publishStateChange(stateChange);
                    }
                }

                // should be the only device having the id => stop searching here
                break;
            }
        }

        if (notFound) {
            this.log.silly(`state id ${id} doesn't belong to any device`);
        }
    }
}

module.exports = DeviceManager;