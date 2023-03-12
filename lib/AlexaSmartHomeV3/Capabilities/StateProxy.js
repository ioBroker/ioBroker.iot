/**
 * State proxy. 
 * Contains the state ids controlled by a single Alexa capability and mapping between Alexa and iobroker values.
 * On an Alexa directive to control the capability of an endpoint the 'setState' will be written.
 * On the Alexa ReportState directive the 'getState' will be read to get the current value.
 * 
 */
class StateProxy {
    /**
     * Creates a state proxy.
     * @param {Object} opts - The object to initialitze the state proxy.
     * @param {string} opts.setState - The id of the iobroker state to write values to.
     * @param {string} [opts.getState] - The id of the iobroker state to read values from.
     * @param {function} [opts.setter] - The function to apply to an Alexa value to transform it to the iobroker's one
     * @param {function} [opts.getter] - The function to apply to an iobroker value to transform it to the Alexa's one
     */
    constructor(opts) {
        this._setState = opts.setState;
        this._getState = opts.getState || opts.setState;
        this._setter = opts.setter;
        this._getter = opts.getter;
    }

    get setState() {
        return this._setState
    }

    get getState() {
        return this._getState
    }

    value(alexaValue) {
        return this._setter ? this._setter(alexaValue) : alexaValue;
    }

    alexaValue(value) {
        return this._getter ? this._getter(value) : value;
    }
}

module.exports = StateProxy;