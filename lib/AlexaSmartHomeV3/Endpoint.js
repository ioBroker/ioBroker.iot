const capabilities = require('./Capabilities')
const Helpers = require('./Helpers')
const { v4: uuidv4 } = require('uuid');

/*
* Due to differencies in Alexa's and iobroker's devices concepts, we have to merge some of the detected controls
* to a single endpoint, so that multiple controls are considered to be the same endpoint from Alexa's perspective.
* That leads to a situation where while Alexa beleives controlling a single endpoint by sending a directive to change the endpoint's state,
* in reality the states of multiple devices are changed.
*
* Example:
* iobroker 'light switch' and 'light dimmer' controls are merged to the same endpoint from Alexa's perspective if they're in the same room,
* e.g., 'living room', and have the same function assigned, e.g., 'light'.
* If an Alexa directive to 'turn light in the living room off' comes in, then the 'light switch' is set to false and
* the 'light dimmer' to 0.
* Alexa directive to 'set brightness to 50% in living room' would result in setting the 'light switch' to true and
* the 'light dimmer' to 50.
* This might also lead to a case where not all controls could be changed due to some error or the current states of controls
* are contradicting from the Alexa's perspective, e.g., the current state of 'light switch' is true, 
* but the current state of the 'light dimmer' is 0. 
* In such situations the logic is as follows: 
* - if the state of at least one control could be changed according to the Alexa directive, the Alexa directive processing considered to be successful
* - if the state of at least one control is 'ON' (true, brightness > 0, etc.), the state of the Alexa's endpoint is 'ON'
*
* This class hides the different iobroker controls from Alexa and makes them appear as a single endpoint.
*
*/
class Endpoint {
    constructor(opts) {
        opts = Helpers.defaultIfNullOrEmpty(opts, {});
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

module.exports = Endpoint;