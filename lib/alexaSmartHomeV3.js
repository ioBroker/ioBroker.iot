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
    }

    async getDevices() {
        const endpoints = this.deviceManager ? this.deviceManager.endpoints : [];

        const result = [];

        for (let p = 0; p < endpoints.length; p++) {
            const endpoint = endpoints[p];
            const controls = [];

            for (let c = 0; c < endpoint.controls.length; c++) {
                const control = endpoint.controls[c];
                let supported = [];
                let enforced = [];
                control._supported.forEach(item =>
                    item._properties.forEach(
                        prop => !supported.includes(prop.constructor.name) && supported.push(prop.constructor.name),
                    ),
                );
                control._enforced.forEach(item =>
                    item._properties.forEach(
                        prop => !enforced.includes(prop.constructor.name) && enforced.push(prop.constructor.name),
                    ),
                );

                supported = supported.map(prop => prop.replace(/^[A-Z]/, c => c.toLowerCase())).sort();

                enforced = enforced.map(prop => prop.replace(/^[A-Z]/, c => c.toLowerCase())).sort();

                controls.push({
                    type: control.log._component,
                    states: control._states,
                    // always sort by id, so the GUI can address the group by the first control
                    supported,
                    // always sort by id, so the GUI can address the group by the first control
                    enforced,
                    state: await control.reportState(),
                });
            }
            // always sort by id, so the GUI can address the group by the first control
            controls.sort((c1, c2) => (c1.type > c2.type ? -1 : c1.type < c2.type ? 1 : 0));

            const device = {
                controls,
                friendlyName: endpoint.friendlyName,
                autoDetected: endpoint.autoDetected,
                funcName: endpoint.funcName,
                roomName: endpoint.roomName,
                id: endpoint.id,
                type: endpoint.log._component,
                state: await endpoint.reportState(),
            };
            result.push(device);
        }

        return result;
    }

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

    async destroy() {
        await this.deviceManager.destroy();
        await AdapterProvider.get().unsubscribeForeignObjectsAsync('enum.functions.*');
        await AdapterProvider.get().unsubscribeForeignObjectsAsync('enum.rooms.*');
    }
}

module.exports = AlexaSH3;
