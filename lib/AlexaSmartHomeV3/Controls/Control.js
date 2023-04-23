const AlexaResponse = require('../Alexa/AlexaResponse');
const Utils = require('../Helpers/Utils');
const Logger = require('../Helpers/Logger');
const AdapterProvider = require('../Helpers/AdapterProvider');
const StateProxy = require('../Helpers/StateProxy');
const Properties = require('../Alexa/Properties');
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

    get allCapabilities() {
        return this.supported.concat(this.enforced)
    }

    static get type() {
        return Utils.className(this.toString()).toLowerCase()
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
     * This function returns whether the control though doesn't natively support the passed on Alexa directive, but able to handle it.
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

        // const capability = this.allCapabilities.find(item => item.capability.matches(event));
        const eventHandler = this.allCapabilities.flatMap(item => item.properties).find(item => item.property.matches(event));
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
                return Promise.reject(AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get());
            }

            const response = AlexaResponse.handled(event, eventHandler.property.propertyName, eventHandler.property.reportValue(alexaValue));

            // though the processed directive required to change a single value, the response must contain values of all "relavant" properties
            // Please refer to this for details: https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-thermostatcontroller.html#settargettemperature-response-event

            // TODO: add values of relevant properties to response

            this.log.silly(`${JSON.stringify(response.get())}`)
            return response.get();
        }

        const errorResponse = AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace);
        this.log.silly(`${JSON.stringify(errorResponse.get())}`)
        return Promise.reject(errorResponse.get());
    }

    valueSetter(event) {
        return this.setValue.bind(this);
    }

    async setValue(event, eventHandler) {
        // extract alexa value from event
        const alexaValue = eventHandler.property.alexaValue(event);
        // convert alexa value to iobroker value
        const value = eventHandler.stateProxy.value(alexaValue);

        // set iobroker state
        await AdapterProvider.setState(eventHandler.stateProxy.setId, value);
        eventHandler.stateProxy.currentValue = value;
        // return value as expected by Alexa
        return eventHandler.stateProxy.alexaValue(value);
    }

    async adjustValue(event, eventHandler) {
        // extract Alexa delta value from event
        const delta = eventHandler.property.alexaValue(event);
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

        let propertiesToReport = [];

        for (const item of this.supported) {
            for (const prop of item.properties) {
                try {
                    await this.getOrRetrieveCurrentValue(prop.stateProxy);

                    propertiesToReport.push({
                        namespace: item.capability.namespace,
                        name: prop.property.propertyName,
                        value: prop.property.reportValue(prop.stateProxy.alexaValue(prop.stateProxy.currentValue))
                    })
                } catch (error) {
                    this.log.error(`failed reporting state for property ${prop.property.propertyName} of ${this.name}`);
                    this.log.debug(`${error}`);
                }
            }
        }

        this.log.debug(`${JSON.stringify(propertiesToReport)}`);
        return propertiesToReport;
    }

    toString() {
        return `${this.constructor.name}`
    }

    //-------------------------------------------------------
    // standard property proxies
    //

    states(ctrl) {
        return [];
    }

    simpleProxy(ctrl) {
        const [setState, getState] = this.states(ctrl);

        return new StateProxy({
            setState: setState,
            getState: getState
        })

    }

    powerStateProxy(ctrl) {
        const [setPower, getPower] = this.states(ctrl);

        return new StateProxy({
            setState: setPower,
            getState: getPower,
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.PowerState.ON
            },
            alexaGetter: function (value) {
                return value ? Properties.PowerState.ON : Properties.PowerState.OFF
            }
        })
    }

    detectedStateProxy(ctrl) {
        const [actual, _] = this.states(ctrl);
        return new StateProxy({
            setState: actual,
            getState: actual,
            alexaSetter: function (alexaValue) {
                // should be never called
                return 0;
            },
            alexaGetter: function (value) {
                return value ? Properties.DetectionState.DETECTED : Properties.DetectionState.NOT_DETECTED;
            }
        })
    }
}

module.exports = Control;