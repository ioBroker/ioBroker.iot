'use strict';
const AdapterProvider = require('./AlexaSmartHomeV3/AdapterProvider');
const AlexaResponse = require('./AlexaSmartHomeV3/Alexa/AlexaResponse');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
const Logger = require('./AlexaSmartHomeV3/Logger');

class AlexaSH3 {

    constructor(options) {
        this.log = new Logger(this);
        this.deviceManager = new DeviceManager(options);
        AdapterProvider.init(options.adapter);
    }

    setLanguage(lang) {
        this.deviceManager.language = lang;
    }

    async process(event) {
        this.log.debug(`incoming Alexa event`);
        this.log.silly(`${event}`);

        let response;
        let directive = this.deviceManager.matchDirective(event);
        if (directive) {
            response = await directive.handle(event, this.deviceManager);
        } else {
            let device = this.deviceManager.endpointById(event?.directive?.endpoint?.endpointId)
            if (device) {
                response = await device.handle(event);
            } else {
                response = AlexaResponse.directiveNotSupported().get();
            }
        }

        this.log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }

    async updateDevices() {
        await this.deviceManager.collectEndpoints();
    };

    handleStateUpdate(id, state) {
        return this.deviceManager.handleStateUpdate(id, state);
    }
}

module.exports = AlexaSH3;