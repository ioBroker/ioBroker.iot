const AdapterProvider = require('./AlexaSmartHomeV3/Helpers/AdapterProvider');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
const IotProxy = require('./AlexaSmartHomeV3/Helpers/IotProxy');

class AlexaSH3 {
    constructor(options) {
        this.deviceManager = new DeviceManager();
        AdapterProvider.init(options.adapter);
        IotProxy.init(options.iotDevice, options.iotClientId);
    }

    setLanguage(lang) {
        this.deviceManager.language = lang;
    }

    async process(event) {
        return await this.deviceManager.handleAlexaEvent(event);
    }

    async updateDevices() {
        return await this.deviceManager.collectEndpoints();
    };

    async handleStateUpdate(id, state) {
        return await this.deviceManager.handleStateUpdate(id, state);
    }
}

module.exports = AlexaSH3;