const AlexaResponse = require('../Alexa/AlexaResponse');
const Utils = require('../Helpers/Utils');
const Logger = require('../Helpers/Logger');
const AdapterProvider = require('../Helpers/AdapterProvider');
/**
 *
 * @class
 */
class Control {
    /**
     * Represents the base functionality for a control in a smart device. A smart device has at least one control.
     * The specific functionality, natively supported capabilities etc. are defined in derived classes.
     * 
     * @constructor
     * @param detectedControl - The detected control in terms of iobroker type detector.
     */
    constructor(detectedControl) {
        const configuredMin = detectedControl?.object?.common?.min;
        const configuredMax = detectedControl?.object?.common?.max;
        this._valuesRangeMin = configuredMin === undefined || isNaN(configuredMin) ? 0 : configuredMin;
        this._valuesRangeMax = configuredMax === undefined || isNaN(configuredMax) ? 100 : configuredMax;

        this._supported = this.initCapabilities(detectedControl);
        this._enforced = this.initEnforcedCapabilities(detectedControl);
        this.log = new Logger(this);
        this.log.silly(`created instance`);
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control natively supports
     * and a pre-configured StateProxy with iobroker state ids and value converters from Alexa to iobroker types and vice versa. 
     * @param {*} ctrl - a control in terms of iobroker type detector.
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initCapabilities(ctrl) {
        return []
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control can handle even
     * though not natively supported (e.g., the light control can handle the Alexa BrightnessController directive by switching
     * itself ON on brightness > 0 and OFF on brightness == 0)
     * and a pre-configured StateProxy with iobroker state ids and value converters from Alexa to iobroker types and vice versa. 
     * @param {*} ctrl - a control in terms of iobroker type detector.
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initEnforcedCapabilities(ctrl) {
        return []
    }

    get allCapabillities() {
        return this.supported.concat(this.enforced)
    }


    get valuesRangeMin() {
        return this._valuesRangeMin
    }

    get valuesRangeMax() {
        return this._valuesRangeMax
    }

    static get type() {
        return 'base'
    }
    /**
     * Getter for Alexa categories
     */
    get categories() {
        return []
    }

    get name() {
        return `${this.constructor.name}`
    }
    /**
     * Getter for _supported
     */
    get supported() {
        return this._supported
    }
    /**
     * Getter for _enforced
     */
    get enforced() {
        return this._enforced
    }
    /**
     * This function returns whether the control natively supports the passed on Alexa directive.
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control natively supports the directive, false - otherwise
     */
    supports(event) {
        return this.supported.find(item => item.capability.matches(event)) !== undefined
    }
    /**
     * This function returns whether the control though doesn't natively supports the passed on Alexa directive, but able to handle it. 
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control can handle the directive, false - otherwise
     */
    canHandle(event) {
        return this.enforced.find(item => item.capability.matches(event)) !== undefined
    }
    /**
     * This function processes an Alexa directive. Usually the result of the processing is setting an iobroker state to some value
     * as a reaction to an interaction with Alexa via voice, app, etc.
     * @async 
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Promise<Object>} - Object containing the response to be sent to Alexa Service
     */
    async handle(event) {
        this.log.debug(`handling Alexa event`);
        this.log.silly(`${JSON.stringify(event)}`);

        const eventHandler = this.allCapabillities.find(item => item.capability.matches(event));
        if (eventHandler) {
            let alexaValue;
            try {
                const setter = this.valueSetter(event);
                alexaValue = await setter(event, eventHandler);
            } catch (error) {
                this.log.debug(`${error}`);
                this.log.error(`failed handling Alexa event`);
                return Promise.reject(AlexaResponse.endpointUnreachable().get());
            }

            // even though the handler successfully processed the Alexa event,
            // we return an error here for ENFORCED capabilities, to prevent
            // reporting multiple successes for the same capability and
            // running into a situation of returning a wrong value back to Alexa
            if (this.enforced.find(e => e.capability.matches(event))) {
                return Promise.reject(AlexaResponse.directiveNotSupported(this.name, event?.directive?.header?.namespace).get());
            }

            const response = AlexaResponse.handled(event, eventHandler.capability.propertyName, alexaValue);
            this.log.silly(`${JSON.stringify(response.get())}`)
            return response.get();
        }

        const errorResponse = AlexaResponse.directiveNotSupported(this.name, event?.directive?.header?.namespace);
        this.log.silly(`${JSON.stringify(errorResponse.get())}`)
        return Promise.reject(errorResponse.get());
    }

    valueSetter(event) {
        return this.setValue.bind(this);
    }

    async setValue(event, eventHandler) {
        // extract alexa value from event
        const alexaValue = eventHandler.capability.alexaValue(event);
        // convert alexa value to iobroker value
        const value = eventHandler.stateProxy.value(alexaValue);

        // set iobroker state 
        await AdapterProvider.setState(eventHandler.stateProxy.setId, value);
        eventHandler.stateProxy.currentValue = value;       
        return alexaValue;
    }

    async adjustValue(event, eventHandler) {
        // extract Alexa delta value from event
        const delta = eventHandler.capability.alexaValue(event);
        // get current value
        const currentValue = await this.getOrRetrieveCurrentValue(eventHandler.stateProxy);
        // convert the current value to Alexa value
        const valueToAdjust = eventHandler.stateProxy.alexaValue(currentValue);
        // adjust Alexa value
        const adjustedValue = Utils.ensureValueInRange_0_100(valueToAdjust + delta);
        // convert adjusted value to iobroker value
        const value = eventHandler.stateProxy.value(adjustedValue);

        // set iobroker state 
        await AdapterProvider.setState(eventHandler.stateProxy.setId, value);
        eventHandler.stateProxy.currentValue = value;
        return adjustedValue;
    }

    /**
     * @param {Object} stateProxy
     */
    async getOrRetrieveCurrentValue(stateProxy) {
        if (stateProxy.currentValue === undefined) {
            stateProxy.currentValue = await AdapterProvider.getState(stateProxy.getId);
        }

        if (stateProxy.currentValue === undefined) {
            throw new Error(`unable to retrieve ${stateProxy.getId}`);
        }

        return stateProxy.currentValue;
    }

    async reportState() {

        this.log.debug(`reporting state`);

        let properties = [];
        for (const item of this.supported) {
            try {
                // if (item.stateProxy.currentValue === undefined) {
                //     item.stateProxy.currentValue = await AdapterProvider.getState(item.stateProxy.getId);
                // }
                await this.getOrRetrieveCurrentValue(item.stateProxy);

                properties.push({
                    namespace: item.capability.namespace,
                    name: item.capability.propertyName,
                    value: item.capability.reportValue(item.stateProxy.alexaValue(item.stateProxy.currentValue))
                })
            } catch (error) {
                this.log.error(`failed reporting state`);
                this.log.debug(`${error}`);
            }
        }

        this.log.silly(`${JSON.stringify(properties)}`);
        return properties;
    }

    toString() {
        return `${this.constructor.name}`
    }
}

module.exports = Control;