const AlexaResponse = require('../Alexa/AlexaResponse');
const Capabilities = require('../Alexa/Capabilities');
/**
 *
 * @class
 */
class Control {
    constructor(detectedControl, adapter) {
        this.detectedControl = detectedControl;
        this.adapter = adapter
    }

    get name() {
        return `${this.constructor.name}`
    }

    get supported() {
        return []
    }

    supports(event) {
        return this.supported.find(item => item.capability.matches(event)) !== undefined
    }

    canHandle(event) {
        return this.supports(event) || this.matchingHandler(event) !== undefined
    }

    get enforced() {
        return {}
    }

    matchingHandler(event) {
        const namespace = event?.directive?.header?.namespace;
        return this.enforced[namespace];
    }

    async forceHandle(event) {
        const handler = this.matchingHandler(event);
        if (handler) {
            return await handler(event);
        }

        return null;
    }

    async handle(event) {
        const eventHandler = this.supported.find(item => item.capability.matches(event))
        const alexaValue = eventHandler.capability.alexaValue(event);
        let value = null;

        // convert alexa value to iobroker value
        if (eventHandler) {
            value = eventHandler.stateProxy.value(alexaValue);
        } else {
            value = this.forceHandle(event);
        }

        if (value !== null) {
            try {
                // set iobroker state 
                await this.setState(eventHandler.stateProxy.setId, value);
            } catch (error) {
                return Promise.reject(AlexaResponse.endpointUnreachable().get());
            }

            return AlexaResponse.handled(event, eventHandler.capability.propertyName, alexaValue).get();
        }

        return Promise.reject(AlexaResponse.directiveNotSupported(this.name, event?.directive?.header?.namespace).get());
    }

    async setState(id, value) {
        return await this.adapter.setStateAsync(id, value, false);
    }

    // async getState(id) {
    //     return await this.adapter.getStateAsync(id);
    // }
}

module.exports = Control;