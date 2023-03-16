const Helpers = require('../Helpers')
const { v4: uuidv4 } = require('uuid');

/**
 * @class
 */
class Endpoint {
    constructor(opts) {
        this.adapter = opts.adapter;
        this.capabilities = opts.capabilities;
    }

    matchCapability(event) {
        return this.capabilities.find(item => item.matches(event))
    }

    async handle(event) {
        return await this.matchCapability(event).handle(event)
    }
}

module.exports = Endpoint;