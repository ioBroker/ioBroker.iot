'use strict';
const AdapterProvider = require('./AlexaSmartHomeV3/Helpers/AdapterProvider');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
const Logger = require('./AlexaSmartHomeV3/Helpers/Logger');
const IotProxy = require('./AlexaSmartHomeV3/Helpers/IotProxy');


class AlexaSH3 {

    constructor(options) {
        this.log = new Logger(this);
        this.deviceManager = new DeviceManager();
        AdapterProvider.init(options.adapter);
        IotProxy.init(options.iotDevice, options.iotClientId);
    }

    setLanguage(lang) {
        this.deviceManager.language = lang;
    }

    async process(event) {
        this.log.debug(`incoming Alexa event`);
        this.log.silly(`${event}`);
        const response = this.deviceManager.handleAlexaEvent(event);
        this.log.silly(`response: ${JSON.stringify(response)}`);
        return response;
    }

    async updateDevices() {
        await this.deviceManager.collectEndpoints();
    };

    async handleStateUpdate(id, state) {
        return await this.deviceManager.handleStateUpdate(id, state);
    }
}

module.exports = AlexaSH3;