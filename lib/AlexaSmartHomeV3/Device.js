const capabilities = require('./Capabilities')
const Helpers = require('./Helpers')
const { v4: uuidv4 } = require('uuid');

class Device {
    constructor(opts) {
        opts = Helpers.defaultIfNullOrEmpty(opts, {});
        this.init(opts);
    }

    init(opts) {
        this.id = Helpers.defaultIfNullOrEmpty(opts.id, uuidv4());
        this.capabilities = Helpers.defaultIfNullOrEmpty(opts.capabilities, [])
        this.friendlyName = Helpers.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.displayCategries = Helpers.defaultIfNullOrEmpty(opts.displayCategories, ['OTHER']);
    }


    matchCapability(event) {
        return this.capabilities.find(capability => capability.matches(event))
    }

    async handle(event) {
        return await this.matchCapability(event).handle(event)
    }
}

module.exports = Device;