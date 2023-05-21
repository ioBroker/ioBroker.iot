const AlexaResponse = require('../Alexa/AlexaResponse');
const Utils = require('../Helpers/Utils');
const Logger = require('../Helpers/Logger');
const AdapterProvider = require('../Helpers/AdapterProvider');
const Properties = require('../Alexa/Properties');

/**
 * Represents the base functionality for a control in a smart device. A smart device has at least one control.
 * The specific functionality, natively supported capabilities, etc. are defined in derived classes.
 * @class
 */
class Control {
    /**
     * @constructor
     * @param detectedControl - The detected control in terms of iobroker type detector.
     */
    constructor(detectedControl) {
        this.stateKeys = ['SET', 'ACTUAL', 'ON_SET', 'ON_ACTUAL', 'POWER', 'MODE'];
        this.initStates(detectedControl);
        this._supported = this.initCapabilities();
        this._enforced = this.initEnforcedCapabilities();
        this.log = new Logger(this);
        this.log.silly(`created instance`);
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control natively supports
     * and at least one property. Every property is initiliazed with correponding iobroker state ids and value converters from Alexa to iobroker types
     * and vice versa.
     *
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initCapabilities() {
        return [];
    }
    /**
     * This function maps a passed on control to an array of objects. Each object contains an Alexa capability the control can handle even
     * though not natively supported (e.g., the light control can handle the Alexa BrightnessController directive by switching
     * itself `ON` on brightness > 0 and `OFF` on brightness == 0)
     * Every capability has at least one property with set up iobroker state ids and value converters from Alexa to iobroker types
     * and vice versa.
     *
     * @returns Array of objects with natively supported Alexa capabilities and correspondingly configured instances of StateProxies
     */
    initEnforcedCapabilities() {
        return [];
    }

    get allCapabilities() {
        return this.supported.concat(this.enforced);
    }

    static get type() {
        return Utils.firstLower(Utils.className(this.toString()));
    }
    /**
     * Getter for Alexa categories
     */
    get categories() {
        return [];
    }

    get name() {
        return `${this.constructor.name}`;
    }
    /**
     * Getter for _supported
     */
    get supported() {
        return this._supported;
    }
    /**
     * Getter for _enforced
     */
    get enforced() {
        return this._enforced;
    }
    /**
     * This function returns whether the control natively supports the passed on Alexa directive.
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control natively supports the directive, false - otherwise
     */
    supports(event) {
        return this.supported.find(capability => capability.matches(event)) !== undefined;
    }
    /**
     * This function returns whether the control though doesn't natively support the passed on Alexa directive, but able to handle it.
     * @param {*} event - The event containing the Alexa directive as it comes from AWS Alexa Service
     * @returns {Boolean} - True if the control can handle the directive, false - otherwise
     */
    canHandle(event) {
        return this.enforced.find(capability => capability.matches(event)) !== undefined;
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


        const property = this.allCapabilities.flatMap(item => item.properties).find(property => property.matches(event));
        if (property) {
            let alexaValue;
            try {
                const setter = this.valueSetter(event);
                alexaValue = await setter(event, property);
            } catch (error) {
                this.log.debug(`${error}`);
                this.log.error(`failed handling Alexa event`);
                return Promise.reject(AlexaResponse.endpointUnreachable().get());
            }

            // even though the handler successfully processed the Alexa event,
            // we return an error here for ENFORCED capabilities, to prevent
            // reporting multiple successes for the same capability and
            // running into a situation of returning a wrong value back to Alexa
            if (this.enforced.find(capability => capability.matches(event))) {
                return Promise.reject(AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace, event?.directive?.header?.payloadVersion).get());
            }

            const response = AlexaResponse.handled(event, property.propertyName, property.reportValue(alexaValue), property.instance);

            // though the processed directive required to change a single value, the response must contain values of all "relavant" properties
            // Please refer to this for details: https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-thermostatcontroller.html#settargettemperature-response-event

            // TODO: add values of relevant properties to response

            this.log.silly(`${JSON.stringify(response.get())}`);
            return response.get();
        }

        const errorResponse = AlexaResponse.directiveNotSupportedByControl(this.name, event?.directive?.header?.namespace);
        this.log.silly(`${JSON.stringify(errorResponse.get())}`);
        return Promise.reject(errorResponse.get());
    }

