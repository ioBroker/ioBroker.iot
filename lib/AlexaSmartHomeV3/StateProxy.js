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
     * @param {Object} opts - The object to initialitze the state proxy.
     * @param {string} opts.setId - The id of the iobroker state to write values to.
     * @param {string} [opts.getId] - The id of the iobroker state to read values from.
     * @param {function} [opts.alexaSetter] - The function to apply to an Alexa value to transform it to the iobroker's one
     * @param {function} [opts.alexaGetter] - The function to apply to an iobroker value to transform it to the Alexa's one
     */
    constructor(opts) {
        this._setId = opts.setId;
        this._getId = opts.getId || opts.setId;
        this._alexaSetter = opts.alexaSetter;
        this._alexaGetter = opts.alexaGetter;        
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

    value(alexaValue) {
        return this._alexaSetter ? this._alexaSetter(alexaValue) : alexaValue;
    }

    alexaValue(value) {
        return this._alexaGetter ? this._alexaGetter(value) : value;
    }
}

module.exports = StateProxy;