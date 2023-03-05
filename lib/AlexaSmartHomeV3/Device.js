const capabilities = require('./Capabilities')
const DeviceUtils = require('./DeviceUtils')
const { v4: uuidv4 } = require('uuid');

class Device {
    constructor(opts) {
        opts = DeviceUtils.defaultIfNullOrEmpty(opts, {});
        this.id = DeviceUtils.defaultIfNullOrEmpty(opts.id, uuidv4());
        this.capabilities = [new capabilities['PowerController'], new capabilities['BrightnessController']]
        this.friendlyName = DeviceUtils.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.displayCategries = undefined;
    }
}

module.exports = Device;