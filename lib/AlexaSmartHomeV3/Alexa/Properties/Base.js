const Utils = require('../../Helpers/Utils');

class Base {

    // /**
    //  * @constructor
    //  * @param {Object} opts - The object to initialize the proxy to a ioBroker state.
    //  * @param {Object} opts.setState - The iobroker state to write values to.
    //  * @param {Object} [opts.getState] - The iobroker state to read values from.
    //  * @param {function} [opts.alexaSetter] - The function to apply to an Alexa value to transform it to the iobroker's one
    //  * @param {function} [opts.alexaGetter] - The function to apply to an iobroker value to transform it to the Alexa's one
    //  */
    // constructor(opts) {
    //     this.proxy = {};
    //     this.proxy._setState = opts.setState;
    //     this._setId = opts.setState.id;
    //     this._getId = opts.getState?.id || this._setId;
    //     this._alexaSetter = opts.alexaSetter;
    //     this._alexaGetter = opts.alexaGetter;

    //     const configuredMin = this._setState.common?.min;
    //     const configuredMax = this._setState.common?.max;
    //     this._valuesRangeMin = configuredMin === undefined || isNaN(configuredMin) ? 0 : configuredMin;
    //     this._valuesRangeMax = configuredMax === undefined || isNaN(configuredMax) ? 100 : configuredMax;
    // }

    get propertyName() {
        return Utils.firstLower(`${this.constructor.name}`);
    }

    static get propertyName() {
        return Utils.firstLower(Utils.className(this.toString()));
    }

    /**
     * Checks whether a directive refers to the property
     * @param event Contains the Alexa event.
     * @returns {boolean}
     */
    static matches(event) {
        return event?.directive?.header?.name === this.propertyName;
    }

    matches(event) {
        return event?.directive?.header?.name === this.propertyName;
    }

    /**
     * Extracts value to be set on the smart device sent in an Alexa directive
     * @returns {object}
     */
    alexaDirectiveValue(event) {
        return event.directive.payload[this.propertyName];
    }

    reportValue(value) {
        return value;
    }

    static get ADJUST() { return 'ADJUST'; }

    static get SET() { return 'SET'; }

    static get CELSIUS_SCALE() { return 'CELSIUS'; }

}

module.exports = Base;