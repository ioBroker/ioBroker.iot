const AlexaResponse = require('../Alexa/AlexaResponse');
/**
 *
 * @class
 */
class Control {
    constructor(detectedControl, adapter) {
        this.adapter = adapter
        this._supported = this.initCapabilities(detectedControl);
        this._enforced = this.initEnforcedCapabilities(detectedControl);
    }

    initCapabilities(ctrl) {
        return []
    }

    initEnforcedCapabilities(ctrl) {
        return []
    }

    get allCapabillities() {
        return this.supported.concat(this.enforced)
    }

    static get type() {
        return 'base'
    }

    get categories() {
        return []
    }

    get name() {
        return `${this.constructor.name}`
    }

    get supported() {
        return this._supported
    }

    get enforced() {
        return this._enforced
    }


    supports(event) {
        return this.supported.find(item => item.capability.matches(event)) !== undefined
    }

    canHandle(event) {
        return this.enforced.find(item => item.capability.matches(event)) !== undefined
    }


    async handle(event) {
        const eventHandler = this.allCapabillities.find(item => item.capability.matches(event))
        if (eventHandler) {
            // extract alexa value from event
            const alexaValue = eventHandler.capability.alexaValue(event);
            // convert alexa value to iobroker value
            const value = eventHandler.stateProxy.value(alexaValue);
            try {
                // set iobroker state 
                await this.setState(eventHandler.stateProxy.setId, value);
                eventHandler.stateProxy.currentValue = value;
            } catch (error) {
                return Promise.reject(AlexaResponse.endpointUnreachable().get());
            }

            return AlexaResponse.handled(event, eventHandler.capability.propertyName, alexaValue).get();
        }
        return Promise.reject(AlexaResponse.directiveNotSupported(this.name, event?.directive?.header?.namespace).get());
    }

    async setState(id, value) {
        // console.log('SET: ' + id + ' => ' + value);
        return await this.adapter.setForeignStateAsync(id, value, false);
    }

    // async getState(id) {
    //     return await this.adapter.getForeignStateAsync(id);
    // }
}

module.exports = Control;