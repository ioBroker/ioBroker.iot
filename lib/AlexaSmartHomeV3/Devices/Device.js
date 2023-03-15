const Helpers = require('../Helpers')
const { v4: uuidv4 } = require('uuid');

/**
 * This class hides the different iobroker devices from Alexa and makes them appear as a single endpoint.
 * Due to differencies in Alexa's and iobroker's endpoint/devices concepts, we have to merge some of the
 * by the type-detector detected devices to a single device, so that multiple devices are considered 
 * to be the same endpoint from Alexa's perspective.
 * This leads to a situation where while Alexa beleives controlling a single endpoint by sending a directive 
 * to change the endpoint's state, in reality the states of multiple devices are changed.
 *
 * @class
 */
class Device {
    constructor(opts) {
        this.id = Helpers.defaultIfNullOrEmpty(opts.id, uuidv4());
        this.friendlyName = Helpers.defaultIfNullOrEmpty(opts.friendlyName, uuidv4());
        this.displayCategries = Helpers.defaultIfNullOrEmpty(opts.displayCategories, ['OTHER']);
        this.adapter = opts.adapter;
        this.capabilities = opts.capabilities;
    }

    matchCapability(event) {
        return this.capabilities.find(capability => capability.matches(event))
    }

    async handle(event) {
        return await this.matchCapability(event).handle(event)
    }
}

module.exports = Device;