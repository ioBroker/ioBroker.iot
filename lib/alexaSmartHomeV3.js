const AdapterProvider = require('./AlexaSmartHomeV3/Helpers/AdapterProvider');
const DeviceManager = require('./AlexaSmartHomeV3/DeviceManager');
const IotProxy = require('./AlexaSmartHomeV3/Helpers/IotProxy');
const RateLimiter = require('./AlexaSmartHomeV3/Helpers/RateLimiter');

class AlexaSH3 {
    constructor(options) {
        this.deviceManager = new DeviceManager();
        AdapterProvider.init(options.adapter);
        IotProxy.init(options.iotDevice, options.iotClientId, options.adapter.config.login);
        RateLimiter.init();
        // Subscribe on enum changes
        options.adapter.subscribeForeignObjects('enum.functions.*');
        options.adapter.subscribeForeignObjects('enum.rooms.*');
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

    async handleObjectChange(id, obj) {
        // Handle enum changes
        if (obj) {
            // An object was changed
            // console.log(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // An object was deleted
            // console.log(`object ${id} deleted`);
        }

        // either an enum was deleted or changed => re-collect devices

        // intentionally not waiting for the promise to resolve
        this.deviceManager.collectEndpoints();
    }

    pauseEvents() {
        this.deviceManager.pauseEvents();
    }

    destroy() {
        // await options.adapter.unsubscribeForeignObjectsAsync('enum.functions.*');
        // await options.adapter.unsubscribeForeignObjectsAsync('enum.rooms.*');
    }
}

module.exports = AlexaSH3;