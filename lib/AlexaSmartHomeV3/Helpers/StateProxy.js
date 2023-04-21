/**
 * @class
 * State proxy. 
 * Contains the state ids controlled by a single Alexa capability and mapping between Alexa and iobroker values.
 * On an Alexa directive to control the capability of an endpoint the 'setId' will be written.
 * On the Alexa ReportState directive the 'getId' will be read to get the current value.
 * 
 */
class StateProxy {
    /**
     * Creates a state proxy.
     * @constructor
     * @param {Object} opts - The object to initialize the state proxy.
     * @param {Object} opts.setState - The iobroker state to write values to.
     * @param {Object} [opts.getState] - The iobroker state to read values from.
     * @param {function} [opts.alexaSetter] - The function to apply to an Alexa value to transform it to the iobroker's one
     * @param {function} [opts.alexaGetter] - The function to apply to an iobroker value to transform it to the Alexa's one
     */
    constructor(opts) {
        this._setState = opts.setState;
        this._setId = opts.setState.id;
        this._getId = opts.getState?.id || this._setId;
        this._alexaSetter = opts.alexaSetter;
        this._alexaGetter = opts.alexaGetter;        

        const configuredMin = this._setState.common?.min;
        const configuredMax = this._setState.common?.max;
        this._valuesRangeMin = configuredMin === undefined || isNaN(configuredMin) ? 0 : configuredMin;
        this._valuesRangeMax = configuredMax === undefined || isNaN(configuredMax) ? 100 : configuredMax;
    }

    get valuesRangeMin() {
        return this._valuesRangeMin
    }

    get valuesRangeMax() {
        return this._valuesRangeMax
    }

    get setId() {
        return this._setId
    }

    get getId() {
        return this._getId
    }
    /**
     * returns last known iobroker value
     */
    get currentValue() {
        return this._currentValue
    }

    set currentValue(value) {
        this._currentValue = value
    }

    /**
     * @param {any} alexaValue
     */
    value(alexaValue) {
        return this._alexaSetter ? this._alexaSetter(alexaValue) : alexaValue;
    }

    /**
     * @param {any} value
     */
    alexaValue(value) {
        return this._alexaGetter ? this._alexaGetter(value) : value;
    }
}

module.exports = StateProxy;