    valueSetter(event) {
        return this.setValue.bind(this);
    }

    async setValue(event, property) {
        // extract alexa value from event
        const alexaValue = property.alexaDirectiveValue(event);
        // convert alexa value to iobroker value
        const value = property.value(alexaValue);

        // set iobroker state
        await this.setState(property, value);

        property.currentValue = value;
        // return value as expected by Alexa
        return property.alexaValue(value);
    }

    async adjustValue(event, property) {
        // extract Alexa delta value from event
        const delta = property.alexaDirectiveValue(event);
        // get current value
        const currentValue = await this.getOrRetrieveCurrentValue(property);
        // convert the current value to Alexa value
        const valueToAdjust = property.alexaValue(currentValue);
        // adjust Alexa value
        const adjustedValue = Utils.ensureValueInRange_0_100(valueToAdjust + delta);
        // convert adjusted value to iobroker value
        const value = property.value(adjustedValue);

        // set iobroker state
        await this.setState(property, value);

        return adjustedValue;
    }

    /**
     * @param {Object} property
     */
    async getOrRetrieveCurrentValue(property) {
        if (property.currentValue === undefined) {
            property.currentValue = await AdapterProvider.getState(property.getId);
        }

        if (property.currentValue === undefined) {
            throw new Error(`unable to retrieve ${property.getId}`);
        }

        return property.currentValue;
    }

    async reportState() {
        this.log.debug(`reporting state`);

        let propertiesToReport = [];

        for (const capability of this.supported) {
            for (const property of capability.properties) {
                try {
                    await this.getOrRetrieveCurrentValue(property);

                    let toReport = {
                        namespace: capability.namespace,
                        instance: property.instance,
                        name: property.propertyName,
                        value: property.reportValue(property.alexaValue(property.currentValue)),
                    }

                    if (!toReport.instance) {
                        delete toReport.instance;
                    }

                    propertiesToReport.push(toReport);
                } catch (error) {
                    this.log.error(`failed reporting state for property ${property.propertyName} of ${this.name}`);
                    this.log.debug(`${error}`);
                }
            }
        }

        this.log.debug(`${JSON.stringify(propertiesToReport)}`);
        return propertiesToReport;
    }

    toString() {
        return `${this.constructor.name}`;
    }

    initStates(ctrl) {
        this._states = {};
        for (const stateKey of this.stateKeys) {
            this._states[stateKey] = ctrl.states.find(s => s.name === stateKey);
        }
    }

    get states() {
        return this._states;
    }

    get statesMap() {
        const map = {}
        for (const stateKey of this.stateKeys) {
            map[stateKey.toLowerCase()] = stateKey;
        }
        return map;
    }

    async setState(property, value) {
        await AdapterProvider.setState(property.setId, value);
        property.currentValue = value;
    }


    //-------------------------------------------------------
    // standard property init objects
    //

    blankInitObject() {
        // const states = this.initStates(ctrl);
        const map = this.statesMap;
        return {
            setState: this.states[map.actual],
            getState: this.states[map.actual],
        };
    }

    powerStateInitObject() {
        // const states = this.initStates(ctrl);
        const map = this.statesMap;

        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                return alexaValue === Properties.PowerState.ON;
            },
            alexaGetter: function (value) {
                return value ? Properties.PowerState.ON : Properties.PowerState.OFF;
            },
        };
    }

    detectedStateInitObject() {
        const map = this.statesMap;
        return {
            setState: this.states[map.actual],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                // should be never called
                return 0;
            },
            alexaGetter: function (value) {
                return value ? Properties.DetectionState.DETECTED : Properties.DetectionState.NOT_DETECTED;
            },
        };
    }

    percentageInitObject() {
        const map = this.statesMap;
        const range = Utils.configuredRangeOrDefault(this.states[map.set]);
        return {
            setState: this.states[map.set],
            getState: this.states[map.actual],
            alexaSetter: function (alexaValue) {
                return Utils.denormalize_0_100(alexaValue, range.min, range.max);
            },
            alexaGetter: function (value) {
                return Utils.normalize_0_100(value, range.min, range.max);
            },
        };
    }
}

module.exports = Control;