const capabilities = require('./Capabilities')
const DeviceUtils = require('./DeviceUtils')
const { v4: uuidv4 } = require('uuid');

class Device {
    constructor(opts) {
        opts = DeviceUtils.defaultIfNullOrEmpty(opts, {});
        this.init(opts);
    }

    init(opts) {
        this.id = DeviceUtils.defaultIfNullOrEmpty(opts.id, uuidv4());
        this.capabilities = DeviceUtils.defaultIfNullOrEmpty(opts.capabilities, [])
        this.friendlyName = DeviceUtils.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.displayCategries = DeviceUtils.defaultIfNullOrEmpty(opts.displayCategories, ['OTHER']);
    }


    matchCapability(event) {
        return this.capabilities.find(capability => capability.matches(event))
    }

    async handle(event) {
        return await this.matchCapability(event).handle(event)
    }
}

module.exports = Device;