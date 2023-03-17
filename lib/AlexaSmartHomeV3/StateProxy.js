/**
 * State proxy. 
 * Contains the state ids controlled by a single Alexa capability and mapping between Alexa and iobroker values.
 * On an Alexa directive to control the capability of an endpoint the 'setId' will be written.
 * On the Alexa ReportState directive the 'getId' will be read to get the current value.
 * 
 */
class StateProxy {
    /**
     * Creates a state proxy.
     * @param {Object} opts - The object to initialitze the state proxy.
     * @param {string} opts.setId - The id of the iobroker state to write values to.
     * @param {string} [opts.getId] - The id of the iobroker state to read values from.
     * @param {function} [opts.setter] - The function to apply to an Alexa value to transform it to the iobroker's one
     * @param {function} [opts.getter] - The function to apply to an iobroker value to transform it to the Alexa's one
     */
    constructor(opts) {
        this._setId = opts.setId;
        this._getId = opts.getId || opts.setId;
        this._setter = opts.setter;
        this._getter = opts.getter;
    }

    get setId() {
        return this._setId
    }

    get getId() {
        return this._getId
    }

    value(alexaValue) {
        return this._setter ? this._setter(alexaValue) : alexaValue;
    }

    alexaValue(value) {
        return this._getter ? this._getter(value) : value;
    }
}

module.exports = StateProxy;