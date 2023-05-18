const Utils = require('../../Helpers/Utils');

class Base {

    /**
     * @param {Object} opts - The object to initialize the corresponding ioBroker state.
     * @param {Object} opts.setState - The iobroker state to write values to.
     * @param {Object} [opts.getState] - The iobroker state to read values from.
     * @param {function} [opts.alexaSetter] - The function to apply to an Alexa value to transform it to the iobroker's one
     * @param {function} [opts.alexaGetter] - The function to apply to an iobroker value to transform it to the Alexa's one
     */
    init(opts) {
        this._setState = opts.setState;
        this._setId = opts.setState.id;
        this._getId = opts.getState?.id || this._setId;
        this._alexaSetter = opts.alexaSetter;
        this._alexaGetter = opts.alexaGetter;
        this._valuesRange = Utils.configuredRangeOrDefault(this._setState);
    }

    get propertyName() {
        return Utils.firstLower(`${this.constructor.name}`);
    }

    static get propertyName() {
        return Utils.firstLower(Utils.className(this.toString()));
    }

    get valuesRangeMin() {
        return this._valuesRange.min
    }

    get valuesRangeMax() {
        return this._valuesRange.max;
    }

    get setId() {
        return this._setId;
    }

    get getId() {
        return this._getId;
    }
    /**
     * returns last known iobroker value
     */
    get currentValue() {
        return this._currentValue;
    }

    set currentValue(value) {
        this._currentValue = value;
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